# STATUS — AstroPrecise · 2026-06-14

**State:** Engine-correct, feature-rich site. `ap-v62`→`v72` **pushed & live** (commit c237154, deploy-pages.yml → gh-pages). Now executing the **award-worthy upgrade roadmap** (plan: `~/.claude/plans/elegant-popping-zebra.md`). **Phase 1 (foundation) shipped → sw `ap-v73`.**

## Phase 1 — DONE this session (sw ap-v73)
- **RafCore** (`js/raf-core.js`, new): one scroll listener + rAF dispatcher, cached reduced-motion, tiered DPR cap. The 3 duplicate scroll handlers (index inline, app.js, effects.js) now subscribe to it (defensive fallback if absent).
- **Palette unification:** 584 cool→warm token replacements across 42 files + targeted renderer/component fixes (cosmos nebulas, chart wheel planets/aspects/elements, `.ap-orb`, sign cards, ticker, lapis CSS vars). **Audit = 0 retired cool tokens** site-wide.
- **cosmos.js perf:** tiered DPR cap, per-frame nebula gradients → cached offscreen sprites, bright-star halos cached, reduced-motion = one static frame, tab-hidden pause.
- **Mobile orrery:** fixed 300/320/340/420px → fluid `min(86–88vw, …)` + `aspect-ratio:1`; internal DPR via RafCore.
- Verified static-only: `node --check` all JS + sw.js OK; SW V bumped + raf-core precached. **NOT yet eyeballed in a real browser** (headless can't profile rAF/visuals).

## Open / ongoing
- ⚠ **Needs your phone/browser eyeball of ap-v73:** warm palette everywhere (chart wheel, sign cards, orbs — no blue), 60fps on mobile, reduced-motion = static sky, fluid orrery on phone. Hard-refresh / reinstall PWA.
- CLAUDE.md still says "flip Pages source to Actions" — **don't** (peaceiris→gh-pages workflow; just push `main`).
- Shop can't take money (all `fulfilUrl`s blank by design; year-ahead/solar-return have no generator backing).
- Open decisions: storefront (Lemon Squeezy), Deep Reading price (~£39), custom domain (no CNAME). Confirm the exposed Cloudflare token (06-13) was revoked.

## Next phases (roadmap)
- **Phase 1e/4 (deferred):** woff2 self-host + Astronomicon glyph font + Plex Mono numerics + CLS/INP pass (needs font assets + subsetting tool + eyeball).
- **Phase 2 — Signature moment:** scroll-linked cinematic orrery (one continuous sky) + selective bloom/ACES/SMAA (vendored, tiered, honesty-labeled).
- **Phase 3 — Flow & content:** scroll-narrative homepage, post-chart "what's next", Instrument legibility.

*Updated 2026-06-14 after Phase-1 ship (ap-v73). Full history: AGENT-HANDOFF.md + CLAUDE.md here · roadmap: ~/.claude/plans/elegant-popping-zebra.md*
