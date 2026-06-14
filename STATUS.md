# STATUS — AstroPrecise · 2026-06-14

**State:** Live at **https://astroprecise.app/**. Latest includes **sw `ap-v93`** (shared-sky scroll parallax + tiered bloom + scroll-drive lock). Pushed to `main`; auto-deploys via `deploy-pages.yml` → `gh-pages`. To see changes: **hard-refresh / reinstall the PWA** (the service worker caches the shell; each `ap-vNN` bump replaces it).

## Shipped since ap-v83 (most recent first)
- **ap-v93 — Shared sky + tiered bloom (Grok):** cosmos parallax tied to hero scroll clock; RafCore-tier bloom (mid/light, high/full); scroll-drive locks on manual time control until Now.
- **ap-v92 — 3D hero recomposition (Grok):** model-first layout (wider orrery column, 640px canvas), unified `.orrery-console` instrument deck, trimmed hero copy, mask feather tuned (outer planets no longer clip), `resetScrollDrive` resets camera dolly, duplicate date HUD removed (orrery-webgl owns it), sw precache deduped.
- **ap-v91 — Domain + orrery audit (Grok):** `astroprecise.app` global URL migration (43 files + 12 sign pages regen); Claude Phase 2 merged — scroll-linked `setScrollDrive` + ACES/UnrealBloom; fixed EffectComposer init order (scene/camera before composer); RafCore scroll drive.
- **ap-v90 — Full audit batch (Grok):** sign-daily.js on 12 sign pages (no 464 KB interpretations load); shop price honesty; SW precache expanded; raf-core site-wide; JSON-LD on core tools; warm logo/favicon; sitemap + SEO/meta fixes.
- **ap-v89 — Post-chart flow + compat warmth (Grok):** chart.html now shows a "What to explore next" panel after every cast (Transits · Compatibility · Instrument); compatibility person-1 accents + synastry share card recolored from cool blue → warm copper/gold.
- **ap-v88 — Phase 1 orrery polish (Claude):** retrograde glow rings, moon-phase HUD in controls, real ecliptic aspect lines in canvas fallback, Capture Sky button (share/download JPEG).
- **ap-v83 — Visual pro pass:** killed colour-emoji glyphs (canvas: U+FE0E text-selector at draw sites; DOM: `font-variant-emoji:text`), fixed the Life Path empty gap (spacing), modernised the orrery controls (engraved gold buttons + custom gold scrubber), hero `min-height:auto` on mobile.
- **ap-v79–v82:** Saturn Return finder, emoji→engraved sprites, hero orrery embedded on void, latent-fault fixes, blank zodiac ring fix.
- **ap-v74–v77:** £4.99 synastry unlock, couples generator, trust layer, continuity "depth-by-light", self-hosted fonts.

## Open / ongoing
- ⚠ **Eyeball ap-v93 on https://astroprecise.app/:** scroll = orrery time + starfield drift together; 30× then scroll (locked until Now); sun bloom without double halo; Capture + preloader Enter.
- ⚠ **Eyeball ap-v90 on your phone:** sign page load speed, shop "Coming soon" on dormant SKUs, Instrument birth-form unlock note.
- ⚠ **Eyeball ap-v88–v89 on your phone:** orrery retrograde glow + moon phase label + Capture button; chart "what's next" cards; compat share card warm tones.
- **Monetization is yours to switch on:** paste hosted-checkout URLs into dormant `AP_MON` keys. All blank by design until then.
- CLAUDE.md still says "flip Pages source to Actions" — **don't** (peaceiris→gh-pages workflow; just push `main`).

## Roadmap (deferred)
- Phase 2 — signature scroll-linked cinematic orrery + selective bloom/ACES (`~/.claude/plans/elegant-popping-zebra.md`).
- Astronomicon glyph font + IBM Plex Mono numerics; trending tools (birth-chart wallpaper, Big-Three card).

*Updated 2026-06-14 (ap-v93). Full history: AGENT-HANDOFF.md + CLAUDE.md here · roadmap: ~/.claude/plans/elegant-popping-zebra.md*