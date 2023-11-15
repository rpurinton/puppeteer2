const http = require('http');
const puppeteer = require('puppeteer');

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.headers['content-type'] === 'application/json') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body);
        const url = requestData.url;
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'URL is required' }));
          return;
        }

        // Additional options (with defaults)
        const method = requestData.method || 'GET';
        const postData = requestData.postData || '';
        const contentType = requestData.contentType || 'application/x-www-form-urlencoded';
        const headers = requestData.headers || {};
        const responseType = requestData.responseType || 'html'; // 'text', 'links', 'images', 'textWithLinks', 'textWithImages', 'imagesWithLinks', 'all'

        // Launch puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Set custom headers if provided
        if (Object.keys(headers).length > 0) {
          await page.setExtraHTTPHeaders(headers);
        }

        // Navigate to the page
        await page.goto(url, { method, postData, headers: { 'Content-Type': contentType } });

        // Extract data based on responseType
        let data;
        switch (responseType) {
          case 'text':
            data = await page.evaluate(() => document.body.innerText);
            break;
          // Add cases for 'links', 'images', etc.
          // ...
        }

        // Close the browser
        await browser.close();

        // Send response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  } else {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }
});

server.listen(5469, () => {
  console.log('Server running on port 5469');
});