#!/usr/bin/env node
/**
 * Prepare, apply, or verify the narrowly-scoped AstroPrecise release edge.
 *
 * Safety properties:
 *   - no flag (and --dry-run) is offline and non-mutating;
 *   - --verify reads Cloudflare and the public site but never mutates;
 *   - --verify-public reads only the public apex/www responses;
 *   - mutation requires --apply AND an exact lowercase 40-hex candidate SHA;
 *   - only the expected apex A records, www CNAME, and one managed response
 *     header Transform Rule are eligible for mutation;
 *   - unrelated DNS records, rules, cache configuration, and products are
 *     never changed.
 *
 * Required for --verify / --apply:
 *   CLOUDFLARE_API_TOKEN in the process environment or secrets/.env.local.
 *
 * Examples:
 *   node tools/setup-cloudflare-release-edge.mjs
 *   node tools/setup-cloudflare-release-edge.mjs --dry-run --candidate <sha>
 *   node tools/setup-cloudflare-release-edge.mjs --verify-public --candidate <sha>
 *   node tools/setup-cloudflare-release-edge.mjs --verify --candidate <sha>
 *   node tools/setup-cloudflare-release-edge.mjs --apply --candidate <sha>
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import https from 'node:https'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib'
import { loadSecrets } from './load-secrets.mjs'
import {
  CANDIDATE_SHA_PATTERN,
  RELEASE_IDENTITY_SCHEMA,
  parseServiceWorkerVersion,
  releaseIdentityDocument,
} from './verify-release-dispatch.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API_ROOT = 'https://api.cloudflare.com/client/v4'
const ZONE_NAME = 'astroprecise.app'
const WWW_NAME = `www.${ZONE_NAME}`
const GITHUB_PAGES_HOST = 'jonnydavx-eng.github.io'
const GITHUB_PAGES_APEX_IPS = Object.freeze([
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
])
const PHASE = 'http_response_headers_transform'
const CANDIDATE_HEADER = 'X-Coherence-Candidate-Tip'
const MANAGED_RULE_REF = 'astroprecise_release_identity_v1'
const MANAGED_RULE_DESCRIPTION =
  '[managed:astroprecise-release-identity:v1] Set exact release candidate identity'
const MANAGED_EXPRESSION = 'http.host in {"astroprecise.app" "www.astroprecise.app"}'
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024
const ALLOWED_PUBLIC_HOSTS = new Set([ZONE_NAME, WWW_NAME])
const PUBLIC_VERIFY_ATTEMPTS = 30
const PUBLIC_VERIFY_DELAY_MS = 10_000

function usage() {
  return `AstroPrecise Cloudflare release edge

Usage:
  node tools/setup-cloudflare-release-edge.mjs [--dry-run] [--candidate <40hex>]
  node tools/setup-cloudflare-release-edge.mjs --verify-public --candidate <40hex>
  node tools/setup-cloudflare-release-edge.mjs --verify --candidate <40hex>
  node tools/setup-cloudflare-release-edge.mjs --apply --candidate <40hex>

Modes:
  default / --dry-run  Offline plan only. Never reads Cloudflare or the public site.
  --verify-public      Read only apex/www public responses. No token and no changes.
  --verify             Read Cloudflare and public state. Never changes anything.
  --apply              Apply the exact, narrow plan and then verify it.

Safety:
  Every online mode requires an exact lowercase 40-character commit SHA.
  --apply touches only the expected apex/www proxy flags and one stable
  response-header Transform Rule. It does not alter cache rules or products.`
}

function parseArgs(argv) {
  let requestedMode = null
  let candidate = null
  let help = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      help = true
      continue
    }
    if (
      arg === '--dry-run' ||
      arg === '--verify-public' ||
      arg === '--verify' ||
      arg === '--apply'
    ) {
      const nextMode = arg.slice(2)
      if (requestedMode && requestedMode !== nextMode) {
        throw new Error(`Choose exactly one mode; received --${requestedMode} and ${arg}.`)
      }
      requestedMode = nextMode
      continue
    }
    if (arg === '--candidate') {
      if (candidate !== null) throw new Error('--candidate may be supplied only once.')
      candidate = argv[i + 1] ?? null
      if (!candidate || candidate.startsWith('--')) {
        throw new Error('--candidate requires a lowercase 40-character commit SHA.')
      }
      i += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  const mode = requestedMode || 'dry-run'
  if (candidate !== null && !CANDIDATE_SHA_PATTERN.test(candidate)) {
    throw new Error('Candidate must be an exact lowercase 40-character hexadecimal commit SHA.')
  }
  if ((mode === 'verify-public' || mode === 'verify' || mode === 'apply') && candidate === null) {
    throw new Error(`--${mode} requires --candidate <exact-lowercase-40hex>.`)
  }

  return { mode, candidate, help }
}

function readReleaseIntent() {
  const swPath = join(ROOT, 'website', 'sw.js')
  const source = readFileSync(swPath, 'utf8')
  return { serviceWorkerVersion: parseServiceWorkerVersion(source), sourcePath: swPath }
}

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function assertApplyCandidate(candidate, releaseIntent) {
  let head
  let status
  try {
    head = git(['rev-parse', '--verify', 'HEAD'])
    status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  } catch (error) {
    throw new Error(`Unable to verify the local release checkout (${error.message}).`)
  }
  if (head !== candidate) {
    throw new Error(`Apply candidate ${candidate} does not match local HEAD ${head}.`)
  }
  if (status !== '') {
    throw new Error('Apply requires a completely clean candidate worktree.')
  }

  const expectedTag = `release/${releaseIntent.serviceWorkerVersion}-${candidate.slice(0, 12)}`
  let tagCommit
  let versionTags
  try {
    tagCommit = git(['rev-list', '-n', '1', `refs/tags/${expectedTag}`])
    versionTags = git(['tag', '--list', `release/${releaseIntent.serviceWorkerVersion}-*`])
      .split(/\r?\n/)
      .filter(Boolean)
  } catch (error) {
    throw new Error(`Unable to resolve the protected release tag (${error.message}).`)
  }
  if (tagCommit !== candidate) {
    throw new Error(`Expected local tag ${expectedTag} to resolve to candidate ${candidate}.`)
  }
  if (versionTags.length !== 1 || versionTags[0] !== expectedTag) {
    throw new Error(
      `Release version ${releaseIntent.serviceWorkerVersion} must have exactly one local release tag (${expectedTag}).`,
    )
  }
  return releaseIdentityDocument({
    candidateSha: candidate,
    releaseTag: expectedTag,
    releaseVersion: releaseIntent.serviceWorkerVersion,
  })
}

function desiredDnsRecords() {
  return [
    ...GITHUB_PAGES_APEX_IPS.map((content) => ({
      type: 'A',
      name: ZONE_NAME,
      content,
      proxied: true,
    })),
    {
      type: 'CNAME',
      name: WWW_NAME,
      content: GITHUB_PAGES_HOST,
      proxied: true,
    },
  ]
}

function desiredRule(candidate) {
  return {
    ref: MANAGED_RULE_REF,
    description: MANAGED_RULE_DESCRIPTION,
    expression: MANAGED_EXPRESSION,
    action: 'rewrite',
    action_parameters: {
      headers: {
        [CANDIDATE_HEADER]: {
          operation: 'set',
          value: candidate,
        },
      },
    },
    enabled: true,
  }
}

function printPlan({ candidate, serviceWorkerVersion }) {
  const candidateText = candidate || '<exact-lowercase-40hex-required-for-verify-or-apply>'
  console.log('OFFLINE DRY RUN — no network requests and no mutations')
  console.log(`Zone (fixed): ${ZONE_NAME}`)
  console.log(`Candidate: ${candidateText}`)
  console.log(`Local release intent: ${serviceWorkerVersion}`)
  console.log('Eligible DNS changes (proxy flag only; content must already match):')
  for (const record of desiredDnsRecords()) {
    console.log(`  ${record.type.padEnd(5)} ${record.name} -> ${record.content}  proxied=true`)
  }
  console.log('Eligible Transform Rule:')
  console.log(`  phase: ${PHASE}`)
  console.log(`  ref: ${MANAGED_RULE_REF}`)
  console.log(`  expression: ${MANAGED_EXPRESSION}`)
  console.log(`  operation: set ${CANDIDATE_HEADER} = ${candidateText}`)
  console.log('Not in scope: DNS content, other records/rules, cache settings, Pages, or products.')
}

function tokenOrThrow() {
  loadSecrets()
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) {
    throw new Error(
      'CLOUDFLARE_API_TOKEN is missing. Supply it through the existing environment or secrets/.env.local.',
    )
  }
  return token
}

function cloudflareError(method, path, status, data) {
  const details = Array.isArray(data?.errors)
    ? data.errors
        .map((error) => `${error.code ?? 'unknown'}: ${error.message ?? 'Cloudflare error'}`)
        .join('; ')
    : 'Cloudflare returned an unsuccessful response'
  return new Error(`Cloudflare ${method} ${path} failed (${status}): ${details}`)
}

async function cloudflare(token, path, { method = 'GET', body, allowNotFound = false } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error',
  })

  let data
  let responseText
  try {
    responseText = await response.text()
    data = responseText === '' ? null : JSON.parse(responseText)
  } catch {
    throw new Error(`Cloudflare ${method} ${path} returned non-JSON status ${response.status}.`)
  }

  if (allowNotFound && response.status === 404) return null
  if (!response.ok || (data !== null && data?.success !== true)) {
    throw cloudflareError(method, path, response.status, data)
  }
  return data?.result ?? null
}

async function findExactZone(token) {
  const query = new URLSearchParams({ name: ZONE_NAME, per_page: '50' })
  const zones = await cloudflare(token, `/zones?${query}`)
  const exact = zones.filter((zone) => zone.name === ZONE_NAME)
  if (exact.length !== 1) {
    throw new Error(
      `Expected exactly one Cloudflare zone named ${ZONE_NAME}; found ${exact.length}.`,
    )
  }
  if (exact[0].status !== 'active') {
    throw new Error(`Cloudflare zone ${ZONE_NAME} is not active (status=${exact[0].status}).`)
  }
  return exact[0]
}

export async function listDnsRecords(token, zoneId, name, api = cloudflare) {
  const records = []
  for (let page = 1; page <= 100; page += 1) {
    const query = new URLSearchParams({ name, page: String(page), per_page: '100' })
    const batch = await api(token, `/zones/${zoneId}/dns_records?${query}`)
    if (!Array.isArray(batch)) {
      throw new Error('Cloudflare DNS response was not an array.')
    }
    records.push(...batch)
    if (batch.length < 100) return records
  }
  throw new Error(`DNS pagination exceeded 100 pages for exact name ${name}; refusing ambiguity.`)
}

function normalizedDnsContent(type, content) {
  const normalized = String(content).trim().toLowerCase()
  return type === 'CNAME' ? normalized.replace(/\.$/, '') : normalized
}

export async function inspectDns(token, zoneId, api = cloudflare) {
  const [apexRecords, wwwRecords] = await Promise.all([
    listDnsRecords(token, zoneId, ZONE_NAME, api),
    listDnsRecords(token, zoneId, WWW_NAME, api),
  ])

  if (
    apexRecords.some((record) => record.name !== ZONE_NAME) ||
    wwwRecords.some((record) => record.name !== WWW_NAME)
  ) {
    throw new Error(
      'Cloudflare returned a non-exact DNS name for an exact-name query; refusing to continue.',
    )
  }

  const routingTypes = new Set(['A', 'AAAA', 'CNAME', 'HTTPS', 'SVCB'])
  const apexRouting = apexRecords.filter((record) => routingTypes.has(record.type))
  const wwwRouting = wwwRecords.filter((record) => routingTypes.has(record.type))
  const apexA = apexRouting.filter((record) => record.type === 'A')
  const unexpectedApex = apexRouting.filter((record) => record.type !== 'A')
  const wwwCname = wwwRouting.filter((record) => record.type === 'CNAME')
  const unexpectedWww = wwwRouting.filter((record) => record.type !== 'CNAME')

  if (unexpectedApex.length > 0 || unexpectedWww.length > 0) {
    const unexpected = [...unexpectedApex, ...unexpectedWww]
      .map((record) => `${record.type} ${record.name} -> ${record.content}`)
      .join(', ')
    throw new Error(
      `Unexpected apex/www A, AAAA, CNAME, HTTPS, or SVCB routing record(s): ${unexpected}. Refusing a possible proxy bypass.`,
    )
  }

  const expectedA = new Set(GITHUB_PAGES_APEX_IPS)
  if (apexA.length !== expectedA.size) {
    throw new Error(
      `Expected exactly ${expectedA.size} apex A records; found ${apexA.length}. Refusing an ambiguous DNS change.`,
    )
  }
  const actualA = new Set(apexA.map((record) => normalizedDnsContent('A', record.content)))
  if (actualA.size !== expectedA.size || [...actualA].some((content) => !expectedA.has(content))) {
    throw new Error(
      'Apex A record content differs from the fixed GitHub Pages target; refusing to mutate it.',
    )
  }

  if (wwwCname.length !== 1) {
    throw new Error(
      `Expected exactly one www CNAME record; found ${wwwCname.length}. Refusing an ambiguous DNS change.`,
    )
  }
  if (normalizedDnsContent('CNAME', wwwCname[0].content) !== GITHUB_PAGES_HOST) {
    throw new Error(
      'The www CNAME does not match the fixed GitHub Pages target; refusing to mutate it.',
    )
  }

  const records = [...apexA, ...wwwCname]
  const patches = records.filter((record) => record.proxied !== true)
  return { records, patches }
}

async function getTransformEntrypoint(token, zoneId) {
  return cloudflare(token, `/zones/${zoneId}/rulesets/phases/${PHASE}/entrypoint`, {
    allowNotFound: true,
  })
}

function ruleTouchesCandidateHeader(rule) {
  const headers = rule?.action_parameters?.headers
  if (!headers || typeof headers !== 'object') return false
  return Object.keys(headers).some((name) => name.toLowerCase() === CANDIDATE_HEADER.toLowerCase())
}

function isManagedRule(rule) {
  return rule?.ref === MANAGED_RULE_REF
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, child]) => [name, canonicalizeJson(child)]),
  )
}

function comparableRule(rule) {
  const definition = structuredClone(rule ?? {})
  for (const field of ['id', 'version', 'last_updated', 'categories']) delete definition[field]
  const headers = definition?.action_parameters?.headers
  if (headers && typeof headers === 'object') {
    definition.action_parameters.headers = Object.entries(headers)
      .map(([headerName, value]) => [headerName.toLowerCase(), canonicalizeJson(value)])
      .sort(([left], [right]) => left.localeCompare(right))
  }
  return canonicalizeJson(definition)
}

export function inspectTransformRules(ruleset, candidate) {
  const rules = ruleset?.rules ?? []
  if (!Array.isArray(rules)) {
    throw new Error('Cloudflare response-header entrypoint did not contain a rules array.')
  }

  const managed = rules.filter(isManagedRule)
  if (managed.length > 1) {
    throw new Error(
      `Found ${managed.length} managed candidate-header rules; refusing to choose between duplicates.`,
    )
  }
  const descriptionCollisions = rules.filter(
    (rule) => !isManagedRule(rule) && rule?.description === MANAGED_RULE_DESCRIPTION,
  )
  if (descriptionCollisions.length > 0) {
    throw new Error(
      `Found ${descriptionCollisions.length} rule(s) using the managed description without the managed ref; refusing ambiguous ownership.`,
    )
  }
  const conflicting = rules.filter(
    (rule) => !isManagedRule(rule) && ruleTouchesCandidateHeader(rule),
  )
  if (conflicting.length > 0) {
    throw new Error(
      `Found ${conflicting.length} unmanaged rule(s) that modify ${CANDIDATE_HEADER}; refusing an ambiguous header change.`,
    )
  }

  const desired = desiredRule(candidate)
  const current = managed[0] ?? null
  const matches = current
    ? JSON.stringify(comparableRule(current)) === JSON.stringify(comparableRule(desired))
    : false
  return { rules, current, desired, matches }
}

function sanitizeRuleForWrite(rule) {
  const copy = structuredClone(rule)
  for (const field of ['id', 'version', 'last_updated', 'categories']) delete copy[field]
  return copy
}

function rulesetPayload(ruleset, rules) {
  return {
    name: ruleset?.name || 'AstroPrecise response header transformations',
    description:
      ruleset?.description || 'Zone response-header transformations, including release identity',
    kind: 'zone',
    phase: PHASE,
    rules: rules.map(sanitizeRuleForWrite),
  }
}

async function inspectCloudflare(token, candidate) {
  const zone = await findExactZone(token)
  const dns = await inspectDns(token, zone.id)
  const ruleset = await getTransformEntrypoint(token, zone.id)
  const transform = inspectTransformRules(ruleset, candidate)
  return { zone, dns, ruleset, transform }
}

function printLivePlan(state) {
  console.log(`Cloudflare zone: ${state.zone.name} (${state.zone.id}), status=${state.zone.status}`)
  if (state.dns.patches.length === 0) {
    console.log('DNS: expected apex/www records are already proxied.')
  } else {
    console.log('DNS changes required (proxy flag only):')
    for (const record of state.dns.patches) {
      console.log(`  proxy ${record.type} ${record.name} -> ${record.content}`)
    }
  }
  if (state.transform.matches) {
    console.log('Transform Rule: managed rule already matches the exact candidate.')
  } else if (state.transform.current) {
    console.log('Transform Rule: update the one managed rule to the exact candidate.')
  } else {
    console.log('Transform Rule: create the one managed candidate-identity rule.')
  }
  console.log('Unrelated DNS, rules, cache settings, and products: unchanged.')
}

export function planTransformMutation(state) {
  if (state.transform.matches) return Object.freeze({ kind: 'none' })
  if (state.ruleset && state.transform.current) {
    if (!state.ruleset.id || !state.transform.current.id) {
      throw new Error('The existing managed Transform Rule has no stable ruleset/rule id.')
    }
    const previousRuleRevision = getRuleRevision(state.transform.current)
    const previousRulesetRevision = getRulesetRevision(state.ruleset)
    if (!previousRuleRevision || !previousRulesetRevision) {
      throw new Error('The existing managed Transform Rule has no stable pre-write revisions.')
    }
    return Object.freeze({
      kind: 'update-rule',
      zoneId: state.zone.id,
      rulesetId: state.ruleset.id,
      ruleId: state.transform.current.id,
      previous: sanitizeRuleForWrite(state.transform.current),
      desired: state.transform.desired,
      previousRuleRevision,
      previousRulesetRevision,
    })
  }
  if (state.ruleset) {
    if (!state.ruleset.id) throw new Error('The existing Transform Rules entrypoint has no id.')
    const previousRulesetRevision = getRulesetRevision(state.ruleset)
    if (!previousRulesetRevision) {
      throw new Error('The existing Transform Rules entrypoint has no stable pre-write revision.')
    }
    return Object.freeze({
      kind: 'create-rule',
      zoneId: state.zone.id,
      rulesetId: state.ruleset.id,
      desired: state.transform.desired,
      previousRulesetRevision,
    })
  }
  return Object.freeze({
    kind: 'create-ruleset',
    zoneId: state.zone.id,
    desired: state.transform.desired,
  })
}

export async function executeTransformMutation(token, plan, api = cloudflare) {
  if (plan.kind === 'none') return plan
  if (plan.kind === 'update-rule') {
    const result = await api(
      token,
      `/zones/${plan.zoneId}/rulesets/${plan.rulesetId}/rules/${plan.ruleId}`,
      {
        method: 'PATCH',
        body: plan.desired,
      },
    )
    const applied = (result?.rules ?? []).filter(
      (rule) => isManagedRule(rule) && rule.id === plan.ruleId,
    )
    const appliedRuleRevision = getRuleRevision(applied[0])
    const appliedRulesetRevision = getRulesetRevision(result)
    if (
      result?.id !== plan.rulesetId ||
      applied.length !== 1 ||
      !sameRule(applied[0], plan.desired) ||
      !appliedRuleRevision ||
      !appliedRulesetRevision ||
      !isImmediateRevisionSuccessor(appliedRuleRevision, plan.previousRuleRevision) ||
      !isImmediateRevisionSuccessor(appliedRulesetRevision, plan.previousRulesetRevision)
    ) {
      throw new Error(
        'Cloudflare did not return the exact updated rule with stable rule/ruleset revisions; rollback ownership is unproven.',
      )
    }
    console.log('Applied: updated only the managed response-header Transform Rule.')
    return Object.freeze({ ...plan, appliedRuleRevision, appliedRulesetRevision })
  }
  if (plan.kind === 'create-rule') {
    const result = await api(token, `/zones/${plan.zoneId}/rulesets/${plan.rulesetId}/rules`, {
      method: 'POST',
      body: plan.desired,
    })
    const created = (result?.rules ?? []).filter(isManagedRule)
    const appliedRuleRevision = getRuleRevision(created[0])
    const appliedRulesetRevision = getRulesetRevision(result)
    if (
      result?.id !== plan.rulesetId ||
      created.length !== 1 ||
      !sameRule(created[0], plan.desired) ||
      !appliedRuleRevision ||
      !appliedRulesetRevision ||
      appliedRuleRevision.version !== '1' ||
      !isImmediateRevisionSuccessor(appliedRulesetRevision, plan.previousRulesetRevision)
    ) {
      throw new Error(
        'Cloudflare did not return the exact created rule with stable rule/ruleset revisions; ownership is unproven.',
      )
    }
    console.log('Applied: added only the managed response-header Transform Rule.')
    return Object.freeze({
      ...plan,
      createdRuleId: created[0].id,
      appliedRuleRevision,
      appliedRulesetRevision,
    })
  }
  if (plan.kind === 'create-ruleset') {
    const result = await api(token, `/zones/${plan.zoneId}/rulesets`, {
      method: 'POST',
      body: rulesetPayload(null, [plan.desired]),
    })
    const created = (result?.rules ?? []).filter(isManagedRule)
    const appliedRuleRevision = getRuleRevision(created[0])
    const appliedRulesetRevision = getRulesetRevision(result)
    if (
      !result?.id ||
      created.length !== 1 ||
      !sameRule(created[0], plan.desired) ||
      !appliedRuleRevision ||
      !appliedRulesetRevision ||
      appliedRuleRevision.version !== '1' ||
      appliedRulesetRevision.version !== '1'
    ) {
      throw new Error(
        'Cloudflare did not return the exact created entrypoint with stable rule/ruleset revisions; ownership is unproven.',
      )
    }
    console.log('Applied: created the response-header entrypoint with one managed rule.')
    return Object.freeze({
      ...plan,
      createdRulesetId: result.id,
      createdRuleId: created[0].id,
      appliedRuleRevision,
      appliedRulesetRevision,
    })
  }
  throw new Error(`Unknown Transform Rule mutation plan: ${plan.kind}`)
}

function sameRule(left, right) {
  return JSON.stringify(comparableRule(left)) === JSON.stringify(comparableRule(right))
}

function getRuleRevision(rule) {
  if (!rule?.id || rule.version === undefined || !rule.last_updated) return null
  return Object.freeze({
    id: String(rule.id),
    version: String(rule.version),
    lastUpdated: String(rule.last_updated),
  })
}

function getRulesetRevision(ruleset) {
  if (!ruleset?.id || ruleset.version === undefined || !ruleset.last_updated) return null
  return Object.freeze({
    id: String(ruleset.id),
    version: String(ruleset.version),
    lastUpdated: String(ruleset.last_updated),
  })
}

function isImmediateRevisionSuccessor(nextRevision, previousRevision) {
  if (
    !nextRevision ||
    !previousRevision ||
    nextRevision.id !== previousRevision.id ||
    !/^[0-9]+$/.test(nextRevision.version) ||
    !/^[0-9]+$/.test(previousRevision.version)
  ) {
    return false
  }
  return BigInt(nextRevision.version) === BigInt(previousRevision.version) + 1n
}

function sameRuleRevision(rule, revision) {
  return (
    revision !== null &&
    String(rule?.id ?? '') === revision.id &&
    String(rule?.version ?? '') === revision.version &&
    String(rule?.last_updated ?? '') === revision.lastUpdated
  )
}

function sameRulesetRevision(ruleset, revision) {
  return (
    revision !== null &&
    String(ruleset?.id ?? '') === revision.id &&
    String(ruleset?.version ?? '') === revision.version &&
    String(ruleset?.last_updated ?? '') === revision.lastUpdated
  )
}

export async function rollbackTransformMutation(token, plan, api = cloudflare) {
  if (!plan || plan.kind === 'none') return
  if (!plan.appliedRuleRevision || !plan.appliedRulesetRevision) {
    throw new Error(
      'Automatic Transform rollback requires the exact mutation-response rule and ruleset revisions.',
    )
  }
  const ruleset = await api(token, `/zones/${plan.zoneId}/rulesets/phases/${PHASE}/entrypoint`, {
    allowNotFound: true,
  })
  const managed = (ruleset?.rules ?? []).filter(isManagedRule)
  if (managed.length > 1) {
    throw new Error('Rollback found duplicate managed Transform Rules and refused ambiguity.')
  }
  const current = managed[0] ?? null

  if (plan.kind === 'update-rule') {
    if (current && sameRule(current, plan.previous)) {
      throw new Error(
        'Managed Transform Rule already appears restored, but stale readback cannot prove this invocation rolled it back.',
      )
    }
    if (
      !current ||
      current.id !== plan.ruleId ||
      !sameRule(current, plan.desired) ||
      !sameRuleRevision(current, plan.appliedRuleRevision) ||
      !sameRulesetRevision(ruleset, plan.appliedRulesetRevision)
    ) {
      throw new Error(
        'Managed Transform Rule or ruleset changed after this invocation; refusing automatic rollback.',
      )
    }
    const rollbackResult = await api(
      token,
      `/zones/${plan.zoneId}/rulesets/${plan.rulesetId}/rules/${plan.ruleId}`,
      {
        method: 'PATCH',
        body: plan.previous,
      },
    )
    const rollbackManaged = (rollbackResult?.rules ?? []).filter(isManagedRule)
    const rollbackRuleRevision = getRuleRevision(rollbackManaged[0])
    const rollbackRulesetRevision = getRulesetRevision(rollbackResult)
    if (
      rollbackResult?.id !== plan.rulesetId ||
      rollbackManaged.length !== 1 ||
      rollbackManaged[0].id !== plan.ruleId ||
      !sameRule(rollbackManaged[0], plan.previous) ||
      !rollbackRuleRevision ||
      !rollbackRulesetRevision ||
      !isImmediateRevisionSuccessor(rollbackRuleRevision, plan.appliedRuleRevision) ||
      !isImmediateRevisionSuccessor(rollbackRulesetRevision, plan.appliedRulesetRevision)
    ) {
      throw new Error(
        'Transform rollback response did not prove the exact restored rule and new revisions.',
      )
    }
    const after = await api(token, `/zones/${plan.zoneId}/rulesets/phases/${PHASE}/entrypoint`, {
      allowNotFound: true,
    })
    const afterManaged = (after?.rules ?? []).filter(isManagedRule)
    if (
      afterManaged.length !== 1 ||
      afterManaged[0].id !== plan.ruleId ||
      !sameRule(afterManaged[0], plan.previous) ||
      !sameRuleRevision(afterManaged[0], rollbackRuleRevision) ||
      !sameRulesetRevision(after, rollbackRulesetRevision)
    ) {
      throw new Error('Managed Transform Rule rollback postcondition was not observed.')
    }
    console.log('Rolled back: restored the previous managed Transform Rule.')
    return
  }

  if (!plan.createdRuleId) {
    throw new Error(
      'Created managed-rule ownership was not returned by this invocation; refusing rollback deletion.',
    )
  }
  if (!current) {
    throw new Error(
      'Created managed rule is absent from readback; stale state cannot prove safe rollback.',
    )
  }
  if (
    !sameRule(current, plan.desired) ||
    !sameRuleRevision(current, plan.appliedRuleRevision) ||
    !sameRulesetRevision(ruleset, plan.appliedRulesetRevision)
  ) {
    throw new Error(
      'Managed Transform Rule or ruleset changed after creation; refusing automatic deletion.',
    )
  }
  if (!current.id || !ruleset?.id || current.id !== plan.createdRuleId) {
    throw new Error('Rollback could not identify the exact managed rule/ruleset id.')
  }
  if (plan.kind === 'create-ruleset' && ruleset.id !== plan.createdRulesetId) {
    throw new Error('Created ruleset ownership does not match the current entrypoint.')
  }
  // Delete only the exact rule whose id was returned by this invocation. Even
  // for a newly created entrypoint, retaining an empty ruleset is safer than a
  // whole-ruleset DELETE racing an unrelated rule added by another operator.
  const deleteResult = await api(
    token,
    `/zones/${plan.zoneId}/rulesets/${ruleset.id}/rules/${current.id}`,
    {
      method: 'DELETE',
      allowNotFound: true,
    },
  )
  const deleteRulesetRevision = getRulesetRevision(deleteResult)
  if (
    deleteResult?.id !== ruleset.id ||
    !deleteRulesetRevision ||
    !isImmediateRevisionSuccessor(deleteRulesetRevision, plan.appliedRulesetRevision) ||
    (deleteResult?.rules ?? []).some(isManagedRule)
  ) {
    throw new Error(
      'Transform rollback delete response did not prove removal and the new ruleset revision.',
    )
  }
  const after = await api(token, `/zones/${plan.zoneId}/rulesets/phases/${PHASE}/entrypoint`, {
    allowNotFound: true,
  })
  if (
    (after?.rules ?? []).some(isManagedRule) ||
    !sameRulesetRevision(after, deleteRulesetRevision)
  ) {
    throw new Error('Created managed Transform Rule is still present after rollback deletion.')
  }
  console.log('Rolled back: removed the exact managed rule created by this apply.')
}

export async function patchDnsProxyFlags(token, zoneId, patches, api = cloudflare) {
  if (patches.length === 0) return
  await api(token, `/zones/${zoneId}/dns_records/batch`, {
    method: 'POST',
    body: {
      patches: patches.map((record) => ({ id: record.id, proxied: true })),
    },
  })
  for (const record of patches) {
    console.log(`Applied: proxied ${record.type} ${record.name} -> ${record.content}`)
  }
}

export async function compensateApplyFailure({
  token,
  dnsPlan,
  transformPlan,
  rollbackTransform = rollbackTransformMutation,
}) {
  const failures = []
  if (dnsPlan?.mutationAttempted) {
    failures.push(
      'DNS proxy mutation was attempted. Automatic DNS and Transform rollback are intentionally disabled because Cloudflare offers no compare-and-swap for these writes and distributed DNS propagation is not atomic. Retaining the candidate header is safer for traffic that may remain proxied; inspect live state and recover manually after convergence.',
    )
    return failures
  }

  try {
    await rollbackTransform(token, transformPlan)
  } catch (error) {
    failures.push(`Transform Rule rollback failed: ${error.message}`)
  }
  return failures
}

function decodeBody(buffer, encoding) {
  const normalized = String(encoding || '')
    .trim()
    .toLowerCase()
  if (!normalized || normalized === 'identity') return buffer
  if (normalized === 'gzip') return gunzipSync(buffer)
  if (normalized === 'deflate') return inflateSync(buffer)
  if (normalized === 'br') return brotliDecompressSync(buffer)
  throw new Error(`Unsupported public response content-encoding: ${normalized}`)
}

function rawHeaderValues(rawHeaders, wantedName) {
  const values = []
  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (String(rawHeaders[i]).toLowerCase() === wantedName.toLowerCase()) {
      values.push(String(rawHeaders[i + 1]))
    }
  }
  return values
}

function requestOnce(url) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: 'GET',
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          'User-Agent': 'AstroPrecise-Release-Edge-Verifier/1.0',
        },
        timeout: 15_000,
      },
      (response) => {
        const chunks = []
        let bytes = 0
        response.on('data', (chunk) => {
          bytes += chunk.length
          if (bytes > MAX_RESPONSE_BYTES) {
            request.destroy(new Error(`Public response exceeded ${MAX_RESPONSE_BYTES} bytes.`))
            return
          }
          chunks.push(chunk)
        })
        response.on('end', () => {
          try {
            const encoded = Buffer.concat(chunks)
            const decoded = decodeBody(encoded, response.headers['content-encoding'])
            resolve({
              url: url.toString(),
              status: response.statusCode ?? 0,
              headers: response.headers,
              rawHeaders: response.rawHeaders,
              body: decoded.toString('utf8'),
            })
          } catch (error) {
            reject(error)
          }
        })
      },
    )
    request.on('timeout', () => request.destroy(new Error(`Timed out requesting ${url}.`)))
    request.on('error', reject)
    request.end()
  })
}

async function requestFollowingSafeRedirects(initialUrl, maxRedirects = 5) {
  const chain = []
  let url = new URL(initialUrl)
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    if (url.protocol !== 'https:' || !ALLOWED_PUBLIC_HOSTS.has(url.hostname)) {
      throw new Error(
        `Refusing public verification redirect outside the fixed HTTPS hosts: ${url}.`,
      )
    }
    const response = await requestOnce(url)
    chain.push(response)
    if (![301, 302, 303, 307, 308].includes(response.status)) return chain
    const location = response.headers.location
    if (!location) throw new Error(`Redirect from ${url} did not include Location.`)
    url = new URL(location, url)
  }
  throw new Error(`Too many redirects while verifying ${initialUrl}.`)
}

function assertCandidateHeader(chain, candidate, label) {
  for (const response of chain) {
    const values = rawHeaderValues(response.rawHeaders, CANDIDATE_HEADER)
    if (values.length !== 1 || values[0] !== candidate) {
      throw new Error(
        `${label} ${response.url} returned ${values.length} ${CANDIDATE_HEADER} header(s); expected exactly one value equal to ${candidate}.`,
      )
    }
  }
}

export function publicSwVersion(source, label) {
  try {
    return parseServiceWorkerVersion(source)
  } catch (error) {
    throw new Error(`${label} has an invalid service-worker identity (${error.message}).`)
  }
}

function releaseIdentityPath(candidate) {
  return `/.well-known/astroprecise-release/${candidate}.json`
}

export function parsePublicReleaseIdentity(source, candidate, expectedSwVersion, label) {
  let observed
  try {
    observed = JSON.parse(source)
  } catch (error) {
    throw new Error(`${label} is not valid JSON (${error.message}).`)
  }
  const expected = releaseIdentityDocument({
    candidateSha: candidate,
    releaseTag: `release/${expectedSwVersion}-${candidate.slice(0, 12)}`,
    releaseVersion: expectedSwVersion,
  })
  if (
    !observed ||
    Array.isArray(observed) ||
    JSON.stringify(observed) !== JSON.stringify(expected)
  ) {
    throw new Error(`${label} does not exactly identify candidate ${candidate}.`)
  }
  return observed
}

export async function verifyDeployedIdentity(
  host,
  candidate,
  expectedSwVersion,
  requireHeader,
  request = requestFollowingSafeRedirects,
) {
  const cacheBust = encodeURIComponent(candidate)
  const identityChain = await request(
    `https://${host}${releaseIdentityPath(candidate)}?coherence_release_verify=${cacheBust}`,
  )
  if (requireHeader) {
    assertCandidateHeader(identityChain, candidate, `${host} release identity`)
  }
  const identityFinal = identityChain.at(-1)
  if (identityFinal.status < 200 || identityFinal.status >= 300) {
    throw new Error(`${host} release identity ended with HTTP ${identityFinal.status}.`)
  }
  parsePublicReleaseIdentity(
    identityFinal.body,
    candidate,
    expectedSwVersion,
    `${host} release identity`,
  )
}

async function verifyPublicOnce(candidate, expectedSwVersion) {
  for (const host of [ZONE_NAME, WWW_NAME]) {
    const rootChain = await requestFollowingSafeRedirects(`https://${host}/`)
    assertCandidateHeader(rootChain, candidate, `${host} root`)
    const rootFinal = rootChain.at(-1)
    if (rootFinal.status < 200 || rootFinal.status >= 300) {
      throw new Error(`${host} root ended with HTTP ${rootFinal.status}.`)
    }

    const cacheBust = encodeURIComponent(candidate)
    const swChain = await requestFollowingSafeRedirects(
      `https://${host}/sw.js?coherence_release_verify=${cacheBust}`,
    )
    assertCandidateHeader(swChain, candidate, `${host} sw.js`)
    const swFinal = swChain.at(-1)
    if (swFinal.status < 200 || swFinal.status >= 300) {
      throw new Error(`${host} sw.js ended with HTTP ${swFinal.status}.`)
    }
    const observedSwVersion = publicSwVersion(swFinal.body, `${host} sw.js`)
    if (observedSwVersion !== expectedSwVersion) {
      throw new Error(
        `${host} sw.js reports ${observedSwVersion}; local release intent is ${expectedSwVersion}.`,
      )
    }
    await verifyDeployedIdentity(host, candidate, expectedSwVersion, true)
    console.log(
      `Public OK: ${host} has one ${CANDIDATE_HEADER}=${candidate}; exact release artifact=${candidate}; sw.js=${observedSwVersion}.`,
    )
  }
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds))
}

async function verifyPublic(candidate, expectedSwVersion, { attempts = 1 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await verifyPublicOnce(candidate, expectedSwVersion)
      return
    } catch (error) {
      lastError = error
      if (attempt === attempts) break
      console.log(
        `Public release identity not converged (${attempt}/${attempts}): ${error.message}`,
      )
      await delay(PUBLIC_VERIFY_DELAY_MS)
    }
  }
  throw lastError
}

async function verifyCloudflareState(token, candidate) {
  const state = await inspectCloudflare(token, candidate)
  if (state.dns.patches.length > 0) {
    throw new Error(`${state.dns.patches.length} expected apex/www DNS record(s) are not proxied.`)
  }
  if (!state.transform.matches) {
    throw new Error(
      'The managed response-header Transform Rule does not match the exact candidate.',
    )
  }
  console.log('Cloudflare OK: exact apex/www records are proxied and one managed rule matches.')
  return state
}

async function verifyTransformState(token, candidate) {
  const zone = await findExactZone(token)
  const ruleset = await getTransformEntrypoint(token, zone.id)
  const transform = inspectTransformRules(ruleset, candidate)
  if (!transform.matches) {
    throw new Error('The managed response-header Transform Rule does not match after write.')
  }
  console.log('Cloudflare OK: the one managed Transform Rule matches before DNS proxying.')
}

async function verifyOriginReleaseIntent(candidate, expectedSwVersion) {
  for (const host of [ZONE_NAME, WWW_NAME]) {
    const chain = await requestFollowingSafeRedirects(
      `https://${host}/sw.js?release_origin_preflight=${Date.now()}`,
    )
    const final = chain.at(-1)
    if (final.status < 200 || final.status >= 300) {
      throw new Error(`${host} preflight sw.js ended with HTTP ${final.status}.`)
    }
    const observed = publicSwVersion(final.body, `${host} preflight sw.js`)
    if (observed !== expectedSwVersion) {
      throw new Error(
        `${host} still serves ${observed}; refusing to stamp a candidate whose local intent is ${expectedSwVersion}. Deploy first.`,
      )
    }
    await verifyDeployedIdentity(host, candidate, expectedSwVersion, false)
    console.log(`Origin preflight OK: ${host} exact artifact=${candidate}; sw.js=${observed}.`)
  }
}

async function apply(token, candidate, releaseIntent) {
  const before = await inspectCloudflare(token, candidate)
  printLivePlan(before)
  await verifyOriginReleaseIntent(candidate, releaseIntent.serviceWorkerVersion)

  let transformPlan = Object.freeze({ kind: 'none' })
  let dnsPlan = null
  try {
    // Re-read immediately before each narrowly-scoped write. Rule-specific
    // endpoints preserve unrelated rules; DNS proxy flags use one batch DB
    // transaction rather than five independent PATCH operations.
    const beforeTransformWrite = await inspectCloudflare(token, candidate)
    transformPlan = planTransformMutation(beforeTransformWrite)
    transformPlan = await executeTransformMutation(token, transformPlan)
    await verifyTransformState(token, candidate)
    await delay(5_000)
    await verifyTransformState(token, candidate)

    const zoneBeforeDnsWrite = await findExactZone(token)
    const dnsBeforeWrite = await inspectDns(token, zoneBeforeDnsWrite.id)
    dnsPlan = {
      zoneId: zoneBeforeDnsWrite.id,
      originals: dnsBeforeWrite.patches.map((record) => structuredClone(record)),
      mutationAttempted: false,
    }
    dnsPlan.mutationAttempted = dnsPlan.originals.length > 0
    await patchDnsProxyFlags(token, dnsPlan.zoneId, dnsPlan.originals)
    await verifyCloudflareState(token, candidate)
    await verifyPublic(candidate, releaseIntent.serviceWorkerVersion, {
      attempts: PUBLIC_VERIFY_ATTEMPTS,
    })
    console.log('APPLY COMPLETE: Cloudflare state and exact public release identity verified.')
  } catch (error) {
    const rollbackFailures = await compensateApplyFailure({ token, dnsPlan, transformPlan })
    const rollbackSummary =
      rollbackFailures.length === 0
        ? 'All changes made by this apply were rolled back.'
        : `MANUAL RECOVERY REQUIRED. ${rollbackFailures.join(' ')}`
    throw new Error(`APPLY FAILED: ${error.message} ${rollbackSummary}`)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const releaseIntent = readReleaseIntent()
  if (options.mode === 'dry-run') {
    printPlan({ candidate: options.candidate, ...releaseIntent })
    return
  }

  if (options.mode === 'verify-public') {
    await verifyPublic(options.candidate, releaseIntent.serviceWorkerVersion, {
      attempts: PUBLIC_VERIFY_ATTEMPTS,
    })
    console.log(
      'PUBLIC VERIFY COMPLETE: no Cloudflare token was read and no mutations were performed.',
    )
    return
  }

  if (options.mode === 'apply') {
    assertApplyCandidate(options.candidate, releaseIntent)
  }
  const token = tokenOrThrow()
  if (options.mode === 'verify') {
    const state = await inspectCloudflare(token, options.candidate)
    printLivePlan(state)
    if (state.dns.patches.length > 0 || !state.transform.matches) {
      throw new Error(
        'VERIFY FAILED: Cloudflare state does not match the requested release identity.',
      )
    }
    await verifyPublic(options.candidate, releaseIntent.serviceWorkerVersion, {
      attempts: PUBLIC_VERIFY_ATTEMPTS,
    })
    console.log('VERIFY COMPLETE: no mutations were performed.')
    return
  }

  await apply(token, options.candidate, releaseIntent)
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false

if (isDirectExecution) {
  main().catch((error) => {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
