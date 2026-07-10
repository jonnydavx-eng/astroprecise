# AstroPrecise Hero / Orrery — Deep Study & Improvement Roadmap

*Tier: DEEP · Protocol: CORTEX-RESEARCH-PROTOCOL v3 · Agent: Grok · 2026-07-08*
*Evidence: ap-v640→v643 fixes, multi-agent CSS/JS audits, Playwright audits (1440/1280/1024/390), owner screenshots, AGENT-HANDOFF.md*

**Training cutoff note:** Product facts after the study date should be re-verified from repo + live site.

---

## Target

Homepage hero (`website/index.html`) with HD WebGL Earth (`orrery-webgl.js` / `Orrery3D`) — layout, boot timing, mobile structure, and polish **without** swapping the engine.

**Canonical:** `C:\Users\jonny\OneDrive\astroprecise\website` · Preview `:8790` · Live `https://astroprecise.app`

**Current shipped fix:** **ap-v643** — overlap/structure verified (overlap 10/10, structure audit exit 0).

---

## Current state [verified: repo + audits]

### What works now
- Photoreal Earth fades in over calm loader; `orrery-full` gates loader retirement (v640).
- Deck HUD (scale strip, pills, journey/flight) reveals **with** `orrery-full` via `revealHeroDeckHud()` (v643).
- Desktop deck anchored `top: 100%` — grows **down** into `--hero-deck-bay` padding, not into copy.
- Mobile flex order: eyebrow → H1 → standfirst → form → trust → chips → Earth → deck.
- Overlap tooling: `tools/visual-check/hud-v642-overlap.mjs`, `hero-structure-audit.mjs`.

### Residual gaps [verified: audits + screenshots]
| Gap | Severity | Evidence |
|-----|----------|----------|
| CSS generational debt (v546/v570/v575/v577/v640/v642/v643 layers) | Medium | 20+ conflicting rule pairs in agent audit |
| `--hero-deck-bay` is static clamp, not measured deck height | Medium | Deck ~177px; bay clamp may drift when time/scrub restored |
| Tools FAB can overlap hero copy on mid-viewport mobile scroll | Low | 390px shots — mitigated with trust padding, not IO-based |
| No visual regression baseline for hero post-v643 | Medium | Screenshots exist in `out/hero-structure-v643/` but not in `baseline/` |
| `explore.html` may still use old reveal timing | Medium | Same loader pattern; not audited this session |
| Real S24 confirmation not re-run for v643 | Low | v633 protocol exists; owner confirm pending |
| Live site may lag local (v643 push status unknown) | Ops | Owner screenshots were live pre-v641 |

### Boot timeline (capable desktop) [verified: orrery-loader.js + ap-award-orrery.js]

```
T0  inline: ap-await-webgl → loader on, wheel hidden
T2  wrap.hidden=false → lite pills/scrub visible (deck shell)
T?  ephemeris: heroLivePill text (desktop skips today chip JS)
T4  ap-orrery-ready → wire listeners only (v643)
T5  +520ms Earth frame → orrery-full + revealHeroDeckHud()
T6  orrery-live → loader fade (requires orrery-full)
```

**Invariant for future work:** Any DOM change that alters deck **height** must land in the same turn as the CSS class that reserves vertical space.

---

## Architecture lessons (store as patterns)

### P1 — Layout state machine, not CSS patches
Treat `html` classes (`ap-await-webgl`, `ap-lite-hero`, `orrery-full`, `orrery-live`) as a **finite state machine**. Each state has:
- allowed deck children visible
- `--hero-deck-bay` value
- deck anchor (`top:100%` desktop / `relative` mobile)

**Anti-pattern:** Revealing HUD chrome on an earlier event than the padding state (root cause of v640–v642 bugs).

### P2 — One vertical contract
- **Section** `#heroChapter` owns `--hero-deck-bay` padding-bottom.
- **Page-wrap** should NOT also pad-bottom (v642 double-bookkeeping — removed in v643).
- **Deck** is page-wrap child; `top:100%` on desktop drops into section padding.

### P3 — `display:contents` requires explicit orders
On mobile, `.hero-copy { display: contents }` lifts children into flex flow. **Every** child needs `order` or it defaults to 0 and jumps above the headline.

### P4 — Global vs scoped controls
`.lite-vp-controls` is `position:absolute` globally (orrery viewport). Deck override must set `position:static; top:auto; left:auto` — any regression floats pills over the globe at z-index 6.

### P5 — Audit semantics
Deck-internal overlaps (strip ∩ pills) are **not** bugs. External checks only: copy, form, chips, globe, FAB, trust.

### P6 — Critical inline CSS is part of the layout system
`index.html` inline block must mirror `--hero-deck-bay`, `hero-copy z-index:4`, and orrery-full padding or first paint jumps when full CSS loads.

