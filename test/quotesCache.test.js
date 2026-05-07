const QuotesCache = require('../src/cache/quotesCache');

describe('QuotesCache', () => {
  let cache;
  let mockLogger;

  const sampleQuotes = [
    { id: 0, quote: 'Test quote 1', author: 'Author 1' },
    { id: 1, quote: 'Test quote 2', author: 'Author 2' },
    { id: 2, quote: 'Test quote 3', author: 'Author 3' },
  ];

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    cache = new QuotesCache(60, mockLogger); // 60 minute TTL
  });

  describe('set and get', () => {
    it('should store and retrieve quotes by page number', () => {
      cache.set(1, sampleQuotes);
      const result = cache.get(1);
      expect(result).toEqual(sampleQuotes);
    });

    it('should return null for missing keys', () => {
      const result = cache.get(999);
      expect(result).toBeNull();
    });

    it('should overwrite existing values', () => {
      const quotes1 = [{ id: 0, quote: 'Quote 1', author: 'Author 1' }];
      const quotes2 = [{ id: 0, quote: 'Quote 2', author: 'Author 2' }];

      cache.set(1, quotes1);
      expect(cache.get(1)).toEqual(quotes1);

      cache.set(1, quotes2);
      expect(cache.get(1)).toEqual(quotes2);
    });
  });

  describe('getAny', () => {
    it('should return any cached value when available', () => {
      cache.set(1, sampleQuotes);
      cache.set(5, [{ id: 100, quote: 'Other quote', author: 'Other author' }]);

      const result = cache.getAny();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return null when cache is empty', () => {
      const result = cache.getAny();
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return stats object with required fields', () => {
      const stats = cache.getStats();
      expect(stats.hits).toBeDefined();
      expect(stats.misses).toBeDefined();
      expect(stats.expirations).toBeDefined();
      expect(stats.hitRate).toBeDefined();
      expect(stats.cacheSize).toBeDefined();
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.expirations).toBe('number');
    });

    it('should track cache hits', () => {
      cache.set(1, sampleQuotes);
      const statsBefore = cache.getStats();

      cache.get(1);
      const statsAfter = cache.getStats();

      expect(statsAfter.hits).toBe(statsBefore.hits + 1);
    });

    it('should track cache misses', () => {
      const statsBefore = cache.getStats();

      cache.get(999); // Non-existent key
      const statsAfter = cache.getStats();

      expect(statsAfter.misses).toBe(statsBefore.misses + 1);
    });

    it('should calculate hit rate correctly', () => {
      cache.set(1, sampleQuotes);
      cache.get(1); // hit
      cache.get(1); // hit
      cache.get(999); // miss

      const stats = cache.getStats();
      // 2 hits out of 3 accesses = 66.67%
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should return N/A hit rate when no accesses', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('N/A');
    });
  });

  describe('reset', () => {
    it('should clear all cached data', () => {
      cache.set(1, sampleQuotes);
      cache.set(2, sampleQuotes);

      expect(cache.get(1)).toBeDefined();
      expect(cache.get(2)).toBeDefined();

      cache.reset();

      expect(cache.get(1)).toBeNull();
      expect(cache.get(2)).toBeNull();
    });

    it('should reset statistics to zero', () => {
      cache.set(1, sampleQuotes);
      cache.get(1); // Create a hit
      cache.get(999); // Create a miss

      const statsBefore = cache.getStats();
      expect(statsBefore.hits).toBeGreaterThan(0);
      expect(statsBefore.misses).toBeGreaterThan(0);

      cache.reset();

      const statsAfter = cache.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
      expect(statsAfter.expirations).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      // Create cache with 1ms TTL for testing
      cache = new QuotesCache(0.000016, mockLogger); // ~1ms in minutes
    });

    it('should expire entries after TTL', async () => {
      cache.set(1, sampleQuotes);
      expect(cache.get(1)).toEqual(sampleQuotes);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = cache.get(1);
      expect(result).toBeNull();
    });

    it('should track expirations', async () => {
      cache.set(1, sampleQuotes);
      const statsBefore = cache.getStats();

      cache.get(1); // Access before expiration
      await new Promise(resolve => setTimeout(resolve, 50));
      cache.get(1); // Access after expiration

      const statsAfter = cache.getStats();
      expect(statsAfter.expirations).toBeGreaterThan(statsBefore.expirations);
    });
  });

  describe('size tracking', () => {
    it('should track the number of items in cache', () => {
      const stats1 = cache.getStats();
      expect(stats1.cacheSize).toBe(0);

      cache.set(1, sampleQuotes);
      const stats2 = cache.getStats();
      expect(stats2.cacheSize).toBe(1);

      cache.set(2, sampleQuotes);
      const stats3 = cache.getStats();
      expect(stats3.cacheSize).toBe(2);
    });
  });
});
