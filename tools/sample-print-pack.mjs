#!/usr/bin/env node
/**
 * Natal Sky Print Pack — local SAMPLE generation on a FICTIONAL chart.
 *
 *   node tools/sample-print-pack.mjs [--out <dir>] [--browser chrome|msedge|chromium] [--quiet]
 *
 * Proves the pack can be produced end to end, offline, with no order, no
 * payment evidence and no fulfilment wiring. Every output is labelled
 * "SAMPLE · fictional chart · not for sale". There is deliberately no --in,
 * --final or --name flag: this script cannot render a customer's chart, so it
 * can never stand in for the paid path (tools/fulfil-order.mjs, which stays
 * fail-closed behind payment evidence).
 *
 * Path: fulfil-shared buildChart (VSOP87/ELP2000 engine) → natalWheelSvg →
 * HTML plates → headless Chromium (playwright-core, system Chrome/Edge) →
 * page.pdf for A3/A4 and page.screenshot for the PNGs. Fonts come from
 * website/fonts via a loopback-only static server; nothing leaves the machine.
 *
 * Default --out: C:\house\astro-samples\print-pack on Windows, else
 * ./out/sample-print-pack (both ignored by git).
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import {
  ROOT, loadEngines, buildChart, natalWheelSvg, fmt, esc, PGL, PNAME, parseArgs,
} from './fulfil-shared.mjs';

const ALLOWED_FLAGS = new Set(['out', 'browser', 'quiet']);

// Fictional adult sample. 14 March 1990 06:30 in London was GMT (BST began
// 25 March 1990), so clock time equals Universal Time; no conversion needed.
export const SAMPLE = Object.freeze({
  name: 'Sample Chart',
  date: '14 March 1990',
  time: '06:30 GMT',
  place: 'London, UK',
  y: 1990, mo: 3, d: 14, h: 6, mi: 30,
  lat: 51.5074, lon: -0.1278,
  house: 'placidus',
  fictional: true,
});

export const SAMPLE_LABEL = 'SAMPLE · FICTIONAL CHART · NOT FOR SALE';

/** File list mirrors tools/package-studio-order.mjs PRINT_PACK so the sample proves the real shape. */
export const PACK_FILES = Object.freeze([
  { file: 'natal-sky-home-print-a3.pdf', kind: 'pdf', mm: [297, 420], layout: 'print' },
  { file: 'natal-sky-home-print-a4.pdf', kind: 'pdf', mm: [210, 297], layout: 'print', light: true },
  { file: '01-natal-print-4960x7016.png', kind: 'png', px: [4960, 7016], layout: 'print' },
  { file: '02-natal-square-2160x2160.png', kind: 'png', px: [2160, 2160], layout: 'square' },
  { file: '03-natal-story-2160x3840.png', kind: 'png', px: [2160, 3840], layout: 'story' },
  { file: '04-phone-wallpaper-1080x1920.png', kind: 'png', px: [1080, 1920], layout: 'wallpaper' },
  { file: '05-big-three-1080x1080.png', kind: 'png', px: [1080, 1080], layout: 'bigthree' },
]);
export const TEXT_FILES = Object.freeze(['PRINT-GUIDE.txt', 'SAMPLE-README.txt', 'sample-manifest.json']);

export function defaultSampleOut() {
  return process.platform === 'win32'
    ? 'C:\\house\\astro-samples\\print-pack'
    : join(ROOT, 'out', 'sample-print-pack');
}

const BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northNode'];
const ASPECTS = [['Conjunction', 0, 7], ['Opposition', 180, 7], ['Trine', 120, 6], ['Square', 90, 6], ['Sextile', 60, 4]];

