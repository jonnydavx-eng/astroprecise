#!/usr/bin/env node
/** Generate the five real chart-page PNG formats for a private Studio order. */
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, createReadStream, renameSync } from 'fs';
import { extname, isAbsolute, join, normalize, relative as pathRelative, resolve } from 'path';
import { createRequire } from 'module';
import sharp from 'sharp';
import { canonicalizeStudioOrder, isPaidOrder, loadEngines, parseArgs, ROOT, sha256 } from './fulfil-shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const FORMATS = [
  ['print', '01-natal-print-4960x7016.png', 4960, 7016],
  ['square', '02-natal-square-2160x2160.png', 2160, 2160],
  ['story', '03-natal-story-2160x3840.png', 2160, 3840],
  ['wallpaper', '04-phone-wallpaper-1080x1920.png', 1080, 1920],
  ['bigthree', '05-big-three-1080x1080.png', 1080, 1080],
];

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

function edgePath() {
  const candidates = [process.env.AP_EDGE_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Microsoft Edge not found; set AP_EDGE_PATH');
  return found;
}

function pngInfo(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length, sha256: sha256(bytes) };
}

async function watermarkProof(path, width, height, fictional) {
  const size = Math.round(Math.min(width, height) * 0.14);
  const badge = Math.max(28, Math.round(width * 0.018));
  const primary = fictional ? 'FICTIONAL SAMPLE' : 'PROOF';
  const footer = fictional ? 'FICTIONAL SAMPLE · NOT A CUSTOMER FILE' : 'PROOF · NOT A CUSTOMER FILE';
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="translate(${width / 2} ${height / 2}) rotate(-22)">
      <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${size}" letter-spacing="${Math.round(size * 0.08)}" fill="#EEF4FA" fill-opacity=".22" stroke="#040812" stroke-opacity=".4" stroke-width="${Math.max(2, Math.round(size * 0.02))}">${primary}</text>
    </g>
    <rect x="0" y="${height - badge * 2.2}" width="${width}" height="${badge * 2.2}" fill="#040812" fill-opacity=".88"/>
    <text x="${Math.round(width * 0.025)}" y="${height - badge * 0.72}" font-family="Arial, sans-serif" font-weight="700" font-size="${badge}" letter-spacing="${Math.round(badge * 0.1)}" fill="#8BA9FF">${footer}</text>
    <rect x="0" y="${height - 12}" width="${width}" height="12" fill="#8BA9FF"/>
  </svg>`);
  const temp = `${path}.watermarked.png`;
  await sharp(path).composite([{ input: svg }]).png().toFile(temp);
  renameSync(temp, path);
}

async function stampProvenance(path, width, height, provenanceRef) {
  if (!/^AP-[A-F0-9]{16}$/.test(String(provenanceRef || ''))) return;
  const bits = [...`A57A901E${provenanceRef.slice(3)}`]
    .flatMap((hex) => Number.parseInt(hex, 16).toString(2).padStart(4, '0').split(''));
  const cell = 8;
  const stripX = 16;
  const stripY = height - 28;
  const fontSize = Math.max(18, Math.round(width * 0.009));
  const cells = bits.map((bit, index) => `<rect x="${stripX + index * cell}" y="${stripY}" width="${cell}" height="8" fill="${bit === '1' ? '#8BA9FF' : '#27415C'}"/>`).join('');
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="${width - Math.round(width * 0.34)}" y="${height - fontSize * 2.4}" width="${Math.round(width * 0.34)}" height="${fontSize * 1.7}" fill="#040812" fill-opacity=".86"/>
    <text x="${width - Math.round(width * 0.022)}" y="${height - fontSize * 0.95}" text-anchor="end" font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}" letter-spacing="${Math.max(2, Math.round(fontSize * 0.1))}" fill="#8BA9FF">AP REF ${provenanceRef}</text>
    ${cells}
  </svg>`);
  const temp = `${path}.provenance.png`;
  await sharp(path).composite([{ input: svg }]).png().toFile(temp);
  renameSync(temp, path);
}

function writeRasterManifest(out, order, final, artifacts) {
  const inputHash = String(process.env.AP_STUDIO_INPUT_HASH || '').toLowerCase();
  const provenanceRef = String(process.env.AP_STUDIO_PROVENANCE_REF || '');
  if (!/^[a-f0-9]{64}$/.test(inputHash) || !/^AP-[A-F0-9]{16}$/.test(provenanceRef)) return;
  const binding = {
    inputHash,
    orderRefHash: sha256(String(order.orderId || '')).slice(0, 16),
    product: order.product,
    mode: final ? 'final' : 'proof',
    provenanceRef,
  };
  const manifestPath = join(out, 'raster-manifest.json');
  let manifest = { schema: 'astroprecise-studio-raster-v901', binding, artifacts: [] };
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.schema !== 'astroprecise-studio-raster-v901' || JSON.stringify(manifest.binding) !== JSON.stringify(binding)) {
      throw new Error('Raster manifest binding does not match this order');
    }
  }
  const byFile = new Map((manifest.artifacts || []).map((entry) => [entry.file, entry]));
  for (const artifact of artifacts) byFile.set(artifact.file, artifact);
  manifest.artifacts = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

