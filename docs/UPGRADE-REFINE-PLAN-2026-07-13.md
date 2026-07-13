# Extensive upgrade & refine plan — AstroPrecise · 2026-07-13

**Authority:** After notes hygiene + 20-agent regression fleet.  
**Read first:** `STATUS.md` → this file → `docs/REGRESSION-AUDIT-2026-07-13.md` → `docs/MODEL-SURFACE-CONTRACT.md`.  
**Tip baseline:** **ap-v721** LIVE · SHA `6fed17d` · do not re-ship Stages 0–4 deploy as “new product.”

---

## 0. North star

**Make Personal Sky Moment true end-to-end, then refine the observatory into one harmonious instrument.**

Success is not more tips for their own sake. Success is:

1. **Focus lands and stays** (chart doorway / moon / weekly → explore holds that body).  
2. **Cache never lies** (localhost, live, orrery injects, SW tip aligned).  
3. **One visual language** (Jet · Silver · Aurora; one CTA law).  
4. **Tests that catch spine lies** (focus settle, doorway, return hook, TZ).  
5. **Upgrade waves that don’t fork OrbitLab** (engine in OL; wiring in AP).

---

## 1. Non-negotiable laws (every PR)

| Law | Rule |
|-----|------|
| **Honesty** | No LIVE badge without HD WebGL; stills = schematic; no fake checkout |
| **One WebGL** | Single Three ESM path; no UMD `three.min.js` reintroduction |
| **Generated engine** | Never hand-edit `orrery-webgl.js` / orbitlab-* / gaia-sample* — edit **OrbitLab**, then sync |
| **Deep links** | All `#m=` via `APDeepLink` / bridge; no new hand-built hashes |
| **Tip bump** | Any asset ship: `sw.js` V + shared bust constant + `?v=` on injectors |
| **Deploy** | `website/**` → `main` → Actions Pages; **never force-push** |
| **Verify** | `npm test` always; spine changes also `npm run test:ui` after :8790 up |
| **Owner gates** | OrbitLab free-explore, commerce URLs, palette walls, Wave 4 page kills |

---

## 2. Program structure (four tracks)

```
TRACK A  Stabilize spine     (P0 + false-green tests)     ← start here
TRACK B  Close Personal Sky  (emitters, doorway UX, hooks)
TRACK C  Harmonize product   (cache, ladder, tokens, a11y)
TRACK D  Elevate & monetize  (True-Time polish, OrbitLab?, checkout)
```

Tracks A→B are sequential. C can partially parallel B after A lands. D is owner-prioritized.

---

## 3. TRACK A — Stabilize (ap-v722 candidate)

**Goal:** Spine cannot lie. No feature sprawl.

### A1 · Fix auto-Earth clobber (P0-1) — **Day 1**

| Task | Detail |
|------|--------|
| Gate timer | In `orrery-loader.js` `setupHeroPhotorealFrame`: skip `focusPlanet('earth')` when `document.documentElement.hasAttribute('data-ap-model-link')` OR `body.page-explore` OR hash has `focus=` / meaningful `m=` |
| Home race | If already at scale-0 rest frame, do not animate a second dolly to 4.5; or only snap once |
| Re-assert | Optional: after 1100ms on explore, re-call explore deep-link apply |
| Test | Playwright: load `explore.html#m=now&focus=mars`, wait 2s, assert `Orrery3D.getFocusedBody()==='mars'` (hard fail) |

### A2 · Cosmic flight honesty (P0-2) — **Day 1**

- Remove premature `orrery-full` from `ap-cosmic-flight-tool.js`; only after `isWebGL`.  
- Manual smoke: open flight before HD ready → LIVE must stay hidden.

### A3 · Home SW bypass (P0-3) — **Day 1**

- Port `app.js` localhost / `?nosw=1` / unregister into `index.html` SW block.  
- Verify: open `http://127.0.0.1:8790/` → no active SW after settle.

### A4 · Unified asset bust constant — **Day 1–2**

Introduce one constant (e.g. `AP_ASSET_V = '721'` → bump with tip):

| Consumer | Today | Target |
|----------|-------|--------|
| `orrery-loader` ORRERY_MODULE | 703 | tip |
| `lite-orrery` preload | 703 | tip |
| `ap-award-orrery` injects | 703 | tip |
| `explore-boot` + explore.html | 703 / 690 dead | tip |
| index modulepreload webgl | 721 | tip (same) |
| `ap-home-bootstrap` V | 721 | tip |

Ship as **ap-v722** with SW tip bump after code green.

### A5 · Tests that make CI honest — **Day 2**

| Add | Where |
|-----|--------|
| TZ `chartMomentIso` fixtures | `test-ap-sky-bridge.mjs` / new `test-ap-sky-spine.mjs` |
| Focus settle assert | `_wave2-deeplink.mjs` or `_wave3-sky-spine.mjs` |
| Hard exit on `_diag-click` fail | `tools/_diag-click.mjs` |
| Optional CI | serve-preview + wave2/wave3 (after soft LH path fixed) |

