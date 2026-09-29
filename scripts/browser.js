'use strict';

const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

function chromeExecutable() {
  const candidates = [
    process.env.CHROME,
    process.env.GOOGLE_CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const executable = candidates.find(candidate => fs.existsSync(candidate));
  if (!executable) throw new Error('Install Chrome/Chromium or set CHROME to its executable.');
  return executable;
}

function launchBrowser() {
  return puppeteer.launch({
    executablePath: chromeExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

module.exports = { launchBrowser };
