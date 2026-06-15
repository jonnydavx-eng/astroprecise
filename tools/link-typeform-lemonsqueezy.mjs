#!/usr/bin/env node
/**
 * Link Lemon Squeezy ↔ Typeform via API (pay first → birth details).
 *
 * LS cannot CREATE products (405). Create ONE placeholder product in the dashboard,
 * copy its Variant ID, then:
 *
 *   LEMONSQUEEZY_API_KEY=... LEMONSQUEEZY_VARIANT_ID=123456 node tools/link-typeform-lemonsqueezy.mjs --apply
 *
 * This uses the Checkouts API: one variant + custom_price per SKU, redirect_url → Typeform
 * with [email] [name] [order_id] filled by Lemon Squeezy after payment.
 *
 * Optional (separate token): TYPEFORM_TOKEN=... verifies forms exist.
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
const LS_CATALOG = join(__dir, 'ls-product-catalog.json');
const URLS = join(__dir, 'commerce-urls.json');
const RESULT = join(__dir, 'commerce-setup-result.json');
const IMAGE_BASE = 'https://astroprecise.app/img/shop';
const STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || '407645';
const VARIANT_ID = process.env.LEMONSQUEEZY_VARIANT_ID || '';
const LS_KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const TF_KEY = process.env.TYPEFORM_TOKEN || '';
const APPLY = process.argv.includes('--apply');

const lsProducts = existsSync(LS_CATALOG)
  ? JSON.parse(readFileSync(LS_CATALOG, 'utf8')).products
  : {};

const PRICES = Object.fromEntries(
  Object.entries(lsProducts).map(([id, p]) => [id, Math.round((p.price_gbp || 12) * 100)])
);

const FALLBACK_PRICES = {
  'deep-reading': 1200, 'natal-poster-pdf': 600, 'reading-poster-bundle': 1600,
  'two-skies-map': 2400, 'gift-reading': 1500, 'gift-box-whole-sky': 3500,
  'natal-poster': 2000, 'big-three-print': 1000, 'sky-tee': 1800,
  'sky-hoodie': 3200, 'constellation-mug': 900, 'year-ahead': 1600, 'solar-return': 1400,
};

function productMeta(sku) {
  const p = lsProducts[sku] || {};
  const disclaimer = ' Entertainment purposes only.';
  return {
    name: p.name || sku,
    description: p.short_description
      ? (p.short_description.endsWith('.') ? p.short_description : p.short_description + '.') + disclaimer
      : 'After payment you will submit birth details on our secure Typeform. Delivered within 24–48 hours.' + disclaimer,
    media: p.image ? [`${IMAGE_BASE}/${p.image}`] : [],
    receipt_button: p.receipt_button || 'Submit birth details',
    receipt_thank_you: p.receipt_thank_you || 'Thank you! Complete the short birth-details form so we can generate your order.',
  };
}

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
  if (!res.ok) throw new Error(`LS ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function tf(path) {
  const res = await fetch(`https://api.typeform.com${path}`, {
    headers: { Authorization: `Bearer ${TF_KEY}` },
  });
  if (!res.ok) throw new Error(`Typeform ${res.status}`);
  return res.json();
}

function typeformRedirect(formId, sku) {
  return (
    `https://astroprecise.app/fulfil-redirect.html?form=${formId}` +
    `&email=[email]&buyer_name=[name]&order_id=[order_id]&product_sku=${sku}`
  );
}

async function createLinkedCheckout(variantId, form, sku) {
  const redirect = form.lemon_squeezy_button || typeformRedirect(form.form_id, sku);
  const meta = productMeta(sku);
  const productOptions = {
    name: meta.name,
    description: meta.description,
    redirect_url: redirect,
    receipt_button_text: meta.receipt_button,
    receipt_link_url: redirect,
    receipt_thank_you_note: meta.receipt_thank_you,
  };
  if (meta.media.length) productOptions.media = meta.media;
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: PRICES[sku] || FALLBACK_PRICES[sku] || 1200,
        product_options: productOptions,
        checkout_data: {
          custom: { product_sku: sku },
        },
        test_mode: process.argv.includes('--test'),
      },
      relationships: {
        store: { data: { type: 'stores', id: String(STORE_ID) } },
        variant: { data: { type: 'variants', id: String(variantId) } },
      },
    },
  };
  const created = await ls('/checkouts', { method: 'POST', body: JSON.stringify(body) });
  return created.data.attributes.url;
}

async function resolveVariantId() {
  if (VARIANT_ID) return String(VARIANT_ID);
  const u = existsSync(URLS) ? JSON.parse(readFileSync(URLS, 'utf8')) : {};
  if (u.master_variant_id) return String(u.master_variant_id);
  const products = await ls('/products?filter[store_id]=' + STORE_ID);
  for (const p of products.data || []) {
    const vars = await ls(`/products/${p.id}/variants`);
    const v = vars.data?.[0];
    if (v?.id) return String(v.id);
  }
  return null;
}

async function main() {
  if (!LS_KEY) {
    console.error('Set LEMONSQUEEZY_API_KEY');
    process.exit(1);
  }
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const variantId = await resolveVariantId();
  if (!variantId) {
    console.error(`
No Lemon Squeezy variant found.

LS API cannot create products. Do this ONCE in the dashboard:
  1. https://app.lemonsqueezy.com/products → New product
  2. Name: "AstroPrecise Digital" · Price: £12 · Publish
  3. Product menu → Copy variant ID
  4. Re-run:
     LEMONSQUEEZY_VARIANT_ID=<id> node tools/link-typeform-lemonsqueezy.mjs --apply

That one variant powers all SKUs via Checkouts API (custom_price + Typeform redirect per product).
`);
    process.exit(1);
  }
  console.log(`Store ${STORE_ID} · master variant ${variantId}`);

  if (TF_KEY) {
    console.log('Verifying Typeform forms…');
    for (const f of catalog.forms.slice(0, 3)) {
      try {
        await tf(`/forms/${f.form_id}`);
        console.log(`  ✓ ${f.product_id} (${f.form_id})`);
      } catch {
        console.log(`  ✗ ${f.product_id} (${f.form_id})`);
      }
    }
  } else {
    console.log('No TYPEFORM_TOKEN — skipping form verify (LS key is a different service)');
  }

  const checkouts = {};
  const lsResult = {};

  for (const f of catalog.forms) {
    if (f.product_id === 'gift-reading-redeem') continue;
    const sku = f.product_id;
    process.stdout.write(`Linking ${sku}… `);
    try {
      const url = await createLinkedCheckout(variantId, f, sku);
      checkouts[sku] = url;
      lsResult[sku] = { checkoutUrl: url, variantId, formId: f.form_id, typeformRedirect: f.lemon_squeezy_button };
      console.log('OK');
      await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      console.log('FAIL', e.message);
    }
  }

  const urls = existsSync(URLS) ? JSON.parse(readFileSync(URLS, 'utf8')) : { checkout: {} };
  urls.master_variant_id = variantId;
  urls.checkout = { ...urls.checkout, ...checkouts };
  urls.linked_at = new Date().toISOString();
  urls.link_mode = 'ls-checkouts-api-typeform-redirect';
  writeFileSync(URLS, JSON.stringify(urls, null, 2));

  writeFileSync(RESULT, JSON.stringify({
    created_at: new Date().toISOString(),
    link_mode: 'typeform-via-ls-checkouts-api',
    master_variant_id: variantId,
    checkouts_created: Object.keys(checkouts).length,
    lemonsqueezy: lsResult,
    manual_steps: [
      'Checkout URLs auto-redirect to Typeform after payment (API-linked)',
      'Site Buy Now buttons use these checkout URLs',
      'Fulfil via: node tools/fulfil-order.mjs --typeform response.json --final',
    ],
  }, null, 2));

  console.log(`\nLinked ${Object.keys(checkouts).length} checkout(s) → Typeform`);
  console.log('Wrote', URLS);

  if (APPLY && Object.keys(checkouts).length) {
    spawnSync(process.execPath, [join(__dir, 'wire-ap-mon.mjs'), '--from-ls-result', RESULT], {
      cwd: ROOT, stdio: 'inherit',
    });
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });