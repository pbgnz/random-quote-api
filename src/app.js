const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');

const QuotesCache = require('./cache/quotesCache');
const logger = require('./utils/logger');
const QuotesService = require('./services/quotesService');

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json());

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 100
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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/api/quotes', async (req, res) => {
  try {
    const count = req.query.count !== undefined ? parseInt(req.query.count, 10) : undefined;
    const validCount = Number.isInteger(count) && count >= 1 && count <= 30 ? count : undefined;
    const result = await quotesService.getQuotes({ count: validCount });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Error getting quotes' });
  }
});

app.get('/api/cache/stats', (req, res) => {
  res.json(cache.getStats());
});

app.get('*', (req, res) => {
  res.status(404).json({ error: '404 not found' });
});

module.exports = app;