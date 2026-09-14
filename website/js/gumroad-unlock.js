/*
 * Astro Precise — Gumroad checkout + unlock  (reference drop-in from the link session)
 * -----------------------------------------------------------------------------------
 * v841 — product_id verification, single eclipse edition.
 * Payment home = GUMROAD (it allows astrology AND is the seller-of-record that
 * handles UK/EU VAT for you). This wires the paid reading to the site WITHOUT the
 * reading itself ever leaving the buyer's device.
 *
 * THE HONEST FLOW (birth data never touches Gumroad):
 *   1. The reading is computed ON THE DEVICE from the VSOP87 engine.
 *   2. The event-specific checkout is now retired; no new payment route is exposed.
 *   3. Past buyers can paste their LICENSE KEY. We verify that key
 *      against Gumroad's API and, if valid, unlock the already-computed reading.
 *      Licence keys are never accepted from a URL.
 *
 * ARCHIVED ENTITLEMENT:
 *   eclipse-edition — checkout disabled; existing licence verification retained.
 *
 * SECURITY NOTE: verifying a license needs only product_id + license_key (no secret),
 * so it CAN run in the browser — but a spoofed "valid" response could unlock content
 * for free. For anything you care about, run verifyLicense() behind a tiny serverless
 * function (Cloudflare Worker / Netlify fn) that holds nothing secret but is harder to
 * fake, and have it flip "increment_uses_count" true so each key is one-use. The code
 * below works in either place.
 */

// Keep the old identifiers solely so legitimate buyers can restore their edition.
// A future evergreen offer must receive a fresh slug, permalink and productId.
export const GUMROAD_PRODUCTS = {
  'eclipse-edition': {
    permalink: 'your-eclipse-reading',
    productId: '3ZwFjg0IW702KvJ5s97QuQ==',
    checkoutEnabled: false,
    archived: true,
  },
};

/** Resolve slug aliases. */
export function resolveProductSlug(slug) {
  return slug;
}
function configured(value) {
  return Boolean(value && value !== 'REPLACE_ME' && !String(value).includes('REPLACE'));
}
/** True when an archived or current entitlement can still be verified. */
export function isEntitlementReady(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  return Boolean(p && configured(p.productId));
}
/** True only when a deliberately enabled public checkout is fully configured. */
export function isCheckoutReady(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  return Boolean(p && p.checkoutEnabled === true && configured(p.permalink) && isEntitlementReady(slug));
}

/**
 * Open Gumroad checkout for a product by navigating to the product URL.
 * Overlay script is not loaded on eclipse.html; this is a full navigation.
 * The buyer pastes the issued licence key in the on-page form on return.
 * Licence keys are never accepted from a URL or stored in a query string.
 */
export function openCheckout(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  if (!isCheckoutReady(slug)) throw new Error(`Checkout is not enabled for "${slug}"`);
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
  if (!isEntitlementReady(slug)) return { valid: false };
  if (!licenseKey || typeof licenseKey !== 'string' || licenseKey.length < 8) {
    return { valid: false };
  }
  const body = new URLSearchParams({
    product_id: p.productId,
    license_key: licenseKey,
    increment_uses_count: String(incrementUses),
  });
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', { method: 'POST', body });
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (!res.ok) {
    return { valid: false, reason: data && data.message ? data.message : 'License verification failed.' };
  }
  if (!data) return { valid: false, reason: 'License verification failed.' };
  // Reject refunded, chargebacked or disputed purchases
  const purchase = data.purchase || {};
  if (purchase.refunded) return { valid: false, reason: 'Purchase was refunded.', purchase, uses: data.uses };
  if (purchase.chargebacked) return { valid: false, reason: 'Purchase was chargebacked.', purchase, uses: data.uses };
  if (purchase.disputed) return { valid: false, reason: 'Purchase was disputed.', purchase, uses: data.uses };
  const valid = Boolean(data.success);
  return {
    valid,
    reason: valid ? undefined : (data.message || 'License verification failed.'),
    purchase,
    uses: data.uses,
  };
}
