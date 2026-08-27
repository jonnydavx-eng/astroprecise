#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CANDIDATE_SHA_PATTERN,
  OFFICIAL_REPOSITORY,
  defaultGit,
  parseServiceWorkerVersion,
  stampCloudflarePagesArtifact,
} from './verify-release-dispatch.mjs'

export const PREVIEW_IDENTITY_SCHEMA = 'astroprecise-preview-identity/v1'
export const PREVIEW_BRANCH_PATTERN = /^preview-([0-9a-f]{12})$/
export const PREVIEW_PROJECT_NAME = 'astroprecise'

function fail(message) {
  throw new Error(`Preview identity rejected: ${message}`)
}

function splitLines(value) {
  return String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function verifyPreviewDispatch({
  env = process.env,
  cwd = process.cwd(),
  git = defaultGit,
} = {}) {
  const repository = env.GITHUB_REPOSITORY ?? ''
  const eventName = env.GITHUB_EVENT_NAME ?? ''
  const ref = env.GITHUB_REF ?? ''
  const refProtected = env.GITHUB_REF_PROTECTED ?? ''
  const candidateSha = env.CANDIDATE_SHA ?? ''
  const githubSha = env.GITHUB_SHA ?? ''
  const workflowSha = env.WORKFLOW_SHA ?? ''

  if (repository !== OFFICIAL_REPOSITORY) {
    fail(`GITHUB_REPOSITORY must be ${OFFICIAL_REPOSITORY}`)
  }
  if (eventName !== 'workflow_dispatch') {
    fail('GITHUB_EVENT_NAME must be workflow_dispatch')
  }
  if (ref !== 'refs/heads/main') {
    fail('the preview workflow must be dispatched from refs/heads/main')
  }
  if (refProtected !== 'true') {
    fail('the main workflow definition must be protected by a GitHub ruleset')
  }
  for (const [value, label] of [
    [candidateSha, 'candidate_sha'],
    [githubSha, 'GITHUB_SHA'],
    [workflowSha, 'WORKFLOW_SHA'],
  ]) {
    if (!CANDIDATE_SHA_PATTERN.test(value)) {
      fail(`${label} must be exactly 40 lowercase hexadecimal characters`)
    }
  }
  if (workflowSha !== githubSha) {
    fail('the workflow definition SHA does not match GITHUB_SHA')
  }

  let headSha
  let resolvedCandidate
  let mainSha
  let containingBranches
  let serviceWorkerSource
  try {
    headSha = git(['rev-parse', 'HEAD'], cwd)
    resolvedCandidate = git(['rev-parse', '--verify', `${candidateSha}^{commit}`], cwd)
    mainSha = git(['rev-parse', '--verify', 'refs/remotes/origin/main^{commit}'], cwd)
    containingBranches = splitLines(
      git(['branch', '--remotes', '--contains', candidateSha, '--format=%(refname:short)'], cwd),
    )
    serviceWorkerSource = git(['show', `${candidateSha}:website/sw.js`], cwd)
  } catch (error) {
    fail(`unable to resolve workflow, candidate and remote branch identity (${error.message})`)
  }

  if (headSha !== githubSha) {
    fail('checked-out workflow HEAD does not match GITHUB_SHA')
  }
  if (resolvedCandidate !== candidateSha) {
    fail('candidate_sha does not resolve to that exact commit')
  }
  if (mainSha === candidateSha || containingBranches.includes('origin/main')) {
    fail('candidate_sha is already contained by main and is not a preview candidate')
  }
  const candidateBranches = containingBranches.filter(
    (branch) => branch.startsWith('origin/') && branch !== 'origin/HEAD',
  )
  if (candidateBranches.length === 0) {
    fail('candidate_sha must be reachable from a fetched branch in the official repository')
  }

  const releaseVersion = parseServiceWorkerVersion(
    serviceWorkerSource,
    `${candidateSha}:website/sw.js`,
  )
  const previewBranch = `preview-${candidateSha.slice(0, 12)}`
  return Object.freeze({ candidateSha, previewBranch, releaseVersion })
}

export function writePreviewGitHubOutputs(result, outputPath) {
  if (!outputPath) return
  appendFileSync(
    outputPath,
    `candidate_sha=${result.candidateSha}\n` +
      `preview_branch=${result.previewBranch}\n` +
      `release_version=${result.releaseVersion}\n`,
    'utf8',
  )
}

export function previewIdentityDocument({ candidateSha, previewBranch, releaseVersion }) {
  if (!CANDIDATE_SHA_PATTERN.test(candidateSha ?? '')) {
    fail('artifact candidate SHA must be exactly 40 lowercase hexadecimal characters')
  }
  const branchMatch = PREVIEW_BRANCH_PATTERN.exec(previewBranch ?? '')
  if (!branchMatch) {
    fail('artifact branch must match preview-<12 lowercase hex>')
  }
  if (branchMatch[1] !== candidateSha.slice(0, 12)) {
    fail('artifact preview branch SHA suffix does not match candidate SHA')
  }
  if (!/^ap-v[0-9]{3,}$/.test(releaseVersion ?? '')) {
    fail('artifact release version must match ap-vNNN')
  }
  return Object.freeze({
    schema: PREVIEW_IDENTITY_SCHEMA,
    candidateSha,
    previewBranch,
    releaseVersion,
  })
}

export function verifyPreviewArtifactBuild({
  env = process.env,
  cwd = process.cwd(),
  git = defaultGit,
  readFile = readFileSync,
} = {}) {
  const document = previewIdentityDocument({
    candidateSha: env.CANDIDATE_SHA ?? '',
    previewBranch: env.PREVIEW_BRANCH ?? '',
    releaseVersion: env.RELEASE_VERSION ?? '',
  })

  let headSha
  let sourceVersion
  let builtVersion
  try {
    headSha = git(['rev-parse', 'HEAD'], cwd)
    sourceVersion = parseServiceWorkerVersion(
      readFile(resolve(cwd, 'website', 'sw.js'), 'utf8'),
      'website/sw.js',
    )
    builtVersion = parseServiceWorkerVersion(
      readFile(resolve(cwd, 'dist', 'sw.js'), 'utf8'),
      'dist/sw.js',
    )
  } catch (error) {
    fail(`unable to verify preview artifact build (${error.message})`)
  }
  if (headSha !== document.candidateSha) {
    fail('artifact-build HEAD does not match candidate SHA')
  }
  if (sourceVersion !== document.releaseVersion || builtVersion !== document.releaseVersion) {
    fail('preview artifact release version does not match website/sw.js and dist/sw.js')
  }
  return document
}

function normalizePagesOutputUrl(value, label) {
  let url
  try {
    url = new URL(value)
  } catch {
    fail(`${label} is not a valid absolute URL`)
  }
  if (url.protocol !== 'https:') fail(`${label} must use HTTPS`)
  if (url.username || url.password || (url.port && url.port !== '443')) {
    fail(`${label} must not contain credentials or a custom port`)
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    fail(`${label} must identify a host root without a path, query or fragment`)
  }
  return url
}

export function verifyPreviewDeploymentOutputs({
  deploymentUrl,
  aliasUrl,
  deploymentId,
  previewBranch,
  projectName = PREVIEW_PROJECT_NAME,
} = {}) {
  if (!PREVIEW_BRANCH_PATTERN.test(previewBranch ?? '')) {
    fail('preview deployment branch is invalid')
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(projectName ?? '')) {
    fail('Pages project name is invalid')
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      deploymentId ?? '',
    )
  ) {
    fail('Pages deployment ID must be a lowercase UUID')
  }

  const deployment = normalizePagesOutputUrl(deploymentUrl, 'deployment URL')
  const alias = normalizePagesOutputUrl(aliasUrl, 'deployment alias URL')
  const expectedSuffix = `.${projectName}.pages.dev`
  const expectedAliasHost = `${previewBranch}${expectedSuffix}`
  if (alias.hostname !== expectedAliasHost) {
    fail(`deployment alias URL must be exactly https://${expectedAliasHost}`)
  }
  if (!deployment.hostname.endsWith(expectedSuffix)) {
    fail(`deployment URL must belong to ${projectName}.pages.dev`)
  }
  const uniqueLabel = deployment.hostname.slice(0, -expectedSuffix.length)
  if (!/^[a-z0-9]{6,64}$/.test(uniqueLabel)) {
    fail('deployment URL must use Cloudflare Pages unique hash hostname form')
  }
  if (
    deployment.origin === alias.origin ||
    uniqueLabel === previewBranch ||
    uniqueLabel === 'main'
  ) {
    fail('deployment URL must be immutable and distinct from the mutable branch alias')
  }
  return Object.freeze({
    deploymentUrl: deployment.origin,
    aliasUrl: alias.origin,
    deploymentId,
    previewBranch,
  })
}

