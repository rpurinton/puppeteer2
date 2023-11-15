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
  try {
    const { method, headers } = req;
    if (method !== 'POST' || headers['content-type'] !== 'application/json') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    }

    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    const requestData = JSON.parse(body);
    const { url, method: reqMethod = 'GET', postData = '', contentType = 'application/x-www-form-urlencoded', headers: reqHeaders = {}, responseType = 'text' } = requestData;
    if (!url || !['GET', 'POST', 'PUT', 'DELETE'].includes(reqMethod) || typeof reqHeaders !== 'object') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid request' }));
    }

    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    if (reqHeaders['User-Agent']) {
      await page.setUserAgent(reqHeaders['User-Agent']);
    }
    if (Object.keys(reqHeaders).length > 0) {
      // validate headers, send 500 if invalid
      if (Object.keys(reqHeaders).some(header => !/^[A-Za-z0-9-]+$/g.test(header))) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid headers' }));
      }
      await page.setExtraHTTPHeaders(reqHeaders);
    }
    await page.goto(url, { method: reqMethod, postData, headers: { 'Content-Type': contentType } });

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
    case 'text+links':
      return {
        title,
        text: await page.evaluate(() => document.body.innerText),
        links: await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => anchor.href))
      };
    case 'text+images':
      return {
        title,
        text: await page.evaluate(() => document.body.innerText),
        images: await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => img.src))
      };
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

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  console.log('Received kill signal, shutting down gracefully');
  server.close(() => {
    console.log('Closed out remaining connections');
    if (browserInstance) {
      browserInstance.close().then(() => {
        console.log('Puppeteer browser closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });

  // if after 
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

module.exports = { server, shutdown };