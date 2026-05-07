const scrapeQuotes = require('../scraper/goodreadsScraper');

class QuotesService {
  constructor(cache, logger) {
    this.cache = cache;
    this.logger = logger;
    this.maxPage = parseInt(process.env.SCRAPER_MAX_PAGE) || 100;
  }

  async getQuotes({ count } = {}) {
    const pageNumber = Math.floor(Math.random() * this.maxPage) + 1;

    const cached = this.cache.get(pageNumber);
    if (cached) {
      this.logger.debug('Cache hit', { pageNumber });
      const quotes = cached;
      return { quotes: count ? quotes.slice(0, count) : quotes };
    }

    try {
      const quotes = await scrapeQuotes(pageNumber, this.logger);

      if (!quotes.length) {
        throw new Error('No quotes scraped');
      }

      this.cache.set(pageNumber, quotes);

      this.logger.info('Quotes scraped + cached', {
        pageNumber,
        count: quotes.length
      });

      return { quotes: count ? quotes.slice(0, count) : quotes };

    } catch (error) {
      this.logger.error('Scraping failed', {
        pageNumber,
        error: error.message
      });

      // Fallback to ANY cached data
      const fallback = this.cache.getAny();

      if (fallback) {
        this.logger.warn('Using fallback cache');
        const quotes = fallback;
        return { quotes: count ? quotes.slice(0, count) : quotes };
      }

      throw error;
    }
  }
}

module.exports = QuotesService;