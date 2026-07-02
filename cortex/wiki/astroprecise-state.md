# AstroPrecise — Current Technical State

*Last verified: 2026-07-02, from git history (`main` @ 70266a1), STATUS.md, AUDIT-2026-07-02.md*

## Snapshot

- **Version:** ap-v566 on `main` (git history is ahead of STATUS.md, which says v563).
  - v564: This Week's Sky page, minified deploys, SEO/meta polish
  - v565: dropped Lemon Squeezy → **PayPal direct**
  - v566: e2e CI gate for PayPal, dormant-honest shop copy, LS tooling archived
- **Live URL:** `https://astroprecise.app` (apex canonical, www 301s) — custom domain
  is DONE, superseding DOMAIN-SWITCH.md's "not yet applied" status.
- **Deploy:** gh-pages **Actions** pipeline (STATUS.md confirms ap-v563 "deployed via
  gh-pages Actions") — CLAUDE.md's "manual gh-pages mirror / workflow inert" section is stale.
- **QA gates (as of v563):** 98 engine assertions pass, Playwright expert 100/100,
  axe 0 violations, 0 broken links across 45 pages.

## Two products in one repo

1. **Android app** (Kotlin 2.0, Compose, Hilt) — `app/`; offline deterministic
   astrology; min SDK 26. See CLAUDE.md (still accurate for the app side).
2. **Website** (`website/`) — static, no build step, vanilla JS modules on `window`;
   the astronomy engine is `js/ephemeris.js` (VSOP87/ELP2000).

## ⚠️ Known contradictions (see index.md lint findings)

- **Palette:** CLAUDE.md says WARM gold (`#C9A227` on `#050406`) is the live `:root`
  and cool values are retired (2026-06-14). DESIGN.md + STATUS.md (2026-07-02) say the
  live token source is `ap-palette-2026.css` **cool void + brass** with theme-color
  `#0C1016` across 41 pages. The newer docs almost certainly win, but verify
  `website/css/` before any styling work. **Do not trust CLAUDE.md's palette section.**
- **Deployment:** as above — trust STATUS.md/workflows over CLAUDE.md.

## Open decisions / owner tasks (from STATUS.md)

- `_headers` (CSP) is inert on GitHub Pages — move to Cloudflare Pages or accept defaults.
- Owner: GSC/Bing verification, social accounts + Postiz, PayPal checkout smoke-test.
