const http = require('http');
const server = require('./server');

const postData = JSON.stringify({
  url: 'https://example.com',
  responseType: 'text'
});

const options = {
  hostname: 'localhost',
  port: 5469,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

describe('Puppeteer2 Server', () => {
  test('responds to POST with valid data', done => {
    const req = http.request(options, res => {
      expect(res.statusCode).toBe(200);

      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        expect(data).toContain('example.com');
        done();
      });
    });

    req.on('error', error => {
      done(error);
    });

    req.write(postData);
    req.end();
  });

  test('responds with error for invalid method', done => {
    const invalidOptions = { ...options, method: 'GET' };
    const req = http.request(invalidOptions, res => {
      expect(res.statusCode).toBe(405);
      done();
    });

    req.on('error', error => {
      done(error);
    });

    req.end();
  });
});

afterAll(() => {
  server.close();
});
