#!/usr/bin/env node
/**
 * Alternative Route C — Gumroad full API product provisioning.
 *
 * Gumroad ALLOWS creating products via API (unlike Lemon Squeezy Products API).
 * Trade-off: 10%+$0.50 fees, different checkout UX, re-wire AP_MON URLs.
 *
 *   GUMROAD_ACCESS_TOKEN=... node tools/gumroad-provision.mjs --dry-run
 *   GUMROAD_ACCESS_TOKEN=... node tools/gumroad-provision.mjs --apply
 *
 * Token: https://app.gumroad.com/settings/advanced → Generate access token
 *
 * After --apply, paste short_url values into tools/commerce-urls.json checkout{}
 * or extend this script to write gumroad-urls.json + wire-ap-mon patch.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadSecrets } from './load-secrets.mjs';

loadSecrets();

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, 'gumroad-urls.json');
const TOKEN = process.env.GUMROAD_ACCESS_TOKEN || '';
const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry-run') || !APPLY;

/** Mirror setup-commerce.mjs LS_PRODUCTS — prices in pence → Gumroad cents (GBP) */
const PRODUCTS = [
  { id: 'deep-reading', name: 'AstroPrecise Deep Natal Reading — Personal PDF', pricePence: 1200 },
  { id: 'natal-poster-pdf', name: 'AstroPrecise Natal Chart Poster — Print-at-Home PDF', pricePence: 600 },
  { id: 'reading-poster-bundle', name: 'AstroPrecise Deep Reading + Poster Bundle', pricePence: 1600 },
  { id: 'two-skies-map', name: 'AstroPrecise Two Skies — Couples Star Map', pricePence: 2400 },
  { id: 'gift-reading', name: 'AstroPrecise Gift a Deep Reading', pricePence: 1500 },
  { id: 'year-ahead', name: 'AstroPrecise Year Ahead Transit Report', pricePence: 1600 },
  { id: 'solar-return', name: 'AstroPrecise Solar Return PDF', pricePence: 1400 },
  { id: 'natal-poster', name: 'AstroPrecise Natal Sky — Art Poster (print)', pricePence: 2000 },
  { id: 'big-three-print', name: 'AstroPrecise Big Three Mini Print', pricePence: 1000 },
  { id: 'sky-tee', name: 'AstroPrecise Your Sky Tee', pricePence: 1800 },
  { id: 'sky-hoodie', name: 'AstroPrecise Your Sky Hoodie', pricePence: 3200 },
  { id: 'constellation-mug', name: 'AstroPrecise Star Map Mug', pricePence: 900 },
  { id: 'gift-box-whole-sky', name: 'AstroPrecise Whole Sky Gift Box', pricePence: 3500 },
];

async function gumroad(path, form = {}) {
  const body = new URLSearchParams({ access_token: TOKEN, ...form });
  const res = await fetch(`https://api.gumroad.com/v2${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json));
  return json;
}

async function main() {
  if (!TOKEN) {
    console.error('Set GUMROAD_ACCESS_TOKEN in secrets/.env.local');
    console.error('Get token: https://app.gumroad.com/settings/advanced');
    process.exit(1);
  }

  const catalog = existsSync(join(__dir, 'typeform-catalog.json'))
    ? JSON.parse(readFileSync(join(__dir, 'typeform-catalog.json'), 'utf8'))
    : { forms: [] };

  const results = { created_at: new Date().toISOString(), products: {} };

  for (const p of PRODUCTS) {
    const tf = catalog.forms?.find((f) => f.product_id === p.id);
    const redirect = tf?.lemon_squeezy_button?.replace('lemon_squeezy', 'gumroad') || tf?.url || '';
    process.stdout.write(`${p.id}… `);

    if (DRY) {
      console.log(`DRY £${(p.pricePence / 100).toFixed(2)}`);
      results.products[p.id] = { dry: true, name: p.name, typeform: redirect };
      continue;
    }

    try {
      const created = await gumroad('/products', {
        name: p.name,
        price: String(p.pricePence),
        currency: 'gbp',
        description: 'Personalised astrology PDF from astroprecise.app. Entertainment only.',
        custom_permalink: `astroprecise-${p.id}`,
        // Gumroad custom fields / redirect after purchase configured in dashboard or follow-up email
      });
      const prod = created.product;
      results.products[p.id] = {
        gumroad_id: prod.id,
        short_url: prod.short_url,
        permalink: prod.custom_permalink,
        typeform_redirect: redirect,
      };
      console.log(prod.short_url);
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.log('FAIL', e.message);
      results.products[p.id] = { error: String(e.message) };
    }
  }

  writeFileSync(OUT, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${OUT}`);
  if (!DRY) {
    console.log('Manual: set each product "Redirect after purchase" to Typeform URL from typeform-catalog.json');
    console.log('Then map short_url → tools/commerce-urls.json and run node tools/wire-ap-mon.mjs');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });