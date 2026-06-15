#!/usr/bin/env node
/**
 * AstroPrecise — commerce + Typeform suite setup.
 *
 *   node tools/setup-commerce.mjs --typeform-only     # create all Typeform forms
 *   node tools/setup-commerce.mjs --dry-run
 *   LEMONSQUEEZY_API_KEY=... node tools/setup-commerce.mjs --apply
 *
 * Env: TYPEFORM_TOKEN, LEMONSQUEEZY_API_KEY (optional), LEMONSQUEEZY_STORE_ID (optional)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  FORM_CATALOG,
  lsButtonLink,
  stripMeta,
} from './typeform-form-builder.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const RESULT_PATH = join(__dir, 'commerce-setup-result.json');
const CATALOG_PATH = join(__dir, 'typeform-catalog.json');

const args = new Set(process.argv.slice(2));
const LS_ONLY = args.has('--ls-only');
const DRY = args.has('--dry-run') || (!process.env.TYPEFORM_TOKEN && !args.has('--force') && !LS_ONLY);
const TYPEFORM_ONLY = args.has('--typeform-only') || (!process.env.LEMONSQUEEZY_API_KEY && !LS_ONLY);
const APPLY = args.has('--apply');

const TYPEFORM_TOKEN = process.env.TYPEFORM_TOKEN || '';
const LS_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const LS_STORE = process.env.LEMONSQUEEZY_STORE_ID || '';

const LS_PRODUCTS = [
  { id: 'deep-reading', apKey: 'deepReadingUrl', name: 'AstroPrecise Deep Natal Reading — Personal PDF', pricePence: 1200, description: 'Written reading of your exact birth chart. PDF within 24 hours. Entertainment only.' },
  { id: 'natal-poster-pdf', apKey: 'posterUrl', name: 'AstroPrecise Natal Chart Poster — Print-at-Home PDF', pricePence: 600, description: 'Print-ready A3 natal chart PDF within 24 hours.' },
  { id: 'reading-poster-bundle', apKey: 'fulfilUrl', name: 'AstroPrecise Deep Reading + Poster Bundle', pricePence: 1600, description: 'Deep Reading + poster PDF from one chart. Both within 24 hours.' },
  { id: 'two-skies-map', apKey: 'fulfilUrl', name: 'AstroPrecise Two Skies — Couples Star Map', pricePence: 2400, description: 'Couples synastry reading + two-chart print PDF. 48 hours.' },
  { id: 'gift-reading', apKey: 'giftUrl', name: 'AstroPrecise Gift a Deep Reading', pricePence: 1500, description: 'Gift voucher — recipient submits birth details privately.' },
  { id: 'year-ahead', apKey: 'fulfilUrl', name: 'AstroPrecise Year Ahead Transit Report', pricePence: 1600, description: '12-month slow-planet transits to your natal chart. PDF within 24 hours.' },
  { id: 'solar-return', apKey: 'fulfilUrl', name: 'AstroPrecise Solar Return PDF', pricePence: 1400, description: 'Solar return chart + year theme reading. PDF within 24 hours.' },
  { id: 'natal-poster', apKey: 'fulfilUrl', name: 'AstroPrecise Natal Sky — Art Poster (print)', pricePence: 2000, description: 'Physical poster — ships in 5–10 days after birth details.' },
  { id: 'big-three-print', apKey: 'fulfilUrl', name: 'AstroPrecise Big Three Mini Print', pricePence: 1000, description: 'Sun, Moon, Rising mini print — ships in 5–10 days.' },
  { id: 'sky-tee', apKey: 'fulfilUrl', name: 'AstroPrecise Your Sky Tee', pricePence: 1800, description: 'Personalised chart tee — ships in 5–10 days.' },
  { id: 'sky-hoodie', apKey: 'fulfilUrl', name: 'AstroPrecise Your Sky Hoodie', pricePence: 3200, description: 'Personalised chart hoodie — ships in 5–10 days.' },
  { id: 'constellation-mug', apKey: 'fulfilUrl', name: 'AstroPrecise Star Map Mug', pricePence: 900, description: 'Personalised star map mug — ships in 5–10 days.' },
  { id: 'gift-box-whole-sky', apKey: 'fulfilUrl', name: 'AstroPrecise Whole Sky Gift Box', pricePence: 3500, description: 'Gift voucher + physical print box. Recipient redeems reading separately.' },
];

async function tfFetch(path, opts = {}) {
  const res = await fetch(`https://api.typeform.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TYPEFORM_TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) throw new Error(`Typeform ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function lsFetch(path, opts = {}) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${LS_KEY}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) throw new Error(`Lemon Squeezy ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function createAllTypeforms() {
  const catalog = {
    version: 2,
    created_at: new Date().toISOString(),
    standards: {
      per_product_forms: true,
      hidden_fields: ['email', 'buyer_name', 'order_id', 'product_sku'],
      legacy_form_superseded: 'KjdyR6Id',
      improvements_vs_v1: [
        'Removed product dropdown — one form per SKU',
        'Removed duplicate email/order fields — LS hidden params',
        'Birth-time guidance statement',
        'Privacy statement before legal',
        'Product-specific thank-you SLA',
        'Couples / gift / POD templates for future SKUs',
      ],
    },
    forms: [],
  };

  for (const spec of FORM_CATALOG) {
    const def = spec.build();
    const meta = def._meta;
    const payload = stripMeta(def);
    const entry = {
      product_id: spec.product_id,
      status: spec.status,
      generator: spec.generator,
      template: spec.template,
      title: payload.title,
      form_id: null,
      url: null,
      lemon_squeezy_button: null,
      error: null,
    };

    try {
      if (DRY) {
        entry.form_id = `DRY_${spec.product_id}`;
        entry.url = `https://form.typeform.com/to/DRY_${spec.product_id}`;
      } else {
        const created = await tfFetch('/forms', { method: 'POST', body: JSON.stringify(payload) });
        entry.form_id = created.id;
        entry.url = created._links?.display || `https://form.typeform.com/to/${created.id}`;
        console.log(`✓ ${spec.product_id} → ${created.id} [${spec.status}]`);
        await new Promise((r) => setTimeout(r, 400));
      }
      entry.lemon_squeezy_button = lsButtonLink(entry.form_id, meta.product_sku);
    } catch (e) {
      entry.error = String(e.message || e);
      console.error(`✗ ${spec.product_id}:`, entry.error);
    }
    catalog.forms.push(entry);
  }

  writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log('\nWrote', CATALOG_PATH);
  return catalog;
}

async function getStoreId() {
  if (LS_STORE) return String(LS_STORE);
  const stores = await lsFetch('/stores');
  const first = stores?.data?.[0];
  if (!first?.id) throw new Error('No Lemon Squeezy store found');
  return String(first.id);
}

async function createLsProduct(storeId, product) {
  const created = await lsFetch('/products', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'products',
        attributes: {
          name: product.name,
          description: product.description,
          status: 'published',
          price: product.pricePence,
        },
        relationships: { store: { data: { type: 'stores', id: storeId } } },
      },
    }),
  });
  const productId = created.data.id;
  const variants = await lsFetch(`/products/${productId}/variants`);
  const variantId = variants?.data?.[0]?.id;
  if (!variantId) throw new Error(`No variant for ${productId}`);
  return { productId, variantId, checkoutUrl: `https://store.lemonsqueezy.com/checkout/buy/${variantId}` };
}

async function createLsProducts() {
  if (TYPEFORM_ONLY || !LS_KEY || DRY) return {};
  const storeId = await getStoreId();
  const out = {};
  for (const p of LS_PRODUCTS) {
    try {
      out[p.id] = await createLsProduct(storeId, p);
      out[p.id].apKey = p.apKey;
      console.log(`✓ LS ${p.id} → ${out[p.id].checkoutUrl}`);
    } catch (e) {
      if (String(e.message).includes('405')) {
        console.error('\nLemon Squeezy API cannot CREATE products (dashboard only).');
        console.error('Create products at https://astroprecise.lemonsqueezy.com then run:');
        console.error('  LEMONSQUEEZY_API_KEY=... node tools/sync-lemonsqueezy.mjs --apply\n');
        break;
      }
      throw e;
    }
  }
  return out;
}

function bumpSw(content) {
  const m = content.match(/const V = '(ap-v\d+)'/);
  if (!m) return content;
  const n = parseInt(m[1].replace('ap-v', ''), 10) + 1;
  return content.replace(m[0], `const V = 'ap-v${n}'`);
}

function writeCommerceUrls(ls) {
  const path = join(__dir, 'commerce-urls.json');
  const base = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { checkout: {} };
  for (const [id, v] of Object.entries(ls)) {
    if (v?.checkoutUrl) base.checkout[id] = v.checkoutUrl;
  }
  base.updated_at = new Date().toISOString();
  writeFileSync(path, JSON.stringify(base, null, 2));
  console.log('Wrote', path);
}

function applyToAppJs(_catalog, ls) {
  writeCommerceUrls(ls);
  const res = spawnSync(process.execPath, [join(__dir, 'wire-ap-mon.mjs'), '--from-ls-result', RESULT_PATH], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (res.status !== 0) process.exit(res.status || 1);
}

async function main() {
  console.log('AstroPrecise — commerce setup' + (LS_ONLY ? ' (LS only)' : ''));
  if (DRY && !LS_ONLY) console.log('\n*** DRY RUN — set TYPEFORM_TOKEN ***\n');

  let catalog;
  if (LS_ONLY) {
    if (!existsSync(CATALOG_PATH)) throw new Error('Missing typeform-catalog.json — run Typeform setup first');
    catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
    console.log('Using existing Typeform catalog (' + catalog.forms.length + ' forms)');
  } else {
    catalog = await createAllTypeforms();
  }
  let ls = {};
  try {
    ls = await createLsProducts();
  } catch (e) {
    console.error('Lemon Squeezy:', e.message || e);
  }

  const result = {
    created_at: new Date().toISOString(),
    dry_run: DRY,
    typeform_catalog: CATALOG_PATH,
    forms_created: catalog.forms.filter((f) => f.form_id && !f.error).length,
    forms_failed: catalog.forms.filter((f) => f.error).length,
    live_forms: catalog.forms.filter((f) => f.status === 'live'),
    lemonsqueezy: ls,
    manual_steps: [
      'Per LS product: Confirmation modal + Receipt button = lemon_squeezy_button from typeform-catalog.json',
      'Upload tools/NEXT-STEP.pdf to each LS digital product',
      'POD orders: fulfil via Gelato (posters) / Printful (tees/mugs) using generate-pod-pack.mjs output',
      'Patch year-ahead + solar-return Typeform titles in Typeform UI (or TYPEFORM_TOKEN + patch-typeform-waitlist.mjs)',
      'ICO registration before collecting birth data',
    ],
  };

  writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2));
  console.log('Wrote', RESULT_PATH);

  if (APPLY && !DRY && Object.keys(ls).length) applyToAppJs(catalog, ls);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});