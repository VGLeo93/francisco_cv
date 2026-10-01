'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { launchBrowser } = require('../scripts/browser');
const { startLocalSite } = require('../scripts/local-server');

const root = path.resolve(__dirname, '..');
let url;
const qaDirectory = process.env.CV_QA_DIR;

async function capture(page, name) {
  if (!qaDirectory) return;
  fs.mkdirSync(qaDirectory, { recursive: true });
  await page.screenshot({ path: path.join(qaDirectory, name + '.png') });
}

function contrast(foreground, background) {
  function luminance(rgb) {
    const values = rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function checkContrast(page) {
  const samples = await page.evaluate(() => {
    function background(element) {
      const layers = [];
      for (let current = element; current; current = current.parentElement) {
        layers.push(getComputedStyle(current).backgroundColor);
      }
      let result = [255, 255, 255];
      layers.reverse().forEach(color => {
        const channels = color.match(/[\d.]+/g).map(Number);
        const alpha = channels.length > 3 ? channels[3] : 1;
        result = result.map((value, index) => channels[index] * alpha + value * (1 - alpha));
      });
      return 'rgb(' + result.join(',') + ')';
    }
    return ['#summary', '.bullets li', '.contact-list a', '.button-primary', '.demo-intro', '.demo-explanation', '.demo-note', '.sample-tag', '.motion-label'].map(selector => {
      const element = document.querySelector(selector);
      return { selector, foreground: getComputedStyle(element).color, background: background(element) };
    });
  });
  samples.forEach(sample => {
    assert.ok(contrast(sample.foreground, sample.background) >= 4.5, sample.selector + ' text contrast');
  });
}

async function setMedia(page, dark = false, reduced = true) {
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' },
    { name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' },
  ]);
}

function watch(page, errors, externalRequests) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) {
      externalRequests.push(request.url());
    }
  });
}

async function checkMotion(browser, errors, externalRequests) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  watch(page, errors, externalRequests);
  try {
    await page.setViewport({ width: 1469, height: 1071 });
    await setMedia(page, false, false);
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'running');
    assert.equal(await page.$eval('#motion-toggle', e => e.getAttribute('aria-label')), 'Pause motion');
    await page.waitForFunction(() => !!document.querySelector('[data-reveal][data-revealed="true"]'));
    const nextReveal = await page.$('[data-reveal]:not([data-revealed="true"])');
    assert.ok(nextReveal);
    await nextReveal.evaluate(e => e.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForFunction(e => e.getAnimations().some(a => a.playState === 'running'), {}, nextReveal);
    await page.$eval('#motion-toggle', e => e.click());
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'paused');
    assert.ok(await nextReveal.evaluate(e => e.getAnimations().every(a => a.playState !== 'running')));
    assert.equal(await page.evaluate(() => localStorage.getItem('motion')), 'paused');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'paused');
    await page.focus('#motion-toggle');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'running');
    assert.equal(await page.$eval('#motion-toggle', e => e.getAttribute('aria-pressed')), 'false');
    await setMedia(page, false, true);
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'reduced');
    assert.equal(await page.$eval('#motion-toggle', e => e.getAttribute('aria-disabled')), 'true');
    await page.click('#motion-toggle');
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'reduced', 'OS reduced motion takes priority');
    await setMedia(page, false, false);
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'running');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'paused');
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('beforeprint'));
    });
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'paused');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'running');
    assert.equal(await page.evaluate(() => localStorage.getItem('motion')), 'running');
  } finally {
    await context.close();
  }
}

async function clickVisible(page, selector) {
  // Native scrolling exposes controls that may be behind the sticky dialog header.
  await page.$eval(selector, e => e.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }));
  await page.click(selector);
}

async function updateContact(page, id, values) {
  await clickVisible(page, '[data-filter="all"]');
  await clickVisible(page, '[data-record="' + id + '"]');
  await page.evaluate(values => {
    Object.entries(values).forEach(([key, value]) => { document.getElementById('record-' + key).value = value; });
  }, values);
  await clickVisible(page, '#record-form button[type="submit"]');
}

