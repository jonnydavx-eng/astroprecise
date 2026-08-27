#!/usr/bin/env node
/**
 * Verify an AstroPrecise Cloudflare Pages release without mutating Cloudflare.
 *
 * The previous version of this tool proxied GitHub Pages DNS records and wrote
 * a Transform Rule. That route is retired. The protected workflow now uploads
 * the artifact directly to Cloudflare Pages and stamps the exact candidate in
 * dist/_headers. This tool performs only HTTPS GET verification of the root and
 * exact candidate header, the SHA-named release identity document, and the
 * service-worker version. Redirects fail closed so another origin cannot satisfy
 * release proof.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  CANDIDATE_HEADER,
  CANDIDATE_SHA_PATTERN,
  RELEASE_IDENTITY_SCHEMA,
  parseServiceWorkerVersion,
} from './verify-release-dispatch.mjs'
import { PREVIEW_BRANCH_PATTERN, PREVIEW_IDENTITY_SCHEMA } from './verify-preview-dispatch.mjs'

export const PUBLIC_BASE_URLS = Object.freeze([
  'https://astroprecise.app',
  'https://www.astroprecise.app',
])

const DEFAULT_PUBLIC_ATTEMPTS = 20
const DEFAULT_DEPLOYMENT_ATTEMPTS = 12
const DEFAULT_PUBLIC_DELAY_MS = 15_000
const DEFAULT_DEPLOYMENT_DELAY_MS = 5_000
const REQUEST_TIMEOUT_MS = 20_000

function fail(message) {
  throw new Error(`Cloudflare Pages release verification rejected: ${message}`)
}

export function usage() {
  return `AstroPrecise Cloudflare Pages release verifier

Usage:
  node tools/setup-cloudflare-release-edge.mjs --dry-run [--candidate <40hex>]
  node tools/setup-cloudflare-release-edge.mjs --verify-url <https://*.pages.dev> --candidate <40hex> [--deployment-kind release|preview] [--preview-branch preview-<12hex>] [--release-version ap-vNNN]
  node tools/setup-cloudflare-release-edge.mjs --verify-public --candidate <40hex>

Modes:
  --dry-run       Offline plan only. This is the default and performs no network access.
  --verify-url    Verify one immutable Cloudflare Pages deployment URL.
   --verify-public Verify direct, non-redirecting responses from astroprecise.app and www.astroprecise.app after domain cutover.

This tool never reads a Cloudflare token and has no mutation mode. Project creation,
custom-domain attachment, DNS changes, and deployment are separate owner-controlled
actions. The retired --apply/--verify edge-mutation route is intentionally rejected.`
}

export function parseArgs(argv) {
  let mode = 'dry-run'
  let candidate = null
  let baseUrl = null
  let deploymentKind = 'release'
  let previewBranch = null
  let releaseVersion = null
  let modeWasSelected = false
  let help = false

  function selectMode(nextMode) {
    if (modeWasSelected && mode !== nextMode) fail('select exactly one mode')
    mode = nextMode
    modeWasSelected = true
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help' || arg === '-h') {
      help = true
    } else if (arg === '--dry-run') {
      selectMode('dry-run')
    } else if (arg === '--verify-public') {
      selectMode('verify-public')
    } else if (arg === '--verify-url') {
      selectMode('verify-url')
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) fail('--verify-url requires an HTTPS URL')
      baseUrl = value
      index += 1
    } else if (arg === '--candidate') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) fail('--candidate requires a value')
      candidate = value
      index += 1
    } else if (arg === '--deployment-kind') {
      const value = argv[index + 1]
      if (value !== 'release' && value !== 'preview') {
        fail('--deployment-kind must be release or preview')
      }
      deploymentKind = value
      index += 1
    } else if (arg === '--preview-branch') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) fail('--preview-branch requires a value')
      previewBranch = value
      index += 1
    } else if (arg === '--release-version') {
      const value = argv[index + 1]
      if (!/^ap-v[0-9]{3,}$/.test(value ?? '')) {
        fail('--release-version must match ap-vNNN')
      }
      releaseVersion = value
      index += 1
    } else if (arg === '--apply' || arg === '--verify') {
      fail(
        `${arg} belonged to the retired GitHub Pages edge-mutation route; Cloudflare Pages setup is owner-controlled`,
      )
    } else {
      fail(`unknown argument ${arg}`)
    }
  }

  if (candidate !== null && !CANDIDATE_SHA_PATTERN.test(candidate)) {
    fail('candidate must be exactly 40 lowercase hexadecimal characters')
  }
  if ((mode === 'verify-public' || mode === 'verify-url') && candidate === null) {
    fail(`${mode} requires --candidate`)
  }
  if (mode === 'verify-url' && baseUrl === null) fail('--verify-url requires a URL')
  if (mode !== 'verify-url' && baseUrl !== null)
    fail('a deployment URL is valid only with --verify-url')
  if (deploymentKind === 'preview') {
    if (mode !== 'verify-url')
      fail('preview identity can be verified only at an immutable Pages URL')
    const branchMatch = PREVIEW_BRANCH_PATTERN.exec(previewBranch ?? '')
    if (!branchMatch || branchMatch[1] !== candidate?.slice(0, 12)) {
      fail('preview identity requires preview-branch matching the candidate SHA')
    }
    if (releaseVersion === null) {
      fail('preview identity requires the verifier-approved --release-version')
    }
  } else if (previewBranch !== null) {
    fail('--preview-branch is valid only for preview identity')
  }
  return Object.freeze({
    mode,
    candidate,
    baseUrl,
    deploymentKind,
    previewBranch,
    releaseVersion,
    help,
  })
}

export function normalizeDeploymentBaseUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    fail('deployment URL is not a valid absolute URL')
  }
  if (url.protocol !== 'https:') fail('deployment URL must use HTTPS')
  if (url.username || url.password) fail('deployment URL must not contain credentials')
  if (url.port && url.port !== '443') fail('deployment URL must not use a custom port')
  if (!url.hostname.endsWith('.pages.dev'))
    fail('deployment URL must be a Cloudflare pages.dev host')
  if (url.pathname !== '/' || url.search || url.hash) {
    fail('deployment URL must identify the host root without a path, query, or fragment')
  }
  return url.origin
}

export function parsePublicReleaseIdentity(text, candidate, expectedVersion) {
  let document
  try {
    document = JSON.parse(String(text))
  } catch (error) {
    fail(`release identity is not valid JSON (${error.message})`)
  }
  if (!document || Array.isArray(document) || typeof document !== 'object') {
    fail('release identity must be a JSON object')
  }
  const expectedKeys = ['candidateSha', 'releaseTag', 'releaseVersion', 'schema']
  const actualKeys = Object.keys(document).sort()
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail('release identity must contain only the four signed identity fields')
  }
  const expectedTag = `release/${expectedVersion}-${candidate.slice(0, 12)}`
  if (document.schema !== RELEASE_IDENTITY_SCHEMA) fail('release identity schema does not match')
  if (document.candidateSha !== candidate) fail('release identity candidate SHA does not match')
  if (document.releaseVersion !== expectedVersion) fail('release identity version does not match')
  if (document.releaseTag !== expectedTag) fail('release identity tag does not match')
  return Object.freeze({ ...document })
}

export function parsePublicPreviewIdentity(
  text,
  candidate,
  expectedVersion,
  expectedPreviewBranch,
) {
  let document
  try {
    document = JSON.parse(String(text))
  } catch (error) {
    fail(`preview identity is not valid JSON (${error.message})`)
  }
  if (!document || Array.isArray(document) || typeof document !== 'object') {
    fail('preview identity must be a JSON object')
  }
  const expectedKeys = ['candidateSha', 'previewBranch', 'releaseVersion', 'schema']
  const actualKeys = Object.keys(document).sort()
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    fail('preview identity must contain only the four signed identity fields')
  }
  if (document.schema !== PREVIEW_IDENTITY_SCHEMA) fail('preview identity schema does not match')
  if (document.candidateSha !== candidate) fail('preview identity candidate SHA does not match')
  if (document.releaseVersion !== expectedVersion) fail('preview identity version does not match')
  if (document.previewBranch !== expectedPreviewBranch)
    fail('preview identity branch does not match')
  return Object.freeze({ ...document })
}

export function publicSwVersion(source, label = 'public sw.js') {
  return parseServiceWorkerVersion(String(source), label)
}

function exactCandidateHeader(response, candidate, label) {
  const observed = response.headers?.get?.(CANDIDATE_HEADER)
  if (observed !== candidate) {
    fail(`${label} must return exactly one ${CANDIDATE_HEADER} value equal to ${candidate}`)
  }
}

async function fetchWithTimeout(url, fetchImpl) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      headers: {
        accept: 'application/json,text/javascript,text/plain;q=0.9,*/*;q=0.1',
        'cache-control': 'no-cache',
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function exactResponseUrl(response, requestedUrl, label) {
  if (!response.url) return
  let observed
  try {
    observed = new URL(response.url)
  } catch {
    fail(`${label} returned an invalid final response URL`)
  }
  if (observed.href !== requestedUrl.href) {
    fail(
      `${label} returned ${observed.href}; expected the exact requested URL ${requestedUrl.href}`,
    )
  }
}

