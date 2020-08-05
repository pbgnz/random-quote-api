const express = require('express');
const router = express.Router();
const app = express();
const bodyParser = require('body-parser');
const request = require('request');
const cheerio = require('cheerio');

const port = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(router);

router.get('/api/quotes', (req, res) => {
    let pageNumber = Math.floor(Math.random() * 100) + 1;
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
            res.send({ quotes });
        }
    });
});

app.listen(port);
console.log('Server is running on port ' + port);