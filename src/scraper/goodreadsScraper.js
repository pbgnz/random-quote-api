const cheerio = require('cheerio');
const fetchWithRetry = require('../utils/fetchWithRetry');

async function scrapeQuotes(pageNumber, logger) {
  const url = `https://www.goodreads.com/quotes?page=${pageNumber}`;

  logger.debug('Scraping Goodreads', { pageNumber });

  const html = await fetchWithRetry(url);
  const $ = cheerio.load(html);

  const quotes = [];

  $('div.quoteDetails').each((index, container) => {
    const el = $(container);

    const quoteText = el.find('div.quoteText').text().split('―')[0]?.trim();
    if (!quoteText) return;

    const author = el.find('div.quoteText > span.authorOrTitle').text().trim().replace(/,$/, '');
    if (!author) return;

    const titleEl = el.find('span[id^="quote_book_link_"] a');
    const bookTitle = titleEl.length ? titleEl.text().trim() : null;

    const tags = [];
    el.find('div.quoteFooter .greyText.smallText a').each((_, tagEl) => {
      const tag = $(tagEl).text().trim();
      if (tag) tags.push(tag);
    });

    quotes.push({
      id: ((pageNumber - 1) * 30) + index,
      quote: quoteText,
      author,
      bookTitle,
      tags,
    });
  });

  return quotes.filter(q => q.quote && q.author);
}

module.exports = scrapeQuotes;