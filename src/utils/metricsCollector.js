const startTime = Date.now();
const metrics = { requestsTotal: 0, requestsByPath: {}, errorsTotal: 0 };

function recordRequest(path, statusCode) {
  metrics.requestsTotal++;
  metrics.requestsByPath[path] = (metrics.requestsByPath[path] || 0) + 1;
  if (statusCode >= 500) metrics.errorsTotal++;
}

function recordError() {
  metrics.errorsTotal++;
}

function getMetrics() {
  return {
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    requests_total: metrics.requestsTotal,
    requests_by_path: { ...metrics.requestsByPath },
    errors_total: metrics.errorsTotal,
  };
}

function reset() {
  metrics.requestsTotal = 0;
  metrics.requestsByPath = {};
  metrics.errorsTotal = 0;
}

module.exports = { recordRequest, recordError, getMetrics, reset };
