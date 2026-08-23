import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  RELEASE_IDENTITY_SCHEMA,
  OFFICIAL_REPOSITORY,
  parseServiceWorkerVersion,
  releaseIdentityDocument,
  verifyReleaseDispatch,
  verifyReleaseArtifactBuild,
  writeReleaseIdentityArtifact,
} from './tools/verify-release-dispatch.mjs'
import {
  compensateApplyFailure,
  executeTransformMutation,
  inspectDns,
  inspectTransformRules,
  parsePublicReleaseIdentity,
  patchDnsProxyFlags,
  planTransformMutation,
  publicSwVersion,
  rollbackTransformMutation,
  verifyDeployedIdentity,
} from './tools/setup-cloudflare-release-edge.mjs'

const root = resolve(import.meta.dirname)
const workflow = readFileSync(join(root, '.github', 'workflows', 'deploy-pages.yml'), 'utf8')
const verifierPath = join(root, 'tools', 'verify-release-dispatch.mjs')
const edgeToolPath = join(root, 'tools', 'setup-cloudflare-release-edge.mjs')
const edgeTool = readFileSync(edgeToolPath, 'utf8')
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
  const nextJobOffset = remainder.search(/^  [a-zA-Z0-9_-]+:\r?$/m)
  return workflow.slice(
    start,
    nextJobOffset === -1 ? undefined : start + name.length + 3 + nextJobOffset,
  )
}

let validEnv

function expectEnvRejected(label, change, expectedPattern) {
  const env = { ...validEnv }
  change(env)
  assert.throws(
    () => verifyReleaseDispatch({ env, cwd: tempRoot }),
    expectedPattern,
    `${label} must be rejected`,
  )
}

function runEdgeTool(args) {
  const env = { ...process.env }
  delete env.CLOUDFLARE_API_TOKEN
  return spawnSync(process.execPath, [edgeToolPath, ...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 10_000,
  })
}

