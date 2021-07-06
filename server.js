const express = require('express');
const router = express.Router();
const app = express();
const cors = require('cors')
const path = require('path');
const request = require('request');
const cheerio = require('cheerio');

const corsOptions = {
    origin: 'https://escobot.github.io/random-quote-machine/',
    optionsSuccessStatus: 200,
    methods: "GET"
}
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
        request('https://www.goodreads.com/quotes?page=' + pageNumber, function (err, r, body) {
            if (err) {
                res.send("401: Error getting quotes");
            } else {
                let $ = cheerio.load(body);
                $('div.quoteText').each(function (index) {
                    const quote = $(this)[0].children[0].data.replace(/(\r\n|\n|\r| +(?= )| “|”)/gm, "");
                    const id = index;
                    quotes.push({ quote, id });
                });
                $('span.authorOrTitle').each(function (index) {
                    quotes[index].author = $(this)[0].children[0].data.replace(/(\r\n|\n|\r| +(?= )|,)/gm, "");
                });
                identityMap.set(pageNumber, quotes);
                res.status(200).send({ quotes });
            }
        });
    }
});

router.get('*', (req, res) => {
    res.status(404).send({ error: "404 not found"});
});

module.exports = app;
