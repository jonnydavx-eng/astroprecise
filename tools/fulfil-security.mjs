/**
 * Filesystem and process boundaries for Studio fulfilment.
 *
 * Node does not expose portable openat/no-follow primitives on Windows, so the
 * boundary is deliberately conservative: every existing component is checked
 * for links/reparse aliases, physical and lexical containment are both proved,
 * and newly-created components are rechecked immediately after creation.
 */
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const CHILD_ENV_ALLOWLIST = Object.freeze([
  // Minimum platform/process environment needed by Node and headless Edge.
  'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC',
  'TEMP', 'TMP', 'TMPDIR', 'LOCALAPPDATA', 'APPDATA', 'USERPROFILE', 'HOME',
  'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432',
  'LANG', 'LC_ALL', 'TZ',
  // Explicit non-secret renderer configuration.
  'AP_EDGE_PATH',
]);

const CHILD_AP_KEYS = Object.freeze([
  'AP_PRIVATE_FULFILMENT',
  'AP_FULFILMENT_CAPABILITY',
  'AP_CHECKOUT_VERIFIED',
  'AP_STUDIO_INPUT_HASH',
  'AP_STUDIO_PROVENANCE_REF',
  'AP_STUDIO_MODE',
]);

function comparablePath(path) {
  let value = resolve(path).replace(/^\\\\\?\\/, '').replace(/[\\/]+$/, '');
  if (process.platform === 'win32') value = value.toLowerCase();
  return value;
}

function samePath(a, b) {
  return comparablePath(a) === comparablePath(b);
}

export function isPathWithin(root, candidate, { allowEqual = true } = {}) {
  const rel = relative(resolve(root), resolve(candidate));
  if (!rel) return allowEqual;
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function nearestExistingAncestor(path) {
  let cursor = resolve(path);
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error('No existing filesystem ancestor was found');
    cursor = parent;
  }
  return cursor;
}

function assertPrivateRootAccessBoundary(root, label, { recursive = true } = {}) {
  if (dirname(root) === root) throw new Error(`${label} cannot be a filesystem root`);
  if (process.platform !== 'win32') {
    const stat = statSync(root);
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) {
      throw new Error(`${label} must be owned by the fulfilment user`);
    }
    if ((stat.mode & 0o077) !== 0) {
      throw new Error(`${label} must not grant group or other filesystem access`);
    }
    return;
  }

  const systemRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows';
  const powershell = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$path = $env:AP_ACL_AUDIT_PATH',
    '$current = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value',
    "$ownerAllowed = @($current, 'S-1-5-18', 'S-1-5-32-544')",
    "$allowed = @($current, 'S-1-5-18', 'S-1-5-32-544', 'S-1-3-0', 'S-1-3-4')",
    "$items = if ($env:AP_ACL_AUDIT_RECURSIVE -eq '1') { @((Get-Item -LiteralPath $path -Force)) + @(Get-ChildItem -LiteralPath $path -Force -Recurse) } else { @((Get-Item -LiteralPath $path -Force)) }",
    'foreach ($item in $items) {',
    "  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { [Console]::Error.WriteLine('REPARSE:' + $item.FullName); exit 24 }",
    '  $acl = Get-Acl -LiteralPath $item.FullName',
    '  $owner = ([System.Security.Principal.NTAccount]$acl.Owner).Translate([System.Security.Principal.SecurityIdentifier]).Value',
    "  if ($ownerAllowed -notcontains $owner) { [Console]::Error.WriteLine('OWNER:' + $owner); exit 25 }",
    '  $bad = @($acl.GetAccessRules($true, $true, [System.Security.Principal.SecurityIdentifier]) | Where-Object { $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Allow -and $allowed -notcontains $_.IdentityReference.Value })',
    "  if ($bad.Count -gt 0) { $bad.IdentityReference.Value | Sort-Object -Unique | ForEach-Object { [Console]::Error.WriteLine('ACCESS:' + $_) }; exit 23 }",
    '}',
    "[Console]::Out.WriteLine('ACL-PRIVATE')",
  ].join('; ');
  const probeEnv = {};
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'PATHEXT', 'COMSPEC', 'USERPROFILE']) {
    if (process.env[key]) probeEnv[key] = process.env[key];
  }
  probeEnv.AP_ACL_AUDIT_PATH = root;
  probeEnv.AP_ACL_AUDIT_RECURSIVE = recursive ? '1' : '0';
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
    env: probeEnv,
  });
  if (result.status !== 0 || !String(result.stdout || '').includes('ACL-PRIVATE')) {
    const principals = String(result.stderr || '').trim().replace(/\s+/g, ', ');
    throw new Error(`${label} ACL is not private${principals ? `; unexpected access: ${principals}` : ''}`);
  }
}

