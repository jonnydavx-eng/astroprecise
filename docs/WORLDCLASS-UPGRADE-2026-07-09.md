# Astro Precise — World-class upgrade package (2026-07-09)

## Honest charter

This package **raises the architecture toward** a top-tier astronomy/astrology product. It does **not** claim magical “fault-free / Lighthouse 100 guaranteed” outcomes from a single script — those require continuous measurement, checkout integration, and real-device QA.

**Production hero 3D engine (`js/orrery-webgl.js`) is intentionally untouched.** A cinematic UMD orrery sits alongside it for dashboards and tool pages.

## Install

```powershell
cd C:\Users\jonny\OneDrive\astroprecise
powershell -ExecutionPolicy Bypass -File .\tools\install-worldclass-upgrade.ps1
```

## New architecture (additive)

| Layer | Files | Role |
|--------|--------|------|
| Design system | `css/ap-design-system.css` | Void/brass tokens, light parchment mode, cards, journey, bottom tabs, a11y, Transit Explorer styles |
| App shell | `js/ap-shell.js` | Cosmic Journey bar, mobile bottom tabs (incl. My Sky), theme toggle, onboarding, Continue My Journey FAB |
| Hybrid router | `js/ap-router.js` | Optional soft navigation (`localStorage ap_soft_nav=1` or `data-soft-nav` on `<html>`) — multi-page HTML kept for SEO |
| Cinematic orrery | `js/orrery-cinematic.js` + `js/vendor/three.min.js` | `initOrrery(id)`, PBR metals, nebula, trails, drag + Ctrl-scroll + keyboard |
| Transit Explorer | `js/ap-transit-explorer.js` | Horoscope enhancement: brass wheel, scrubber, weather panel, orrery mount |
| Hub | `mysky.html` | Central dashboard + JSON-LD + OG tags |
| Nav | `js/ap-nav-model.js` | My Sky in More + bottom tabs |

## Cosmic Journey spine

`Cast → Sky → Keep → Daily → My Sky → Shop` (Reading remains in primary nav / shop path).

## Test

```bash
cd website
python -m http.server 8000
# open http://localhost:8000/mysky.html
# open http://localhost:8000/horoscope.html
```

On this machine atlas port: **8790**.

## Quality targets (measure, don’t assume)

| Goal | How to verify |
|------|----------------|
| WCAG 2.2 AA direction | `tools/visual-check` axe audit; keyboard through journey + orrery |
| Performance | Lighthouse local + production; keep hero WebGL lazy via existing loader |
| SEO | View-source on each tool; JSON-LD on My Sky; sitemap includes `mysky.html` |
| Zero console errors | DevTools on My Sky, Chart, Daily, Sky |

## Export suite + GSAP (added)

| Module | Path | Formats / behaviour |
|--------|------|---------------------|
| Export | `js/ap-export-suite.js` | **PNG** plate, **PDF** via print dialog, **JSON** chart dump, **Wallpaper** 1440×2560, **AR-ready** scene JSON + README |
| Motion | `js/ap-motion.js` + `js/vendor/gsap.min.js` | Hover lift/glow, card stagger, journey fill, orrery reveal; **off** when `prefers-reduced-motion` |
| UI | `[data-export-toolbar]` or `#ap-export-suite-host` | Auto-mounted toolbar |

API:

```js
AP_EXPORT.exportPngPlate(chart)
AP_EXPORT.exportPdfPlate(chart)
AP_EXPORT.exportChartJson(chart)
AP_EXPORT.exportWallpaper(chart)
AP_EXPORT.exportArReady(chart)
AP_EXPORT.mountToolbar(el, () => currentChart)
```

## Manual / product work still required

1. **Payments** — shop remains PDF-only / notify until Stripe (or equivalent) is live in `shop-commerce.js`.
2. **Chart-personalised shop previews** — wire saved chart from `localStorage` into poster/PDF preview frames.
3. **CSP** — if `_headers` / Pages CSP blocks vendor JS, extend allowlist.
4. **Soft router** — leave off until tool pages with heavy client state are audited; then enable per page.
5. **AR binary** — AR-ready export is **portable scene JSON**, not a finished `.usdz` (needs native bake).
6. **WebGPU** — future optional path; not in this ship.
7. **Commit + deploy** — push `website/**` when local QA passes; hard-refresh SW (`ap-v659+`).
8. **Image polish (optional prompts)** — lifestyle Moment wall mockups, shop product plates, OG banners at 1200×630.

## Rollback

Restore from `tools/_backup-worldclass-*` or git checkout of prior `website/` tree.
