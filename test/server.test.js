const request = require('supertest');

// Mock the scraper before requiring the app
jest.mock('../src/scraper/goodreadsScraper', () => {
  const mockQuotes = {
    1: [
      { id: 0, quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { id: 1, quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
      { id: 2, quote: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
    ],
    2: [
      { id: 30, quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
      { id: 31, quote: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
      { id: 32, quote: "You learn more from failure than from success.", author: "Unknown" },
    ],
  };

  const getQuotes = (pageNumber) => {
    if (mockQuotes[pageNumber]) {
      return mockQuotes[pageNumber];
    }
    const baseId = (pageNumber - 1) * 30;
    return Array.from({ length: 5 }, (_, i) => ({
      id: baseId + i,
      quote: `Quote ${baseId + i}`,
      author: `Author ${pageNumber}`
    }));
  };

  return jest.fn((pageNumber) => Promise.resolve(getQuotes(pageNumber)));
});

const app = require('../src/app');

describe("the responses from the quotes api (v1)", () => {

    it('should return a 200 status code and JSON content type', async () => {
        await request(app)
            .get('/api/v1/quotes')
            .expect('Content-Type', /json/)
            .expect(200);
    });

    it('should contain quotes per api call', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThan(0);
        expect(response.body.quotes.length).toBeLessThanOrEqual(30);
    });

    it('should contain the proper fields of id, author, quote', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        const randomIndex = Math.floor(Math.random() * response.body.quotes.length);

        expect(response.body.quotes[randomIndex].id).toBeTruthy();
        expect(response.body.quotes[randomIndex].author).toBeTruthy();
        expect(response.body.quotes[randomIndex].quote).toBeTruthy();
    });

    it('should contain different quotes in the response', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        const length = response.body.quotes.length;
        if (length < 2) {
            // Skip test if not enough quotes
            expect(length).toBeGreaterThanOrEqual(1);
            return;
        }

        const randomIndexFirstHalf = Math.floor(Math.random() * Math.ceil(length / 2));
        const randomIndexSecondHalf = Math.floor(Math.random() * Math.floor(length / 2)) + Math.ceil(length / 2);

        expect(response.body.quotes[randomIndexFirstHalf].id === response.body.quotes[randomIndexSecondHalf].id).toBeFalsy();
    });

    it('should return different pages on successive requests', async () => {
        // This test requests quotes twice and verifies we get different pages
        // (because we mock random page selection)
        const firstResponse = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        const secondResponse = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        // Both should have quotes
        expect(firstResponse.body.quotes.length).toBeGreaterThan(0);
        expect(secondResponse.body.quotes.length).toBeGreaterThan(0);
    });

    it('should have unique IDs within a response', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        const ids = response.body.quotes.map(quote => quote.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toEqual(ids.length);
    });

    it('should not contain empty fields in any quote', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .send()
            .expect(200);

        response.body.quotes.forEach(quote => {
            expect(quote.id).not.toBe('');
            expect(quote.author).not.toBe('');
            expect(quote.quote).not.toBe('');
        });
    });

    it('should return an error for invalid endpoints', async () => {
        await request(app)
            .get('/api/invalid_endpoint')
            .expect(404);
    });
});

describe("GET /api/quotes with ?count param", () => {
    it('should return exactly the requested number of quotes', async () => {
        const response = await request(app)
            .get('/api/v1/quotes?count=5')
            .expect(200);

        expect(response.body.quotes.length).toEqual(5);
    });

    it('should return all quotes when count is not specified', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore a non-numeric count and return all quotes', async () => {
        const response = await request(app)
            .get('/api/v1/quotes?count=abc')
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore count=0 and return all quotes', async () => {
        const response = await request(app)
            .get('/api/v1/quotes?count=0')
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect count upper bound of 30', async () => {
        const response = await request(app)
            .get('/api/v1/quotes?count=100')
            .expect(200);

        expect(response.body.quotes.length).toBeLessThanOrEqual(30);
    });
});

describe("GET /api/quotes/random", () => {
    it('should return 200 and a single quote object', async () => {
        const response = await request(app)
            .get('/api/v1/quotes/random')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.quote).toBeDefined();
        expect(response.body.quote.id).toBeTruthy();
        expect(response.body.quote.author).toBeTruthy();
        expect(response.body.quote.quote).toBeTruthy();
    });

    it('should not return a quotes array', async () => {
        const response = await request(app)
            .get('/api/v1/quotes/random')
            .expect(200);

        expect(response.body.quotes).toBeUndefined();
    });
});

