# STATUS — AstroPrecise · 2026-06-14

**State:** Live & current. Latest `28781bd` → **sw `ap-v83`**, pushed to `main`; auto-deploys via `deploy-pages.yml` → `gh-pages`. Local == origin (in sync). To see changes: **hard-refresh / reinstall the PWA** (the service worker caches the shell; each `ap-vNN` bump replaces it).

## Shipped since ap-v73 (most recent first)
- **ap-v83 — Visual pro pass:** killed colour-emoji glyphs (canvas: U+FE0E text-selector at draw sites; DOM: `font-variant-emoji:text`), fixed the Life Path empty gap (spacing), modernised the orrery controls (engraved gold buttons + custom gold scrubber), hero `min-height:auto` on mobile.
- **ap-v82 — Latent-fault fixes:** orrery WebGL import self-arms the canvas fallback; chart-wheel shows a message instead of silent blank; orrery3d fallback sizing/DPR; defensive null-guards. (From a multi-agent + runtime fault scan — the zodiac bug below was the only one of its class.)
- **ap-v81 — Hero orrery embedded:** dropped the `.cosmic-hermetic-bg` panel so the model floats on the one continuous void+starfield (no box).
- **ap-v80 — Fixed blank zodiac ring** (horoscope): `zodiac-sphere.js` threw at load (`'use strict'` undeclared handlers) → `ZodiacSphere` undefined → blank canvas. Declared the handlers.
- **ap-v79 — Saturn Return finder:** free exact dates (VSOP87) + dormant 49p reading/PDF unlock (`saturn-return.html`, `js/saturn-return.js`).
- **ap-v78 — Emoji purge → engraved sprites** + warmed the sign-page generator (`constellations.mjs`/`generate-sign-pages.mjs`).
- **ap-v77 — Self-hosted fonts** (12 woff2 under `fonts/` + `css/fonts.css`): removes the Google-Fonts render-block AND IP leak (privacy).
- **ap-v74–v76:** £4.99 synastry unlock (compatibility), couples "Two Skies" generator (`tools/generate-couples.mjs`), trust layer (About / sample reading / accuracy badge), premium export-PDF redesign, continuity "depth-by-light" pass, shop-honesty + WCAG-AA review fixes.

## Open / ongoing
- ⚠ **Eyeball ap-v83 on your phone:** confirm the zodiac ring shows engraved glyphs (not purple emoji squares), the new gold orrery controls, and the Life Path calculator sits right under the intro.
- **Next (eyeball-gated):** the hero RECOMPOSITION — model as the clear centerpiece (not clipped), trimmed copy, controls in one "instrument" panel. Higher risk (touches the preloader→hero handoff) — do with your confirmation.
- **Monetization is yours to switch on:** paste hosted-checkout URLs (Lemon Squeezy / Ko-fi / Etsy) into the dormant `AP_MON` keys (deepReadingUrl, compatUnlockUrl, saturnReturnUrl, shop `fulfilUrl`s). All blank by design until then.
- CLAUDE.md still says "flip Pages source to Actions" — **don't** (peaceiris→gh-pages workflow; just push `main`). Confirm the exposed Cloudflare token (06-13) was revoked. No custom domain/CNAME yet.

## Roadmap (deferred)
- Phase 2 — signature scroll-linked cinematic orrery + selective bloom/ACES (`~/.claude/plans/elegant-popping-zebra.md`).
- Astronomicon glyph font + IBM Plex Mono numerics; trending tools (birth-chart wallpaper, Big-Three card).

*Updated 2026-06-14 (ap-v83). Full history: AGENT-HANDOFF.md + CLAUDE.md here · roadmap: ~/.claude/plans/elegant-popping-zebra.md*
