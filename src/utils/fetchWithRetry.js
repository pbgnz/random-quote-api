const DEFAULT_TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT_MS) || 15000;
const DEFAULT_RETRIES = parseInt(process.env.SCRAPER_RETRIES) || 2;

async function fetchWithRetry(url, options = {}, retries = DEFAULT_RETRIES) {
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
      return fetchWithRetry(url, options, retries - 1);
    }

    throw err;
  }
}

module.exports = fetchWithRetry;