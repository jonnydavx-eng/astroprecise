# AstroPrecise status

**Source version:** 20 Sep 2026 — `ap-v913`, the guided birth-sky rewrite. The release begins with a short calculated-sky demonstration and leads through birth chart, seven reading chapters and a free PNG keepsake. Checkout remains closed. No ads or new paid dependencies.

Updated: 2026-09-20

## Answer first

The first screen demonstrates the experience before asking visitors for details. The 3D model is at `observatory.html`, with the existing free mirror-hour presence preserved. Exact birth-clock patterns remain in the chart and reading; the new keepsake includes them only when birth details are explicitly shown. The original device-clock card remains at `synchronicity-card.html`.

See [the guided journey implementation and checks](docs/GUIDED-BIRTH-SKY.md). This source document is not a deployment receipt: confirm the Pages run and public `sw.js` before claiming that `ap-v913` is served.

## Previous public release readback (2026-09-20, before this rewrite)

- Canonical path: `C:\Users\jonny\dev\astroprecise` (never `C:\Users\jonny\OneDrive\astroprecise`)
- Public remote: `github` → `git@github.com:jonnydavx-eng/astroprecise.git`
- `github/main`: `2d2f090030e2f6da5b487edf93ea9f8616c92531` (merge of PR 46 tip bump, on top of PR 45 `fd6461e13beac864975b5e05460da953d72f7d50`)
- Pages deploy: [Deploy to GitHub Pages #35494571413](https://github.com/jonnydavx-eng/astroprecise/actions/runs/35494571413) completed successfully (2026-09-20 06:40:35 GMT)
- Public cache: `https://astroprecise.app/sw.js` → `const V="ap-v912"`
- Public 11:11 assets: `https://astroprecise.app/js/ap-mirror-hour.js?v=912`, `ap-mirror-presence.js?v=912`, and `css/ap-mirror-hour.css?v=912` return HTTP 200
- Home / sky-card / chart HTML pin `AP_ASSET_V="912"` and `ap-mirror-hour.js?v=912`
- Live door: **GitHub Pages** (`Deploy to GitHub Pages` on push to `main` touching `website/**`)
- Preceding PR 45 Pages run (shipped the 11:11 files while still on tip 911): [Deploy to GitHub Pages #35494410957](https://github.com/jonnydavx-eng/astroprecise/actions/runs/35494410957)
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
