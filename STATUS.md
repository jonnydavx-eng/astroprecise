# AstroPrecise status

**State:** Public GitHub Pages serves `ap-v903` (shop plates, Earth first-paint, date wheel, readable tiles; checkout closed). Local candidate is `ap-v904`: comparison page shows a labelled Earth still, horoscope signs fit the first screen, Events type is quieter, Profile sitting language. Checkout still closed.

Updated: 2026-09-14

## Answer first

Working toward a public site that actually looks finished. This pass does **not** open checkout. It restores the comparison still so the page is not a fake observatory, and it puts the daily signs on the first screen.

## Exact measured identity (2026-09-14)

- Canonical path: `C:\Users\jonny\dev\astroprecise` (never `C:\Users\jonny\OneDrive\astroprecise`)
- Public remote: `github` → `git@github.com:jonnydavx-eng/astroprecise.git`
- `github/main`: `90dbe57026ee8da2863497c8e8c1e4f2b06745d0` (merge of PR 39)
- Pages deploy: [Deploy to GitHub Pages #34826004483](https://github.com/jonnydavx-eng/astroprecise/actions/runs/34826004483) completed successfully
- Public cache: `https://astroprecise.app/sw.js` → `const V="ap-v903"`
- Public shop: checkout closed; `img/shop/v902/whole-sky-earth.jpg`, `natal-wheel.webp`, and `keepsake-book.webp` return HTTP 200
- Local sitting branch: `cursor/simplify-sitting-spine` plus dirty launchers/Adobe/art. Untracked `art/higgsfield-unlimited-2026-08-31/` stays untracked
- Live door is **GitHub Pages** (`Deploy to GitHub Pages` on push to `main` touching `website/**`). The local Cloudflare `workflow_dispatch` file is not the public door; do not replace the Pages workflow on `main` with it
- JDAV hook blocks `git push` of `main` to `github`/`origin`. Feature branch + `gh pr merge` is the supported path

## What is on the public site

- Four-route sitting chrome and compact footer
- Checkout-closed v902 shop (Natal Sky Print Pack, Personal Sky Keepsake, Whole Sky Edition; adult `self` only)
- Birth minutes stay out of the URL (`m=` is not a natal fragment)
- Honesty: no fake LIVE astronomy badges; sources labelled or unavailable
- Observatory Earth poster while Settling, date-only chart wheel, readable horoscope tiles

## What is not true yet

- Checkout is **not** open. No PayPal.me, gift SKU, or Typeform details form on the public surface
- Cloudflare tagged `ap-v902-<12hex>` production cutover was **not** used
- WebGL/orrery was **not** proven in Cursor’s browser
- Coherence seats and owner S1 for opening checkout / listings / legal operator identity remain outstanding
- Dirty local launchers, Adobe JSX, and Higgsfield art are **not** in the public commit
- Local `ap-v904` is not public until its overlay PR deploys

## Owner blockers before checkout can open

Same as before: legal operator/trading identity and a public geographic service address, Gumroad Commission sign-in plus eligibility verification and a test order, authenticated event map, GitHub/Cloudflare environment ownership, independent Coherence seats plus owner S1, then explicit authority to wire checkout and publish listings.

Operational source of truth: `docs/SHOP-LAUNCH-RUNBOOK.md`.
