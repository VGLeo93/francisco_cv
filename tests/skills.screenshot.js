'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { launchBrowser } = require('../scripts/browser');
const { startLocalSite } = require('../scripts/local-server');

async function main() {
  const site = await startLocalSite(path.resolve(__dirname, '..'));
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.goto(site.url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.$eval('#skills', element => element.scrollIntoView({ behavior: 'instant' }));
    const output = process.env.CV_SCREENSHOT || '/tmp/francisco-cv-skills.png';
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output });
    console.log('Saved ' + output);
  } finally {
    if (browser) await browser.close();
    await site.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
