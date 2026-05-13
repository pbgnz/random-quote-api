const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');

const QuotesCache = require('./cache/quotesCache');
const logger = require('./utils/logger');
const QuotesService = require('./services/quotesService');
const requestLogger = require('./middleware/requestLogger');
const metricsCollector = require('./utils/metricsCollector');

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
    }
  }
}));
app.use(compression());
app.use(requestLogger);
app.use(express.json());

// Rate limiting
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;

app.use('/api/', rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn('CORS blocked', { origin });
    cb(new Error('Not allowed by CORS'));
  }
}));

// Cache + service
const cache = new QuotesCache(parseInt(process.env.CACHE_TTL_MINUTES) || 60, logger);
const quotesService = new QuotesService(cache, logger);

// Server start time for health checks
const startTime = Date.now();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    status: 'ok',
    uptime,
    timestamp: new Date().toISOString()
  });
});

app.get('/metrics', (req, res) => {
  const data = metricsCollector.getMetrics();
  const cacheStats = cache.getStats();

  if ((req.headers['accept'] || '').includes('text/plain')) {
    const lines = [
      '# HELP requests_total Total HTTP requests received',
      '# TYPE requests_total counter',
      `requests_total ${data.requests_total}`,
      '# HELP errors_total Total HTTP 5xx errors',
      '# TYPE errors_total counter',
      `errors_total ${data.errors_total}`,
      '# HELP uptime_seconds Server uptime in seconds',
      '# TYPE uptime_seconds gauge',
      `uptime_seconds ${data.uptime_seconds}`,
      '# HELP cache_hits_total Total cache hits',
      '# TYPE cache_hits_total counter',
      `cache_hits_total ${cacheStats.hits}`,
      '# HELP cache_misses_total Total cache misses',
      '# TYPE cache_misses_total counter',
      `cache_misses_total ${cacheStats.misses}`,
      '# HELP cache_size Number of cached pages',
      '# TYPE cache_size gauge',
      `cache_size ${cacheStats.cacheSize}`,
    ];
    for (const [path, count] of Object.entries(data.requests_by_path)) {
      lines.push(`requests_by_path{path="${path}"} ${count}`);
    }
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(lines.join('\n') + '\n');
  }

  res.json({
    ...data,
    cache: {
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hitRate,
      cacheSize: cacheStats.cacheSize,
    }
  });
});

// API v1 Routes
app.get('/api/v1/quotes/daily', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const hash = (today.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0)) >>> 0;
    const pageNumber = (hash % quotesService.maxPage) + 1;
    const result = await quotesService.getQuotes({ page: pageNumber });
    const quotes = result.quotes;
    if (!quotes.length) throw new Error('No quotes available');
    const quote = quotes[hash % quotes.length];
    res.json({ quote, date: today });
  } catch (err) {
    res.status(500).json({ message: 'Error getting quote of the day' });
  }
});

app.get('/api/v1/quotes/random', async (req, res) => {
  try {
    const page = req.query.page !== undefined ? parseInt(req.query.page, 10) : undefined;
    const result = await quotesService.getQuotes({ page });
    const quote = result.quotes[Math.floor(Math.random() * result.quotes.length)];
    res.json({ quote });
  } catch (err) {
    res.status(500).json({ message: 'Error getting quotes' });
  }
});

app.get('/api/v1/quotes', async (req, res) => {
  try {
    const count = req.query.count !== undefined ? parseInt(req.query.count, 10) : undefined;
    const validCount = Number.isInteger(count) && count >= 1 && count <= 30 ? count : undefined;
    const page = req.query.page !== undefined ? parseInt(req.query.page, 10) : undefined;
    const result = await quotesService.getQuotes({ count: validCount, page });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error getting quotes' });
  }
});

app.get('/api/v1/cache/stats', (req, res) => {
  res.json(cache.getStats());
});

// API Documentation
app.get('/api/docs', (req, res) => {
  try {
    const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
    const openapiContent = fs.readFileSync(openapiPath, 'utf8');
    const openapiSpec = yaml.load(openapiContent);
    res.json(openapiSpec);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load API documentation' });
  }
});

// Interactive API docs (Scalar UI)
app.get('/docs', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html>
<html>
  <head>
    <title>Random Quote API Docs</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/docs"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
});

// Backward compatibility: redirect old /api/* routes to /api/v1/*
app.get('/api/quotes/random', (req, res) => {
  res.redirect(301, '/api/v1/quotes/random');
});

app.get('/api/quotes', (req, res) => {
  res.redirect(301, '/api/v1/quotes' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''));
});

app.get('/api/cache/stats', (req, res) => {
  res.redirect(301, '/api/v1/cache/stats');
});

app.get('/*splat', (req, res) => {
  res.status(404).json({ error: '404 not found' });
});

module.exports = app;