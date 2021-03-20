# random-quote-api
a simple api that returns random quotes from famous authors   

[![Docker Hub repository](http://dockeri.co/image/pbgnz/random-quote-api)](https://registry.hub.docker.com/r/pbgnz/random-quote-api)

## API
```bash
GET /api/quotes
```

```bash
{
    "quotes": [
        {
            "author": "string",
            "quote": "string",
            "id": "number"
        }
    ]
}
```

## Usage

Pull the latest image from Dockerhub
```bash
docker pull pbgnz/random-quote-api:v1.1.0
```
Run image
```bash
docker run -p 8000:8000 -d pbgnz/random-quote-api:v1.1.0
```
Fetch endpoint
```bash
GET http://localhost:8000/api/quotes
```

## Dev

Requirements:
- NodeJS
- NPM
- Docker (Optional)

Run using NPM:
```bash
# install dependencies
npm install

# run app at localhost:8000
npm start
```

Run using Docker:
```bash
# build image
docker build -t pbgnz/random-quote-api .

# run image
docker run -p 8000:8000 -d pbgnz/random-quote-api
```
