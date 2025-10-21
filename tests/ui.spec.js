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

  // Ensure Featured Course is visible on mobile
  await page.evaluate(() => document.getElementById('learning').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(300);
  const featuredVisible = await page.$eval('#learning .course-card', el => {
    const r = el.getBoundingClientRect();
    const disp = getComputedStyle(el).display;
    return disp !== 'none' && r.height > 0 && r.width > 0;
  });
  if (!featuredVisible) throw new Error('Featured Course not visible on mobile viewport');
  log('Featured Course visible on mobile');

  // Ensure Certifications section is visible on mobile
  await page.evaluate(() => document.getElementById('certifications').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(300);
  const certVisible = await page.$eval('#certifications', el => getComputedStyle(el).display !== 'none');
  if (!certVisible) throw new Error('Certifications section hidden on mobile');
  log('Certifications visible on mobile');

  // Switch to desktop viewport for the carousel layout
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  await sleep(400);

  // On desktop, Featured Course and Certifications still visible
  const certVisibleDesktop = await page.$eval('#certifications', el => getComputedStyle(el).display !== 'none');
  if (!certVisibleDesktop) throw new Error('Certifications section hidden on desktop');
  const featuredVisibleDesktop = await page.$eval('#learning .course-card', el => getComputedStyle(el).display !== 'none');
  if (!featuredVisibleDesktop) throw new Error('Featured Course hidden on desktop');

  // Validate no mobile cutoff across common small heights
  const mobileViewports = [
    { width: 320, height: 568 }, // iPhone SE (legacy)
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 }
  ];
  for (const vp of mobileViewports) {
    await page.setViewport({ ...vp, isMobile: true, deviceScaleFactor: 2 });
    await sleep(200);
    await page.evaluate(() => window.scrollTo(0, 1e9));
    await sleep(200);
    const remains = await page.evaluate(() => {
      const se = document.scrollingElement || document.documentElement;
      return se.scrollHeight - (se.scrollTop + se.clientHeight);
    });
    if (remains > 2) throw new Error(`Page not scrollable to bottom on ${vp.width}x${vp.height} (remaining ${remains}px)`);
  }
  // Restore desktop viewport for experience carousel checks
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
  await sleep(300);

  await page.evaluate(() => document.getElementById('experience').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(400);

  // Reset to first slide via pagination (works for both Swiper and fallback)
  await page.evaluate(() => {
    const firstDot = document.querySelector('#exp-dots .swiper-pagination-bullet');
    if (firstDot) firstDot.dispatchEvent(new Event('click', { bubbles: true }));
  });
  await sleep(520);

  const firstTitle = await page.$eval('#exp-cards .swiper-slide.is-active .card-title, #exp-cards .card.is-active .card-title', el => el.textContent.trim());

  // Experience slider: move to next card via arrow (scoped to the experience carousel)
  await page.click('#experience-carousel .next');
  await sleep(520);
  const expAfter = await page.$eval('#exp-cards .swiper-slide.is-active .card-title, #exp-cards .card.is-active .card-title', el => el.textContent.trim());
  if (expAfter === firstTitle) throw new Error('Experience did not advance when pressing Next');
  log('Experience advances via navigation');

  // Cycle through all roles to ensure wrap-around works (fallback + Swiper loop)
  await page.evaluate(() => {
    const firstDot = document.querySelector('#exp-dots .swiper-pagination-bullet');
    if (firstDot) firstDot.dispatchEvent(new Event('click', { bubbles: true }));
  });
  await sleep(520);

  const totalSlides = await page.$$eval('#exp-cards .swiper-slide[data-index]', els => new Set(els.map(el => el.getAttribute('data-index'))).size);
  for (let i = 0; i < totalSlides; i++) {
    await page.click('.experience-carousel .next');
    await sleep(520);
  }
  const expLoop = await page.$eval('#exp-cards .swiper-slide.is-active .card-title, #exp-cards .card.is-active .card-title', el => el.textContent.trim());
  if (expLoop !== firstTitle) throw new Error('Experience slider did not loop back to the first card');
  log('Experience loops back to first card after full cycle');

  // Back to Summary for completeness
  await page.evaluate(() => document.getElementById('summary').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(300);

  // Validate badge contrast in dark mode
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); });
  await page.evaluate(() => document.getElementById('learning').scrollIntoView({ behavior: 'instant', block: 'start' }));
  await sleep(300);
  const ratio = await page.$eval('.featured-training .badge', (el) => {
    const cs = getComputedStyle(el);
    function lum(rgb){
      const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return 0; const [r,g,b] = [m[1],m[2],m[3]].map(Number).map(v=>{v/=255; return v<=0.03928?v/12.92:Math.pow(((v+0.055)/1.055),2.4)});
      return 0.2126*r + 0.7152*g + 0.0722*b;
    }
    const L1 = lum(cs.color); const L2 = lum(cs.backgroundColor);
    const cr = (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    return cr;
  });
  if (ratio < 3) throw new Error('Badge contrast in dark mode too low: ' + ratio.toFixed(2));
  log('Dark badge contrast OK (ratio ~', ratio.toFixed(2), ')');

  console.log('\nAll checks passed.');
  await browser.close();
})();
