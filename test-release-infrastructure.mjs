import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  CANDIDATE_HEADER,
  CANDIDATE_HEADER_PLACEHOLDER,
  OFFICIAL_RELEASE_WORKFLOW_REF,
  OFFICIAL_REPOSITORY,
  PRODUCTION_RELEASE_VERSION,
  RELEASE_IDENTITY_SCHEMA,
  parseServiceWorkerVersion,
  releaseIdentityDocument,
  stampCandidateHeaderTemplate,
  stampCloudflarePagesArtifact,
  verifyReleaseArtifactBuild,
  verifyReleaseDispatch,
  writeReleaseIdentityArtifact,
} from './tools/verify-release-dispatch.mjs'
import {
  normalizeDeploymentBaseUrl,
  parseArgs,
  parsePublicPreviewIdentity,
  parsePublicReleaseIdentity,
  publicSwVersion,
  verifyDeployedIdentity,
  verifyPublic,
} from './tools/setup-cloudflare-release-edge.mjs'
import {
  PREVIEW_IDENTITY_SCHEMA,
  previewIdentityDocument,
  verifyPreviewArtifactBuild,
  verifyPreviewDeploymentOutputs,
  verifyPreviewDispatch,
} from './tools/verify-preview-dispatch.mjs'

const root = resolve(import.meta.dirname)
const workflow = readFileSync(join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8')
const previewWorkflow = readFileSync(
  join(root, '.github', 'workflows', 'deploy-preview.yml'),
  'utf8',
)
const ciWorkflow = readFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'utf8')
const refreshWorkflow = readFileSync(
  join(root, '.github', 'workflows', 'refresh-content-bank.yml'),
  'utf8',
)
const verifierPath = join(root, 'tools', 'verify-release-dispatch.mjs')
const pagesVerifierPath = join(root, 'tools', 'setup-cloudflare-release-edge.mjs')
const pagesVerifierSource = readFileSync(pagesVerifierPath, 'utf8')
const buildSource = readFileSync(join(root, 'tools', 'build.mjs'), 'utf8')
const headersTemplate = readFileSync(join(root, 'website', '_headers'), 'utf8')
const gumroadProvisioner = readFileSync(join(root, 'tools', 'gumroad-provision.mjs'), 'utf8')
const tempRoot = mkdtempSync(join(tmpdir(), 'astroprecise-release-'))
const previewRoot = mkdtempSync(join(tmpdir(), 'astroprecise-preview-'))

function git(args, cwd = tempRoot) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function jobBlock(source, name) {
  const start = source.indexOf(`  ${name}:`)
  assert.notEqual(start, -1, `${name} job must exist`)
  const remainder = source.slice(start + name.length + 3)
  const nextJobOffset = remainder.search(/^ {2}[a-zA-Z0-9_-]+:\r?$/m)
  return source.slice(
    start,
    nextJobOffset === -1 ? undefined : start + name.length + 3 + nextJobOffset,
  )
}

