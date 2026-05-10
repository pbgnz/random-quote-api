const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  req.id = randomUUID();
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request', {
      req_id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration
    });
  });

  next();
};

module.exports = requestLogger;
