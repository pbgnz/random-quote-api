const cheerio = require('cheerio');
const fetchWithRetry = require('../utils/fetchWithRetry');

async function scrapeQuotes(pageNumber, logger) {
  const url = `https://www.goodreads.com/quotes?page=${pageNumber}`;

  logger.debug('Scraping Goodreads', { pageNumber });

  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  const quotes = [];

  $('div.quoteText').each((index, el) => {
    const rawText = $(el).text();

    const quoteText = rawText.split('―')[0]?.trim();

    if (!quoteText) return;

    quotes.push({
      id: ((pageNumber - 1) * 30) + index,
      quote: quoteText
    });
  });

  $('span.authorOrTitle').each((index, el) => {
    if (!quotes[index]) return;

    const author = $(el).text().trim().replace(/,$/, '');

    quotes[index].author = author;
  });

  // Clean invalid entries
  return quotes.filter(q => q.quote && q.author);
}

module.exports = scrapeQuotes;