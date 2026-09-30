/** Private renderer assets are pinned separately from the visitor-facing site. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const surfaceRoot = resolve(here, 'studio-render');
const publicRoot = resolve(here, '../website');
const manifest = JSON.parse(readFileSync(resolve(surfaceRoot, 'manifest.json'), 'utf8'));
const assets = new Map(manifest.files.map(entry => [entry.path, entry]));
if (assets.size !== manifest.files.length) throw new Error('Private renderer manifest has duplicate paths');

export function readStudioRenderAsset(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\\') ||
      relativePath.startsWith('/') || relativePath.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Private renderer asset path is invalid');
  }
  const entry = assets.get(relativePath);
  if (!entry) throw new Error('Private renderer asset is outside the pinned inventory');
  const file = resolve(surfaceRoot, entry.source);
  const allowedRoot = entry.source.startsWith('snapshot/') ? resolve(surfaceRoot, 'snapshot') : publicRoot;
  if (!(entry.source.startsWith('snapshot/') || entry.source.startsWith('../../website/')) || !file.startsWith(allowedRoot + sep)) {
    throw new Error('Private renderer source escaped its allowed root');
  }
  const bytes = readFileSync(file);
  const exact = bytes.length === entry.bytes && createHash('sha256').update(bytes).digest('hex') === entry.sha256;
  // Git may check text out with CRLF or LF. Permit only that parser-equivalent
  // difference; binary assets and every other source byte remain pinned.
  const canonical = !exact && entry.lfSha256 ? Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1') : null;
  const lineEndingsOnly = canonical && canonical.length === entry.lfBytes && createHash('sha256').update(canonical).digest('hex') === entry.lfSha256;
  if (!exact && !lineEndingsOnly) {
    throw new Error(`Private renderer asset changed: ${relativePath}; review and repin before rendering`);
  }
  return { file, bytes };
}

export function verifyStudioRenderSurface() {
  for (const entry of manifest.files) readStudioRenderAsset(entry.path);
  return { files: assets.size, acceptedSourceBundleSha256: manifest.acceptedSourceBundleSha256 };
}
