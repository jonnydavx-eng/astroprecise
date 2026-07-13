# STATUS — AstroPrecise · 2026-07-13

## State
- **Local tip: ap-v722** · SW `website/sw.js` `const V = "ap-v722"` · Surface C injects `?v=722`
- Live https://astroprecise.app may still be **ap-v721** until intentional `git push origin main` + Pages
- Phase 0 spine fixes **implemented** + dual-seat consensus **AGREE-SHIP** (`docs/CONSENSUS-LOG.md`)
- Preview: :8790 · localhost / `?nosw=1` skips SW on home (A3)
- Checkout / Deep Reading: **dormant**
- **Doc trust:** STATUS → Ultimate plan → CONSENSUS-LOG → TEAM-CONSENSUS-MUST → PHASE-0-READY-PACK

## Phase 0 shipped (this tip)
- **A1** Auto-Earth @1100ms gated on deep-link / hash (`orrery-loader.js`)
- **A1b** Explore reassert deep-link @80ms + @1200ms (`explore-boot.js`)
- **A2** Cosmic flight `orrery-full` only when `Orrery3D.isWebGL`
- **A3** Home SW matches app.js local/nosw unregister
- **A4** Bust 703→722 Surface C + tip spine assets
- **A5** `npm run test:focus` / wave3 scaffold wired into `test:ui`
- **A6** SW tip 722; bak/cover precache removed

## Product spine
- Personal Sky: emitters → explore `#m=` → WebGL; **focus must hold** after settle (canary below)
- Contract: `docs/MODEL-SURFACE-CONTRACT.md`
- Ultimate plan: `docs/OBSERVATORY-CORE-ULTIMATE-MASTER-PLAN-2026-07-13.md`
- **MUST consensus:** `docs/TEAM-CONSENSUS-MUST.md` — team must agree before every tip

## Verify (owner / next session)
```text
npm test
# canary (required before Phase M):
# http://127.0.0.1:8790/explore.html?nosw=1#m=now&focus=mars
# wait 2.5s → Orrery3D.getFocusedBody() === 'mars'
# after push: hard-refresh live → SW ap-v722
```

## Open / owner
- [ ] Manual focus canary green (if Playwright browsers blocked by OneDrive)
- [ ] `git push origin main` when ready (no force) → confirm Pages + live SW ap-v722
- [ ] DEC-log / shopping list parallel (`docs/DECISION-LOG.md`, `SHOPPING-LIST-PHASE-0-M.md`)
- [ ] Training Gate before Phase M hires
- Checkout URLs when selling; OrbitLab free-explore only if asked

## Suggested next (agents)
1. Owner canary + push when green
2. **Training Gate** certificates
3. **Phase M** only after canary + live tip confirmed
4. after_project_edit on served changes

## Verify always
- `npm test` · `npm run test:ui` when Playwright available
- Never trust Cursor in-app browser for WebGL

## Older tips
ap-v721 Personal Sky + ship-harden · ap-v720 Stage 4 · ap-v715 scale ladder  
Full history: AGENT-HANDOFF.md (+ ARCHIVE)
