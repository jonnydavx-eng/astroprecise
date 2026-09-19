import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import JSZip from 'jszip';

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
