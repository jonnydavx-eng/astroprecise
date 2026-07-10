# Multi-team audit → ap-v655 (2026-07-09)

**Teams:** Brand · Product UX · Motion/Cinema · Web Implementation · Accessibility  
**Money path:** ignored  
**Baseline:** external cold read after v654 (~7.9 design / ~8.3 cinema)

## Team scores (pre-fix)

| Team | Score | Finding |
|------|------:|---------|
| Brand | 8.4 | System holds; dual chrome residual |
| Product UX | 7.6 | Shop multipromise; form good |
| Cinema / 3D | 8.3 | Protect orrery; no thrash |
| Web impl | 7.2 | Stale `?v=`; date group bug |
| A11y | 7.5 | Density residual |

## Section scores (pre → post)

| Section | Pre | Post | What changed |
|---------|----:|-----:|--------------|
| Home hero | 8.0 | **8.3** | Spine bridge removed; chips deferred |
| Chart form | 8.1 | **8.5** | Date error paint fixed; mobile hero collapsed; desktop grid retargeted |
| Chart export trust | 8.3 | **8.6** | On-page honesty under keepsake band |
| Sky | 7.4 | **7.9** | Planets table + weather behind disclosure |
| Shop | 6.9 | **7.8** | Single-promise hero; LCP preload aligned |
| Moment | 8.5 | **8.5** | Cache busts only |
| Signs | 7.5 | **8.0** | CTA spine = Chart → Moment → Daily (×12) |
| Nav | 7.3 | **7.7** | Float “Shop” not “Keep”; vocab note |
| **Overall design** | ~7.9 | **~8.3** | |
| **3D / cinema** | ~8.3 | **~8.3** | Untouched (protect Earth elite) |

## Shipped (true upgrades only)

### P0 correctness
1. `group-date-first` FOCUS_GROUPS + watchField + URL handoff — date error/valid styles paint again  
2. Uniform `?v=655` on polish/observatory/horizon/moment/explore critical paths  
3. SW **ap-v655** (498 entries)  
4. Shop LCP preload matches img query (`?v=655`)

### First-viewport ruthlessness
5. Shop hero: one lede + See the pieces / Sample (no stats wall)  
6. Chart mobile: compact hero, hide subtitle/orbs ≤640px  
7. Home: remove post-cast spine under form; defer secondary chips  
8. Sky: strip first; planets+weather in `<details>`

### Trust + IA consistency
9. Chart keepsake honesty line in UI (matches PNG footer)  
10. Sign bottom CTAs: Cast free / Moment / Daily (all 12)  
11. Nav float Keep → Shop  

### Do-not-touch (honoured)
- orrery-webgl bloom / PLANET_VIS rest  
- Export format menu focus trap  
- WebGL intro gate  

## Verification
- Major routes HTTP 200  
- `node --check` chart-page, orrery, nav-model  
- visual-check `npm run pages` → `ok: true`, issues []  
- `after_project_edit.ps1 -Project AstroPrecise`  

## Gaps remaining (true 9–10)
1. Birth-keyed export sky  
2. Shop still multi-card featured (better hero; grid still three products)  
3. Sign SEO body magazine lag  
4. Award-reel continuous motion  
