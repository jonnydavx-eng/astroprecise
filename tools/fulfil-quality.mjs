#!/usr/bin/env node
/** Rendered-artifact quality gate for the three v901 Studio products. */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { createHmac } from 'crypto';
import { basename, join, resolve } from 'path';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';
import sharp from 'sharp';
import { assertDigitalSupplyMayBegin, assertExactFictionalStudioFixture, assertWorkMayStart, canonicalizeStudioOrder, loadEngines, parseArgs, ROOT, sha256 } from './fulfil-shared.mjs';

const PRODUCT_FILES = {
  'natal-sky-print-pack': ['natal-sky-home-print-a3.pdf', 'natal-sky-home-print-a4.pdf', '01-natal-print-4960x7016.png', '02-natal-square-2160x2160.png', '03-natal-story-2160x3840.png', '04-phone-wallpaper-1080x1920.png', '05-big-three-1080x1080.png'],
  'personal-sky-keepsake': ['personal-sky-keepsake-screen.pdf', 'personal-sky-keepsake-print.pdf', 'natal-sky-home-print-a3.pdf', 'natal-sky-home-print-a4.pdf'],
  'whole-sky-edition': ['personal-sky-keepsake-screen.pdf', 'personal-sky-keepsake-print.pdf', 'natal-sky-home-print-a3.pdf', 'natal-sky-home-print-a4.pdf', '01-natal-print-4960x7016.png', '02-natal-square-2160x2160.png', '03-natal-story-2160x3840.png', '04-phone-wallpaper-1080x1920.png', '05-big-three-1080x1080.png', '06-observatory-birth-hour-schematic-4800x3600.png'],
};
const GIFT_FILES = ['birthday-gift-jacket-a4.pdf', 'birthday-reveal-1080x1920.png', 'birthday-moon-plate-2160x2160.png'];
const filesForOrder = (product, giftMode) => [...PRODUCT_FILES[product], ...(giftMode ? GIFT_FILES : [])];
const PNG_DIMS = {
  '01-natal-print-4960x7016.png': [4960, 7016],
  '02-natal-square-2160x2160.png': [2160, 2160],
  '03-natal-story-2160x3840.png': [2160, 3840],
  '04-phone-wallpaper-1080x1920.png': [1080, 1920],
  '05-big-three-1080x1080.png': [1080, 1080],
  '06-observatory-birth-hour-schematic-4800x3600.png': [4800, 3600],
  'birthday-reveal-1080x1920.png': [1080, 1920],
  'birthday-moon-plate-2160x2160.png': [2160, 2160],
};
const DOCS = ['README.txt', 'PERSONAL-USE-LICENCE.txt', 'PRINT-GUIDE.txt', 'CUSTOMER-MANIFEST.json'];
const RETIRED = ['#C9A227', '#E8C872', '#F0A878', '#050406', '#0D0A07', 'rgba(201,162,39'];
const PROVENANCE_KEY_BYTES = 32;
const PROVENANCE_PREFIX = 'AP-';

const PDF_VISUAL_LIMITS = Object.freeze({
  stdev: 8,
  range: 15,
  lowContrastRange: 8,
  lowContrastStdev: 16,
  lowContrastEdge: 1.5,
  edge: 0.75,
  darkFraction: 0.02,
  lightFraction: 0.02,
});

const PNG_VISUAL_LIMITS = Object.freeze({
  minMean: 5,
  maxMean: 250,
  stdev: 5,
  range: 6,
  edge: 0.5,
  nonBlackFraction: 0.20,
  chroma: 5,
});
const OBSERVATORY_VISUAL_LIMITS = Object.freeze({
  ...PNG_VISUAL_LIMITS,
  minMean: 3,
  nonBlackFraction: 0.05,
});

function normal(text) {
  return String(text || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function visibleHtmlText(source) {
  return normal(String(source || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, ' ')
    .replace(/&amp;/gi, '&'));
}

function assertWorkStartBinding(control, privateOrder) {
  const expected = {
    contractAt: privateOrder.contractAt ?? null,
    buyerDurableConfirmationSentAt: privateOrder.buyerDurableConfirmationSentAt ?? null,
    buyerDurableConfirmationVersion: privateOrder.buyerDurableConfirmationVersion ?? null,
    buyerDurableConfirmationFile: privateOrder.buyerDurableConfirmationFile ?? null,
    buyerDurableConfirmationHash: privateOrder.buyerDurableConfirmationHash ?? null,
    recipientDurableConfirmationSentAt: privateOrder.recipientDurableConfirmationSentAt ?? null,
    recipientDurableConfirmationVersion: privateOrder.recipientDurableConfirmationVersion ?? null,
    recipientDurableConfirmationFile: privateOrder.recipientDurableConfirmationFile ?? null,
    recipientDurableConfirmationHash: privateOrder.recipientDurableConfirmationHash ?? null,
    earlyStartConsent: privateOrder.earlyStartConsent,
    earlyStartConsentRecordedAt: privateOrder.earlyStartConsentRecordedAt ?? null,
    earlyStartConsentActor: privateOrder.earlyStartConsentActor ?? null,
    earlyStartNoticeVersion: privateOrder.earlyStartNoticeVersion ?? null,
    earlyStartNoticeHash: privateOrder.earlyStartNoticeHash ?? null,
  };
  const actual = control.workStart;
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error('Private order-control lacks the canonical workStart binding');
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys) || expectedKeys.some((field) => actual[field] !== expected[field])) {
    throw new Error('Private order-control workStart does not exactly match canonical contract/consent timing');
  }
}

