# random-quote-api

A simple REST API that returns random quotes from Goodreads with built-in caching, rate limiting, and comprehensive monitoring.

## Quick Start

```bash
# Install dependencies
npm install

# Start REST API server (listens on localhost:8000)
npm start

# Start MCP server (for Claude Desktop / Claude Code)
npm run mcp

# Run tests
npm test
```

## API Documentation

**Interactive API docs (Scalar):** `/docs` | **OpenAPI spec (JSON):** `/api/docs`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quotes` | Get up to 30 random quotes (supports `?count=N` and `?page=N` parameters) |
| GET | `/api/v1/quotes/random` | Get a single random quote (supports `?page=N` parameter) |
| GET | `/api/v1/quotes/daily` | Get the quote of the day (deterministic, UTC-based) |
| GET | `/api/v1/cache/stats` | View cache hit/miss statistics |
| GET | `/health` | Health check for monitoring |
| GET | `/metrics` | Application metrics (JSON or Prometheus text format) |

### Example Requests

```bash
# Get 5 random quotes
curl http://localhost:8000/api/v1/quotes?count=5

# Get quotes from a specific page
curl http://localhost:8000/api/v1/quotes?page=5

# Get today's quote of the day (same quote all day, UTC-based)
curl http://localhost:8000/api/v1/quotes/daily

# Get a single quote
curl http://localhost:8000/api/v1/quotes/random

# Get a random quote from a specific page
curl http://localhost:8000/api/v1/quotes/random?page=5

# Check API health
curl http://localhost:8000/health

# Get application metrics (JSON)
curl http://localhost:8000/metrics

# Get metrics in Prometheus text format
curl -H "Accept: text/plain" http://localhost:8000/metrics
```

## Features

- **Random Quotes**: Scrapes and caches quotes from Goodreads (30 quotes per page, 100 pages)
- **Smart Caching**: In-memory cache with TTL, fallback to cached data on errors
- **Rate Limiting**: 100 requests per minute to `/api/*`
- **Request Logging**: Structured JSON logs with unique request IDs for tracing
- **Retry Backoff**: Exponential backoff (1s, 2s, 4s...) when Goodreads is unavailable
- **Graceful Shutdown**: Clean shutdown on SIGTERM/SIGINT signals
- **Health Checks**: `/health` endpoint for load balancers and k8s probes
- **Metrics**: Request counts, errors, and cache statistics at `/metrics` — JSON by default, Prometheus text format via `Accept: text/plain`
- **CORS**: Configurable cross-origin requests
- **MCP Integration**: Standalone MCP server for AI assistants (Claude Desktop, Claude Code)

## Configuration

All settings are environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8000 | Server port |
| `CACHE_TTL_MINUTES` | 60 | Cache expiration time |
| `SCRAPER_TIMEOUT_MS` | 15000 | HTTP request timeout |
| `SCRAPER_RETRIES` | 2 | Number of retry attempts |
| `SCRAPER_RETRY_DELAY_MS` | 1000 | Base delay for exponential backoff |
| `RATE_LIMIT_MAX` | 100 | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window |

## MCP Server

This project includes a standalone MCP (Model Context Protocol) server that exposes quote functionality to AI assistants.

### Run MCP Server

```bash
npm run mcp
```

The server will start on stdio and listen for JSON-RPC requests. Available tools:

- **get_random_quote**: Get a single random quote
- **get_quotes**: Get multiple quotes (supports optional `count` parameter, 1-30)
- **get_cache_stats**: Get cache statistics (hits, misses, expirations, hit rate)

### Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "random-quote-api": {
      "command": "node",
      "args": ["/path/to/random-quote-api/src/mcp.js"]
    }
  }
}
```

## Development

### Run with Docker

```bash
docker build -t random-quote-api .
docker run -p 8000:8000 random-quote-api
```

### Project Structure

```
src/
  app.js                      # Express app setup
  server.js                   # REST API entry point with graceful shutdown
  mcp.js                      # MCP server (JSON-RPC over stdio)
  middleware/requestLogger.js # Request ID and access logging
  services/quotesService.js   # Business logic
  cache/quotesCache.js        # In-memory cache with TTL
  scraper/goodreadsScraper.js # Goodreads HTML scraping
  utils/
    logger.js                 # Structured JSON logging
    fetchWithRetry.js         # HTTP fetch with exponential backoff
```

### Testing

```bash
npm test              # Run all tests
npm test:watch       # Watch mode
npm test:coverage    # Coverage report
```

Tests use mocked scraper data (no network calls), making them fast and reliable.

## Performance

- **Response Time**: ~50-100ms (cached) or ~500-1000ms (first request)
- **Cache Hit Rate**: ~80%+ in typical usage
- **Startup Time**: <100ms
- **Memory**: ~10-20MB with full cache

## License

MIT
