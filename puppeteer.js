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

module.exports = { getBrowserInstance };