function assertDigitalSupplyBinding(control, privateOrder) {
  const expected = {
    digitalSupplyConsent: privateOrder.digitalSupplyConsent,
    digitalSupplyConsentRecordedAt: privateOrder.digitalSupplyConsentRecordedAt ?? null,
    digitalSupplyConsentActor: privateOrder.digitalSupplyConsentActor ?? null,
    digitalSupplyNoticeVersion: privateOrder.digitalSupplyNoticeVersion ?? null,
    digitalSupplyNoticeHash: privateOrder.digitalSupplyNoticeHash ?? null,
  };
  const actual = control.digitalSupply;
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) throw new Error('Private order-control lacks the canonical digitalSupply binding');
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys) || expectedKeys.some((field) => actual[field] !== expected[field])) {
    throw new Error('Private order-control digitalSupply does not exactly match canonical consent records');
  }
}

function pngInfo(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${basename(path)} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes };
}

function percentileFromHistogram(histogram, total, percentile) {
  const target = Math.max(0, Math.ceil(total * percentile) - 1);
  let seen = 0;
  for (let value = 0; value < histogram.length; value++) {
    seen += histogram[value];
    if (seen > target) return value;
  }
  return histogram.length - 1;
}

/**
 * Measure perceptual content rather than byte-level entropy. Luma is rounded
 * into a 256-bin histogram so percentiles are deterministic and do not require
 * sorting millions of pixels. Edge energy is the mean absolute horizontal and
 * vertical neighbour difference; chroma is the mean RGB channel range.
 */
function visualMetrics(data, info) {
  const pixels = info.width * info.height;
  const luma = new Uint8Array(pixels);
  const histogram = new Uint32Array(256);
  let sum = 0;
  let sumSquares = 0;
  let below250 = 0;
  let above5 = 0;
  let chromaSum = 0;
  for (let pixel = 0, offset = 0; pixel < pixels; pixel++, offset += info.channels) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const value = Math.max(0, Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)));
    luma[pixel] = value;
    histogram[value]++;
    sum += value;
    sumSquares += value * value;
    if (value < 250) below250++;
    if (value > 5) above5++;
    chromaSum += Math.max(r, g, b) - Math.min(r, g, b);
  }
  let edgeSum = 0;
  let edges = 0;
  for (let y = 0; y < info.height; y++) {
    const row = y * info.width;
    for (let x = 0; x < info.width; x++) {
      const at = row + x;
      if (x + 1 < info.width) {
        edgeSum += Math.abs(luma[at] - luma[at + 1]);
        edges++;
      }
      if (y + 1 < info.height) {
        edgeSum += Math.abs(luma[at] - luma[at + info.width]);
        edges++;
      }
    }
  }
  const mean = sum / pixels;
  return {
    width: info.width,
    height: info.height,
    mean,
    stdev: Math.sqrt(Math.max(0, sumSquares / pixels - mean * mean)),
    p05: percentileFromHistogram(histogram, pixels, 0.05),
    p95: percentileFromHistogram(histogram, pixels, 0.95),
    edge: edges ? edgeSum / edges : 0,
    below250: below250 / pixels,
    above5: above5 / pixels,
    chroma: chromaSum / pixels,
  };
}

function metricsSummary(metrics) {
  return [
    `mean ${metrics.mean.toFixed(2)}`,
    `stdev ${metrics.stdev.toFixed(2)}`,
    `p95-p05 ${(metrics.p95 - metrics.p05).toFixed(2)}`,
    `edge ${metrics.edge.toFixed(3)}`,
    `<250 ${(metrics.below250 * 100).toFixed(2)}%`,
    `>5 ${(metrics.above5 * 100).toFixed(2)}%`,
    `chroma ${metrics.chroma.toFixed(2)}`,
  ].join(', ');
}

function assertPdfVisual(metrics, file, pageNumber) {
  const failures = [];
  if (metrics.stdev < PDF_VISUAL_LIMITS.stdev) failures.push(`luma stdev < ${PDF_VISUAL_LIMITS.stdev}`);
  const range = metrics.p95 - metrics.p05;
  // Sparse ink-light pages can have a p05 and p95 both in the paper field even
  // while their text/diagram pixels have healthy variance and edge energy.
  // Keep 15 as the normal floor, with a measured-valid low-contrast exception
  // that still demands range >=8, stdev >=16 and edge >=1.5 together.
  if (range < PDF_VISUAL_LIMITS.range && (
    range < PDF_VISUAL_LIMITS.lowContrastRange ||
    metrics.stdev < PDF_VISUAL_LIMITS.lowContrastStdev ||
    metrics.edge < PDF_VISUAL_LIMITS.lowContrastEdge
  )) failures.push(`p95-p05 < ${PDF_VISUAL_LIMITS.range} without healthy sparse-page headroom`);
  if (metrics.edge < PDF_VISUAL_LIMITS.edge) failures.push(`edge energy < ${PDF_VISUAL_LIMITS.edge}`);
  if (metrics.below250 < PDF_VISUAL_LIMITS.darkFraction) failures.push(`<250 coverage < ${PDF_VISUAL_LIMITS.darkFraction * 100}%`);
  if (metrics.above5 < PDF_VISUAL_LIMITS.lightFraction) failures.push(`>5 coverage < ${PDF_VISUAL_LIMITS.lightFraction * 100}%`);
  if (failures.length) {
    throw new Error(`${basename(file)} page ${pageNumber} is visually flat/covered: ${failures.join('; ')} (${metricsSummary(metrics)})`);
  }
}

