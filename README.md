# random-quote-api
a simple api that returns random quotes from famous authors   

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
docker run -p 8000:8000 -d pbgnz/random-quote-api
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
