# STATUS — AstroPrecise · 2026-06-19

**State:** 🚀 **DEPLOYED ap-v449** to production. v447 cinematic start sequence → v448 sitewide refinement Waves 0-1 (correctness + chrome cohesion) → v449 honesty/SEO/palette plumbing. main `99baad2`. Rollback to v448: `git push origin f5463a7:gh-pages --force`.

**Sitewide refinement — what's LIVE vs STAGED:**
- LIVE (code-verified): Wave 0 correctness bugs; Wave 1 skip-links + #ei icon-sprite fix (7 pages) + palette links; Wave 2-structural palette aliasing (with fallbacks); Wave 5-subset = shop count reconciled to 13 (config-derived), legal-page OG/Twitter/JSON-LD parity, phone tools noindex + excluded from next deploy.
- STAGED for browser QA (NOT shipped — would change how pages look, can't agent-verify): Wave 2 cold→warm color-temperature sweep; **Wave 3 generic hero cinematic** (tightly DOM-coupled — needs the most care); Wave 4 seals-over-glyphs. Audit + 6-wave plan: see the page-refinement audit; framework is the cohesion contract (shared chrome, generic .ap-hero, palette canon).

Older: v447 start sequence (gh-pages `bb52729`). v446→v447 = cinematic start sequence (opt-in narration, 26s galaxy→Earth fly-in, satellites removed, HD on high tier). main `3363047`. Rollback to v446: `git push origin 0d3a4db:gh-pages --force`. ⚠ deployed without agent browser-QA. **In progress:** sitewide structure+artwork refinement (45-page audit running). Earlier baseline: ap-v446 (gh-pages `0d3a4db`, was `61ebe1b`/ap-v277). First live update since ap-v277 — ships the full ap-v278→v446 accumulated work **plus** this session's overhaul (engine precision, security, polar-house fix, build tooling). Deployed **source (unminified)**; the minified build (`npm run build`) is ready but pending browser QA before switching the deploy to it.

**Rollback:** `git push origin 61ebe1b:gh-pages --force` restores the prior live state.

## Overhaul shipped this session (2026-06-19)
- **Engine:** Meeus Ch.37 Pluto series (verified to the worked example) + general precession J2000→of-date — all planets now tropical/of-date consistent with Sun/Moon; **Pluto Aquarius ingress now lands 2024-11-19** (was the lagging "finding"). Polar-house degeneracy fixed (12 distinct cusps above the polar circle). Engine test coverage **16 → 139 assertions**.
- **Security:** reflected/stored XSS hardening across 6 modules (incl. an invite-link injection); subscribe-worker hardening (constant-time token, rate-limit, export pagination fix, CSV-injection guard).
- **Tooling:** `npm test`/lint/prettier/syntax gate; esbuild build (`npm run build` → `dist/`, −25% JS / −28% CSS) + `serve:dist`.
- **Note:** the precession change shifts every displayed planet position ≤~0.35° today (more correct, agrees with standard ephemerides).

## QA gates
- Full test gate green: **139 engine assertions** + horoscope/compat/content/art + ephemeris-package smoke; `node --check` 77/77.
- ⚠ **No browser QA performed by the agent** (preview env was bound to another project) — recommend a live smoke of chart/shop/compatibility now that it's deployed.

## Open / ongoing
- **Source-of-record:** `main` not yet committed (overhaul lives in the working tree) — commit + push `main` when ready.
- Browser-QA the live site; if good, optionally switch deploy to the minified `dist/` build (bundling/hashing/ESM still staged).
- **Owner (unchanged):** TWOSKIES50 in LS, GSC/Bing, social accounts + Postiz, one checkout smoke-test, email verify

## Roadmap (deferred)
- Play Store TWA; astrocartography map; on-site Stripe

*Updated 2026-06-19 (ap-v446 LIVE). Full history: AGENT-HANDOFF.md; overhaul detail: OVERHAUL-PLAN.md*

## Shipped locally (Wave 25–26 audit closure)
- **Perf outliers fixed:** terms 57→**100**, tonight 66→**98**, transits 66→**95**, profile 77→**97**, angel-numbers/moonphase/name-numerology 83→**95–98**
- **CLS fixes:** rising-sign 0.058→**0.001**, outreach 0.28→**0**, transits 0.098→**0.007**, quiz 0.052→**0.001**, moonphase CLS restored (blocking page CSS)
- **icons.js:** skip seal upgrade on audit path (transits CLS root cause)
- **Preview:** `serve-preview.mjs` on :8790 (Brotli)

## QA gates (local ap-v430)
- 10-page Lighthouse CI: **pass** (index 100, chart/horoscope 94–97, all perf ≥85)
- 8-page axe: **0 violations**
- Engine tests: **16/16 + 5/5 + 9/9**
- 23-page remaining audit: overall **87**, perf avg **95**, a11y **100** (`capturedAt` 2026-06-17T18:34Z)
- **All 23 pages perf ≥84** (retrograde **84** — sole borderline); **all CLS ≤0.05**
- Visual baseline: **saved** (25 preloader + 13 pages)

## Open / ongoing
- **Push blocked by Jonny** — single commit ap-v278→v430 when ready
- **Owner (unchanged):** TWOSKIES50 in LS, GSC/Bing, social accounts + Postiz, one checkout smoke-test, email verify

## Roadmap (deferred)
- Play Store TWA; astrocartography map; on-site Stripe

*Updated 2026-06-17 (ap-v430 local). Full history: AGENT-HANDOFF.md*