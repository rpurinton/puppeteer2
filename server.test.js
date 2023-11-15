const supertest = require('supertest');
const server = require('./server');
const { close } = require('./server');


let agent;

beforeAll(() => {
    agent = supertest.agent(server);
});

afterAll(() => {
    return close();
});

test('POST / with valid URL and options', async () => {
    const response = await agent
        .post('/')
        .send({ url: 'https://example.com', method: 'GET', responseType: 'text' })
        .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('text');
});

test('POST / with missing URL', async () => {
    const response = await agent
        .post('/')
        .send({ method: 'GET', responseType: 'text' })
        .set('Content-Type', 'application/json');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error', 'Invalid request');
});

test('POST / with invalid method', async () => {
    const response = await agent
        .post('/')
        .send({ url: 'https://example.com', method: 'INVALID', responseType: 'text' })
        .set('Content-Type', 'application/json');

    expect(response.status).toBe(500);
});

test('POST / with invalid headers', async () => {
    const response = await agent
        .post('/')
        .send({ url: 'https://example.com', method: 'GET', headers: "invalid", responseType: 'text' })
        .set('Content-Type', 'application/json');

    expect(response.status).toBe(500);
});

test('GET /', async () => {
    const response = await agent.get('/');

    expect(response.status).toBe(405);
    expect(response.body).toHaveProperty('error', 'Method Not Allowed');
});
