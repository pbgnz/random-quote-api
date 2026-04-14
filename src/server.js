const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');
const QuotesCache = require('./quotesCache');
const logger = require('./logger');

// Rate limiter: maximum of 1000 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000
});

// Parse allowed origins from environment variable
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(origin => origin.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS request blocked', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  methods: "GET"
};

app.use(cors(corsOptions));
app.use(express.json());

// Apply rate limiter only to API routes (not static files)
app.use('/api/', limiter);

// Initialize quotes cache with TTL from environment
const quotesCacheTtlMinutes = parseInt(process.env.CACHE_TTL_MINUTES) || 60;
const quoteCache = new QuotesCache(quotesCacheTtlMinutes, logger);

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/api/quotes', async (req, res) => {
  const pageNumber = Math.floor(Math.random() * 100) + 1;

  const cachedQuotes = quoteCache.get(pageNumber);
  if (cachedQuotes) {
    logger.debug('Returning cached quotes', { pageNumber, quoteCount: cachedQuotes.length });
    return res.status(200).json({ quotes: cachedQuotes });
  }

  try {
    logger.debug('Fetching quotes from Goodreads', { pageNumber });
    const response = await axios.get(`https://www.goodreads.com/quotes?page=${pageNumber}`, {
      timeout: 15000 // 15 second timeout
    });
    const $ = cheerio.load(response.data);
    const quotes = [];

    $('div.quoteText').each(function (index) {
      const quote = $(this)[0].children[0].data.replace(/(\r\n|\n|\r| +(?= )| "|")/gm, "");
      const id = ((pageNumber - 1) * 30) + index;
      quotes.push({ quote, id });
    });

    $('span.authorOrTitle').each(function (index) {
      quotes[index].author = $(this)[0].children[0].data.trim().replace(/(\r\n|\n|\r|^ +| +$|,)/gm, "");
    });

    quoteCache.set(pageNumber, quotes);
    logger.info('Quotes fetched and cached', { pageNumber, quoteCount: quotes.length });
    res.status(200).json({ quotes });
  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED';
    logger.error('Error fetching quotes from Goodreads', {
      pageNumber,
      errorMessage: error.message,
      errorCode: error.code,
      isTimeout,
      errorType: isTimeout ? 'TIMEOUT' : 'API_ERROR'
    });
    res.status(500).json({ message: "Error getting quotes" });
  }
});

// Cache stats endpoint (useful for monitoring)
app.get('/api/cache/stats', (req, res) => {
  const stats = quoteCache.getStats();
  logger.debug('Cache stats requested', stats);
  res.status(200).json(stats);
});

app.get('*', (req, res) => {
  logger.debug('404 - Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: "404 not found" });
});

module.exports = app;
