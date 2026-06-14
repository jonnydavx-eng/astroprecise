#!/usr/bin/env node
/**
 * Configure Cloudflare DNS for AstroPrecise → GitHub Pages (apex + www).
 *
 * Reads secrets from (first match):
 *   secrets/.env.local
 *   .env.local
 *
 * Required:
 *   CLOUDFLARE_API_TOKEN=<API token with Zone:DNS:Edit + Zone:Read>
 *
 * Optional:
 *   AP_DOMAIN=astroprecise.app
 *   GITHUB_PAGES_HOST=jonnydavx-eng.github.io
 *   CF_PROXY=false          # grey cloud (recommended for GitHub cert issuance)
 *
 * Usage:
 *   node tools/setup-cloudflare-dns.mjs           # apply DNS
 *   node tools/setup-cloudflare-dns.mjs --verify  # token + zone check only
 *   node tools/setup-cloudflare-dns.mjs --dry-run # print planned records
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.cloudflare.com/client/v4';

const GITHUB_A = [
  '185.199.108.153',
  '185.199.109.153',
  '185.199.110.153',
  '185.199.111.153',
];

function loadEnv() {
  const candidates = [
    join(ROOT, 'secrets', '.env.local'),
    join(ROOT, '.env.local'),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
    console.log(`Loaded env from ${path}`);
    return path;
  }
  return null;
}

async function cf(path, { method = 'GET', body } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN missing — add it to secrets/.env.local');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    const msg = (data.errors || []).map(e => e.message).join('; ') || res.statusText;
    throw new Error(`Cloudflare API ${method} ${path}: ${msg}`);
  }
  return data;
}

async function findZone(domain) {
  const { result } = await cf(`/zones?name=${encodeURIComponent(domain)}`);
  return result[0] || null;
}

async function listRecords(zoneId, type, name) {
  const q = new URLSearchParams({ type, name, per_page: '100' });
  const { result } = await cf(`/zones/${zoneId}/dns_records?${q}`);
  return result;
}

async function upsertRecord(zoneId, spec) {
  const existing = await listRecords(zoneId, spec.type, spec.name);
  const match = existing.find(r =>
    r.type === spec.type &&
    r.name === spec.name &&
    r.content === spec.content
  );
  if (match) {
    console.log(`  OK  ${spec.type} ${spec.name} → ${spec.content}`);
    return match;
  }
  const payload = {
    type: spec.type,
    name: spec.name,
    content: spec.content,
    proxied: spec.proxied,
    ttl: 1,
  };
  if (match) {
    const { result } = await cf(`/zones/${zoneId}/dns_records/${match.id}`, {
      method: 'PATCH',
      body: payload,
    });
    console.log(`  UPD ${spec.type} ${spec.name} → ${spec.content} (proxied=${spec.proxied})`);
    return result;
  }
  const { result } = await cf(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: payload,
  });
  console.log(`  ADD ${spec.type} ${spec.name} → ${spec.content} (proxied=${spec.proxied})`);
  return result;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const verifyOnly = args.has('--verify');

  const envPath = loadEnv();
  if (!envPath) {
    console.error('No secrets file found. Create secrets/.env.local with CLOUDFLARE_API_TOKEN=...');
    process.exit(1);
  }

  const domain = process.env.AP_DOMAIN || 'astroprecise.app';
  const ghHost = process.env.GITHUB_PAGES_HOST || 'jonnydavx-eng.github.io';
  const proxied = String(process.env.CF_PROXY || 'false').toLowerCase() === 'true';

  const zone = await findZone(domain);
  if (!zone) {
    console.error(`Zone not found for ${domain}.`);
    console.error('Buy/add the domain in Cloudflare Dashboard → Websites → Add site, then re-run.');
    process.exit(2);
  }
  console.log(`Token OK — zone access confirmed`);
  console.log(`Zone: ${zone.name} (${zone.id}) status=${zone.status}`);

  const plan = [
    ...GITHUB_A.map(ip => ({
      type: 'A',
      name: domain,
      content: ip,
      proxied,
    })),
    {
      type: 'CNAME',
      name: `www.${domain}`,
      content: ghHost,
      proxied,
    },
  ];

  if (verifyOnly) {
    console.log('Verify complete. Planned records:');
    for (const r of plan) console.log(`  ${r.type} ${r.name} → ${r.content}`);
    return;
  }

  if (dryRun) {
    console.log('Dry run — would apply:');
    for (const r of plan) console.log(`  ${r.type} ${r.name} → ${r.content} proxied=${r.proxied}`);
    return;
  }

  console.log(`Applying DNS (proxied=${proxied})…`);
  for (const spec of plan) {
    await upsertRecord(zone.id, spec);
  }

  console.log('\nNext steps (manual — GitHub UI):');
  console.log(`  1. Repo → Settings → Pages → Custom domain → ${domain}`);
  console.log('  2. Wait for DNS + HTTPS cert (grey cloud recommended until cert issues)');
  console.log('  3. Tick Enforce HTTPS when ready');
  console.log('  4. Run DOMAIN-SWITCH.md steps 5–8 (URL replace, manifest, assetlinks, sw bump)');
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});