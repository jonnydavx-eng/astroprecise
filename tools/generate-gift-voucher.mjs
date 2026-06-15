/**
 * Gift voucher generator — HTML voucher emailed to buyer/recipient.
 *
 *   node tools/generate-gift-voucher.mjs --in gift-order.json [--final]
 */
import { readFileSync, writeFileSync } from 'fs';
import { readFileSync as readCat } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  parseArgs, defaultOutDir, ensureOut, esc, slug, voucherCode, PRINT_CSS, htmlDoc,
} from './fulfil-shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readCat(join(__dir, 'typeform-catalog.json'), 'utf8'));

const A = parseArgs(process.argv.slice(2));
let order = {};
if (A.in) order = JSON.parse(readFileSync(A.in, 'utf8'));
const FINAL = !!A.final;
const WATERMARK = FINAL ? '' : 'DRAFT';
const OUT = ensureOut(A.out || defaultOutDir());

const product = order.product || 'gift-reading';
const redeemForm = catalog.forms.find((f) => f.product_id === 'gift-reading-redeem');
const redeemBase = redeemForm?.url || 'https://form.typeform.com/to/h1jYdbGy';
const code = order.voucher_code || voucherCode(order.orderId);
const redeemUrl = `${redeemBase}#email=${encodeURIComponent(order.recipient_email || '')}&buyer_name=${encodeURIComponent(order.recipient_name || '')}&order_id=${encodeURIComponent(order.orderId || '')}&product_sku=${product}&voucher_code=${code}`;

const productLabel = product === 'gift-box-whole-sky'
  ? 'The Whole Sky — Gift Box'
  : 'Deep Natal Reading';

const body = `
<div class="page" style="text-align:center;">{{WM}}
  <p class="eyebrow">AstroPrecise Gift</p>
  <h1 style="font-size:32pt;margin-top:8mm;">${esc(productLabel)}</h1>
  <p class="meta">For ${esc(order.recipient_name || 'your recipient')}</p>
  <p style="font-size:18pt;margin:12mm 0;color:#E8C872;font-family:'Cinzel',serif;letter-spacing:.2em;">${esc(code)}</p>
  <p class="lede" style="text-align:left;">${esc(order.gift_message || 'Someone wanted you to see your sky as it truly was — measured, not guessed. This voucher unlocks a full Deep Reading PDF: thirteen pages — every planet, all houses, life areas, patterns, and aspects — computed from their exact birth chart.')}</p>
  <p style="text-align:left;">From: <strong>${esc(order.buyer_name || 'A friend')}</strong></p>
  <h3 style="text-align:left;margin-top:14pt;">How to redeem</h3>
  <p style="text-align:left;">1. Open the link below on any device.<br>2. Enter your birth name, date, time, and place (private — never shown to the giver).<br>3. Receive your PDF by email within 24 hours.</p>
  <p style="text-align:left;margin-top:10pt;">Redeem at:<br><span style="font-size:10pt;word-break:break-all;color:#A89E88;">${esc(redeemUrl)}</span></p>
  <p style="text-align:left;margin-top:14pt;font-size:10pt;color:#A89E88;">Voucher valid 12 months · VSOP87 ephemeris · Entertainment only · astroprecise.app</p>
  ${order.delivery_date ? `<p style="text-align:left;">Preferred send date: ${esc(order.delivery_date)}</p>` : ''}
  <div class="foot"><span>AstroPrecise · Gift Voucher</span><span>${esc(code)}</span><span>1</span></div>
</div>`;

const s = slug(order.recipient_name || order.orderId || 'gift');
const path = `${OUT}/voucher-${s}.html`;
writeFileSync(path, htmlDoc(`Gift Voucher — ${productLabel}`, PRINT_CSS, body, WATERMARK), 'utf8');
console.log(`Voucher ${code} → ${order.recipient_email || '(no email)'}`);
console.log(`watermark: ${WATERMARK || '(none — FINAL)'}`);
console.log('written:', path);