async function fetchExactCandidateResource(url, fetchImpl, candidate, label) {
  const response = await fetchWithTimeout(url, fetchImpl)
  exactResponseUrl(response, url, label)
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    fail(`${label} redirected; release proof requires a direct candidate response`)
  }
  if (response.status !== 200) fail(`${label} returned HTTP ${response.status}`)
  exactCandidateHeader(response, candidate, label)
  return response
}

export async function verifyDeployedIdentity(
  baseUrl,
  candidate,
  expectedVersion,
  { fetchImpl = globalThis.fetch, deploymentKind = 'release', previewBranch = null } = {},
) {
  if (!CANDIDATE_SHA_PATTERN.test(candidate ?? '')) fail('verification candidate is invalid')
  if (!/^ap-v[0-9]{3,}$/.test(expectedVersion ?? '')) fail('expected release version is invalid')
  if (typeof fetchImpl !== 'function') fail('HTTPS fetch implementation is unavailable')
  if (deploymentKind !== 'release' && deploymentKind !== 'preview') {
    fail('deployment kind must be release or preview')
  }
  if (deploymentKind === 'preview') {
    const branchMatch = PREVIEW_BRANCH_PATTERN.exec(previewBranch ?? '')
    if (!branchMatch || branchMatch[1] !== candidate.slice(0, 12)) {
      fail('preview verification branch must match the candidate SHA')
    }
  } else if (previewBranch !== null) {
    fail('preview branch is valid only for preview verification')
  }

  const base = new URL(baseUrl)
  if (base.protocol !== 'https:') fail('verification base URL must use HTTPS')
  if (base.username || base.password) fail('verification base URL must not contain credentials')
  if (base.port && base.port !== '443') fail('verification base URL must not use a custom port')
  if (base.pathname !== '/' || base.search || base.hash) {
    fail('verification base URL must identify the host root without a path, query, or fragment')
  }
  if (
    !base.hostname.endsWith('.pages.dev') &&
    !PUBLIC_BASE_URLS.some((publicBase) => new URL(publicBase).hostname === base.hostname)
  ) {
    fail('verification base URL must be the Pages deployment or an AstroPrecise public domain')
  }
  const cacheBuster = candidate.slice(0, 12)
  const rootUrl = new URL(`/?verify=${cacheBuster}`, base)
  const identityUrl = new URL(
    `/.well-known/astroprecise-release/${candidate}.json?verify=${cacheBuster}`,
    base,
  )
  const swUrl = new URL(`/sw.js?verify=${cacheBuster}`, base)

  const rootResponse = await fetchExactCandidateResource(
    rootUrl,
    fetchImpl,
    candidate,
    `${rootUrl.origin} root`,
  )
  const identityResponse = await fetchExactCandidateResource(
    identityUrl,
    fetchImpl,
    candidate,
    `${identityUrl.origin} ${deploymentKind} identity`,
  )
  const identityText = await identityResponse.text()
  const identity =
    deploymentKind === 'preview'
      ? parsePublicPreviewIdentity(identityText, candidate, expectedVersion, previewBranch)
      : parsePublicReleaseIdentity(identityText, candidate, expectedVersion)

  const swResponse = await fetchExactCandidateResource(
    swUrl,
    fetchImpl,
    candidate,
    `${swUrl.origin} sw.js`,
  )
  const observedVersion = publicSwVersion(await swResponse.text(), `${swUrl.origin} sw.js`)
  if (observedVersion !== expectedVersion) {
    fail(`${swUrl.origin} sw.js is ${observedVersion}; expected ${expectedVersion}`)
  }

  return Object.freeze({
    requestedBaseUrl: base.origin,
    finalRootUrl: rootResponse.url || rootUrl.href,
    finalIdentityUrl: identityResponse.url || identityUrl.href,
    finalServiceWorkerUrl: swResponse.url || swUrl.href,
    candidate,
    deploymentKind,
    deploymentRef: identity.releaseTag ?? identity.previewBranch,
    releaseTag: identity.releaseTag,
    previewBranch: identity.previewBranch,
    releaseVersion: observedVersion,
  })
}

