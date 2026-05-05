class QuotesCache {
  /**
   * @param {number} ttlMinutes - Time to live for cached entries in minutes
   * @param {object} logger - Logger instance for structured logging
   */
  constructor(ttlMinutes = 60, logger = null) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.store = new Map();
    this.logger = logger;
    this.metrics = {
      hits: 0,
      misses: 0,
      expirations: 0
    };
  }

  /**
   * Get cached quotes if they exist and haven't expired
   * @param {number} pageNumber - The page number to retrieve
   * @returns {Array|null} - Array of quotes or null if not found/expired
   */
  get(pageNumber) {
    const cached = this.store.get(pageNumber);

    if (!cached) {
      this.metrics.misses++;
      this.logger?.debug('Cache miss', { pageNumber });
      return null;
    }

    if (this._isExpired(cached.timestamp)) {
      this.metrics.expirations++;
      this.store.delete(pageNumber);
      this.logger?.debug('Cache expired', { pageNumber, ageMs: Date.now() - cached.timestamp });
      return null;
    }

    this.metrics.hits++;
    this.logger?.debug('Cache hit', { pageNumber, ageMs: Date.now() - cached.timestamp });
    return cached.quotes;
  }

  /**
   * Set cache entry with current timestamp
   * @param {number} pageNumber - The page number
   * @param {Array} quotes - Array of quotes to cache
   */
  set(pageNumber, quotes) {
    this.store.set(pageNumber, {
      quotes,
      timestamp: Date.now()
    });
  }

  /**
   * Get cache statistics
   * @returns {Object} - Objects with hits, misses, expirations, and hit rate percentage
   */
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      expirations: this.metrics.expirations,
      hitRate: totalRequests > 0
        ? ((this.metrics.hits / totalRequests) * 100).toFixed(2) + '%'
        : 'N/A',
      cacheSize: this.store.size
    };
  }

  /**
   * Clear all cached entries and reset metrics
   * Useful for testing or manual cache invalidation
   */
  reset() {
    this.store.clear();
    this.metrics = { hits: 0, misses: 0, expirations: 0 };
  }

  getAny() {
    for (const [, entry] of this.store) {
      if (!this._isExpired(entry.timestamp)) {
        return entry.quotes;
      }
    }
    return null;
  }

  /**
   * Private: Check if a cached entry has expired
   * @private
   * @param {number} timestamp - The timestamp to check
   * @returns {boolean} - True if expired
   */
  _isExpired(timestamp) {
    return Date.now() - timestamp > this.ttlMs;
  }
}

module.exports = QuotesCache;