/**
 * Give a newly-created Windows directory a protected, inheritable private DACL
 * before any customer material can be written below it. A private parent can
 * legally have non-inheritable ACEs, so relying on normal inheritance is not a
 * security boundary.
 */
function hardenPrivateDirectoryAccess(path, label, mode = 0o700) {
  if (process.platform !== 'win32') {
    chmodSync(path, mode);
    assertPrivateRootAccessBoundary(path, label);
    return;
  }

  const systemRoot = process.env.SystemRoot || process.env.SYSTEMROOT || 'C:\\Windows';
  const powershell = join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = [
    "$ErrorActionPreference = 'Stop'",
    '$path = $env:AP_ACL_SET_PATH',
    '$current = [System.Security.Principal.WindowsIdentity]::GetCurrent().User',
    "$system = [System.Security.Principal.SecurityIdentifier]::new('S-1-5-18')",
    '$rights = [System.Security.AccessControl.FileSystemRights]::FullControl',
    "$inherit = [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'",
    '$propagate = [System.Security.AccessControl.PropagationFlags]::None',
    '$allow = [System.Security.AccessControl.AccessControlType]::Allow',
    '$acl = [System.Security.AccessControl.DirectorySecurity]::new()',
    '$acl.SetAccessRuleProtection($true, $false)',
    '$acl.SetOwner($current)',
    '$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($current, $rights, $inherit, $propagate, $allow))',
    '$acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($system, $rights, $inherit, $propagate, $allow))',
    'Set-Acl -LiteralPath $path -AclObject $acl',
    "[Console]::Out.WriteLine('ACL-HARDENED')",
  ].join('; ');
  const probeEnv = {};
  for (const key of ['SystemRoot', 'SYSTEMROOT', 'WINDIR', 'PATH', 'PATHEXT', 'COMSPEC', 'USERPROFILE']) {
    if (process.env[key]) probeEnv[key] = process.env[key];
  }
  probeEnv.AP_ACL_SET_PATH = path;
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
    env: probeEnv,
  });
  if (result.status !== 0 || !String(result.stdout || '').includes('ACL-HARDENED')) {
    const detail = String(result.stderr || '').trim().replace(/\s+/g, ', ');
    throw new Error(`${label} could not be given a private ACL${detail ? `; ${detail}` : ''}`);
  }
  assertPrivateRootAccessBoundary(path, label, { recursive: false });
}

/** Reject symbolic links, junctions and other aliases in every existing part. */
export function assertNoReparsePath(path, { label = 'Path', mustExist = true } = {}) {
  const candidate = resolve(path);
  if (mustExist && !existsSync(candidate)) throw new Error(`${label} does not exist`);
  let cursor = nearestExistingAncestor(candidate);
  const existing = cursor;
  while (true) {
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink()) throw new Error(`${label} may not traverse a symbolic link or reparse point`);
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  const physical = realpathSync.native(existing);
  if (!samePath(physical, existing)) {
    throw new Error(`${label} may not traverse a filesystem alias or reparse point`);
  }
  return candidate;
}

export function assertSecurePrivateRoot(configured, { repositoryRoot, label = 'Private orders root' } = {}) {
  const text = String(configured || '').trim();
  if (!text || !isAbsolute(text)) throw new Error(`${label} must be an absolute existing directory`);
  const root = assertNoReparsePath(text, { label });
  if (!statSync(root).isDirectory()) throw new Error(`${label} must be a directory`);
  if (repositoryRoot) {
    const repo = assertNoReparsePath(repositoryRoot, { label: 'Repository root' });
    if (isPathWithin(repo, root)) throw new Error(`${label} must be outside the repository`);
    const repoPhysical = realpathSync.native(repo);
    const rootPhysical = realpathSync.native(root);
    if (isPathWithin(repoPhysical, rootPhysical)) throw new Error(`${label} must be physically outside the repository`);
  }
  const physicalRoot = realpathSync.native(root);
  assertPrivateRootAccessBoundary(physicalRoot, label);
  return physicalRoot;
}

/**
 * Resolve a path below a trusted existing root and prove both lexical and
 * physical containment. For a future path, every existing ancestor is checked.
 */