async function pngVisualMetrics(path, width, height) {
  // Generator proof/provenance bands occupy at most the bottom 6.2% (the
  // Observatory has the deepest one). Excluding 8% makes the test evaluate the
  // actual artwork and prevents a coloured footer from rescuing a blank image.
  const contentHeight = Math.max(1, Math.floor(height * 0.92));
  const analysisWidth = Math.min(width, 128);
  const analysisHeight = Math.min(contentHeight, 128);
  const { data, info } = await sharp(path)
    .extract({ left: 0, top: 0, width, height: contentHeight })
    .flatten({ background: '#ffffff' })
    .resize({ width: analysisWidth, height: analysisHeight, fit: 'fill', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return visualMetrics(data, info);
}

async function assertPngVisual(path, width, height) {
  const metrics = await pngVisualMetrics(path, width, height);
  const limits = basename(path) === '06-observatory-birth-hour-schematic-4800x3600.png'
    ? OBSERVATORY_VISUAL_LIMITS
    : PNG_VISUAL_LIMITS;
  const failures = [];
  if (metrics.mean < limits.minMean || metrics.mean > limits.maxMean) failures.push(`mean luma outside ${limits.minMean}..${limits.maxMean}`);
  if (metrics.stdev < limits.stdev) failures.push(`luma stdev < ${limits.stdev}`);
  if (metrics.p95 - metrics.p05 < limits.range) failures.push(`p95-p05 < ${limits.range}`);
  if (metrics.edge < limits.edge) failures.push(`edge energy < ${limits.edge}`);
  if (metrics.above5 < limits.nonBlackFraction) failures.push(`non-black coverage < ${limits.nonBlackFraction * 100}%`);
  if (metrics.chroma < limits.chroma) failures.push(`mean chroma < ${limits.chroma}`);
  if (failures.length) throw new Error(`${basename(path)} lacks perceptual artwork content: ${failures.join('; ')} (${metricsSummary(metrics)})`);
  return metrics;
}

async function assertPngProvenanceStrip(path, height, expectedProvenanceRef) {
  const cell = 8;
  const bitCount = 96;
  const { data, info } = await sharp(path)
    .extract({ left: 16, top: height - 28, width: cell * bitCount, height: cell })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const colours = {
    0: [0x27, 0x41, 0x5C],
    1: [0x8B, 0xA9, 0xFF],
  };
  let bits = '';
  for (let index = 0; index < bitCount; index++) {
    const x = index * cell + Math.floor(cell / 2);
    const y = Math.floor(cell / 2);
    const offset = (y * info.width + x) * info.channels;
    const pixel = [data[offset], data[offset + 1], data[offset + 2]];
    const distance = (reference) => Math.max(...pixel.map((value, channel) => Math.abs(value - reference[channel])));
    const zeroDistance = distance(colours[0]);
    const oneDistance = distance(colours[1]);
    const bit = oneDistance < zeroDistance ? '1' : '0';
    if (Math.min(zeroDistance, oneDistance) > 8) {
      throw new Error(`${basename(path)} provenance strip cell ${index} has an invalid colour (${pixel.join(',')})`);
    }
    bits += bit;
  }
  let encoded = '';
  for (let index = 0; index < bits.length; index += 4) encoded += Number.parseInt(bits.slice(index, index + 4), 2).toString(16).toUpperCase();
  const expected = `A57A901E${expectedProvenanceRef.slice(PROVENANCE_PREFIX.length)}`;
  if (encoded !== expected) throw new Error(`${basename(path)} provenance strip decodes to ${encoded}; expected ${expected}`);
}

function round4(value) {
  return +Number(value).toFixed(4);
}

function canonicalChart(privateOrder) {
  const order = canonicalizeStudioOrder(privateOrder);
  const { E } = loadEngines();
  const chart = E.calculateNatalChart(order.utc.y, order.utc.mo, order.utc.d, order.utc.h, order.utc.mi, order.lat, order.lon, order.house);
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron'];
  const positions = Object.fromEntries(keys.map((key) => [key, chart.positions[key].longitude]));
  const definitions = [[0, 7], [180, 7], [120, 6], [90, 6], [60, 4]];
  let aspects = 0;
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      let separation = Math.abs(positions[keys[i]] - positions[keys[j]]);
      if (separation > 180) separation = 360 - separation;
      if (definitions.some(([angle, orb]) => Math.abs(separation - angle) <= orb)) aspects++;
    }
  }
  const elongation = ((positions.moon - positions.sun) % 360 + 360) % 360;
  const illuminatedFraction = (1 - Math.cos(elongation * Math.PI / 180)) / 2;
  return {
    order,
    sun: round4(positions.sun),
    moon: round4(positions.moon),
    asc: round4(chart.ascendant),
    aspects,
    giftAstronomy: {
      engine: 'VSOP87/ELP2000',
      frame: 'geocentric-ecliptic-of-date',
      sunLongitude: +positions.sun.toFixed(6),
      moonLongitude: +positions.moon.toFixed(6),
      sunMoonElongation: +elongation.toFixed(6),
      illuminatedFraction: +illuminatedFraction.toFixed(8),
      motion: elongation <= 180 ? 'waxing' : 'waning',
      moonSign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][Math.floor((((positions.moon % 360) + 360) % 360) / 30)],
    },
  };
}

