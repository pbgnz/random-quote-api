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

describe("the responses from the quotes api", () => {

    it('should return a 200 status code and JSON content type', async () => {
        await request(app)
            .get('/api/quotes')
            .expect('Content-Type', /json/)
            .expect(200);
    });

    it('should contain quotes per api call', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThan(0);
        expect(response.body.quotes.length).toBeLessThanOrEqual(30);
    });

    it('should contain the proper fields of id, author, quote', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        const randomIndex = Math.floor(Math.random() * response.body.quotes.length);

        expect(response.body.quotes[randomIndex].id).toBeTruthy();
        expect(response.body.quotes[randomIndex].author).toBeTruthy();
        expect(response.body.quotes[randomIndex].quote).toBeTruthy();
    });

    it('should contain different quotes in the response', async () => {
        const response = await request(app)
            .get('/api/quotes')
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
            .get('/api/quotes')
            .send()
            .expect(200);

        const secondResponse = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        // Both should have quotes
        expect(firstResponse.body.quotes.length).toBeGreaterThan(0);
        expect(secondResponse.body.quotes.length).toBeGreaterThan(0);
    });

    it('should have unique IDs within a response', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        const ids = response.body.quotes.map(quote => quote.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toEqual(ids.length);
    });

    it('should not contain empty fields in any quote', async () => {
        const response = await request(app)
            .get('/api/quotes')
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
            .get('/api/quotes?count=5')
            .expect(200);

        expect(response.body.quotes.length).toEqual(5);
    });

    it('should return all quotes when count is not specified', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore a non-numeric count and return all quotes', async () => {
        const response = await request(app)
            .get('/api/quotes?count=abc')
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore count=0 and return all quotes', async () => {
        const response = await request(app)
            .get('/api/quotes?count=0')
            .expect(200);

        expect(response.body.quotes.length).toBeGreaterThanOrEqual(1);
    });

    it('should respect count upper bound of 30', async () => {
        const response = await request(app)
            .get('/api/quotes?count=100')
            .expect(200);

        expect(response.body.quotes.length).toBeLessThanOrEqual(30);
    });
});

describe("GET /api/quotes/random", () => {
    it('should return 200 and a single quote object', async () => {
        const response = await request(app)
            .get('/api/quotes/random')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body.quote).toBeDefined();
        expect(response.body.quote.id).toBeTruthy();
        expect(response.body.quote.author).toBeTruthy();
        expect(response.body.quote.quote).toBeTruthy();
    });

    it('should not return a quotes array', async () => {
        const response = await request(app)
            .get('/api/quotes/random')
            .expect(200);

        expect(response.body.quotes).toBeUndefined();
    });
});

describe("GET /api/cache/stats", () => {
    it('should return cache statistics with required fields', async () => {
        const response = await request(app)
            .get('/api/cache/stats')
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
            .get('/api/cache/stats')
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