export function resolveContainedPath(root, candidate, {
  label = 'Path',
  mustExist = false,
  kind = null,
  allowRoot = false,
} = {}) {
  const rootPath = assertNoReparsePath(root, { label: `${label} root` });
  if (!statSync(rootPath).isDirectory()) throw new Error(`${label} root must be a directory`);
  const rootPhysical = realpathSync.native(rootPath);
  const resolved = resolve(rootPath, candidate);
  if (!isPathWithin(rootPath, resolved, { allowEqual: allowRoot })) throw new Error(`${label} escapes its private root`);
  assertNoReparsePath(resolved, { label, mustExist });
  const ancestor = nearestExistingAncestor(resolved);
  const physicalAncestor = realpathSync.native(ancestor);
  if (!isPathWithin(rootPhysical, physicalAncestor, { allowEqual: true })) throw new Error(`${label} physically escapes its private root`);
  const physicalCandidate = existsSync(resolved)
    ? realpathSync.native(resolved)
    : resolve(physicalAncestor, relative(ancestor, resolved));
  if (!isPathWithin(rootPhysical, physicalCandidate, { allowEqual: allowRoot })) throw new Error(`${label} physically escapes its private root`);
  if (mustExist) {
    const stat = statSync(physicalCandidate);
    if (kind === 'file' && !stat.isFile()) throw new Error(`${label} must be a file`);
    if (kind === 'directory' && !stat.isDirectory()) throw new Error(`${label} must be a directory`);
  }
  return physicalCandidate;
}

/** Create a path below a secure root one component at a time. */
export function ensureContainedDirectory(root, candidate, { label = 'Directory', mode = 0o700 } = {}) {
  const rootPhysical = realpathSync.native(assertNoReparsePath(root, { label: `${label} root` }));
  assertPrivateRootAccessBoundary(rootPhysical, `${label} root`, { recursive: false });
  const target = resolveContainedPath(rootPhysical, candidate, { label });
  const rel = relative(rootPhysical, target);
  let cursor = rootPhysical;
  for (const segment of rel.split(/[\\/]+/).filter(Boolean)) {
    cursor = resolve(cursor, segment);
    let created = false;
    if (!existsSync(cursor)) {
      try {
        mkdirSync(cursor, { mode });
        created = true;
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
      }
    }
    assertNoReparsePath(cursor, { label });
    if (!statSync(cursor).isDirectory()) throw new Error(`${label} contains a non-directory component`);
    if (created) hardenPrivateDirectoryAccess(cursor, label, mode);
    else assertPrivateRootAccessBoundary(cursor, label, { recursive: false });
  }
  return resolveContainedPath(rootPhysical, target, { label, mustExist: true, kind: 'directory' });
}

/** Validate a file that must remain outside the repository. */
export function assertSecureExternalFile(path, { repositoryRoot, label = 'Private input' } = {}) {
  const candidate = assertNoReparsePath(path, { label });
  if (!statSync(candidate).isFile()) throw new Error(`${label} must be a file`);
  const physical = realpathSync.native(candidate);
  const repo = realpathSync.native(assertNoReparsePath(repositoryRoot, { label: 'Repository root' }));
  if (isPathWithin(repo, physical)) throw new Error(`${label} must be outside the repository`);
  assertPrivateRootAccessBoundary(dirname(physical), `${label} directory`);
  return physical;
}

/** Create/validate an external proof directory without following aliases. */
export function ensureSecureExternalDirectory(path, { repositoryRoot, label = 'Private output', mode = 0o700 } = {}) {
  const candidate = resolve(path);
  const repo = realpathSync.native(assertNoReparsePath(repositoryRoot, { label: 'Repository root' }));
  if (isPathWithin(repo, candidate)) throw new Error(`${label} must be outside the repository`);
  assertNoReparsePath(candidate, { label, mustExist: false });
  const ancestor = nearestExistingAncestor(candidate);
  // A caller must first provide a genuinely private external parent. Creating
  // an opaque child below a shared directory is not an acceptable PII boundary
  // because the parent may still permit replacement or deletion attacks.
  assertPrivateRootAccessBoundary(realpathSync.native(ancestor), `${label} existing ancestor`, { recursive: false });
  let cursor = ancestor;
  for (const segment of relative(ancestor, candidate).split(/[\\/]+/).filter(Boolean)) {
    cursor = resolve(cursor, segment);
    let created = false;
    if (!existsSync(cursor)) {
      try {
        mkdirSync(cursor, { mode });
        created = true;
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
      }
    }
    assertNoReparsePath(cursor, { label });
    if (!statSync(cursor).isDirectory()) throw new Error(`${label} contains a non-directory component`);
    if (created) hardenPrivateDirectoryAccess(cursor, label, mode);
    else assertPrivateRootAccessBoundary(cursor, label, { recursive: false });
  }
  assertNoReparsePath(candidate, { label });
  const physical = realpathSync.native(candidate);
  if (isPathWithin(repo, physical)) throw new Error(`${label} must be physically outside the repository`);
  if (!statSync(physical).isDirectory()) throw new Error(`${label} must be a directory`);
  assertPrivateRootAccessBoundary(physical, label);
  return physical;
}

