#!/usr/bin/env node
/**
 * Deterministic Studio HTML -> PDF renderer.
 *
 * Uses the installed Microsoft Edge binary through playwright-core, waits for
 * local fonts, rejects any overflowing designed page, writes dark and ink-light
 * reading PDFs, and records hashes/page counts in render-manifest.json.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'fs';
import { createServer } from 'node:http';
import { basename, extname, join, resolve, sep } from 'path';
import { createRequire } from 'module';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';
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

function addWebsiteBase(html, base) {
  return html.replace(/<head>/i, `<head><base href="${base}">`);
}

async function startWebsiteAssetServer() {
  const websiteRoot = resolve(ROOT, 'website');
  let privateHtml = null;
  const mime = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.woff2', 'font/woff2'],
    ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
  ]);
  const server = createServer((request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
      if (pathname === '/__astroprecise-private-render.html') {
        if (privateHtml == null) {
          response.writeHead(404).end();
          return;
        }
        const bytes = Buffer.from(privateHtml, 'utf8');
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': bytes.length,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        if (request.method === 'HEAD') response.end();
        else response.end(bytes);
        return;
      }
      const candidate = resolve(websiteRoot, `.${pathname}`);
      if (candidate !== websiteRoot && !candidate.startsWith(`${websiteRoot}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const stat = statSync(candidate);
      if (!stat.isFile()) throw new Error('not a file');
      response.writeHead(200, {
        'Content-Type': mime.get(extname(candidate).toLowerCase()) || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      if (request.method === 'HEAD') response.end();
      else response.end(readFileSync(candidate));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local product asset server did not expose a TCP port');
  return {
    origin: `http://127.0.0.1:${address.port}`,
    base: `http://127.0.0.1:${address.port}/`,
    setPrivateHtml: (html) => { privateHtml = html; },
    close: () => new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose())),
  };
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
  if (!pdf.catalog.has(PDFName.of('StructTreeRoot')) || !pdf.catalog.has(PDFName.of('MarkInfo'))) {
    throw new Error(`${basename(pdfPath)} was not emitted as a tagged PDF`);
  }
  pdf.setTitle(meta.title);
  pdf.setAuthor('Jonathan Davenport / AstroPrecise');
  pdf.setSubject(meta.subject);
  pdf.setCreator('AstroPrecise Studio v902');
  pdf.setProducer('AstroPrecise Studio v902 / Microsoft Edge');
  pdf.setLanguage('en-GB');
  const fixedDateValue = process.env.AP_STUDIO_PDF_FIXED_DATE;
  if (fixedDateValue) {
    const fixedDate = new Date(fixedDateValue);
    if (Number.isNaN(fixedDate.getTime())) throw new Error('AP_STUDIO_PDF_FIXED_DATE must be an ISO date');
    const seed = `${process.env.AP_STUDIO_INPUT_HASH || 'sample'}:${basename(pdfPath)}`;
    const documentId = PDFHexString.of(sha256(seed).slice(0, 32));
    pdf.setCreationDate(fixedDate);
    pdf.setModificationDate(fixedDate);
    pdf.context.trailerInfo.ID = pdf.context.obj([documentId, documentId]);
  }
  const bytes = await pdf.save({ useObjectStreams: false });
  writeFileSync(pdfPath, bytes);
  const verified = await PDFDocument.load(bytes);
  const tagged = verified.catalog.has(PDFName.of('StructTreeRoot')) && verified.catalog.has(PDFName.of('MarkInfo'));
  if (!tagged) throw new Error(`${basename(pdfPath)} lost its accessibility tag tree during metadata finishing`);
  return { pages: verified.getPageCount(), bytes: bytes.length, sha256: sha256(bytes), tagged: true };
}

const REQUIRED_PRODUCT_FONTS = Object.freeze(['AstroGlyph', 'Cinzel', 'Cormorant Garamond', 'IBM Plex Mono']);

async function renderVariant(page, { html, pdfPath, light, expectedPages, title, subject, assetBase, setPrivateHtml, pageSize = 'css' }) {
  setPrivateHtml(addWebsiteBase(html, assetBase));
  await page.goto(`${assetBase}__astroprecise-private-render.html?variant=${encodeURIComponent(basename(pdfPath))}`, { waitUntil: 'load' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  if (light) await page.evaluate(() => document.body.classList.add('ap-print-light'));
  const audit = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('.page')];
    return {
      expected: Number(document.body.dataset.apPageCount || 0),
      fontStatus: document.fonts?.status || 'unsupported',
      loadedFontFamilies: [...new Set([...document.fonts]
        .filter((face) => face.status === 'loaded')
        .map((face) => face.family.replace(/^['"]|['"]$/g, '')))].sort(),
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
  const missingFonts = REQUIRED_PRODUCT_FONTS.filter((family) => !audit.loadedFontFamilies.includes(family));
  if (missingFonts.length) {
    throw new Error(`${basename(pdfPath)} did not load required product fonts: ${missingFonts.join(', ')}`);
  }
  if (audit.expected !== expectedPages || audit.pages.length !== expectedPages) {
    throw new Error(`${basename(pdfPath)} DOM page count ${audit.pages.length}/${audit.expected}; expected ${expectedPages}`);
  }
  const over = audit.pages.filter((entry) => entry.overflowX > 1 || entry.overflowY > 1);
  if (over.length) throw new Error(`${basename(pdfPath)} has overflowing designed pages: ${over.map((entry) => `${entry.key} x+${entry.overflowX}px y+${entry.overflowY}px`).join(', ')}`);
  const pdfOptions = {
    path: pdfPath,
    printBackground: true,
    preferCSSPageSize: pageSize === 'css',
    displayHeaderFooter: false,
    tagged: true,
    outline: true,
  };
  if (pageSize === 'a4') pdfOptions.format = 'A4';
  await page.pdf(pdfOptions);
  const pdf = await addMetadata(pdfPath, { title, subject });
  if (pdf.pages !== expectedPages) throw new Error(`${basename(pdfPath)} physical page count ${pdf.pages}; expected ${expectedPages}`);
  return {
    file: basename(pdfPath),
    variant: light ? 'ink-light' : 'screen',
    ...pdf,
    overflow: 0,
    overflowX: 0,
    overflowY: 0,
    fonts: audit.fontStatus,
    fontFamilies: audit.loadedFontFamilies,
  };
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
  const assets = await startWebsiteAssetServer();
  let browser;
  let context;
  const blockedRequests = [];
  const results = [];
  try {
    browser = await chromium.launch({ executablePath: edgePath(), headless: true, args: ['--disable-gpu', '--no-pdf-header-footer'] });
    context = await browser.newContext({ locale: 'en-GB', serviceWorkers: 'block' });
    await context.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url());
      if (['data:', 'blob:', 'about:'].includes(requestUrl.protocol) || requestUrl.origin === assets.origin) await route.continue();
      else {
        blockedRequests.push(requestUrl.origin);
        await route.abort();
      }
    });
    const page = await context.newPage();
    if (readingHtml) {
      results.push(await renderVariant(page, {
        html: readingHtml,
        pdfPath: join(dir, 'personal-sky-keepsake-screen.pdf'),
        light: false,
        expectedPages: 20,
        title: 'Personal Sky Keepsake - screen edition',
        subject: 'Computed natal positions with traditional astrological interpretation for reflection and entertainment.',
        assetBase: assets.base,
        setPrivateHtml: assets.setPrivateHtml,
      }));
      results.push(await renderVariant(page, {
        html: readingHtml,
        pdfPath: join(dir, 'personal-sky-keepsake-print.pdf'),
        light: true,
        expectedPages: 20,
        title: 'Personal Sky Keepsake - ink-light print edition',
        subject: 'Ink-light personal copy of a computed natal chart and reflective astrological reading.',
        assetBase: assets.base,
        setPrivateHtml: assets.setPrivateHtml,
      }));
    }
    results.push(await renderVariant(page, {
      html: posterHtml,
      pdfPath: join(dir, 'natal-sky-home-print-a3.pdf'),
      light: false,
      expectedPages: 1,
      title: 'Natal Sky home-print A3 plate',
      subject: 'RGB A3 home-print natal chart plate; no bleed or commercial press colour profile is claimed.',
      assetBase: assets.base,
      setPrivateHtml: assets.setPrivateHtml,
    }));
    results.push(await renderVariant(page, {
      html: posterHtml.replaceAll('HOME-PRINT A3', 'HOME-PRINT A4'),
      pdfPath: join(dir, 'natal-sky-home-print-a4.pdf'),
      light: true,
      expectedPages: 1,
      title: 'Natal Sky home-print A4 plate',
      subject: 'Ink-light RGB A4 home-print natal chart plate; no bleed or commercial press colour profile is claimed.',
      assetBase: assets.base,
      setPrivateHtml: assets.setPrivateHtml,
      pageSize: 'a4',
    }));
    if (blockedRequests.length) throw new Error(`Blocked ${blockedRequests.length} external request(s) while rendering private product HTML`);
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    await assets.close();
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
