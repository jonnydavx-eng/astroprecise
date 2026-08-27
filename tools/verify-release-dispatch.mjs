#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const OFFICIAL_REPOSITORY = 'jonnydavx-eng/astroprecise'
export const OFFICIAL_RELEASE_WORKFLOW_REF = `${OFFICIAL_REPOSITORY}/.github/workflows/deploy-pages.yml@refs/heads/main`
export const PRODUCTION_RELEASE_VERSION = 'ap-v902'
export const RELEASE_TAG_PATTERN = /^release\/(ap-v[0-9]{3,})-([0-9a-f]{12})$/
export const CANDIDATE_SHA_PATTERN = /^[0-9a-f]{40}$/
export const RELEASE_IDENTITY_SCHEMA = 'astroprecise-release-identity/v1'
export const CANDIDATE_HEADER = 'X-Coherence-Candidate-Tip'
export const CANDIDATE_HEADER_PLACEHOLDER = '__ASTROPRECISE_CANDIDATE_SHA__'

function fail(message) {
  throw new Error(`Release identity rejected: ${message}`)
}

function skipLeadingJavaScriptTrivia(source) {
  let cursor = source.charCodeAt(0) === 0xfeff ? 1 : 0
  while (cursor < source.length) {
    const whitespace = /^[\t\n\v\f\r ]+/.exec(source.slice(cursor))
    if (whitespace) {
      cursor += whitespace[0].length
      continue
    }
    if (source.startsWith('//', cursor)) {
      const newline = source.indexOf('\n', cursor + 2)
      cursor = newline === -1 ? source.length : newline + 1
      continue
    }
    if (source.startsWith('/*', cursor)) {
      const end = source.indexOf('*/', cursor + 2)
      if (end === -1) fail('website/sw.js begins with an unterminated block comment')
      cursor = end + 2
      continue
    }
    break
  }
  return cursor
}

function maskJavaScriptCommentsAndStrings(source) {
  const output = source.split('')
  let state = 'code'
  let quote = ''
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    const current = source[cursor]
    const next = source[cursor + 1] ?? ''
    if (state === 'code') {
      if (current === '/' && next === '/') {
        output[cursor] = output[cursor + 1] = ' '
        cursor += 1
        state = 'line-comment'
      } else if (current === '/' && next === '*') {
        output[cursor] = output[cursor + 1] = ' '
        cursor += 1
        state = 'block-comment'
      } else if (current === "'" || current === '"' || current === '`') {
        output[cursor] = ' '
        quote = current
        state = 'string'
      }
    } else if (state === 'line-comment') {
      if (current === '\n' || current === '\r') {
        state = 'code'
      } else {
        output[cursor] = ' '
      }
    } else if (state === 'block-comment') {
      output[cursor] = ' '
      if (current === '*' && next === '/') {
        output[cursor + 1] = ' '
        cursor += 1
        state = 'code'
      }
    } else {
      output[cursor] = ' '
      if (current === '\\') {
        if (cursor + 1 < source.length) output[cursor + 1] = ' '
        cursor += 1
      } else if (current === quote) {
        state = 'code'
      }
    }
  }
  return output.join('')
}

