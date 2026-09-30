import assert from 'node:assert/strict';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertNoReparsePath,
  assertSecureExternalFile,
  assertSecurePrivateRoot,
  buildFulfilChildEnv,
  ensureContainedDirectory,
  ensureSecureExternalDirectory,
  resolveContainedPath,
} from './tools/fulfil-security.mjs';
import { ROOT } from './tools/fulfil-shared.mjs';

const childEnv = buildFulfilChildEnv({
  AP_STUDIO_MODE: 'proof',
  AP_STUDIO_INPUT_HASH: 'a'.repeat(64),
}, {
  PATH: 'safe-path',
  TEMP: 'safe-temp',
  AP_EDGE_PATH: 'C:/safe/edge.exe',
  AP_PAYMENT_ADAPTER_SECRET: 'do-not-leak',
  CLOUDFLARE_API_TOKEN: 'do-not-leak',
  NODE_OPTIONS: '--require malicious.js',
});
assert.equal(childEnv.PATH, 'safe-path');
assert.equal(childEnv.AP_EDGE_PATH, 'C:/safe/edge.exe');
assert.equal(childEnv.AP_PRIVATE_FULFILMENT, '1');
assert.equal(childEnv.AP_STUDIO_MODE, 'proof');
assert.equal(childEnv.AP_PAYMENT_ADAPTER_SECRET, undefined, 'payment secret must not cross the renderer boundary');
assert.equal(childEnv.CLOUDFLARE_API_TOKEN, undefined, 'unrelated API secrets must not cross the renderer boundary');
assert.equal(childEnv.NODE_OPTIONS, undefined, 'parent code-injection options must not cross the renderer boundary');
assert.throws(() => buildFulfilChildEnv({ AP_PAYMENT_ADAPTER_SECRET: 'x' }, {}), /not allowed/i);
assert.doesNotMatch(readFileSync('tools/fulfil-order.mjs', 'utf8'), /env:\s*\{\s*\.\.\.process\.env/, 'orchestrator must not forward the parent environment');

function restrictTestRoot(path) {
  if (process.platform === 'win32') {
    execFileSync('icacls.exe', [path, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:(OI)(CI)F`, '/grant:r', 'SYSTEM:(OI)(CI)F'], { stdio: 'pipe' });
  } else {
    chmodSync(path, 0o700);
  }
}

const temp = mkdtempSync(join(tmpdir(), 'ap-security-v902-'));
try {
  const privateRoot = join(temp, 'private-orders');
  mkdirSync(privateRoot, { mode: 0o700 });
  restrictTestRoot(privateRoot);
  assert.equal(assertSecurePrivateRoot(privateRoot, { repositoryRoot: ROOT }), assertNoReparsePath(privateRoot));
  if (process.platform === 'win32') {
    assert.throws(
      () => assertSecurePrivateRoot('C:\\Users\\Public', { repositoryRoot: ROOT }),
      /ACL is not private|unexpected access/i,
      'a shared Windows directory must never be accepted for customer PII',
    );
    const permissiveRoot = join(temp, 'permissive-child-root');
    mkdirSync(permissiveRoot, { mode: 0o700 });
    restrictTestRoot(permissiveRoot);
    const permissiveChild = join(permissiveRoot, 'incoming');
    mkdirSync(permissiveChild);
    execFileSync('icacls.exe', [permissiveChild, '/grant', 'BUILTIN\\Users:(OI)(CI)RX'], { stdio: 'pipe' });
    assert.throws(
      () => assertSecurePrivateRoot(permissiveRoot, { repositoryRoot: ROOT }),
      /ACL is not private|unexpected access/i,
      'a permissive pre-existing child DACL must invalidate the whole private tree',
    );

    const nonInheritingRoot = join(temp, 'non-inheriting-private-root');
    mkdirSync(nonInheritingRoot, { mode: 0o700 });
    execFileSync('icacls.exe', [
      nonInheritingRoot,
      '/inheritance:r',
      '/grant:r', `${process.env.USERNAME}:F`,
      '/grant:r', 'SYSTEM:F',
    ], { stdio: 'pipe' });
    assert.doesNotThrow(
      () => assertSecurePrivateRoot(nonInheritingRoot, { repositoryRoot: ROOT }),
      'the empty root itself is private even though its ACEs do not inherit',
    );
    const hardenedChild = ensureContainedDirectory(nonInheritingRoot, 'orders/customer', {
      label: 'Non-inheriting private child',
    });
    assert.doesNotThrow(
      () => assertSecurePrivateRoot(hardenedChild, { repositoryRoot: ROOT }),
      'every created component must receive and pass an explicit private ACL before it is returned',
    );
  }

  const sharedExternal = join(temp, 'shared-external');
  mkdirSync(sharedExternal, { mode: 0o755 });
  if (process.platform === 'win32') {
    execFileSync('icacls.exe', [sharedExternal, '/grant', 'BUILTIN\\Users:(OI)(CI)RX'], { stdio: 'pipe' });
  } else {
    chmodSync(sharedExternal, 0o755);
  }
  const sharedInput = join(sharedExternal, 'real-person-order.json');
  writeFileSync(sharedInput, '{}');
  assert.throws(
    () => assertSecureExternalFile(sharedInput, { repositoryRoot: ROOT, label: 'Non-fictional proof input' }),
    /ACL is not private|group or other|unexpected access/i,
    'a real-person proof input may not come from a shared external directory',
  );
  assert.throws(
    () => ensureSecureExternalDirectory(join(sharedExternal, 'proof-output'), { repositoryRoot: ROOT, label: 'Non-fictional proof output' }),
    /ACL is not private|group or other|unexpected access/i,
    'a real-person proof output may not inherit a shared external ACL',
  );

  const incoming = ensureContainedDirectory(privateRoot, 'incoming', { label: 'Incoming records' });
  const input = join(incoming, 'order.json');
  writeFileSync(input, '{}');
  assert.equal(resolveContainedPath(privateRoot, input, { mustExist: true, kind: 'file' }), input);
  assert.throws(() => resolveContainedPath(privateRoot, join(privateRoot, '..', 'escape.json')), /escapes/i);
  assert.throws(() => resolveContainedPath(privateRoot, privateRoot), /escapes/i, 'the root itself is not an order file/output');

  const nested = ensureContainedDirectory(privateRoot, 'orders/order-abcdef', { label: 'Order output' });
  assert.equal(resolveContainedPath(privateRoot, nested, { mustExist: true, kind: 'directory' }), nested);

  const outside = join(temp, 'outside');
  mkdirSync(outside);
  const linked = join(privateRoot, 'linked-outside');
  let linkCreated = false;
  try {
    symlinkSync(outside, linked, process.platform === 'win32' ? 'junction' : 'dir');
    linkCreated = true;
  } catch (error) {
    if (!['EPERM', 'EACCES', 'UNKNOWN'].includes(error?.code)) throw error;
  }
  if (linkCreated) {
    assert.throws(() => resolveContainedPath(privateRoot, join(linked, 'stolen.json')), /symbolic link|reparse|physically escapes/i);
    assert.throws(() => assertSecurePrivateRoot(linked, { repositoryRoot: ROOT }), /symbolic link|reparse|alias/i);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('PASS fulfil security: child env allowlist and reparse-safe containment');
