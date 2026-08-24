import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  CANDIDATE_HEADER,
  CANDIDATE_HEADER_PLACEHOLDER,
  OFFICIAL_REPOSITORY,
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
  parsePublicReleaseIdentity,
  publicSwVersion,
  verifyDeployedIdentity,
  verifyPublic,
} from './tools/setup-cloudflare-release-edge.mjs'

const root = resolve(import.meta.dirname)
const workflow = readFileSync(join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8')
const verifierPath = join(root, 'tools', 'verify-release-dispatch.mjs')
const pagesVerifierPath = join(root, 'tools', 'setup-cloudflare-release-edge.mjs')
const pagesVerifierSource = readFileSync(pagesVerifierPath, 'utf8')
const headersTemplate = readFileSync(join(root, 'website', '_headers'), 'utf8')
const gumroadProvisioner = readFileSync(join(root, 'tools', 'gumroad-provision.mjs'), 'utf8')
const tempRoot = mkdtempSync(join(tmpdir(), 'astroprecise-release-'))

function git(args, cwd = tempRoot) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function jobBlock(name) {
  const start = workflow.indexOf(`  ${name}:`)
  assert.notEqual(start, -1, `${name} job must exist`)
  const remainder = workflow.slice(start + name.length + 3)
  const nextJobOffset = remainder.search(/^ {2}[a-zA-Z0-9_-]+:\r?$/m)
  return workflow.slice(
    start,
    nextJobOffset === -1 ? undefined : start + name.length + 3 + nextJobOffset,
  )
}

function assertPinnedActions(source, approvedActions) {
  const uses = [...source.matchAll(/^\s*(?:-\s*)?uses:\s+([^\s#]+)(?:\s+#.*)?$/gm)]
  assert.ok(uses.length >= approvedActions.size, 'workflow must contain every approved action')
  for (const [, reference] of uses) {
    const match = /^([^@]+)@([0-9a-f]{40})$/.exec(reference)
    assert.ok(match, `${reference} must use exactly one full lowercase commit SHA`)
    const [, action, sha] = match
    assert.ok(approvedActions.has(action), `${action} is not an approved external action`)
    assert.equal(sha, approvedActions.get(action), `${action} must use its approved commit SHA`)
  }
  return uses.length
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

try {
  mkdirSync(join(tempRoot, 'website'), { recursive: true })
  mkdirSync(join(tempRoot, 'dist'), { recursive: true })
  writeFileSync(join(tempRoot, 'website', 'sw.js'), 'const V = "ap-v901";\n', 'utf8')
  writeFileSync(join(tempRoot, 'dist', 'sw.js'), 'const V="ap-v901";\n', 'utf8')
  writeFileSync(
    join(tempRoot, 'dist', '_headers'),
    `/*\n  ${CANDIDATE_HEADER}: ${CANDIDATE_HEADER_PLACEHOLDER}\n`,
    'utf8',
  )
  git(['init', '--quiet'])
  git(['config', 'user.name', 'Release Contract Test'])
  git(['config', 'user.email', 'release-contract@example.invalid'])
  git(['add', 'website/sw.js'])
  git(['commit', '--quiet', '-m', 'release fixture'])

  const candidateSha = git(['rev-parse', 'HEAD'])
  const releaseTag = `release/ap-v901-${candidateSha.slice(0, 12)}`
  git(['tag', releaseTag])
  const validEnv = {
    GITHUB_REPOSITORY: OFFICIAL_REPOSITORY,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: `refs/tags/${releaseTag}`,
    GITHUB_REF_PROTECTED: 'true',
    GITHUB_SHA: candidateSha,
    CANDIDATE_SHA: candidateSha,
    RELEASE_TAG: releaseTag,
    RELEASE_VERSION: 'ap-v901',
  }

  assert.deepEqual(verifyReleaseDispatch({ env: validEnv, cwd: tempRoot }), {
    candidateSha,
    releaseTag,
    releaseVersion: 'ap-v901',
  })

  for (const [label, change, pattern] of [
    ['wrong repository', (env) => (env.GITHUB_REPOSITORY = 'attacker/fork'), /GITHUB_REPOSITORY/],
    ['wrong event', (env) => (env.GITHUB_EVENT_NAME = 'push'), /workflow_dispatch/],
    ['unprotected tag', (env) => (env.GITHUB_REF_PROTECTED = 'false'), /must be protected/],
    ['uppercase candidate', (env) => (env.CANDIDATE_SHA = candidateSha.toUpperCase()), /lowercase/],
    ['branch ref', (env) => (env.GITHUB_REF = 'refs/heads/main'), /release tag/],
    ['mismatched event SHA', (env) => (env.GITHUB_SHA = 'a'.repeat(40)), /GITHUB_SHA/],
  ]) {
    const env = { ...validEnv }
    change(env)
    assert.throws(() => verifyReleaseDispatch({ env, cwd: tempRoot }), pattern, label)
  }

  assert.equal(parseServiceWorkerVersion('const V = "ap-v901";'), 'ap-v901')
  assert.throws(
    () => parseServiceWorkerVersion('// const V = "ap-v901";\nconst X = 1;'),
    /first executable/,
  )
  assert.throws(
    () => parseServiceWorkerVersion('const V = "ap-v901";\nlet V = "ap-v902";'),
    /exactly one executable V declaration/,
  )

  const document = verifyReleaseArtifactBuild({ env: validEnv, cwd: tempRoot })
  assert.deepEqual(document, exactIdentity(candidateSha))
  assert.deepEqual(
    releaseIdentityDocument({ candidateSha, releaseTag, releaseVersion: 'ap-v901' }),
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
  const dispatchCli = spawnSync(process.execPath, [verifierPath], {
    cwd: tempRoot,
    env: { ...process.env, ...validEnv, GITHUB_OUTPUT: dispatchOutput },
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(dispatchCli.status, 0, dispatchCli.stderr)
  assert.match(readFileSync(dispatchOutput, 'utf8'), new RegExp(`candidate_sha=${candidateSha}`))

  assert.deepEqual(parseArgs(['--verify-public', '--candidate', candidateSha]), {
    mode: 'verify-public',
    candidate: candidateSha,
    baseUrl: null,
    help: false,
  })
  assert.deepEqual(
    parseArgs([
      '--verify-url',
      'https://abc.astroprecise.pages.dev',
      '--candidate',
      candidateSha,
    ]),
    {
      mode: 'verify-url',
      candidate: candidateSha,
      baseUrl: 'https://abc.astroprecise.pages.dev',
      help: false,
    },
  )
  assert.throws(() => parseArgs(['--apply', '--candidate', candidateSha]), /retired/)
  assert.throws(() => parseArgs(['--verify-public']), /requires --candidate/)
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

  const offline = spawnSync(process.execPath, [pagesVerifierPath, '--dry-run', '--candidate', candidateSha], {
    cwd: root,
    env: { ...process.env, CLOUDFLARE_API_TOKEN: 'must-not-be-read' },
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(offline.status, 0, offline.stderr)
  assert.match(offline.stdout, /OFFLINE PLAN/)
  const retiredApply = spawnSync(process.execPath, [pagesVerifierPath, '--apply', '--candidate', candidateSha], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.notEqual(retiredApply.status, 0)
  assert.match(retiredApply.stderr, /retired GitHub Pages edge-mutation route/)

  assert.match(workflow, /^name: Deploy verified release to Cloudflare Pages$/m)
  assert.match(workflow, /^on:\r?\n {2}workflow_dispatch:/m)
  assert.doesNotMatch(workflow, /^\s{2}push:/m)
  assert.match(
    workflow,
    /candidate_sha:\r?\n\s+description:[^\r\n]+\r?\n\s+required: true\r?\n\s+type: string/,
  )
  assert.match(workflow, /^permissions: \{\}$/m)
  assert.doesNotMatch(workflow, /pages: write|id-token: write/)
  assert.doesNotMatch(workflow, /actions\/(?:configure-pages|upload-pages-artifact|deploy-pages)@/)
  assert.doesNotMatch(workflow, /name: github-pages/)

  const identityJob = jobBlock('release_identity')
  assert.match(identityJob, /permissions:\r?\n\s+contents: read/)
  assert.match(identityJob, /ref: \$\{\{ github\.ref \}\}/)
  assert.match(identityJob, /fetch-depth: 0/)
  assert.match(identityJob, /fetch-tags: true/)
  assert.match(identityJob, /persist-credentials: false/)
  assert.match(identityJob, /run: node tools\/verify-release-dispatch\.mjs/)

  for (const runBlock of workflow.matchAll(
    /(?:^|\n)\s+run:\s*(?:\|\s*\n(?:\s{10}.*\n?)*|[^\r\n]*)/g,
  )) {
    assert.doesNotMatch(runBlock[0], /inputs\.candidate_sha/)
  }
  for (const job of ['test', 'deploy', 'postdeploy']) {
    assert.match(
      jobBlock(job),
      /ref: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
      `${job} must check out the verifier-approved exact SHA`,
    )
  }

  const deployJob = jobBlock('deploy')
  assert.match(deployJob, /needs: \[release_identity, test\]/)
  assert.match(deployJob, /name: cloudflare-pages/)
  assert.match(deployJob, /url: \$\{\{ steps\.cloudflare\.outputs\.deployment-url \}\}/)
  assert.match(deployJob, /apiToken: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/)
  assert.match(deployJob, /accountId: \$\{\{ secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/)
  assert.match(deployJob, /wranglerVersion: '4\.125\.0'/)
  assert.match(deployJob, /--stamp-cloudflare-pages dist/)
  assert.match(deployJob, /pages deploy dist/)
  assert.match(deployJob, /--project-name=astroprecise/)
  assert.match(deployJob, /--branch=main/)
  assert.match(
    deployJob,
    /PAGES_ENVIRONMENT: \$\{\{ steps\.cloudflare\.outputs\.pages-environment \}\}/,
  )
  assert.match(deployJob, /\[ "\$PAGES_ENVIRONMENT" != "production" \]/)
  assert.match(
    deployJob,
    /--commit-hash=\$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
  )
  assert.match(deployJob, /--commit-dirty=false/)

  const postdeployJob = jobBlock('postdeploy')
  assert.match(postdeployJob, /DEPLOYMENT_URL: \$\{\{ needs\.deploy\.outputs\.deployment_url \}\}/)
  assert.match(
    postdeployJob,
    /--verify-url "\$DEPLOYMENT_URL" --candidate "\$CANDIDATE_SHA"/,
  )
  assert.match(postdeployJob, /--verify-public --candidate "\$CANDIDATE_SHA"/)
  assert.ok(
    postdeployJob.indexOf('--verify-public') < postdeployJob.indexOf('ping-indexnow.mjs'),
    'IndexNow must run only after both public identity checks pass',
  )

  const approvedActions = new Map([
    ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
    ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
    ['cloudflare/wrangler-action', 'ebbaa1584979971c8614a24965b4405ff95890e0'],
  ])
  const actionCount = assertPinnedActions(workflow, approvedActions)
  assert.ok(actionCount >= 7)
  const checkoutSha = approvedActions.get('actions/checkout')
  for (const badRef of ['main', 'v7', checkoutSha.slice(0, 12)]) {
    assert.throws(
      () =>
        assertPinnedActions(
          workflow.replace(`actions/checkout@${checkoutSha}`, `actions/checkout@${badRef}`),
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

  assert.equal(
    headersTemplate.match(
      new RegExp(`^[\\t ]*${CANDIDATE_HEADER}:[\\t ]*${CANDIDATE_HEADER_PLACEHOLDER}[\\t ]*$`, 'gm'),
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
  rmSync(tempRoot, { recursive: true, force: true })
}
