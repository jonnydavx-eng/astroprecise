/**
 * Seller identity placeholders (PR2). Checkout is closed by Jonny's decision
 * of 20 October 2026. While it stays closed, every company field in
 * website/data/seller-details.json must be empty and the seller block on
 * contact.html, terms.html and digital-product-terms.html must carry the
 * honest "not yet published" note. No public page may show a bracket
 * placeholder such as [TRADER NAME], an invented UK company number or a VAT
 * number. If the fields are ever filled (only on Jonny's yes, see
 * docs/SELLER-DETAILS.md) the same blocks must show them and drop the note.
 * Runs offline and only reads files.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('  ok', name); };

const NOTE = 'Seller details will be published here before anything is offered for sale. Nothing is on sale at the moment.';
const COMPANY_FIELDS = ['legalName', 'companyNumber', 'registeredOffice', 'geographicAddress', 'vatNumber'];
const SELLER_PAGES = ['contact.html', 'terms.html', 'digital-product-terms.html'];
const BLOCK_START = '<!-- seller-details:start';
const BLOCK_RE = /<!-- seller-details:start[^>]*-->([\s\S]*?)<!-- seller-details:end -->/;
const PLACEHOLDER_RE = /\[(?:TRADER|TRADING|GEOGRAPHIC|COMPANY|REGISTERED|SELLER|LEGAL|VAT|BUSINESS|ADDRESS|OWNER)\b[^\]]*\]/;
const COMPANY_NUMBER_RE = /(?:company|registration|registered|incorporat)[^0-9]{0,80}\b\d{8}\b/i;
const VAT_RE = /\bGB ?\d{9}\b/;
const CHECKOUT_LINK_RE = /gumroad\.com\/(?:l\/|checkout)|checkout\.gumroad\.com|lemonsqueezy\.com\/checkout|buy\.stripe\.com|paypal\.com\/(?:checkoutnow|cgi-bin\/webscr)/i;

const seller = JSON.parse(read('website/data/seller-details.json'));
const catalogue = JSON.parse(read('website/data/products-v901.json'));
const isSet = (v) => typeof v === 'string' && v.trim() !== '';
const filled = COMPANY_FIELDS.filter((f) => isSet(seller[f]));

function walkHtml(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'tools') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkHtml(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}
const pages = walkHtml(join(root, 'website')).map((p) => ({ rel: relative(root, p).replace(/\\/g, '/'), html: readFileSync(p, 'utf8') }));

function sellerBlock(page) {
  const html = read(`website/${page}`);
  assert.equal(html.split(BLOCK_START).length, 2, `${page} must carry exactly one seller-details block`);
  const m = html.match(BLOCK_RE);
  assert.ok(m, `${page} seller-details block needs matching start and end markers`);
  return m[1];
}

ok('config carries every field, the fixed trading name and the published contact email', () => {
  for (const f of ['tradingAs', 'contactEmail', 'unsetNote', ...COMPANY_FIELDS]) assert.ok(f in seller, `missing field ${f}`);
  assert.equal(seller.tradingAs, 'AstroPrecise');
  assert.equal(seller.contactEmail, 'contact@astroprecise.app');
  assert.ok(read('website/contact.html').includes(`mailto:${seller.contactEmail}`), 'contact email must already be published on contact.html');
  assert.equal(seller.unsetNote, NOTE, 'the not-yet-published wording is pinned here; change both together');
  for (const f of COMPANY_FIELDS) assert.ok(seller[f] === null || typeof seller[f] === 'string', `${f} must be null or a string`);
});

const checkoutClosed =
  catalogue.state === 'draft-not-published' &&
  catalogue.platform.checkoutVerified === false &&
  catalogue.products.every((p) => p.checkoutUrl === null) &&
  pages.every(({ html }) => !CHECKOUT_LINK_RE.test(html));

ok('checkout is closed: catalogue unpublished and no page links a checkout', () => {
  assert.ok(checkoutClosed, 'checkout must stay closed (Jonny, 20 Oct 2026)');
});

ok('while checkout is closed every company field is empty', () => {
  if (!checkoutClosed) return;
  assert.deepEqual(filled, [], `company fields are filled only after Jonny confirms the Companies House record: ${filled.join(', ')}`);
});

ok('company fields are all-or-nothing and well-formed if ever set', () => {
  if (filled.length === 0) return;
  for (const f of ['legalName', 'companyNumber', 'registeredOffice']) assert.ok(isSet(seller[f]), `${f} must be set together with the others`);
  assert.match(seller.companyNumber, /^(?:\d{8}|[A-Z]{2}\d{6})$/, 'Companies House number is 8 digits or 2 letters plus 6 digits');
  if (isSet(seller.vatNumber)) assert.match(seller.vatNumber, /^GB\d{9}$/, 'UK VAT number is GB plus 9 digits');
});

ok('contact, terms and the Studio terms draft show a seller block that matches the config', () => {
  for (const page of SELLER_PAGES) {
    const block = sellerBlock(page);
    if (filled.length === 0) {
      assert.ok(block.includes(NOTE), `${page}: unset seller details must show the not-yet-published note`);
      assert.doesNotMatch(block, /\d{6,}/, `${page}: no number may sit in the seller block while details are unset`);
    } else {
      assert.ok(!block.includes(NOTE), `${page}: filled seller details must drop the not-yet-published note`);
      for (const f of ['legalName', 'companyNumber', 'registeredOffice']) assert.ok(block.includes(seller[f]), `${page}: seller block must show ${f}`);
    }
  }
});

ok('no public page shows a bracket placeholder', () => {
  for (const { rel, html } of pages) assert.doesNotMatch(html, PLACEHOLDER_RE, `${rel} shows a bracket placeholder`);
});

ok('no public page shows an invented company number or VAT number', () => {
  for (const { rel, html } of pages) {
    let text = html;
    if (isSet(seller.companyNumber)) text = text.split(seller.companyNumber).join('');
    if (isSet(seller.vatNumber)) text = text.split(seller.vatNumber).join('');
    assert.doesNotMatch(text, COMPANY_NUMBER_RE, `${rel} shows an 8-digit number next to company wording`);
    assert.doesNotMatch(text, VAT_RE, `${rel} shows a VAT-shaped number`);
  }
});

console.log(`seller-details: ${pass} checks passed (${pages.length} pages scanned, checkout ${checkoutClosed ? 'closed' : 'OPEN'})`);
