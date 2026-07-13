# Phase 0 — Ready pack (pre-execute)

**Prepared:** 2026-07-13 · **EXECUTED same day**  
**Status:** **Local tip ap-v722 SHIP (consensus AGREE)** — A1–A6 implemented; dual-seat verified.  
**Do not** start Phase M beauty until owner canary green + optional push live.  
**MUST forever:** `docs/TEAM-CONSENSUS-MUST.md`

---

## 1. Baseline proof (this prep pass)

| Check | Result |
|-------|--------|
| Canonical path | `C:\Users\jonny\OneDrive\astroprecise` |
| SW tip | `ap-v721` (`website/sw.js`) |
| Live SW | was ap-v721 (re-check after ship) |
| `npm test` | **All green** (engines + sky-bridge + ephemeris) |
| Local preview | **:8790 up** (started this prep if down) |
| `getFocusedBody` API | **Exists** — `orrery-webgl.js` ~9129 |
| P0-1 still present | `orrery-loader.js` **443–447** auto `focusPlanet('earth')` @1100ms |
| P0-2 still present | `ap-cosmic-flight-tool.js` ~324 early `orrery-full` |
| P0-3 still present | `index.html` **2218–2221** SW register without localhost/nosw |
| Bust skew | Many injects still **`?v=703`** while tip **721** (see §4) |
| Git | `main` ahead of origin with docs + repo-guard snaps (clean before intentional 722 ship) |

---

## 2. Ticket board — execute in order

| ID | Seat | File(s) | Exact work | Proof |
|----|------|---------|------------|-------|
| **A1** | S8 | `website/js/orrery-loader.js` L443–447 | Skip auto-Earth when `data-ap-model-link` / explore hash focus / `page-explore` deep-link; avoid second home dolly if already rest | wave3: mars holds 2s |
| **A1b** | S8 | `website/js/explore-boot.js` | Optional re-assert deep-link ~1200ms after ready | same |
| **A2** | S5/S8 | `website/js/ap-cosmic-flight-tool.js` ~324 | Only `orrery-full` after `Orrery3D.isWebGL === true` | Manual / probe |
| **A3** | S2 | `website/index.html` L2218–2221 | Port `app.js` L1806–1822 pattern: local + `?nosw=1` → unregister, no register | DevTools on 127.0.0.1:8790 |
| **A4** | S4 | See §4 file list | Introduce tip-aligned bust (`721` now → `722` on ship) for Surface C injects first | Network tab; grep `v=703` shrinks |
| **A5** | S12 | `tools/visual-check/_wave3-focus-settle.mjs` + `package.json` `test:ui` | Hard fail if focus ≠ body after 2.5s | `npm run test:ui` exit 1 until A1 green |
| **A6** | S2 | `website/sw.js` | Drop dead/bak precache if present; consider critical network-first for tip JS | Install clean |

**Ship tip after green:** **ap-v722** + STATUS + handoff freeze + `after_project_edit.ps1 -Project "AstroPrecise"`.

### Reference: good SW gate (copy pattern from app.js)

```1806:1822:website/js/app.js
/* SW register — skip on webdriver, localhost, or ?nosw=1 ... */
// local || nosw → getRegistrations → unregister
// else register('sw.js')
```

---

## 3. Verify commands (Phase 0)

```powershell
cd C:\Users\jonny\OneDrive\astroprecise
# Preview (if down)
node website/tools/serve-preview.mjs 8790
# Unit
npm test
# UI spine (will fail wave3 until A1 — expected red → green)
npm run test:ui
# Manual canary after A1
# Open: http://127.0.0.1:8790/explore.html?nosw=1#m=now&focus=mars
# Wait 2.5s → DevTools: Orrery3D.getFocusedBody() === 'mars'
```

**Never trust Cursor in-app browser for WebGL.**

---

## 4. A4 bust inventory (`?v=703` still present)

**Surface C critical (do first for 722):**

| File | What |
|------|------|
| `website/js/orrery-loader.js` | `orrery-webgl.js?v=703` |
| `website/js/lite-orrery.js` | preload webgl 703 |
| `website/js/ap-award-orrery.js` | loader + lite inject 703 |
| `website/js/explore-boot.js` | loader, lite, orrery-visual, cosmic-flight 703 |
| `website/explore.html` | CSS + modulepreload + explore-boot 703 |

**Also 703 (batch in same tip or follow-up):**  
`index.html` (several CSS + home-daily/match), `app.js` / `ap-page-boot.js` deferred CSS, `horoscope-page.js` poster/zodiac.

**Strategy:** Prefer one constant or single replace to **722** when shipping A1–A6 together (tip bump = SW `V` + all Surface C injects).

---

## 5. Owner pack (parallel, not code)

| Doc | Purpose |
|-----|---------|
| `docs/DECISION-LOG.md` | Open DECs (CD path, budget, click grammar, …) |
| `docs/SHOPPING-LIST-PHASE-0-M.md` | Phones, Journey, Resolve, Live cloud |
| `docs/training/TRAINING-GATE-CHECKLIST.md` | Certificates before Phase M hires |
| `docs/OBSERVATORY-CORE-HIRE-TOOLS-SPAWN-2026-07-13.md` | Full hire/tools protocol |

---

## 6. Out of scope until 722 green

- Phase M materials / dust / studio hires  
- Sign page regen  
- Shop checkout  
- OrbitLab free-explore  
- Full site `703→722` if it blocks A1 (minimum = Surface C chain)

---

## 7. Prep complete checklist

- [x] P0 code anchors verified  
- [x] `npm test` green baseline  
- [x] :8790 serving  
- [x] Ticket board with line numbers  
- [x] wave3 settle scaffold (hard gate)  
- [x] Owner DEC + shopping stubs  
- [x] Training checklist stub  
- [ ] **START:** A1 implement  

---

*Ready pack · 2026-07-13 · Next human word: “execute Phase 0” or just start A1*
