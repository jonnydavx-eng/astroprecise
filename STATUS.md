# AstroPrecise status

**State:** 20 Sep 2026 — free 11:11 / mirror-hour / presence / synchronicity sky card / sitting beat is the public release tip `ap-v912`. Checkout still closed. No ads. No new hosting spend.

Updated: 2026-09-20

## Answer first

PR 45 (`fd6461e13beac864975b5e05460da953d72f7d50`) merged the free 11:11 / synchronicity work on `main` while leaving the cache tip at `ap-v911` on purpose. This tree advances the shared worker and query pins to `ap-v912` so returning browsers drop the v911 cache and load `ap-mirror-hour.js`. Paid checkout stays closed.

## Exact measured identity (2026-09-20)

- Canonical path: `C:\Users\jonny\dev\astroprecise` (never `C:\Users\jonny\OneDrive\astroprecise`)
- Public remote: `github` → `git@github.com:jonnydavx-eng/astroprecise.git`
- Public feature base: `fd6461e13beac864975b5e05460da953d72f7d50` (merge of PR 45)
- Tip in this tree: `website/sw.js` → `const V="ap-v912"` and matching `?v=912` / `AP_ASSET_V='912'`
- Live door: **GitHub Pages** (`Deploy to GitHub Pages` on push to `main` touching `website/**`). Confirm at `https://astroprecise.app/sw.js` → `const V="ap-v912"` and `https://astroprecise.app/js/ap-mirror-hour.js?v=912` → HTTP 200
- PR 45 Pages run (v911 + 11:11 assets, still on tip 911): [Deploy to GitHub Pages #35494410957](https://github.com/jonnydavx-eng/astroprecise/actions/runs/35494410957)
- Cloudflare tagged production cutover is **not** the public door and was not used. Do not replace the Pages workflow on `main` with a local Cloudflare `workflow_dispatch` file
- JDAV hook blocks `git push` of `main` to `github`/`origin`. Feature branch + PR merge is the supported path

## What is on this release

- Free on-device 11:11 / mirror-hour detection (`website/js/ap-mirror-hour.js`)
- Quiet observatory presence sit (`website/js/ap-mirror-presence.js`)
- Natal badge, optional sitting beat, and synchronicity sky-card mark
- Entertainment framing only — not prophecy, not a paid gate
- Checkout-closed shop (Natal Sky Print Pack, Personal Sky Keepsake, Whole Sky Edition; adult `self` only)
- Birth minutes stay out of the URL (`m=` is not a natal fragment)
- Honesty: no fake LIVE astronomy badges; sources labelled or unavailable

## What is not true yet

- Checkout is **not** open. No PayPal.me, gift SKU, or Typeform details form on the public surface
- No ads and no new hosting bill
- Cloudflare tagged `ap-v902-<12hex>` production cutover was **not** used
- WebGL/orrery was **not** proven in Cursor’s browser
- Coherence seats and owner S1 for opening checkout / listings / legal operator identity remain outstanding

## Owner blockers before checkout can open

Same as before: legal operator/trading identity and a public geographic service address, Gumroad Commission sign-in plus eligibility verification and a test order, authenticated event map, GitHub/Cloudflare environment ownership, independent Coherence seats plus owner S1, then explicit authority to wire checkout and publish listings.

Operational source of truth: `docs/SHOP-LAUNCH-RUNBOOK.md`.
