const DEFAULT_TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT_MS) || 15000;
const DEFAULT_RETRIES = parseInt(process.env.SCRAPER_RETRIES) || 2;
const DEFAULT_RETRY_DELAY_MS = parseInt(process.env.SCRAPER_RETRY_DELAY_MS) || 1000;

async function fetchWithRetry(url, options = {}, retries = DEFAULT_RETRIES, attempt = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuoteBot/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(options.headers || {})
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (err) {
    clearTimeout(timeout);

    if (retries > 0) {
      const backoffDelay = DEFAULT_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return fetchWithRetry(url, options, retries - 1, attempt + 1);
    }

    throw err;
  }
}

module.exports = fetchWithRetry;