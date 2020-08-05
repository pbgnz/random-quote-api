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

Requirements:
- NodeJS
- NPM

Run using NPM:
```bash
# install dependencies
npm install

# run app at localhost:8000
npm start
```