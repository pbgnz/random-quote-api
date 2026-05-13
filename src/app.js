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

// Middleware
app.use(helmet());
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

// API v1 Routes
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