function provenanceRef(key, binding) {
  const payload = `${binding.inputHash}\0${binding.orderRefHash}\0${binding.product}\0${binding.mode}`;
  return `${PROVENANCE_PREFIX}${createHmac('sha256', key).update(payload).digest('hex').slice(0, 16).toUpperCase()}`;
}

function assertBinding(actual, expected, label) {
  for (const field of ['inputHash', 'orderRefHash', 'product', 'mode', 'provenanceRef']) {
    if (actual?.[field] !== expected[field]) throw new Error(`${label} ${field} does not match the canonical control binding`);
  }
}

async function hasProofMarker(path, width, height) {
  const markerHeight = Math.min(12, height);
  const { data, info } = await sharp(path)
    .extract({ left: 0, top: height - markerHeight, width, height: markerHeight })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let matches = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] === 0x8B && data[i + 1] === 0xA9 && data[i + 2] === 0xFF) matches++;
  }
  return matches / (info.width * info.height) > 0.95;
}

function flattenOutline(items = [], titles = []) {
  for (const item of items || []) {
    if (item?.title) titles.push(normal(item.title));
    if (item?.items?.length) flattenOutline(item.items, titles);
  }
  return titles;
}

async function pdfText(path) {
  const task = getDocument({ data: new Uint8Array(readFileSync(path)), disableWorker: true, isEvalSupported: false });
  const doc = await task.promise;
  const pages = [];
  const visuals = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(normal(content.items.map((item) => item.str).join(' ')));
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport, background: 'rgb(255,255,255)' }).promise;
      const { data, info } = await sharp(canvas.toBuffer('image/png'))
        .flatten({ background: '#ffffff' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      visuals.push(visualMetrics(data, info));
      page.cleanup();
    }
    const outline = await doc.getOutline();
    const outlineTitles = flattenOutline(outline);
    return { pages, visuals, text: normal(pages.join(' ')), outline: outlineTitles.length, outlineTitles };
  } finally {
    if (typeof task.destroy === 'function') await task.destroy();
  }
}

