# STATUS — AstroPrecise · 2026-06-16

**State:** Live at **https://astroprecise.app/** — **ap-v218** on gh-pages; local **ap-v219** staged (not pushed). Auto-deploys via `deploy-pages.yml` → `gh-pages`. Hard-refresh / unregister SW after deploy.

## Shipped since ap-v83 (most recent first)
- **ap-v218 — Lighthouse prep (Grok):** focus traps, horoscope a11y, shop mobile, deferred WebGL, trimmed SW precache.
- **ap-v215–217 — Nav + shop + horoscope UX (Grok):** More menu portal, 44px touch targets, sign-card chrome fix.
- **ap-v208–213 — Orrery visuals (Grok):** scale journeys, sun fireball, embedded blend, viewport toolbar.
- **ap-v202–205 — Preloader Enter + landing gate (Grok):** pointer-events fix, mobile framing, hero bleed-through fix.
- **ap-v192–201 — Orrery award-pass (Grok):** Earth-only boot, crash hardening, focus fly-to, timeline scrubber.
- **ap-v181–188 — Shop LIVE 13/13 (Grok):** Lemon Squeezy checkouts, product art, fulfilment suite.
- **ap-v179 — Engineering backlog (Grok):** a11y, dead-code purge, chart wallpaper lead magnet, Big Three share card.

## Open / ongoing (local ap-v219)
- **Commit ready, push deferred:** `scale-journey.js` + chapters (were 404 on live), `orrery-visual.css` polish, compat matrix header a11y, landmark dedupe on home.
- **Heavy tools last:** `cd tools/visual-check && npm run audit` before `git push` (Playwright/WebGL crashes when RAM low).
- **Owner:** phone eyeball preloader + shop; one LS checkout end-to-end; Search Console; outreach schedule.

## Roadmap (deferred)
- Play Store TWA (12 testers × 14 days); astrocartography map; on-site Stripe (post host migration).

*Updated 2026-06-16 (ap-v219 local). Full history: AGENT-HANDOFF.md*