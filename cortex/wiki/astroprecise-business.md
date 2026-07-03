# AstroPrecise — Launch & Monetization Strategy

*Last verified: 2026-07-02. Synthesized from the 21 root planning docs (delegated
catalog pass, spot-checked against STATUS.md and git history). This page is the map;
the root docs remain the source of detail.*

## The plan in one paragraph

Free in-browser astrology tools (chart, horoscope, compatibility, transits, the
Instrument) act as the traffic magnet; short-video social (TikTok/Reels first, then
Pinterest/Reddit) drives discovery; an email funnel captures the audience; revenue
starts with hand-fulfilled digital products via **PayPal direct** (£6 poster PDF,
£12 Deep Reading — Lemon Squeezy was dropped 2026-07-02) and ladders up through POD
merch to commissions. On-site checkout, subscriptions, and app-store distribution are
deliberately Phase 2+ (GitHub Pages ToS forbids on-site selling; host migration needed).

## Phase gates

| Phase | Gate | Key docs |
|---|---|---|
| 0 — Free launch | done: site live at astroprecise.app, QA green | LAUNCH.md, STATUS.md, AUDIT-2026-07-02.md |
| 1 — Traction + first revenue | owner: PayPal links pasted into `app.js AP_MON`, social accounts, Postiz | PAYPAL-SETUP.md, LAUNCH-WEEK-PLAYBOOK.md, CONTENT-CALENDAR.md, INSTANT-MONETIZATION.md |
| 2 — Real commerce | host migration off GitHub Pages (Cloudflare/Netlify) | MONETIZATION.md, SHOP-AUDIT.md, POD-PLAYBOOK.md (Method B) |
| 3 — App stores | custom-domain TWA prerequisites (domain: done) | PLAY-STORE-PACK.md, LAUNCH-PLAN.md |

## Doc map (root of repo)

- **Strategic:** LAUNCH-PLAN.md (master), GROWTH.md (market/channels), MONETIZATION.md
  (provider terms, verified), GTM-LADDER.md (7-rung price ladder), LEGAL-LAUNCH.md
- **Tactical, paste-ready:** CONTENT-PLAN.md (30 video scripts), CONTENT-CALENDAR.md
  (14-day schedule), LAUNCH-WEEK-PLAYBOOK.md (day-by-day), LINK-IN-BIO.md,
  PLAY-STORE-PACK.md, PAYPAL-SETUP.md
- **Ops/audit:** STATUS.md (snapshot — lags git), AUDIT-2026-07-02.md, SHOP-AUDIT.md,
  DESIGN.md (token source of truth), ENGINE-TRANSFORM-PLAN.md (applied), EMAIL-FUNNEL.md
- **Superseded in part:** DOMAIN-SWITCH.md (domain switch has since happened —
  astroprecise.app is live); INSTANT-MONETIZATION.md + SHOP-AUDIT.md payment-provider
  sections predate the PayPal switch — PAYPAL-SETUP.md (2026-07-02) is current.

## Standing constraints

- **Honesty rule** governs marketing too: no fake stats, no fake buttons; dormant shop
  SKUs stay honestly dormant until links are real (v566 enforced this in copy + CI).
- Merchant-of-record/tax handling changed when LS was dropped — PayPal direct means
  VAT/risk is now the owner's (noted in PAYPAL-SETUP.md); revisit at Phase 2.
