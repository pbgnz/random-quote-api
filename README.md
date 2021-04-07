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

## Dev

Requirements:
- NodeJS
- NPM
- Docker (Optional)
- Docker compose (Optional)

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

Run using Dockerhub's image:

```bash
# Pull the latest image from Dockerhub
docker pull pbgnz/random-quote-api:v1.4.1

# Run image
docker run -p 8000:8000 -d pbgnz/random-quote-api:v1.4.1

# Fetch endpoint
GET http://localhost:8000/api/quotes
```

Run using Docker-compose:

```bash
# Add it to your docker-compose.yaml file
version: '3'
services:
  api:
    image: 'pbgnz/random-quote-api:v1.2.1'
    ports:
      - '8000:8000'
```
