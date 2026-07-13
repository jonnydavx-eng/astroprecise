# Regression & harmony audit — AstroPrecise · 2026-07-13

**Fleet:** 20 expert agents (code spine, SW, honesty, tests, OrbitLab, commerce, CSS, a11y, content bank, signs).  
**Gates run:** `npm test` — **all green** (engine + sky-bridge unit + ephemeris package).  
**Live SW:** **ap-v721** (confirmed on https://astroprecise.app/sw.js).  
**Local preview:** :8790 up for this pass.

---

## Overall scoreboard

| Area | Grade | Notes |
|------|--------|--------|
| Engine / ephemeris unit tests | **PASS** | Full `npm test` green |
| Doc tip/spine (STATUS + FORWARD-PLAN + contract + sw) | **PASS** | Notes hygiene holds |
| Commerce honesty (dormant checkout) | **PASS** | No fake buy paths |
| Content bank (today’s daily) | **PASS** | Runway → 2027-01-06 |
| Deep-link **emitters** | **PASS** (amber) | Happy path wired |
| Deep-link **focus landing** | **FAIL (P0)** | Auto-Earth clobber @ ~1.1s |
| Cache-bust / SW harmony | **FAIL** | 721 tip vs **703** orrery injects; index SW on localhost |
| Scale Ladder product claim | **FAIL** | No sticky dock; beat order inverted |
| Design token harmony | **FAIL** | Brass vs aurora CTA dialects |
| OrbitLab fork discipline | **RISK** | GENERATED engine; edit OL only |
| Browser spine tests | **GAP** | `test:ui` not in CI; doorway/return untested |

**Product spine is real and mostly wired — not harmonious end-to-end.**  
Emitters work; the explore **focus** half of Personal Sky Moment is broken by a shared loader timer. Cache and visual systems fight the tip.

---

## P0 — fix before any upgrade wave

### P0-1 · Deep-link focus clobbered on explore (and home race)

**File:** `website/js/orrery-loader.js` ~443–447  

```js
setTimeout(function () {
  if (touched) return;
  try { O.focusPlanet('earth'); } catch (e) { return; }
}, 1100);
```

- Runs on **every** WebGL boot, including `explore.html`.
- Timeline: deep-link applies focus → ~1.1s later auto-Earth overwrites.
- Hits: chart wheel doorway, moonphase `focus=moon`, horoscope ruler links, weekly-sky bodies.
- Wave-2 only asserts `data-ap-model-link` (never cleared) → **false green**.

**Fix:** Skip auto-Earth when `data-ap-model-link` / `body.page-explore` / hash has non-earth `focus`; or re-call `__apApplyModelDeepLink()` after the timer. Prefer no second dolly when already at rest Earth on home.

### P0-2 · Cosmic flight can force LIVE before HD ready

**File:** `website/js/ap-cosmic-flight-tool.js` ~317–325  

`classList.add("orrery-full")` before WebGL confirmed → LIVE badge can show on poster/2D.

**Fix:** Only set `orrery-full` after `Orrery3D.isWebGL === true` (or never set it here — leave to loader).

### P0-3 · Homepage registers SW on localhost (no `?nosw=1`)

**File:** `website/index.html` ~2216–2221  

`app.js` correctly unregisters on localhost / nosw. **Home does not load app.js** and always registers SW → local :8790 home can lie with stale precache.

**Fix:** Port `app.js` local / `?nosw=1` / unregister logic into the home SW block.

---

## P1 — real product / deploy holes

| ID | Issue | Where |
|----|--------|--------|
| P1-1 | Orrery inject chain stuck at **`?v=703`** while tip is **721** (loader, lite, award, explore-boot) | Multiple JS injects |
| P1-2 | `scale=` in contract/emitter, **never applied** by explore receiver | `explore-boot.js` |
| P1-3 | Hand-built `#m=` fallbacks can drop birth moment / force earth | sky-bridge, chart, moonphase, horoscope |
| P1-4 | Home birth date before WebGL: chip updates, model never re-drives | `ap-scale-ladder.js` `ap-orrery-ready` |
| P1-5 | Unstyled `#ap-home-sky-link`, birth chip, moment-return hook | CSS missing |
| P1-6 | Moment return hook only inside sign panel; hard to discover | `horoscope-page.js` |
| P1-7 | Share cancel → still downloads PNG; status says “shared” on save | `ap-moment-share.js` |
| P1-8 | Share before card paint finishes → “Freeze first” false | `moment-page.js` |
| P1-9 | Chart doorway tiny hit targets (~13–16px mobile); parent `role="img"` kills SR links | chart wheel |
| P1-10 | Scale Ladder: beat order system↔today inverted; **no sticky stage CSS** | index + ladder + observatory CSS |
| P1-11 | `main-lite.css` not network-first; SW `match` lacks `ignoreSearch` | `sw.js` |
| P1-12 | Dead precache `shop-product-cover.jpg` + `.bak` images | `sw.js` |
| P1-13 | CI LH step broken serve path under `working-directory` | `deploy-pages.yml` |
| P1-14 | Sign pages: no model deep-link; compat `?a=&b=` ignored; generator lag vs live | signs + generator |

---

## P2 — polish / a11y / hygiene

- Modal/drawer focus traps missing (shop has the good pattern)
- Planet actions sheet under bottom-nav (z-index)
- Triple primary-button dialects (brass home / aurora tools / electric enchanted)
- main-lite warm shell over Jet·Silver·Aurora tokens
- Single-click on home WebGL opens panel only (dblclick flies) — copy mismatch
- Lite pill listeners not cleaned on destroy
- Weekly phase rows omit `focus=moon`
- Sign-page honesty subtitle hardcodes “live compute” while bank is primary
- `showPersonalSky` exported but unused
- Wave-2 does not assert `getFocusedBody()` after settle

---

## What is solid (do not re-litigate)

1. **`npm test` full suite green** including `test-ap-sky-bridge`
2. **LIVE tip ap-v721** local + live SW match
3. **Emitters** chart/moment/horoscope/moonphase/weekly use APDeepLink/bridge on happy path
4. **UTC bare-ISO → Z** dual-sided on deep-link + explore
5. **Planet-actions click-only** (boot focus does not open panel)
6. **Commerce dormant-honest** — empty fulfil URLs → notify / pending, no LS
7. **Content bank healthy** through 2027-01-06; spine independent of bank
8. **Single WebGL renderer** path (canvas2d lite is intentional handoff)
9. **Docs trust order** after notes hygiene (STATUS / FORWARD-PLAN / contract)
10. **Explore cockpit default closed**

---

## Harmony model (target vs actual)

```
TARGET:  emit → explore#m=&focus= → WebGL holds focus → SW tip busts all assets
ACTUAL:  emit → apply focus → loader Earth dive clobbers focus
         tip scripts 721; orrery chain 703
         home SW registers on localhost
         scale ladder snaps scale but stage scrolls away
         CTA language brass on home/explore, aurora elsewhere
```

---

## Evidence for false confidence

| Gate | Why it can lie |
|------|----------------|
| `npm test` | No browser; no focus settle assert |
| `_wave2-deeplink` | Checks attribute, not `getFocusedBody()` |
| `_diag-click` / `_diag-engine` | Soft exit (no hard fail) |
| Owner eye-check still open | Stage 4 deploy done ≠ product closed |

---

## Related docs

- Extensive upgrade plan: `docs/UPGRADE-REFINE-PLAN-2026-07-13.md`
- Short forward options: `docs/FORWARD-PLAN.md`
- Contract: `docs/MODEL-SURFACE-CONTRACT.md`
- Status: `STATUS.md`
