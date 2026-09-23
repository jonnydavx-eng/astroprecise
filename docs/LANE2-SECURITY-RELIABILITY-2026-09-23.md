# Lane 2 — security, reliability, dead-code hygiene

23 Sep 2026. Checkout stays closed. This pass does not wire payments, ads, Gumroad, or secrets.

Ranked against the phone path: birth sitting → chart → seven chapters → sky card, with the 3D Observatory as the sitting that starts that path.

## Fixed

### P1 — Observatory and Life Path sittings never reached the live chart

`website/js/ap-home-personal-sky.js` and `website/lifepath.html` write `sessionStorage['ap-chart-handoff']` (date, time, town). The live calculator is `website/js/ap-chart-next.js` on `website/chart.html`. It only read `ap-next-chart-open`. `website/js/chart-page.js` still reads the sitting key, and no HTML loads that file.

After “Open my chart”, the phone form was blank. The visitor retyped the birth minute.

`ap-chart-next.js` now consumes `ap-chart-handoff` once, fills date, clock time, and town text, and does not calculate until a listed place is chosen. Coordinates in the payload are ignored. A saved-chart open still wins and drops the sitting.

### P1 — Storage-blocked re-entry was deleted before the chart could explain it

`goToChart()` falls back to `chart.html?entry=private-reentry` when `sessionStorage` throws. The chart privacy script removed every `entry` value, including that fixed token, before `ap-chart-next.js` ran. `chart-page.js` still looked for the token on a page that is not mounted.

`website/chart.html` now keeps exactly one `entry=private-reentry`. Any other value, or two `entry` fields, is still removed. The chart then asks for the details again and does not read them from the address.

### P1 — “Keep my sky” with no loaded chart could open a different saved chart

`website/js/ap-reading-next.js` always wrote `ap-next-sky` and navigated to `sky-card.html`. `JSON.stringify(null)` is the string `null`. `website/js/ap-keepsake-next.js` then falls through to the active `ap_charts` row. The button sits in a hidden section, so this needed a scripted click or a failed render, but the wrong card would be the one kept.

The handler now returns before writing storage when `chart.positions` is missing.

### P1 — Client error log kept the full address

`website/js/ap-error-beacon.js` stored `location.href` and `console.warn`’d the entry, including query and hash. Legacy birth links would sit in `sessionStorage['ap_client_errors_v1']` next to the optional Sentry DSN stub.

Stored hrefs now keep only `nosw=1` and `lite=1`. Messages, sources, and stacks drop email addresses and ISO dates, and are clipped to 500 characters. The console line is the redacted message only.

### P1 — `npm test` called a missing file and skipped the privacy test

`package.json` ran `node test-chart-url-privacy.mjs`. That file is not in the tree. `test-next-url-privacy.mjs` and `test-sitting-handoff-stage.mjs` existed and were not on the script. The script now runs those, plus `test-journey-handoff.mjs`.

### P2 — Explore listed Synastry as a second comparison

`website/synastry.html` immediately replaces itself with `compatibility.html` and sets `noindex`. `website/explore.html` still listed “Synastry” as tool 09 beside “Compare two charts”. The footer injector in `website/js/app.js` did the same on older pages.

The Explore row is gone (46 tools). Footer and the dormant mobile extra now point at `compatibility.html`. `synastry.html` stays as the redirect for old links.

## Proposed

### P1 — `chart-page.js` is unmounted but still treated as the chart

No `website/*.html` loads `website/js/chart-page.js`. `test-sitting-handoff-stage.mjs`, `test-chart-wheel-layout.mjs`, and `test-release-honesty.mjs` still execute it. A fix there does not change the phone chart. Retire or remount it in a dedicated pass so the two calculators cannot drift again.

### P2 — Cosmic story vs the seven-chapter reading

Explore tool 07 is `cosmic-story.html`. The guided chapter path is `deep-reading.html`. Both are narrative readings from birth details. Demote or cross-link Cosmic story so Explore does not look like two primary readings.

### P2 — Kept but unreferenced Observatory/Explore controllers

`website/ACCOUNT-BEFORE-DELETE-2026-08-12.md` keeps `website/js/ap-observatory-v833.js`, `website/js/explore-boot-v832.js`, and `website/js/ap-nav-model-v832.js` on purpose. Live Observatory loads `ap-observatory-v834.js`. Do not delete them in this lane; a later hygiene pass can drop them when visual-check no longer names them.

### P2 — Subscribe export token in the query string

`workers/subscribe/src/index.js` accepts `GET /export?token=`. Timing-safe compare and CSV formula guards are in place. A token in the URL still lands in access logs and browser history. Prefer `X-Export-Token` only, after the owner confirms nothing calls the query form. No token is in this repo.

### P2 — Other geocoders still omit per-request referrer flags

`ap-home-personal-sky.js` now sends town search with `credentials: 'omit'` and `referrerPolicy: 'no-referrer'`. `website/js/app.js`, `ap-sky-card.js`, `ap-natal-reading.js`, `ap-couples-sky.js`, and `ap-eclipse-contact-v835.js` still use a bare `fetch`. Production default referrer policy already sends origin-only on cross-origin HTTPS, and several of those pages set `<meta name="referrer" content="no-referrer">`. Align the remaining fetches when those pages are next edited.

### P2 — Sky-card handoff key is split

Chapters write both `ap-next-sky` (read by `ap-keepsake-next.js`) and `ap-sky-card-handoff` (read by `ap-sky-card.js` on `synchronicity-card.html`). The guided PNG page does not read the second key. Leave both until the mirror-hour card and the birth-sky card are explicitly one surface.

## Skip

- Checkout, PayPal, Gumroad, ads, and `website/js/shop-commerce.js` product wiring. Checkout stays closed.
- Android session/auth. The app has no login API. The site already deletes legacy `ap_user` in `website/js/profile.js` and does not export password helpers.
- Deleting `synastry.html`. It is the compatibility redirect, not a second engine.
- `sky-card.html` vs `synchronicity-card.html`. One is the birth-sky PNG. The other is the device-clock mirror hour.
- `sky-events.html` vs `this-weeks-sky.html`. Different calendars.
- Putting birth minutes back into Observatory `#m=` links. `website/js/ap-deep-link.js` already stashes personal instants.

## Checks

`node test-journey-handoff.mjs`, `node test-next-url-privacy.mjs`, and `node --test test-sitting-handoff-stage.mjs`. The Pages workflow runs the same three before deploy.

Service worker identity stays `ap-v915`. `website/sw.js` was touched so the next install reloads the launch shell. `ap-chart-next.js` is already in that shell and stays network-first. `ap-home-personal-sky.js` and `ap-error-beacon.js` are now release-critical too, so a cached copy cannot keep the old geocoder call or the old error log.
