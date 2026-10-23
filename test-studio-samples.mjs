// 2C step 8: the three public Studio sample PDFs (website/downloads/studio) are the
// light specimen design, rendered by tools/make-studio-samples.mjs with the static
// print fonts. Checks the committed files only (no browser): page count and size,
// Author/Title/Creator, every font embedded from tools/print-fonts, no Type3, no
// file:// links, fictional people only, and the Whole Sky preview's copy.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import { inspectPdf } from './tools/sample-print-pack.mjs';
import { STUDIO_SAMPLES, STUDIO_RELEASE } from './tools/make-studio-samples.mjs';

let fails = 0;
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) fails++; };
const DIR = join('website', 'downloads', 'studio');
const SIZE = { A3: [297, 420], A4: [210, 297] };
const PRINT_FONT = /^(InterPrint|InstrumentSerifPrint|APSymbolsPrint[A-Za-z]*)-/;

function streamsText(buf) {
  const raw = buf.toString('latin1');
  let out = raw;
  const re = /stream\r?\n/g; let m;
  while ((m = re.exec(raw))) {
    const end = raw.indexOf('endstream', m.index);
    if (end < 0) break;
    try { out += inflateSync(Buffer.from(raw.slice(m.index + m[0].length, end), 'latin1')).toString('latin1'); } catch { /* not flate */ }
  }
  return out;
}

for (const spec of STUDIO_SAMPLES) {
  const file = join(DIR, spec.file);
  const buf = readFileSync(file);
  const info = await inspectPdf(file);
  const doc = await PDFDocument.load(buf, { updateMetadata: false });
  ok(`${spec.file}: ${spec.pages} page(s)`, info.pages === spec.pages);
  const [w, h] = SIZE[spec.size];
  ok(`${spec.file}: every page ${spec.size}`, info.pageMm.every(([pw, ph]) => Math.abs(pw - w) <= 0.6 && Math.abs(ph - h) <= 0.6));
  ok(`${spec.file}: Author AstroPrecise`, doc.getAuthor() === 'AstroPrecise');
  ok(`${spec.file}: title kept`, doc.getTitle() === spec.title);
  ok(`${spec.file}: subject kept`, doc.getSubject() === spec.subject);
  ok(`${spec.file}: Creator AstroPrecise Studio ${STUDIO_RELEASE}`, doc.getCreator() === `AstroPrecise Studio ${STUDIO_RELEASE}`);
  ok(`${spec.file}: no Type3 fonts`, info.type3Fonts === 0);
  ok(`${spec.file}: every font embedded`, info.fontsEmbedded > 0 && info.fontsNotEmbedded === 0);
  const names = info.fontNames.map((n) => n.replace(/^[A-Z]{6}\+/, ''));
  ok(`${spec.file}: only tools/print-fonts faces (${names.join(', ')})`, names.every((n) => PRINT_FONT.test(n)));
  const text = streamsText(buf);
  ok(`${spec.file}: no file:// links`, !/file:\/\//i.test(text));
  ok(`${spec.file}: no old dark fonts (Cinzel/Cormorant)`, !/Cinzel|Cormorant/.test(text));
}

// Text checks via pdftotext-free route: the Whole Sky copy is set in the HTML the tool renders.
const { wholeSkyHtml } = await import('./tools/make-studio-samples.mjs');
const html = wholeSkyHtml({ cover: '', inner: '', plate: '', still: '' });
for (const line of [
  'A complete personal sky.', 'One chart, two ways to keep it.', 'The authored whole-system view.', 'Everything in one private delivery.',
  'Aurora Vale / fictional fixture / self commission', 'Every preview is visibly marked FICTIONAL SAMPLE and contains no customer data.',
  'One 4800 x 3600 SCHEMATIC PNG from the recorded birth hour.', 'This public document is a fictional preview, not a purchased file and not a promise of predictive outcomes.',
]) ok(`whole-sky keeps: ${line}`, html.includes(line));
ok('whole-sky: every figure carries a FICTIONAL SAMPLE tag', (html.match(/<figure/g) || []).length === (html.match(/class="tag">FICTIONAL SAMPLE</g) || []).length);

// The Whole Sky still is sold as 4800 x 3600; its preview embeds a downscale of that
// true render, so the embedded still keeps the product's 4:3 shape (not the old wide crop).
{
  const { STILL_PREVIEW_WIDTH } = await import('./tools/make-studio-samples.mjs');
  const raw = readFileSync(join(DIR, 'whole-sky-edition-sample.pdf')).toString('latin1');
  const images = [...raw.matchAll(/\/Subtype\s*\/Image\b[^>]*?>>/g)].map((m) => {
    const w = m[0].match(/\/Width\s+(\d+)/); const h = m[0].match(/\/Height\s+(\d+)/);
    return w && h ? [+w[1], +h[1]] : null;
  }).filter(Boolean);
  ok(`whole-sky: embeds the still as a 4:3 ${STILL_PREVIEW_WIDTH}x${STILL_PREVIEW_WIDTH * 3 / 4} downscale of the 4800x3600 render (${images.map((d) => d.join('x')).join(', ')})`,
    images.some(([w, h]) => w === STILL_PREVIEW_WIDTH && h === STILL_PREVIEW_WIDTH * 3 / 4));
  ok('whole-sky: no wide (non-4:3) Observatory still left in the preview', !images.some(([w, h]) => w === STILL_PREVIEW_WIDTH && h !== STILL_PREVIEW_WIDTH * 3 / 4));
}

console.log(fails ? `\n${fails} check(s) failed` : '\nall studio sample checks passed');
process.exit(fails ? 1 : 0);
