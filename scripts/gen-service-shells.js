const fs = require('fs');
const path = require('path');
const base = 'c:\\Users\\DELL\\Downloads\\Azure_Project\\docbridge\\services';

const services = [
  { name: 'consultation-service', port: 3002, display: 'Consultation Service', routeMount: '/api/v1/consultations', routeFile: 'consultationRoutes', deps: {} },
  { name: 'prescription-service', port: 3003, display: 'Prescription Service', routeMount: '/api/v1/prescriptions', routeFile: 'prescriptionRoutes', deps: {} },
  { name: 'reminder-service', port: 3004, display: 'Reminder Service', routeMount: '/api/v1/reminders', routeFile: 'reminderRoutes', deps: { 'node-cron': '^3.0.3' } },
  { name: 'labreport-service', port: 3005, display: 'Lab Report Service', routeMount: '/api/v1/lab-reports', routeFile: 'labReportRoutes', deps: {} },
  { name: 'symptom-service', port: 3006, display: 'Symptom Service', routeMount: '/api/v1/symptoms', routeFile: 'symptomRoutes', deps: {} },
  { name: 'ai-companion-service', port: 3007, display: 'AI Companion Service', routeMount: '/api/v1/ai', routeFile: 'aiCompanionRoutes', deps: { '@azure/openai': '^1.0.0-beta.12', 'node-cache': '^5.1.2' } },
  { name: 'health-summary-service', port: 3008, display: 'Health Summary Service', routeMount: '/api/v1/health-summary', routeFile: 'healthSummaryRoutes', deps: {} },
  { name: 'family-service', port: 3009, display: 'Family Service', routeMount: '/api/v1/family', routeFile: 'familyRoutes', deps: {} },
];

for (const svc of services) {
  // package.json
  const pkgDeps = {
    'cors': '^2.8.5',
    'dotenv': '^16.4.5',
    'express': '^4.19.2',
    'helmet': '^7.1.0',
    'hpp': '^0.2.3',
    'jsonwebtoken': '^9.0.2',
    'morgan': '^1.10.0',
    'pg': '^8.11.5',
    'pg-hstore': '^2.3.4',
    'sequelize': '^6.37.3',
    'winston': '^3.13.0',
    'zod': '^3.23.8',
    ...svc.deps,
  };

  const pkg = {
    name: `docbridge-${svc.name}`,
    version: '1.0.0',
    description: `DocBridge ${svc.display}`,
    main: 'src/server.js',
    scripts: { start: 'node src/server.js', dev: 'nodemon src/server.js' },
    dependencies: pkgDeps,
    devDependencies: { nodemon: '^3.1.0' },
  };
  fs.writeFileSync(path.join(base, svc.name, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

  // app.js
  const hasScheduler = svc.name === 'reminder-service';
  const appJs = `const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const morgan = require('morgan');
const env = require('./config/environment');
const logger = require('./config/logger');
const routes = require('./routes/${svc.routeFile}');

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(hpp());
app.use(morgan('combined', { stream: logger.stream }));

app.use('${svc.routeMount}', routes);

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const { sequelize } = require('./config/database');
    await sequelize.authenticate();
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'disconnected';
  }
  res.json({
    status: 'healthy',
    service: '${svc.name}',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', timestamp: new Date().toISOString() });
});

app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', { message: err.message, stack: env.NODE_ENV === 'development' ? err.stack : undefined, path: req.originalUrl });
  res.status(err.statusCode || 500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
`;
  fs.writeFileSync(path.join(base, svc.name, 'src', 'app.js'), appJs);

  // server.js
  const schedulerInit = hasScheduler ? `
    // Initialize reminder scheduler
    const { initializeScheduler } = require('./services/schedulerService');
    initializeScheduler();
` : '';

  const serverJs = `const env = require('./config/environment');
const logger = require('./config/logger');
const { connectWithRetry } = require('./config/database');

async function startServer() {
  try {
    await connectWithRetry();
    require('./models');
${schedulerInit}
    const app = require('./app');
    const server = app.listen(env.PORT, () => {
      logger.info('============================================');
      logger.info('  DocBridge ${svc.display}');
      logger.info(\`  Port:        \${env.PORT}\`);
      logger.info(\`  Environment: \${env.NODE_ENV}\`);
      logger.info(\`  Database:    \${env.DB_HOST}:\${env.DB_PORT}/\${env.DB_NAME}\`);
      logger.info('============================================');
    });

    function gracefulShutdown(signal) {
      logger.info(\`\${signal} received. Shutting down ${svc.name} gracefully...\`);
      server.close(async () => {
        try {
          const { sequelize } = require('./config/database');
          await sequelize.close();
        } catch (e) { /* ignore */ }
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start ${svc.name}:', error.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => { const logger = require('./config/logger'); logger.error('Unhandled Rejection:', reason); });
process.on('uncaughtException', (error) => { const logger = require('./config/logger'); logger.error('Uncaught Exception:', error); process.exit(1); });

startServer();
`;
  fs.writeFileSync(path.join(base, svc.name, 'src', 'server.js'), serverJs);

  console.log(`Generated package.json, app.js, server.js for ${svc.name}`);
}

console.log('Done!');
