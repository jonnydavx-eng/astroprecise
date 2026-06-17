import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
let html = readFileSync(htmlPath, 'utf8');

html = html.replace(
  /<style id="ap-css-lite-critical">[\s\S]*?<\/style>/,
  '<link rel="stylesheet" href="css/lite-critical.css" id="ap-css-lite-critical" />'
);

writeFileSync(htmlPath, html);
console.log('OK: reverted to external lite-critical.css link');