function computeAspects(pos) {
  const keys = BODIES.filter((b) => b !== 'northNode');
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      let d = Math.abs(pos[keys[i]].lon - pos[keys[j]].lon);
      if (d > 180) d = 360 - d;
      for (const [type, ang, orb] of ASPECTS) {
        const o = Math.abs(d - ang);
        if (o <= orb) { out.push({ a: keys[i], b: keys[j], type, orb: o }); break; }
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// ── plate HTML ────────────────────────────────────────────────────────────────
// One template, five layouts. All sizes scale from S = W / 1000 so the same
// design holds from a 1080 px phone plate to the 4960 px print plate.
function plateHtml({ W, H, layout, light = false, chart, pageMm = null }) {
  const { order: O, pos, asc, mc, houses } = chart;
  const S = W / 1000;
  const px = (n) => `${(n * S).toFixed(2)}px`;
  const aspects = computeAspects(pos);
  const wheelPx = Math.round(W * ({ print: 0.74, square: 0.58, story: 0.82, wallpaper: 0.84, bigthree: 0.40 }[layout]));
  const wheel = natalWheelSvg({ size: wheelPx, asc, houses, pos, aspects, mc, bodies: BODIES, idPrefix: `sp-${layout}` });

  const ink = light
    ? { bg: '#ECE6D8', bg2: '#E2DAC8', text: '#2A2418', soft: '#5E5748', gold: '#8A6D1F', hi: '#6B5416', rule: 'rgba(138,109,31,.3)', wm: 'rgba(138,109,31,.09)' }
    : { bg: '#070608', bg2: '#0F0B07', text: '#EFE3C0', soft: '#A89E88', gold: '#C9A227', hi: '#E8C872', rule: 'rgba(201,162,39,.2)', wm: 'rgba(201,162,39,.07)' };

  const big3 = `<div class="big3">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun</div><div class="v">${esc(fmt(pos.sun.lon))}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon</div><div class="v">${esc(fmt(pos.moon.lon))}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising</div><div class="v">${esc(fmt(asc))}</div></div>
  </div>`;
  const placements = `<div class="placements">
    ${BODIES.map((k) => `<div class="pl"><span class="g">${PGL[k]}</span><span class="n">${PNAME[k]}</span><span class="v">${esc(fmt(pos[k].lon))}${pos[k].retro ? ' <span class="r">℞</span>' : ''}</span></div>`).join('')}
    <div class="pl"><span class="g">↑</span><span class="n">Ascendant</span><span class="v">${esc(fmt(asc))}</span></div>
    <div class="pl"><span class="g">MC</span><span class="n">Midheaven</span><span class="v">${esc(fmt(mc))}</span></div>
  </div>`;
  const banner = `<div class="banner">${esc(SAMPLE_LABEL)}</div>`;
  const meta = `<p class="meta">${esc(O.date)} &nbsp;·&nbsp; ${esc(O.time)} &nbsp;·&nbsp; ${esc(O.place)}</p>`;
  const title = (size) => `<p class="eyebrow">The natal sky of</p><h1 style="font-size:${px(size)}">${esc(O.name)}</h1>`;
  const foot = `<p class="foot">Fictional sample — not a real person. Positions computed with the VSOP87 / ELP2000 series, Placidus houses. Astrology is offered for reflection and entertainment, not as prediction or diagnosis. AstroPrecise</p>`;

  const body = {
    print: `${banner}${title(54)}${meta}<div class="wheel">${wheel}</div>${big3}${placements}${foot}`,
    square: `${banner}${title(40)}<div class="wheel">${wheel}</div>${big3}${foot}`,
    story: `${banner}${title(46)}${meta}<div class="wheel">${wheel}</div>${big3}${foot}`,
    wallpaper: `${banner}<div class="spacer"></div><div class="wheel">${wheel}</div>${title(36)}${big3}${foot}`,
    bigthree: `${banner}${title(40)}${meta}<div class="wheel">${wheel}</div>${big3}${foot}`,
  }[layout];

  const pageCss = pageMm
    ? `@page{size:${pageMm[0]}mm ${pageMm[1]}mm;margin:0;} html,body{width:${pageMm[0]}mm;height:${pageMm[1]}mm;}`
    : `html,body{width:${W}px;height:${H}px;}`;
  const pad = { print: 60, square: 36, story: 60, wallpaper: 40, bigthree: 36 }[layout];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(SAMPLE_LABEL)}</title>
<link rel="stylesheet" href="/css/fonts.css">
<style>
${pageCss}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{overflow:hidden;background:${ink.bg};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:'Cormorant Garamond',Georgia,serif;color:${ink.text};position:relative;text-align:center;
  padding:${px(pad)} ${px(pad)};display:flex;flex-direction:column;align-items:center;justify-content:${layout === 'print' ? 'space-between' : 'center'};
  background:radial-gradient(ellipse 120% 80% at 50% 0%,${ink.bg2} 0%,${ink.bg} 60%,${ink.bg} 100%);}
.banner{font-family:'Cinzel',serif;font-size:${px(13)};letter-spacing:.3em;color:${light ? '#7A2E2E' : '#F0A878'};border:1px solid currentColor;padding:${px(6)} ${px(14)};margin-bottom:${px(14)};}
.eyebrow{font-family:'Cinzel',serif;font-size:${px(12)};letter-spacing:.34em;text-transform:uppercase;color:${ink.gold};opacity:.9;}
h1{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.1em;color:${ink.text};line-height:1.15;margin:${px(4)} 0;}
.meta{font-family:'Cinzel',serif;font-size:${px(13)};letter-spacing:.2em;color:${ink.soft};margin-top:${px(6)};line-height:2;}
.wheel{display:flex;justify-content:center;margin:${px(10)} 0;}
.wheel svg{width:${wheelPx}px;height:${wheelPx}px;display:block;}
.spacer{flex:0 0 ${px(120)};}
.big3{display:flex;gap:${px(14)};margin:${px(10)} 0;width:100%;max-width:${px(760)};}
.big3 .b{flex:1;border:1px solid ${ink.rule};border-radius:${px(10)};padding:${px(14)};background:linear-gradient(160deg,${light ? 'rgba(138,109,31,.08)' : 'rgba(201,162,39,.06)'},transparent);}
.big3 .g{font-size:${px(34)};color:${ink.hi};font-family:'AstroGlyph','Noto Sans Symbols 2',serif;line-height:1.1;}
.big3 .lbl{font-family:'Cinzel',serif;font-size:${px(10)};letter-spacing:.18em;text-transform:uppercase;color:${ink.soft};margin-top:${px(4)};}
.big3 .v{font-size:${px(17)};color:${ink.text};margin-top:${px(3)};font-variant-numeric:tabular-nums;}
.placements{display:grid;grid-template-columns:repeat(3,1fr);gap:${px(4)} ${px(18)};width:100%;max-width:${px(860)};margin-top:${px(8)};}
.pl{display:flex;align-items:baseline;gap:${px(8)};font-size:${px(16)};border-bottom:1px solid ${ink.rule};padding:${px(4)} 0;text-align:left;}
.pl .g{font-size:${px(19)};color:${ink.hi};font-family:'AstroGlyph','Noto Sans Symbols 2',serif;width:${px(26)};}
.pl .n{font-family:'Cinzel',serif;font-size:${px(10.5)};letter-spacing:.06em;text-transform:uppercase;color:${ink.soft};width:${px(92)};}
.pl .v{color:${ink.text};font-variant-numeric:tabular-nums;}
.pl .r{color:#b06a6a;font-size:${px(11)};}
.foot{font-size:${px(11.5)};line-height:1.5;color:${ink.soft};max-width:${px(820)};margin-top:${px(12)};font-style:italic;}
.wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Cinzel',serif;font-size:${px(150)};letter-spacing:.2em;color:${ink.wm};white-space:nowrap;pointer-events:none;z-index:2;}
</style></head><body>${body}<div class="wm">SAMPLE</div></body></html>`;
}

// ── loopback font server (serves website/ read-only on 127.0.0.1) ────────────
const TYPES = { '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8' };
function startServer() {
  const root = join(ROOT, 'website');
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const file = resolve(root, '.' + url.pathname);
    if (!file.startsWith(root) || !TYPES[extname(file)] || !existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function launchBrowser(pref) {
  const tries = pref ? [pref] : ['chrome', 'msedge', 'chromium'];
  const errors = [];
  for (const channel of tries) {
    try {
      return await chromium.launch(channel === 'chromium' ? { headless: true } : { channel, headless: true });
    } catch (e) { errors.push(`${channel}: ${String(e.message).split('\n')[0]}`); }
  }
  throw new Error(`No local Chromium-based browser could be launched (offline render needs one):\n  ${errors.join('\n  ')}`);
}

// ── checks ────────────────────────────────────────────────────────────────────
export async function inspectPng(path) {
  const meta = await sharp(path).metadata();
  const stats = await sharp(path).stats();
  const spread = Math.max(...stats.channels.map((c) => c.stdev));
  return { width: meta.width, height: meta.height, spread: Number(spread.toFixed(1)) };
}

export async function inspectPdf(path) {
  const doc = await PDFDocument.load(readFileSync(path), { updateMetadata: false });
  const pages = doc.getPages();
  const mm = pages.map((p) => { const { width, height } = p.getSize(); return [width, height].map((v) => Number((v / 72 * 25.4).toFixed(1))); });
  // Chromium embeds system fonts as TrueType subsets (FontFile2) but writes the
  // OFL web fonts (Cinzel, Cormorant Garamond) as Type3 fonts: vector glyph
  // outlines stored in the PDF itself. Both are self-contained; a font that is
  // referenced by name only (no FontFile*, not Type3) would be "not embedded".
  const embedded = [];
  let type3 = 0;
  let notEmbedded = 0;
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict)) continue;
    const type = obj.get(PDFName.of('Type'))?.toString();
    const subtype = obj.get(PDFName.of('Subtype'))?.toString();
    if (type === '/Font' && subtype === '/Type3') { type3++; continue; }
    if (type === '/Font' && (subtype === '/TrueType' || subtype === '/Type1' || subtype === '/MMType1')) {
      const fd = obj.get(PDFName.of('FontDescriptor'));
      const desc = fd ? doc.context.lookup(fd) : null;
      if (!(desc instanceof PDFDict) || !['FontFile', 'FontFile2', 'FontFile3'].some((k) => desc.has(PDFName.of(k)))) notEmbedded++;
    }
    if (type === '/Font' && subtype === '/Type0') {
      const kids = doc.context.lookup(obj.get(PDFName.of('DescendantFonts')));
      const cid = kids ? doc.context.lookup(kids.get(0)) : null;
      const desc = cid instanceof PDFDict ? doc.context.lookup(cid.get(PDFName.of('FontDescriptor'))) : null;
      if (!(desc instanceof PDFDict) || !['FontFile', 'FontFile2', 'FontFile3'].some((k) => desc.has(PDFName.of(k)))) notEmbedded++;
    }
    for (const key of ['FontFile', 'FontFile2', 'FontFile3']) {
      if (obj.has(PDFName.of(key))) {
        const name = obj.get(PDFName.of('FontName'));
        embedded.push(String(name ? name.toString().replace(/^\//, '') : key));
      }
    }
  }
  return { pages: pages.length, pageMm: mm, fontsEmbedded: embedded.length, type3Fonts: type3, fontsNotEmbedded: notEmbedded, fontNames: [...new Set(embedded)] };
}

// ── main ──────────────────────────────────────────────────────────────────────
export async function generateSamplePack({ out = defaultSampleOut(), browser: pref, quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);
  const outDir = resolve(out);
  mkdirSync(join(outDir, 'preview'), { recursive: true });

  const { E } = loadEngines();
  const chart = buildChart({ ...SAMPLE }, E);
  const { pos, asc, mc } = chart;
  log(`${SAMPLE.name} (fictional) — Sun ${fmt(pos.sun.lon)} | Moon ${fmt(pos.moon.lon)} | ASC ${fmt(asc)} | MC ${fmt(mc)}`);

  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browserInst = await launchBrowser(pref);
  const results = [];
  try {
    for (const spec of PACK_FILES) {
      const target = join(outDir, spec.file);
      const isPdf = spec.kind === 'pdf';
      const W = isPdf ? spec.mm[0] / 25.4 * 96 : spec.px[0];
      const H = isPdf ? spec.mm[1] / 25.4 * 96 : spec.px[1];
      const html = plateHtml({ W, H, layout: spec.layout, light: !!spec.light, chart, pageMm: isPdf ? spec.mm : null });
      const context = await browserInst.newContext({ viewport: { width: Math.round(W), height: Math.round(H) }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.route(`${origin}/plate/*`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
      await page.goto(`${origin}/plate/${spec.layout}.html`, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await Promise.all(["20px 'AstroGlyph'", "600 20px 'Cinzel'", "400 20px 'Cormorant Garamond'"].map((f) => document.fonts.load(f)));
        await document.fonts.ready;
      });
      const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family));
      for (const fam of ['AstroGlyph', 'Cinzel', 'Cormorant Garamond']) {
        if (!loaded.includes(fam)) throw new Error(`${spec.file}: font ${fam} did not load (glyphs would render as tofu)`);
      }
      if (isPdf) {
        await page.emulateMedia({ media: 'print' });
        await page.pdf({ path: target, printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
      } else {
        await page.screenshot({ path: target, type: 'png', fullPage: false });
      }
      await context.close();

      const bytes = statSync(target).size;
      const row = { file: spec.file, bytes };
      if (isPdf) {
        const info = await inspectPdf(target);
        Object.assign(row, info);
        const [w, h] = info.pageMm[0];
        if (info.pages !== 1 || Math.abs(w - spec.mm[0]) > 0.5 || Math.abs(h - spec.mm[1]) > 0.5) throw new Error(`${spec.file}: expected 1 page ${spec.mm.join('x')} mm, got ${info.pages} page(s) ${info.pageMm.map((p) => p.join('x')).join(',')}`);
        if (info.fontsEmbedded === 0 || info.fontsNotEmbedded > 0) throw new Error(`${spec.file}: fonts not self-contained (embedded ${info.fontsEmbedded}, type3 ${info.type3Fonts}, not embedded ${info.fontsNotEmbedded})`);
        // Preview: rasterise page 1 by re-screenshotting the same plate small.
        const pv = await browserInst.newPage({ viewport: { width: 420, height: Math.round(420 * spec.mm[1] / spec.mm[0]) } });
        await pv.route(`${origin}/plate/*`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: plateHtml({ W: 420, H: 420 * spec.mm[1] / spec.mm[0], layout: spec.layout, light: !!spec.light, chart }) }));
        await pv.goto(`${origin}/plate/${spec.layout}-pv.html`, { waitUntil: 'load' });
        await pv.evaluate(() => document.fonts.ready);
        await pv.screenshot({ path: join(outDir, 'preview', spec.file.replace(/\.pdf$/, '-preview.png')), type: 'png' });
        await pv.close();
      } else {
        const info = await inspectPng(target);
        Object.assign(row, info);
        if (info.width !== spec.px[0] || info.height !== spec.px[1]) throw new Error(`${spec.file}: expected ${spec.px.join('x')}, got ${info.width}x${info.height}`);
        if (info.spread < 8) throw new Error(`${spec.file}: image looks blank (channel stdev ${info.spread})`);
        await sharp(target).resize({ width: 420 }).png().toFile(join(outDir, 'preview', spec.file.replace(/\.png$/, '-preview.png')));
      }
      results.push(row);
      log(`written: ${spec.file} (${(bytes / 1024).toFixed(0)} KB${row.width ? `, ${row.width}x${row.height}` : `, ${row.pageMm[0].join('x')} mm, fonts: ${row.fontsEmbedded} embedded subsets + ${row.type3Fonts} Type3 outline fonts, ${row.fontsNotEmbedded} not embedded`})`);
    }
  } finally {
    await browserInst.close();
    server.close();
  }

  const positions = Object.fromEntries(BODIES.map((k) => [k, { lon: Number(pos[k].lon.toFixed(4)), sign: pos[k].sign, label: fmt(pos[k].lon), house: pos[k].house, retro: !!pos[k].retro }]));
  const manifest = {
    schema: 'astroprecise-sample-print-pack-v1',
    sample: true,
    notForSale: true,
    label: SAMPLE_LABEL,
    generatedAt: new Date().toISOString(),
    input: SAMPLE,
    engine: 'VSOP87/ELP2000 (website/js/ephemeris.js), Placidus houses',
    chart: { ascendant: { lon: Number(asc.toFixed(4)), label: fmt(asc) }, midheaven: { lon: Number(mc.toFixed(4)), label: fmt(mc) }, positions },
    files: results,
    licences: 'See LICENCES.md at the repository root.',
  };
  writeFileSync(join(outDir, 'sample-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(outDir, 'PRINT-GUIDE.txt'), PRINT_GUIDE);
  writeFileSync(join(outDir, 'SAMPLE-README.txt'), SAMPLE_README);
  log(`sample pack: ${outDir}`);
  return { outDir, manifest };
}

const PRINT_GUIDE = `ASTROPRECISE · NATAL SKY PRINT PACK · HOME-PRINT GUIDE (SAMPLE)

This folder is a SAMPLE on a fictional chart. It is not for sale and not a real person's sky.

1. A3 PDF (297 x 420 mm): RGB home-print plate, dark on dark. No bleed and no commercial CMYK profile is claimed.
2. A4 PDF (210 x 297 mm): ink-light version on a parchment ground for everyday home printers.
3. Print at actual size only if your printer can image the full page; otherwise choose "fit to printable area".
4. For the dark A3 plate use heavyweight matte paper and the printer's high-quality setting.
5. 01-natal-print-4960x7016.png is the high-resolution plate for a print shop (A4 proportion, 600 dpi at A4, 420 dpi at A3).
6. 02 square, 03 story and 04 wallpaper are screen plates; 05 is the Big Three card.
7. Positions are computed from the recorded birth moment with the VSOP87 / ELP2000 series and Placidus houses. Astrology here is symbolic, for reflection and entertainment; it does not predict events or diagnose anyone.

Fonts, engine, star data and texture licences are listed in LICENCES.md at the repository root.
`;

const SAMPLE_README = `ASTROPRECISE · NATAL SKY PRINT PACK · SAMPLE

Generated locally by tools/sample-print-pack.mjs on a FICTIONAL chart ("Sample Chart", 14 March 1990, 06:30 GMT, London).
Every plate carries the label "${SAMPLE_LABEL}". Nothing in this folder was ordered, paid for or sent to anyone.

The generator has no order input and no --final mode, so it cannot be used to fulfil a real order.
Real orders stay behind tools/fulfil-order.mjs, which refuses to produce final output without payment evidence.

sample-manifest.json lists every file with its measured size, pixel dimensions or page size, and the computed chart positions.
preview/ holds small previews for a quick visual check. PNG previews are downscaled from the real files; the two PDF previews are small re-renders of the same plate, not rasterised PDF pages.
Licences for fonts, engine, star data and textures: LICENCES.md at the repository root.
`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const A = parseArgs(process.argv.slice(2));
  const bad = Object.keys(A).filter((k) => k !== '_' && !ALLOWED_FLAGS.has(k));
  if (bad.length || A._.length) {
    console.error(`sample-print-pack: unsupported argument(s) ${[...bad, ...A._].join(', ')}. This tool only renders the fictional sample; it takes --out, --browser and --quiet.`);
    process.exit(2);
  }
  generateSamplePack({ out: typeof A.out === 'string' ? A.out : undefined, browser: typeof A.browser === 'string' ? A.browser : undefined, quiet: !!A.quiet })
    .catch((e) => { console.error('sample-print-pack failed:', e.message); process.exit(1); });
}
