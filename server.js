const http = require('http');
const puppeteer = require('puppeteer');

let browserInstance;

async function getBrowserInstance() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
  }
  return browserInstance;
}

async function handleRequest(req, res) {
  const { method, headers } = req;
  if (method !== 'POST' || headers['content-type'] !== 'application/json') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const requestData = JSON.parse(body);
    const { url, method = 'GET', postData = '', contentType = 'application/x-www-form-urlencoded', headers = {}, responseType = 'text' } = requestData;
    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'URL is required' }));
    }

    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    if (Object.keys(headers).length > 0) {
      await page.setExtraHTTPHeaders(headers);
    }
    await page.goto(url, { method, postData, headers: { 'Content-Type': contentType } });

    let data = await extractData(page, responseType);
    await page.close();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data }));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function extractData(page, responseType) {
  switch (responseType) {
    case 'text':
      return page.evaluate(() => document.body.innerText);
    case 'html':
      return page.content();
    case 'textWithLinks':
    case 'textWithImages':
    case 'textLinksImages':
      return page.evaluate(extractComplexData, responseType);
    default:
      throw new Error('Invalid response type');
  }
}

function extractComplexData(responseType) {
  const anchors = Array.from(document.querySelectorAll('a'));
  const images = Array.from(document.querySelectorAll('img'));
  const text = document.body.innerText;
  const links = anchors.map(anchor => anchor.href);
  const imageLinks = images.map(img => img.src).filter(src => !src.startsWith('data:'));
  const data = { text };
  if (responseType.includes('WithLinks')) {
    data.links = links;
  }
  if (responseType.includes('WithImages')) {
    data.imageLinks = imageLinks;
  }
  return data;
}

const server = http.createServer(handleRequest);

server.listen(5469, () => {
  console.log('Server running on port 5469');
});

module.exports = server;