#!/usr/bin/env node
/**
 * Deploy the AstroPrecise subscribe Cloudflare Worker + optional list.* route.
 *
 * Reads secrets from secrets/.env.local (same as setup-cloudflare-dns.mjs).
 *
 * Required:
 *   CLOUDFLARE_API_TOKEN — Zone:Read + Account:Workers Scripts:Edit + Workers KV Storage:Edit
 *
 * Optional:
 *   AP_DOMAIN=astroprecise.app
 *   OWNER_EMAIL=jonnydavx@gmail.com
 *   SUBSCRIBE_HOST=list.astroprecise.app
 *   EXPORT_TOKEN=<random>   # enables GET /export?token=… CSV download
 *
 * Usage:
 *   node tools/deploy-subscribe-worker.mjs
 *   node tools/deploy-subscribe-worker.mjs --dry-run
 *   node tools/deploy-subscribe-worker.mjs --verify
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.cloudflare.com/client/v4';
const SCRIPT_NAME = 'ap-subscribe';
const KV_TITLE = 'AP_SUBSCRIBERS';

function loadEnv() {
  const candidates = [join(ROOT, 'secrets', '.env.local'), join(ROOT, '.env.local')];
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

async function cf(path, { method = 'GET', body, multipart } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN missing');
  const headers = { Authorization: `Bearer ${token}` };
  let payload;
  if (multipart) {
    payload = multipart;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  const data = await res.json();
  if (!data.success) {
    const msg = (data.errors || []).map(e => e.message).join('; ') || res.statusText;
    throw new Error(`Cloudflare API ${method} ${path}: ${msg}`);
  }
  return data;
}

async function getAccountId() {
  const { result } = await cf('/accounts?per_page=50');
  if (!result?.length) throw new Error('No Cloudflare accounts visible to this token');
  const acct = result.find(a => !a.name?.includes('Deleted')) || result[0];
  console.log(`Account: ${acct.name} (${acct.id})`);
  return acct.id;
}

async function findZone(domain) {
  const { result } = await cf(`/zones?name=${encodeURIComponent(domain)}`);
  return result[0] || null;
}

async function getOrCreateKv(accountId) {
  const { result } = await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`);
  const hit = result.find(n => n.title === KV_TITLE);
  if (hit) {
    console.log(`KV namespace exists: ${KV_TITLE} (${hit.id})`);
    return hit.id;
  }
  const created = await cf(`/accounts/${accountId}/storage/kv/namespaces`, {
    method: 'POST',
    body: { title: KV_TITLE },
  });
  console.log(`KV namespace created: ${KV_TITLE} (${created.result.id})`);
  return created.result.id;
}

async function deployWorker(accountId, kvId, vars) {
  const scriptPath = join(ROOT, 'workers', 'subscribe', 'src', 'index.js');
  const script = readFileSync(scriptPath, 'utf8');
  const bindings = [
    { type: 'kv_namespace', name: 'SUBSCRIBERS', namespace_id: kvId },
    { type: 'plain_text', name: 'OWNER_EMAIL', text: vars.ownerEmail },
    { type: 'plain_text', name: 'FROM_EMAIL', text: vars.fromEmail },
  ];
  if (vars.exportToken) {
    bindings.push({ type: 'plain_text', name: 'EXPORT_TOKEN', text: vars.exportToken });
  }
  const metadata = {
    main_module: 'index.js',
    compatibility_date: '2024-01-01',
    bindings,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('index.js', new Blob([script], { type: 'application/javascript+module' }), 'index.js');

  await cf(`/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}`, {
    method: 'PUT',
    multipart: form,
  });
  console.log(`Worker script deployed: ${SCRIPT_NAME}`);
}

async function enableWorkersDev(accountId) {
  try {
    await cf(`/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/subdomain`, {
      method: 'POST',
      body: { enabled: true },
    });
    const { result } = await cf(`/accounts/${accountId}/workers/subdomain`);
    const sub = result?.subdomain;
    if (sub) {
      const url = `https://${SCRIPT_NAME}.${sub}.workers.dev/subscribe`;
      console.log(`Workers.dev URL: ${url}`);
      return url;
    }
  } catch (e) {
    console.warn(`Workers.dev subdomain: ${e.message}`);
  }
  return null;
}

async function upsertWorkerRoute(zoneId, pattern) {
  const { result } = await cf(`/zones/${zoneId}/workers/routes`);
  const existing = result.find(r => r.pattern === pattern);
  if (existing?.script === SCRIPT_NAME) {
    console.log(`Route OK: ${pattern} → ${SCRIPT_NAME}`);
    return;
  }
  if (existing) {
    await cf(`/zones/${zoneId}/workers/routes/${existing.id}`, { method: 'DELETE' });
  }
  await cf(`/zones/${zoneId}/workers/routes`, {
    method: 'POST',
    body: { pattern, script: SCRIPT_NAME },
  });
  console.log(`Route added: ${pattern} → ${SCRIPT_NAME}`);
}

async function upsertDns(zoneId, name) {
  const q = new URLSearchParams({ type: 'AAAA', name, per_page: '100' });
  const { result } = await cf(`/zones/${zoneId}/dns_records?${q}`);
  const placeholder = '100::';
  const match = result.find(r => r.name === name && r.type === 'AAAA');
  const payload = { type: 'AAAA', name, content: placeholder, proxied: true, ttl: 1 };
  if (match) {
    if (match.content === placeholder && match.proxied) {
      console.log(`DNS OK: AAAA ${name} (proxied)`);
      return;
    }
    await cf(`/zones/${zoneId}/dns_records/${match.id}`, { method: 'PATCH', body: payload });
    console.log(`DNS updated: AAAA ${name} (proxied)`);
    return;
  }
  await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body: payload });
  console.log(`DNS added: AAAA ${name} (proxied)`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const verifyOnly = args.has('--verify');

  if (!loadEnv()) {
    console.error('No secrets/.env.local found.');
    process.exit(1);
  }

  const domain = process.env.AP_DOMAIN || 'astroprecise.app';
  const subscribeHost = process.env.SUBSCRIBE_HOST || `list.${domain}`;
  const ownerEmail = process.env.OWNER_EMAIL || 'jonnydavx@gmail.com';
  const fromEmail = process.env.FROM_EMAIL || `subscribe@${domain}`;
  const exportToken = process.env.EXPORT_TOKEN || '';
  const customUrl = `https://${subscribeHost}/subscribe`;

  console.log(`Planned subscribe URL: ${customUrl}`);
  console.log(`Owner notify: ${ownerEmail}`);

  if (dryRun) {
    console.log('Dry run — no API writes.');
    return;
  }

  const accountId = await getAccountId();
  if (verifyOnly) {
    const zone = await findZone(domain);
    console.log(zone ? `Zone OK: ${zone.name}` : `Zone missing for ${domain}`);
    return;
  }

  const kvId = await getOrCreateKv(accountId);
  await deployWorker(accountId, kvId, { ownerEmail, fromEmail, exportToken });
  const workersDevUrl = await enableWorkersDev(accountId);

  const zone = await findZone(domain);
  if (zone) {
    await upsertDns(zone.id, subscribeHost);
    await upsertWorkerRoute(zone.id, `${subscribeHost}/*`);
    console.log(`\nLive subscribe endpoint: ${customUrl}`);
  } else {
    console.warn(`Zone ${domain} not found — custom host skipped.`);
  }
  if (workersDevUrl) console.log(`Fallback: ${workersDevUrl}`);

  console.log('\nPaste into website/js/app.js AP_MON:');
  console.log(`  newsletterUrl: '${customUrl}',`);
  console.log(`  emailUrl: '${customUrl}',`);
  console.log(`  ownerEmail: '${ownerEmail}',`);
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});