### A6 · SW hygiene (bundle with 722)

- `caches.match(..., { ignoreSearch: true })` (or versioned keys strategy).  
- Network-first: `main-lite.css`, tip bridge JS (`ap-deep-link`, `ap-sky-bridge`, `ap-scale-ladder`, `ap-planet-actions`).  
- Drop dead `shop-product-cover.jpg` + `*.bak` from precache; harden generator.  
- Fix deploy-pages LH `serve-preview` path under `working-directory`.

### Track A definition of done

- [ ] Explore `#m=&focus=mars` holds Mars after 2s  
- [ ] Localhost home does not install SW (or unregisters)  
- [ ] Orrery load URL bust matches tip  
- [ ] `npm test` + `npm run test:ui` green with **hard** focus gate  
- [ ] Live tip ap-v722 after intentional push  
- [ ] STATUS / handoff freeze updated  

---

## 4. TRACK B — Close Personal Sky Moment v1

**Goal:** Owner can trust cast → model → freeze → daily return on phone.

### B1 · Emitter purity

- Remove or fix hand-built `#m=` fallbacks (always respect `m` + `focus`, or omit link).  
- Weekly phase events → `focus=moon`.  
- Parse/apply `scale=` **or** drop from contract grammar (prefer apply after focus policy).

### B2 · Chart doorway UX

- Invisible hit pad (≥44 CSS px equivalent in viewBox).  
- After render: change `#natal-wheel` from `role="img"` to `role="group"` (or strip img).  
- Fallback link must include body focus when deep-link missing.  
- Playwright: cast sample → doorway Venus → explore focus.

### B3 · Moment / share / return

- AbortError → no download.  
- Discriminate share vs download status.  
- Paint generation token + disable share until ready.  
- CSS for `.srp-moment-return`; optional above-fold hook on Daily.  
- Seed + assert 7-day TTL in tests.

### B4 · Home personal sky polish

- Re-drive birth date on `ap-orrery-ready` when `birthActive`.  
- CSS for `#ap-home-sky-link` / birth chip.  
- Decide: single-click → focus+panel **or** copy says double-tap to fly.

### B5 · Sitewide remaining emitters (FORWARD-PLAN #1)

Only via `APDeepLink` / bridge:

| Surface | Action |
|---------|--------|
| Sign heroes | Model link under figcaption (`focus=<ruler>`); **back-port generator first** |
| daily-transit | Model CTA if not present |
| Compatibility | Fix or kill `?a=&b=` chips |
| Accuracy / why pages | Model Window honesty mounts only |
| Sign generator | Back-port live CTAs → then regen; never clobber |

### Track B definition of done

- [ ] Owner phone checklist (8 items) signed green  
- [ ] Doorway + freeze + return automated  
- [ ] No hand-built `#m=` in product paths (grep gate optional)  
- [ ] STATUS: “Personal Sky Moment v1 closed”  

---

## 5. TRACK C — Harmonize the observatory

**Goal:** One product feel; no layout/token wars.

### C1 · Scale Ladder truth-up

| Step | Work |
|------|------|
| DOM | Reorder beats: earth → **today** → system → galaxy |
| CSS | Desktop sticky stage + `ap-ladder-away` dock (reconcile `ap-observatory-home` `!important`) |
| Lock | Real `userDriving` on free-zoom; tag ladder events `from:'ladder'` |
| Race | Defer earth reassert until after hero settle |
| Test | Scroll beat system → `getScaleLevel()===2` when live |

*If sticky fights observatory “full lens” too hard: document intentional non-sticky and stop claiming WOW sticky — honesty in STATUS.*

### C2 · Design system collapse

1. **One CTA law** — home/explore adopt `--ap-cta-grad` **or** document museum brass as home-only exception (owner pick).  
2. Merge home layout ownership: structure-clean vs observatory-home (one winner).  
3. Retoken `main-lite` surfaces to jet/silver (kill warm glass shell).  
4. Replace warm hex clusters: shop, horizon, mysky, lifepath, compat fallbacks.  
5. Fallbacks never `#D4B84A` next to gold vars — silver FOUC.

### C3 · Nav IA

- Drive home `contents-nav` from `AP_NAV` or document exception.  
- Drop or hide dead float-nav.  
- Align `app.js` fallback NAV to Observatory spine.  
- Engine-visual chips: optional, not second primary.

### C4 · A11y / mobile chrome

- Focus trap on shared modals / email / drawer (reuse shop pattern).  
- Bottom-nav hide or pad when sheets open (planet-actions, sky-guides).  
- All `.lite-vp-btn` ≥ 44×44, not only observatory.  
- SETTLING / LIVE SKY UNAVAILABLE caption states on Surface C.

### C5 · Dead code / landmines

- Quarantine UMD `three.min.js` from SW.  
- Demote/redirect `index-classic` / clarify cinematic `index-full` role.  
- One caption owner for `#apModelCaption`.  
- Co-start ephemeris with hero bundle (reduce WebGL wait).  
- Lite destroy: remove pill listeners.

### Track C definition of done

