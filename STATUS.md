# STATUS — AstroPrecise · 2026-07-02

**State:** 🚀 **ap-v563 pushed to `main` (`f87126d`)** — Grok's full award-homepage arc (v535–v562: Cosmic Flight, horoscope ecliptic dial, ap-home-bootstrap perf work) **plus** Claude's v563 SEO/social hardening, deployed via gh-pages Actions. Live: https://astroprecise.app (apex canonical; www 301s).

## What shipped 2026-07-02 (ap-v563, Claude)
- **Homepage head**: JSON-LD (WebSite + WebApplication), Twitter card set, `og:image` fixed relative→absolute (`og-banner-improved.jpg`), `og:site_name`
- **cosmic-story.html**: Twitter cards + og:image + WebApplication JSON-LD (was the only indexed page missing social meta)
- **sitemap.xml rebuilt**: removed noindexed pages (404, fulfil-redirect, outreach, phone-tools, sample-reading) + homepage duplicates (index-full/-lite); added missing cosmic-story.html; bare-root URL; tiered priorities (/ 1.0 → legal 0.3); fresh lastmod. 38 URLs
- **manifest.json**: theme/background `#050406`→`#0C1016` (matches the sitewide cool-void theme-color on all 41 pages)
- **index-full.html**: broken anchor `ephemeris.html#oracle` → `#sec-daimon`
- **sw.js**: cache `ap-v563`

## QA gates (all green pre-push)
- `npm test`: 98 engine assertions + horoscope/compat/content/art + ephemeris-package smoke — **all pass**
- Playwright suite: expert **100/100**, user journey **0 issues**, axe a11y **8/8 ok / 0 violations**, homepage contract **18/18**
- Link check: 0 broken internal links, 0 broken anchors (custom sweep, all 45 pages)
- Browser QA: homepage boots clean on :8794 preview, JSON-LD parses, zero console errors

## Open / ongoing
- **`_headers` (CSP etc.) is INERT on GitHub Pages** — security headers don't apply on the live host. Options: move hosting to Cloudflare Pages (file already written for it), or accept GH Pages defaults. Decision for Jonny.
- Verify live after Actions: `curl https://astroprecise.app/sw.js | grep ap-v` should show **ap-v563**; hard-refresh/unregister SW for stale shells
- **Owner (unchanged):** TWOSKIES50 in LS, GSC/Bing verify, social accounts + Postiz, one checkout smoke-test, email verify
- Untracked `tools/visual-check/out/**` audit artifacts left uncommitted by design (Grok's call — commit if Jonny wants them)

## Roadmap (deferred)
- Play Store TWA; astrocartography map; on-site Stripe; blog/content engine for SEO (see AGENT-HANDOFF 2026-07-02 Claude entry for the prioritized roadmap)

*Updated 2026-07-02 (Claude). Full history: AGENT-HANDOFF.md*
