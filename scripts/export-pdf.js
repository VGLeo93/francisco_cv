'use strict';

const path = require('node:path');
const { launchBrowser } = require('./browser');
const { startLocalSite } = require('./local-server');

async function main() {
  const root = path.resolve(__dirname, '..');
  const site = await startLocalSite(root);
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1469, height: 1071 });
    await page.goto(site.url, { waitUntil: 'load' });
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(details => { details.open = true; });
      // A single text run preserves the full name for résumé text extraction.
      const name = document.querySelector('h1');
      name.textContent = name.textContent.replace(/\s+/g, ' ').trim();
      // PDF links must work on someone else's computer, not point into this checkout.
      const base = document.querySelector('link[rel="canonical"]').href;
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!/^[a-z]+:|^#/i.test(href)) link.href = new URL(href, base).href;
      });
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        walker.currentNode.textContent = walker.currentNode.textContent.replace(/[\u2010-\u2015]/g, '-');
      }
    });
    const output = path.join(root, 'Francisco_Vaquero_CV.pdf');
    await page.pdf({
      path: output,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;padding:0 12mm;font:8px Arial;color:#65758a;text-align:right">Francisco Vaquero · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margin: { top: '12mm', right: '12mm', bottom: '14mm', left: '12mm' },
    });
    console.log('Exported ' + output);
  } finally {
    if (browser) await browser.close();
    await site.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
