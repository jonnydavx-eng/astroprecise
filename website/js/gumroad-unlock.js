/*
 * Astro Precise — Gumroad checkout + unlock  (reference drop-in from the link session)
 * -----------------------------------------------------------------------------------
 * Payment home = GUMROAD (it allows astrology AND is the seller-of-record that
 * handles UK/EU VAT for you). This wires the paid readings to the site WITHOUT the
 * reading itself ever leaving the buyer's device.
 *
 * THE HONEST FLOW (birth data never touches Gumroad):
 *   1. The reading is computed ON THE DEVICE from the VSOP87 engine (as today).
 *   2. To reveal it, the buyer taps "Unlock — £2.99". We open the Gumroad overlay
 *      for that product. Gumroad takes the money + the email; we never see a card.
 *   3. Gumroad issues a LICENSE KEY. We verify that key against Gumroad's API and,
 *      if valid, unlock the already-computed reading in place. No account, no wait.
 *
 * PRODUCTS (create these in Gumroad, enable "Generate license keys"):
 *   eclipse-reading  £2.99  (founding; you raise it to £4 after 12 Aug)
 *   eclipse-set      £6      (order-bump)
 *   full-reading     £12
 *   plate            £14  (launch)  ->  £19
 *   sky-pass         £5   (optional credit pack)
 *
 * SECURITY NOTE: verifying a license needs only product_id + license_key (no secret),
 * so it CAN run in the browser — but a spoofed "valid" response could unlock content
 * for free. For anything you care about, run verifyLicense() behind a tiny serverless
 * function (Cloudflare Worker / Netlify fn) that holds nothing secret but is harder to
 * fake, and have it flip "increment_uses_count" true so each key is one-use. The code
 * below works in either place.
 */

// Map your on-site product slugs to their Gumroad identifiers.
// product_permalink is the short code in the Gumroad product URL (gumroad.com/l/XXXX).
export const GUMROAD_PRODUCTS = {
  'eclipse-reading': { permalink: 'REPLACE_ME', price: '£2.99' },
  'eclipse-set':     { permalink: 'REPLACE_ME', price: '£6' },
  'full-reading':    { permalink: 'REPLACE_ME', price: '£12' },
  // Alias used by shop catalogue / pages (same Gumroad product when live)
  'deep-reading':    { permalink: 'REPLACE_ME', price: '£12' },
  'plate':           { permalink: 'REPLACE_ME', price: '£14' },
  'sky-pass':        { permalink: 'REPLACE_ME', price: '£5' },
};

/** Resolve slug aliases (deep-reading ↔ full-reading share one product). */
export function resolveProductSlug(slug) {
  if (slug === 'deep-reading') return 'full-reading';
  if (slug === 'full-reading') return 'full-reading';
  return slug;
}

/** True when the owner has pasted a real Gumroad permalink (not REPLACE_ME). */
export function isCheckoutReady(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  return !!(p && p.permalink && p.permalink !== 'REPLACE_ME' && !String(p.permalink).includes('REPLACE'));
}

/**
 * Open the Gumroad overlay checkout for a product. Requires Gumroad's overlay script
 * on the page once:  <script src="https://gumroad.com/js/gumroad.js"></script>
 * Returns immediately; completion is handled on redirect back with ?license= or via
 * the "success" URL you configure in Gumroad to point at your unlock handler.
 */
export function openCheckout(slug) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  if (!isCheckoutReady(slug)) throw new Error(`Set the Gumroad permalink for "${slug}"`);
  // Gumroad overlay opens when navigating to the ?wanted=true product URL.
  const url = `https://gumroad.com/l/${p.permalink}?wanted=true`;
  window.location.href = url; // or use an <a class="gumroad-button" href=...> for the inline overlay
}

/**
 * Verify a Gumroad license key for a product.
 * @returns {Promise<{valid:boolean, purchase?:object, uses?:number}>}
 * Docs: POST https://api.gumroad.com/v2/licenses/verify
 */
export async function verifyLicense(slug, licenseKey, { incrementUses = false } = {}) {
  const key = resolveProductSlug(slug);
  const p = GUMROAD_PRODUCTS[key] || GUMROAD_PRODUCTS[slug];
  if (!p) throw new Error(`Unknown product "${slug}"`);
  if (!isCheckoutReady(slug)) return { valid: false };
  const body = new URLSearchParams({
    product_permalink: p.permalink,
    license_key: licenseKey,
    increment_uses_count: String(incrementUses),
  });
  const res = await fetch('https://api.gumroad.com/v2/licenses/verify', { method: 'POST', body });
  if (!res.ok) return { valid: false };
  const data = await res.json();
  // Optional hardening: reject refunded/chargebacked/disputed or over-used keys.
  const purchase = data.purchase || {};
  const bad = purchase.refunded || purchase.chargebacked || purchase.disputed;
  const valid = Boolean(data.success) && !bad;
  return { valid, purchase, uses: data.uses };
}

/**
 * End-to-end unlock on return from checkout. Call on page load; if a license is
 * present and valid, reveal the reading your engine already computed on-device.
 * @param {(purchase:object)=>void} onUnlock  reveal the computed reading
 * @param {()=>void} [onLocked]               keep it blurred / show the buy button
 */
export async function handleUnlockOnLoad(slug, onUnlock, onLocked) {
  const key = new URLSearchParams(location.search).get('license');
  if (!key) { onLocked?.(); return; }
  const { valid, purchase } = await verifyLicense(slug, key, { incrementUses: true });
  if (valid) onUnlock(purchase);
  else onLocked?.();
}
