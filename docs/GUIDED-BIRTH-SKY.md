# Guided birth-sky experience

The homepage demonstrates the moving sky before asking for birth details. Its single primary action starts a private, browser-based journey: chart → seven-chapter reading → downloadable birth-sky artwork. The first demonstration completes in about nine seconds; reduced-motion users control it manually.

## Ownership

- `ap-next.js` and `ap-next.css` supply the shared navigation and layout. Older tool pages receive the same shell; their calculation engines remain unchanged.
- `index.html` uses `ap-intro-next.js`. The original interactive 3D model lives at `observatory.html`; model deep links now target it.
- `chart.html`, `deep-reading.html`, `sky-card.html`, `charts.html` and `sky-events.html` each have a corresponding `ap-*-next.js` controller.
- Explore is the secondary directory. Guides and the checkout-closed Studio explain the existing tools and tangible samples.

## Data boundaries

Calculations and generated readings run on the device. Offline city choices supply real IANA zones. Online town search is explicit and sends only the town query to Open-Meteo. Birth details travel between journey pages through session storage, never through query strings.

Saving a chart is opt-in. The existing `ap_charts` and profile formats remain compatible. Opening an older record does not silently migrate it to another calculation method. The new calculator uses Whole Sign houses and the true lunar node; incompatible saved methods prefill a new calculation instead of overwriting the original. Malformed saved data is not silently discarded.

Unknown birth times withhold rising, houses and exact Moon degrees, and retain sign changes across the local birth date. Approximate times remain labelled. DST gaps are rejected; folds require choosing the occurrence. PNG artwork hides date, time and place by default and labels provisional angles when applicable. Artwork uses the existing IndexedDB keep library.

## Verification

Build with `node tools/build.mjs`. The build intentionally requires all deployable files to be tracked or staged and excludes internal source documents and authoring tools.

Serve the source with `node website/tools/serve-preview.mjs 8796`. Set `HOST=127.0.0.1` for a local-only preview. Set `AP_PREVIEW_ROOT` to the absolute `dist` directory to exercise minified output instead.

Run `node tools/verify-next-journey.mjs` against that preview. Set `AP_BASE` for another URL and, optionally, `AP_BROWSER_PATH` for a Chromium executable. The default browser channel is Microsoft Edge. This browser test uses fictional data, closes its own browser, and writes ignored evidence under `output/playwright/`. It covers narrow-phone routes, the primary journey, saving/reopening, PNG output, unknown-time handling, and a fresh service-worker installation followed by offline chart/reading use.

Focused regression checks are `node test-ap-sky-bridge.mjs`, `node test-orrery-adapter.mjs`, and `node tools/e2e-profile-save-audit.mjs` (set `AP_BASE` to the running preview). Existing astronomy tests remain release gates. Browser viewport tests do not establish physical-device performance or external user engagement.

The ap-v916 candidate service worker includes the guided opening stylesheet. Updates wait for the user's explicit update action when an older worker controls the page. Checkout is closed. Public Pages was rechecked on 27 September 2026 and serves ap-v915; PR 48 was merged on 23 September by a later release. This local follow-up is not deployed.

The opening now has one destination, a timed calculated-sky-to-keepsake demonstration, and a chart button visible at 320 × 568. The complete toolkit remains in the footer and the shared navigation after entry. Studio previews only the Natal Sky Print Pack at a draft £18; the existing catalogue and payment gates are unchanged. No engagement or physical-phone acceptance is claimed.

Focused follow-up proof: `node tools/verify-opening-flow.mjs` exercises the first-screen geometry, reduced-motion playback, chart → seven-chapter story → PNG, and the single closed Studio offer. Evidence is in `output/playwright/guided-20260927/`.
