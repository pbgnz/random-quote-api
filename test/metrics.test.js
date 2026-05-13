const request = require('supertest');
const metricsCollector = require('../src/utils/metricsCollector');

jest.mock('../src/scraper/goodreadsScraper', () => {
  return jest.fn((pageNumber) => {
    const baseId = (pageNumber - 1) * 30;
    return Promise.resolve(
      Array.from({ length: 5 }, (_, i) => ({
        id: baseId + i,
        quote: `Quote ${baseId + i}`,
        author: `Author ${pageNumber}`
      }))
    );
  });
});

const app = require('../src/app');

describe('GET /metrics - JSON format', () => {
  beforeEach(() => {
    metricsCollector.reset();
  });

  it('should return 200 with JSON content type', async () => {
    await request(app)
      .get('/metrics')
      .expect('Content-Type', /json/)
      .expect(200);
  });

  it('should have uptime_seconds as a non-negative number', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(typeof res.body.uptime_seconds).toBe('number');
    expect(res.body.uptime_seconds).toBeGreaterThanOrEqual(0);
  });

  it('should have requests_total as a non-negative number', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(typeof res.body.requests_total).toBe('number');
    expect(res.body.requests_total).toBeGreaterThanOrEqual(0);
  });

  it('should have requests_by_path as an object', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(typeof res.body.requests_by_path).toBe('object');
  });

  it('should have errors_total as a non-negative number', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(typeof res.body.errors_total).toBe('number');
    expect(res.body.errors_total).toBeGreaterThanOrEqual(0);
  });

  it('should have a cache object with hits, misses, hitRate, and cacheSize', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(res.body.cache).toBeDefined();
    expect(typeof res.body.cache.hits).toBe('number');
    expect(typeof res.body.cache.misses).toBe('number');
    expect(res.body.cache.hitRate).toBeDefined();
    expect(typeof res.body.cache.cacheSize).toBe('number');
  });

  it('should increment requests_total after a quotes request', async () => {
    metricsCollector.reset();
    await request(app).get('/api/v1/quotes');
    const res = await request(app).get('/metrics').expect(200);
    // 2 total: the /api/v1/quotes request + this /metrics request
    expect(res.body.requests_total).toBe(2);
  });

  it('should track requests_by_path for /api/v1/quotes', async () => {
    metricsCollector.reset();
    await request(app).get('/api/v1/quotes');
    const res = await request(app).get('/metrics').expect(200);
    expect(res.body.requests_by_path['/api/v1/quotes']).toBe(1);
  });

  it('should have errors_total of 0 when no 5xx errors occurred', async () => {
    metricsCollector.reset();
    const res = await request(app).get('/metrics').expect(200);
    expect(res.body.errors_total).toBe(0);
  });
});
