#!/usr/bin/env node
/**
 * make-studio-samples.mjs — rebuilds the three PUBLIC sample PDFs the shop links to
 * (website/downloads/studio/) in the Paper & Night "light specimen" look, so the
 * shop image and the PDF agree (2C step 8).
 *
 *   natal-sky-print-pack-sample.pdf   1 page A3: the Minute Plate print plate for
 *                                      the fictional Imogen Hale (same plate as
 *                                      tools/sample-print-pack.mjs writes).
 *   personal-sky-keepsake-sample.pdf  20 pages A4: website/sample-reading.html (the
 *                                      fictional Aurora Vale keepsake) printed with
 *                                      the static print fonts.
 *   whole-sky-edition-sample.pdf      4 pages A4: the Whole Sky preview for Aurora
 *                                      Vale: keepsake excerpts, her Minute Plate and
 *                                      a birth-hour still captured from the real
 *                                      Observatory engine (SCHEMATIC stamp).
 *
 * Every person here is fictional. No order input, no payment path, no network
 * beyond a loopback server of website/. Fonts come from tools/print-fonts (static
 * TrueType, embedded as CIDFontType2) so no PDF carries a Type3 font. Metadata is
 * set with pdf-lib: Author AstroPrecise, Creator/Producer "AstroPrecise Studio v945".
 *
 *   node tools/make-studio-samples.mjs [--out website/downloads/studio] [--check]
 *   --check renders to a temp folder and only reports (does not touch website/).
 */
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { ROOT, loadEngines, buildChart, fmt, esc, parseArgs, printFontCss, printSymbolCss, PRINT_FONTS_DIR } from './fulfil-shared.mjs';
import { generateSamplePack, plateHtml, inspectPdf, SAMPLE_LABEL } from './sample-print-pack.mjs';
import { helioLongitudes, loadStills, PAPER_NIGHT as C } from './minute-plate.mjs';
import { launchStillBrowser, renderObservatoryStill, STILL_WIDTH, STILL_HEIGHT } from './observatory-still.mjs';

export const STUDIO_RELEASE = 'v945';
/** Whole Sky PDF embeds the 4800 x 3600 still downscaled to this width, still 4:3. */
export const STILL_PREVIEW_WIDTH = 1800;
const FIXED_DATE = new Date('2026-10-23T00:00:00Z'); // stable metadata dates, no build-time churn

// Fictional fixture used across the Studio previews (tools/generate-couples.mjs,
// test-reading-no-repeat.mjs). 03:42 BST = 02:42 UT.
export const AURORA = Object.freeze({
  name: 'Aurora Vale', date: '14 June 1990', time: '03:42 BST', place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 2, mi: 42, lat: 54.486, lon: -0.613, house: 'placidus', fictional: true,
  // Stated in UT: 03:42 BST in Whitby is 02:42 UT. An order typed as 03:42 local with
  // zone Europe/London converts to exactly this (test-order-birth-ut.mjs).
  timeBasis: 'ut', tz: 'Europe/London', utc: '1990-06-14T02:42Z',
  local: Object.freeze({ date: '1990-06-14', time: '03:42', tz: 'Europe/London', offsetMinutes: 60 }),
});

export const STUDIO_SAMPLES = Object.freeze([
  { file: 'natal-sky-print-pack-sample.pdf', pages: 1, size: 'A3', title: 'Natal Sky home-print A3 plate', subject: 'RGB A3 home-print natal chart plate; no bleed or commercial press colour profile is claimed.' },
  { file: 'personal-sky-keepsake-sample.pdf', pages: 20, size: 'A4', title: 'Personal Sky Keepsake - screen edition', subject: 'Computed natal positions with traditional astrological interpretation for reflection and entertainment.' },
  { file: 'whole-sky-edition-sample.pdf', pages: 4, size: 'A4', title: 'Whole Sky Edition - fictional sample', subject: 'Four-page fictional preview of the self-commission Whole Sky Edition.' },
]);
const PAGE_MM = { A3: [297, 420], A4: [210, 297] };

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.bin': 'application/octet-stream',
};
export function startServer() {
  const root = join(ROOT, 'website');
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file.endsWith('/')) file += 'index.html';
    if (!file.startsWith(root) || !existsSync(file) || !TYPES[extname(file)]) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// Print-only CSS: static faces, symbol subsets for the AstroGlyph spans, Latin for
