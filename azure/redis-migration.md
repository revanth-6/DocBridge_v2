# Azure Cache for Redis Migration

This document outlines the steps to replace the in-memory rate limiter and idempotency cache with a distributed Azure Cache for Redis instance, which is required for scaling the API Gateway horizontally.

## Step 1: Provision Azure Cache for Redis
```bash
az redis create \
  --name docbridge-redis-prod \
  --resource-group docbridge-rg \
  --location eastus \
  --sku Basic \
  --vm-size c0
```

Get the connection string:
```bash
az redis list-keys --name docbridge-redis-prod --resource-group docbridge-rg
```

## Step 2: Rate Limiter Code Migration

You must install `redis` and `rate-limit-redis`.

```bash
npm install redis rate-limit-redis
```

Update `gateway/src/middleware/rateLimiter.js`:

```javascript
// BEFORE
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

module.exports = limiter;

// AFTER
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL // e.g. redis://:<password>@docbridge-redis-prod.redis.cache.windows.net:6380
});

// Connect once on startup
redisClient.connect().catch(console.error);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

module.exports = limiter;
```

## Step 3: Idempotency Middleware Migration

Update `gateway/src/middleware/idempotency.js`:

```javascript
// BEFORE
const cache = new Map();

const idempotencyMiddleware = (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();
  
  if (cache.has(key)) {
    return res.status(409).json({ success: false, message: 'Duplicate request detected' });
  }
  
  cache.set(key, true);
  // Clear after 24 hours
  setTimeout(() => cache.delete(key), 86400000);
  next();
};

module.exports = idempotencyMiddleware;

// AFTER
const { createClient } = require('redis');
const redisClient = createClient({ url: process.env.REDIS_URL });

// Reuse the existing client from rateLimiter or instantiate a new one
redisClient.connect().catch(console.error);

const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers['idempotency-key'];
  if (!key) return next();
  
  try {
    const exists = await redisClient.get(`idempotency:${key}`);
    if (exists) {
      return res.status(409).json({ success: false, message: 'Duplicate request detected' });
    }
    
    await redisClient.setEx(`idempotency:${key}`, 86400, 'true'); // Expire in 24h
    next();
  } catch (err) {
    console.error('Redis Idempotency Error:', err);
    next(); // Fail open if Redis is down
  }
};

module.exports = idempotencyMiddleware;
```
