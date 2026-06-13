const serviceConfigs = {
  'consultation-service': { port: 3002, serviceName: 'consultation-service', displayName: 'Consultation Service' },
  'prescription-service': { port: 3003, serviceName: 'prescription-service', displayName: 'Prescription Service' },
  'reminder-service': { port: 3004, serviceName: 'reminder-service', displayName: 'Reminder Service' },
  'labreport-service': { port: 3005, serviceName: 'labreport-service', displayName: 'Lab Report Service' },
  'symptom-service': { port: 3006, serviceName: 'symptom-service', displayName: 'Symptom Service' },
  'ai-companion-service': { port: 3007, serviceName: 'ai-companion-service', displayName: 'AI Companion Service' },
  'health-summary-service': { port: 3008, serviceName: 'health-summary-service', displayName: 'Health Summary Service' },
  'family-service': { port: 3009, serviceName: 'family-service', displayName: 'Family Service' },
};

const fs = require('fs');
const path = require('path');

const base = 'c:\\Users\\DELL\\Downloads\\Azure_Project\\docbridge\\services';

function genEnvConfig(port) {
  return `require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || ${port},
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'docbridge_db',
  DB_USER: process.env.DB_USER || 'docbridge_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'DocBridge@2024Secure',
  DB_SSL: process.env.DB_SSL === 'true',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_replace_in_production',
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
};

module.exports = env;
`;
}

function genLogger() {
  return `const winston = require('winston');
const env = require('./environment');

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production'
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? \` \${JSON.stringify(meta)}\` : '';
          return \`\${timestamp} [\${level}]: \${message}\${metaStr}\`;
        })
      ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
`;
}

function genDatabase() {
  return `const { Sequelize } = require('sequelize');
const env = require('./environment');
const logger = require('./logger');

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  dialectOptions: env.DB_SSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sequelize.authenticate();
      logger.info(\`Connected to PostgreSQL at \${env.DB_HOST}:\${env.DB_PORT}/\${env.DB_NAME}\`);
      return;
    } catch (error) {
      logger.error(\`Database connection attempt \${attempt}/\${retries} failed: \${error.message}\`);
      if (attempt === retries) throw new Error(\`Failed to connect after \${retries} attempts\`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = { sequelize, connectWithRetry };
`;
}

function genAuthenticate() {
  return `const jwt = require('jsonwebtoken');
const env = require('../config/environment');

function authenticate(req, res, next) {
  if (req.headers['x-user-id']) {
    req.user = {
      userId: req.headers['x-user-id'],
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role'],
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.', timestamp: new Date().toISOString() });
  }

  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], env.JWT_ACCESS_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Token expired. Please login again.' : 'Invalid token.';
    return res.status(401).json({ success: false, message, timestamp: new Date().toISOString() });
  }
}

module.exports = authenticate;
`;
}

function genValidate() {
  return `function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(422).json({ success: false, message: 'Validation failed', errors, timestamp: new Date().toISOString() });
    }
    req.validatedBody = result.data;
    next();
  };
}

module.exports = validate;
`;
}

function genResponseUtils() {
  return `function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data, timestamp: new Date().toISOString() });
}

function errorResponse(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const response = { success: false, message, timestamp: new Date().toISOString() };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
}

function paginatedResponse(res, data, total, page, limit, message = 'Success') {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true, message, data,
    pagination: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { successResponse, errorResponse, paginatedResponse };
`;
}

function genEnvExample(port) {
  return `PORT=${port}
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=docbridge_db
DB_USER=docbridge_user
DB_PASSWORD=DocBridge@2024Secure
DB_SSL=false

JWT_ACCESS_SECRET=replace_with_strong_secret_min_32_chars_access
LOG_LEVEL=debug
`;
}

// Generate shared files for each service
for (const [svcName, cfg] of Object.entries(serviceConfigs)) {
  const svcDir = path.join(base, svcName);
  
  // Config files
  fs.writeFileSync(path.join(svcDir, 'src', 'config', 'environment.js'), genEnvConfig(cfg.port));
  fs.writeFileSync(path.join(svcDir, 'src', 'config', 'logger.js'), genLogger());
  fs.writeFileSync(path.join(svcDir, 'src', 'config', 'database.js'), genDatabase());
  
  // Middleware
  fs.writeFileSync(path.join(svcDir, 'src', 'middleware', 'authenticate.js'), genAuthenticate());
  if (svcName !== 'health-summary-service') {
    fs.writeFileSync(path.join(svcDir, 'src', 'middleware', 'validate.js'), genValidate());
  }

  // Utils directory
  const utilsDir = path.join(svcDir, 'src', 'utils');
  if (!fs.existsSync(utilsDir)) fs.mkdirSync(utilsDir, { recursive: true });
  fs.writeFileSync(path.join(utilsDir, 'responseUtils.js'), genResponseUtils());
  
  // .env.example
  fs.writeFileSync(path.join(svcDir, '.env.example'), genEnvExample(cfg.port));
  
  console.log(`Generated shared files for ${svcName}`);
}

console.log('All shared files generated!');
