# Structure Clean — Astro Precise (2026-07-10)

**Trigger:** Owner: “none of this works clean — site doesn’t look clean or structured — major work.”  
**Evidence:** Local `:8790` Playwright captures + metrics (`tools/visual-check/out/structure-2026-07-10/`).

## Diagnosis (measured, not opinion)

| Surface | Problem | Metric |
|---------|---------|--------|
| Home desktop | Cast form clipped / at fold edge; orrery deck below fold; dual chrome (masthead + contents-nav + Tools FAB) | form bottom **926** @ 900vh; deck top **982**; body **~13.2k px** |
| Home mobile | Form **fully below fold**; deck + Earth eat first screen; 6-link nav is 2 rows | form top **1102** @ ~844vh; body **~17.5k px** |
| Home IA | 12 full chapters, marketing essays, duplicate trust strips | 12 `section`s; 12 h2s |
| Chart | Form OK; primary CTA often below fold | body ~4k |
| Horoscope | List-first OK; sparse low-contrast cards | — |
| Product debt | Wave 0–2 feature add-ons stacked on a **bloated marketing home** | Live still ap-v657; wave branch has more layers |

**Root cause:** years of additive chapters + CSS wars (critical CSS + `ap-model-stage` + horizon + polish) without a single **spine length budget**. Features (deep links, honesty, engine) are real — the **page composition is not**.

## Target IA (home)

**Above the fold (one job):** living sky + cast your chart (date → go).  
**Below the fold (max 4 blocks):**

1. **Path** — 5 links only (Explore · Chart · Sky · Moment · Daily), not a novel  
2. **Daily** — personalised strip if chart saved, else one line → horoscope  
3. **Shop** — 2–3 SKUs honest/dormant  
4. **Footer** — legal + spine  

**Collapsed / removed from main scroll (details or other pages only):**

- compareChapter, methodChapter, skyGuidesWrap, matchChapter, qaChapter, obsGalleryChapter  
- libraryChapter → link row to horoscope + sign sample (not 12-card wall)  
- skyChapter full plate → link to ephemeris  

**Success metrics (gates):**

| Gate | Pass |
|------|------|
| Home desktop bodyH | **≤ 5500 px** (was ~13200) |
| Home mobile bodyH | **≤ 7000 px** (was ~17500) |
| Desktop: form submit fully in first viewport | `submit.bottom ≤ vh - 8` |
| Mobile: form submit fully in first viewport | same |
| Visible home chapters | **≤ 5** primary (hero + path + daily + shop + optional one) |

## Non-goals (this pass)

- No new SKUs, no new engine features  
- No sign-page regen  
- No deploy until structure gates pass + owner eye-check  

## Execution order

1. **Structure CSS + home collapse** ✅ — `ap-structure-clean.css` last in cascade  
2. Hero first-viewport fix ✅  
3. Compact instruments path ✅  
4. Chart + Daily density pass ✅ (2026-07-10 Grok cont.)  
   - Chart: Calculate **above** Advanced; mobile strip time-accuracy + optional name; always-collapsed advanced  
   - Daily: shorter hero lead; high-contrast sign cards; hide Tools FAB  
5. Re-shoot structure metrics ✅ — all primary CTAs in first viewport (desk+mob)  
6. Shop + nav chrome ✅ (phase 3, ap-v696)  
   - Shop: hide free-tools / how-it-works / sticky chips / engine strip / email banner; clamp featured copy  
   - Nav: hide float-nav when bottom-nav exists; pad body for tab bar  
7. Moment + Explore ✅ (phase 4, ap-v697)  
   - Moment: compact hero, hide gallery/spine essay, hide title field on mobile, Freeze in first viewport  
   - Explore: legend starts collapsed always; quiet deck; cast CTA visible  
8. Bugs + instrument pages ✅ (phase 5, ap-v699)  
   - Transits: kill planet-grid `min-height:1080px` bug; compact cards; hide edu essay / email banner  
   - Sky: denser hero; hide email/engine footer bloat  
   - Home: bottom-nav inject (home never loaded app.js); Tools FAB disabled sitewide  
   - app.js bottom-nav also accepts masthead pages  

### Gates (verified)

| Gate | Result |
|------|--------|
| Home cast in view desk/mob | PASS |
| Home bottom-nav on phone | PASS |
| Chart Calculate desk/mob | PASS |
| Daily sign cards in first view | PASS |
| Home chapters | **4** (hero/path/daily/shop) |
| Shop bodyH desk ≤4200 / mob ≤4800 | **~2969 / ~4045** |
| Transits bodyH desk ≤5500 / mob ≤7000 | **~5004 / ~6722** (was ~8.6k / ~12k) |
| Sky mob ≤5200 | **~4427** |
| Tools FAB gone | PASS |
| Wave2 + phase2 + bug-hunt | PASS (this session) |
| Home Earth rest scale 0 | PASS |
| Daily mob bodyH ≤4800 | **~3471** (was ~6.7k) |

9. Earth rest + Daily slim ✅ (phase 6, ap-v701)
   - orrery-webgl home embed settles to Earth terminator frame
   - Daily dial/subscribe/footer bulk cut

## Governance

- Prefer **hide/collapse** over delete (SEO FAQ can stay in page as collapsed details later)  
- One Three.js stack still home+explore only  
- SW bump after CSS/HTML  
- `after_project_edit.ps1 -Project "AstroPrecise"`  
