#!/usr/bin/env node
// make-brand-icons.mjs — regenerate the favicon/app-icon set from the
// Paper & Night brand mark (brand pack directions/A-paper-and-night/logo,
// drawn by src/themes.py mark()). Run from anywhere: node tools/make-brand-icons.mjs
//
// Sources:  website/favicon.svg           (night tile, half-lit disc, copper star)
//           tools/brand-src/mark-dark.svg  (large master on a full night square)
// Outputs:  website/favicon-16.png, favicon-32.png, favicon-48.png
//           website/favicon.ico        (16 + 32 + 48, BMP-encoded entries)
//           website/img/apple-touch-icon.png (180, full-bleed night square)
//           website/img/icon-192.png / icon-512.png
//           website/img/icon-maskable-512.png (mark ~80% — maskable safe zone)
//
// Uses playwright + pngjs from tools/visual-check/node_modules (no sharp on
// this machine). ICO entries are classic BMP (BITMAPINFOHEADER + AND mask)
// for maximum compatibility (Safari/SERP/legacy).
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, 'visual-check', 'package.json'));
const { chromium } = require('playwright');
const { PNG } = require('pngjs');

const SITE = path.join(__dirname, '..', 'website');
const VOID = '#0E1116'; // --ap-night

const faviconSvg = readFileSync(path.join(SITE, 'favicon.svg'), 'utf8');
const masterSvg = readFileSync(path.join(__dirname, 'brand-src', 'mark-dark.svg'), 'utf8');

// The Paper & Night favicon is drawn to read at 16px, so all three sizes
// render from the same SVG.
const favicon16Svg = faviconSvg;

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });

async function renderSvg(svg, size, { transparent = false, scale = 1 } = {}) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  const inner = Math.round(size * scale);
  const bg = transparent ? 'transparent' : VOID;
  await page.setContent(`<!doctype html><style>
    html,body{margin:0;width:${size}px;height:${size}px;background:${bg};overflow:hidden}
    body{display:flex;align-items:center;justify-content:center}
    svg{width:${inner}px;height:${inner}px;display:block}
  </style>${svg}`);
  await page.waitForTimeout(120);
  const buf = await page.screenshot({ omitBackground: transparent });
  await page.close();
  return buf;
}

// ── Favicon PNGs ──────────────────────────────────────────────────────────
const png16 = await renderSvg(favicon16Svg, 16, { transparent: true });
const png32 = await renderSvg(faviconSvg, 32, { transparent: true });
const png48 = await renderSvg(faviconSvg, 48, { transparent: true });
writeFileSync(path.join(SITE, 'favicon-16.png'), png16);
writeFileSync(path.join(SITE, 'favicon-32.png'), png32);
writeFileSync(path.join(SITE, 'favicon-48.png'), png48);
console.log('wrote favicon-16.png / favicon-32.png / favicon-48.png');

// ── favicon.ico (BMP-encoded entries: 16 + 32 + 48) ───────────────────────
function icoEntryFromPng(buf) {
  const png = PNG.sync.read(buf);
  const { width: w, height: h, data } = png;
  const rowMask = Math.ceil(w / 32) * 4; // AND mask rows padded to 32-bit
  const xor = Buffer.alloc(w * h * 4);
  const and = Buffer.alloc(rowMask * h); // all 0 = rely on alpha channel
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4;
      const dst = ((h - 1 - y) * w + x) * 4; // bottom-up
      xor[dst] = data[src + 2];     // B
      xor[dst + 1] = data[src + 1]; // G
      xor[dst + 2] = data[src];     // R
      xor[dst + 3] = data[src + 3]; // A
      if (data[src + 3] < 128) {
        const mRow = h - 1 - y;
        and[mRow * rowMask + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);        // biSize
  header.writeInt32LE(w, 4);          // biWidth
  header.writeInt32LE(h * 2, 8);      // biHeight (XOR + AND)
  header.writeUInt16LE(1, 12);        // biPlanes
  header.writeUInt16LE(32, 14);       // biBitCount
  header.writeUInt32LE(xor.length + and.length, 20); // biSizeImage
  return { w, h, data: Buffer.concat([header, xor, and]) };
}

const entries = [png16, png32, png48].map(icoEntryFromPng);
const dirSize = 6 + entries.length * 16;
let offset = dirSize;
const head = Buffer.alloc(dirSize);
head.writeUInt16LE(0, 0); // reserved
head.writeUInt16LE(1, 2); // type: icon
head.writeUInt16LE(entries.length, 4);
entries.forEach((e, i) => {
  const o = 6 + i * 16;
  head.writeUInt8(e.w >= 256 ? 0 : e.w, o);
  head.writeUInt8(e.h >= 256 ? 0 : e.h, o + 1);
  head.writeUInt8(0, o + 2);  // palette
  head.writeUInt8(0, o + 3);  // reserved
  head.writeUInt16LE(1, o + 4);  // planes
  head.writeUInt16LE(32, o + 6); // bpp
  head.writeUInt32LE(e.data.length, o + 8);
  head.writeUInt32LE(offset, o + 12);
  offset += e.data.length;
});
writeFileSync(path.join(SITE, 'favicon.ico'), Buffer.concat([head, ...entries.map(e => e.data)]));
console.log('wrote favicon.ico (16+32+48, BMP entries)');

// ── App icons from the large master (solid void, no alpha) ────────────────
writeFileSync(path.join(SITE, 'img', 'apple-touch-icon.png'), await renderSvg(masterSvg, 180));
writeFileSync(path.join(SITE, 'img', 'icon-192.png'), await renderSvg(masterSvg, 192));
writeFileSync(path.join(SITE, 'img', 'icon-512.png'), await renderSvg(masterSvg, 512));
writeFileSync(path.join(SITE, 'img', 'icon-maskable-512.png'), await renderSvg(masterSvg, 512, { scale: 0.8 }));
console.log('wrote img/apple-touch-icon.png (180), img/icon-192.png, img/icon-512.png, img/icon-maskable-512.png');

await browser.close();
console.log('done');
