'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launchBrowser } = require('../scripts/browser');

async function main() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href, { waitUntil: 'load' });
    await page.$eval('#skills', element => element.scrollIntoView({ behavior: 'instant' }));
    const output = process.env.CV_SCREENSHOT || '/tmp/francisco-cv-skills.png';
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output });
    console.log('Saved ' + output);
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