async function exportCsv(page) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-demo-export-'));
  const session = await page.browser().target().createCDPSession();
  let timer;
  try {
    await session.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: directory, eventsEnabled: true });
    let guid;
    let downloadName;
    const completed = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('CSV download did not finish')), 15000);
      session.on('Browser.downloadWillBegin', event => { guid = event.guid; downloadName = event.suggestedFilename; });
      session.on('Browser.downloadProgress', event => {
        if (event.guid !== guid) return;
        if (event.state === 'completed') resolve(downloadName);
        if (event.state === 'canceled') reject(new Error('CSV download was canceled'));
      });
    });
    await clickVisible(page, '#export-records');
    const filename = await completed;
    assert.equal(filename, 'fictional-contacts-cleaned.csv');
    return fs.readFileSync(path.join(directory, filename), 'utf8');
  } finally {
    clearTimeout(timer);
    await session.send('Browser.setDownloadBehavior', { behavior: 'default' });
    await session.detach();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function checkWorkspace(page) {
  const counts = () => page.$$eval('.workspace-stats dd', es => es.map(e => e.textContent));
  assert.equal(await page.$eval('#data-workspace', e => e.open), false);
  await page.focus('#open-workspace');
  await page.keyboard.press('Enter');
  assert.ok(await page.$eval('#data-workspace', e => e.open));
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.ok(await page.$eval('#data-workspace', e => e.contains(document.activeElement)), 'Dialog keeps keyboard focus inside');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#data-workspace', e => e.open), false);
  assert.equal(await page.$eval('#open-workspace', e => e === document.activeElement), true, 'Close restores launch focus');
  await clickVisible(page, '#open-workspace');
  assert.deepEqual(await counts(), ['6', '—', '—', '—']);
  assert.ok(await page.$eval('#export-records', e => e.disabled));
  await clickVisible(page, '#clean-records');
  assert.deepEqual(await counts(), ['6', '2', '3', '1']);
  assert.equal(await page.$eval('#record-name', e => e.value), 'Nora Patel');
  assert.equal(await page.$eval('#record-email', e => e.getAttribute('aria-invalid')), 'true');
  await capture(page, 'workspace-cleaned');
  await clickVisible(page, '[data-record="c1"]');
  assert.equal(await page.$eval('#record-name', e => e.value), 'Maya Chen');
  assert.equal(await page.$eval('#record-email', e => e.value), 'maya@example.com');
  await clickVisible(page, '[data-filter="duplicate"]');
  assert.equal(await page.$$eval('[data-record]', es => es.length), 1);
  assert.match(await page.$eval('#record-notes', e => e.textContent), /first complete record/);
  await updateContact(page, 'c4', { email: ' NORA@EXAMPLE.COM ' });
  assert.deepEqual(await counts(), ['6', '3', '2', '1']);
  assert.equal(await page.$eval('#record-email', e => e.value), 'nora@example.com');
  await clickVisible(page, '#clean-records');
  assert.deepEqual(await counts(), ['6', '3', '2', '1'], 'Running again preserves edits and gives the same result');
  await updateContact(page, 'c4', { email: 'not-an-email' });
  assert.deepEqual(await counts(), ['6', '2', '3', '1']);
  assert.equal(await page.$eval('#record-email', e => e.getAttribute('aria-invalid')), 'true');
  await updateContact(page, 'c4', { email: 'nora@example.com', name: '<img src=x onerror=alert(1)>' });
  assert.equal(await page.$('#record-list img'), null, 'Edits render as text');
  await updateContact(page, 'c4', { name: '=2+2', company: 'Example, "North"' });
  await updateContact(page, 'c1', { company: '' });
  assert.deepEqual(await counts(), ['6', '3', '3', '0'], 'An incomplete earlier record does not suppress a complete later duplicate');
  await updateContact(page, 'c1', { company: 'Northstar Studio' });
  assert.deepEqual(await counts(), ['6', '3', '2', '1']);
  const csv = await exportCsv(page);
  assert.match(csv, /"Name","Company","Email"/);
  assert.match(csv, /"'=2\+2","Example, ""North""","nora@example.com"/);
  assert.equal((csv.match(/maya@example.com/g) || []).length, 1);
  assert.ok(!csv.includes('amir@example.com') && !csv.includes('sofia.example.com'), 'Unready contacts are excluded');
  assert.equal(csv.trim().split('\r\n').length, 4, 'Header plus three ready contacts');
  await page.setViewport({ width: 390, height: 844 });
  assert.deepEqual(await counts(), ['6', '3', '2', '1'], 'Resizing preserves data');
  await clickVisible(page, '#close-workspace');
  await clickVisible(page, '#open-workspace');
  assert.deepEqual(await counts(), ['6', '3', '2', '1'], 'Closing and reopening preserves the tab session');
  for (const id of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6']) await updateContact(page, id, { email: '' });
  assert.ok(await page.$eval('#export-records', e => e.disabled), 'No export when no contacts are ready');
  await clickVisible(page, '[data-filter="ready"]');
  assert.equal(await page.$$eval('[data-record]', es => es.length), 0);
  assert.equal(await page.$eval('#records-empty', e => e.hidden), false);
  assert.equal(await page.$eval('#record-form', e => e.hidden), true);
  await clickVisible(page, '#reset-records');
  assert.deepEqual(await counts(), ['6', '—', '—', '—']);
  assert.equal(await page.$$eval('[data-record]', es => es.length), 6);
  assert.ok(await page.$eval('#record-fields', e => e.disabled));
  await clickVisible(page, '#close-workspace');
  await page.setViewport({ width: 1469, height: 1071 });
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function checkMobileBeforeScript(browser, errors, externalRequests) {
  const page = await browser.newPage();
  watch(page, errors, externalRequests);
  let releaseScript;
  const scriptGate = new Promise(resolve => { releaseScript = resolve; });
  let navigation;
  try {
    await page.setViewport({ width: 390, height: 844 });
    await setMedia(page);
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (new URL(request.url()).pathname === '/animations.js') await scriptGate;
      if (!request.isInterceptResolutionHandled()) await request.continue();
    });
    navigation = page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('#experience .job');
    const before = await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        enhanced: document.documentElement.classList.contains('enhanced'),
        open: document.getElementById('data-workspace').open,
        experienceY: document.getElementById('experience').getBoundingClientRect().top,
      };
    });
    assert.equal(before.enhanced, false, 'The deferred script is still deliberately held back');
    assert.equal(before.open, false, 'The workspace is closed at first paint');
    releaseScript();
    await navigation;
    const after = await page.$eval('#experience', section => section.getBoundingClientRect().top);
    assert.ok(Math.abs(after - before.experienceY) <= 1, 'Loading the deferred script does not shift mobile experience');
  } finally {
    releaseScript();
    if (navigation) await navigation.catch(() => {});
    await page.close();
  }
}

