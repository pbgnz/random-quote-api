const request = require('supertest');
const app = require('./server');

describe("the responses from the quotes api", () => {
    
    it('should contain 30 quotes per api call', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        expect(response.body.quotes.length).toEqual(30);
    });

    it('should contain the proper fields of id, author, quote', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        const randomIndex = Math.floor(Math.random() * 30);

        expect(response.body.quotes[randomIndex].id).toBeTruthy();
        expect(response.body.quotes[randomIndex].author).toBeTruthy();
        expect(response.body.quotes[randomIndex].quote).toBeTruthy();
    });

    it('should contain different quotes in the response', async () => {
        const response = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        const randomIndexFirstHalf = Math.floor(Math.random() * (14 - 0 + 1) + 0);
        const randomIndexSecondHalf = Math.floor(Math.random() * (29 - 15 + 1) + 15);

        expect(response.body.quotes[randomIndexFirstHalf].id === response.body.quotes[randomIndexSecondHalf].id).toBeFalsy();
        expect(response.body.quotes[randomIndexFirstHalf].author === response.body.quotes[randomIndexSecondHalf].author).toBeFalsy();
        expect(response.body.quotes[randomIndexFirstHalf].quote === response.body.quotes[randomIndexSecondHalf].quote).toBeFalsy();
    });

    it('should give random quotes for every request', async () => {
        const firstResponse = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        const secondResponse = await request(app)
            .get('/api/quotes')
            .send()
            .expect(200);

        const randomIndex = Math.floor(Math.random() * 30);

        expect(firstResponse.body.quotes[randomIndex].id === secondResponse.body.quotes[randomIndex].id).toBeTruthy();
        expect(firstResponse.body.quotes[randomIndex].author === secondResponse.body.quotes[randomIndex].author).toBeFalsy();
        expect(firstResponse.body.quotes[randomIndex].quote === secondResponse.body.quotes[randomIndex].quote).toBeFalsy();
    });
});