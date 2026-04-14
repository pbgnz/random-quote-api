/**
 * Structured JSON Logger
 * Outputs newline-delimited JSON (NDJSON) format compatible with log aggregators
 * Log levels: debug, info, warn, error
 */

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLogLevel = logLevels[process.env.LOG_LEVEL || 'info'];

/**
 * Format and output a log entry as JSON
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {object} data - Additional context data
 */
const log = (level, message, data = {}) => {
  // Skip logs below current level
  if (logLevels[level] < currentLogLevel) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  };

  console.log(JSON.stringify(logEntry));
};

module.exports = {
  debug: (message, data) => log('debug', message, data),
  info: (message, data) => log('info', message, data),
  warn: (message, data) => log('warn', message, data),
  error: (message, data) => log('error', message, data)
};