export function parseServiceWorkerVersion(source, label = 'service worker') {
  const normalizedSource = String(source)
  const cursor = skipLeadingJavaScriptTrivia(normalizedSource)
  const firstStatement = normalizedSource.slice(cursor)
  const match = /^const[\t ]+V[\t ]*=[\t ]*(['"])(ap-v[0-9]{3,})\1[\t ]*[,;]/.exec(firstStatement)
  if (!match) {
    fail(
      `${label} first executable top-level statement must begin with const V = "ap-vNNN" as its first declarator`,
    )
  }
  const declarations = maskJavaScriptCommentsAndStrings(normalizedSource).match(
    /(?:\b(?:const|let|var)[\t\n\v\f\r ]+|,)[\t\n\v\f\r ]*V\b[\t\n\v\f\r ]*(?==)/g,
  )
  if ((declarations ?? []).length !== 1) {
    fail(`${label} must contain exactly one executable V declaration`)
  }
  return match[2]
}

export function defaultGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

export function verifyReleaseDispatch({
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
  const workflowRef = env.WORKFLOW_REF ?? ''
  const workflowSha = env.WORKFLOW_SHA ?? ''

  if (repository !== OFFICIAL_REPOSITORY) {
    fail(`GITHUB_REPOSITORY must be ${OFFICIAL_REPOSITORY}`)
  }
  if (eventName !== 'workflow_dispatch') {
    fail('GITHUB_EVENT_NAME must be workflow_dispatch')
  }
  if (ref !== 'refs/heads/main') {
    fail('GITHUB_REF must be refs/heads/main so the protected workflow is authoritative')
  }
  if (refProtected !== 'true') {
    fail('the main branch selected for release dispatch must be protected')
  }
  if (!CANDIDATE_SHA_PATTERN.test(candidateSha)) {
    fail('candidate_sha must be exactly 40 lowercase hexadecimal characters')
  }
  if (!CANDIDATE_SHA_PATTERN.test(githubSha)) {
    fail('GITHUB_SHA must be exactly 40 lowercase hexadecimal characters')
  }
  if (workflowRef !== OFFICIAL_RELEASE_WORKFLOW_REF) {
    fail(`WORKFLOW_REF must be ${OFFICIAL_RELEASE_WORKFLOW_REF}`)
  }
  if (!CANDIDATE_SHA_PATTERN.test(workflowSha)) {
    fail('WORKFLOW_SHA must be exactly 40 lowercase hexadecimal characters')
  }

  const releaseTag = env.RELEASE_TAG ?? ''
  const tagMatch = RELEASE_TAG_PATTERN.exec(releaseTag)
  if (!tagMatch) {
    fail('tag must match release/ap-vNNN-<12 lowercase hex>')
  }

  const [, releaseVersion, tagSuffix] = tagMatch
  if (releaseVersion !== PRODUCTION_RELEASE_VERSION) {
    fail(`release tag must name ${PRODUCTION_RELEASE_VERSION}`)
  }
  if (tagSuffix !== candidateSha.slice(0, 12)) {
    fail('release tag SHA suffix does not match candidate_sha')
  }
  if (workflowSha !== githubSha) {
    fail('the workflow definition SHA does not match protected-main GITHUB_SHA')
  }

  let headSha
  let tagCommitSha
  let versionTags
  try {
    headSha = git(['rev-parse', 'HEAD'], cwd)
    tagCommitSha = git(['rev-list', '-n', '1', `refs/tags/${releaseTag}`], cwd)
    versionTags = git(['tag', '--list', `release/${releaseVersion}-*`], cwd)
      .split(/\r?\n/)
      .filter(Boolean)
  } catch (error) {
    fail(`unable to resolve checked-out commit and release tag (${error.message})`)
  }
  if (headSha !== githubSha) {
    fail('checked-out HEAD does not match protected-main GITHUB_SHA')
  }
  if (tagCommitSha !== candidateSha) {
    fail('release tag commit does not match candidate_sha')
  }
  if (versionTags.length !== 1 || versionTags[0] !== releaseTag) {
    fail(`release version ${releaseVersion} must identify exactly one release tag`)
  }

  let serviceWorkerSource
  try {
    serviceWorkerSource = git(['show', `${candidateSha}:website/sw.js`], cwd)
  } catch (error) {
    fail(`unable to read website/sw.js from the tagged candidate (${error.message})`)
  }
  const serviceWorkerVersion = parseServiceWorkerVersion(
    serviceWorkerSource,
    'tagged candidate website/sw.js',
  )
  if (serviceWorkerVersion !== releaseVersion) {
    fail(`tag version ${releaseVersion} does not match website/sw.js ${serviceWorkerVersion}`)
  }

  return Object.freeze({
    candidateSha,
    releaseTag,
    releaseVersion,
  })
}

export function writeGitHubOutputs(result, outputPath) {
  if (!outputPath) return
  appendFileSync(
    outputPath,
    `candidate_sha=${result.candidateSha}\n` +
      `release_tag=${result.releaseTag}\n` +
      `release_version=${result.releaseVersion}\n`,
    'utf8',
  )
}

export function releaseIdentityDocument({ candidateSha, releaseTag, releaseVersion }) {
  if (!CANDIDATE_SHA_PATTERN.test(candidateSha ?? '')) {
    fail('artifact candidate SHA must be exactly 40 lowercase hexadecimal characters')
  }
  const tagMatch = RELEASE_TAG_PATTERN.exec(releaseTag ?? '')
  if (!tagMatch) {
    fail('artifact tag must match release/ap-vNNN-<12 lowercase hex>')
  }
  if (tagMatch[1] !== releaseVersion) {
    fail('artifact tag version does not match release version')
  }
  if (tagMatch[2] !== candidateSha.slice(0, 12)) {
    fail('artifact tag SHA suffix does not match candidate SHA')
  }
  return Object.freeze({
    schema: RELEASE_IDENTITY_SCHEMA,
    candidateSha,
    releaseTag,
    releaseVersion,
  })
}

export function verifyReleaseArtifactBuild({
  env = process.env,
  cwd = process.cwd(),
  git = defaultGit,
  readFile = readFileSync,
} = {}) {
  const document = releaseIdentityDocument({
    candidateSha: env.CANDIDATE_SHA ?? '',
    releaseTag: env.RELEASE_TAG ?? '',
    releaseVersion: env.RELEASE_VERSION ?? '',
  })

  let headSha
  try {
    headSha = git(['rev-parse', 'HEAD'], cwd)
  } catch (error) {
    fail(`unable to resolve artifact-build HEAD (${error.message})`)
  }
  if (headSha !== document.candidateSha) {
    fail('artifact-build HEAD does not match candidate SHA')
  }

  let serviceWorkerSource
  try {
    serviceWorkerSource = readFile(resolve(cwd, 'website', 'sw.js'), 'utf8')
  } catch (error) {
    fail(`unable to read website/sw.js for artifact build (${error.message})`)
  }
  const serviceWorkerVersion = parseServiceWorkerVersion(serviceWorkerSource, 'website/sw.js')
  if (serviceWorkerVersion !== document.releaseVersion) {
    fail(
      `artifact release version ${document.releaseVersion} does not match website/sw.js ${serviceWorkerVersion}`,
    )
  }

  let builtServiceWorkerSource
  try {
    builtServiceWorkerSource = readFile(resolve(cwd, 'dist', 'sw.js'), 'utf8')
  } catch (error) {
    fail(`unable to read dist/sw.js for artifact build (${error.message})`)
  }
  const builtServiceWorkerVersion = parseServiceWorkerVersion(
    builtServiceWorkerSource,
    'dist/sw.js',
  )
  if (builtServiceWorkerVersion !== document.releaseVersion) {
    fail(
      `artifact release version ${document.releaseVersion} does not match dist/sw.js ${builtServiceWorkerVersion}`,
    )
  }
  return document
}

export function writeReleaseIdentityArtifact(document, outputPath) {
  if (!outputPath) fail('release identity artifact output path is required')
  const absolutePath = resolve(outputPath)
  mkdirSync(dirname(absolutePath), { recursive: true })
  writeFileSync(absolutePath, `${JSON.stringify(document)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  return absolutePath
}

export function stampCandidateHeaderTemplate(source, candidateSha) {
  if (!CANDIDATE_SHA_PATTERN.test(candidateSha ?? '')) {
    fail('candidate header SHA must be exactly 40 lowercase hexadecimal characters')
  }
  const normalizedSource = String(source)
  const headerLines = normalizedSource.match(
    new RegExp(`^[\\t ]*${CANDIDATE_HEADER}:[\\t ]*[^\\r\\n]+$`, 'gim'),
  )
  if ((headerLines ?? []).length !== 1) {
    fail(`Cloudflare Pages _headers must contain exactly one ${CANDIDATE_HEADER} line`)
  }
  const expectedTemplate = new RegExp(
    `^[\\t ]*${CANDIDATE_HEADER}:[\\t ]*${CANDIDATE_HEADER_PLACEHOLDER}[\\t ]*$`,
    'im',
  )
  if (!expectedTemplate.test(normalizedSource)) {
    fail(`Cloudflare Pages ${CANDIDATE_HEADER} must use the exact build-time placeholder`)
  }
  const placeholderCount = normalizedSource.split(CANDIDATE_HEADER_PLACEHOLDER).length - 1
  if (placeholderCount !== 1) {
    fail('Cloudflare Pages candidate placeholder must occur exactly once')
  }
  const stamped = normalizedSource.replace(CANDIDATE_HEADER_PLACEHOLDER, candidateSha)
  if (
    !new RegExp(`^[\\t ]*${CANDIDATE_HEADER}:[\\t ]*${candidateSha}[\\t ]*$`, 'im').test(stamped)
  ) {
    fail('Cloudflare Pages candidate header stamping did not produce the exact SHA')
  }
  return stamped
}

export function stampCloudflarePagesArtifact({
  document,
  distDirectory,
  readFile = readFileSync,
  writeFile = writeFileSync,
} = {}) {
  if (!document) fail('deployment identity document is required for Pages stamping')
  const absoluteDist = resolve(distDirectory ?? '')
  const headersPath = resolve(absoluteDist, '_headers')
  let template
  try {
    template = readFile(headersPath, 'utf8')
  } catch (error) {
    fail(`unable to read Cloudflare Pages _headers (${error.message})`)
  }
  const stampedHeaders = stampCandidateHeaderTemplate(template, document.candidateSha)
  const identityPath = resolve(
    absoluteDist,
    '.well-known',
    'astroprecise-release',
    `${document.candidateSha}.json`,
  )
  writeReleaseIdentityArtifact(document, identityPath)
  writeFile(headersPath, stampedHeaders, { encoding: 'utf8', flag: 'w' })
  return Object.freeze({ identityPath, headersPath })
}

export function runCli({
  env = process.env,
  cwd = process.cwd(),
  argv = process.argv.slice(2),
} = {}) {
  if (argv.length > 0) {
    const document = verifyReleaseArtifactBuild({ env, cwd })
    if (argv.length === 2 && argv[0] === '--write-artifact') {
      const outputPath = writeReleaseIdentityArtifact(document, resolve(cwd, argv[1]))
      process.stdout.write(
        `Wrote ${document.releaseTag} identity for ${document.candidateSha} to ${outputPath}\n`,
      )
      return document
    }
    if (argv.length === 2 && argv[0] === '--stamp-cloudflare-pages') {
      const stamped = stampCloudflarePagesArtifact({
        document,
        distDirectory: resolve(cwd, argv[1]),
      })
      process.stdout.write(
        `Stamped ${document.releaseTag} for ${document.candidateSha} into ${stamped.identityPath} and ${stamped.headersPath}\n`,
      )
      return document
    }
    fail(
      'usage: verify-release-dispatch.mjs [--write-artifact <output-path> | --stamp-cloudflare-pages <dist-directory>]',
    )
  }

  const result = verifyReleaseDispatch({ env, cwd })
  writeGitHubOutputs(result, env.GITHUB_OUTPUT)
  process.stdout.write(
    `Verified ${result.releaseTag} at ${result.candidateSha} (${result.releaseVersion})\n`,
  )
  return result
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
