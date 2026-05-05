# random-quote-api
a simple api that returns random quotes from famous authors   

## API

### Get quotes

```bash
GET /api/quotes
```

Returns up to 30 random quotes. Use the optional `count` parameter to limit the number returned.

| Parameter | Type | Description |
|-----------|------|-------------|
| `count` | number | Optional. Number of quotes to return (1–30). Defaults to all quotes on the page. |

```bash
GET /api/quotes?count=5
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
GET /api/quotes/random
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
GET /api/cache/stats
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
GET http://localhost:8000/api/quotes
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