async function main() {
  // Local HTTP gives self-hosted fonts the same-origin behavior used by GitHub Pages.
  const site = await startLocalSite(root);
  url = site.url;
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    const errors = [];
    const externalRequests = [];
    watch(page, errors, externalRequests);
    await page.setViewport({ width: 1469, height: 1071 });
    await setMedia(page);
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(page.url(), url);
    assert.match(await page.title(), /Francisco Vaquero/);
    assert.match(await page.$eval('.role', element => element.textContent), /Software Developer & Automation Specialist/);
    assert.ok(await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('500 16px "Space Grotesk"') && document.fonts.check('400 16px Inter');
    }), 'Self-hosted portfolio fonts load before visual checks');
    assert.ok(await page.$eval('body', element => element.textContent.trim().length > 500), 'The app is not blank');
    assert.equal(await page.$('vite-error-overlay, nextjs-portal, [data-nextjs-dialog-overlay]'), null, 'No framework error overlay');
    await page.waitForSelector('#experience .job');
    assert.equal(await page.$eval('h1', element => element.textContent.replace(/\s+/g, ' ').trim()), 'Francisco Vaquero');
    assert.equal(await page.$$eval('#experience article', elements => elements.length), 7);
    assert.match(await page.$eval('#experience .job', element => element.textContent), /Automation Developer.*Praeco.*Jan 27, 2026.*Present/s);
    assert.deepEqual(await page.$$eval('#experience .job:first-of-type time', elements =>
      elements.map(element => element.getAttribute('datetime'))), ['2026-01-27']);
    assert.match(await page.$eval('#fundflare', element => element.textContent), /Fundflare.*Dec 14, 2023.*Apr 26, 2025/s);
    assert.deepEqual(await page.$$eval('#fundflare time', elements =>
      elements.map(element => element.getAttribute('datetime'))), ['2023-12-14', '2025-04-26']);
    assert.equal(await page.$$eval('[role="meter"]', elements => elements.length), 0);
    assert.equal(await page.$eval('.portrait', image => image.getAttribute('src')), 'assets/portrait.webp');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'cv-francisco.png'))).digest('hex'),
      '5e480ea045b7e60a1b56a455ee170e0aa4c79ac9dc62e6cba75f493e7fa3faf8', 'The original portrait is unchanged');
    assert.ok(fs.statSync(path.join(root, 'assets/portrait.webp')).size < 30000, 'Display portrait is optimized');
    assert.deepEqual(await page.$$eval('.content > section', sections => sections.map(section => section.id)),
      ['experience', 'skills', 'training'], 'Professional proof precedes the full tools list');
    assert.deepEqual(await page.$$eval('.earlier-job time', times => times.map(time => time.dateTime)),
      ['2019-11', '2020-05', '2019-07', '2019-11'], 'Earlier roles stay newest-first');
    assert.match(await page.$eval('.featured-training', element => element.textContent), /Codecademy.*Certificate of completion.*Oct 20, 2025/s);
    assert.ok(await page.$$eval('[id]', elements => new Set(elements.map(element => element.id)).size === elements.length));
    assert.equal(await page.$eval('html', e => e.dataset.motion), 'reduced');
    assert.equal(await page.$eval('html', e => getComputedStyle(e).scrollBehavior), 'auto');
    assert.equal(await page.$$eval('a[href]', es => es.filter(e => new URL(e.href).hostname === 'github.com').length), 0,
      'The CV does not direct visitors to private repositories or a GitHub profile');
    assert.ok(!fs.readFileSync(path.join(root, 'Francisco_Vaquero_CV_Tech.md'), 'utf8').includes('github.com/VGLeo93'));
    await checkWorkspace(page);

    // All on-page anchors and local downloads/assets must resolve before deployment.
    const links = await page.$$eval('a[href]', elements => elements.map(element => ({
      href: element.getAttribute('href'), target: element.target, rel: element.rel,
    })));
    const assets = await page.$$eval('img[src],script[src],link[rel="stylesheet"]', elements =>
      elements.map(element => element.getAttribute('src') || element.getAttribute('href')));
    const localPaths = new Set();
    for (const link of links) {
      if (link.href.startsWith('#')) {
        assert.ok(await page.$eval('html', (_, id) => !!document.getElementById(id), link.href.slice(1)), 'Broken anchor: ' + link.href);
      } else if (!/^[a-z]+:/i.test(link.href)) {
        localPaths.add(link.href);
      }
      if (link.target === '_blank') assert.ok(link.rel.includes('noopener'), 'Unsafe new-tab link');
    }
    assets.forEach(asset => localPaths.add(asset.split('?')[0]));
    for (const localPath of localPaths) {
      assert.ok(fs.existsSync(path.join(root, localPath)), 'Missing local asset: ' + localPath);
    }
    const certificates = new Set(links.map(link => link.href).filter(href => href.startsWith('certifications/')));
    assert.equal(certificates.size, 16, 'All existing certificates are linked');
    const pdf = fs.readFileSync(path.join(root, 'Francisco_Vaquero_CV.pdf'));
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.equal(pdf.includes(Buffer.from('file:///')), false, 'PDF must not contain local-file links');
    assert.ok(pdf.includes(Buffer.from('https://vgleo93.github.io/francisco_cv/certifications/')), 'PDF certificates link to the public site');
    assert.equal(await page.$eval('.pdf-download', element => element.getAttribute('href')), 'Francisco_Vaquero_CV.pdf');
    assert.ok(await page.$eval('.pdf-download', element => element.hasAttribute('download')));
    await checkContrast(page);
    await capture(page, 'desktop');

    // Default follows the OS; a reader's saved choice takes precedence and survives reload.
    await setMedia(page, true);
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await page.$eval('#theme-toggle', button => button.getAttribute('aria-label')), 'Use light theme');
    await setMedia(page);
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await page.click('#theme-toggle');
    assert.equal(await page.$eval('html', element => element.dataset.theme), 'dark');
    assert.equal(await page.$eval('#theme-toggle', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.$eval('html', element => element.dataset.theme), 'dark');
    await checkContrast(page);
    await capture(page, 'desktop-dark');
    await page.click('#theme-toggle');
    await page.reload({ waitUntil: 'load' });
    await setMedia(page, true);
    assert.equal(await page.$eval('html', element => element.dataset.theme), 'light');

    await page.click('.navigation a[href="#experience"]');
    assert.ok(page.url().endsWith('#experience'), 'Experience navigation works');
    await page.waitForFunction(() => document.querySelector('.navigation a[href="#experience"]').getAttribute('aria-current') === 'location');
    await page.$eval('#skills', element => element.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForFunction(() => document.querySelector('.navigation a[href="#skills"]').getAttribute('aria-current') === 'location');
    await capture(page, 'skills');
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => Number(document.documentElement.style.getPropertyValue('--reading-progress')) >= 0.99);
    assert.equal(await page.$$eval('.navigation [aria-current="location"]', elements => elements.length), 1);
    await page.click('.all-certificates summary');
    assert.ok(await page.$eval('.all-certificates', details => details.open));
    assert.equal(await page.$$eval('.extra-certificates a', links => links.length), 8);
    await page.click('.all-certificates summary');
    assert.equal(await page.$eval('.all-certificates', details => details.open), false);
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert.ok(await page.$eval('.all-certificates', details => details.open));
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'paused');
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.$eval('.all-certificates', details => details.open), false);
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'reduced');
    await page.$eval('.all-certificates', details => { details.open = true; });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
      window.dispatchEvent(new Event('afterprint'));
    });
    assert.ok(await page.$eval('.all-certificates', details => details.open), 'Printing preserves an already-open disclosure');
    await page.$eval('.all-certificates', details => { details.open = false; });

    // Every role remains readable at each major layout size; no carousel or scroll trap.
    for (const width of [320, 360, 390, 768, 1024, 1469]) {
      await page.setViewport({ width, height: width < 600 ? 844 : 1071 });
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        width: document.documentElement.scrollWidth,
        roles: Array.from(document.querySelectorAll('#experience article')).map(element => {
          const bounds = element.getBoundingClientRect();
          return { width: bounds.width, height: bounds.height, display: getComputedStyle(element).display };
        }),
      }));
      assert.ok(layout.width <= layout.viewport + 1, 'Horizontal overflow at ' + width + 'px');
      assert.ok(layout.roles.every(role => role.width > 0 && role.height > 0 && role.display !== 'none'), 'Hidden role at ' + width + 'px');
      if (width === 390) {
        await page.evaluate(() => window.scrollTo(0, 0));
        assert.equal(await page.$eval('#data-workspace', e => e.open), false);
        const contactBottom = await page.$eval('.hero-actions .text-link', e => e.getBoundingClientRect().bottom);
        assert.ok(contactBottom <= 844, 'Mobile first screen exposes contact');
        await capture(page, 'mobile');
        await page.click('#open-workspace');
        assert.ok(await page.$eval('#data-workspace', e => e.open));
        await page.click('#clean-records');
        assert.equal(await page.$eval('#count-ready', e => e.textContent), '2');
        assert.ok(await page.$eval('#data-workspace', e => e.scrollWidth <= e.clientWidth + 1), 'Mobile workspace does not overflow');
        await capture(page, 'mobile-workspace');
        await page.click('#close-workspace');
      }
    }
    await page.setViewport({ width: 1168, height: 556 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    assert.ok(await page.$eval('.hero-actions .button-primary', button => button.getBoundingClientRect().bottom <= innerHeight),
      'Primary action is visible on a short laptop viewport');
    await capture(page, 'short-desktop');
    await page.setViewport({ width: 1346, height: 1168 });
    await page.evaluate(() => document.querySelectorAll('.job')[1].scrollIntoView({ behavior: 'instant' }));
    await capture(page, 'experience-and-skills');
    await page.evaluate(() => document.getElementById('training').scrollIntoView({ behavior: 'instant' }));
    await capture(page, 'training');
    await page.$eval('#contact', element => element.scrollIntoView({ behavior: 'instant' }));
    await page.waitForFunction(() => {
      const image = document.querySelector('.portrait');
      return image.complete && image.naturalWidth > 0;
    });
    await capture(page, 'contact');

    await checkMotion(browser, errors, externalRequests);
    await checkMobileBeforeScript(browser, errors, externalRequests);

    // Storage-restricted browsing must still have a working toggle.
    const restricted = await browser.newPage();
    watch(restricted, errors, externalRequests);
    await restricted.evaluateOnNewDocument(() => {
      Storage.prototype.getItem = function () { throw new Error('Storage blocked'); };
      Storage.prototype.setItem = function () { throw new Error('Storage blocked'); };
    });
    await setMedia(restricted, true, false);
    await restricted.goto(url, { waitUntil: 'load' });
    assert.equal(await restricted.$eval('html', element => element.dataset.theme), 'dark');
    await restricted.click('#theme-toggle');
    assert.equal(await restricted.$eval('html', element => element.dataset.theme), 'light');
    await restricted.click('#motion-toggle');
    assert.equal(await restricted.$eval('html', element => element.dataset.motion), 'paused');
    await restricted.click('#open-workspace');
    await restricted.click('#clean-records');
    assert.equal(await restricted.$eval('#count-ready', e => e.textContent), '2');
    await restricted.click('#close-workspace');
    await restricted.close();

    // Core CV and native certificate disclosure remain usable without JavaScript.
    const staticPage = await browser.newPage();
    watch(staticPage, errors, externalRequests);
    await staticPage.setJavaScriptEnabled(false);
    await setMedia(staticPage);
    await staticPage.goto(url, { waitUntil: 'load' });
    assert.equal(await staticPage.$$eval('#experience article', elements => elements.length), 7);
    assert.ok(await staticPage.$$eval('[data-reveal]', elements => elements.length > 0 && elements.every(element =>
      getComputedStyle(element).opacity === '1' && element.getBoundingClientRect().height > 0)), 'No-JS content is not hidden behind animation');
    assert.equal(await staticPage.$eval('#data-workspace', e => e.open), false);
    assert.equal(await staticPage.$eval('#open-workspace', e => e.checkVisibility({ visibilityProperty: true })), false);
    assert.match(await staticPage.$eval('.demo-preview noscript', e => e.textContent), /Enable JavaScript/);
    assert.equal(await staticPage.$eval('#motion-toggle', button => button.getBoundingClientRect().height), 0, 'No-JS motion control is hidden');
    await staticPage.click('.all-certificates summary');
    assert.ok(await staticPage.$eval('.all-certificates', details => details.open));
    await staticPage.close();

    assert.deepEqual(errors, [], 'No runtime/console errors');
    assert.deepEqual(externalRequests, [], 'No external runtime dependencies');
    console.log('PASS: identity/facts, seven roles, 16 certificates, assets/PDF, active navigation/progress, theme/OS/storage, contrast, interactive workspace cleanup/edit/filter/export/keyboard/resize, private GitHub links removed, finite reveals, motion pause/persistence/system opt-out/background-tab, print restoration, six responsive sizes, no-JS reading and console health.');
  } finally {
    if (browser) await browser.close();
    await site.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
