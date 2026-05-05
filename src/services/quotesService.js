const scrapeQuotes = require('../scraper/goodreadsScraper');

class QuotesService {
  constructor(cache, logger) {
    this.cache = cache;
    this.logger = logger;
  }

  async getQuotes() {
    const pageNumber = Math.floor(Math.random() * 100) + 1;

    const cached = this.cache.get(pageNumber);
    if (cached) {
      this.logger.debug('Cache hit', { pageNumber });
      return { quotes: cached };
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

      return { quotes };

    } catch (error) {
      this.logger.error('Scraping failed', {
        pageNumber,
        error: error.message
      });

      // Fallback to ANY cached data
      const fallback = this.cache.getAny();

      if (fallback) {
        this.logger.warn('Using fallback cache');
        return { quotes: fallback };
      }

      throw error;
    }
  }
}

module.exports = QuotesService;