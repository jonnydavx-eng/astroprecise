/** Content-addressed, immutable copies of the records authorising fulfilment. */
import { chmodSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  ensureContainedDirectory,
  resolveContainedPath,
  writeNewFileSync,
} from './fulfil-security.mjs';

export const EVIDENCE_SCHEMA = 'astroprecise-studio-evidence-v902';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function nowIso(clock = Date.now) {
  const raw = typeof clock === 'function' ? clock() : clock?.now ? clock.now() : clock;
  const value = raw instanceof Date ? raw.getTime() : Number(raw);
  if (!Number.isFinite(value)) throw new Error('Evidence clock did not return a finite time');
  return new Date(value).toISOString();
}

function evidenceKind(value) {
  const kind = String(value || '').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(kind)) throw new Error('Evidence kind must be a safe non-identifying label');
  return kind;
}

/**
 * Copy evidence bytes into objects/<sha256>. Source paths are deliberately not
 * retained in the manifest because private directory names can contain PII.
 */
export function captureEvidenceBundle(targetPrivateDirectory, sources, { clock = Date.now } = {}) {
  if (!Array.isArray(sources) || !sources.length) throw new Error('At least one evidence source is required');
  const evidenceRoot = ensureContainedDirectory(targetPrivateDirectory, 'evidence', { label: 'Evidence directory' });
  const objectRoot = ensureContainedDirectory(evidenceRoot, 'objects', { label: 'Evidence object directory' });
  const records = [];
  const seenKinds = new Set();
  for (const source of sources) {
    const kind = evidenceKind(source?.kind);
    if (seenKinds.has(kind)) throw new Error(`Duplicate evidence kind: ${kind}`);
    seenKinds.add(kind);
    const hasBytes = Buffer.isBuffer(source?.bytes) || typeof source?.bytes === 'string';
    if (hasBytes && (source?.root != null || source?.path != null)) throw new Error(`${kind} evidence must use either exact bytes or a source path`);
    if (!hasBytes && !source?.root) throw new Error(`${kind} evidence source root is required`);
    const bytes = hasBytes
      ? Buffer.from(source.bytes)
      : readFileSync(resolveContainedPath(source.root, source.path, {
        label: `${kind} evidence`, mustExist: true, kind: 'file',
      }));
    const digest = sha256(bytes);
    if (source.expectedHash != null && digest !== String(source.expectedHash).toLowerCase()) {
      throw new Error(`${kind} evidence content hash does not match its authorised record`);
    }
    const objectPath = join(objectRoot, digest);
    if (existsSync(objectPath)) {
      const existing = resolveContainedPath(objectRoot, digest, { label: `${kind} evidence object`, mustExist: true, kind: 'file' });
      if (sha256(readFileSync(existing)) !== digest) throw new Error('Existing content-addressed evidence object is corrupt');
    } else {
      writeNewFileSync(objectPath, bytes, { label: `${kind} evidence object` });
      try { chmodSync(objectPath, 0o400); } catch { /* Windows ACLs require separate owner proof. */ }
    }
    records.push({ kind, object: `objects/${digest}`, sha256: digest, bytes: bytes.length });
  }
  records.sort((a, b) => a.kind.localeCompare(b.kind));
  const manifest = {
    schema: EVIDENCE_SCHEMA,
    capturedAt: nowIso(clock),
    records,
  };
  const manifestBytes = JSON.stringify(manifest, null, 2) + '\n';
  const manifestPath = join(evidenceRoot, 'evidence-manifest.json');
  writeNewFileSync(manifestPath, manifestBytes, { label: 'Evidence manifest' });
  try { chmodSync(manifestPath, 0o400); } catch { /* Windows ACLs require separate owner proof. */ }
  return {
    evidenceRoot,
    manifestPath,
    manifestHash: sha256(manifestBytes),
    manifest,
  };
}

export function verifyEvidenceBundle(targetPrivateDirectory) {
  const evidenceRoot = resolveContainedPath(targetPrivateDirectory, 'evidence', { label: 'Evidence directory', mustExist: true, kind: 'directory' });
  const manifestPath = resolveContainedPath(evidenceRoot, 'evidence-manifest.json', { label: 'Evidence manifest', mustExist: true, kind: 'file' });
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  if (manifest.schema !== EVIDENCE_SCHEMA || !Array.isArray(manifest.records) || !manifest.records.length) throw new Error('Evidence manifest schema is invalid');
  if (Object.keys(manifest).sort().join(',') !== 'capturedAt,records,schema') throw new Error('Evidence manifest contains unsupported fields');
  const capturedAt = Date.parse(manifest.capturedAt);
  if (!Number.isFinite(capturedAt) || new Date(capturedAt).toISOString() !== manifest.capturedAt) throw new Error('Evidence manifest timestamp is invalid');
  const objectRoot = resolveContainedPath(evidenceRoot, 'objects', { label: 'Evidence object directory', mustExist: true, kind: 'directory' });
  const kinds = new Set();
  const expectedObjects = new Set();
  for (const record of manifest.records) {
    const kind = evidenceKind(record.kind);
    if (record.kind !== kind || Object.keys(record).sort().join(',') !== 'bytes,kind,object,sha256') throw new Error('Evidence record contains unsupported fields');
    if (kinds.has(kind)) throw new Error('Evidence manifest contains duplicate kinds');
    kinds.add(kind);
    if (!/^[a-f0-9]{64}$/.test(String(record.sha256 || '')) || record.object !== `objects/${record.sha256}`) {
      throw new Error('Evidence object address is invalid');
    }
    if (!Number.isInteger(record.bytes) || record.bytes < 0) throw new Error('Evidence object byte count is invalid');
    expectedObjects.add(record.sha256);
    const objectPath = resolveContainedPath(evidenceRoot, record.object, { label: `${kind} evidence object`, mustExist: true, kind: 'file' });
    const bytes = readFileSync(objectPath);
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) throw new Error(`${kind} evidence object failed integrity verification`);
  }
  const actualObjects = readdirSync(objectRoot).sort();
  if (JSON.stringify(actualObjects) !== JSON.stringify([...expectedObjects].sort())) throw new Error('Evidence object inventory contains an unrecorded or missing file');
  return { manifest, manifestPath, manifestHash: sha256(manifestBytes) };
}
