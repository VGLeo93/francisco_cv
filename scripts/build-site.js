'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'public');
const assets = [
  'index.html', 'styles.css', 'animations.js', 'cv-francisco.png',
  'Francisco_Vaquero_CV.pdf', 'Francisco_Vaquero_CV_Tech.md', 'certifications', 'assets',
];

for (const asset of assets) {
  if (!fs.existsSync(path.join(root, asset))) throw new Error('Missing site asset: ' + asset);
}
fs.mkdirSync(output, { recursive: true });
for (const asset of assets) {
  fs.cpSync(path.join(root, asset), path.join(output, asset), { recursive: true });
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Prepared public/ with CV, portrait and all certification PDFs.');
