# STATUS — AstroPrecise · 2026-07-13

## State
- **Local tip: ap-v722** · SW `website/sw.js` `const V = "ap-v722"` · Surface C injects `?v=722` (local tree; confirm files before trust)
- Live https://astroprecise.app still **ap-v721** until intentional `git push origin main` + Pages (not cleared for dual-seat ship)
- **Phase 0 code landed local** — **not** “shipped complete”; **no AGREE-SHIP**
- Consensus: **`CODE-ONLY / BLOCK-SHIP`** (`docs/CONSENSUS-LOG.md`) — prior AGREE-SHIP **VOID** (solo multi-hat / false-green)
- **Canary open** (A5 focus hold); residual lite/m-only/focus API seats may still be running — do not invent done
- Preview: :8790 · localhost / `?nosw=1` skips SW on home (A3 intent)
- Checkout / Deep Reading: **dormant**
- **Doc trust:** STATUS → Ultimate plan → CONSENSUS-LOG → TEAM-CONSENSUS-MUST → PHASE-0-READY-PACK
- **Multi-agent rule in force:** never skip Core seats; no solo multi-hat AGREE-SHIP (`docs/TEAM-CONSENSUS-MUST.md`)

## Phase 0 — local code (not dual-seat ship)
Claimed local tip work (verify with independent S12 before any AGREE-SHIP):
- **A1** Auto-Earth @1100ms gated on deep-link / hash (`orrery-loader.js`)
- **A1b** Explore reassert deep-link @80ms + @1200ms (`explore-boot.js`)
- **A2** Cosmic flight `orrery-full` only when `Orrery3D.isWebGL`
- **A3** Home SW matches app.js local/nosw unregister
- **A4** Bust 703→722 Surface C + tip spine assets
- **A5** `npm run test:focus` / wave3 scaffold — **canary still open / not proven ship-green**
- **A6** SW tip 722; bak/cover precache removed

**Open gates before any AGREE-SHIP:** A5 canary · intentional commit · residual lite/m-only/focus API · independent S12 re-verify · real dual seats (not multi-hat)

## Product spine
- Personal Sky: emitters → explore `#m=` → WebGL; **focus must hold** after settle (canary below)
- Contract: `docs/MODEL-SURFACE-CONTRACT.md`
- Ultimate plan: `docs/OBSERVATORY-CORE-ULTIMATE-MASTER-PLAN-2026-07-13.md`
- **MUST consensus:** `docs/TEAM-CONSENSUS-MUST.md` — dual-seat ship required; false AGREE-SHIP banned

## Verify (owner / next session)
```text
npm test
# canary (required before Phase M and before AGREE-SHIP):
# http://127.0.0.1:8790/explore.html?nosw=1#m=now&focus=mars
# wait 2.5s → Orrery3D.getFocusedBody() === 'mars'
# after dual-seat AGREE-SHIP + push: hard-refresh live → SW ap-v722
```

## Open / owner
- [ ] Manual focus canary green (A5) — **blocking ship**
- [ ] Residual implement complete + independent S12 re-verify
- [ ] Real dual-seat consensus (not multi-hat) → only then AGREE-SHIP
- [ ] `git push origin main` when dual-seat green (no force) → confirm Pages + live SW ap-v722
- [ ] DEC-log / shopping list parallel (`docs/DECISION-LOG.md`, `SHOPPING-LIST-PHASE-0-M.md`)
- [ ] Training Gate before Phase M hires
- Checkout URLs when selling; OrbitLab free-explore only if asked

## Suggested next (agents)
1. Code seats finish residuals (honest — may still be in flight)
2. **S12 re-verify** in a **different agent/session** than implementer
3. Dual-seat AGREE only if green; then owner canary + push
4. **Training Gate** certificates
5. **Phase M** only after canary + dual-seat ship + live tip confirmed
6. after_project_edit on served changes

## Verify always
- `npm test` · `npm run test:ui` when Playwright available
- Never trust Cursor in-app browser for WebGL

## Older tips
ap-v721 Personal Sky + ship-harden · ap-v720 Stage 4 · ap-v715 scale ladder  
Full history: AGENT-HANDOFF.md (+ ARCHIVE)
