// Quick screenshot of SKILLS section to validate UI affordances
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

(async () => {
  const pagePath = path.resolve(__dirname, '..', 'index.html');
  const browser = await puppeteer.launch({
    executablePath: chromeExec(),
    headless: 'new',
    args: ['--no-sandbox','--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 820, deviceScaleFactor: 2, isMobile: true });
  await page.goto('file://' + pagePath, { waitUntil: 'load' });
  await page.evaluate(() => document.getElementById('skills').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await new Promise(r => setTimeout(r, 400));
  const outDir = path.resolve(__dirname, 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'skills.png');
  const r = await page.$('#skills');
  if (r) await r.screenshot({ path: out }); else await page.screenshot({ path: out, fullPage: false });
  console.log('Saved', out);
  await browser.close();
})();
