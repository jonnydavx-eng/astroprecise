# STATUS — AstroPrecise · 2026-07-13

## State
- **Local tip: ap-v722** · SW `website/sw.js` `const V = "ap-v722"`
- **Live:** https://astroprecise.app still **ap-v721** (fetched 2026-07-13)
- **Consensus tip:** **AGREE-IMPLEMENT-LOCAL** for Phase 0 residual close (`docs/CONSENSUS-LOG.md`) — **not AGREE-SHIP**, **not LIVE**
- **Preview:** http://localhost:8790 (`website/`) · `?nosw=1` for clean canary
- Checkout / Deep Reading: **dormant**
- **Coherence:** hard law · skill `coherence` · binding `C:\Users\jonny\dev\coherence\bindings\AstroPrecise.md`

## Phase 0 residual (this continue)
| Item | State |
|------|--------|
| A1 / A1b / A2 / A3 / A4 / A6 | Code present (prior) · static |
| lite `resolveBootFocus` | **Landed** (dirty WT) · hash focus first · no blind Earth clobber |
| m-only → Earth | **Present** in explore-boot |
| wave3 anti-false-green | **Landed** (dirty WT) |
| `npm test` | **PASS** |
| Playwright `test:focus` | **DEFERRED** (browsers / OneDrive -4094) |
| A5 Chrome canary | **PASS via reassert** · settle-alone `getFocusedBody` null (OrbitLab TTL) |
| Intentional commit | **Open** (2 dirty files) |
| Push / LIVE 722 | **Open** · owner gate |

## Dirty (not committed)
- `website/js/lite-orrery.js`
- `tools/visual-check/_wave3-focus-settle.mjs`

## Verify
```text
npm test
# canary (Chrome DevTools or browser console):
# http://127.0.0.1:8790/explore.html?nosw=1#m=now&focus=mars
# after ~2.5s, if null: __apApplyModelDeepLink() then getFocusedBody() === 'mars'
```

## Open / owner
- [ ] Intentional commit residual files (not autosnap) when ready
- [ ] Optional: Playwright browsers off-OneDrive → `npm run test:focus`
- [ ] OrbitLab: durable `getFocusedBody` = focusFrameId \|\| focusPlanetId (no hand-edit GENERATED)
- [ ] Dual-seat **AGREE-SHIP** only after commit decision + owner OK
- [ ] `git push origin main` (no force) → confirm live SW **ap-v722**
- [ ] Training Gate / Phase M only after AGREE-SHIP + live tip

## Suggested next
1. Owner: eye-check explore mars canary URL (opened)
2. Commit residual when happy
3. Push only on explicit owner order after dual-seat ship language
