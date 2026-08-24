#!/usr/bin/env node
/** Capture the real authored birth-hour Observatory view and stamp it SCHEMATIC. */
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, createReadStream, renameSync } from 'fs';
import { extname, isAbsolute, join, normalize, relative as pathRelative, resolve } from 'path';
import { createRequire } from 'module';
import sharp from 'sharp';
import { canonicalizeStudioOrder, isPaidOrder, loadEngines, parseArgs, ROOT, sha256 } from './fulfil-shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const OUTPUT = '06-observatory-birth-hour-schematic-4800x3600.png';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary' };

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

async function watermarkProof(path, fictional) {
  const width = 4800;
  const height = 3600;
  const primary = fictional ? 'FICTIONAL SAMPLE' : 'PROOF';
  const footer = fictional ? 'FICTIONAL SAMPLE · NOT A CUSTOMER FILE' : 'PROOF · NOT A CUSTOMER FILE';
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="translate(${width / 2} ${height / 2}) rotate(-20)">
      <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="700" font-size="430" letter-spacing="34" fill="#EEF4FA" fill-opacity=".24" stroke="#040812" stroke-opacity=".48" stroke-width="9">${primary}</text>
    </g>
    <rect x="0" y="3380" width="${width}" height="220" fill="#040812" fill-opacity=".9"/>
    <text x="120" y="3510" font-family="Arial, sans-serif" font-weight="700" font-size="74" letter-spacing="9" fill="#8BA9FF">${footer}</text>
    <rect x="0" y="3588" width="${width}" height="12" fill="#8BA9FF"/>
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

function writeRasterManifest(out, order, final, artifact) {
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
  byFile.set(artifact.file, artifact);
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
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) throw new Error('Usage: capture-observatory-still.mjs --in <private canonical order.json> --out <private directory>');
  const order = canonicalizeStudioOrder(JSON.parse(readFileSync(resolve(args.in), 'utf8')));
  const final = isPaidOrder(order, { checkoutVerified: process.env.AP_CHECKOUT_VERIFIED === '1' });
  const fictional = /^FICTIONAL(?:[-_]|$)/i.test(String(order.orderId || ''));
  const out = resolve(args.out);
  mkdirSync(out, { recursive: true });
  const { E } = loadEngines();
  const jd = E.julianDay(order.utc.y, order.utc.mo, order.utc.d, order.utc.h, order.utc.mi, 0);
  const contextLabel = {
    // The shared caption formats to the minute; a half-second display epsilon
    // avoids 02:41:59.999 floating-point truncation for an exact 02:42 instant.
    jd: jd + 0.5 / 86_400,
    birthDate: `${order.y}-${String(order.mo).padStart(2, '0')}-${String(order.d).padStart(2, '0')}`,
    birthTime: `${String(order.h).padStart(2, '0')}:${String(order.mi).padStart(2, '0')}`,
    timeKnown: true,
    timeAccuracy: 'exact',
    place: order.place,
    timezone: order.tz,
  };
  const { server, base } = await localServer();
  const browser = await chromium.launch({ executablePath: edgePath(), headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, acceptDownloads: true, serviceWorkers: 'block', locale: 'en-GB' });
  const problems = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.protocol === 'data:' || url.protocol === 'blob:') await route.continue();
    else { problems.push(`external request blocked: ${url.origin}`); await route.abort(); }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  const outputPath = join(out, OUTPUT);
  try {
    await page.goto(`${base}/index.html?nosw=1`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => window.Orrery3D && window.APKeepSky && typeof window.Orrery3D.captureBirthHourStill === 'function', null, { timeout: 60_000 });
    await page.evaluate(async () => {
      await window.Orrery3D.whenReady();
      await window.Orrery3D.whenEarthReady();
      await window.Orrery3D.whenSceneReady({ urgent: true });
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const downloadPromise = page.waitForEvent('download', { timeout: 120_000 });
    await page.evaluate(async ({ captureJd, stampContext, filename }) => {
      const canvas = window.Orrery3D.captureBirthHourStill({ jd: captureJd, timeKnown: true, scale: 3 });
      if (!canvas) throw new Error('Orrery capture returned no canvas');
      window.APKeepSky.stampSurfaceA(canvas, stampContext);
      const blob = await new Promise((resolveBlob, reject) => canvas.toBlob((value) => value ? resolveBlob(value) : reject(new Error('PNG encoding failed')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    }, { captureJd: jd, stampContext: contextLabel, filename: OUTPUT });
    const download = await downloadPromise;
    await download.saveAs(outputPath);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
  if (problems.length) throw new Error(problems.join(' | '));
  if (!final) await watermarkProof(outputPath, fictional);
  await stampProvenance(outputPath, 4800, 3600, process.env.AP_STUDIO_PROVENANCE_REF);
  const info = pngInfo(outputPath);
  if (info.width !== 4800 || info.height !== 3600) throw new Error(`${OUTPUT} is ${info.width}x${info.height}; expected 4800x3600`);
  writeRasterManifest(out, order, final, { file: OUTPUT, width: info.width, height: info.height, bytes: info.bytes, sha256: info.sha256 });
  console.log(`captured SCHEMATIC Observatory still · ${info.width}x${info.height} · ${info.sha256.slice(0, 12)}`);
}

main().catch((error) => {
  console.error(`Observatory capture failed: ${error.message}`);
  process.exit(1);
});
