# AstroPrecise — Current Technical State

*Last verified: 2026-07-13. Older hero/orrery notes below are historical.*

## Snapshot (current)

- **Tip / live:** **ap-v721** LIVE — tip SHA `6fed17d`
- **Recent ship focus:** Personal Sky Moment + ship-harden
- **Checkout:** dormant (honest shop copy; no live product checkout)
- **Live URL:** `https://astroprecise.app` (apex canonical, www 301s)
- **Deploy:** GitHub Actions Pages path (`deploy-pages.yml` → `dist/`); push `website/**` on `main`
- **Local preview:** http://localhost:8790 (`website/`)

## Two products in one repo

1. **Android app** (Kotlin 2.0, Compose, Hilt) — `app/`; offline deterministic
   astrology; min SDK 26. See CLAUDE.md (app side).
2. **Website** (`website/`) — static, vanilla JS modules on `window`;
   astronomy engine `js/ephemeris.js` (VSOP87/ELP2000).

## Open decisions / owner tasks

- `_headers` (CSP) is inert on GitHub Pages — move to Cloudflare Pages or accept defaults.
- Owner: GSC/Bing verification, social accounts + Postiz, PayPal checkout smoke-test when checkout is re-armed.

---

## Historical (superseded)

> **Superseded 2026-07-13.** Do not treat the following version claims as tip.
> Live tip is **ap-v721** (`6fed17d`), not ap-v563/v566/v643.

- 2026-07-08: homepage hero study at ap-v643 locally — roadmap in
  `cortex/wiki/hero-orrery-improvements-2026-07-08.md`.
- 2026-07-02 era: site narrative centered on ap-v563→ap-v566 (Weekly Sky, PayPal
  direct, e2e gate, LS archived). That was tip then; it is not tip now.
- Palette / deploy doc contradictions from mid-2026 were largely repaired in CLAUDE.md
  (cool void + brass tokens; Actions Pages deploy). Warm hexes may still appear as
  hardcoded canvas/WebGL paint outside the token system — see index.md if still open.
