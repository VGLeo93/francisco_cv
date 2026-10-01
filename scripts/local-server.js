'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// A loopback-only, ephemeral preview server shared by tests and PDF export.
// Serve the public CV, never the checkout's development tools or directory lists.
async function startLocalSite(root) {
  const base = await fs.promises.realpath(root);
  const files = new Set([
    'index.html', 'styles.css', 'animations.js', 'data-workspace.js', 'cv-francisco.png',
    'Francisco_Vaquero_CV.pdf', 'Francisco_Vaquero_CV_Tech.md',
  ]);
  const types = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf',
    '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
  };
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      const lexicalTarget = path.resolve(base, relative);
      if (!lexicalTarget.startsWith(base + path.sep) ||
          (!files.has(relative) && !/^(assets|certifications)\//.test(relative))) {
        response.writeHead(404).end();
        return;
      }
      const target = await fs.promises.realpath(lexicalTarget);
      if (!target.startsWith(base + path.sep)) { response.writeHead(404).end(); return; }
      const info = await fs.promises.stat(target);
      if (!info.isFile()) { response.writeHead(404).end(); return; }
      response.writeHead(200, {
        'Content-Type': types[path.extname(target)] || 'application/octet-stream',
        'Content-Length': info.size, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') { response.end(); return; }
      fs.createReadStream(target).on('error', () => response.destroy()).pipe(response);
    } catch (_) {
      if (!response.headersSent) response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: 'http://127.0.0.1:' + server.address().port + '/',
    close: () => new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}

module.exports = { startLocalSite };