async function auditPdf(path, expectedPages, expectedSize, final, expectedName, expectedProvenanceRef) {
  const bytes = readFileSync(path);
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() !== expectedPages) throw new Error(`${basename(path)} has ${pdf.getPageCount()} pages; expected ${expectedPages}`);
  const [wantW, wantH] = expectedSize;
  for (const [index, page] of pdf.getPages().entries()) {
    if (Math.abs(page.getWidth() - wantW) > 2 || Math.abs(page.getHeight() - wantH) > 2) {
      throw new Error(`${basename(path)} page ${index + 1} has size ${page.getWidth().toFixed(1)}x${page.getHeight().toFixed(1)}; expected ${wantW}x${wantH}`);
    }
  }
  if (!pdf.getTitle() || !/AstroPrecise|Natal Sky|Personal Sky/i.test(pdf.getTitle())) throw new Error(`${basename(path)} lacks branded Title metadata`);
  if (!/AstroPrecise/i.test(pdf.getAuthor() || '')) throw new Error(`${basename(path)} lacks branded Author metadata`);
  const extracted = await pdfText(path);
  if (extracted.pages.some((page) => !page)) throw new Error(`${basename(path)} contains a text-empty physical page`);
  if (/\uFFFD/.test(extracted.text)) throw new Error(`${basename(path)} contains missing-glyph replacement characters`);
  for (const [index, pageText] of extracted.pages.entries()) {
    assertPdfVisual(extracted.visuals[index], path, index + 1);
    const compactMarkerText = pageText.replace(/[^a-z]/gi, '').toUpperCase();
    const marked = compactMarkerText.includes('FICTIONALSAMPLE') || compactMarkerText.includes('DRAFT') || compactMarkerText.includes('PROOF');
    if (final && marked) throw new Error(`${basename(path)} page ${index + 1} retains a proof watermark in final mode`);
    if (!final && !marked) throw new Error(`${basename(path)} page ${index + 1} lacks a proof/sample watermark`);
    if (!pageText.toUpperCase().includes(`AP REF ${expectedProvenanceRef}`)) {
      throw new Error(`${basename(path)} page ${index + 1} lacks visible AP REF ${expectedProvenanceRef} provenance`);
    }
  }
  if (basename(path) === 'birthday-gift-jacket-a4.pdf') {
    for (const phrase of ['AP REF', expectedProvenanceRef, 'COMPUTED, NOT A PHOTOGRAPH']) {
      if (!extracted.text.includes(normal(phrase))) throw new Error(`${basename(path)} cannot extract required gift label: ${phrase}`);
    }
  } else if (/personal-sky-keepsake/.test(basename(path))) {
    for (const phrase of ['The Sky at Your First Breath', 'How to read this', 'Chart reference', expectedName]) {
      if (!extracted.text.includes(normal(phrase))) throw new Error(`${basename(path)} cannot extract required phrase: ${phrase}`);
    }
    if (extracted.outline < 1) throw new Error(`${basename(path)} has no PDF outline/bookmarks`);
    const joined = extracted.outlineTitles.filter((title) => /(?:YourFirst|timeand|areflective|acrossthe|sky,not)/i.test(title));
    if (joined.length) throw new Error(`${basename(path)} has joined words in PDF bookmarks: ${joined.join('; ')}`);
  } else {
    const printLabel = /-a4\.pdf$/i.test(path) ? 'HOME-PRINT A4' : 'HOME-PRINT A3';
    for (const phrase of ['The Natal Chart of', expectedName, 'AstroPrecise', printLabel]) {
      if (!extracted.text.includes(normal(phrase))) throw new Error(`${basename(path)} cannot extract required phrase: ${phrase}`);
    }
  }
  return { bytes: bytes.length, sha256: sha256(bytes), text: extracted.text };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(args.dir || '');
  const product = String(args.product || '');
  const final = !!args.final;
  if (!dir || !PRODUCT_FILES[product] || (!!args.final === !!args.proof)) {
    throw new Error('Usage: fulfil-quality.mjs --dir <private dir> --product <launch sku> (--final | --proof)');
  }
  let catalogue = null;
  if (final) {
    catalogue = JSON.parse(readFileSync(join(ROOT, 'website', 'data', 'products-v901.json'), 'utf8'));
    if (catalogue.platform?.checkoutVerified !== true) throw new Error('Final quality approval is disabled until checkout verification is complete');
  }
  const privateOrderPath = join(dir, '_private', 'canonical-order.json');
  const controlPath = join(dir, '_private', 'order-control.json');
  const provenanceKeyPath = join(dir, '_private', 'provenance-key.bin');
  const manifestPath = join(dir, 'fulfilment-manifest.json');
  const renderPath = join(dir, 'render-manifest.json');
  for (const path of [privateOrderPath, controlPath, provenanceKeyPath, manifestPath, renderPath]) if (!existsSync(path)) throw new Error(`Missing control file: ${basename(path)}`);
  const privateOrder = JSON.parse(readFileSync(privateOrderPath, 'utf8'));
  const recanonicalOrder = canonicalizeStudioOrder(privateOrder);
  if (JSON.stringify(stableValue(privateOrder)) !== JSON.stringify(stableValue(recanonicalOrder))) {
    throw new Error('Private canonical order contains non-whitelisted or non-canonical fields');
  }
  const giftMode = privateOrder.purchaseIntent === 'gift';
  if (!['self', 'gift'].includes(privateOrder.purchaseIntent)) throw new Error('Canonical order lacks an approved purchaseIntent');
  if (final && giftMode) {
    if (catalogue.platform?.giftCheckoutVerified !== true) throw new Error('Gift final quality approval is disabled until the two-person recipient flow is verified');
    if (privateOrder.recipientPrivacyNoticeVersion !== catalogue.platform.giftPrivacyNoticeVersion || privateOrder.recipientPrivacyNoticeHash !== catalogue.platform.giftPrivacyNoticeHash) {
      throw new Error('Gift final quality approval requires the owner-approved recipient privacy notice version and hash');
    }
  }
  const giftControlPath = join(dir, '_private', 'gift-asset-control.json');
  if (giftMode && !existsSync(giftControlPath)) throw new Error('Missing control file: gift-asset-control.json');
  if (!giftMode && existsSync(giftControlPath)) throw new Error('Self order unexpectedly contains gift-asset-control.json');
  const control = JSON.parse(readFileSync(controlPath, 'utf8'));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const render = JSON.parse(readFileSync(renderPath, 'utf8'));
  if (manifest.schema !== 'astroprecise-studio-fulfilment-manifest-v901' || manifest.product !== product || !Array.isArray(manifest.artifacts)) throw new Error('Fulfilment manifest schema/product/artifacts mismatch');
  if (manifest.mode !== (final ? 'final' : 'proof')) throw new Error('Fulfilment manifest mode mismatch');
  const expectedMode = final ? 'final' : 'proof';
  const computedInputHash = sha256(JSON.stringify(privateOrder));
  const expectedOrderRef = sha256(String(privateOrder.orderId || '')).slice(0, 16);
  const key = readFileSync(provenanceKeyPath);
  if (key.length !== PROVENANCE_KEY_BYTES) throw new Error(`Private provenance key must be exactly ${PROVENANCE_KEY_BYTES} bytes`);
  const bindingSeed = { inputHash: computedInputHash, orderRefHash: expectedOrderRef, product, mode: expectedMode };
  const expectedProvenanceRef = provenanceRef(key, bindingSeed);
  const expectedBinding = { ...bindingSeed, provenanceRef: expectedProvenanceRef };
  const computedChart = canonicalChart(privateOrder);
  if (control.schema !== 'astroprecise-studio-control-v901' || control.product !== product || control.mode !== expectedMode) throw new Error('Private order-control schema/product/mode mismatch');
  assertBinding(control, expectedBinding, 'Private order-control');
  assertWorkStartBinding(control, privateOrder);
  assertDigitalSupplyBinding(control, privateOrder);
  if (privateOrder.sampleMode === 'fictional') {
    assertExactFictionalStudioFixture(privateOrder);
  } else {
    assertWorkMayStart(privateOrder);
    if (final) assertDigitalSupplyMayBegin(privateOrder);
  }
  if (!/^AP-[A-F0-9]{16}$/.test(control.provenanceRef)) throw new Error('Private order-control provenanceRef has an invalid format');
  if (control.provenanceRef !== expectedProvenanceRef) throw new Error('Private order-control provenanceRef is not derived from the private key and canonical binding');
  if (control.inputHash !== computedInputHash || manifest.inputHash !== computedInputHash) throw new Error('Canonical order bytes do not match the control/fulfilment input hash');
  if (final && control.paymentEvidenceHash !== privateOrder.fulfilmentAuthorization?.paymentEvidenceHash) throw new Error('Final payment evidence hash is not consistently bound');
  if (!final && control.paymentEvidenceHash !== null) throw new Error('Proof unexpectedly records payment evidence');
  if (final && privateOrder.fulfilmentAuthorization?.state !== 'paid-in-full') throw new Error('Final order lacks paid-in-full authorisation');
  if (!final && privateOrder.fulfilmentAuthorization) throw new Error('Proof order unexpectedly carries final authorisation');
  if (render.schema !== 'astroprecise-studio-render-v901' || !Array.isArray(render.artifacts) || render.artifacts.some((entry) => entry.overflow !== 0 || entry.overflowX !== 0 || entry.overflowY !== 0 || entry.fonts === 'unloaded')) {
    throw new Error('Rendered-PDF manifest does not prove zero overflow and loaded fonts');
  }
  assertBinding(render.binding, expectedBinding, 'Rendered-PDF manifest binding');

  let giftControl = null;
  if (giftMode) {
    giftControl = JSON.parse(readFileSync(giftControlPath, 'utf8'));
    if (giftControl.schema !== 'astroprecise-studio-gift-asset-control-v901' || !Array.isArray(giftControl.artifacts) || !Array.isArray(giftControl.labels)) {
      throw new Error('Gift asset control schema/artifacts/labels mismatch');
    }
    assertBinding(giftControl.binding, expectedBinding, 'Gift asset control binding');
    if (JSON.stringify(giftControl.calculation) !== JSON.stringify(computedChart.giftAstronomy)) {
      throw new Error('Gift Moon calculation does not match the exact canonical UTC chart');
    }
    for (const label of ['COMPUTED FROM THE RECORDED BIRTH MOMENT', 'SCHEMATIC', 'NOT A PHOTOGRAPH', `AP REF ${expectedProvenanceRef}`]) {
      if (!giftControl.labels.includes(label)) throw new Error(`Gift asset control lacks required visible label: ${label}`);
    }
    const giftByFile = new Map(giftControl.artifacts.map((entry) => [entry.file, entry]));
    if (giftByFile.size !== giftControl.artifacts.length || JSON.stringify([...giftByFile.keys()].sort()) !== JSON.stringify(GIFT_FILES.slice().sort())) {
      throw new Error('Gift asset control inventory mismatch or duplicate artifact names');
    }
    for (const file of GIFT_FILES) {
      const path = join(dir, file);
      if (!existsSync(path)) throw new Error(`Missing gift customer artifact: ${file}`);
      const bytes = readFileSync(path);
      const recorded = giftByFile.get(file);
      if (recorded.bytes !== bytes.length || recorded.sha256 !== sha256(bytes)) throw new Error(`${file} does not match gift-asset-control.json`);
      if (file.endsWith('.png')) {
        const [width, height] = PNG_DIMS[file];
        if (recorded.width !== width || recorded.height !== height) throw new Error(`${file} gift control dimensions mismatch`);
      } else if (recorded.pages !== 1 || Math.abs(recorded.widthPt - 595.28) > .01 || Math.abs(recorded.heightPt - 841.89) > .01) {
        throw new Error(`${file} gift control A4/page metadata mismatch`);
      }
    }
  }

  for (const source of [render.source?.reading, render.source?.poster].filter(Boolean)) {
    const sourcePath = join(dir, source.file);
    if (!existsSync(sourcePath) || source.sha256 !== sha256(readFileSync(sourcePath))) throw new Error(`Rendered source is missing or altered: ${source.file}`);
  }

  const productFiles = filesForOrder(product, giftMode);
  const expected = [...productFiles, ...DOCS, `astroprecise-${product}.zip`];
  for (const file of expected) if (!existsSync(join(dir, file))) throw new Error(`Missing final customer artifact: ${file}`);
  const manifestByFile = new Map(manifest.artifacts.map((entry) => [entry.file, entry]));
  if (manifestByFile.size !== manifest.artifacts.length) throw new Error('Fulfilment manifest contains duplicate artifact names');
  if (JSON.stringify([...manifestByFile.keys()].sort()) !== JSON.stringify(expected.slice().sort())) throw new Error('Fulfilment manifest artifact inventory mismatch');
  for (const file of expected) {
    const bytes = readFileSync(join(dir, file));
    const recorded = manifestByFile.get(file);
    if (!recorded || recorded.bytes !== bytes.length || recorded.sha256 !== sha256(bytes)) throw new Error(`${file} does not match fulfilment-manifest.json`);
  }
  const renderByFile = new Map(render.artifacts.map((entry) => [entry.file, entry]));
  if (renderByFile.size !== render.artifacts.length) throw new Error('Rendered-PDF manifest contains duplicate artifact names');
  for (const file of PRODUCT_FILES[product].filter((name) => name.endsWith('.pdf'))) {
    const bytes = readFileSync(join(dir, file));
    const recorded = renderByFile.get(file);
    if (!recorded || recorded.bytes !== bytes.length || recorded.sha256 !== sha256(bytes)) throw new Error(`${file} does not match render-manifest.json`);
  }

  const expectedPngFiles = productFiles.filter((name) => name.endsWith('.png'));
  let raster = null;
  if (expectedPngFiles.length) {
    const rasterPath = join(dir, 'raster-manifest.json');
    if (!existsSync(rasterPath)) throw new Error('Missing control file: raster-manifest.json');
    raster = JSON.parse(readFileSync(rasterPath, 'utf8'));
    if (raster.schema !== 'astroprecise-studio-raster-v901' || !Array.isArray(raster.artifacts)) throw new Error('Raster manifest schema/artifacts mismatch');
    assertBinding(raster.binding, expectedBinding, 'Raster manifest binding');
    const rasterByFile = new Map(raster.artifacts.map((entry) => [entry.file, entry]));
    if (rasterByFile.size !== raster.artifacts.length || JSON.stringify([...rasterByFile.keys()].sort()) !== JSON.stringify(expectedPngFiles.slice().sort())) {
      throw new Error('Raster manifest PNG inventory mismatch or duplicate artifact names');
    }
    for (const file of expectedPngFiles) {
      const path = join(dir, file);
      const bytes = readFileSync(path);
      const [width, height] = PNG_DIMS[file];
      const recorded = rasterByFile.get(file);
      if (!recorded || recorded.width !== width || recorded.height !== height || recorded.bytes !== bytes.length || recorded.sha256 !== sha256(bytes)) {
        throw new Error(`${file} dimensions/bytes/hash do not match raster-manifest.json`);
      }
    }
  }

  for (const file of productFiles) {
    const path = join(dir, file);
    if (file.endsWith('.png')) {
      const info = pngInfo(path);
      const [w, h] = PNG_DIMS[file];
      if (info.width !== w || info.height !== h) throw new Error(`${file} is ${info.width}x${info.height}; expected ${w}x${h}`);
      await assertPngVisual(path, w, h);
      await assertPngProvenanceStrip(path, h, expectedProvenanceRef);
      const marked = await hasProofMarker(path, w, h);
      if (!final && !marked) throw new Error(`${file} lacks the visible proof-watermark marker`);
      if (final && marked) throw new Error(`${file} retains the proof-watermark marker in final mode`);
    } else if (file.endsWith('.pdf')) {
      const reading = file.startsWith('personal-sky-keepsake');
      const giftJacket = file === 'birthday-gift-jacket-a4.pdf';
      const a3 = file.endsWith('-a3.pdf');
      const a4 = file.endsWith('-a4.pdf') || reading || giftJacket;
      await auditPdf(path, reading ? 20 : 1, a3 ? [841.89, 1190.55] : a4 ? [595.28, 841.89] : [595.28, 841.89], final, computedChart.order.name, expectedProvenanceRef);
    }
  }

  const customerManifestText = readFileSync(join(dir, 'CUSTOMER-MANIFEST.json'), 'utf8');
  const customerManifest = JSON.parse(customerManifestText);
  const privateSecrets = [
    privateOrder.orderId, privateOrder.email, privateOrder.name, privateOrder.place,
    privateOrder.recipientDisplayName, privateOrder.giverDisplayName, privateOrder.giftMessage,
    privateOrder.recipientEmail, privateOrder.recipientDeclaration?.typedName,
    `${privateOrder.y}-${String(privateOrder.mo).padStart(2, '0')}-${String(privateOrder.d).padStart(2, '0')}`,
  ].filter((value) => String(value || '').length >= 5).map(String);
  const manifestSurfaces = [
    customerManifestText,
    JSON.stringify(manifest),
    JSON.stringify(render),
    JSON.stringify(raster || {}),
    JSON.stringify(giftControl || {}),
    JSON.stringify(control),
  ].join('\n');
  for (const secret of privateSecrets) {
    if (manifestSurfaces.includes(secret)) throw new Error('A fulfilment manifest/control surface leaks private intake fields');
  }
  for (const forbiddenKey of ['email', 'recipientEmail', 'recipientDisplayName', 'giverDisplayName', 'giftMessage', 'typedName', 'place', 'birthDate']) {
    if (manifestSurfaces.includes(`"${forbiddenKey}"`)) throw new Error(`A fulfilment manifest/control surface exposes private key ${forbiddenKey}`);
  }
  if (/inputHash|paymentEvidence|transaction/i.test(customerManifestText)) throw new Error('Customer manifest exposes internal control evidence');
  const expectedCustomerFiles = [...productFiles, ...DOCS.filter((name) => name !== 'CUSTOMER-MANIFEST.json')].sort();
  if (customerManifest.schema !== 'astroprecise-studio-customer-manifest-v901' || customerManifest.product !== product || customerManifest.mode !== expectedMode || !Array.isArray(customerManifest.files)) throw new Error('Customer manifest schema/product/mode mismatch');
  const customerByFile = new Map(customerManifest.files.map((entry) => [entry.file, entry]));
  if (customerByFile.size !== customerManifest.files.length || JSON.stringify([...customerByFile.keys()].sort()) !== JSON.stringify(expectedCustomerFiles)) throw new Error('Customer manifest file inventory mismatch');
  for (const file of expectedCustomerFiles) {
    const bytes = readFileSync(join(dir, file));
    const recorded = customerByFile.get(file);
    if (!recorded || recorded.bytes !== bytes.length || recorded.sha256 !== sha256(bytes)) throw new Error(`${file} does not match CUSTOMER-MANIFEST.json`);
  }
  if (manifest.customerManifestHash !== sha256(Buffer.from(customerManifestText))) throw new Error('Customer manifest hash is not bound into fulfilment-manifest.json');
  const zip = await JSZip.loadAsync(readFileSync(join(dir, `astroprecise-${product}.zip`)));
  const zipNames = Object.keys(zip.files).sort();
  const expectedZip = [...productFiles, ...DOCS].sort();
  if (JSON.stringify(zipNames) !== JSON.stringify(expectedZip)) throw new Error('Customer ZIP inventory mismatch or private file leak');
  for (const name of zipNames) {
    if (/\.html$|_private|order|payment/i.test(name)) throw new Error(`Private/internal file present in ZIP: ${name}`);
    const zipped = await zip.file(name).async('nodebuffer');
    const disk = readFileSync(join(dir, name));
    if (zipped.length !== disk.length || sha256(zipped) !== sha256(disk)) throw new Error(`ZIP entry bytes do not match audited disk artifact: ${name}`);
  }

  const htmlFiles = readdirSync(dir).filter((name) => name.endsWith('.html'));
  const html = htmlFiles.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n');
  for (const name of htmlFiles) {
    const source = readFileSync(join(dir, name), 'utf8');
    const match = source.match(/<!-- ap-paid-meta:([^\n]*?) -->/);
    if (!match) throw new Error(`${name} lacks canonical paid-meta binding`);
    const meta = JSON.parse(match[1]);
    if (meta.product !== product || meta.orderRefHash !== expectedOrderRef || meta.houseSystem !== computedChart.order.house || meta.mode !== expectedMode || meta.inputHash !== computedInputHash || meta.provenanceRef !== expectedProvenanceRef) {
      throw new Error(`${name} paid-meta does not bind product/order/house/mode/input/provenance to the canonical order`);
    }
    for (const field of ['sun', 'moon', 'asc']) {
      if (typeof meta[field] !== 'number' || meta[field] !== computedChart[field]) throw new Error(`${name} paid-meta ${field} does not match the canonical chart rounded to four decimals`);
    }
    if (!Number.isInteger(meta.aspects) || meta.aspects !== computedChart.aspects) throw new Error(`${name} paid-meta aspect count does not match the canonical chart`);
    if (!visibleHtmlText(source).toUpperCase().includes(`AP REF ${expectedProvenanceRef}`)) throw new Error(`${name} lacks visible AP REF ${expectedProvenanceRef} provenance`);
  }
  for (const colour of RETIRED) if (html.toLowerCase().includes(colour.toLowerCase())) throw new Error(`Retired warm colour remains in generated product HTML: ${colour}`);
  if (final && /\b(?:SAMPLE|DRAFT)\b/.test(html)) throw new Error('Final HTML retains a proof watermark');
  if (!final && !/\b(?:SAMPLE|DRAFT)\b/.test(html)) throw new Error('Proof HTML lacks a DRAFT/SAMPLE watermark');

  const piiFilenameTokens = [privateOrder.name, privateOrder.recipientDisplayName, privateOrder.giverDisplayName]
    .map((value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter((value) => value.length >= 4);
  const unsafeNames = readdirSync(dir).filter((name) => {
    const lower = name.toLowerCase();
    return /display-name|aurora-vale|jane-example|\d{4}-\d{2}-\d{2}/i.test(name) || piiFilenameTokens.some((token) => lower.includes(token));
  });
  if (unsafeNames.length) throw new Error(`PII-like customer filenames found: ${unsafeNames.join(', ')}`);
  console.log(`QUALITY PASS · ${product} · ${final ? 'final' : 'proof'} · ${expected.length} verified customer artifacts`);
}

main().catch((error) => {
  console.error(`QUALITY FAIL: ${error.message}`);
  process.exit(1);
});