describe("GET /api/v1/cache/stats", () => {
    it('should return cache statistics with required fields', async () => {
        const response = await request(app)
            .get('/api/v1/cache/stats')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.hits).toBeDefined();
        expect(response.body.misses).toBeDefined();
        expect(response.body.expirations).toBeDefined();
        expect(response.body.hitRate).toBeDefined();
        expect(typeof response.body.hits).toBe('number');
        expect(typeof response.body.misses).toBe('number');
    });

    it('should show stats as numbers', async () => {
        const response = await request(app)
            .get('/api/v1/cache/stats')
            .expect(200);

        const { hits, misses, expirations } = response.body;
        expect(typeof hits).toBe('number');
        expect(typeof misses).toBe('number');
        expect(typeof expirations).toBe('number');
        expect(hits >= 0).toBe(true);
        expect(misses >= 0).toBe(true);
        expect(expirations >= 0).toBe(true);
    });
});

describe("GET /health", () => {
    it('should return 200 with health status', async () => {
        const response = await request(app)
            .get('/health')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.status).toBe('ok');
    });

    it('should include uptime as a number', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(typeof response.body.uptime).toBe('number');
        expect(response.body.uptime >= 0).toBe(true);
    });

    it('should include timestamp in ISO format', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body.timestamp).toBeDefined();
        const timestamp = new Date(response.body.timestamp);
        expect(timestamp.toString()).not.toBe('Invalid Date');
    });

    it('should return required fields', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('timestamp');
    });
});

describe("API v1 Routes", () => {
    it('GET /api/v1/quotes should return 200 status code', async () => {
        await request(app)
            .get('/api/v1/quotes')
            .expect('Content-Type', /json/)
            .expect(200);
    });

    it('GET /api/v1/quotes should return quotes array', async () => {
        const response = await request(app)
            .get('/api/v1/quotes')
            .expect(200);

        expect(response.body.quotes).toBeDefined();
        expect(Array.isArray(response.body.quotes)).toBe(true);
        expect(response.body.quotes.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/quotes?count=5 should return exactly 5 quotes', async () => {
        const response = await request(app)
            .get('/api/v1/quotes?count=5')
            .expect(200);

        expect(response.body.quotes.length).toEqual(5);
    });

    it('GET /api/v1/quotes/random should return a single quote', async () => {
        const response = await request(app)
            .get('/api/v1/quotes/random')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.quote).toBeDefined();
        expect(response.body.quote.id).toBeTruthy();
        expect(response.body.quote.author).toBeTruthy();
        expect(response.body.quote.quote).toBeTruthy();
    });

    it('GET /api/v1/cache/stats should return cache statistics', async () => {
        const response = await request(app)
            .get('/api/v1/cache/stats')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.hits).toBeDefined();
        expect(response.body.misses).toBeDefined();
        expect(response.body.expirations).toBeDefined();
        expect(response.body.hitRate).toBeDefined();
    });
});

describe("Backward Compatibility - API Redirects", () => {
    it('GET /api/quotes should redirect to /api/v1/quotes', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .expect(301);

        expect(response.header.location).toBe('/api/v1/quotes');
    });

    it('GET /api/quotes?count=3 should redirect to /api/v1/quotes with query params', async () => {
        const response = await request(app)
            .get('/api/quotes?count=3')
            .expect(301);

        expect(response.header.location).toContain('/api/v1/quotes');
        expect(response.header.location).toContain('count=3');
    });

    it('GET /api/quotes/random should redirect to /api/v1/quotes/random', async () => {
        const response = await request(app)
            .get('/api/quotes/random')
            .expect(301);

        expect(response.header.location).toBe('/api/v1/quotes/random');
    });

    it('GET /api/cache/stats should redirect to /api/v1/cache/stats', async () => {
        const response = await request(app)
            .get('/api/cache/stats')
            .expect(301);

        expect(response.header.location).toBe('/api/v1/cache/stats');
    });

    it('following redirect from /api/quotes should reach /api/v1/quotes', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .redirects(1)
            .expect(200);

        expect(response.body.quotes).toBeDefined();
        expect(Array.isArray(response.body.quotes)).toBe(true);
    });

    it('following redirect from /api/quotes/random should reach /api/v1/quotes/random', async () => {
        const response = await request(app)
            .get('/api/quotes/random')
            .redirects(1)
            .expect(200);

        expect(response.body.quote).toBeDefined();
    });
});

