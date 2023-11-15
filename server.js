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
        const responseType = requestData.responseType || 'text'; // Default to 'text' if not specified

        // Launch puppeteer
        const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser' });
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
          case 'html':
            data = await page.content();
            break;
          case 'textWithLinks':
            data = await page.evaluate(() => {
              const anchors = Array.from(document.querySelectorAll('a'));
              const text = document.body.innerText;
              const links = anchors.map(anchor => anchor.href);
              return { text, links };
            });
            break;
          case 'textWithImages':
            data = await page.evaluate(() => {
              const images = Array.from(document.querySelectorAll('img'));
              const text = document.body.innerText;
              const imageLinks = images.map(img => img.src);
              return { text, imageLinks };
            });
            break;
          case 'textLinksImages':
            data = await page.evaluate(() => {
              const anchors = Array.from(document.querySelectorAll('a'));
              const images = Array.from(document.querySelectorAll('img'));
              const text = document.body.innerText;
              const links = anchors.map(anchor => anchor.href);
              const imageLinks = images.map(img => img.src);
              return { text, links, imageLinks };
            });
            break;
          // Add more cases as needed
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