// the letters AstroGlyph lacks ("MC"), and no synthesised bold/italic (Type3).
export function keepsakePrintCss() {
  const inter = readFileSync(join(PRINT_FONTS_DIR, 'inter-static-400.ttf')).toString('base64');
  return printFontCss() + printSymbolCss([{ family: 'AstroGlyph' }]) +
    `@font-face{font-family:'AstroGlyph';font-weight:400;src:url(data:font/truetype;base64,${inter}) format('truetype');unicode-range:U+0020-007E;}` +
    '*{font-synthesis:none!important}';
}

async function setMeta(src, dest, spec) {
  const doc = await PDFDocument.load(readFileSync(src), { updateMetadata: false });
  doc.setTitle(spec.title, { showInWindowTitleBar: true });
  doc.setSubject(spec.subject);
  doc.setAuthor('AstroPrecise');
  doc.setCreator(`AstroPrecise Studio ${STUDIO_RELEASE}`);
  doc.setProducer(`AstroPrecise Studio ${STUDIO_RELEASE} (Chromium print, pdf-lib)`);
  doc.setKeywords(['AstroPrecise', 'fictional sample', 'not a customer file']);
  doc.setLanguage('en-GB');
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  writeFileSync(dest, await doc.save({ useObjectStreams: false }));
}

async function checkPdf(path, spec) {
  const info = await inspectPdf(path);
  const [w, h] = PAGE_MM[spec.size];
  const problems = [];
  if (info.pages !== spec.pages) problems.push(`expected ${spec.pages} page(s), got ${info.pages}`);
  if (info.pageMm.some(([pw, ph]) => Math.abs(pw - w) > 0.6 || Math.abs(ph - h) > 0.6)) problems.push(`page size not ${spec.size}: ${[...new Set(info.pageMm.map((p) => p.join('x')))].join(', ')}`);
  if (info.type3Fonts) problems.push(`${info.type3Fonts} Type3 font(s)`);
  if (info.fontsNotEmbedded) problems.push(`${info.fontsNotEmbedded} font(s) not embedded`);
  if (!info.fontsEmbedded) problems.push('no embedded fonts');
  const stray = info.fontNames.map((n) => n.replace(/^[A-Z]{6}\+/, '')).filter((n) => !/^(InterPrint|InstrumentSerifPrint|APSymbolsPrint[A-Za-z]*)-/.test(n));
  if (stray.length) problems.push(`fonts outside tools/print-fonts: ${stray.join(', ')}`);
  const doc = await PDFDocument.load(readFileSync(path), { updateMetadata: false });
  if (doc.getAuthor() !== 'AstroPrecise') problems.push(`Author is ${doc.getAuthor()}`);
  if (problems.length) throw new Error(`${spec.file}: ${problems.join('; ')}`);
  return { ...info, title: doc.getTitle(), author: doc.getAuthor(), creator: doc.getCreator() };
}

// Data-URL faces load lazily; load every face up front (the site's own woff2 faces
// are blocked and settle as errors) so layout never paints with a system fallback.
async function fontsReady(page) {
  await page.evaluate(async () => {
    await Promise.allSettled([...document.fonts].map((f) => f.load()));
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

async function renderKeepsake(browser, origin, dest) {
  const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.route(/\.woff2(\?|$)/, (r) => r.abort()); // only the inlined static faces may draw text
  await page.goto(`${origin}/sample-reading.html?nosw=1`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: keepsakePrintCss() });
  await page.emulateMedia({ media: 'print' });
  await fontsReady(page);
  const pages = await page.locator('main .page').count();
  if (pages !== 20) throw new Error(`sample-reading.html has ${pages} .page sections, expected 20`);
  await page.pdf({ path: dest, printBackground: true, preferCSSPageSize: true });
  // Screen-size captures of two keepsake pages for the Whole Sky preview.
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 1000, height: 1300 });
  await page.addStyleTag({ content: 'main{padding:0!important;margin:0!important;width:210mm!important}.page{margin:0!important;box-shadow:none!important}' });
  const shot = async (i) => sharp(await page.locator('main .page').nth(i).screenshot({ type: 'png' })).resize({ width: 900 }).jpeg({ quality: 84 }).toBuffer();
  const cover = await shot(0);
  const inner = await shot(2);
  await ctx.close();
  return { cover, inner };
}

