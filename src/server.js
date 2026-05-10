require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const port = process.env.PORT || 8000;
const appUrl = process.env.APP_URL || `http://localhost:${port}`;

const server = app.listen(port, () => {
  logger.info('Server started', { port, url: appUrl });
});

const gracefulShutdown = (signal) => {
  logger.info('Shutdown signal received', { signal });
  server.close(() => {
    logger.info('Server closed, exiting', { signal });
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Force closing remaining connections after timeout', { timeout_ms: 10000 });
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
