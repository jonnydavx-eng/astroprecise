# AstroPrecise status

**State:** Public GitHub Pages now serves `ap-v902` with checkout still closed. Rechecked 2026-09-14 from this machine: `https://astroprecise.app/sw.js` begins `const V="ap-v902"`, and `https://astroprecise.app/shop.html` still contains `Checkout closed`. This is a measured Pages identity, not a Coherence validator stamp.

Updated: 2026-09-14

## Answer first

The sitting four-route site (Observatory → Chart → Events → Shop) is on the public GitHub Pages path. Shop still shows three adult self-order SKUs with **Checkout closed**. Do not open checkout, wire PayPal/gift/Typeform, or treat this as Cloudflare tagged production.

## Exact measured identity (2026-09-14)

- Canonical path: `C:\Users\jonny\dev\astroprecise` (never `C:\Users\jonny\OneDrive\astroprecise`)
- Public remote: `github` → `git@github.com:jonnydavx-eng/astroprecise.git`
- `github/main`: `a6765adb4635c52ac9f1fa9537599f18381957d0` (merge of PR 37; sitting overlay was PR 36)
- Pages deploy: [Deploy to GitHub Pages #34821556470](https://github.com/jonnydavx-eng/astroprecise/actions/runs/34821556470) completed successfully
- Public cache: `https://astroprecise.app/sw.js` → `const V="ap-v902"`
- Public shop: checkout closed
- Local sitting branch: `cursor/simplify-sitting-spine` at `ccd2070b` plus dirty launchers/Adobe/art. Untracked `art/higgsfield-unlimited-2026-08-31/` stays untracked
- Live door is **GitHub Pages** (`Deploy to GitHub Pages` on push to `main` touching `website/**`). The local Cloudflare `workflow_dispatch` file is not the public door; do not replace the Pages workflow on `main` with it
- JDAV hook blocks `git push` of `main` to `github`/`origin`. Feature branch + `gh pr merge` is the supported path

## What is on the public site

- Four-route sitting chrome and compact footer
- Checkout-closed v902 shop (Natal Sky Print Pack, Personal Sky Keepsake, Whole Sky Edition; adult `self` only)
- Birth minutes stay out of the URL (`m=` is not a natal fragment)
- Honesty: no fake LIVE astronomy badges; sources labelled or unavailable

## What is not true yet

- Checkout is **not** open. No PayPal.me, gift SKU, or Typeform details form on the public surface
- Cloudflare tagged `ap-v902-<12hex>` production cutover was **not** used
- WebGL/orrery was **not** proven in Cursor’s browser
- Coherence seats and owner S1 for opening checkout / listings / legal operator identity remain outstanding
- Dirty local launchers, Adobe JSX, and Higgsfield art are **not** in the public commit

## Owner blockers before checkout can open

Same as before: legal operator/trading identity and publishable geographic service address, signed-in Gumroad Commission proof, authenticated event map, GitHub/Cloudflare environment ownership, independent Coherence seats plus owner S1, then explicit authority to wire checkout and publish listings.

Operational source of truth: `docs/SHOP-LAUNCH-RUNBOOK.md`.
