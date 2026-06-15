#!/usr/bin/env node
/** Quick LS store status — products, variants, next step for go-live. */
import { loadSecrets } from './load-secrets.mjs';

loadSecrets();

const KEY = process.env.LEMONSQUEEZY_API_KEY || '';
const STORE = process.env.LEMONSQUEEZY_STORE_ID || '407645';

async function ls(path) {
  const res = await fetch(`https://api.lemonsqueezy.com/v1${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/vnd.api+json' },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`LS ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  if (!KEY) {
    console.error('Missing LEMONSQUEEZY_API_KEY — add to secrets/.env.local');
    process.exit(1);
  }
  const store = await ls(`/stores/${STORE}`);
  console.log(`Store: ${store.data.attributes.name} (${STORE})`);
  console.log(`URL:   ${store.data.attributes.url}`);

  const products = await ls(`/products?filter[store_id]=${STORE}&page[size]=50`);
  const rows = products.data || [];
  console.log(`Products: ${rows.length}`);

  let masterVariant = null;
  for (const p of rows) {
    const vars = await ls(`/products/${p.id}/variants`);
    const v = vars.data?.[0];
    console.log(`  • ${p.attributes.name} → variant ${v?.id || '?'} (£${((v?.attributes?.price || 0) / 100).toFixed(2)})`);
    if (!masterVariant && v?.id) masterVariant = String(v.id);
  }

  if (!masterVariant) {
    console.log(`
BLOCKED — no LS product yet (API cannot create products).

Do this once in the dashboard (~2 min):
  1. https://app.lemonsqueezy.com/products → New product
  2. Name: AstroPrecise Digital · Price: £12 · Publish
  3. Copy variant ID (product ⋮ menu)
  4. Run: node tools/link-typeform-lemonsqueezy.mjs --apply
     (or set LEMONSQUEEZY_VARIANT_ID=<id> in secrets/.env.local first)

Copy/paste text: tools/lemonsqueezy-product-copy.txt
Typeform buttons:  tools/typeform-catalog.json
`);
    process.exit(2);
  }

  console.log(`\nReady — master variant ${masterVariant}`);
  console.log('Run: node tools/link-typeform-lemonsqueezy.mjs --apply');
}

main().catch((e) => { console.error(e.message); process.exit(1); });