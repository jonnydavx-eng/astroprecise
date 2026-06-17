#!/usr/bin/env node
/**
 * AstroPrecise — Cloudflare cache rules for astroprecise.app (orange-cloud / proxied only).
 *
 * Requires CLOUDFLARE_API_TOKEN with Zone:Read + Zone:Cache Rules:Edit (or Zone Settings:Edit).
 * Loads secrets from secrets/.env.local or .env.local (same as setup-cloudflare-dns.mjs).
 *
 * Usage:
 *   node tools/setup-cloudflare-cache.mjs --dry-run
 *   node tools/setup-cloudflare-cache.mjs --verify
 *   node tools/setup-cloudflare-cache.mjs
 *
 * Note: Grey-cloud DNS (CF_PROXY=false) bypasses Cloudflare cache — enable proxy first.
 *
 * Security headers (Content-Security-Policy, etc.) live in website/_headers and deploy
 * with the static site on Cloudflare Pages — not managed by this cache-rules script.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://api.cloudflare.com/client/v4';

function loadEnv() {
  for (const path of [join(ROOT, 'secrets', '.env.local'), join(ROOT, '.env.local')]) {
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
    return;
  }
}

async function cf(path, { method = 'GET', body } = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN missing');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) {
    const msg = (data.errors || []).map((e) => e.message).join('; ') || res.statusText;
    throw new Error(`Cloudflare ${method} ${path}: ${msg}`);
  }
  return data;
}

const CACHE_RULES = {
  name: 'AstroPrecise static assets',
  kind: 'zone',
  phase: 'http_request_cache_settings',
  rules: [
    {
      description: 'Immutable hashed static (woff2, css, js, images)',
      expression: '(http.request.uri.path.extension in {"woff2" "woff" "css" "js" "webp" "jpg" "jpeg" "png" "svg" "ico"})',
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'override_origin', default: 31536000 },
        browser_ttl: { mode: 'override_origin', default: 31536000 },
      },
    },
    {
      description: 'HTML shell — short edge cache',
      expression: '(http.request.uri.path.extension in {"html" ""} or http.request.uri.path eq "/")',
      action: 'set_cache_settings',
      action_parameters: {
        cache: true,
        edge_ttl: { mode: 'override_origin', default: 3600 },
        browser_ttl: { mode: 'override_origin', default: 0 },
      },
    },
  ],
};

async function main() {
  const args = new Set(process.argv.slice(2));
  loadEnv();
  const domain = process.env.AP_DOMAIN || 'astroprecise.app';
  const { result: zones } = await cf(`/zones?name=${encodeURIComponent(domain)}`);
  const zone = zones[0];
  if (!zone) throw new Error(`Zone not found: ${domain}`);

  console.log(`Zone: ${zone.name} (${zone.id})`);
  if (args.has('--verify')) return;

  if (args.has('--dry-run')) {
    console.log('Dry run — would apply cache ruleset:');
    console.log(JSON.stringify(CACHE_RULES, null, 2));
    console.log('\nRequires orange-cloud (proxied) DNS. Current plan uses grey cloud for GitHub Pages cert.');
    return;
  }

  const entry = await cf(`/zones/${zone.id}/rulesets/phases/http_request_cache_settings/entrypoint`);
  const existing = entry.result;
  const rules = [...(existing.rules || []).filter((r) => r.description !== CACHE_RULES.rules[0].description && r.description !== CACHE_RULES.rules[1].description), ...CACHE_RULES.rules];

  await cf(`/zones/${zone.id}/rulesets/${existing.id}`, {
    method: 'PUT',
    body: { ...existing, rules },
  });
  console.log('Cache rules applied. Purge cache in dashboard if needed after deploy.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});