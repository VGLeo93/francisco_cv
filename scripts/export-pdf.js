'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { launchBrowser } = require('./browser');

async function main() {
  const root = path.resolve(__dirname, '..');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1469, height: 1071 });
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href, { waitUntil: 'load' });
    await page.emulateMediaType('print');
    await page.evaluate(() => {
      document.querySelectorAll('details').forEach(details => { details.open = true; });
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
    await browser.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
