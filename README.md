# random-quote-api
a simple api that returns random quotes from famous authors   

## API

### API Versioning

The API uses versioning to manage changes over time. Current version is **v1**, accessible at `/api/v1/`.

**Backward Compatibility**: Requests to the old `/api/` endpoints are automatically redirected (HTTP 301) to `/api/v1/`. We recommend updating clients to use the versioned endpoints.

### Get quotes

```bash
GET /api/v1/quotes
```

Returns up to 30 random quotes. Use the optional `count` parameter to limit the number returned.

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | number | Optional. Number of quotes to return (1–30). Defaults to all quotes on the page. |

```bash
GET /api/v1/quotes?count=5
```

```json
{
    "quotes": [
        {
            "id": 1,
            "author": "string",
            "quote": "string"
        }
    ]
}
```

---

### Get a single random quote

```bash
GET /api/v1/quotes/random
```

```json
{
    "quote": {
        "id": 1,
        "author": "string",
        "quote": "string"
    }
}
```

---

### Get cache stats

```bash
GET /api/v1/cache/stats
```

```json
{
    "hits": 42,
    "misses": 8,
    "expirations": 1,
    "hitRate": "84.00%",
    "cacheSize": 3
}
```

---

### Health check

```bash
GET /health
```

Returns the health status of the API, including uptime and current timestamp. Useful for monitoring, load balancer health probes, and Kubernetes liveness checks.

```json
{
    "status": "ok",
    "uptime": 3600,
    "timestamp": "2026-05-10T12:30:45.123Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always "ok" when the service is healthy |
| `uptime` | number | Seconds since server start |
| `timestamp` | string | ISO 8601 timestamp of the health check |

## Monitoring & Logging

### Request Logging

All API requests are logged in structured JSON format (NDJSON) with the following fields:

- `timestamp`: ISO 8601 timestamp of the log entry
- `level`: Log level (info for request logs)
- `message`: "request"
- `req_id`: Unique UUID for the request (useful for tracing)
- `method`: HTTP method (GET, POST, etc.)
- `path`: Request path
- `status`: HTTP response status code
- `duration_ms`: Request duration in milliseconds

Example log output:
```json
{"timestamp":"2026-05-10T15:09:14.640Z","level":"info","message":"request","req_id":"550e8400-e29b-41d4-a716-446655440000","method":"GET","path":"/api/v1/quotes","status":200,"duration_ms":42}
```

This structured logging makes it easy to parse logs with log aggregators, search by request ID for tracing, and monitor request performance.

## Deployment & Reliability

### Graceful Shutdown

The API implements graceful shutdown for `SIGTERM` and `SIGINT` signals, essential for zero-downtime deployments in container orchestrators (Docker, Kubernetes, etc.).

When a shutdown signal is received:
1. The server stops accepting new connections
2. Existing in-flight requests are allowed to complete
3. Process exits cleanly with code 0
4. If connections don't close within 10 seconds, they are force-closed and the process exits with code 1

Example logs during graceful shutdown:
```json
{"timestamp":"2026-05-10T15:09:14.640Z","level":"info","message":"Shutdown signal received","signal":"SIGTERM"}
{"timestamp":"2026-05-10T15:09:14.641Z","level":"info","message":"Server closed, exiting","signal":"SIGTERM"}
```

This ensures that load balancers and orchestrators can safely remove instances from rotation without dropping in-flight requests.

## Dev

### Requirements:
- NodeJS
- NPM
- Docker (Optional)
- Docker compose (Optional)

### Run using NPM:  

Install dependencies
```bash
npm install
```
Run app on localhost:8000
```BASH
npm start
```

### Run using Docker: 

Build image
```bash
docker build -t pbgnz/random-quote-api .
```
Run image
```bash
docker run -d -p 8000:8000 pbgnz/random-quote-api
```

### Run using Dockerhub's image:

Pull the latest image from Dockerhub
```bash
docker pull pbgnz/random-quote-api:1.5.2
```
Run image
```bash
docker run -p 8000:8000 -d pbgnz/random-quote-api:1.5.2
```
Fetch endpoint
```bash
GET http://localhost:8000/api/v1/quotes
```

### Run using Docker-compose:

Add the image to your docker-compose.yaml file
```bash
# example
version: '3'
services:
  api:
    image: 'pbgnz/random-quote-api:1.5.2'
    ports:
      - '8000:8000'
```

## Load Testing

### Using JMeter

The project includes a JMeter load test plan (`test/load_test.jmx`) configured to test the `/api/quotes` endpoint.

#### Prerequisites

Install JMeter via Homebrew (macOS):
```bash
brew install jmeter
```

Or download from [Apache JMeter](https://jmeter.apache.org/download_jmeter.cgi).

#### Running the Test

Start the API first:
```bash
npm start
```

In another terminal, run the load test:
```bash
jmeter -n -t test/load_test.jmx \
  -JTARGET_HOST=localhost \
  -JTARGET_PORT=8000 \
  -l results.jtl \
  -j jmeter.log
```

#### Generate HTML Report

After the test completes, generate an interactive HTML report:

```bash
jmeter -g results.jtl -o results/html-report/
# Open in browser: results/html-report/index.html
```

#### Test Configuration

The load test is configured with:
- **100 concurrent threads** (simulated users)
- **20-second ramp-up time** (linearly increase threads over 20s)
- **Infinite loop** (each thread makes continuous requests until stopped)
- **Target**: `GET /api/quotes`
