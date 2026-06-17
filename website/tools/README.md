# AstroPrecise website tools

Run from the `website/` directory unless noted.

## Build (sign pages + service worker precache)

```bash
node tools/generate-sw-precache.mjs && node tools/generate-sign-pages.mjs
```

- **`generate-sw-precache.mjs`** — scans canonical html/css/js + static assets, rewrites `sw.js` `PRECACHE` between markers, bumps `ap-v*`.
- **`generate-sign-pages.mjs`** — regenerates `aries.html` … `pisces.html` from the template.

## Other generators

| Script | Purpose |
|--------|---------|
| `build-main-lite.mjs` | Extract `css/main-lite.css` from `main.css` |
| `compress-sign-heroes.mjs` | Re-compress sign hero WebPs in `assets/images/zodiac-cards/` |
| `generate-celestial-seals.mjs` | Seal SVG assets |
| `migrate-legacy-to-main-lite.mjs` | Batch inner-page shell migration |
| `migrate-page-boot.mjs` | Editorial Tier-C → `ap-page-boot.js`; instrument zodiac order |

## CI — production Lighthouse

From repo `tools/visual-check/` (requires local preview on `:8790`):

```bash
npm run lighthouse:production:ci
```

- Batch: `chart.html`, `horoscope.html`, `aries.html`, `leo.html`, `compatibility.html`
- Writes `out/lighthouse/production/SUMMARY.md` + `report.json`
- **Exits 1** if any page **performance &lt; 85** (`LH_CI_PERF_MIN` overrides default)