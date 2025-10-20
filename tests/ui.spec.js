// Basic end-to-end checks with Puppeteer Core + system Chrome
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

function chromeExec() {
  const candidates = [
    process.env.CHROME || process.env.GOOGLE_CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error('Chrome executable not found');
}

async function open(pagePath, viewport) {
  const browser = await puppeteer.launch({
    executablePath: chromeExec(),
    headless: 'new',
    args: ['--no-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  if (viewport) await page.setViewport(viewport);
  await page.goto('file://' + pagePath, { waitUntil: 'load' });
  return { browser, page };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function wheelOn(page, selector, deltaX, withShift=false) {
  await page.evaluate(({ selector, deltaX, withShift }) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error('Selector not found: ' + selector);
    el.dispatchEvent(new WheelEvent('wheel', { deltaX, deltaY: 0, bubbles: true, shiftKey: withShift }));
  }, { selector, deltaX, withShift });
}

function centerOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.floor(r.left + r.width/2), y: Math.floor(r.top + r.height/2) };
  }, selector);
}

(async () => {
  const pagePath = path.resolve(__dirname, '..', 'index.html');
  const { browser, page } = await open(pagePath, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 }); // iPhone-ish

  const log = (...args) => console.log('[TEST]', ...args);

  // Theme toggle exists
  await page.waitForSelector('#theme-toggle');
  log('Theme toggle found');

  // Scroll to SKILLS section programmatically for testing
  await page.evaluate(() => document.getElementById('skills').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(400);

  // SKILLS swapper default slide visible (list)
  await page.waitForSelector('#skills .skills-swapper .skills-slide.is-active');
  let hasWeb = await page.$eval('#skills .skills-swapper .skills-slide.is-active', el => el.textContent.includes('Web:'));
  if (!hasWeb) throw new Error('Skills list slide not visible by default');
  log('Skills list visible');

  // Swipe to bars via horizontal wheel gesture
  await wheelOn(page, '#skills .skills-swapper', 300, false);
  await sleep(450);
  const barsVisible = await page.$eval('#skills .skills-swapper .skills-slide.is-active', el => el.textContent.includes('Recent Focus'));
  if (!barsVisible) throw new Error('Skills bars slide did not appear after horizontal gesture');
  log('Skills bars visible after gesture');

  // Experience slider: move to next card
  await page.evaluate(() => document.getElementById('experience').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(400);
  const expBefore = await page.$$eval('#exp-cards .card.is-active .card-title', els => els.map(e => e.textContent.trim()));
  await wheelOn(page, '#exp-cards', 400, false);
  await sleep(500);
  const expAfter = await page.$$eval('#exp-cards .card.is-active .card-title', els => els.map(e => e.textContent.trim()));
  if (JSON.stringify(expBefore) === JSON.stringify(expAfter)) throw new Error('Experience did not advance on horizontal gesture');
  log('Experience advances after gesture');

  // Back to Summary for completeness
  await page.evaluate(() => document.getElementById('summary').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(300);

  console.log('\nAll checks passed.');
  await browser.close();
})();
