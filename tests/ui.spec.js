'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
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
    return ['#summary', '.bullets li', '.contact-list a', '.button-primary', '#workflow-input', '#workflow-output', '.workflow-note', '.workflow-intro', '.motion-label'].map(selector => {
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
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'running');
    assert.equal(await page.$eval('#motion-toggle', button => button.getAttribute('aria-pressed')), 'false');
    assert.equal(await page.$eval('#motion-toggle', button => button.getAttribute('aria-label')), 'Pause motion');
    assert.equal(await page.$eval('.motion-label', label => label.textContent), 'Motion: on');
    assert.ok(await page.$eval('.motion-label', label => label.getBoundingClientRect().width > 0));
    assert.equal(await page.$('#motion-toggle use'), null, 'The motion control cannot mimic Run workflow');
    assert.ok(await page.$$eval('.flow-signal', elements => elements.length > 0 && elements.every(element =>
      getComputedStyle(element).animationName === 'none')), 'The idle workflow does not loop decorative motion');
    await page.waitForFunction(() => !!document.querySelector('[data-reveal][data-revealed="true"]'));
    const nextReveal = await page.$('[data-reveal]:not([data-revealed="true"])');
    assert.ok(nextReveal, 'A below-the-fold section is available for reveal testing');
    await nextReveal.evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForFunction(element => element.dataset.revealed === 'true' &&
      element.getAnimations().some(animation => animation.playState === 'running'), {}, nextReveal);
    await page.click('#motion-toggle');
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'paused');
    assert.ok(await nextReveal.evaluate(element => element.getAnimations().every(animation => animation.playState !== 'running')),
      'Pausing cancels finite reveal motion');
    await page.click('#motion-toggle');
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'running');

    await page.click('#run-workflow');
    assert.equal(await page.$eval('#workflow-status', element => element.textContent.trim()), 'Receiving data…');
    assert.equal(await page.$eval('#run-workflow', button => button.disabled), true);
    assert.equal(await page.$eval('[data-flow-stage="receive"]', element => element.dataset.active), 'true');
    assert.ok(await page.$$eval('.flow-signal', elements => elements.every(element =>
      getComputedStyle(element).animationName === 'flow-travel')), 'Signals move only during a running workflow');
    assert.equal(await page.$eval('#workflow-input', element => element.readOnly), true);
    // A second synthetic activation cannot start overlapping timer chains.
    await page.$eval('#run-workflow', button => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await page.waitForFunction(() => document.querySelector('[data-flow-stage="transform"]').dataset.active === 'true');
    await page.waitForFunction(() => document.querySelector('[data-flow-stage="deliver"]').dataset.active === 'true');
    await page.waitForFunction(() => document.getElementById('workflow-status').textContent === 'Workflow complete');
    assert.equal(await page.$eval('#run-workflow', button => button.disabled), false);
    assert.equal(await page.$$eval('.workflow-node[data-active="true"]', elements => elements.length), 0);
    assert.equal(await page.$$eval('.workflow-node[data-complete="true"]', elements => elements.length), 3);
    assert.deepEqual(JSON.parse(await page.$eval('#workflow-output', element => element.textContent)),
      { channel: '#support-priority', text: '[HIGH] Ada: CRM setup' });
    assert.ok(await page.$$eval('.flow-signal', elements => elements.every(element =>
      getComputedStyle(element).animationName === 'none')), 'Completing a run stops the signals');
    await capture(page, 'workflow-complete');

    // Native keyboard activation works; pausing cancels the demo safely.
    await page.focus('#workflow-input');
    await page.keyboard.press('Tab');
    assert.ok(await page.$eval('#run-workflow', button => {
      const style = getComputedStyle(button);
      return button.matches(':focus-visible') && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 3;
    }), 'Keyboard focus remains clearly visible above the workflow effects');
    await page.keyboard.press('Enter');
    assert.equal(await page.$eval('.workflow-visual', element => element.dataset.state), 'running');
    await page.click('#motion-toggle');
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'paused');
    assert.equal(await page.$eval('#workflow-status', element => element.textContent), 'Motion paused');
    assert.equal(await page.$eval('#run-workflow', button => button.disabled), false);
    assert.equal(await page.$$eval('.workflow-node[data-active="true"]', elements => elements.length), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('motion')), 'paused');
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'paused');
    assert.equal(await page.$eval('#motion-toggle', button => button.getAttribute('aria-pressed')), 'true');
    assert.equal(await page.$eval('.motion-label', label => label.textContent), 'Motion: off');
    assert.ok(await page.$$eval('.flow-signal', elements => elements.every(element =>
      getComputedStyle(element).animationName === 'none')), 'Paused motion stops decorative loops');
    await page.click('#run-workflow');
    assert.equal(await page.$eval('#workflow-status', element => element.textContent), 'Workflow complete');
    await page.click('#motion-toggle');
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'running');
    assert.equal(await page.evaluate(() => localStorage.getItem('motion')), 'running');

    // A background tab stops optional work without changing the reader's choice.
    await page.click('#run-workflow');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'paused');
    assert.equal(await page.$eval('#workflow-status', element => element.textContent), 'Demo paused while tab is hidden');
    assert.equal(await page.$eval('#run-workflow', button => button.disabled), false);
    assert.equal(await page.$$eval('.workflow-node[data-active="true"]', elements => elements.length), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('motion')), 'running');
    await page.evaluate(() => {
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'running');
    assert.equal(await page.$eval('.workflow-visual', element => element.dataset.state), 'idle');
    assert.equal(await page.$eval('#workflow-status', element => element.textContent), 'Ready to run', 'Returning to the tab clears the cancelled-demo status');

    assert.equal(await page.$eval('.workflow-visual', element => element.hasAttribute('data-tilt')), false);
    assert.equal(await page.$eval('.workflow-visual', element => getComputedStyle(element).transform), 'none');

    await page.click('#run-workflow');
    await setMedia(page, false, true);
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'reduced');
    assert.equal(await page.$eval('#run-workflow', button => button.disabled), false);
    assert.equal(await page.$$eval('.workflow-node[data-active="true"]', elements => elements.length), 0);
    assert.equal(await page.$eval('#motion-toggle', button => button.getAttribute('aria-disabled')), 'true');
    assert.equal(await page.$eval('#motion-toggle', button => button.textContent.trim()), 'Reduced motion');
    await page.click('#motion-toggle');
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'reduced', 'System opt-out wins over saved running');
    await page.click('#run-workflow');
    assert.equal(await page.$eval('#workflow-status', element => element.textContent), 'Workflow complete', 'Reduced-motion demo completes without waiting');
    assert.ok(await page.$$eval('.flow-signal', elements => elements.every(element =>
      getComputedStyle(element).animationName === 'none')), 'Reduced motion stops decorative loops');
    await setMedia(page, false, false);
    await page.waitForFunction(() => document.documentElement.dataset.motion === 'running');
    await page.click('#run-workflow');
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'paused');
    assert.equal(await page.$eval('#run-workflow', button => button.disabled), false);
    assert.equal(await page.$$eval('.workflow-node[data-active="true"]', elements => elements.length), 0);
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'running');
    assert.equal(await page.evaluate(() => localStorage.getItem('motion')), 'running', 'Print does not change the saved motion choice');
  } finally {
    await context.close();
  }
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
        open: document.querySelector('.workflow-wrap').open,
        experienceY: document.getElementById('experience').getBoundingClientRect().top,
      };
    });
    assert.equal(before.enhanced, false, 'The deferred script is still deliberately held back');
    assert.equal(before.open, false, 'The mobile demo is already closed at first paint');
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
    assert.equal(await page.$eval('.demo-source', link => link.href),
      'https://github.com/VGLeo93/francisco_cv/blob/main/animations.js');
    assert.ok(await page.$$eval('[id]', elements => new Set(elements.map(element => element.id)).size === elements.length));
    assert.equal(await page.$eval('html', element => getComputedStyle(element).scrollBehavior), 'auto');
    assert.equal(await page.$eval('html', element => element.dataset.motion), 'reduced');
    assert.equal(await page.$eval('#workflow-status', element => element.getAttribute('role')), 'status');
    assert.equal(await page.$eval('#workflow-status', element => element.getAttribute('aria-live')), 'polite');
    assert.deepEqual(await page.$$eval('.workflow-node', elements => elements.map(element => element.dataset.flowStage)),
      ['receive', 'transform', 'deliver']);

    // Real deterministic output, recoverable validation, reruns and text-only rendering.
    const normal = JSON.stringify({ requester: '  Mia  ', topic: ' Billing issue ', priority: 'normal' });
    await page.$eval('#workflow-input', (input, value) => { input.value = value; }, normal);
    await page.click('#run-workflow');
    const expected = { channel: '#support', text: '[NORMAL] Mia: Billing issue' };
    assert.deepEqual(JSON.parse(await page.$eval('#workflow-output', element => element.textContent)), expected);
    await page.click('#run-workflow');
    assert.deepEqual(JSON.parse(await page.$eval('#workflow-output', element => element.textContent)), expected);
    await page.$eval('#workflow-input', input => { input.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.$eval('#workflow-status', element => element.textContent), 'Ready to run');
    assert.equal(await page.$eval('#workflow-output', element => element.textContent), 'Run the sample to see the routed message.',
      'Editing input cannot leave a stale completed preview');
    for (const invalid of ['{', 'null', '[]', '{}', '{"requester":" ","topic":"CRM","priority":"high"}',
      '{"requester":"Ada","topic":"CRM","priority":"urgent"}']) {
      await page.$eval('#workflow-input', (input, value) => { input.value = value; }, invalid);
      await page.click('#run-workflow');
      assert.equal(await page.$eval('#workflow-input', input => input.getAttribute('aria-invalid')), 'true');
      assert.equal(await page.$eval('#workflow-input', input => input.getAttribute('aria-describedby')), 'workflow-help workflow-status');
      assert.equal(await page.$eval('.workflow-visual', element => element.dataset.state), 'error');
      assert.equal(await page.$eval('#run-workflow', button => button.disabled), false);
      assert.equal(await page.$eval('#workflow-output', element => element.textContent), 'Correct the payload, then run it again.');
    }
    const literal = { requester: '<img src=x onerror=alert(1)>', topic: 'Text only', priority: 'high' };
    await page.$eval('#workflow-input', (input, value) => { input.value = value; }, JSON.stringify(literal));
    await page.click('#run-workflow');
    assert.equal(await page.$eval('#workflow-input', input => input.hasAttribute('aria-invalid')), false);
    assert.equal(await page.$eval('#workflow-input', input => input.getAttribute('aria-describedby')), 'workflow-help');
    assert.equal(await page.$$eval('#workflow-output img', images => images.length), 0);
    assert.equal(JSON.parse(await page.$eval('#workflow-output', element => element.textContent)).text,
      '[HIGH] ' + literal.requester + ': Text only');
    await page.$eval('#workflow-input', input => { input.value = JSON.stringify({ requester: 'Ada', topic: 'CRM setup', priority: 'high' }); });

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
        assert.equal(await page.$eval('.workflow-wrap', details => details.open), false, 'Mobile demo is optional on first arrival');
        const opening = await page.evaluate(() => ({
          experienceY: document.getElementById('experience').getBoundingClientRect().top + scrollY,
          contactBottom: document.querySelector('.hero-actions .text-link').getBoundingClientRect().bottom,
          githubBottom: document.querySelector('.hero-github').getBoundingClientRect().bottom,
        }));
        assert.ok(opening.experienceY <= 1150, 'Mobile experience starts before 1150px');
        assert.ok(opening.contactBottom <= 844 && opening.githubBottom <= 844, 'Mobile first screen exposes contact and GitHub');
        await capture(page, 'mobile');
        await page.click('.workflow-summary');
        assert.equal(await page.$eval('.workflow-wrap', details => details.open), true);
        await page.click('#run-workflow');
        assert.deepEqual(JSON.parse(await page.$eval('#workflow-output', element => element.textContent)),
          { channel: '#support-priority', text: '[HIGH] Ada: CRM setup' });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'Open mobile demo does not overflow');
        await page.click('.workflow-summary');
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
    await restricted.click('#run-workflow');
    assert.equal(await restricted.$eval('#workflow-status', element => element.textContent), 'Workflow complete');
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
    assert.equal(await staticPage.$$eval('.workflow-node', elements => elements.filter(element => element.getBoundingClientRect().height > 0).length), 3);
    assert.equal(await staticPage.$eval('#run-workflow', button => button.getBoundingClientRect().height), 0, 'No-JS demo control is hidden');
    assert.equal(await staticPage.$eval('#motion-toggle', button => button.getBoundingClientRect().height), 0, 'No-JS motion control is hidden');
    await staticPage.click('.all-certificates summary');
    assert.ok(await staticPage.$eval('.all-certificates', details => details.open));
    await staticPage.close();

    assert.deepEqual(errors, [], 'No runtime/console errors');
    assert.deepEqual(externalRequests, [], 'No external runtime dependencies');
    console.log('PASS: identity/facts, seven roles, 16 certificates, assets/PDF, active navigation/progress, theme/OS/storage, contrast, finite reveals/workflow, keyboard/reentry, motion pause/persistence/system opt-out/background-tab, print restoration, six responsive sizes, no-JS reading and console health.');
  } finally {
    if (browser) await browser.close();
    await site.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
