const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { recordRequest, recordError } = require('../utils/metricsCollector');

const requestLogger = (req, res, next) => {
  req.id = randomUUID();
  const startTime = Date.now();

  recordRequest(req.path, 0);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request', {
      req_id: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: duration
    });
    if (res.statusCode >= 500) {
      recordError();
    }
  });

  next();
};

module.exports = requestLogger;