/** Recursively reject links/reparse aliases before an output is promoted. */
export function assertTreeHasNoReparsePoints(root, { label = 'Fulfilment output', requirePrivateAccess = true } = {}) {
  const rootPath = assertNoReparsePath(root, { label });
  if (!statSync(rootPath).isDirectory()) throw new Error(`${label} must be a directory`);
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`${label} contains a symbolic link or reparse point`);
      assertNoReparsePath(path, { label });
      if (entry.isDirectory()) visit(path);
    }
  };
  visit(rootPath);
  if (requirePrivateAccess) assertPrivateRootAccessBoundary(rootPath, `${label} private boundary`);
  return rootPath;
}

/**
 * Publish a complete file once without ever exposing a partially written final
 * pathname. The fully flushed temporary inode is hard-linked into place, so an
 * existing final file is never replaced even under a race.
 */
export function writeNewFileSync(path, bytes, {
  mode = 0o600,
  label = 'Immutable file',
  tempDirectory = null,
} = {}) {
  const finalPath = resolve(path);
  const finalDirectory = assertNoReparsePath(dirname(finalPath), { label: `${label} directory` });
  if (!statSync(finalDirectory).isDirectory()) throw new Error(`${label} directory is invalid`);
  const tempRoot = assertNoReparsePath(tempDirectory ? resolve(tempDirectory) : finalDirectory, {
    label: `${label} temporary directory`,
  });
  if (!statSync(tempRoot).isDirectory()) throw new Error(`${label} temporary directory is invalid`);
  const safeBase = basename(finalPath).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 96) || 'file';
  const tempPath = join(tempRoot, `.ap-write-${safeBase}-${process.pid}-${randomBytes(16).toString('hex')}.tmp`);
  let handle;
  try {
    handle = openSync(tempPath, 'wx', mode);
    writeFileSync(handle, bytes);
    fsyncSync(handle);
    closeSync(handle);
    handle = undefined;
    linkSync(tempPath, finalPath);
    assertNoReparsePath(finalPath, { label });
    if (!statSync(finalPath).isFile()) throw new Error(`${label} is not a regular file`);
    let directoryHandle;
    try {
      directoryHandle = openSync(finalDirectory, 'r');
      fsyncSync(directoryHandle);
    } catch {
      // Windows does not consistently permit directory fsync; the file itself
      // was flushed before the atomic no-replace link became visible.
    } finally {
      if (directoryHandle !== undefined) closeSync(directoryHandle);
    }
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(`${label} already exists`);
    throw error;
  } finally {
    if (handle !== undefined) closeSync(handle);
    try { unlinkSync(tempPath); } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  return finalPath;
}

/**
 * Pass renderer children only the OS values they need plus an explicit AP
 * contract. Payment/API secrets and unrelated parent variables never cross.
 */
export function buildFulfilChildEnv(extra = {}, parent = process.env) {
  const output = {};
  const parentEntries = Object.entries(parent || {});
  for (const allowed of CHILD_ENV_ALLOWLIST) {
    const match = parentEntries.find(([key]) => key.toUpperCase() === allowed);
    if (match && match[1] != null && String(match[1]) !== '') output[match[0]] = String(match[1]);
  }
  for (const key of Object.keys(extra)) {
    if (!CHILD_AP_KEYS.includes(key)) throw new Error(`Child environment key is not allowed: ${key}`);
    const value = extra[key];
    if (value != null) output[key] = String(value);
  }
  output.AP_PRIVATE_FULFILMENT = '1';
  return output;
}

export const FULFIL_CHILD_ENV_KEYS = Object.freeze([...CHILD_ENV_ALLOWLIST, ...CHILD_AP_KEYS]);