export function runCli({
  env = process.env,
  cwd = process.cwd(),
  argv = process.argv.slice(2),
} = {}) {
  if (argv.length === 0) {
    const result = verifyPreviewDispatch({ env, cwd })
    writePreviewGitHubOutputs(result, env.GITHUB_OUTPUT)
    process.stdout.write(
      `Verified preview candidate ${result.candidateSha} as ${result.previewBranch} (${result.releaseVersion})\n`,
    )
    return result
  }
  if (argv.length === 2 && argv[0] === '--stamp-cloudflare-pages') {
    const document = verifyPreviewArtifactBuild({ env, cwd })
    const stamped = stampCloudflarePagesArtifact({
      document,
      distDirectory: resolve(cwd, argv[1]),
    })
    process.stdout.write(
      `Stamped ${document.previewBranch} for ${document.candidateSha} into ${stamped.identityPath} and ${stamped.headersPath}\n`,
    )
    return document
  }
  if (argv.length === 1 && argv[0] === '--verify-deployment-outputs') {
    const result = verifyPreviewDeploymentOutputs({
      deploymentUrl: env.DEPLOYMENT_URL,
      aliasUrl: env.DEPLOYMENT_ALIAS_URL,
      deploymentId: env.DEPLOYMENT_ID,
      previewBranch: env.PREVIEW_BRANCH,
      projectName: env.PAGES_PROJECT_NAME || PREVIEW_PROJECT_NAME,
    })
    process.stdout.write(
      `Verified immutable Pages deployment ${result.deploymentId} at ${result.deploymentUrl}; branch alias ${result.aliasUrl} was not accepted as proof.\n`,
    )
    return result
  }
  fail(
    'usage: verify-preview-dispatch.mjs [--stamp-cloudflare-pages <dist-directory> | --verify-deployment-outputs]',
  )
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false

if (isDirectExecution) {
  try {
    runCli()
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