export async function renderAuroraPlate(browser, origin, E) {
  const chart = buildChart({ ...AURORA }, E);
  const extra = { helio: helioLongitudes(E, AURORA), stills: await loadStills(384) };
  const W = 1200, H = 1800;
  const html = plateHtml({ W, H, layout: 'print', light: true, chart, extra });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(`${origin}/plate/*`, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(`${origin}/plate/aurora.html`, { waitUntil: 'load' });
  await fontsReady(page);
  const png = await page.screenshot({ type: 'png' });
  await ctx.close();
  return { chart, png, jpg: await sharp(png).resize({ width: 1000 }).jpeg({ quality: 86 }).toBuffer() };
}

/**
 * Real Observatory engine, birth-hour still, stamped SCHEMATIC by the site's own Keep code.
 * Rendered at the product's fixed 4800 x 3600 (tools/observatory-still.mjs with its
 * default headless software renderer, the one real Whole Sky orders use) and size-checked; the PDF embeds a 4:3
 * 1800 x 1350 downscale of that true render, so the preview keeps the product's shape.
 */
export async function captureObservatoryStill(origin) {
  const browser = await launchStillBrowser();
  try {
    // +1 s keeps the stamped minute at 02:42 after float rounding of the JD.
    const detail = { jd: Date.UTC(AURORA.y, AURORA.mo - 1, AURORA.d, AURORA.h, AURORA.mi, 1) / 86400000 + 2440587.5, birthDate: '1990-06-14', birthTime: '03:42', timeKnown: true, timeAccuracy: 'exact', place: AURORA.place, timezone: 'Europe/London' };
    const still = await renderObservatoryStill(browser, origin, detail, { width: STILL_WIDTH, height: STILL_HEIGHT });
    if (still.width !== STILL_WIDTH || still.height !== STILL_HEIGHT) throw new Error(`Observatory still is ${still.width}x${still.height}, not ${STILL_WIDTH}x${STILL_HEIGHT}`);
    const jpg = await sharp(still.png).resize({ width: STILL_PREVIEW_WIDTH, height: STILL_PREVIEW_WIDTH * STILL_HEIGHT / STILL_WIDTH, fit: 'fill' }).jpeg({ quality: 86 }).toBuffer();
    return { w: still.width, h: still.height, renderMs: still.renderMs, png: still.png, jpg };
  } finally { await browser.close(); }
}

const uri = (buf, type = 'image/jpeg') => `data:${type};base64,${buf.toString('base64')}`;

export function wholeSkyHtml({ cover, inner, plate, still }) {
  const who = 'Aurora Vale / fictional fixture / self commission';
  const head = `<header class="hd"><span>ASTROPRECISE STUDIO</span><span class="mark">FICTIONAL SAMPLE</span></header>
<p class="kicker">WHOLE SKY EDITION / FICTIONAL SAMPLE</p>`;
  const foot = (n) => `<footer class="ft"><span>WHOLE SKY EDITION - FICTIONAL SAMPLE</span><span>${n}/4</span></footer>`;
  const fig = (src, label, cls = '') => `<figure class="${cls}"><div class="frame"><img src="${src}" alt=""><span class="tag">FICTIONAL SAMPLE</span></div><figcaption>${label}</figcaption></figure>`;
  const page = (n, eyebrow, title, body) => `<section class="pg">${head}<p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="who">${who}</p>${body}${foot(n)}</section>`;
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>Whole Sky Edition - fictional sample</title>
<style>${printFontCss()}
@page{size:210mm 297mm;margin:0}
*{margin:0;padding:0;box-sizing:border-box;font-synthesis:none}
html,body{background:${C.paper};-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'AP Sans';color:${C.ink};font-size:10pt;line-height:1.5}
.pg{width:210mm;height:297mm;padding:16mm 18mm 18mm;position:relative;overflow:hidden;break-after:page;background:${C.paper}}
.pg:last-child{break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:7.2pt;letter-spacing:.22em;color:${C.copperInk};border-bottom:1px solid ${C.rule};padding-bottom:4mm}
.mark{border:1px solid ${C.copper};padding:1.2mm 2.4mm;letter-spacing:.2em}
.kicker{margin-top:4mm;font-size:7pt;letter-spacing:.2em;color:${C.muted}}
.eyebrow{margin-top:12mm;font-weight:600;font-size:8pt;letter-spacing:.22em;color:${C.copperInk}}
h1{font-family:'AP Serif';font-weight:400;font-size:34pt;line-height:1.05;letter-spacing:-.01em;margin:3mm 0 2mm}
.who{font-size:8.6pt;letter-spacing:.06em;color:${C.graphite};margin-bottom:8mm}
figure{margin:0}
.frame{position:relative;background:${C.card};border:1px solid ${C.rule};padding:2.4mm}
.frame img{display:block;width:100%;height:auto}
.tag{position:absolute;right:4mm;top:4mm;background:${C.card};color:${C.copperInk};border:1px solid ${C.copper};font-weight:600;font-size:6pt;letter-spacing:.2em;padding:.8mm 1.8mm}
figcaption{margin-top:2.4mm;font-weight:600;font-size:7pt;letter-spacing:.2em;color:${C.muted}}
.row{display:grid;gap:6mm;align-items:start}
.two{grid-template-columns:1fr 1fr}
.wide{margin-top:6mm}
.dark .frame{background:${C.night};border-color:${C.night}}
h2{font-weight:600;font-size:8pt;letter-spacing:.22em;color:${C.copperInk};margin:8mm 0 3mm}
.points p{border-top:1px solid ${C.rule};padding:3mm 0;color:${C.graphite};font-size:10pt;max-width:150mm}
.lede{font-family:'AP Serif';font-size:13pt;line-height:1.4;color:${C.ink};max-width:150mm;margin-top:4mm}
.map{margin-top:2mm;border-top:1px solid ${C.ink}}
.map div{display:grid;grid-template-columns:16mm 1fr;gap:4mm;padding:5mm 0;border-bottom:1px solid ${C.rule}}
.map b{font-family:'AP Serif';font-weight:400;font-size:22pt;line-height:1;color:${C.copper}}
.map strong{display:block;font-family:'AP Serif';font-weight:400;font-size:15pt;line-height:1.2}
.map span{color:${C.graphite}}
.closing{margin-top:10mm;padding:5mm;background:${C.card};border:1px solid ${C.rule}}
.closing p:first-child{font-weight:600;font-size:7.4pt;letter-spacing:.2em;color:${C.copperInk};margin-bottom:2mm}
.ft{position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-size:6.8pt;letter-spacing:.18em;color:${C.muted};border-top:1px solid ${C.rule};padding-top:3mm;font-variant-numeric:tabular-nums}
.p1 .two .frame{height:98mm;display:flex;align-items:center;justify-content:center}
.p1 .two .frame img{width:auto;height:100%;max-width:100%;object-fit:contain}
.p1 .wide .frame{height:76mm;display:flex;align-items:center;justify-content:center}
.p1 .wide .frame img{width:auto;height:100%;max-width:100%}
.p2 .two .frame{height:120mm;display:flex;align-items:center;justify-content:center}
.p2 .two .frame img{width:auto;height:100%;max-width:100%;object-fit:contain}
</style></head><body>
${page(1, 'THE COMPLETE DIGITAL STUDIO EDITION', 'A complete personal sky.', `<div class="p1"><div class="row two">${fig(cover, 'READING')}${fig(plate, 'PRINT PACK')}</div>
<div class="wide dark">${fig(still, 'SCHEMATIC OBSERVATORY STILL / COMPUTED POSITIONS')}</div></div>`)}
${page(2, 'READING AND PRINT EXCERPTS', 'One chart, two ways to keep it.', `<div class="p2"><div class="row two">${fig(inner, 'READING')}${fig(plate, 'PRINT PACK')}</div></div>
<h2>WHAT THESE EXCERPTS PROVE</h2><div class="points">
<p>The 20-page keepsake translates computed chart positions into reflective language for entertainment and personal reflection.</p>
<p>The A3 and A4 print plates preserve the same chart wheel geometry. Layout finishing does not redraw a degree, house cusp or aspect.</p>
<p>Every preview is visibly marked FICTIONAL SAMPLE and contains no customer data.</p></div>`)}
${page(3, 'SCHEMATIC OBSERVATORY BIRTH-HOUR STILL', 'The authored whole-system view.', `<div class="dark">${fig(still, 'SCHEMATIC / NOT A PHOTOGRAPH')}</div>
<p class="lede">This still is captured from the real AstroPrecise Observatory engine at the recorded UTC birth moment. Planet positions are computed; distances, visible body sizes and the whole-system camera are compressed for clarity.</p>`)}
${page(4, 'DELIVERY MAP', 'Everything in one private delivery.', `<div class="map">
<div><b>01</b><p><strong>Personal Sky Keepsake</strong><span>20-page screen PDF and an ink-light print edition.</span></p></div>
<div><b>02</b><p><strong>Natal Sky Print Pack</strong><span>A3 and A4 PDFs plus five computed PNG layouts.</span></p></div>
<div><b>03</b><p><strong>Observatory still</strong><span>One 4800 x 3600 SCHEMATIC PNG from the recorded birth hour.</span></p></div>
<div><b>04</b><p><strong>Audited delivery</strong><span>Print guide, personal-use licence, credits and SHA-256 integrity manifest.</span></p></div></div>
<div class="closing"><p>PERSONALISED FOR THE CHART SUBJECT / DIGITAL FILES ONLY</p><p>This public document is a fictional preview, not a purchased file and not a promise of predictive outcomes.</p></div>`)}
</body></html>`;
}

export async function makeStudioSamples({ out = join(ROOT, 'website', 'downloads', 'studio'), quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);
  const outDir = resolve(out);
  mkdirSync(outDir, { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'ap-studio-samples-'));
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { E } = loadEngines();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    const [packSpec, keepSpec, wholeSpec] = STUDIO_SAMPLES;
    // 1. Print Pack: the A3 plate from the sample pack generator.
    await generateSamplePack({ out: join(tmp, 'pack'), quiet: true });
    await setMeta(join(tmp, 'pack', 'natal-sky-home-print-a3.pdf'), join(outDir, packSpec.file), packSpec);
    // 2. Keepsake: sample-reading.html printed with the static faces.
    const keep = await renderKeepsake(browser, origin, join(tmp, 'keepsake.pdf'));
    await setMeta(join(tmp, 'keepsake.pdf'), join(outDir, keepSpec.file), keepSpec);
    // 3. Whole Sky: Aurora's keepsake pages, her Minute Plate and her Observatory still.
    const plate = await renderAuroraPlate(browser, origin, E);
    log(`Aurora Vale (fictional) — Sun ${fmt(plate.chart.pos.sun.lon)} | Moon ${fmt(plate.chart.pos.moon.lon)} | ASC ${fmt(plate.chart.asc)}`);
    const still = await captureObservatoryStill(origin);
    log(`Observatory birth-hour still ${still.w}x${still.h} in ${still.renderMs} ms (webgl, SCHEMATIC stamp; PDF embeds ${STILL_PREVIEW_WIDTH}x${STILL_PREVIEW_WIDTH * STILL_HEIGHT / STILL_WIDTH})`);
    const html = wholeSkyHtml({ cover: uri(keep.cover), inner: uri(keep.inner), plate: uri(plate.jpg), still: uri(still.jpg) });
    const ctx = await browser.newContext({ viewport: { width: 794, height: 1123 } });
    const page = await ctx.newPage();
    await page.route(`${origin}/whole-sky/*`, (r) => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }));
    await page.goto(`${origin}/whole-sky/sample.html`, { waitUntil: 'load' });
    await fontsReady(page);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: join(tmp, 'whole.pdf'), printBackground: true, preferCSSPageSize: true });
    await ctx.close();
    await setMeta(join(tmp, 'whole.pdf'), join(outDir, wholeSpec.file), wholeSpec);
    for (const spec of STUDIO_SAMPLES) {
      const info = await checkPdf(join(outDir, spec.file), spec);
      results.push({ file: spec.file, ...info });
      log(`written: ${spec.file} — ${info.pages} page(s) ${spec.size}, ${info.fontsEmbedded} embedded fonts (${info.fontNames.map((n) => n.replace(/^[A-Z]{6}\+/, '')).join(', ')}), ${info.type3Fonts} Type3, ${info.fontsNotEmbedded} not embedded, Author ${info.author}`);
    }
  } finally {
    await browser.close();
    server.close();
    rmSync(tmp, { recursive: true, force: true });
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const A = parseArgs(process.argv.slice(2));
  const out = A.check ? mkdtempSync(join(tmpdir(), 'ap-studio-check-')) : (typeof A.out === 'string' ? A.out : undefined);
  makeStudioSamples({ out, quiet: !!A.quiet })
    .then(() => { if (A.check) console.log(`check render in ${out} (website/ untouched)`); })
    .catch((e) => { console.error('make-studio-samples failed:', e.message); process.exit(1); });
}
