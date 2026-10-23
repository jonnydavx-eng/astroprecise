/**
 * Natal Sky Print Pack — sample generation must work end to end, offline, on the
 * fictional chart only. Generates into a temp dir and checks the file list, PNG
 * pixel sizes, PDF page sizes and embedded fonts, the chart labels against an
 * independent engine call, the fictional labelling, and that the tool refuses
 * any order-like input. Needs a local Chrome/Edge/Chromium (no network).
 *
 *   npm run test:pack
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PACK_FILES, TEXT_FILES, SAMPLE, PLATE_GLYPHS, inspectPng, inspectPdf } from './tools/sample-print-pack.mjs';
import { loadEngines, SIGNS } from './tools/fulfil-shared.mjs';

let pass = 0;
const ok = async (name, fn) => { await fn(); pass++; console.log('  ok', name); };
const TOOL = 'tools/sample-print-pack.mjs';
const dir = mkdtempSync(join(tmpdir(), 'ap-sample-pack-'));

try {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, [TOOL, '--out', dir, '--quiet'], { encoding: 'utf8' });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  await ok(`generator exits 0 (${secs}s)`, () => assert.equal(run.status, 0, run.stderr || run.stdout));

  await ok('every pack file and text file exists', () => {
    for (const f of [...PACK_FILES.map((s) => s.file), ...TEXT_FILES]) assert.ok(existsSync(join(dir, f)), `missing ${f}`);
  });

  for (const spec of PACK_FILES.filter((s) => s.kind === 'png')) {
    await ok(`${spec.file} is ${spec.px.join('x')} and not blank`, async () => {
      const info = await inspectPng(join(dir, spec.file));
      assert.equal(info.width, spec.px[0]); assert.equal(info.height, spec.px[1]);
      assert.ok(info.spread > 8, `channel stdev ${info.spread}`);
    });
  }
  for (const spec of PACK_FILES.filter((s) => s.kind === 'pdf')) {
    await ok(`${spec.file} is one ${spec.mm.join('x')} mm page with embedded TrueType/CID fonts and no Type3`, async () => {
      const info = await inspectPdf(join(dir, spec.file));
      assert.equal(info.pages, 1);
      assert.ok(Math.abs(info.pageMm[0][0] - spec.mm[0]) <= 0.5 && Math.abs(info.pageMm[0][1] - spec.mm[1]) <= 0.5, `page ${info.pageMm[0].join('x')} mm`);
      assert.ok(info.fontsEmbedded > 0, 'no FontFile streams');
      assert.equal(info.fontsNotEmbedded, 0, 'a font is referenced by name only');
      // Static instances from tools/print-fonts must be what Chromium embeds. A
      // Type3 font dictionary means a variable WOFF2 got into the print path.
      assert.equal(info.type3Fonts, 0, `Type3 font dictionaries present: ${info.type3Fonts}`);
      for (const st of info.fontSubtypes) assert.ok(['TrueType', 'Type0', 'CIDFontType2'].includes(st), `unexpected font subtype ${st}`);
      // 2C step 8: the light Minute Plate sets text in the static AP faces; zodiac and
      // planet glyphs are drawn paths, so no symbol font is needed in the plate.
      assert.ok(info.fontNames.some((n) => /InterPrint/.test(n)), `Inter Print (AP Sans) not embedded: ${info.fontNames.join(', ')}`);
      assert.ok(info.fontNames.some((n) => /InstrumentSerifPrint/.test(n)), `Instrument Serif Print (AP Serif) not embedded: ${info.fontNames.join(', ')}`);
      assert.ok(info.fontNames.every((n) => /^([A-Z]{6}\+)?(InterPrint|InstrumentSerifPrint|APSymbolsPrint[A-Za-z]*)-/.test(n)), `font outside tools/print-fonts: ${info.fontNames.join(', ')}`);
    });
  }

  const manifest = JSON.parse(readFileSync(join(dir, 'sample-manifest.json'), 'utf8'));
  await ok('manifest is marked sample / not for sale and lists every file', () => {
    assert.equal(manifest.sample, true); assert.equal(manifest.notForSale, true);
    assert.deepEqual(manifest.files.map((f) => f.file), PACK_FILES.map((s) => s.file));
    assert.equal(manifest.input.name, SAMPLE.name); assert.equal(manifest.input.fictional, true);
  });

  await ok(`every plate passed the in-browser tofu check on ${PLATE_GLYPHS.length} glyphs`, () => {
    assert.ok(PLATE_GLYPHS.length >= 20, 'glyph list unexpectedly short');
    for (const f of manifest.files) assert.equal(f.glyphsChecked, PLATE_GLYPHS.length, f.file);
  });

  await ok('chart labels match an independent engine call for the sample moment', () => {
    const { E } = loadEngines();
    const c = E.calculateNatalChart(SAMPLE.y, SAMPLE.mo, SAMPLE.d, SAMPLE.h, SAMPLE.mi, SAMPLE.lat, SAMPLE.lon, SAMPLE.house);
    const signOf = (lon) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
    for (const k of ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
      assert.equal(manifest.chart.positions[k].sign, signOf(c.positions[k].longitude), k);
      assert.ok(Math.abs(manifest.chart.positions[k].lon - c.positions[k].longitude) < 0.001, `${k} longitude`);
      assert.ok(manifest.chart.positions[k].label.endsWith(signOf(c.positions[k].longitude)), `${k} label`);
    }
    assert.equal(signOf(manifest.chart.ascendant.lon), signOf(c.ascendant));
    assert.equal(signOf(manifest.chart.midheaven.lon), signOf(c.midheaven));
  });

  await ok('PDF text carries the Sun label, the sample banner and the disclaimer', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(readFileSync(join(dir, 'natal-sky-home-print-a3.pdf')));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: false, disableFontFace: true }).promise;
    const text = (await (await doc.getPage(1)).getTextContent()).items.map((i) => i.str).join(' ');
    // The plate sets degree and sign as separate lines, so compare with whitespace collapsed.
    assert.ok(text.replace(/\s+/g, ' ').includes(manifest.chart.positions.sun.label), 'sun label');
    assert.match(text, /S\s*A\s*M\s*P\s*L\s*E/);
    assert.ok(text.includes('reflection and entertainment'), 'disclaimer');
    await doc.cleanup?.();
  });

  await ok('guide and readme say fictional, not for sale, and point at LICENCES.md', () => {
    for (const f of ['PRINT-GUIDE.txt', 'SAMPLE-README.txt']) {
      const t = readFileSync(join(dir, f), 'utf8');
      assert.match(t, /fictional/i, f); assert.match(t, /not for sale/i, f); assert.ok(t.includes('LICENCES.md'), f);
    }
  });

  await ok('tool refuses order-style input (--in, --final, --name)', () => {
    for (const flags of [['--in', 'tools/order-template.json'], ['--final'], ['--name', 'Real Person']]) {
      const r = spawnSync(process.execPath, [TOOL, '--out', join(dir, 'refused'), ...flags], { encoding: 'utf8' });
      assert.equal(r.status, 2, flags.join(' ')); assert.match(r.stderr, /unsupported argument/);
    }
    assert.ok(!existsSync(join(dir, 'refused')), 'refused run wrote files');
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${pass} passed, 0 failed`);
