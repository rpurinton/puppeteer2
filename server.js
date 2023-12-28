const http = require('http');
const { query } = require('./database');
const { getBrowserInstance } = require('./puppeteer');

async function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'An unexpected error occurred';

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid parameter value';
  }

  res.status(statusCode).json({ error: message });
}

async function processGetRequest(req, res, shortUrl) {
  db.query('SELECT `original_url` FROM `urls` WHERE `short_url` = ?', [shortUrl], (err, result) => {
    if (err || result.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Not Found' }));
    }
    res.writeHead(301, { 'Location': result[0].original_url });
    res.end();
  });
}

async function processPostRequest(req, res, body) {
  try {
    const requestData = JSON.parse(body);
    const {
      url,
      method: reqMethod = 'GET',
      postData = '',
      contentType = 'application/x-www-form-urlencoded',
      headers: reqHeaders = {},
      responseType = 'text'
    } = requestData;
    if (!url || !['GET', 'POST', 'PUT', 'DELETE'].includes(reqMethod) || typeof reqHeaders !== 'object') {
      throw new Error('Invalid request');
    }

    const browser = await getBrowserInstance();
    const page = await browser.newPage();
    await setupPage(reqHeaders, page, url, reqMethod, postData, contentType);
    let data = await extractData(page, responseType);
    await page.close();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  } catch (error) {
    errorHandler(error, req, res);
  }
}

async function setupPage(reqHeaders, page, url, reqMethod, postData, contentType) {
  try {
    if (reqHeaders['User-Agent']) {
      await page.setUserAgent(reqHeaders['User-Agent']);
    } else {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    if (Object.keys(reqHeaders).length > 0) {
      // validate headers, send 500 if invalid
      if (Object.keys(reqHeaders).some(header => !/^[A-Za-z0-9-]+$/g.test(header))) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid headers' }));
      }
      await page.setExtraHTTPHeaders(reqHeaders);
    }
    console.log(`Navigating to URL: ${url}`);
    console.log(`Request method: ${reqMethod}`);
    console.log(`Post data: ${postData}`);
    console.log(`Content type: ${contentType}`);

    if (reqMethod === 'POST') {
      await page.setRequestInterception(true);

      page.once('request', request => {
        request.continue({
          method: reqMethod,
          postData,
          headers: {
            ...request.headers(),
            'Content-Type': contentType
          }
        });
      });

      await page.goto(url);
    } else {
      await page.goto(url, { method: reqMethod, postData, headers: { 'Content-Type': contentType } });
    }
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      new Promise(resolve => setTimeout(resolve, 1000))
    ]);
  } catch (error) {
    errorHandler(error, req, res);
  }
}

async function handleRequest(req, res) {
  try {
    const { method, headers } = req;
    if (method === 'GET') {
      const shortUrl = req.url.slice(1); // Remove the leading slash
      await processGetRequest(req, res, shortUrl);
      return;
    }
    if (method !== 'POST' || headers['content-type'] !== 'application/json') {
      throw new Error('Invalid request');
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    await processPostRequest(req, res, body);
  } catch (error) {
    errorHandler(error, req, res);
  }
}

async function extractData(page, responseType) {
  const title = await page.title();
  const responseTypes = {
    'html': async () => ({ title, html: await page.content() }),
    'text': async () => ({ title, text: await getText(page) }),
    'links': async () => ({ title, links: await getLinks(page) }),
    'images': async () => ({ title, images: await getImages(page) }),
    'text+links': async () => ({ title, text: await getText(page), links: await getLinks(page) }),
    'text+images': async () => ({ title, text: await getText(page), images: await getImages(page) }),
    'links+images': async () => ({ title, links: await getLinks(page), images: await getImages(page) }),
    'text+links+images': async () => ({ title, text: await getText(page), links: await getLinks(page), images: await getImages(page) }),
    'text+links-inline': async () => await extractInlineData(page, responseType, title),
    'text+images-inline': async () => await extractInlineData(page, responseType, title),
    'text+links+images-inline': async () => await extractInlineData(page, responseType, title),
    'json': async () => JSON.parse(await page.evaluate(() => document.body.innerText))
  };

  const response = responseTypes[responseType];
  if (!response) {
    throw new Error('Invalid response type');
  }

  return await response();
}

async function getText(page) {
  return await page.evaluate(() => document.body.innerText);
}

async function getLinks(page) {
  return await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => anchor.href));
}

async function getImages(page) {
  return (await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => img.src)))
    .filter(src => !src.startsWith('data:image'));
}

async function extractInlineData(page, responseType, title) {
  const text = await page.evaluate(() => document.body.innerText);
  const anchors = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(anchor => ({ href: anchor.href, text: anchor.innerText })));
  const images = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(img => ({ src: img.src, alt: img.alt })));

  let inlineText = text;
  if (responseType.includes('links')) {
    const anchorPromises = anchors.map(async anchor => {
      try {
        const shortUrl = await generateShortUrl(anchor.href);
        inlineText = inlineText.replace(anchor.text, `[${anchor.text}](<https://puppeteer2.discommand.com/${shortUrl}>)`);
      } catch (error) {
        console.error(`Error generating short URL for ${anchor.href}: ${error.message}`);
      }
    });
    await Promise.all(anchorPromises);
  }
  if (responseType.includes('images')) {
    images.forEach(img => {
      if (!img.src.startsWith('data:image')) {
        const imgText = img.alt || '';
        inlineText = inlineText.replace(imgText, `(${img.src})`);
      }
    });
  }

  return { title, text: inlineText };
}

function generateShortUrl(originalUrl) {
  return new Promise((resolve, reject) => {
    db.query('INSERT INTO `urls` (`original_url`) VALUES (?) ON DUPLICATE KEY UPDATE `short_url` = LAST_INSERT_ID(`short_url`)', [originalUrl], (insertErr, insertResult) => {
      if (insertErr) {
        reject(insertErr);
      } else {
        resolve(insertResult.insertId);
      }
    });
  });
}

const server = http.createServer(handleRequest);

server.use(errorHandler);

server.listen(5469, () => {
  console.log('Server running on port 5469');
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown() {
  try {
    server.close(() => {
      if (browserInstance) {
        browserInstance.close();
      }
    });
    db.end();
  } catch (error) {
    console.error(error);
  }
}

module.exports = { server, shutdown };