function assertPinnedActions(source, approvedActions) {
  const uses = [...source.matchAll(/^\s*(?:-\s*)?uses:\s+([^\s#]+)(?:\s+#.*)?$/gm)]
  assert.ok(uses.length >= approvedActions.size, 'workflow must contain all approved actions')
  for (const [, reference] of uses) {
    const match = /^([^@]+)@([0-9a-f]{40})$/.exec(reference)
    assert.ok(match, `${reference} must use exactly one full lowercase commit SHA`)
    const [, action, sha] = match
    assert.ok(approvedActions.has(action), `${action} is not an approved external action`)
    assert.equal(sha, approvedActions.get(action), `${action} must use its approved commit SHA`)
  }
  return uses.length
}

try {
  mkdirSync(join(tempRoot, 'website'), { recursive: true })
  mkdirSync(join(tempRoot, 'dist'), { recursive: true })
  writeFileSync(join(tempRoot, 'website', 'sw.js'), 'const V = "ap-v901";\n', 'utf8')
  writeFileSync(
    join(tempRoot, 'dist', 'sw.js'),
    'const V="ap-v901",PRECACHE_MODE="launch-shell";\n',
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

  validEnv = {
    GITHUB_REPOSITORY: OFFICIAL_REPOSITORY,
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: `refs/tags/${releaseTag}`,
    GITHUB_REF_PROTECTED: 'true',
    GITHUB_SHA: candidateSha,
    CANDIDATE_SHA: candidateSha,
  }

  assert.deepEqual(verifyReleaseDispatch({ env: validEnv, cwd: tempRoot }), {
    candidateSha,
    releaseTag,
    releaseVersion: 'ap-v901',
  })

  const outputPath = join(tempRoot, 'github-output.txt')
  const cli = spawnSync(process.execPath, [verifierPath], {
    cwd: tempRoot,
    env: { ...process.env, ...validEnv, GITHUB_OUTPUT: outputPath },
    encoding: 'utf8',
    timeout: 10_000,
  })
  assert.equal(cli.error, undefined, `release verifier CLI failed to start: ${cli.error}`)
  assert.equal(cli.status, 0, cli.stderr)
  assert.match(cli.stdout, new RegExp(`Verified ${releaseTag} at ${candidateSha}`))
  assert.equal(
    readFileSync(outputPath, 'utf8'),
    `candidate_sha=${candidateSha}\nrelease_tag=${releaseTag}\nrelease_version=ap-v901\n`,
  )

  const artifactEnv = {
    CANDIDATE_SHA: candidateSha,
    RELEASE_TAG: releaseTag,
    RELEASE_VERSION: 'ap-v901',
  }
  const artifactDocument = verifyReleaseArtifactBuild({ env: artifactEnv, cwd: tempRoot })
  assert.deepEqual(artifactDocument, {
    schema: RELEASE_IDENTITY_SCHEMA,
    candidateSha,
    releaseTag,
    releaseVersion: 'ap-v901',
  })
  const artifactPath = join(
    tempRoot,
    'dist',
    '.well-known',
    'astroprecise-release',
    `${candidateSha}.json`,
  )
  writeReleaseIdentityArtifact(artifactDocument, artifactPath)
  assert.deepEqual(JSON.parse(readFileSync(artifactPath, 'utf8')), artifactDocument)
  assert.throws(
    () => writeReleaseIdentityArtifact(artifactDocument, artifactPath),
    /EEXIST/,
    'an existing artifact path must never be silently overwritten',
  )

  expectEnvRejected(
    'wrong repository',
    (env) => {
      env.GITHUB_REPOSITORY = 'attacker/astroprecise'
    },
    /GITHUB_REPOSITORY/,
  )

  const ambiguousTag = `release/ap-v901-${'0'.repeat(12)}`
  git(['tag', ambiguousTag])
  assert.throws(
    () => verifyReleaseDispatch({ env: validEnv, cwd: tempRoot }),
    /must identify exactly one release tag/,
    'one service-worker version must not identify multiple release tags',
  )
  git(['tag', '--delete', ambiguousTag])
  expectEnvRejected(
    'wrong event',
    (env) => {
      env.GITHUB_EVENT_NAME = 'push'
    },
    /workflow_dispatch/,
  )
  expectEnvRejected(
    'unprotected tag',
    (env) => {
      env.GITHUB_REF_PROTECTED = 'false'
    },
    /must be protected/,
  )
  expectEnvRejected(
    'branch ref',
    (env) => {
      env.GITHUB_REF = 'refs/heads/main'
    },
    /must select a release tag/,
  )
  expectEnvRejected(
    'malformed tag',
    (env) => {
      env.GITHUB_REF = `refs/tags/deploy/ap-v901-${candidateSha.slice(0, 12)}`
    },
    /tag must match/,
  )
  expectEnvRejected(
    'uppercase candidate SHA',
    (env) => {
      env.CANDIDATE_SHA = candidateSha.toUpperCase()
    },
    /40 lowercase/,
  )
  expectEnvRejected(
    'short GitHub SHA',
    (env) => {
      env.GITHUB_SHA = candidateSha.slice(0, 12)
    },
    /GITHUB_SHA must be exactly 40 lowercase/,
  )
  expectEnvRejected(
    'tag suffix mismatch',
    (env) => {
      env.GITHUB_REF = 'refs/tags/release/ap-v901-000000000000'
    },
    /suffix does not match/,
  )
  expectEnvRejected(
    'GitHub SHA mismatch',
    (env) => {
      env.GITHUB_SHA = '0'.repeat(40)
    },
    /GITHUB_SHA does not match/,
  )

  assert.throws(
    () =>
      verifyReleaseDispatch({
        env: validEnv,
        cwd: tempRoot,
        git: (args) => {
          if (args[0] === 'rev-parse') return '0'.repeat(40)
          if (args[0] === 'tag') return releaseTag
          return candidateSha
        },
      }),
    /HEAD does not match/,
    'a different checked-out commit must be rejected',
  )
  assert.throws(
    () =>
      verifyReleaseDispatch({
        env: validEnv,
        cwd: tempRoot,
        git: (args) => {
          if (args[0] === 'rev-list') return '0'.repeat(40)
          if (args[0] === 'tag') return releaseTag
          return candidateSha
        },
      }),
    /tag commit does not match/,
    'a moved release tag must be rejected',
  )
  assert.throws(
    () =>
      verifyReleaseDispatch({
        env: validEnv,
        cwd: tempRoot,
        readFile: () => 'const V = "ap-v902";\n',
      }),
    /does not match website\/sw\.js/,
    'a service-worker version mismatch must be rejected',
  )
  assert.throws(
    () => parseServiceWorkerVersion('const V = "ap-v901";\nconst V = "ap-v901";\n'),
    /exactly one/,
    'ambiguous service-worker release declarations must be rejected',
  )
  assert.equal(
    parseServiceWorkerVersion('const V="ap-v901",PRECACHE_MODE="launch-shell";'),
    'ap-v901',
    'the first version declarator must survive production const-declaration minification',
  )
  assert.throws(
    () => parseServiceWorkerVersion('const V="ap-v901",OTHER=1,V="ap-v901";'),
    /exactly one/,
    'a second minified V declarator must be rejected',
  )

  // Cloudflare's default path is demonstrably offline. Candidate input alone
  // does not grant mutation authority, while malformed/mixed modes fail closed
  // before any token or network access is possible.
  const offlineCandidate = 'a'.repeat(40)
  const dryRun = runEdgeTool(['--dry-run', '--candidate', offlineCandidate])
  assert.equal(dryRun.error, undefined, `edge dry-run failed to start: ${dryRun.error}`)
  assert.equal(dryRun.status, 0, dryRun.stderr)
  assert.match(dryRun.stdout, /OFFLINE DRY RUN — no network requests and no mutations/)
  assert.match(dryRun.stdout, new RegExp(`Candidate: ${offlineCandidate}`))

  const candidateOnly = runEdgeTool(['--candidate', offlineCandidate])
  assert.equal(candidateOnly.status, 0, candidateOnly.stderr)
  assert.match(candidateOnly.stdout, /OFFLINE DRY RUN/)

  const malformedCandidate = runEdgeTool(['--dry-run', '--candidate', 'ABC123'])
  assert.notEqual(malformedCandidate.status, 0)
  assert.match(malformedCandidate.stderr, /exact lowercase 40-character/i)

  const conflictingModes = runEdgeTool([
    '--dry-run',
    '--verify-public',
    '--candidate',
    offlineCandidate,
  ])
  assert.notEqual(conflictingModes.status, 0)
  assert.match(conflictingModes.stderr, /Choose exactly one mode/)

  const applyWithoutCandidate = runEdgeTool(['--apply'])
  assert.notEqual(applyWithoutCandidate.status, 0)
  assert.match(applyWithoutCandidate.stderr, /--apply requires --candidate/)
  assert.doesNotMatch(applyWithoutCandidate.stderr, /CLOUDFLARE_API_TOKEN/)

  const arbitraryApply = runEdgeTool(['--apply', '--candidate', offlineCandidate])
  assert.notEqual(arbitraryApply.status, 0)
  assert.match(arbitraryApply.stderr, /does not match local HEAD|clean candidate worktree/)
  assert.doesNotMatch(arbitraryApply.stderr, /CLOUDFLARE_API_TOKEN/)

  assert.throws(
    () => publicSwVersion('// const V = "ap-v901";\n', 'comment-only fixture'),
    /invalid service-worker identity/,
    'a comment must not satisfy the public service-worker identity check',
  )
  for (const invalidSource of [
    '/*\nconst V = "ap-v901";\n*/\n',
    'if (false) {\n  const V = "ap-v901";\n}\n',
  ]) {
    assert.throws(
      () => parseServiceWorkerVersion(invalidSource),
      /first executable top-level statement/,
      'commented or nested declarations must not satisfy release identity',
    )
  }
  const exactPublicIdentity = releaseIdentityDocument({
    candidateSha,
    releaseTag,
    releaseVersion: 'ap-v901',
  })
  assert.deepEqual(
    parsePublicReleaseIdentity(
      JSON.stringify(exactPublicIdentity),
      candidateSha,
      'ap-v901',
      'fixture',
    ),
    exactPublicIdentity,
  )
  assert.throws(
    () =>
      parsePublicReleaseIdentity(
        JSON.stringify({ ...exactPublicIdentity, candidateSha: 'b'.repeat(40) }),
        candidateSha,
        'ap-v901',
        'stale fixture',
      ),
    /does not exactly identify candidate/,
    'the public JSON must bind the exact candidate even when ap-v901 matches',
  )
  const exactIdentityResponse = {
    status: 200,
    url: `https://astroprecise.app/.well-known/astroprecise-release/${candidateSha}.json`,
    rawHeaders: ['X-Coherence-Candidate-Tip', candidateSha],
    body: JSON.stringify(exactPublicIdentity),
  }
  await assert.rejects(
    () =>
      verifyDeployedIdentity('astroprecise.app', candidateSha, 'ap-v901', true, async () => [
        { ...exactIdentityResponse, status: 404, body: 'missing' },
      ]),
    /ended with HTTP 404/,
    'a missing candidate-specific public identity file must reject',
  )
  await assert.rejects(
    () =>
      verifyDeployedIdentity('astroprecise.app', candidateSha, 'ap-v901', true, async () => [
        {
          ...exactIdentityResponse,
          body: JSON.stringify({ ...exactPublicIdentity, candidateSha: 'b'.repeat(40) }),
        },
      ]),
    /does not exactly identify candidate/,
  )
  let requestedIdentityUrl = ''
  await verifyDeployedIdentity('astroprecise.app', candidateSha, 'ap-v901', true, async (url) => {
    requestedIdentityUrl = url
    return [exactIdentityResponse]
  })
  assert.match(requestedIdentityUrl, new RegExp(`${candidateSha}\\.json`))

  const unrelatedRule = {
    id: 'unrelated-rule',
    ref: 'unrelated_rule',
    description: 'Unrelated response rule',
    expression: 'true',
    action: 'rewrite',
    action_parameters: { headers: { 'X-Unrelated': { operation: 'set', value: 'kept' } } },
    enabled: true,
  }
  const oldManagedRule = {
    id: 'managed-rule',
    version: '1',
    last_updated: '2026-08-23T20:00:00.000000Z',
    ref: 'astroprecise_release_identity_v1',
    description: '[managed:astroprecise-release-identity:v1] Set exact release candidate identity',
    expression: 'http.host in {"astroprecise.app" "www.astroprecise.app"}',
    action: 'rewrite',
    action_parameters: {
      headers: { 'X-Coherence-Candidate-Tip': { operation: 'set', value: 'a'.repeat(40) } },
    },
    enabled: true,
  }
  const transformState = {
    zone: { id: 'zone-id' },
    ruleset: {
      id: 'ruleset-id',
      version: '6',
      last_updated: '2026-08-23T20:00:00.000000Z',
      rules: [unrelatedRule, oldManagedRule],
    },
  }
  transformState.transform = inspectTransformRules(transformState.ruleset, 'b'.repeat(40))
  const updatePlan = planTransformMutation(transformState)
  assert.equal(updatePlan.kind, 'update-rule')
  const ruleWithExtraHeader = {
    id: 'managed-rule',
    version: '2',
    last_updated: '2026-08-23T20:01:00.000000Z',
    ...updatePlan.desired,
    action_parameters: {
      headers: {
        ...updatePlan.desired.action_parameters.headers,
        'Set-Cookie': { operation: 'set', value: 'unexpected=true' },
      },
    },
  }
  assert.equal(
    inspectTransformRules({ rules: [ruleWithExtraHeader] }, 'b'.repeat(40)).matches,
    false,
    'an extra response-header mutation must not compare equal to the managed rule',
  )
  assert.throws(
    () =>
      inspectTransformRules(
        {
          rules: [
            {
              ...unrelatedRule,
              description:
                '[managed:astroprecise-release-identity:v1] Set exact release candidate identity',
            },
          ],
        },
        'b'.repeat(40),
      ),
    /managed description without the managed ref/,
    'description alone must never confer managed-rule ownership',
  )

  const appliedUpdatedRule = {
    id: 'managed-rule',
    version: '2',
    last_updated: '2026-08-23T20:01:00.000000Z',
    ...updatePlan.desired,
  }
  const appliedUpdateRuleset = {
    id: 'ruleset-id',
    version: '7',
    last_updated: '2026-08-23T20:01:00.000000Z',
    rules: [unrelatedRule, appliedUpdatedRule],
  }
  const restoredRule = {
    id: 'managed-rule',
    version: '3',
    last_updated: '2026-08-23T20:02:00.000000Z',
    ...updatePlan.previous,
  }
  const restoredRuleset = {
    id: 'ruleset-id',
    version: '8',
    last_updated: '2026-08-23T20:02:00.000000Z',
    rules: [unrelatedRule, restoredRule],
  }
  const transformCalls = []
  const transformApi = async (_token, path, options = {}) => {
    transformCalls.push({ path, options })
    return appliedUpdateRuleset
  }
  const executedUpdatePlan = await executeTransformMutation(
    'fixture-token',
    updatePlan,
    transformApi,
  )
  assert.equal(transformCalls.length, 1)
  assert.equal(transformCalls[0].path, '/zones/zone-id/rulesets/ruleset-id/rules/managed-rule')
  assert.equal(transformCalls[0].options.method, 'PATCH')
  assert.deepEqual(transformCalls[0].options.body, updatePlan.desired)

  const rollbackCalls = []
  let updateRestored = false
  const rollbackApi = async (_token, path, options = {}) => {
    rollbackCalls.push({ path, options })
    if (options.method === undefined) {
      return updateRestored ? restoredRuleset : appliedUpdateRuleset
    }
    if (options.method === 'PATCH') {
      updateRestored = true
      return restoredRuleset
    }
    return null
  }
  await rollbackTransformMutation('fixture-token', executedUpdatePlan, rollbackApi)
  assert.equal(rollbackCalls.length, 3)
  assert.equal(rollbackCalls[1].options.method, 'PATCH')
  assert.deepEqual(rollbackCalls[1].options.body, updatePlan.previous)
  await assert.rejects(
    () =>
      rollbackTransformMutation(
        'fixture-token',
        executedUpdatePlan,
        async (_token, _path, options = {}) => {
          if (options.method === 'PATCH') return restoredRuleset
          return appliedUpdateRuleset
        },
      ),
    /postcondition was not observed/,
    'an accepted Transform rollback write without restored readback must fail closed',
  )
  await assert.rejects(
    () =>
      executeTransformMutation('fixture-token', updatePlan, async () => ({
        id: 'ruleset-id',
        rules: [unrelatedRule, { id: 'managed-rule', ...updatePlan.desired }],
      })),
    /stable rule\/ruleset revisions/,
    'a Transform mutation response without revision ownership must fail closed',
  )
  await assert.rejects(
    () =>
      executeTransformMutation('fixture-token', updatePlan, async () => ({
        ...appliedUpdateRuleset,
        version: '8',
        rules: [{ ...appliedUpdatedRule, version: '3' }],
      })),
    /stable rule\/ruleset revisions/,
    'a skipped successor version must expose an intervening write and fail closed',
  )
  await assert.rejects(
    () =>
      rollbackTransformMutation('fixture-token', executedUpdatePlan, async () => ({
        ...appliedUpdateRuleset,
        version: '8',
        last_updated: '2026-08-23T20:03:00.000000Z',
        rules: [
          unrelatedRule,
          {
            ...appliedUpdatedRule,
            version: '3',
            last_updated: '2026-08-23T20:03:00.000000Z',
          },
        ],
      })),
    /changed after this invocation/,
    'an identical concurrent update with a newer revision must not be rolled back',
  )
  await assert.rejects(
    () =>
      rollbackTransformMutation('fixture-token', executedUpdatePlan, async () => restoredRuleset),
    /stale readback cannot prove/,
    'an already-previous readback must not be accepted as proof of this rollback',
  )

  const createState = {
    zone: { id: 'zone-id' },
    ruleset: {
      id: 'ruleset-id',
      version: '8',
      last_updated: '2026-08-23T20:02:00.000000Z',
      rules: [unrelatedRule],
    },
  }
  createState.transform = inspectTransformRules(createState.ruleset, 'b'.repeat(40))
  const createPlan = planTransformMutation(createState)
  const createCalls = []
  const executedCreatePlan = await executeTransformMutation(
    'fixture-token',
    createPlan,
    async (_token, path, options) => {
      createCalls.push({ path, options })
      return {
        id: 'ruleset-id',
        version: '9',
        last_updated: '2026-08-23T20:04:00.000000Z',
        rules: [
          unrelatedRule,
          {
            id: 'new-managed-rule',
            version: '1',
            last_updated: '2026-08-23T20:04:00.000000Z',
            ...createPlan.desired,
          },
        ],
      }
    },
  )
  assert.equal(createCalls[0].path, '/zones/zone-id/rulesets/ruleset-id/rules')
  assert.equal(createCalls[0].options.method, 'POST')
  const createRollbackCalls = []
  let createdRuleDeleted = false
  const createdRuleset = {
    id: 'ruleset-id',
    version: '9',
    last_updated: '2026-08-23T20:04:00.000000Z',
    rules: [
      unrelatedRule,
      {
        id: 'new-managed-rule',
        version: '1',
        last_updated: '2026-08-23T20:04:00.000000Z',
        ...createPlan.desired,
      },
    ],
  }
  const deletedRuleset = {
    id: 'ruleset-id',
    version: '10',
    last_updated: '2026-08-23T20:05:00.000000Z',
    rules: [unrelatedRule],
  }
  await rollbackTransformMutation(
    'fixture-token',
    executedCreatePlan,
    async (_token, path, options = {}) => {
      createRollbackCalls.push({ path, options })
      if (options.method === undefined) {
        return createdRuleDeleted ? deletedRuleset : createdRuleset
      }
      if (options.method === 'DELETE') {
        createdRuleDeleted = true
        return deletedRuleset
      }
      return null
    },
  )
  assert.equal(createRollbackCalls[1].options.method, 'DELETE')
  assert.equal(
    createRollbackCalls[1].path,
    '/zones/zone-id/rulesets/ruleset-id/rules/new-managed-rule',
  )
  await assert.rejects(
    () =>
      executeTransformMutation('fixture-token', createPlan, async () => ({
        id: 'ruleset-id',
        version: '9',
        last_updated: '2026-08-23T20:04:00.000000Z',
        rules: [unrelatedRule, { ...createPlan.desired }],
      })),
    /ownership is unproven/,
    'a create response without a stable created-rule id must fail closed',
  )
  let concurrentDeleteCalls = 0
  await assert.rejects(
    () =>
      rollbackTransformMutation(
        'fixture-token',
        createPlan,
        async (_token, _path, options = {}) => {
          if (options.method === 'DELETE') concurrentDeleteCalls += 1
          return createdRuleset
        },
      ),
    /mutation-response rule and ruleset revisions/,
    'an identical concurrent rule must not be deleted when this invocation has no returned id',
  )
  assert.equal(concurrentDeleteCalls, 0)
  await assert.rejects(
    () =>
      rollbackTransformMutation('fixture-token', executedCreatePlan, async () => deletedRuleset),
    /absent from readback/,
    'an absent created rule must not be accepted from a possibly stale entrypoint read',
  )

  const createRulesetState = { zone: { id: 'zone-id' }, ruleset: null }
  createRulesetState.transform = inspectTransformRules(null, 'b'.repeat(40))
  const createRulesetPlan = planTransformMutation(createRulesetState)
  assert.equal(createRulesetPlan.kind, 'create-ruleset')
  const newEntrypoint = {
    id: 'new-ruleset-id',
    version: '1',
    last_updated: '2026-08-23T20:06:00.000000Z',
    rules: [
      {
        id: 'new-entrypoint-rule',
        version: '1',
        last_updated: '2026-08-23T20:06:00.000000Z',
        ...createRulesetPlan.desired,
      },
    ],
  }
  const executedCreateRulesetPlan = await executeTransformMutation(
    'fixture-token',
    createRulesetPlan,
    async () => newEntrypoint,
  )
  const emptiedEntrypoint = {
    id: 'new-ruleset-id',
    version: '2',
    last_updated: '2026-08-23T20:07:00.000000Z',
    rules: [],
  }
  let entrypointRuleDeleted = false
  await rollbackTransformMutation(
    'fixture-token',
    executedCreateRulesetPlan,
    async (_token, _path, options = {}) => {
      if (options.method === 'DELETE') {
        entrypointRuleDeleted = true
        return emptiedEntrypoint
      }
      return entrypointRuleDeleted ? emptiedEntrypoint : newEntrypoint
    },
  )

  const pagesA = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'].map(
    (content, index) => ({
      id: `apex-${index}`,
      type: 'A',
      name: 'astroprecise.app',
      content,
      proxied: true,
    }),
  )
  const pagePadding = Array.from({ length: 96 }, (_value, index) => ({
    id: `txt-${index}`,
    type: 'TXT',
    name: 'astroprecise.app',
    content: `fixture-${index}`,
  }))
  const wwwCname = {
    id: 'www-cname',
    type: 'CNAME',
    name: 'www.astroprecise.app',
    content: 'jonnydavx-eng.github.io',
    proxied: true,
  }
  const paginatedApi = async (_token, path) => {
    const request = new URL(`https://api.invalid${path}`)
    const name = request.searchParams.get('name')
    const page = Number(request.searchParams.get('page'))
    if (name === 'astroprecise.app' && page === 1) return [...pagesA, ...pagePadding]
    if (name === 'astroprecise.app' && page === 2) {
      return [
        {
          id: 'hidden-https-route',
          type: 'HTTPS',
          name: 'astroprecise.app',
          content: '1 evil.example.',
        },
      ]
    }
    if (name === 'www.astroprecise.app' && page === 1) return [wwwCname]
    return []
  }
  await assert.rejects(
    () => inspectDns('fixture-token', 'zone-id', paginatedApi),
    /Unexpected apex\/www .*HTTPS.*routing record/,
    'pagination and HTTPS/SVCB bypass records must be inspected',
  )

  const originalDns = [...pagesA, wwwCname].map((record) => ({
    ...record,
    proxied: false,
  }))
  const dnsCalls = []
  await patchDnsProxyFlags(
    'fixture-token',
    'zone-id',
    originalDns,
    async (_token, path, options) => {
      dnsCalls.push({ path, options })
      return {}
    },
  )
  assert.equal(dnsCalls.length, 1)
  assert.equal(dnsCalls[0].path, '/zones/zone-id/dns_records/batch')
  assert.deepEqual(
    dnsCalls[0].options.body.patches,
    originalDns.map((record) => ({ id: record.id, proxied: true })),
  )

  let transformRollbackCalls = 0
  const beforeDnsCompensation = await compensateApplyFailure({
    token: 'fixture-token',
    dnsPlan: null,
    transformPlan: executedUpdatePlan,
    rollbackTransform: async () => {
      transformRollbackCalls += 1
    },
  })
  assert.equal(beforeDnsCompensation.length, 0)
  assert.equal(transformRollbackCalls, 1, 'receipt-bound Transform rollback is allowed before DNS')

  transformRollbackCalls = 0
  const failedCompensation = await compensateApplyFailure({
    token: 'fixture-token',
    dnsPlan: { zoneId: 'zone-id', originals: originalDns, mutationAttempted: true },
    transformPlan: executedUpdatePlan,
    rollbackTransform: async () => {
      transformRollbackCalls += 1
    },
  })
  assert.equal(
    transformRollbackCalls,
    0,
    'DNS and the candidate Transform Rule must remain after any DNS write attempt',
  )
  assert.match(
    failedCompensation.join(' '),
    /Automatic DNS and Transform rollback are intentionally disabled/,
  )
  const mutationAttemptIndex = edgeTool.indexOf(
    'dnsPlan.mutationAttempted = dnsPlan.originals.length > 0',
  )
  const dnsWriteIndex = edgeTool.indexOf(
    'await patchDnsProxyFlags(token, dnsPlan.zoneId, dnsPlan.originals)',
  )
  assert.ok(
    mutationAttemptIndex >= 0 && mutationAttemptIndex < dnsWriteIndex,
    'DNS mutationAttempted must be set before awaiting a batch that could apply and then throw',
  )

  // Static mutation boundary: apply is the only mutating mode and it requires
  // a candidate; the one stable response header uses set on fixed hosts.
  // DELETE appears only in compensating rollback of resources this invocation
  // created. There are no whole-ruleset PUT, cache, purge, or product calls.
  assert.match(edgeTool, /arg === '--apply'/)
  assert.match(edgeTool, /mode === 'apply'\) && candidate === null/)
  assert.match(edgeTool, /const ZONE_NAME = 'astroprecise\.app';?/)
  assert.match(edgeTool, /const WWW_NAME = `www\.\$\{ZONE_NAME\}`;?/)
  assert.match(edgeTool, /new Set\(\[ZONE_NAME, WWW_NAME\]\)/)
  assert.match(edgeTool, /const CANDIDATE_HEADER = 'X-Coherence-Candidate-Tip';?/)
  assert.match(edgeTool, /operation: 'set',\r?\n\s+value: candidate/)
  assert.doesNotMatch(edgeTool, /method:\s*['"]PUT['"]/i)
  assert.doesNotMatch(edgeTool, /[`'"]\/[^`'"]*(?:purge|cache|product)/i)

  // Trigger, identity gate, and workflow-level deny-by-default permissions.
  assert.match(workflow, /^on:\r?\n  workflow_dispatch:\r?\n/m)
  assert.doesNotMatch(workflow, /^\s{2}push:/m)
  assert.match(
    workflow,
    /candidate_sha:\r?\n\s+description:[^\r\n]+\r?\n\s+required: true\r?\n\s+type: string/,
  )
  assert.match(workflow, /^permissions: \{\}$/m)
  assert.doesNotMatch(workflow, /^\s+if:\s*always\(\)/m)
  const identity = jobBlock('release_identity')
  assert.match(identity, /permissions:\r?\n\s+contents: read/)
  assert.match(identity, /ref: \$\{\{ github\.ref \}\}/)
  assert.match(identity, /fetch-depth: 0/)
  assert.match(identity, /fetch-tags: true/)
  assert.match(identity, /persist-credentials: false/)
  assert.match(identity, /run: node tools\/verify-release-dispatch\.mjs/)

  // No raw candidate input is ever expanded inside a shell command. Downstream
  // checkouts consume only the verifier's validated output.
  for (const runBlock of workflow.matchAll(
    /(?:^|\n)\s+run:\s*(?:\|\s*\n(?:\s{10}.*\n?)*|[^\r\n]*)/g,
  )) {
    assert.doesNotMatch(runBlock[0], /inputs\.candidate_sha/)
  }
  for (const job of ['test', 'build', 'postdeploy']) {
    assert.match(
      jobBlock(job),
      /ref: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
      `${job} must check out the verified exact SHA`,
    )
  }
  assert.match(jobBlock('deploy'), /needs: \[release_identity, test, build\]/)
  assert.match(jobBlock('postdeploy'), /needs: \[release_identity, deploy\]/)
  const buildJob = jobBlock('build')
  assert.match(buildJob, /RELEASE_TAG: \$\{\{ needs\.release_identity\.outputs\.release_tag \}\}/)
  assert.match(
    buildJob,
    /RELEASE_VERSION: \$\{\{ needs\.release_identity\.outputs\.release_version \}\}/,
  )
  assert.match(
    buildJob,
    /--write-artifact\s+"dist\/\.well-known\/astroprecise-release\/\$CANDIDATE_SHA\.json"/,
  )
  assert.match(
    jobBlock('postdeploy'),
    /CANDIDATE_SHA: \$\{\{ needs\.release_identity\.outputs\.candidate_sha \}\}/,
  )
  assert.match(
    jobBlock('postdeploy'),
    /node tools\/setup-cloudflare-release-edge\.mjs --verify-public --candidate "\$CANDIDATE_SHA"/,
  )

  // Every external action is immutable and pinned to its approved commit.
  const approvedActions = new Map([
    ['actions/checkout', '3d3c42e5aac5ba805825da76410c181273ba90b1'],
    ['actions/setup-node', '820762786026740c76f36085b0efc47a31fe5020'],
    ['actions/configure-pages', '45bfe0192ca1faeb007ade9deae92b16b8254a0d'],
    ['actions/upload-pages-artifact', 'fc324d3547104276b827a68afc52ff2a11cc49c9'],
    ['actions/deploy-pages', 'cd2ce8fcbc39b97be8ca5fce6e763baed58fa128'],
  ])
  const actionCount = assertPinnedActions(workflow, approvedActions)
  assert.ok(actionCount >= 5)
  const checkoutSha = approvedActions.get('actions/checkout')
  for (const badRef of ['main', 'v7', checkoutSha.slice(0, 12)]) {
    assert.throws(
      () =>
        assertPinnedActions(
          workflow.replace(`actions/checkout@${checkoutSha}`, `actions/checkout@${badRef}`),
          approvedActions,
        ),
      /must use exactly one full lowercase commit SHA/,
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

  process.stdout.write('Release infrastructure contract tests passed.\n')
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
