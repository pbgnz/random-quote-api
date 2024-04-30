const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');

// Rate limiter: maximum of 1000 requests per minute
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000
});

const allowedOrigins = ['http://localhost:3000', 'https://escobot.github.io'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  methods: "GET"
};

app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json());

const identityMap = new Map();

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/api/quotes', async (req, res) => {
  const pageNumber = Math.floor(Math.random() * 100) + 1;

  if (identityMap.has(pageNumber)) {
    const quotes = identityMap.get(pageNumber);
    res.status(200).json({ quotes });
  } else {
    try {
      const response = await axios.get(`https://www.goodreads.com/quotes?page=${pageNumber}`);
      const $ = cheerio.load(response.data);
      const quotes = [];

      $('div.quoteText').each(function (index) {
        const quote = $(this)[0].children[0].data.replace(/(\r\n|\n|\r| +(?= )| “|”)/gm, "");
        const id = ((pageNumber - 1) * 30) + index;
        quotes.push({ quote, id });
      });

      $('span.authorOrTitle').each(function (index) {
        quotes[index].author = $(this)[0].children[0].data.trim().replace(/(\r\n|\n|\r|^ +| +$|,)/gm, "");
      });

      identityMap.set(pageNumber, quotes);
      res.status(200).json({ quotes });
    } catch (error) {
      res.status(401).json({ message: "Error getting quotes" });
    }
  }
});

app.get('*', (req, res) => {
  res.status(404).json({ error: "404 not found" });
});

module.exports = app;