function assertPinnedActions(source, approvedActions) {
  const uses = [...source.matchAll(/^\s*(?:-\s*)?uses:\s+([^\s#]+)(?:\s+#.*)?$/gm)]
  assert.ok(uses.length > 0, 'workflow must use at least one external action')
  for (const [, reference] of uses) {
    const match = /^([^@]+)@([0-9a-f]{40})$/.exec(reference)
    assert.ok(match, `${reference} must use exactly one full lowercase commit SHA`)
    const [, action, sha] = match
    assert.ok(approvedActions.has(action), `${action} is not an approved external action`)
    assert.equal(sha, approvedActions.get(action), `${action} must use its approved commit SHA`)
  }
  return uses.length
}

function trustedArtifactDenyPatterns(job) {
  const match = job.match(/case "\$lower_path" in\s*\r?\n\s*([^\r\n]+)\)\s*\r?\n\s*echo "Refusing Cloudflare executable\/control path:/)
  assert.ok(match, 'trusted static artifact deny policy must be parseable')
  return match[1].split('|').map((pattern) => pattern.trim())
}

function shellPatternMatches(pattern, path) {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*')
    .replaceAll('?', '.')
  return new RegExp(`^${regex}$`).test(path.toLowerCase())
}

function assertTrustedArtifactFixturePolicy(job, label) {
  const patterns = trustedArtifactDenyPatterns(job)
  for (const malicious of [
    '_worker.bundle',
    '_worker.bundle/index.js',
    '_WORKER.BUNDLE/chunks/runtime.js',
    '_worker.js/index.js',
    '_WORKER.JS/chunks/runtime.js',
    'functions-filepath-routing-config.json',
  ]) {
    assert.equal(
      patterns.some((pattern) => shellPatternMatches(pattern, malicious)),
      true,
      `${label} trusted artifact policy must reject ${malicious}`,
    )
  }
  for (const staticPath of ['js/app.js', 'data/products-v901.json', 'downloads/studio/sample.pdf']) {
    assert.equal(
      patterns.some((pattern) => shellPatternMatches(pattern, staticPath)),
      false,
      `${label} executable deny policy must not reject approved static path ${staticPath}`,
    )
  }
}

function exactPreviewIdentity(candidateSha, releaseVersion = 'ap-v902') {
  return {
    schema: PREVIEW_IDENTITY_SCHEMA,
    candidateSha,
    previewBranch: `preview-${candidateSha.slice(0, 12)}`,
    releaseVersion,
  }
}

function exactIdentity(candidateSha, releaseVersion = 'ap-v901') {
  return {
    schema: RELEASE_IDENTITY_SCHEMA,
    candidateSha,
    releaseTag: `release/${releaseVersion}-${candidateSha.slice(0, 12)}`,
    releaseVersion,
  }
}

function fakeResponse(
  body,
  candidate,
  { status = 200, header = candidate, location = null, responseUrl = null } = {},
) {
  const headers = header === null ? {} : { [CANDIDATE_HEADER]: header }
  if (location !== null) headers.location = location
  const response = new Response(body, {
    status,
    headers,
  })
  if (responseUrl !== null) Object.defineProperty(response, 'url', { value: responseUrl })
  return response
}

function rmTreeWithRetry(target, attempts = 20, delayMs = 100) {
  for (let i = 0; i < attempts; i++) {
    try {
      rmSync(target, { recursive: true, force: true })
      return
    } catch (err) {
      if (i === attempts - 1) throw err
      if (err.code !== 'EBUSY' && err.code !== 'EPERM') throw err
      // Windows may keep files locked briefly; wait and retry.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs)
    }
  }
}

try {
  mkdirSync(join(tempRoot, 'website'), { recursive: true })
  mkdirSync(join(tempRoot, 'dist'), { recursive: true })
  git(['init', '--quiet'])
  git(['config', 'user.name', 'Release Contract Test'])
  git(['config', 'user.email', 'release-contract@example.invalid'])
  git(['switch', '--quiet', '--create', 'main'])
  writeFileSync(join(tempRoot, 'website', 'sw.js'), 'const V = "ap-v901";\n', 'utf8')
  git(['add', 'website/sw.js'])
  git(['commit', '--quiet', '-m', 'trusted main fixture'])
  const trustedMainSha = git(['rev-parse', 'HEAD'])

  git(['switch', '--quiet', '--create', 'codex/malicious-release-candidate'])
  mkdirSync(join(tempRoot, '.github', 'workflows'), { recursive: true })
  mkdirSync(join(tempRoot, 'tools'), { recursive: true })
  writeFileSync(join(tempRoot, 'website', 'sw.js'), 'const V = "ap-v902";\n', 'utf8')
  writeFileSync(
    join(tempRoot, '.github', 'workflows', 'deploy-pages.yml'),
    'name: candidate-controlled workflow must never receive production credentials\n',
    'utf8',
  )
  writeFileSync(
    join(tempRoot, 'tools', 'verify-release-dispatch.mjs'),
    'process.stdout.write("candidate-forged release outputs")\n',
    'utf8',
  )
  git([
    'add',
    'website/sw.js',
    '.github/workflows/deploy-pages.yml',
    'tools/verify-release-dispatch.mjs',
  ])
  git(['commit', '--quiet', '-m', 'untrusted candidate fixture'])
  const candidateSha = git(['rev-parse', 'HEAD'])
  const releaseTag = `release/ap-v902-${candidateSha.slice(0, 12)}`
  git(['tag', releaseTag])
  git(['switch', '--quiet', 'main'])

  const validEnv = {
    GITHUB_REPOSITORY: OFFICIAL_REPOSITORY,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REF_PROTECTED: 'true',
    GITHUB_SHA: trustedMainSha,
    WORKFLOW_REF: OFFICIAL_RELEASE_WORKFLOW_REF,
    WORKFLOW_SHA: trustedMainSha,
    CANDIDATE_SHA: candidateSha,
    RELEASE_TAG: releaseTag,
    RELEASE_VERSION: PRODUCTION_RELEASE_VERSION,
  }

  assert.deepEqual(verifyReleaseDispatch({ env: validEnv, cwd: tempRoot }), {
    candidateSha,
    releaseTag,
    releaseVersion: PRODUCTION_RELEASE_VERSION,
  })
  assert.equal(git(['rev-parse', 'HEAD']), trustedMainSha)
  assert.match(
    git(['show', `${candidateSha}:tools/verify-release-dispatch.mjs`]),
    /candidate-forged/,
    'fixture must prove the candidate verifier is hostile while trusted-main verification succeeds',
  )

  for (const [label, change, pattern] of [
    ['wrong repository', (env) => (env.GITHUB_REPOSITORY = 'attacker/fork'), /GITHUB_REPOSITORY/],
    ['wrong event', (env) => (env.GITHUB_EVENT_NAME = 'push'), /workflow_dispatch/],
    ['unprotected main', (env) => (env.GITHUB_REF_PROTECTED = 'false'), /must be protected/],
    ['uppercase candidate', (env) => (env.CANDIDATE_SHA = candidateSha.toUpperCase()), /lowercase/],
    ['feature ref', (env) => (env.GITHUB_REF = 'refs/heads/feature'), /refs\/heads\/main/],
    [
      'candidate workflow ref',
      (env) =>
        (env.WORKFLOW_REF = `${OFFICIAL_REPOSITORY}/.github/workflows/deploy-pages.yml@refs/heads/feature`),
      /WORKFLOW_REF/,
    ],
    [
      'wrong release version',
      (env) => (env.RELEASE_TAG = `release/ap-v901-${candidateSha.slice(0, 12)}`),
      /ap-v902/,
    ],
    ['mismatched event SHA', (env) => (env.GITHUB_SHA = 'a'.repeat(40)), /GITHUB_SHA/],
    [
      'mismatched workflow SHA',
      (env) => (env.WORKFLOW_SHA = 'a'.repeat(40)),
      /workflow definition/,
    ],
  ]) {
    const env = { ...validEnv }
    change(env)
    assert.throws(() => verifyReleaseDispatch({ env, cwd: tempRoot }), pattern, label)
  }

  git(['tag', '--force', releaseTag, trustedMainSha])
  assert.throws(
    () => verifyReleaseDispatch({ env: validEnv, cwd: tempRoot }),
    /release tag commit does not match candidate_sha/,
    'a moved release tag must never authorize a different candidate',
  )
  git(['tag', '--force', releaseTag, candidateSha])

  assert.equal(parseServiceWorkerVersion('const V = "ap-v901";'), 'ap-v901')
  assert.throws(
    () => parseServiceWorkerVersion('// const V = "ap-v901";\nconst X = 1;'),
    /first executable/,
  )
  assert.throws(
    () => parseServiceWorkerVersion('const V = "ap-v901";\nlet V = "ap-v902";'),
    /exactly one executable V declaration/,
  )

  git(['checkout', '--quiet', candidateSha])
  writeFileSync(join(tempRoot, 'dist', 'sw.js'), 'const V="ap-v902";\n', 'utf8')
  writeFileSync(
    join(tempRoot, 'dist', '_headers'),
    `/*\n  ${CANDIDATE_HEADER}: ${CANDIDATE_HEADER_PLACEHOLDER}\n`,
    'utf8',
  )
  const document = verifyReleaseArtifactBuild({ env: validEnv, cwd: tempRoot })
  assert.deepEqual(document, exactIdentity(candidateSha, PRODUCTION_RELEASE_VERSION))
  assert.deepEqual(
    releaseIdentityDocument({
      candidateSha,
      releaseTag,
      releaseVersion: PRODUCTION_RELEASE_VERSION,
    }),
    document,
  )

  const standaloneIdentity = join(tempRoot, 'standalone-identity.json')
  writeReleaseIdentityArtifact(document, standaloneIdentity)
  assert.deepEqual(JSON.parse(readFileSync(standaloneIdentity, 'utf8')), document)
  assert.throws(
    () => writeReleaseIdentityArtifact(document, standaloneIdentity),
    /EEXIST/,
    'identity artifacts must not overwrite an existing file',
  )

  const stampedText = stampCandidateHeaderTemplate(
    `/*\n  ${CANDIDATE_HEADER}: ${CANDIDATE_HEADER_PLACEHOLDER}\n`,
    candidateSha,
  )
  assert.match(stampedText, new RegExp(`${CANDIDATE_HEADER}: ${candidateSha}`))
  assert.doesNotMatch(stampedText, new RegExp(CANDIDATE_HEADER_PLACEHOLDER))
  for (const invalidTemplate of [
    `/*\n  ${CANDIDATE_HEADER}: ${candidateSha}\n`,
    `/*\n  ${CANDIDATE_HEADER}: ${CANDIDATE_HEADER_PLACEHOLDER}\n  ${CANDIDATE_HEADER}: ${CANDIDATE_HEADER_PLACEHOLDER}\n`,
    `/*\n  Other-Header: ${CANDIDATE_HEADER_PLACEHOLDER}\n`,
  ]) {
    assert.throws(
      () => stampCandidateHeaderTemplate(invalidTemplate, candidateSha),
      /Cloudflare Pages|placeholder/,
    )
  }

  const stampedArtifact = stampCloudflarePagesArtifact({
    document,
    distDirectory: join(tempRoot, 'dist'),
  })
  assert.equal(
    readFileSync(stampedArtifact.headersPath, 'utf8').match(
      new RegExp(`^[\\t ]*${CANDIDATE_HEADER}:[\\t ]*${candidateSha}$`, 'gm'),
    )?.length,
    1,
  )
  assert.deepEqual(JSON.parse(readFileSync(stampedArtifact.identityPath, 'utf8')), document)

  const dispatchOutput = join(tempRoot, 'github-output.txt')
  git(['checkout', '--quiet', 'main'])
  const dispatchCli = spawnSync(process.execPath, [verifierPath], {
    cwd: tempRoot,
    env: { ...process.env, ...validEnv, GITHUB_OUTPUT: dispatchOutput },
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(dispatchCli.status, 0, dispatchCli.stderr)
  assert.match(readFileSync(dispatchOutput, 'utf8'), new RegExp(`candidate_sha=${candidateSha}`))

  mkdirSync(join(previewRoot, 'website'), { recursive: true })
  mkdirSync(join(previewRoot, 'dist'), { recursive: true })
  git(['init', '--quiet'], previewRoot)
  git(['config', 'user.name', 'Preview Contract Test'], previewRoot)
  git(['config', 'user.email', 'preview-contract@example.invalid'], previewRoot)
  git(['switch', '--quiet', '--create', 'main'], previewRoot)
  writeFileSync(join(previewRoot, 'website', 'sw.js'), 'const V = "ap-v901";\n', 'utf8')
  git(['add', 'website/sw.js'], previewRoot)
  git(['commit', '--quiet', '-m', 'main fixture'], previewRoot)
  const previewMainSha = git(['rev-parse', 'HEAD'], previewRoot)
  git(['update-ref', 'refs/remotes/origin/main', previewMainSha], previewRoot)
  git(['switch', '--quiet', '--create', 'codex/preview-candidate'], previewRoot)
  writeFileSync(join(previewRoot, 'website', 'sw.js'), 'const V = "ap-v902";\n', 'utf8')
  git(['add', 'website/sw.js'], previewRoot)
  git(['commit', '--quiet', '-m', 'preview fixture'], previewRoot)
  const previewSha = git(['rev-parse', 'HEAD'], previewRoot)
  git(['update-ref', 'refs/remotes/origin/codex/preview-candidate', previewSha], previewRoot)
  git(['switch', '--quiet', 'main'], previewRoot)

  const previewEnv = {
    GITHUB_REPOSITORY: OFFICIAL_REPOSITORY,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_REF_PROTECTED: 'true',
    GITHUB_SHA: previewMainSha,
    WORKFLOW_SHA: previewMainSha,
    CANDIDATE_SHA: previewSha,
  }
  assert.deepEqual(verifyPreviewDispatch({ env: previewEnv, cwd: previewRoot }), {
    candidateSha: previewSha,
    previewBranch: `preview-${previewSha.slice(0, 12)}`,
    releaseVersion: 'ap-v902',
  })
  for (const [label, change, pattern] of [
    [
      'preview from unprotected workflow',
      (env) => (env.GITHUB_REF_PROTECTED = 'false'),
      /protected/,
    ],
    [
      'preview from mutable feature workflow',
      (env) => (env.GITHUB_REF = 'refs/heads/feature'),
      /refs\/heads\/main/,
    ],
    [
      'preview workflow identity mismatch',
      (env) => (env.WORKFLOW_SHA = previewSha),
      /workflow definition/,
    ],
    ['main candidate', (env) => (env.CANDIDATE_SHA = previewMainSha), /contained by main/],
    ['missing candidate', (env) => (env.CANDIDATE_SHA = 'a'.repeat(40)), /unable to resolve/],
  ]) {
    const env = { ...previewEnv }
    change(env)
    assert.throws(() => verifyPreviewDispatch({ env, cwd: previewRoot }), pattern, label)
  }

  git(['checkout', '--quiet', previewSha], previewRoot)
  writeFileSync(join(previewRoot, 'dist', 'sw.js'), 'const V = "ap-v902";\n', 'utf8')
  writeFileSync(
    join(previewRoot, 'dist', '_headers'),
    `/*\n  ${CANDIDATE_HEADER}: ${CANDIDATE_HEADER_PLACEHOLDER}\n`,
    'utf8',
  )
  const previewBuildEnv = {
    CANDIDATE_SHA: previewSha,
    PREVIEW_BRANCH: `preview-${previewSha.slice(0, 12)}`,
    RELEASE_VERSION: 'ap-v902',
  }
  const previewDocument = exactPreviewIdentity(previewSha)
  assert.deepEqual(
    previewIdentityDocument({
      candidateSha: previewBuildEnv.CANDIDATE_SHA,
      previewBranch: previewBuildEnv.PREVIEW_BRANCH,
      releaseVersion: previewBuildEnv.RELEASE_VERSION,
    }),
    previewDocument,
  )
  assert.deepEqual(
    verifyPreviewArtifactBuild({ env: previewBuildEnv, cwd: previewRoot }),
    previewDocument,
  )
  const previewStamped = stampCloudflarePagesArtifact({
    document: previewDocument,
    distDirectory: join(previewRoot, 'dist'),
  })
  assert.deepEqual(JSON.parse(readFileSync(previewStamped.identityPath, 'utf8')), previewDocument)

  const previewDeploymentId = '12345678-1234-4123-8123-123456789abc'
  assert.deepEqual(
    verifyPreviewDeploymentOutputs({
      deploymentUrl: 'https://a1b2c3d4.astroprecise.pages.dev',
      aliasUrl: `https://preview-${previewSha.slice(0, 12)}.astroprecise.pages.dev`,
      deploymentId: previewDeploymentId,
      previewBranch: `preview-${previewSha.slice(0, 12)}`,
    }),
    {
      deploymentUrl: 'https://a1b2c3d4.astroprecise.pages.dev',
      aliasUrl: `https://preview-${previewSha.slice(0, 12)}.astroprecise.pages.dev`,
      deploymentId: previewDeploymentId,
      previewBranch: `preview-${previewSha.slice(0, 12)}`,
    },
  )
  assert.throws(
    () =>
      verifyPreviewDeploymentOutputs({
        deploymentUrl: `https://preview-${previewSha.slice(0, 12)}.astroprecise.pages.dev`,
        aliasUrl: `https://preview-${previewSha.slice(0, 12)}.astroprecise.pages.dev`,
        deploymentId: previewDeploymentId,
        previewBranch: `preview-${previewSha.slice(0, 12)}`,
      }),
    /unique hash|immutable/,
  )

  assert.deepEqual(parseArgs(['--verify-public', '--candidate', candidateSha]), {
    mode: 'verify-public',
    candidate: candidateSha,
    baseUrl: null,
    deploymentKind: 'release',
    previewBranch: null,
    releaseVersion: null,
    help: false,
  })
  assert.deepEqual(
    parseArgs(['--verify-url', 'https://abc.astroprecise.pages.dev', '--candidate', candidateSha]),
    {
      mode: 'verify-url',
      candidate: candidateSha,
      baseUrl: 'https://abc.astroprecise.pages.dev',
      deploymentKind: 'release',
      previewBranch: null,
      releaseVersion: null,
      help: false,
    },
  )
  assert.deepEqual(
    parseArgs([
      '--verify-url',
      'https://a1b2c3d4.astroprecise.pages.dev',
      '--candidate',
      previewSha,
      '--deployment-kind',
      'preview',
      '--preview-branch',
      `preview-${previewSha.slice(0, 12)}`,
      '--release-version',
      'ap-v902',
    ]),
    {
      mode: 'verify-url',
      candidate: previewSha,
      baseUrl: 'https://a1b2c3d4.astroprecise.pages.dev',
      deploymentKind: 'preview',
      previewBranch: `preview-${previewSha.slice(0, 12)}`,
      releaseVersion: 'ap-v902',
      help: false,
    },
  )
  assert.throws(() => parseArgs(['--apply', '--candidate', candidateSha]), /retired/)
  assert.throws(() => parseArgs(['--verify-public']), /requires --candidate/)
  assert.throws(
    () =>
      parseArgs([
        '--verify-url',
        'https://a1b2c3d4.astroprecise.pages.dev',
        '--candidate',
        previewSha,
        '--deployment-kind',
        'preview',
        '--preview-branch',
        `preview-${previewSha.slice(0, 12)}`,
      ]),
    /release-version/,
  )
  assert.throws(
    () => parseArgs(['--verify-public', '--candidate', candidateSha.toUpperCase()]),
    /lowercase/,
  )
  assert.equal(
    normalizeDeploymentBaseUrl('https://abc.astroprecise.pages.dev/'),
    'https://abc.astroprecise.pages.dev',
  )
  for (const invalidUrl of [
    'http://abc.astroprecise.pages.dev',
    'https://astroprecise.app',
    'https://abc.astroprecise.pages.dev/path',
    'https://user:pass@abc.astroprecise.pages.dev',
  ]) {
    assert.throws(() => normalizeDeploymentBaseUrl(invalidUrl), /deployment URL/)
  }

  const identityText = JSON.stringify(exactIdentity(candidateSha))
  assert.deepEqual(
    parsePublicReleaseIdentity(identityText, candidateSha, 'ap-v901'),
    exactIdentity(candidateSha),
  )
  for (const invalidIdentity of [
    { ...exactIdentity(candidateSha), candidateSha: 'a'.repeat(40) },
    { ...exactIdentity(candidateSha), releaseVersion: 'ap-v900' },
    { ...exactIdentity(candidateSha), releaseTag: 'release/ap-v901-deadbeefdead' },
    { ...exactIdentity(candidateSha), extra: true },
  ]) {
    assert.throws(
      () => parsePublicReleaseIdentity(JSON.stringify(invalidIdentity), candidateSha, 'ap-v901'),
      /release identity/,
    )
  }
  const previewIdentityText = JSON.stringify(previewDocument)
  assert.deepEqual(
    parsePublicPreviewIdentity(
      previewIdentityText,
      previewSha,
      'ap-v902',
      `preview-${previewSha.slice(0, 12)}`,
    ),
    previewDocument,
  )
  assert.throws(
    () =>
      parsePublicPreviewIdentity(
        previewIdentityText,
        previewSha,
        'ap-v902',
        'preview-deadbeefdead',
      ),
    /preview identity branch/,
  )
  assert.equal(publicSwVersion('const V = "ap-v901";'), 'ap-v901')

  const requestedUrls = []
  const goodFetch = async (url) => {
    requestedUrls.push(String(url))
    return String(url).includes('/sw.js')
      ? fakeResponse('const V = "ap-v901";\n', candidateSha)
      : fakeResponse(identityText, candidateSha)
  }
  const observed = await verifyDeployedIdentity(
    'https://abc.astroprecise.pages.dev',
    candidateSha,
    'ap-v901',
    { fetchImpl: goodFetch },
  )
  assert.equal(observed.candidate, candidateSha)
  assert.equal(observed.releaseVersion, 'ap-v901')
  assert.equal(requestedUrls.length, 3, 'release proof must request root, identity JSON and sw.js')
  assert.match(requestedUrls[0], /\/\?verify=/)

  const previewFetch = async (url) =>
    String(url).includes('/sw.js')
      ? fakeResponse('const V = "ap-v902";\n', previewSha)
      : fakeResponse(previewIdentityText, previewSha)
  const observedPreview = await verifyDeployedIdentity(
    'https://a1b2c3d4.astroprecise.pages.dev',
    previewSha,
    'ap-v902',
    {
      fetchImpl: previewFetch,
      deploymentKind: 'preview',
      previewBranch: `preview-${previewSha.slice(0, 12)}`,
    },
  )
  assert.equal(observedPreview.deploymentKind, 'preview')
  assert.equal(observedPreview.deploymentRef, `preview-${previewSha.slice(0, 12)}`)

  await assert.rejects(
    verifyDeployedIdentity('https://abc.astroprecise.pages.dev', candidateSha, 'ap-v901', {
      fetchImpl: async () =>
        fakeResponse('', candidateSha, {
          status: 302,
          location: 'https://attacker.example/',
        }),
    }),
    /redirected/,
  )
  await assert.rejects(
    verifyDeployedIdentity('https://abc.astroprecise.pages.dev', candidateSha, 'ap-v901', {
      fetchImpl: async (url) =>
        String(url).includes('/sw.js')
          ? fakeResponse('const V = "ap-v901";\n', candidateSha)
          : fakeResponse(identityText, candidateSha, {
              responseUrl: 'https://attacker.example/spoofed',
            }),
    }),
    /expected the exact requested URL/,
  )

  await assert.rejects(
    verifyDeployedIdentity('https://abc.astroprecise.pages.dev', candidateSha, 'ap-v901', {
      fetchImpl: async (url) =>
        String(url).includes('/sw.js')
          ? fakeResponse('const V = "ap-v901";\n', candidateSha)
          : fakeResponse(identityText, candidateSha, { header: null }),
    }),
    /exactly one/,
  )
  await assert.rejects(
    verifyDeployedIdentity('https://abc.astroprecise.pages.dev', candidateSha, 'ap-v901', {
      fetchImpl: async (url) =>
        String(url).includes('/sw.js')
          ? fakeResponse('const V = "ap-v900";\n', candidateSha)
          : fakeResponse(identityText, candidateSha),
    }),
    /expected ap-v901/,
  )
  const publicResults = await verifyPublic(candidateSha, 'ap-v901', {
    fetchImpl: goodFetch,
    bases: ['https://astroprecise.app', 'https://www.astroprecise.app'],
    attempts: 1,
  })
  assert.equal(publicResults.length, 2)

  const offline = spawnSync(
    process.execPath,
    [pagesVerifierPath, '--dry-run', '--candidate', candidateSha],
    {
      cwd: root,
      env: { ...process.env, CLOUDFLARE_API_TOKEN: 'must-not-be-read' },
      encoding: 'utf8',
      timeout: 10_000,
    },
  )
  assert.equal(offline.status, 0, offline.stderr)
  assert.match(offline.stdout, /OFFLINE PLAN/)
  const retiredApply = spawnSync(
    process.execPath,
    [pagesVerifierPath, '--apply', '--candidate', candidateSha],
    {
      cwd: root,
      env: process.env,
      encoding: 'utf8',
      timeout: 10_000,
    },
  )
  assert.notEqual(retiredApply.status, 0)
  assert.match(retiredApply.stderr, /retired GitHub Pages edge-mutation route/)

  assert.match(workflow, /^name: Deploy verified release to Cloudflare Pages$/m)
  assert.match(workflow, /^on:\r?\n {2}workflow_dispatch:/m)
  assert.doesNotMatch(workflow, /^\s{2}push:/m)
  assert.match(
    workflow,
    /candidate_sha:\r?\n\s+description:[^\r\n]+\r?\n\s+required: true\r?\n\s+type: string/,
  )
  assert.match(
    workflow,
    /release_tag:\r?\n\s+description:[^\r\n]*release\/ap-v902-<12hex>[^\r\n]*\r?\n\s+required: true\r?\n\s+type: string/,
  )
  assert.match(workflow, /^permissions: \{\}$/m)
  assert.doesNotMatch(workflow, /pages: write|id-token: write/)
  assert.doesNotMatch(workflow, /actions\/(?:configure-pages|upload-pages-artifact|deploy-pages)@/)
  assert.doesNotMatch(workflow, /name: github-pages/)
  assert.match(workflow, /- verify-cutover/)
  assert.match(workflow, /Dispatch this workflow only from protected main/)

  const identityJob = jobBlock(workflow, 'release_identity')
  assert.match(identityJob, /permissions:\r?\n\s+contents: read/)
  assert.match(identityJob, /ref: \$\{\{ github\.sha \}\}/)
  assert.match(identityJob, /fetch-depth: 0/)
  assert.match(identityJob, /fetch-tags: true/)
  assert.match(identityJob, /persist-credentials: false/)
  assert.match(identityJob, /RELEASE_TAG: \$\{\{ inputs\.release_tag \}\}/)
  assert.match(identityJob, /WORKFLOW_REF: \$\{\{ github\.workflow_ref \}\}/)
  assert.match(identityJob, /WORKFLOW_SHA: \$\{\{ github\.workflow_sha \}\}/)
  assert.match(identityJob, /run: node tools\/verify-release-dispatch\.mjs/)

  for (const source of [workflow, previewWorkflow]) {
    for (const runBlock of source.matchAll(
      /(?:^|\n)\s+run:\s*(?:\|\s*\n(?:\s{10}.*\n?)*|[^\r\n]*)/g,
    )) {
      assert.doesNotMatch(runBlock[0], /inputs\.(?:candidate_sha|release_tag)/)
    }
  }
  assert.equal(
    workflow.match(/ref: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/g)?.length,
    1,
    'the candidate checkout must exist only in the isolated no-secret test job',
  )
  const testJob = jobBlock(workflow, 'test')
  assert.match(
    testJob,
    /ref: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
    'only the no-secret test job may check out the verifier-approved candidate',
  )
  assert.doesNotMatch(testJob, /secrets\./)
  assert.match(testJob, /actions\/upload-artifact@/)
  assert.match(testJob, /--stamp-cloudflare-pages dist/)

  const deployJob = jobBlock(workflow, 'deploy')
  assert.match(
    deployJob,
    /if: >-[\s\S]*github\.ref == 'refs\/heads\/main'[\s\S]*github\.ref_protected == true[\s\S]*github\.workflow_ref == 'jonnydavx-eng\/astroprecise\/\.github\/workflows\/deploy-pages\.yml@refs\/heads\/main'[\s\S]*inputs\.operation == 'deploy'/,
  )
  assert.match(deployJob, /needs: \[release_identity, test\]/)
  assert.match(deployJob, /permissions: \{\}/)
  assert.match(deployJob, /name: cloudflare-pages-production/)
  assert.match(deployJob, /url: \$\{\{ steps\.cloudflare\.outputs\.deployment-url \}\}/)
  assert.match(deployJob, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/)
  assert.match(deployJob, /accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/)
  assert.match(deployJob, /wranglerVersion: '4\.125\.0'/)
  assert.match(deployJob, /actions\/download-artifact@/)
  assert.doesNotMatch(
    deployJob,
    /actions\/checkout|actions\/setup-node|\bnode\b|\bnpm\b|tools\/|--stamp-cloudflare-pages/,
    'credential job must not check out or execute any candidate-controlled code',
  )
  assert.match(deployJob, /pages deploy dist/)
  assert.match(deployJob, /--project-name=astroprecise/)
  assert.match(deployJob, /--branch=main/)
  assert.match(
    deployJob,
    /PAGES_ENVIRONMENT: \$\{\{ steps\.cloudflare\.outputs\.pages-environment \}\}/,
  )
  assert.match(deployJob, /test "\$PAGES_ENVIRONMENT" = "production"/)
  assert.match(
    deployJob,
    /--commit-hash=\$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
  )
  assert.match(deployJob, /--commit-dirty=false/)
  assert.match(
    deployJob,
    /identity_path="dist\/\.well-known\/astroprecise-release\/\$CANDIDATE_SHA\.json"/,
  )
  assert.match(deployJob, /Apply trusted static Pages artifact policy/)
  assert.match(deployJob, /find dist -mindepth 1 ! -type d ! -type f/)
  assert.match(deployJob, /functions\|functions\/\*\|_worker\.js\|_worker\.js\/\*\|_worker\.bundle\|_worker\.bundle\/\*\|functions-filepath-routing-config\.json/)
  assert.match(deployJob, /wrangler\.toml\|wrangler\.json\|wrangler\.jsonc/)
  assert.match(deployJob, /Refusing unknown static Pages artifact path/)
  assertTrustedArtifactFixturePolicy(deployJob, 'production')
  assert.match(buildSource, /'functions-filepath-routing-config\.json'/)
  assert.match(buildSource, /lowerPublicRel === '_worker\.bundle'/)
  assert.match(buildSource, /lowerPublicRel\.startsWith\('_worker\.js\/'\)/)
  assert.match(buildSource, /lowerPublicRel\.startsWith\('_worker\.bundle\/'\)/)
  assert.doesNotMatch(
    workflow.replace(deployJob, ''),
    /secrets\.CLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)/,
    'Cloudflare credentials must exist only in the protected environment job',
  )

  const deploymentProofJob = jobBlock(workflow, 'verify_deployment')
  assert.match(deploymentProofJob, /ref: \$\{\{ github\.sha \}\}/)
  assert.doesNotMatch(
    deploymentProofJob,
    /ref: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
  )
  assert.match(
    deploymentProofJob,
    /DEPLOYMENT_URL: \$\{\{ needs\.deploy\.outputs\.deployment_url \}\}/,
  )
  assert.match(
    deploymentProofJob,
    /--verify-url "\$DEPLOYMENT_URL"[\s\S]*--candidate "\$CANDIDATE_SHA"/,
  )
  assert.match(deploymentProofJob, /--release-version "\$RELEASE_VERSION"/)
  assert.doesNotMatch(deploymentProofJob, /--verify-public|ping-indexnow/)

  const cutoverJob = jobBlock(workflow, 'verify_cutover')
  assert.match(
    cutoverJob,
    /if: >-[\s\S]*github\.ref == 'refs\/heads\/main'[\s\S]*github\.ref_protected == true[\s\S]*github\.workflow_ref == 'jonnydavx-eng\/astroprecise\/\.github\/workflows\/deploy-pages\.yml@refs\/heads\/main'[\s\S]*inputs\.operation == 'verify-cutover'/,
  )
  assert.match(cutoverJob, /name: cloudflare-custom-domain-cutover/)
  assert.match(cutoverJob, /ref: \$\{\{ github\.sha \}\}/)
  assert.doesNotMatch(
    cutoverJob,
    /ref: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
  )
  assert.match(cutoverJob, /--verify-public[\s\S]*--candidate "\$CANDIDATE_SHA"/)
  assert.match(cutoverJob, /--release-version "\$RELEASE_VERSION"/)
  assert.doesNotMatch(
    cutoverJob,
    /ping-indexnow|indexnow/i,
    'cutover verification must remain read-only and must not submit a protected-main sitemap',
  )

  assert.match(previewWorkflow, /^name: Deploy immutable candidate preview$/m)
  assert.match(previewWorkflow, /^permissions: \{\}$/m)
  assert.doesNotMatch(previewWorkflow, /--branch=main/)
  assert.doesNotMatch(
    previewWorkflow,
    /--verify-public|ping-indexnow|setup-cloudflare-dns|astroprecise\.app/,
  )
  const previewIdentityJob = jobBlock(previewWorkflow, 'preview_identity')
  assert.match(previewIdentityJob, /ref: \$\{\{ github\.sha \}\}/)
  assert.match(previewIdentityJob, /WORKFLOW_SHA: \$\{\{ github\.workflow_sha \}\}/)
  assert.match(previewIdentityJob, /run: node tools\/verify-preview-dispatch\.mjs/)
  assert.match(
    jobBlock(previewWorkflow, 'test'),
    /ref: \$\{\{ needs\.preview_identity\.outputs\.candidate_sha \}\}/,
    'preview test must check out the verifier-approved exact SHA',
  )
  const previewDeployJob = jobBlock(previewWorkflow, 'deploy')
  assert.match(previewDeployJob, /permissions: \{\}/)
  assert.match(
    previewDeployJob,
    /--branch=\$\{\{ needs\.preview_identity\.outputs\.preview_branch \}\}/,
  )
  assert.match(previewDeployJob, /actions\/download-artifact@/)
  assert.match(previewDeployJob, /Apply trusted static Pages artifact policy/)
  assert.match(previewDeployJob, /find dist -mindepth 1 ! -type d ! -type f/)
  assert.match(previewDeployJob, /functions\|functions\/\*\|_worker\.js\|_worker\.js\/\*\|_worker\.bundle\|_worker\.bundle\/\*\|functions-filepath-routing-config\.json/)
  assert.match(previewDeployJob, /Refusing unknown static Pages artifact path/)
  assertTrustedArtifactFixturePolicy(previewDeployJob, 'preview')
  assert.doesNotMatch(previewDeployJob, /npm ci|npm run build|--stamp-cloudflare-pages/)
  assert.match(previewDeployJob, /PAGES_ENVIRONMENT[^]*test "\$PAGES_ENVIRONMENT" = "preview"/)
  assert.match(previewDeployJob, /pages-deployment-alias-url/)
  assert.match(previewDeployJob, /pages-deployment-id/)
  const previewProofJob = jobBlock(previewWorkflow, 'verify')
  assert.match(previewProofJob, /ref: \$\{\{ github\.sha \}\}/)
  assert.match(previewProofJob, /--verify-deployment-outputs/)
  assert.match(previewProofJob, /--deployment-kind preview/)
  assert.match(previewProofJob, /--preview-branch "\$PREVIEW_BRANCH"/)
  assert.match(previewProofJob, /--release-version "\$RELEASE_VERSION"/)

  assert.match(ciWorkflow, /^name: Candidate quality gates$/m)
  assert.match(ciWorkflow, /^permissions: \{\}$/m)
  assert.doesNotMatch(ciWorkflow, /contents: write|pull-requests: write|deployments: write/)
  for (const command of [
    'npm ci',
    'npm run check:syntax',
    'npm run lint',
    'npm run test:shop',
    'npm run test:fulfil',
    'npm run test:launch',
    'npm test',
    'node tools/test-product-render.mjs',
    'npm run build',
    'git diff --check',
  ]) {
    assert.match(ciWorkflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  for (const source of [workflow, previewWorkflow, ciWorkflow]) {
    assert.match(source, /Refuse source mutation before build/)
    assert.match(source, /git diff --exit-code/)
    assert.match(source, /git diff --cached --exit-code/)
    assert.match(source, /git ls-files --others --exclude-standard/)
    assert.ok(
      source.indexOf('Refuse source mutation before build') < source.indexOf('Build '),
      'source cleanliness must be proved before the deployment build',
    )
  }
  assert.match(ciWorkflow, /node-version: '22\.x'/)
  assert.match(
    ciWorkflow,
    /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/,
  )

  assert.match(refreshWorkflow, /^name: Refresh content bank by pull request$/m)
  assert.match(refreshWorkflow, /^permissions: \{\}$/m)
  assert.match(refreshWorkflow, /AUTOMATION_BRANCH: automation\/content-bank-refresh/)
  assert.match(refreshWorkflow, /git push --force-with-lease=/)
  assert.match(refreshWorkflow, /HEAD:refs\/heads\/\$AUTOMATION_BRANCH/)
  assert.match(refreshWorkflow, /gh pr (?:create|edit)/)
  assert.doesNotMatch(refreshWorkflow, /git push[^\r\n]*(?:HEAD:main|refs\/heads\/main)/)
  assert.doesNotMatch(refreshWorkflow, /HEAD:main/)

  const approvedActions = new Map([
    ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
    ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
    ['actions/upload-artifact', '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'],
    ['actions/download-artifact', '3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c'],
    ['cloudflare/wrangler-action', 'ebbaa1584979971c8614a24965b4405ff95890e0'],
  ])
  const workflowSources = [workflow, previewWorkflow, ciWorkflow, refreshWorkflow]
  let actionCount = 0
  for (const source of workflowSources) {
    assert.match(source, /^permissions: \{\}$/m, 'workflow defaults must remain non-writable')
    actionCount += assertPinnedActions(source, approvedActions)
  }
  assert.ok(actionCount >= 16)
  const checkoutSha = approvedActions.get('actions/checkout')
  for (const badRef of ['main', 'v7', checkoutSha.slice(0, 12)]) {
    assert.throws(
      () =>
        assertPinnedActions(
          ciWorkflow.replace(`actions/checkout@${checkoutSha}`, `actions/checkout@${badRef}`),
          approvedActions,
        ),
      /full lowercase commit SHA/,
    )
  }
  assert.throws(
    () =>
      assertPinnedActions(
        `${workflow}\n      - uses: attacker/unknown@${'a'.repeat(40)}\n`,
        approvedActions,
      ),
    /not an approved external action/,
  )
  assert.throws(
    () => {
      const unsafe = previewWorkflow.replace(
        /--branch=\$\{\{ needs\.preview_identity\.outputs\.preview_branch \}\}/,
        '--branch=main',
      )
      assert.doesNotMatch(unsafe, /--branch=main/)
    },
    /--branch=main/,
    'preview contract must reject a production branch target',
  )
  assert.throws(
    () => {
      const unsafe = refreshWorkflow.replace('permissions: {}', 'permissions:\n  contents: write')
      assert.match(unsafe, /^permissions: \{\}$/m)
    },
    /permissions/,
    'workflow contract must reject writable default permissions',
  )

  assert.equal(
    headersTemplate.match(
      new RegExp(
        `^[\\t ]*${CANDIDATE_HEADER}:[\\t ]*${CANDIDATE_HEADER_PLACEHOLDER}[\\t ]*$`,
        'gm',
      ),
    )?.length,
    1,
    'source _headers must contain one exact build-time candidate placeholder',
  )
  assert.doesNotMatch(pagesVerifierSource, /process\.env\.CLOUDFLARE_API_TOKEN/)
  assert.doesNotMatch(pagesVerifierSource, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i)
  assert.match(pagesVerifierSource, /method: 'GET'/)
  assert.match(gumroadProvisioner, /RETIRED/)
  assert.doesNotMatch(gumroadProvisioner, /fetch\(`https:\/\/api\.gumroad\.com/)

  process.stdout.write('Release infrastructure contract tests passed.\n')
} finally {
  rmTreeWithRetry(tempRoot)
  rmTreeWithRetry(previewRoot)
}
