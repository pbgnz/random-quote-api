const express = require('express');
const router = express.Router();
const app = express();
const cors = require('cors')
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const rateLimit = require('express-rate-limit');

// set up rate limiter: maximum of ten requests per minute
const limiter = rateLimit({
  windowMs: 1*60*1000, // 1 minute
  max: 1000
});

const allowedOrigins = ['http://localhost:3000', 'https://escobot.github.io']; // add frontend application
const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    optionsSuccessStatus: 200,
    methods: "GET"
}
app.use(limiter);
app.use(cors(corsOptions));
app.use(express.json());
app.use(router);

let identityMap = new Map();

router.get('/', (req, res) => {
    res.status(200).sendFile(path.join(__dirname + '/index.html'));
});

router.get('/api/quotes', (req, res) => {
    let pageNumber = Math.floor(Math.random() * 100) + 1;

    if (identityMap.has(pageNumber)) {
        const quotes = identityMap.get(pageNumber);
        res.status(200).send({ quotes });
    } else {
        let quotes = [];
        axios.get('https://www.goodreads.com/quotes?page=' + pageNumber).then(response => {
            let $ = cheerio.load(response.data);
            $('div.quoteText').each(function (index) {
              const quote = $(this)[0].children[0].data.replace(/(\r\n|\n|\r| +(?= )| “|”)/gm, "");
              const id = ((pageNumber - 1) * 30) + index;
              quotes.push({ quote, id });
            });
            $('span.authorOrTitle').each(function (index) {
              quotes[index].author = $(this)[0].children[0].data.replace(/(\r\n|\n|\r| +(?= )|,)/gm, "");
            });
            identityMap.set(pageNumber, quotes);
            res.status(200).send({ quotes });
        }).catch(error => {
            res.send("401: Error getting quotes");
        });
    }
});

router.get('*', (req, res) => {
    res.status(404).send({ error: "404 not found"});
});

module.exports = app;
