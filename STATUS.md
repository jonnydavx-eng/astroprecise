# STATUS — AstroPrecise · 2026-06-14

**State:** Live & current. Latest includes **sw `ap-v89`** (post-chart flow + compat share-card warmth). Pushed to `main`; auto-deploys via `deploy-pages.yml` → `gh-pages`. To see changes: **hard-refresh / reinstall the PWA** (the service worker caches the shell; each `ap-vNN` bump replaces it).

## Shipped since ap-v83 (most recent first)
- **ap-v89 — Post-chart flow + compat warmth (Grok):** chart.html now shows a "What to explore next" panel after every cast (Transits · Compatibility · Instrument); compatibility person-1 accents + synastry share card recolored from cool blue → warm copper/gold.
- **ap-v88 — Phase 1 orrery polish (Claude):** retrograde glow rings, moon-phase HUD in controls, real ecliptic aspect lines in canvas fallback, Capture Sky button (share/download JPEG).
- **ap-v83 — Visual pro pass:** killed colour-emoji glyphs (canvas: U+FE0E text-selector at draw sites; DOM: `font-variant-emoji:text`), fixed the Life Path empty gap (spacing), modernised the orrery controls (engraved gold buttons + custom gold scrubber), hero `min-height:auto` on mobile.
- **ap-v79–v82:** Saturn Return finder, emoji→engraved sprites, hero orrery embedded on void, latent-fault fixes, blank zodiac ring fix.
- **ap-v74–v77:** £4.99 synastry unlock, couples generator, trust layer, continuity "depth-by-light", self-hosted fonts.

## Open / ongoing
- ⚠ **Eyeball ap-v88–v89 on your phone:** orrery retrograde glow + moon phase label + Capture button; chart "what's next" cards; compat share card warm tones.
- **Next (eyeball-gated):** hero RECOMPOSITION — model as clear centerpiece, trimmed copy, controls in one instrument panel (touches preloader→hero handoff).
- **Monetization is yours to switch on:** paste hosted-checkout URLs into dormant `AP_MON` keys. All blank by design until then.
- CLAUDE.md still says "flip Pages source to Actions" — **don't** (peaceiris→gh-pages workflow; just push `main`).

## Roadmap (deferred)
- Phase 2 — signature scroll-linked cinematic orrery + selective bloom/ACES (`~/.claude/plans/elegant-popping-zebra.md`).
- Astronomicon glyph font + IBM Plex Mono numerics; trending tools (birth-chart wallpaper, Big-Three card).

*Updated 2026-06-14 (ap-v89). Full history: AGENT-HANDOFF.md + CLAUDE.md here · roadmap: ~/.claude/plans/elegant-popping-zebra.md*