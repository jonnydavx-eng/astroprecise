#!/usr/bin/env node
/** Footer-only: convert <nav> landmarks to <div role="group"> */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let total = 0;

for (const name of fs.readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  const fp = path.join(root, name);
  let html = fs.readFileSync(fp, 'utf8');
  const next = html.replace(/<footer[\s\S]*?<\/footer>/gi, (footer) => {
    let f = footer;
    f = f.replace(/<nav(\s[^>]*)>/gi, (m, attrs) => {
      if (/role="group"/i.test(attrs)) return m;
      const label = (attrs.match(/aria-label="([^"]*)"/i) || [])[1];
      const cls = (attrs.match(/class="([^"]*)"/i) || [])[1];
      const parts = [];
      if (cls) parts.push(`class="${cls}"`);
      parts.push('role="group"');
      if (label) parts.push(`aria-label="${label.replace(/\s*navigation\s*$/i, '').trim() || label}"`);
      return `<div ${parts.join(' ')}>`;
    });
    f = f.replace(/<\/nav>/gi, '</div>');
    return f;
  });
  if (next !== html) {
    fs.writeFileSync(fp, next);
    total++;
    console.log('fixed footer nav:', name);
  }
}
console.log('files updated:', total);