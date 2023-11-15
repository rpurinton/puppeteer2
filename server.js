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
    case 'links-array':
    case 'images-array':
    case 'links-images-array':
    case 'text-links-array':
    case 'text-images-array':
    case 'text-links-images-array':
    case 'text-links-inline':
    case 'text-images-inline':
    case 'text-links-images-inline':
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
  const data = {};

  if (responseType.includes('text')) {
    data.text = text;
  }

  if (responseType.includes('links-array')) {
    data.links = links;
  }

  if (responseType.includes('images-array')) {
    data.imageLinks = imageLinks;
  }

  if (responseType.includes('links-images-array')) {
    data.links = links;
    data.imageLinks = imageLinks;
  }

  if (responseType.includes('links-inline')) {

    const linkTexts = anchors.map(anchor => anchor.innerText);
    const linkTextsMap = {};
    linkTexts.forEach((text, index) => linkTextsMap[text] = links[index]);
    const linkTextsRegex = new RegExp(linkTexts.join('|'), 'g');
    data.text = text.replace(linkTextsRegex, matched => `[${matched}](${linkTextsMap[matched]})`);
  }

  if (responseType.includes('images-inline')) {
    const imageLinksRegex = new RegExp(imageLinks.join('|'), 'g');
    data.text = text.replace(imageLinksRegex, matched => `[${matched}]`);
  }

  if (responseType.includes('links-images-inline')) {
    const linkTexts = anchors.map(anchor => anchor.innerText);
    const linkTextsMap = {};
    linkTexts.forEach((text, index) => linkTextsMap[text] = links[index]);
    const linkTextsRegex = new RegExp(linkTexts.join('|'), 'g');
    data.text = text.replace(linkTextsRegex, matched => `[${matched}](${linkTextsMap[matched]})`);

    const imageLinksRegex = new RegExp(imageLinks.join('|'), 'g');
    data.text = data.text.replace(imageLinksRegex, matched => `[${matched}]`);
  }

  if (responseType.includes('text-links-images-inline')) {
    const linkTexts = anchors.map(anchor => anchor.innerText);
    const linkTextsMap = {};
    linkTexts.forEach((text, index) => linkTextsMap[text] = links[index]);
    const linkTextsRegex = new RegExp(linkTexts.join('|'), 'g');
    data.text = text.replace(linkTextsRegex, matched => `[${matched}](${linkTextsMap[matched]})`);

    const imageLinksRegex = new RegExp(imageLinks.join('|'), 'g');
    data.text = data.text.replace(imageLinksRegex, matched => `[${matched}]`);
  }
  return data;
}

const server = http.createServer(handleRequest);

server.listen(5469, () => {
  console.log('Server running on port 5469');
});

module.exports = server;