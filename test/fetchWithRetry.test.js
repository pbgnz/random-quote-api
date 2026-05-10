const fetchWithRetry = require('../src/utils/fetchWithRetry');

describe('fetchWithRetry', () => {
  let fetchSpy;
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchSpy = jest.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return response text on successful fetch', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('test content')
    };
    fetchSpy.mockResolvedValue(mockResponse);

    const result = await fetchWithRetry('http://example.com');

    expect(result).toBe('test content');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should not retry on successful fetch', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('success')
    };
    fetchSpy.mockResolvedValue(mockResponse);

    await fetchWithRetry('http://example.com', {}, 3);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should retry on network error with backoff delay', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('success')
    };
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));
    fetchSpy.mockResolvedValueOnce(mockResponse);

    const startTime = Date.now();
    const result = await fetchWithRetry('http://example.com', {}, 1);
    const elapsed = Date.now() - startTime;

    expect(result).toBe('success');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    // First retry should wait ~1000ms (DEFAULT_RETRY_DELAY_MS * 2^0)
    expect(elapsed).toBeGreaterThanOrEqual(900);
  }, 10000);

  it('should throw error when retries exhausted', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));

    await expect(
      fetchWithRetry('http://example.com', {}, 1)
    ).rejects.toThrow('Network error');
  }, 10000);

  it('should apply exponential backoff on multiple retries', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('success')
    };

    // Fail twice, succeed on third attempt
    fetchSpy.mockRejectedValueOnce(new Error('Error 1'));
    fetchSpy.mockRejectedValueOnce(new Error('Error 2'));
    fetchSpy.mockResolvedValueOnce(mockResponse);

    const startTime = Date.now();
    const result = await fetchWithRetry('http://example.com', {}, 2);
    const elapsed = Date.now() - startTime;

    expect(result).toBe('success');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    // Total backoff: 1000ms (attempt 0) + 2000ms (attempt 1) = 3000ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(2900);
  }, 15000);

  it('should throw error after all retries are exhausted', async () => {
    fetchSpy.mockRejectedValue(new Error('Persistent error'));

    await expect(
      fetchWithRetry('http://example.com', {}, 2)
    ).rejects.toThrow('Persistent error');

    // Should have tried: initial attempt + 2 retries = 3 total
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  }, 10000);

  it('should include user agent in request headers', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('test')
    };
    fetchSpy.mockResolvedValue(mockResponse);

    await fetchWithRetry('http://example.com');

    const call = fetchSpy.mock.calls[0];
    expect(call[1].headers['User-Agent']).toContain('QuoteBot');
  });

  it('should merge custom headers with default headers', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('test')
    };
    fetchSpy.mockResolvedValue(mockResponse);

    const customHeaders = { 'X-Custom': 'value' };
    await fetchWithRetry('http://example.com', { headers: customHeaders });

    const call = fetchSpy.mock.calls[0];
    expect(call[1].headers['User-Agent']).toContain('QuoteBot');
    expect(call[1].headers['X-Custom']).toBe('value');
  });

  it('should handle HTTP error status with retry', async () => {
    const mockResponse = {
      ok: false,
      status: 503
    };
    const successResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('success after retry')
    };

    fetchSpy.mockResolvedValueOnce(mockResponse);
    fetchSpy.mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry('http://example.com', {}, 1);

    expect(result).toBe('success after retry');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  }, 10000);

  it('should pass through fetch options to underlying fetch', async () => {
    const mockResponse = {
      ok: true,
      text: jest.fn().mockResolvedValue('test')
    };
    fetchSpy.mockResolvedValue(mockResponse);

    const options = { method: 'POST', body: 'data' };
    await fetchWithRetry('http://example.com', options);

    const call = fetchSpy.mock.calls[0];
    expect(call[1]).toMatchObject(options);
  });
});
