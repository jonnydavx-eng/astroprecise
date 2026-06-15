#!/usr/bin/env node
/**
 * Patch live Typeform year-ahead + solar-return forms (remove WAITLIST copy).
 * Requires TYPEFORM_TOKEN. Does not create new forms — updates QMcr0Ldw + vp60QAiN.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.TYPEFORM_TOKEN || '';
const CATALOG = JSON.parse(readFileSync(join(__dir, 'typeform-catalog.json'), 'utf8'));

const PATCHES = {
  'year-ahead': {
    title: 'AstroPrecise — Year Ahead Fulfilment',
    thankYou: 'Your Year Ahead transit report will be emailed within 24 hours.',
    productLabel: 'Year Ahead Transit Report PDF',
  },
  'solar-return': {
    title: 'AstroPrecise — Solar Return Fulfilment',
    thankYou: 'Your Solar Return PDF will be emailed within 24 hours.',
    productLabel: 'Solar Return PDF',
  },
};

async function tfFetch(path, opts = {}) {
  const res = await fetch(`https://api.typeform.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(`Typeform ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function patchForm(formId, spec) {
  const form = await tfFetch(`/forms/${formId}`);
  const welcome = form.welcome_screens?.[0];
  const thanks = form.thankyou_screens?.[0];
  if (welcome?.properties) {
    welcome.title = 'AstroPrecise';
    welcome.properties.description =
      `Thank you, {{hidden:buyer_name}} — order {{hidden:order_id}}.\n\n` +
      `You're completing details for **${spec.productLabel}**. ` +
      `Your birth data is used only to generate your order and is deleted after delivery. ` +
      `We never store birth data on astroprecise.app. Entertainment only — not medical, financial, or legal advice.`;
  }
  if (thanks?.properties) {
    thanks.properties.description =
      `${spec.thankYou}\n\nIf anything looks wrong, reply to your Lemon Squeezy receipt.`;
  }
  await tfFetch(`/forms/${formId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: spec.title,
      hidden: form.hidden || ['email', 'buyer_name', 'order_id', 'product_sku'],
      welcome_screens: form.welcome_screens,
      thankyou_screens: form.thankyou_screens,
    }),
  });
  console.log(`✓ Patched ${formId} → ${spec.title}`);
}

async function main() {
  if (!TOKEN) {
    console.error('Set TYPEFORM_TOKEN');
    process.exit(1);
  }
  for (const [pid, spec] of Object.entries(PATCHES)) {
    const row = CATALOG.forms.find((f) => f.product_id === pid);
    if (!row?.form_id) { console.error(`No form_id for ${pid}`); continue; }
    await patchForm(row.form_id, spec);
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });