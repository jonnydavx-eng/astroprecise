import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import JSZip from 'jszip';
import sharp from 'sharp';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PACKAGE_SCRIPT = resolve(process.env.AP_PACKAGE_TEST_SCRIPT || join(ROOT, 'tools/package-studio-order.mjs'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const PRODUCT = 'natal-sky-print-pack';
const PRODUCT_FILES = [
  'natal-sky-home-print-a3.pdf',
  'natal-sky-home-print-a4.pdf',
  '01-natal-print-4960x7016.png',
  '02-natal-square-2160x2160.png',
  '03-natal-story-2160x3840.png',
  '04-phone-wallpaper-1080x1920.png',
  '05-big-three-1080x1080.png',
];
const DOC_FILES = ['README.txt', 'PERSONAL-USE-LICENCE.txt', 'PRINT-GUIDE.txt', 'THIRD-PARTY-CREDITS.txt'];

function snapshot(dir) {
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).map(entry => ({
    name: entry.name,
    ...(entry.isDirectory() ? { directory: snapshot(join(dir, entry.name)) } : { sha256: sha256(readFileSync(join(dir, entry.name))) }),
  }));
}

function fixture() {
  const root = mkdtempSync(join(ROOT, '.package-args-test-'));
  const invokingDirectory = join(root, 'invoking-directory');
  mkdirSync(invokingDirectory);
  // Packaging needs a fictional self-order, independent of legacy render templates.
  const order = {
    orderId: 'FICTIONAL-PACKAGING-TEST',
    product: PRODUCT,
    purchaseIntent: 'self',
    sampleMode: 'fictional',
    name: 'Aurora Vale',
    email: 'buyer@example.test',
  };
  const inputPath = join(root, 'fictional-order.json');
  writeFileSync(inputPath, JSON.stringify(order));
  for (const name of DOC_FILES) writeFileSync(join(invokingDirectory, name), `Existing document must survive: ${name}\n`);
  return {
    root, invokingDirectory, order,
    args: ['--in', inputPath, '--product', PRODUCT, '--mode', 'proof', '--input-hash', sha256(JSON.stringify(order))],
    cleanup() {
      assert.equal(dirname(root), ROOT);
      assert.ok(root.startsWith(join(ROOT, '.package-args-test-')));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

for (const [name, directoryArgs] of [
  ['missing', []],
  ['empty', ['--dir', '']],
  ['whitespace', ['--dir', '   ']],
  ['non-string bare flag', ['--dir']],
]) {
  test(`reject ${name} --dir before changing any files`, () => {
    const data = fixture();
    try {
      const before = snapshot(data.root);
      const result = spawnSync(process.execPath, [PACKAGE_SCRIPT, ...data.args, ...directoryArgs], {
        cwd: data.invokingDirectory, encoding: 'utf8', timeout: 15_000,
      });
      assert.equal(result.error, undefined);
      assert.notEqual(result.status, 0, 'invalid directory argument must fail');
      assert.deepEqual(snapshot(data.root), before, 'invalid directory argument changed files');
      assert.match(`${result.stdout}${result.stderr}`, /--dir requires an explicit nonblank directory path/);
    } finally {
      data.cleanup();
    }
  });
}

test('explicit output directory preserves invoking files and packages the exact fictional artifact bytes', async () => {
  const data = fixture();
  try {
    const output = join(data.root, 'explicit output');
    mkdirSync(output);
    // These are deliberately dummy bytes: this test verifies packaging, not artwork rendering.
    for (const name of PRODUCT_FILES) writeFileSync(join(output, name), `FICTIONAL PACKAGING TEST ONLY\n${name}\n`);
    const before = snapshot(data.invokingDirectory);
    const result = spawnSync(process.execPath, [PACKAGE_SCRIPT, ...data.args, '--dir', output], {
      cwd: data.invokingDirectory, encoding: 'utf8', timeout: 15_000,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.deepEqual(snapshot(data.invokingDirectory), before, 'explicit output changed invoking files');

    const files = [...PRODUCT_FILES, ...DOC_FILES].sort();
    const expectedEntries = [...files, 'CUSTOMER-MANIFEST.json'].sort();
    const zipName = `astroprecise-${PRODUCT}.zip`;
    const zip = await JSZip.loadAsync(readFileSync(join(output, zipName)), { checkCRC32: true });
    assert.deepEqual(Object.keys(zip.files).sort(), expectedEntries);
    const customerManifest = JSON.parse(readFileSync(join(output, 'CUSTOMER-MANIFEST.json'), 'utf8'));
    assert.equal(customerManifest.mode, 'proof');
    assert.equal(customerManifest.product, PRODUCT);
    assert.deepEqual(customerManifest.files.map(entry => entry.file).sort(), files);
    for (const entry of customerManifest.files) {
      const disk = readFileSync(join(output, entry.file));
      assert.equal(entry.bytes, disk.length);
      assert.equal(entry.sha256, sha256(disk));
      assert.deepEqual(await zip.file(entry.file).async('nodebuffer'), disk);
    }
    assert.deepEqual(await zip.file('CUSTOMER-MANIFEST.json').async('nodebuffer'), readFileSync(join(output, 'CUSTOMER-MANIFEST.json')));
    const fulfilment = JSON.parse(readFileSync(join(output, 'fulfilment-manifest.json'), 'utf8'));
    assert.equal(fulfilment.mode, 'proof');
    assert.equal(fulfilment.product, PRODUCT);
    assert.equal(fulfilment.inputHash, sha256(JSON.stringify(data.order)));
    assert.equal(fulfilment.customerManifestHash, sha256(readFileSync(join(output, 'CUSTOMER-MANIFEST.json'))));
    assert.deepEqual(fulfilment.artifacts.map(entry => entry.file).sort(), [...expectedEntries, zipName].sort());
    for (const entry of fulfilment.artifacts) {
      const bytes = readFileSync(join(output, entry.file));
      assert.equal(entry.bytes, bytes.length);
      assert.equal(entry.sha256, sha256(bytes));
    }
    assert.match(readFileSync(join(output, 'THIRD-PARTY-CREDITS.txt'), 'utf8'), /THIRD-PARTY CREDITS/);
  } finally {
    data.cleanup();
  }
});

// Whole Sky: the Observatory still is sold as exactly 4800 x 3600. The packager reads
// the PNG's real IHDR size and refuses any other size before writing anything.
const WHOLE_SKY = 'whole-sky-edition';
const STILL = '06-observatory-birth-hour-schematic-4800x3600.png';
const WHOLE_SKY_FILES = [...new Set([
  'personal-sky-keepsake-screen.pdf', 'personal-sky-keepsake-print.pdf', ...PRODUCT_FILES,
])];

async function wholeSkyFixture(stillBytes) {
  const root = mkdtempSync(join(ROOT, '.package-args-test-'));
  const order = { orderId: 'FICTIONAL-WHOLE-SKY-TEST', product: WHOLE_SKY, purchaseIntent: 'self', sampleMode: 'fictional', name: 'Aurora Vale', email: 'buyer@example.test' };
  const inputPath = join(root, 'fictional-order.json');
  writeFileSync(inputPath, JSON.stringify(order));
  const output = join(root, 'out');
  mkdirSync(output);
  for (const name of WHOLE_SKY_FILES) writeFileSync(join(output, name), `FICTIONAL PACKAGING TEST ONLY\n${name}\n`);
  if (stillBytes) writeFileSync(join(output, STILL), stillBytes);
  return {
    root, output,
    args: ['--in', inputPath, '--product', WHOLE_SKY, '--mode', 'proof', '--input-hash', sha256(JSON.stringify(order)), '--dir', output],
    cleanup() {
      assert.ok(root.startsWith(join(ROOT, '.package-args-test-')));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

const blankPng = (width, height) => sharp({ create: { width, height, channels: 3, background: '#07101e' } }).png({ compressionLevel: 1 }).toBuffer();

for (const [name, make, message] of [
  ['the old 2880 x 1164 window-sized still', () => blankPng(2880, 1164), /is 2880x1164, not exactly 4800x3600/],
  ['a portrait 3600 x 4800 still', () => blankPng(3600, 4800), /is 3600x4800, not exactly 4800x3600/],
  ['a still one pixel short', () => blankPng(4800, 3599), /is 4800x3599, not exactly 4800x3600/],
  ['a JPEG named .png', () => sharp({ create: { width: 4800, height: 3600, channels: 3, background: '#000' } }).jpeg().toBuffer(), /is not a PNG/],
]) {
  test(`reject ${name} as the Whole Sky Observatory still before writing anything`, async () => {
    const data = await wholeSkyFixture(await make());
    try {
      const before = snapshot(data.root);
      const result = spawnSync(process.execPath, [PACKAGE_SCRIPT, ...data.args], { encoding: 'utf8', timeout: 30_000 });
      assert.equal(result.error, undefined);
      assert.notEqual(result.status, 0, 'wrong-size still must fail');
      assert.match(`${result.stdout}${result.stderr}`, message);
      assert.deepEqual(snapshot(data.root), before, 'a rejected still changed files');
    } finally {
      data.cleanup();
    }
  });
}

test('package a Whole Sky order whose Observatory still is exactly 4800 x 3600', async () => {
  const data = await wholeSkyFixture(await blankPng(4800, 3600));
  try {
    const result = spawnSync(process.execPath, [PACKAGE_SCRIPT, ...data.args], { encoding: 'utf8', timeout: 30_000 });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const manifest = JSON.parse(readFileSync(join(data.output, 'CUSTOMER-MANIFEST.json'), 'utf8'));
    assert.ok(manifest.files.some((entry) => entry.file === STILL));
    const zip = await JSZip.loadAsync(readFileSync(join(data.output, `astroprecise-${WHOLE_SKY}.zip`)), { checkCRC32: true });
    const png = await zip.file(STILL).async('nodebuffer');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [4800, 3600]);
  } finally {
    data.cleanup();
  }
});

test('a Whole Sky order with no Observatory still still fails as a missing file', async () => {
  const data = await wholeSkyFixture(null);
  try {
    const result = spawnSync(process.execPath, [PACKAGE_SCRIPT, ...data.args], { encoding: 'utf8', timeout: 30_000 });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Missing required customer file: 06-observatory-birth-hour-schematic-4800x3600\.png/);
  } finally {
    data.cleanup();
  }
});
