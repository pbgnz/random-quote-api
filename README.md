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

## Usage

Pull the latest image from Dockerhub
```bash
docker pull pbgnz/random-quote-api
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