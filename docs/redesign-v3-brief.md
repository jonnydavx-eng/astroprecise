# AstroPrecise v3 Redesign Brief — "The Observatory"

Date: 2026-08-01 · Author: Kimi (with research panel) · Status: APPROVED BY OWNER (Jonny, "complete redesign, keep the 3D, improve it")

## 1. The market gap we own

Research teardown (Aug 2026): every successful astrology product is one of two things —

- **"Ugly but Accurate"** — Astro.com (1998 UI, mobile nightmare, gold-standard math), Astro-Seek (free everything, cluttered).
- **"Pretty but Vague"** — Co-Star (30M users, brutalist beauty, NASA JPL credibility — but critics call its content cryptic/vague), The Pattern, Sanctuary ($19.95/mo human chat).

**Nobody owns beautiful + honest + precise.** AstroPrecise's throne: *"The real sky, computed in front of you — to the arcminute — wearing museum-grade design."* Our moat no one can copy quickly: a live, computed 3D solar system (VSOP87/ELP2000) as the site's spine. ZodiScope is reaching for the same gap (mobile-first interactive chart, "no AI horoscopes") — we must out-execute them before 12 Aug.

## 2. Audience (evidence-based)

1. **Primary — Gen Z/millennial astrology-fluent, skew female, 18–34.** 60%+ of astrology traffic is mobile; 62–83% belief/engagement; ~80% of Gen Z queries are relationship-driven; Gen Z is 4× more likely to try free before paying; sharing is the growth loop (Co-Star 7.5M→30M on social compare).
2. **Secondary — gift buyers.** Birth-moment keepsakes for partners/parents/friends. Emotion-led, price-insensitive at £12–£40. This is the revenue.
3. **Tertiary — astronomy-curious skeptics + UK eclipse watchers.** The 12 Aug 2026 eclipse is a once-in-27-years UK acquisition event (press/SEO/word-of-mouth). Our honest-astronomy voice is the trust wedge.

Spending correlates: higher education, higher income, unmarried, social ties in astrology, recent life disruption. Market: $12.8B (2021) → $22.8B (2031).

## 3. Design direction (2026 award-level, evidence-based)

2026 Awwwards data: 61% of Site of the Day winners are immersive 3D scroll-driven narratives (up from 23% in 2024). **We already have that spine — the redesign executes it at award level.**

- **Typography carries the design.** Fraunces (display serif, italic accents) at kinetic scale — hero lines up to 14vw, tight tracking; Space Grotesk for UI; mono caps for "instrument panel" labels. Oversized type + huge negative space + hairline rules + chapter numbers. Editorial, not app-y.
- **Color:** the void stays near-black; ink white; brass as the single brand accent; one restrained signal hue per chapter (moon silver-blue, eclipse amber, horizon teal). No gradients-for-gradients'-sake.
- **The orrery is the hero, type composes around it** — not text floating over a screensaver. Camera = narrative device; scroll = director.
- **Motion:** kinetic type reveals on scroll, micro-delight on CTAs, living countdown. `prefers-reduced-motion` respected everywhere.
- **Mobile-first, thumb-perfect.** >70% of the audience is on a phone. Cast flow, nav, and CTAs designed from 390px up. (Also addresses the reported "chart button" failure — suspected mobile nav.)
- **Performance baseline holds:** sub-2.5s LCP, SW precache, self-hosted fonts, webp.

## 4. Conversion architecture

- **Free chart in <30s is THE hero action** — no email, no wall (Co-Star's funnel starts free; ours must feel faster and more magical).
- **Eclipse countdown persistent** — T−11d and shrinking; the urgency engine to 12 Aug.
- **Compatibility elevated** — relationship content is ~80% of Gen Z demand; compat gets first-class nav and homepage presence.
- **Keepsake as emotional product** — "the exact sky the moment you were born, printed" — shop cards lead with feeling, not SKU codes.
- **Share loops** — every cast produces a shareable artifact (already present: keepsake/share link) — surface it post-cast, mobile-first.
- **Honesty as brand** — "computed here, never uploaded", entertainment labels stay. Trust converts skeptics and press.

## 5. Stage plan

| Stage | Scope | Status |
|---|---|---|
| 1 | Design system tokens + homepage redesign (hero, countdown, chapters, CTAs, mobile nav) | in progress |
| 2 | Chart flow: cast → wheel → reading → share/keepsake; re-test "chart button" report on mobile viewport | pending |
| 3 | Eclipse, horoscope, deep-time pages | pending |
| 4 | Shop, deep-reading, legal/contact polish | pending |

Every stage: node --check, 17-suite gate, precache bump, deploy, live verification, screenshot QA.

## 6. Guardrails

- Preserve JS hook IDs/classes (ap-home-bootstrap / ap-award-orrery wiring: #heroChapter, #apAwardOrreryWrap, .hero-copy, .hero-solar-stage, #instrumentsChapter, #skyChapter, #apFloatNav, cast form IDs).
- No dependency additions; static site; GitHub Pages.
- Honesty labels, ISO safety, gate logic, license verify — untouched in behavior.
- Eclipse content accuracy (20° Leo point, 89–92% UK obscuration, 18:46 BST greatest / ~19:05 UK peak) — resolve 20°02′ vs 20°08′ wobble to one consistent number.
