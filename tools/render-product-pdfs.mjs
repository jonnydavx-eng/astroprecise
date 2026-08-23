#!/usr/bin/env node
/**
 * Deterministic Studio HTML -> PDF renderer.
 *
 * Uses the installed Microsoft Edge binary through playwright-core, waits for
 * local fonts, rejects any overflowing designed page, writes dark and ink-light
 * reading PDFs, and records hashes/page counts in render-manifest.json.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { basename, join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import { PDFDocument } from 'pdf-lib';
import { ROOT, parseArgs, sha256 } from './fulfil-shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

function edgePath() {
  const candidates = [
    process.env.AP_EDGE_PATH,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Microsoft Edge not found; set AP_EDGE_PATH');
  return found;
}

function oneHtml(dir, prefix, required = true) {
  const matches = readdirSync(dir).filter((name) => name.startsWith(prefix) && name.endsWith('.html'));
  if (!required && matches.length === 0) return null;
  if (matches.length !== 1) throw new Error(`Expected exactly one ${prefix}*.html in ${dir}; found ${matches.length}`);
  return join(dir, matches[0]);
}

function addWebsiteBase(html) {
  const base = pathToFileURL(join(ROOT, 'website') + '/').href;
  return html.replace(/<head>/i, `<head><base href="${base}">`);
}

function paidMeta(html, label) {
  const match = html.match(/<!-- ap-paid-meta:([^\n]*?) -->/);
  if (!match) throw new Error(`${label} lacks ap-paid-meta`);
  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error(`${label} has invalid ap-paid-meta JSON`);
  }
}

async function addMetadata(pdfPath, meta) {
  const original = readFileSync(pdfPath);
  const pdf = await PDFDocument.load(original);
  pdf.setTitle(meta.title);
  pdf.setAuthor('Jonathan Davenport trading as AstroPrecise');
  pdf.setSubject(meta.subject);
  pdf.setCreator('AstroPrecise Studio v901');
  pdf.setProducer('AstroPrecise Studio v901 / Microsoft Edge');
  pdf.setLanguage('en-GB');
  const bytes = await pdf.save({ useObjectStreams: false });
  writeFileSync(pdfPath, bytes);
  return { pages: pdf.getPageCount(), bytes: bytes.length, sha256: sha256(bytes) };
}

async function deriveA4FromA3(sourcePath, outputPath) {
  const sourceBytes = readFileSync(sourcePath);
  const target = await PDFDocument.create();
  const [embedded] = await target.embedPdf(sourceBytes, [0]);
  const page = target.addPage([595.28, 841.89]);
  const scale = Math.min(page.getWidth() / embedded.width, page.getHeight() / embedded.height);
  const width = embedded.width * scale;
  const height = embedded.height * scale;
  page.drawPage(embedded, { x: (page.getWidth() - width) / 2, y: (page.getHeight() - height) / 2, width, height });
  target.setTitle('Natal Sky home-print A4 plate');
  target.setAuthor('Jonathan Davenport trading as AstroPrecise');
  target.setSubject('A4-scaled personal copy of the RGB home-print natal chart plate.');
  target.setCreator('AstroPrecise Studio v901');
  target.setProducer('AstroPrecise Studio v901 / pdf-lib');
  target.setLanguage('en-GB');
  const bytes = await target.save({ useObjectStreams: false });
  writeFileSync(outputPath, bytes);
  return { file: basename(outputPath), variant: 'home-print-a4', pages: 1, bytes: bytes.length, sha256: sha256(bytes), overflow: 0, overflowX: 0, overflowY: 0, fonts: 'embedded-from-a3' };
}

async function renderVariant(page, { html, pdfPath, light, expectedPages, title, subject }) {
  await page.setContent(addWebsiteBase(html), { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  if (light) await page.evaluate(() => document.body.classList.add('ap-print-light'));
  const audit = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.page')];
    return {
      expected: Number(document.body.dataset.apPageCount || 0),
      fontStatus: document.fonts?.status || 'unsupported',
      pages: nodes.map((node, index) => ({
        index,
        key: node.getAttribute('data-page') || String(index),
        clientHeight: node.clientHeight,
        scrollHeight: node.scrollHeight,
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
        overflowY: Math.max(0, node.scrollHeight - node.clientHeight),
        overflowX: Math.max(0, node.scrollWidth - node.clientWidth),
        overflow: Math.max(0, node.scrollHeight - node.clientHeight, node.scrollWidth - node.clientWidth),
      })),
    };
  });
  if (audit.fontStatus !== 'loaded') throw new Error(`Fonts not loaded for ${basename(pdfPath)}: ${audit.fontStatus}`);
  if (audit.expected !== expectedPages || audit.pages.length !== expectedPages) {
    throw new Error(`${basename(pdfPath)} DOM page count ${audit.pages.length}/${audit.expected}; expected ${expectedPages}`);
  }
  const over = audit.pages.filter((entry) => entry.overflowX > 1 || entry.overflowY > 1);
  if (over.length) throw new Error(`${basename(pdfPath)} has overflowing designed pages: ${over.map((entry) => `${entry.key} x+${entry.overflowX}px y+${entry.overflowY}px`).join(', ')}`);
  await page.pdf({
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    tagged: true,
    outline: true,
  });
  const pdf = await addMetadata(pdfPath, { title, subject });
  if (pdf.pages !== expectedPages) throw new Error(`${basename(pdfPath)} physical page count ${pdf.pages}; expected ${expectedPages}`);
  return { file: basename(pdfPath), variant: light ? 'ink-light' : 'screen', ...pdf, overflow: 0, overflowX: 0, overflowY: 0, fonts: audit.fontStatus };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(args.dir || args.out || '');
  if (!dir || !existsSync(dir)) throw new Error('Usage: render-product-pdfs.mjs --dir <private order/proof directory>');
  mkdirSync(dir, { recursive: true });
  const readingPath = oneHtml(dir, 'reading-', false);
  const posterPath = oneHtml(dir, 'poster-');
  const readingHtml = readingPath ? readFileSync(readingPath, 'utf8') : null;
  const posterHtml = readFileSync(posterPath, 'utf8');
  const sourceMetas = [
    readingHtml ? paidMeta(readingHtml, basename(readingPath)) : null,
    paidMeta(posterHtml, basename(posterPath)),
  ].filter(Boolean);
  const bindingKeys = ['inputHash', 'orderRefHash', 'product', 'mode', 'provenanceRef'];
  const binding = Object.fromEntries(bindingKeys.map((key) => [key, sourceMetas[0]?.[key] ?? null]));
  for (const meta of sourceMetas.slice(1)) {
    for (const key of bindingKeys) if ((meta[key] ?? null) !== binding[key]) throw new Error(`Generated sources disagree on ${key}`);
  }
  const browser = await chromium.launch({ executablePath: edgePath(), headless: true, args: ['--disable-gpu', '--no-pdf-header-footer'] });
  const context = await browser.newContext({ locale: 'en-GB', serviceWorkers: 'block' });
  const blockedRequests = [];
  await context.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    if (['file:', 'data:', 'blob:', 'about:'].includes(requestUrl.protocol)) await route.continue();
    else {
      blockedRequests.push(requestUrl.origin);
      await route.abort();
    }
  });
  const page = await context.newPage();
  const results = [];
  const a4LightSource = join(dir, '.natal-sky-home-print-a4-source.pdf');
  try {
    if (readingHtml) {
      results.push(await renderVariant(page, {
        html: readingHtml,
        pdfPath: join(dir, 'personal-sky-keepsake-screen.pdf'),
        light: false,
        expectedPages: 20,
        title: 'Personal Sky Keepsake — screen edition',
        subject: 'Computed natal positions with traditional astrological interpretation for reflection and entertainment.',
      }));
      results.push(await renderVariant(page, {
        html: readingHtml,
        pdfPath: join(dir, 'personal-sky-keepsake-print.pdf'),
        light: true,
        expectedPages: 20,
        title: 'Personal Sky Keepsake — ink-light print edition',
        subject: 'Ink-light personal copy of a computed natal chart and reflective astrological reading.',
      }));
    }
    results.push(await renderVariant(page, {
      html: posterHtml,
      pdfPath: join(dir, 'natal-sky-home-print-a3.pdf'),
      light: false,
      expectedPages: 1,
      title: 'Natal Sky home-print A3 plate',
      subject: 'RGB A3 home-print natal chart plate; no bleed or commercial press colour profile is claimed.',
    }));
    await renderVariant(page, {
      html: posterHtml.replaceAll('HOME-PRINT A3', 'HOME-PRINT A4'),
      pdfPath: a4LightSource,
      light: true,
      expectedPages: 1,
      title: 'Natal Sky ink-light A4 source plate',
      subject: 'Ink-light RGB source plate for the scaled A4 home-print edition.',
    });
    results.push(await deriveA4FromA3(
      a4LightSource,
      join(dir, 'natal-sky-home-print-a4.pdf'),
    ));
    if (blockedRequests.length) throw new Error(`Blocked ${blockedRequests.length} external request(s) while rendering private product HTML`);
  } finally {
    if (existsSync(a4LightSource)) unlinkSync(a4LightSource);
    await context.close();
    await browser.close();
  }
  const manifest = {
    schema: 'astroprecise-studio-render-v901',
    generatedAt: new Date().toISOString(),
    binding,
    source: {
      reading: readingPath ? { file: basename(readingPath), sha256: sha256(readFileSync(readingPath)) } : null,
      poster: { file: basename(posterPath), sha256: sha256(readFileSync(posterPath)) },
    },
    artifacts: results,
  };
  const manifestPath = join(dir, 'render-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`rendered ${results.length} PDFs · manifest ${manifestPath}`);
}

main().catch((error) => {
  console.error(`PDF render failed: ${error.message}`);
  process.exit(1);
});
