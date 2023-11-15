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
    if (headers['User-Agent']) {
      await page.setUserAgent(headers['User-Agent']);
    }
    if (Object.keys(headers).length > 0) {
      await page.setExtraHTTPHeaders(headers);
    }
    await page.goto(url, { method, postData, headers: { 'Content-Type': contentType } });

    let data = await extractData(page, responseType);
    await page.close();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

async function extractData(page, responseType) {
  const title = await page.title();
  switch (responseType) {
    case 'html':
      return { title, html: await page.content() };
    case 'text':
      return { title, text: await page.evaluate(() => document.body.innerText) };
    case 'links':
      return { title, links: await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => anchor.href)) };
    case 'images':
      return { title, images: await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => img.src)) };
    case 'links+images':
      return {
        title,
        links: await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => anchor.href)),
        images: await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => img.src))
      };
    case 'text+links+images':
      return {
        title,
        text: await page.evaluate(() => document.body.innerText),
        links: await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => anchor.href)),
        images: await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => img.src))
      };
    case 'text+links-inline':
    case 'text+images-inline':
    case 'text+links+images-inline':
      return await extractInlineData(page, responseType, title);
    default:
      throw new Error('Invalid response type');
  }
}

async function extractInlineData(page, responseType, title) {
  const text = await page.evaluate(() => document.body.innerText);
  const anchors = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => ({ href: anchor.href, text: anchor.innerText })));
  const images = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => ({ src: img.src, alt: img.alt })));

  let inlineText = text;
  if (responseType.includes('links')) {
    anchors.forEach(anchor => {
      inlineText = inlineText.replace(anchor.text, `[${anchor.text}](${anchor.href})`);
    });
  }
  if (responseType.includes('images')) {
    images.forEach(img => {
      const imgText = img.alt || '';
      inlineText = inlineText.replace(imgText, `(${img.src})`);
    });
  }

  return { title, text: inlineText };
}

const server = http.createServer(handleRequest);

server.listen(5469, () => {
  console.log('Server running on port 5469');
});

module.exports = server;
