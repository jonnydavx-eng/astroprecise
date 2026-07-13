# MUST — Team consensus (Observatory Core)

**Locked:** 2026-07-13 · **Non-negotiable going forward.**

## Rule

**No tip ships and no phase is declared complete unless the Core agrees.**

| Ship class | Minimum agreement |
|------------|-------------------|
| **Phase 0 / spine fix** | Implementer (S2/S8) **+** verifier (S12 or second agent) both green on checklist |
| **Phase M model** | S3 + S4 + S5 + S8 + S9 + S1 (owner) for Gate M |
| **Honesty / LIVE** | S5 + S7 + S8 must all sign |
| **Perf / FPS** | S4 can **block ship alone** |
| **Dual WebGL / disc cover** | S3 + S8 can **block ship** |
| **Owner gates** (galaxy, checkout, page kills) | **S1 only** — team cannot “agree past” the owner |

One agent’s confidence ≠ consensus. Majority of one chat ≠ skip Phase 0.

## Consensus log (append per tip)

```markdown
## Tip ap-vNNN · YYYY-MM-DD
- Implementer: <seat/agent>
- Verifier: <seat/agent>
- Checks: [ ] npm test  [ ] focus settle / manual canary  [ ] SW tip  [ ] honesty  [ ] no dual WebGL
- Dissent / vetoes: none | …
- Status: **AGREED** | **BLOCKED**
```

## Phase 0 ap-v722 acceptance (all required)

- [ ] A1 auto-Earth gated on deep-link
- [ ] A1b explore reassert @1200ms
- [ ] A2 cosmic flight no LIVE before WebGL
- [ ] A3 index SW localhost/nosw
- [ ] A4 Surface C injects tip-aligned (722)
- [ ] A5 wave3 / manual `getFocusedBody()==='mars'` after 2.5s
- [ ] A6 SW tip ap-v722; bak precache removed
- [ ] `npm test` green
- [ ] Implementer + verifier **AGREED**

## Speed + surgical precision

- Maximum parallel agents **on non-overlapping files**
- One vertical per agent; absorb into consensus log
- No re-planning Ultimate mid-execute
- False-green banned (attribute-only deep-link ≠ focus hold)

---

*Must-rule · stick forever · 2026-07-13*
