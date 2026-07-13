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

## PERMANENT — Never skip multi-agent Core seats (2026-07-13 owner order)

**Orchestrator MUST spawn real Core seats** for non-trivial Phase work:

| Seat | Role in ship |
|------|----------------|
| **S8** | Implement (code) |
| **S12** | Verify in a **different agent/session** than the implementer |
| **S5** | Honesty — **not** the implementer |
| **S4** | Perf (may veto alone) |
| **S2** | Process / docs / repo gates |

**Forbidden:**

- One agent signing multiple seats as **AGREE-SHIP** (solo multi-hat)
- Orchestrator wearing implementer + verifier + honesty alone
- False-green checklists (“all PASS”) without independent seat proof
- Declaring **AGREE-SHIP** while A5 canary / residual implement is still open

**Dual-seat ship required.** False AGREE-SHIP is banned.  
Prior ap-v722 AGREE-SHIP log entry is **VOID** — see `docs/CONSENSUS-LOG.md` (**CODE-ONLY / BLOCK-SHIP**).

## Consensus log (append per tip)

```markdown
## Tip ap-vNNN · YYYY-MM-DD
- Implementer: <seat/agent>
- Verifier: <seat/agent>   <!-- MUST be different agent/session than implementer -->
- Honesty: <seat/agent>    <!-- MUST NOT be implementer alone -->
- Checks: [ ] npm test  [ ] focus settle / manual canary  [ ] SW tip  [ ] honesty  [ ] no dual WebGL
- Dissent / vetoes: none | …
- Status: **AGREED** | **BLOCKED** | **CODE-ONLY**
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
- [ ] Implementer + **independent** verifier **AGREED** (no multi-hat)
- [ ] Residuals (lite / m-only / focus API) closed or explicitly deferred by dual seats

**A5 checkbox stays unchecked until proven** (canary or automated focus hold). Do not check it for scaffold-only or “browser blocked” excuses.

Current tip status: **CODE-ONLY / BLOCK-SHIP** — not AGREE-SHIP.

## Speed + surgical precision

- Maximum parallel agents **on non-overlapping files**
- One vertical per agent; absorb into consensus log
- No re-planning Ultimate mid-execute
- False-green banned (attribute-only deep-link ≠ focus hold)

---

*Must-rule · stick forever · 2026-07-13 · multi-agent never-skip same day*
