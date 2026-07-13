# Consensus log — Observatory Core

See **`docs/TEAM-CONSENSUS-MUST.md`** for the permanent must-rule.

---

## CONSENSUS · ap-v722 · 2026-07-13

| Field | Value |
|-------|--------|
| **Tip** | **ap-v722** |
| **Phase** | 0 (stabilize spine) |
| **Scope tickets** | A1, A1b, A2, A3, A4, A5 scaffold, A6 |
| **Implementer** | S2/S8 · Grok |
| **Verifier** | S12 · verify agent · **AGREE** (all 6 items PASS) |
| **Honesty dual** | S5+S8 · **AGREE** |
| **Diff summary** | `orrery-loader.js` A1 gate; `explore-boot.js` A1b 1200ms; `ap-cosmic-flight-tool.js` A2; `index.html` A3 SW; Surface C + tip injects `?v=722`; `sw.js` ap-v722 + bak/cover removed; `package.json` test:focus/wave3 |
| **Proof** | `npm test` **green**; static checks PASS; wave3 browser install blocked by OneDrive errno -4094 (manual canary required) |
| **Honesty veto** | CLEAR (S5) |
| **Perf veto** | CLEAR (bust aligned; no new load) |
| **Engine veto** | CLEAR (no GENERATED hand-edit) |
| **Decision** | **AGREE-SHIP** (local tip); live after intentional push + owner hard-refresh |
| **Deferred** | Full Playwright wave3 on this machine until Playwright browsers hydrate off OneDrive freeze; owner phone canary |
| **Next phase allowed?** | **Training Gate** next; **not** Phase M beauty until canary green |

### Signatures
- Implementer: S2/S8 · Grok · **AGREE**
- Verifier: S12 · **AGREE**
- Honesty: S5+S8 · **AGREE**

### Residual (logged, non-blocking ship of local tip)
- Homepage deep-link reassert only via attr/hash skip (explore has A1b)
- Manual: `explore.html?nosw=1#m=now&focus=mars` → 2.5s → `getFocusedBody()==='mars'`
- Push to origin when owner ready (repo ahead with docs + tip)

---

*Append new tip blocks above this line going forward.*