async function localServer() {
  const root = resolve(ROOT, 'website');
  const server = createServer((req, res) => {
    try {
      const requestPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
      const file = normalize(join(root, relative));
      const rel = pathRelative(root, file);
      if (rel.startsWith('..') || isAbsolute(rel) || !existsSync(file) || !statSync(file).isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found'); return;
      }
      res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain' }); res.end('bad request');
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  return { server, base: `http://127.0.0.1:${address.port}` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) throw new Error('Usage: generate-natal-print-pack.mjs --in <private canonical order.json> --out <private directory>');
  const order = canonicalizeStudioOrder(JSON.parse(readFileSync(resolve(args.in), 'utf8')));
  const final = isPaidOrder(order, { checkoutVerified: process.env.AP_CHECKOUT_VERIFIED === '1' });
  const fictional = /^FICTIONAL(?:[-_]|$)/i.test(String(order.orderId || ''));
  const out = resolve(args.out);
  mkdirSync(out, { recursive: true });
  const { E } = loadEngines();
  const expectedJd = E.julianDay(order.utc.y, order.utc.mo, order.utc.d, order.utc.h, order.utc.mi, 0);
  const restore = new URLSearchParams({
    n: order.name,
    d: `${order.y}-${String(order.mo).padStart(2, '0')}-${String(order.d).padStart(2, '0')}`,
    t: `${String(order.h).padStart(2, '0')}:${String(order.mi).padStart(2, '0')}`,
    a: 'exact', c: order.place, lat: String(order.lat), lon: String(order.lon), tz: order.tz,
    hs: order.house || 'placidus',
  }).toString();
  const { server, base } = await localServer();
  const browser = await chromium.launch({ executablePath: edgePath(), headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, serviceWorkers: 'block', locale: 'en-GB' });
  const problems = [];
  await context.addInitScript((value) => sessionStorage.setItem('ap-chart-restore', value), restore);
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') await route.continue();
    else { problems.push(`external request blocked: ${url.origin}`); await route.abort(); }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  const artifacts = [];
  try {
    await page.goto(`${base}/chart.html?nosw=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector('#chart-result:not(.hidden) #natal-wheel svg', { state: 'visible', timeout: 30_000 });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    const handoff = await page.evaluate(() => JSON.parse(sessionStorage.getItem('ap-sitting-handoff') || 'null'));
    if (!handoff || !Number.isFinite(handoff.jd) || Math.abs(handoff.jd - expectedJd) > 1e-7) {
      throw new Error(`Chart-page UTC/JD mismatch: expected ${expectedJd}, received ${handoff?.jd}`);
    }
    if ((await page.url()).includes(order.name) || (await page.url()).includes(String(order.y))) throw new Error('Birth data leaked into the chart URL');
    const more = page.locator('.chart-sitting-more > summary');
    if (await more.count()) await more.click();
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });

    for (const [format, filename, width, height] of FORMATS) {
      await page.locator('#poster-btn').click();
      const downloadPromise = page.waitForEvent('download', { timeout: 90_000 });
      await page.locator(`#share-format-menu button[data-fmt="${format}"]`).click();
      const download = await downloadPromise;
      const outputPath = join(out, filename);
      await download.saveAs(outputPath);
      if (!final) await watermarkProof(outputPath, width, height, fictional);
      await stampProvenance(outputPath, width, height, process.env.AP_STUDIO_PROVENANCE_REF);
      const info = pngInfo(outputPath);
      if (info.width !== width || info.height !== height) throw new Error(`${filename} is ${info.width}x${info.height}; expected ${width}x${height}`);
      artifacts.push({ file: filename, ...info });
    }
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
  if (problems.length) throw new Error(problems.join(' | '));
  writeRasterManifest(out, order, final, artifacts);
  console.log(`generated ${artifacts.length} private chart PNGs · jd ${expectedJd.toFixed(8)} · no birth data in URL`);
  return artifacts;
}

main().catch((error) => {
  console.error(`Print-pack generation failed: ${error.message}`);
  process.exit(1);
});