function readPositiveInteger(value, fallback, label) {
  if (value === undefined || value === '') return fallback
  if (!/^[1-9][0-9]*$/.test(value)) fail(`${label} must be a positive integer`)
  return Number(value)
}

async function retryVerification({ label, attempts, delayMs, verify, delay = setTimeout }) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await verify()
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      process.stderr.write(`${label} not converged (${attempt}/${attempts}): ${error.message}\n`)
      await new Promise((resolveDelay) => delay(resolveDelay, delayMs))
    }
  }
  throw lastError
}

function readReleaseVersion(cwd = process.cwd()) {
  const source = readFileSync(resolve(cwd, 'website', 'sw.js'), 'utf8')
  return parseServiceWorkerVersion(source, 'website/sw.js')
}

export async function verifyPublic(
  candidate,
  expectedVersion,
  {
    fetchImpl = globalThis.fetch,
    bases = PUBLIC_BASE_URLS,
    attempts = DEFAULT_PUBLIC_ATTEMPTS,
    delayMs = DEFAULT_PUBLIC_DELAY_MS,
    delay,
  } = {},
) {
  return retryVerification({
    label: 'Public custom domains',
    attempts,
    delayMs,
    delay,
    verify: async () => {
      const results = []
      for (const base of bases) {
        results.push(await verifyDeployedIdentity(base, candidate, expectedVersion, { fetchImpl }))
      }
      return Object.freeze(results)
    },
  })
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    process.stdout.write(`${usage()}\n`)
    return
  }
  const releaseVersion = options.releaseVersion ?? readReleaseVersion()
  if (options.mode === 'dry-run') {
    process.stdout.write(
      `OFFLINE PLAN: verify direct root responses, ${options.candidate ?? '<candidate-sha>'}, ${releaseVersion}, the SHA identity JSON, and exactly one ${CANDIDATE_HEADER} on the Pages deployment plus apex/www. No token or network was used.\n`,
    )
    return
  }

  if (options.mode === 'verify-url') {
    const base = normalizeDeploymentBaseUrl(options.baseUrl)
    const attempts = readPositiveInteger(
      process.env.AP_PAGES_VERIFY_ATTEMPTS,
      DEFAULT_DEPLOYMENT_ATTEMPTS,
      'AP_PAGES_VERIFY_ATTEMPTS',
    )
    const result = await retryVerification({
      label: 'Cloudflare Pages deployment',
      attempts,
      delayMs: DEFAULT_DEPLOYMENT_DELAY_MS,
      verify: () =>
        verifyDeployedIdentity(base, options.candidate, releaseVersion, {
          deploymentKind: options.deploymentKind,
          previewBranch: options.previewBranch,
        }),
    })
    process.stdout.write(
      `PAGES ${result.deploymentKind.toUpperCase()} DEPLOYMENT VERIFIED: ${result.candidate} (${result.releaseVersion}) at ${base}. No token was read and no mutation was performed.\n`,
    )
    return
  }

  const attempts = readPositiveInteger(
    process.env.AP_PUBLIC_VERIFY_ATTEMPTS,
    DEFAULT_PUBLIC_ATTEMPTS,
    'AP_PUBLIC_VERIFY_ATTEMPTS',
  )
  const results = await verifyPublic(options.candidate, releaseVersion, { attempts })
  for (const result of results) {
    process.stdout.write(
      `PUBLIC VERIFIED: ${result.requestedBaseUrl} serves ${result.candidate} (${result.releaseVersion}).\n`,
    )
  }
  process.stdout.write('PUBLIC VERIFY COMPLETE: no token was read and no mutation was performed.\n')
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`ERROR: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
