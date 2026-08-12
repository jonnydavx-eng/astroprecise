/*
 * Astro Precise — Gumroad checkout + unlock  (reference drop-in from the link session)
 * -----------------------------------------------------------------------------------
 * v841 — product_id verification, single eclipse edition.
 * Payment home = GUMROAD (it allows astrology AND is the seller-of-record that
 * handles UK/EU VAT for you). This wires the paid reading to the site WITHOUT the
 * reading itself ever leaving the buyer's device.
 *
 * THE HONEST FLOW (birth data never touches Gumroad):
 *   1. The reading is computed ON THE DEVICE from the VSOP87 engine (as today).
 *   2. To reveal it, the buyer taps "Unlock — £7". We open the Gumroad overlay
 *      for that product. Gumroad takes the money + the email; we never see a card.
 *   3. Gumroad issues a LICENSE KEY. We verify that key against Gumroad's API and,
 *      if valid, unlock the already-computed reading in place. No account, no wait.
 *
 * PRODUCTS (create these in Gumroad, enable "Generate license keys"):
 *   eclipse-edition  £7
 *
 * SECURITY NOTE: verifying a license needs only product_id + license_key (no secret),
 * so it CAN run in the browser — but a spoofed "valid" response could unlock content
 * for free. For anything you care about, run verifyLicense() behind a tiny serverless
 * function (Cloudflare Worker / Netlify fn) that holds nothing secret but is harder to
 * fake, and have it flip "increment_uses_count" true so each key is one-use. The code
 * below works in either place.
 */

// Map the one on-site product to both public and verification identifiers.
// permalink builds the public checkout URL. productId is sent only to the
// License API. Checkout is live only when BOTH values are real and verified.
export const GUMROAD_PRODUCTS = {
  'eclipse-edition': {
    permalink: 'your-eclipse-reading',
    // License API product_id from the public Gumroad product page (data-page.product.id).
    productId: '3ZwFjg0IW702KvJ5s97QuQ==',
    price: '£7',
  },
};

/** Resolve slug aliases. */
export function resolveProductSlug(slug) {
  return slug;
}
function configured(value) {
  return Boolean(value && value !== 'REPLACE_ME' && !String(value).includes('REPLACE'));
}
/** True only when the public checkout and License API identifiers are present. */
export function isCheckoutReady(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  return Boolean(p && configured(p.permalink) && configured(p.productId));
}

/**
 * Open the Gumroad overlay checkout for a product. Requires Gumroad's overlay script
 * on the page once:  <script src="https://gumroad.com/js/gumroad.js"></script>
 * Returns immediately. The buyer manually enters the issued licence key in the
 * on-page form; licence keys are never accepted from a URL or stored in a query string.
 */
export function openCheckout(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  if (!isCheckoutReady(slug)) throw new Error(`Set the Gumroad permalink and product_id for "${slug}"`);
  // Gumroad overlay opens when navigating to the ?wanted=true product URL.
  const url = `https://gumroad.com/l/${encodeURIComponent(p.permalink)}?wanted=true`;
  window.location.href = url; // or use an <a class="gumroad-button" href=...> for the inline overlay
}

/**
 * Verify a Gumroad license key using product_id.
 * Rejects refunded, chargebacked and disputed purchases.
 * @returns {Promise<{valid:boolean, purchase?:object, uses?:number}>}
 * Docs: POST https://api.gumroad.com/v2/licenses/verify
 */
export async function verifyLicense(slug, licenseKey, { incrementUses = false } = {}) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  if (!p) throw new Error(`Unknown product "${slug}"`);
  if (!isCheckoutReady(slug)) return { valid: false };
  if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.length < 8) {
    return { valid: false };
  }
  const body = new URLSearchParams({
    product_id: p.productId,
    license_key: licenseKey,
    increment_uses_count: String(incrementUses),
  });
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', { method: 'POST', body });
  if (!res.ok) return { valid: false };
  const data = await res.json();
  // Reject refunded, chargebacked or disputed purchases
  const purchase = data.purchase || {};
  const bad = purchase.refunded || purchase.chargebacked || purchase.disputed;
  const valid = Boolean(data.success) && !bad;
  return { valid, purchase, uses: data.uses };
}