### P7 — Same engine constraint
User explicitly forbids swapping WebGL Earth. All improvements are **chrome, layout, boot, and progressive disclosure** — not `orrery-webgl.js` rewrites unless unavoidable.

---

## Ranked improvements

| # | Improvement | Impact | Diff | Conf | Risk | First step |
|---|-------------|--------|------|------|------|------------|
| 1 | **Hero CSS consolidation (ap-v650)** — single `@layer hero` block; delete dead rules; document FSM | 4 | 4 | 5 | 3 | grep all `#heroChapter` rules into one file section; remove L3278-style dead selectors |
| 2 | **Dynamic deck bay** — `ResizeObserver` on `#orrery-lite-deck` sets `--hero-deck-bay` from measured height + 24px | 5 | 3 | 4 | 2 | 20-line module in `ap-home-bootstrap.js`; desktop only |
| 3 | **Boot FSM Playwright test** — assert class order + deck visibility at 2s/5s/9s | 4 | 2 | 5 | 1 | extend `hero-structure-audit.mjs` with pre-full snapshot |
| 4 | **Visual regression baseline** — `baseline:save` hero-structure-v643 PNGs | 3 | 1 | 5 | 1 | `npm run baseline:save` in visual-check |
| 5 | **Explore parity** — share `revealHeroDeckHud` + bay token on `explore.html` | 3 | 2 | 4 | 2 | audit explore boot path |
| 6 | **Mobile deck compaction** — hide journey/flight until first scale change; 2-row deck | 4 | 3 | 3 | 2 | CSS `html.orrery-full` mobile + one `@media` block |
| 7 | **FAB hero guard** — `IntersectionObserver` hides `.ap-finder-fab` while `#heroChapter` >50% visible | 3 | 2 | 4 | 2 | small script in index inline or ap-site-polish |
| 8 | **S24 Tailscale verify** — owner protocol from v633 on v643 | 4 | 1 | 3 | 1 | serve :8799, screenshot on device |
| 9 | **Copy polish at Earth rest** — live pill + explore only; spine/today already hidden desktop | 2 | 1 | 5 | 1 | design review only |
| 10 | **LCP / boot** — defer `setupEnrichedOrrery` listeners until first pointerdown | 3 | 3 | 3 | 3 | profile with Chrome MCP web-perf |

*Scales: Impact/Difficulty/Confidence/Risk 1–5 per CORTEX-RESEARCH-PROTOCOL.*

---

## Killed in red-team

| Idea | Cause of death |
|------|----------------|
| Swap to 2D/canvas-only hero | User mandate: keep HD WebGL Earth |
| Move deck outside `.page-wrap` | HTML restructure; breaks `:has([hidden])` guard |
| Hide entire deck until click | Regresses affordance; explore/chart funnel suffers |
| `bottom:0` deck anchor on orrery-full | Reintroduces upward growth into copy (v642 regression) |
| Simulate overlap tests from code review | Owner screenshots proved code-only inference wrong |

---

## Open questions / blockers

1. **Push state** — Is `main` / gh-pages at ap-v643 on live? Confirm before next visual compare.
2. **Owner S24** — One real-device screenshot after v643 still valuable (emulation missed v631 nav wrap).
3. **Time/scrub row** — Keep restored on desktop at System scale or collapse to save ~40px bay?
4. **When to refactor CSS** — ap-v650 is ~4h; schedule before next hero feature, not during conversion experiments.

---

## Verification checklist (any future hero touch)

```bash
cd OneDrive/astroprecise
node tools/visual-check/hud-v642-overlap.mjs      # 10/10 desktop
node tools/visual-check/hero-structure-audit.mjs  # exit 0 all viewports
node tools/visual-check/mobile-structure-audit.mjs http://127.0.0.1:8790
npm test
# bump sw.js + ?v= + orrery-loader ?v=
powershell OneDrive/control-panel/after_project_edit.ps1 -Project AstroPrecise
```

---

## File map (hero touch surfaces)

| Concern | Primary files |
|---------|---------------|
| Layout CSS | `css/ap-horizon-2026.css` (v570–v643 layers) |
| Critical paint | `index.html` inline `#ap-award-critical-palette` block |
| Boot / reveal | `js/orrery-loader.js`, `js/ap-award-orrery.js` |
| Chips / dateline | `index.html` inline scripts |
| Engine (do not swap) | `js/orrery-webgl.js` |
| Audits | `tools/visual-check/hud-v642-overlap.mjs`, `hero-structure-audit.mjs` |

---

*Stored for Machine Cortex, Claude Code, Hermes. Adopted into CORTEX-MEMORY + SHARED-BRAIN 2026-07-08.*