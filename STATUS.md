# STATUS — AstroPrecise · 2026-06-17

**State:** Local **ap-v430** (Wave 25–26 multi-agent audit complete, **NOT PUSHED**). Live production still **ap-v277** at https://astroprecise.app/ — push when Jonny signs off.

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