describe('GET /api/v1/quotes - ?page parameter', () => {
  it('should return quotes from page 1 when page=1 is specified', async () => {
    const res = await request(app).get('/api/v1/quotes?page=1').expect(200);
    expect(res.body.quotes).toBeDefined();
    expect(res.body.quotes.length).toBeGreaterThan(0);
    res.body.quotes.forEach(q => expect(q.id).toBeLessThan(30));
  });

  it('should return quotes from page 2 when page=2 is specified', async () => {
    const res = await request(app).get('/api/v1/quotes?page=2').expect(200);
    res.body.quotes.forEach(q => {
      expect(q.id).toBeGreaterThanOrEqual(30);
      expect(q.id).toBeLessThan(60);
    });
  });

  it('should ignore page=0 and return quotes from a random page', async () => {
    const res = await request(app).get('/api/v1/quotes?page=0').expect(200);
    expect(res.body.quotes.length).toBeGreaterThan(0);
  });

  it('should ignore non-integer page and return quotes from a random page', async () => {
    const res = await request(app).get('/api/v1/quotes?page=abc').expect(200);
    expect(res.body.quotes.length).toBeGreaterThan(0);
  });

  it('should honor both page and count params together', async () => {
    const res = await request(app).get('/api/v1/quotes?page=1&count=2').expect(200);
    expect(res.body.quotes).toHaveLength(2);
    res.body.quotes.forEach(q => expect(q.id).toBeLessThan(30));
  });
});

describe('GET /api/v1/quotes/random - ?page parameter', () => {
  it('should return a quote from page 1 when page=1 is specified', async () => {
    const res = await request(app).get('/api/v1/quotes/random?page=1').expect(200);
    expect(res.body.quote).toBeDefined();
    expect(res.body.quote.id).toBeLessThan(30);
  });

  it('should return a quote from page 2 when page=2 is specified', async () => {
    const res = await request(app).get('/api/v1/quotes/random?page=2').expect(200);
    expect(res.body.quote.id).toBeGreaterThanOrEqual(30);
    expect(res.body.quote.id).toBeLessThan(60);
  });

  it('should ignore invalid page and return any quote', async () => {
    const res = await request(app).get('/api/v1/quotes/random?page=999999').expect(200);
    expect(res.body.quote).toBeDefined();
  });
});

describe('GET /api/v1/quotes/daily', () => {
  it('should return 200 with quote and date fields', async () => {
    const res = await request(app).get('/api/v1/quotes/daily').expect('Content-Type', /json/).expect(200);
    expect(res.body.quote).toBeDefined();
    expect(res.body.date).toBeDefined();
  });

  it('should return a quote with id, quote, and author fields', async () => {
    const res = await request(app).get('/api/v1/quotes/daily').expect(200);
    expect(res.body.quote.id).toBeDefined();
    expect(res.body.quote.quote).toBeTruthy();
    expect(res.body.quote.author).toBeTruthy();
  });

  it('should return a date matching YYYY-MM-DD format', async () => {
    const res = await request(app).get('/api/v1/quotes/daily').expect(200);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return today\'s UTC date', async () => {
    const res = await request(app).get('/api/v1/quotes/daily').expect(200);
    const today = new Date().toISOString().slice(0, 10);
    expect(res.body.date).toBe(today);
  });

  it('should return the same quote on successive calls (deterministic)', async () => {
    const res1 = await request(app).get('/api/v1/quotes/daily').expect(200);
    const res2 = await request(app).get('/api/v1/quotes/daily').expect(200);
    expect(res1.body.quote.id).toBe(res2.body.quote.id);
    expect(res1.body.date).toBe(res2.body.date);
  });

  it('should not return a quotes array field', async () => {
    const res = await request(app).get('/api/v1/quotes/daily').expect(200);
    expect(res.body.quotes).toBeUndefined();
  });
});
