# Model Surface Contract

**Tip:** ap-v837 · **Scope:** website/ only · **Owner law:** honesty over spectacle, one WebGL context per page.

Three surfaces — never mix their honesty labels.

---

## Surface A — Stills + `#m=` deep links

**What:** Static engine stills (`img/engine/*.webp`) and hash links that hand off to the live receiver without mounting WebGL on the emitter page.

**Where:** Planet pills, path cards, chart/moment CTAs, horoscope dial link, weekly-sky cards, moonphase compute link, shop plates, empty/fail panels, bottom-nav active states.

**Emitter API:** `APDeepLink.buildSkyLink({ m, focus, scale, base })` in `website/js/ap-deep-link.js`.

**Link grammar:**

```
explore.html#m=<UTC-ISO|now>&focus=<body>[&scale=N]
```

| Param | Values | Notes |
|---|---|---|
| `m` | ISO UTC string or `now` | Bare `YYYY-MM-DDTHH:mm` gets `Z` appended (UTC contract) |
| `focus` | `earth` · `sun` · `moon` · `mercury` … `neptune` | Lowercase; invalid slugs omitted. Pluto remains an optional scene point on capable devices, not a public focus destination. |
| `scale` | integer | Optional zoom beat |

**Bridge helpers:** `APSkyBridge.buildLinkFromChart()` / `buildLinkFromDate()` derive `m` from saved chart or date-only (UTC noon when time unknown).

**Honesty:** **SCHEMATIC** or no LIVE badge on stills. Never label a poster as LIVE.

---

## Surface B — Threshold / lens

**What:** Full-viewport threshold experience — iris, portal, warm mountain backdrop — that *invites* entry without claiming a running ephemeris on the backdrop itself.

**Where:** `observatory.html` (Enter the Observatory), observatory overture beats on marketing paths.

**Mount rules:**

- Backdrop art = **SCHEMATIC · decorative field** (silver, no pulse).
- CTA hands off to Surface C (`index.html` or `explore.html`) — do not mount a second WebGL context on the threshold page.
- Reduced-motion: skip iris animation; keep static threshold + link.

**Honesty:** Never **LIVE · VSOP87** on the mountain still. Copy may promise “step inside” — not “positions updating now” on the poster.

---

## Surface C — Live WebGL

**What:** One live WebGL instrument per owning page. The Observatory uses `orrery-webgl.js` for VSOP87 positions, Earth rest frame, scale journey and planet focus. The eclipse page uses its dedicated Sun–Moon–Earth renderer and pure shadow-geometry module.

**Where (only):**

| Page | Role |
|---|---|
| `index.html` | Home Observatory — the single solar-system model, scale journey and `#m=` receiver |
| `eclipse.html` | Dedicated eclipse shadow instrument — one canvas, live/replay UTC geometry, umbra and penumbra |

**Receiver:** `website/js/ap-observatory-v834.js` owns home hash/session handoff. `explore.html` is a noindex redirect that preserves query and hash into `index.html`; it never mounts WebGL.

**Mount rules:**

1. **One WebGL context per page** — no inline second canvas; no multi-engine pages.
2. **LIVE badge** only when `html.orrery-full` **and** `ap-model-revealed` (canvas owns the sky).
3. **Boot:** poster/still first → **SETTLING…** → reveal → then LIVE caption.
4. **Fail:** **LIVE SKY UNAVAILABLE** + still plate + Chart / Observatory links.
5. **Controls below the disc** — never cover the model (plinth tray, cast rail).
6. **Home handoff:** `APSkyBridge.showPersonalSky()` may drive home orrery when already live; always emits `ap-sky-ready` for listeners.
7. **Eclipse ownership:** `eclipse.html` must not load `<void-orrery>` or the generic adapter. `ap-eclipse-geometry-v834.js` computes the pure geometry; `ap-eclipse-live-v834.js` owns the page's only context.
8. **Eclipse scale honesty:** angular separation, timing and shadow intersection are computed; distances are compressed and body sizes / visible shadow width are enlarged for clarity.

**Honesty labels:**

| Label | When |
|---|---|
| `LIVE · VSOP87 · <UTC>` | Observatory revealed + engine alive |
| `LIVE NOW · MEEUS SUN/MOON · <UTC>` | Eclipse instrument tracking the current minute |
| `EVENT VIEW · <UTC>` | Eclipse instrument displaying a selected historical/future minute |
| `SETTLING…` | Boot / curtain-raise |
| `LIVE SKY UNAVAILABLE` | WebGL fail, context lost, offline sky |
| `SCHEMATIC · decorative field` | Surface A still or Surface B backdrop |

---

## Personal Sky Moment spine (Stages 0–4)

| Step | Surface | Mechanism |
|---|---|---|
| Cast chart | A → C | Post-cast CTA → `explore.html#m=<birth UTC>&focus=earth` |
| Wheel tap | A → C | Planet glyph doorway → `#m=` + `focus=<body>` |
| Moment freeze | A | Share card + explore link; `ap_moment_return` → horoscope return hook |
| Daily return | A | Horoscope `mountMomentReturnHook` (7-day window) |

**Stage 4** = deploy / ship-harden / owner eye-check (not new emitters). Current delivery tip is ap-v837.

**Event bus:** `ap-sky-ready` — `{ m, link, focus, chart|moment, source }` for share/telemetry hooks.

---

## Agent checklist (before ship)

- [ ] Emitters use `APDeepLink.buildSkyLink` — no hand-built `#m=` strings.
- [ ] Home hash/session receiver remains in `ap-observatory-v834.js`; Explore stays a redirect and mounts no context.
- [ ] Bump `?v=` on touched JS/CSS **and** `sw.js` `const V = "ap-v###"`; precache both eclipse modules and its CSS.
- [ ] LIVE label audit on every page with a sky panel.
- [ ] `node tools/visual-check/_wave2-deeplink.mjs` + `npm test` green.

**Related:** `docs/UI-UX-SYSTEM-BRIEF-2026-07-11.md` · `website/js/ap-deep-link.js` · `website/js/ap-sky-bridge.js`