- [ ] Visual pass: home → chart → shop feels one brand  
- [ ] Ladder either sticky-working or claim corrected  
- [ ] Lighthouse a11y not regressed (soft CI OK)  
- [ ] Agent docs match reality  

---

## 6. TRACK D — Elevate & monetize (owner-gated)

### D1 · True-Time / masterpiece truth (engine → OrbitLab)

- Birth-hemisphere payoff, GMST spin polish — **OrbitLab first**, then sync.  
- Helio lines must not be labeled plain “aspects.”  
- AP test: ledger hash of 5 GENERATED files vs OrbitLab (add to CI later).

### D2 · Living Observatory polish

- Onboarding: drag · zoom · click planet (copy + hint).  
- Cast always reachable (compressed pill).  
- Keyboard/AT for planet actions.  
- Spatial Phase 2 dome/telescope: **only if owner re-asks**.

### D3 · OrbitLab reunification / free-explore

- **Blocked** until explicit Jonny ask.  
- Protocol: OL implement → dry-run sync → refuse reconcile → AP `?v=` chain → SW.

### D4 · Commerce enablement

- Owner pastes Payhip/PayPal into `AP_MON` / PAYPAL-SETUP.  
- Shared LS filter on chart/compat/quiz.  
- Static featured CTA re-render when live.  
- Config badge `Instant PDF` → `PDF by email` at source.

### D5 · Content bank ops

- CI assert: `manifest.daily.end >= today+30`.  
- Sign-page source-aware subtitle + paint `methodNote`.  
- Confirm weekly `refresh-content-bank.yml` green on main.

---

## 7. Suggested calendar (intensive but sane)

| Phase | Duration | Ship tip | Outcome |
|-------|----------|----------|---------|
| **A Stabilize** | 1–3 days | **ap-v722** | Focus holds; SW/cache truth; honest tests |
| **B Close PSM** | 3–7 days | **ap-v723–725** | Doorway/return/emitters; owner phone sign-off |
| **C Harmonize** | 1–2 weeks | **ap-v726+** | Tokens, ladder, a11y, IA |
| **D Elevate** | Ongoing | as needed | True-Time, OrbitLab?, checkout |

Do **not** start C/D visual rewrites while A is open — “improvements invisible” returns.

---

## 8. Execution protocol (agents)

```text
1. PROJECT-FIRST AstroPrecise
2. Read STATUS + this plan + REGRESSION-AUDIT
3. One slice only (e.g. A1 only)
4. Implement → npm test → test:ui if UI → visual-check if chrome
5. Bump tip if shipping assets
6. after_project_edit.ps1 -Project "AstroPrecise"
7. Prepend handoff freeze row; update STATUS open items
8. Push only when green; never force
```

**Parallelism:** After A1–A3 land, A4–A6 can split across agents; B2/B3 can parallel after A1.

---

## 9. Risk register

| Risk | Mitigation |
|------|------------|
| Focus fix breaks home rest frame | Gate on explore / deep-link attr only; home keeps optional soft Earth |
| Sticky ladder fights full-viewport observatory | Spike CSS 1 day; fall back to honest non-sticky |
| OrbitLab overwrite | Edit ban on GENERATED; ledger test |
| OneDrive / visual-check | Prefer Playwright harness; off-OneDrive tools if blocked |
| Scope thrash | Only this plan + STATUS; Jul 8–11 docs = backlog evidence |
| CI LH broken path | Fix with A6; keep soft until stable |

---

## 10. Out of scope (until asked)

- Full galaxy free-explore as homepage default  
- Spatial Phase 2 dome / telescope geometry  
- Wave 4 page retirements (`index-classic` kill needs sign-off)  
- Android app  
- Full warm-hex purge in one PR (track C phased)  
- Lemon Squeezy revival  

---

## 11. First three commits (recommended start)

1. **`fix(spine): skip auto-Earth when deep-link focus set`** + wave2 focus assert  
2. **`fix(sw): localhost/nosw bypass on index + drop dead precache`**  
3. **`chore(assets): unify orrery inject bust to tip; bump ap-v722`**  

Then owner hard-refresh live + phone pass before Track B feature volume.

---

## 12. Links

| Doc | Role |
|-----|------|
| `docs/REGRESSION-AUDIT-2026-07-13.md` | Findings evidence |
| `docs/FORWARD-PLAN.md` | Short ranked options (still valid; this file expands it) |
| `docs/MODEL-SURFACE-CONTRACT.md` | Surface A/B/C law |
| `docs/UI-UX-SYSTEM-BRIEF-2026-07-11.md` | Design system |
| `docs/ORBITLAB-INTEGRATION-MASTERPLAN-2026-07-09.md` | Engine sync (owner-gated) |
| `docs/ALL-PAGES-IMPROVEMENT-PLAN-2026-07-10.md` | Page backlog (evidence) |
| `STATUS.md` | Live tip + open list |
| `HANDOFF.md` | Short start-here |

---

*Plan authored 2026-07-13 after multi-agent regression fleet. Update this file when a track completes; keep STATUS as the tip ledger.*
