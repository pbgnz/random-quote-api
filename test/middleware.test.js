const request = require('supertest');
const requestLogger = require('../src/middleware/requestLogger');
const logger = require('../src/utils/logger');

// Mock the scraper before requiring the app
jest.mock('../src/scraper/goodreadsScraper', () => {
  const mockQuotes = {
    1: [
      { id: 0, quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { id: 1, quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
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

describe('Request Logger Middleware', () => {
  let loggerSpy;

  beforeEach(() => {
    loggerSpy = jest.spyOn(logger, 'info');
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should attach a req.id to each request', async () => {
    let capturedReqId;

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      capturedReqId = req.id;
      res.json({ id: req.id });
    });

    const response = await request(testApp)
      .get('/test')
      .expect(200);

    expect(response.body.id).toBeDefined();
    expect(capturedReqId).toBeDefined();
  });

  it('should generate a UUID for req.id', async () => {
    let capturedReqId;

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      capturedReqId = req.id;
      res.json({ id: req.id });
    });

    await request(testApp)
      .get('/test')
      .expect(200);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(capturedReqId).toMatch(uuidRegex);
  });

  it('should log request with correct fields on response finish', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      res.json({ success: true });
    });

    await request(testApp)
      .get('/test')
      .expect(200);

    expect(loggerSpy).toHaveBeenCalled();
    const lastCall = loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe('request');
    expect(lastCall[1]).toHaveProperty('req_id');
    expect(lastCall[1]).toHaveProperty('method');
    expect(lastCall[1]).toHaveProperty('path');
    expect(lastCall[1]).toHaveProperty('status');
    expect(lastCall[1]).toHaveProperty('duration_ms');

    loggerSpy.mockRestore();
  });

  it('should log the correct HTTP method', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      res.json({ success: true });
    });

    await request(testApp)
      .get('/test')
      .expect(200);

    const lastCall = loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1];
    expect(lastCall[1].method).toBe('GET');

    loggerSpy.mockRestore();
  });

  it('should log the correct path', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/api/test', (req, res) => {
      res.json({ success: true });
    });

    await request(testApp)
      .get('/api/test')
      .expect(200);

    const lastCall = loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1];
    expect(lastCall[1].path).toBe('/api/test');

    loggerSpy.mockRestore();
  });

  it('should log the correct status code', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      res.status(201).json({ success: true });
    });

    await request(testApp)
      .get('/test')
      .expect(201);

    const lastCall = loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1];
    expect(lastCall[1].status).toBe(201);

    loggerSpy.mockRestore();
  });

  it('should log duration_ms as a non-negative number', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      res.json({ success: true });
    });

    await request(testApp)
      .get('/test')
      .expect(200);

    const lastCall = loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1];
    expect(typeof lastCall[1].duration_ms).toBe('number');
    expect(lastCall[1].duration_ms >= 0).toBe(true);

    loggerSpy.mockRestore();
  });

  it('should log each request with a unique req_id', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    const testApp = require('express')();
    testApp.use(requestLogger);
    testApp.get('/test', (req, res) => {
      res.json({ success: true });
    });

    await request(testApp).get('/test').expect(200);
    await request(testApp).get('/test').expect(200);

    const calls = loggerSpy.mock.calls.filter(call => call[0] === 'request');
    expect(calls.length).toBeGreaterThanOrEqual(2);

    const firstReqId = calls[calls.length - 2][1].req_id;
    const secondReqId = calls[calls.length - 1][1].req_id;

    expect(firstReqId).not.toEqual(secondReqId);

    loggerSpy.mockRestore();
  });

  it('should work with the full app and log API requests', async () => {
    const loggerSpy = jest.spyOn(logger, 'info');

    await request(app)
      .get('/health')
      .expect(200);

    const calls = loggerSpy.mock.calls.filter(call => call[0] === 'request');
    expect(calls.length).toBeGreaterThan(0);

    const lastCall = calls[calls.length - 1];
    expect(lastCall[1].method).toBe('GET');
    expect(lastCall[1].path).toBe('/health');
    expect(lastCall[1].status).toBe(200);
    expect(lastCall[1]).toHaveProperty('req_id');
    expect(lastCall[1]).toHaveProperty('duration_ms');

    loggerSpy.mockRestore();
  });
});
