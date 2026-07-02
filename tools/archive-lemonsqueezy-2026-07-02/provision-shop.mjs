#!/usr/bin/env node
/**
 * AstroPrecise — one-command shop provisioning (AI-runnable).
 *
 * WHY THIS EXISTS
 * Lemon Squeezy's Products API returns 405 — you cannot POST /products.
 * The automated workaround (already in link-typeform-lemonsqueezy.mjs):
 *   ONE dashboard product → Checkouts API creates 13 SKUs (custom_price + Typeform redirect).
 *
 * OWNER ONE-TIME (~2 min, cannot be API'd on LS):
 *   1. https://app.lemonsqueezy.com/products → New product
 *   2. Name: "AstroPrecise Digital" · Price: £12 · Publish
 *   3. Optional: LEMONSQUEEZY_VARIANT_ID=<uuid> in secrets/.env.local
 *      (or leave blank — script picks first store variant)
 *
 * AI / AGENT FULL PIPELINE:
 *   node tools/provision-shop.mjs --dry-run    # probe keys + catalog
 *   node tools/provision-shop.mjs --apply      # create checkouts + wire app.js + bump sw
 *
 * Requires secrets/.env.local:
 *   LEMONSQUEEZY_API_KEY   (Settings → API → Create key)
 *   TYPEFORM_TOKEN         (already used for fulfilment forms)
 *
 * Routes:
 *   A (default)  LS Checkouts API + Typeform — MoR/VAT, 1 manual product
 *   B            LS dashboard + sync-lemonsqueezy.mjs — 13 manual products, then sync
 *   C            Gumroad API — full product create (see gumroad-provision.mjs)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadSecrets } from './load-secrets.mjs';

loadSecrets();

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const CATALOG = join(__dir, 'typeform-catalog.json');
const URLS = join(__dir, 'commerce-urls.json');
const RESULT = join(__dir, 'commerce-setup-result.json');

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const APPLY = args.has('--apply');
const ROUTE = [...args].find((a) => a.startsWith('--route='))?.split('=')[1] || 'checkouts';

const LS_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const TF_KEY = process.env.TYPEFORM_TOKEN || '';
const STORE = process.env.LEMONSQUEEZY_STORE_ID || '407645';

async function ls(path, opts = {}) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${LS_KEY}`,
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

function run(script, scriptArgs = []) {
  const res = spawnSync(process.execPath, [join(__dir, script), ...scriptArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  return res.status ?? 1;
}

function help() {
  console.log(`
AstroPrecise shop provisioning — AI-runnable pipeline

BLOCKER (Lemon Squeezy): POST /products → 405. Products must exist in dashboard OR
use Route A (Checkouts API) with ONE master variant.

Route A — RECOMMENDED (99% automated)
  Owner once: create 1 LS product in dashboard (~2 min)
  Agent:      node tools/provision-shop.mjs --apply
  Creates 13 checkout URLs via Checkouts API → wires website/js/app.js

Route B — Manual LS products + sync
  Owner: create 13 products using tools/lemonsqueezy-product-copy.txt
  Agent: node tools/sync-lemonsqueezy.mjs --apply

Route C — Gumroad (full API product create)
  Owner: GUMROAD_ACCESS_TOKEN in secrets/.env.local
  Agent: node tools/gumroad-provision.mjs --apply
  Note: different MoR/fees; re-point AP_MON URLs

Already automated (no owner):
  • 14 Typeform fulfilment forms → tools/typeform-catalog.json
  • Fulfilment generators → tools/fulfil-order.mjs
  • Site wiring → tools/wire-ap-mon.mjs

Commands:
  node tools/provision-shop.mjs --dry-run
  node tools/provision-shop.mjs --apply
  node tools/provision-shop.mjs --route=sync --apply
`);
}

async function probe() {
  const report = { ok: true, steps: [] };

  if (!LS_KEY) {
    report.ok = false;
    report.steps.push({ step: 'lemonsqueezy', ok: false, detail: 'Missing LEMONSQUEEZY_API_KEY in secrets/.env.local' });
  } else {
    const store = await ls(`/stores/${STORE}`);
    if (!store.ok) {
      report.ok = false;
      report.steps.push({
        step: 'lemonsqueezy',
        ok: false,
        detail: `API ${store.status} — regenerate key at https://app.lemonsqueezy.com/settings/api`,
      });
    } else {
      const products = await ls(`/products?filter[store_id]=${STORE}&page[size]=50`);
      const count = products.body?.data?.length ?? 0;
      let masterVariant = process.env.LEMONSQUEEZY_VARIANT_ID || null;
      if (!masterVariant && count > 0) {
        const p = products.body.data[0];
        const vars = await ls(`/products/${p.id}/variants`);
        masterVariant = vars.body?.data?.[0]?.id || null;
      }
      report.steps.push({
        step: 'lemonsqueezy',
        ok: true,
        detail: `Store OK · ${count} product(s) · master variant: ${masterVariant || 'NONE — create 1 product in dashboard'}`,
        masterVariant,
        productCount: count,
      });
      if (!masterVariant) report.ok = false;
    }
  }

  if (!TF_KEY) {
    report.steps.push({ step: 'typeform', ok: false, detail: 'Missing TYPEFORM_TOKEN (optional for checkout linking)' });
  } else if (existsSync(CATALOG)) {
    const cat = JSON.parse(readFileSync(CATALOG, 'utf8'));
    report.steps.push({
      step: 'typeform',
      ok: true,
      detail: `${cat.forms?.length || 0} forms in typeform-catalog.json`,
    });
  } else {
    report.steps.push({ step: 'typeform', ok: false, detail: 'Run: TYPEFORM_TOKEN=... node tools/setup-commerce.mjs --typeform-only' });
  }

  if (existsSync(URLS)) {
    const u = JSON.parse(readFileSync(URLS, 'utf8'));
    const live = Object.values(u.checkout || {}).filter((x) => x && /^https?:\/\//i.test(x)).length;
    report.steps.push({ step: 'commerce-urls', ok: true, detail: `${live}/13 checkout URLs wired` });
  }

  return report;
}

async function main() {
  if (args.has('--help') || args.has('-h')) {
    help();
    return;
  }

  console.log('AstroPrecise — provision-shop' + (DRY ? ' (dry-run)' : APPLY ? ' (apply)' : ''));
  const report = await probe();

  for (const s of report.steps) {
    console.log(`${s.ok ? '✓' : '✗'} ${s.step}: ${s.detail}`);
  }

  if (DRY || !APPLY) {
    if (!report.ok) {
      console.log('\nNot ready for --apply. Fix blockers above.');
      if (!LS_KEY || report.steps.find((s) => s.step === 'lemonsqueezy' && !s.ok)) {
        console.log('  → Regenerate LEMONSQUEEZY_API_KEY: https://app.lemonsqueezy.com/settings/api');
        console.log('  → Paste into secrets/.env.local');
      }
      if (report.steps.find((s) => s.detail?.includes('NONE'))) {
        console.log('  → Create ONE product: tools/lemonsqueezy-product-copy.txt (Product 1 only is enough for Route A)');
      }
    } else {
      console.log('\nReady. Run: node tools/provision-shop.mjs --apply');
    }
    process.exit(report.ok ? 0 : 2);
  }

  if (!report.ok) {
    console.error('\nAborting — fix probe failures first (--dry-run)');
    process.exit(2);
  }

  if (!existsSync(CATALOG)) {
    console.log('\nCreating Typeform catalogue…');
    if (run('setup-commerce.mjs', ['--typeform-only']) !== 0) process.exit(1);
  }

  if (ROUTE === 'sync') {
    console.log('\nRoute B: sync existing LS dashboard products…');
    const code = run('sync-lemonsqueezy.mjs', ['--apply']);
    process.exit(code);
  }

  console.log('\nRoute A: Checkouts API → Typeform (all SKUs from one variant)…');
  const code = run('link-typeform-lemonsqueezy.mjs', ['--apply']);
  if (code !== 0) process.exit(code);

  const urls = existsSync(URLS) ? JSON.parse(readFileSync(URLS, 'utf8')) : {};
  const linked = Object.values(urls.checkout || {}).filter((x) => x && /^https?:\/\//i.test(x)).length;
  console.log(`\nDone. ${linked} checkout URL(s) in commerce-urls.json`);
  console.log('Next: git add website/js/app.js website/sw.js tools/commerce-urls.json && git push main');
  if (existsSync(RESULT)) {
    const r = JSON.parse(readFileSync(RESULT, 'utf8'));
    console.log(`Result: ${RESULT} (${r.checkouts_created || r.link_mode || 'wired'})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});