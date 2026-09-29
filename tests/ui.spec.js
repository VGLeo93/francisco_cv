'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launchBrowser } = require('../scripts/browser');

const root = path.resolve(__dirname, '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
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
  const colors = await page.evaluate(() => ({
    body: getComputedStyle(document.body).color,
    link: getComputedStyle(document.querySelector('.contact-list a')).color,
    background: getComputedStyle(document.querySelector('.page')).backgroundColor,
    button: getComputedStyle(document.querySelector('.button-primary')).backgroundColor,
    buttonText: getComputedStyle(document.querySelector('.button-primary')).color,
  }));
  assert.ok(contrast(colors.body, colors.background) >= 4.5, 'Body text contrast');
  assert.ok(contrast(colors.link, colors.background) >= 4.5, 'Link contrast');
  assert.ok(contrast(colors.buttonText, colors.button) >= 4.5, 'Primary button contrast');
}

async function main() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const errors = [];
    const externalRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => {
      if (/^https?:/.test(request.url())) externalRequests.push(request.url());
    });
    await page.setViewport({ width: 1469, height: 1071 });
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
    await page.goto(url, { waitUntil: 'load' });
    assert.equal(page.url(), url);
    assert.match(await page.title(), /Francisco Vaquero.*Automation/);
    await page.waitForSelector('#experience .job');
    assert.equal(await page.$eval('h1', element => element.textContent.replace(/\s+/g, ' ').trim()), 'Francisco Vaquero');
    assert.equal(await page.$$eval('#experience article', elements => elements.length), 6);
    assert.match(await page.$eval('#experience .job', element => element.textContent), /Fundflare.*Dec 14, 2023.*Apr 26, 2025/s);
    assert.deepEqual(await page.$$eval('#experience .job:first-of-type time', elements =>
      elements.map(element => element.getAttribute('datetime'))), ['2023-12-14', '2025-04-26']);
    assert.equal(await page.$$eval('[role="meter"]', elements => elements.length), 0);
    assert.ok(await page.$eval('.portrait', image => image.complete && image.naturalWidth > 0));
    assert.ok(await page.$$eval('[id]', elements => new Set(elements.map(element => element.id)).size === elements.length));
    assert.equal(await page.$eval('html', element => getComputedStyle(element).scrollBehavior), 'auto');

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
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    assert.equal(await page.$eval('#theme-toggle', button => button.getAttribute('aria-label')), 'Use light theme');
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
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
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'dark' },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ]);
    assert.equal(await page.$eval('html', element => element.dataset.theme), 'light');

    await page.click('.navigation a[href="#experience"]');
    assert.ok(page.url().endsWith('#experience'), 'Experience navigation works');
    await page.click('.all-certificates summary');
    assert.ok(await page.$eval('.all-certificates', details => details.open));
    assert.equal(await page.$$eval('.extra-certificates a', links => links.length), 8);
    await page.click('.all-certificates summary');
    assert.equal(await page.$eval('.all-certificates', details => details.open), false);
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    assert.ok(await page.$eval('.all-certificates', details => details.open));
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.$eval('.all-certificates', details => details.open), false);

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
        await capture(page, 'mobile');
      }
    }
    await page.setViewport({ width: 1346, height: 1168 });
    await page.evaluate(() => document.querySelectorAll('.job')[1].scrollIntoView({ behavior: 'instant' }));
    await capture(page, 'experience-and-skills');
    await page.evaluate(() => document.getElementById('training').scrollIntoView({ behavior: 'instant' }));
    await capture(page, 'training');

    // Storage-restricted browsing must still have a working toggle.
    const restricted = await browser.newPage();
    restricted.on('pageerror', error => errors.push(error.message));
    await restricted.evaluateOnNewDocument(() => {
      Storage.prototype.getItem = function () { throw new Error('Storage blocked'); };
      Storage.prototype.setItem = function () { throw new Error('Storage blocked'); };
    });
    await restricted.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
    await restricted.goto(url, { waitUntil: 'load' });
    assert.equal(await restricted.$eval('html', element => element.dataset.theme), 'dark');
    await restricted.click('#theme-toggle');
    assert.equal(await restricted.$eval('html', element => element.dataset.theme), 'light');
    await restricted.close();

    // Core CV and native certificate disclosure remain usable without JavaScript.
    const staticPage = await browser.newPage();
    await staticPage.setJavaScriptEnabled(false);
    await staticPage.goto(url, { waitUntil: 'load' });
    assert.equal(await staticPage.$$eval('#experience article', elements => elements.length), 6);
    await staticPage.click('.all-certificates summary');
    assert.ok(await staticPage.$eval('.all-certificates', details => details.open));
    await staticPage.close();

    assert.deepEqual(errors, [], 'No runtime/console errors');
    assert.deepEqual(externalRequests, [], 'No external runtime dependencies');
    console.log('PASS: identity, six roles, 16 certificates, assets/PDF, navigation, theme/OS/storage, contrast, print restoration, six responsive sizes, no-JS reading and console health.');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
