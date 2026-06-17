import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'horoscope.html');
let html = readFileSync(path, 'utf8');
const before = html;
html = html.replace(/ aria-label="[A-Za-z]+ horoscope"/g, '');
if (html !== before) writeFileSync(path, html);
console.log('fix-horoscope-sign-aria: updated');