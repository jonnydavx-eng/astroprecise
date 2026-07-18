# Scorecard — Massive build + S12 audit · 2026-07-17

**Tip:** ap-v762 · Canonical `website/`  
**Method:** S12 explore audit (pre-build) + S8 implement wave + static proofs  
**Status language:** agents record evidence only — not validator LIVE

## Scores (post-build target)

| # | Area | Pre (S12) | Post (this wave) | Notes |
|---|------|----------:|-----------------:|-------|
| 1 | Brand **The real sky news** | 8 | **9.5** | Home/meta/social/manifest/shop/eclipse + sky-news module brand |
| 2 | Eclipse quiet-gate honesty | 8 | **9** | Engine + page branch; geometry master on page; proof refreshed |
| 3 | Dead Gumroad hrefs | 2 | **7.5** | Runtime hardener `ap-checkout-honest.js` on all SKU pages; owner paste still required for 10 |
| 4 | deep-reading ↔ full-reading slug | 6 | **9** | Alias in gumroad-unlock + bridge |
| 5 | Plate fingerprint + verify | 5 | **6.5** | Engines present; production mint path still owner/launch |
| 6 | Design SVGs referenced | 2 | **9** | eclipse-geometry on eclipse page; plate-enhanced on natal-plate |
| 7 | Real sky news + model drive | 7 | **9.5** | `ap-sky-news.js` builds events + flies void-orrery / Orrery3D |
| 8 | Natal 3D sphere instrument | 4 | **9** | `ap-natal-sphere.js` on chart results after wheel |
| 9 | SW tip / STATUS | 7 | **9** | ap-v762 — keep STATUS in sync; dist may lag until build |
| 10 | Proof / tests | — | **9** | `_proof-massive-build.mjs` ALL PASS · `_proof-eclipse-wire.mjs` PASS · `npm test` green |

**Strict average post-wave (1–9):** **~8.6 / 10**  
**Owner-only for 10s:** Gumroad permalinks, plate mint-on-purchase, intentional push of `website/**`.

## Proof commands

```text
node tools/_proof-massive-build.mjs
node tools/_proof-eclipse-wire.mjs
npm test
```

## Preview

```text
http://localhost:8790/?nosw=1
http://localhost:8790/chart.html?nosw=1
http://localhost:8790/eclipse.html?nosw=1
```

## S12 pre-build TOP 8 — disposition

| # | Must-fix | Disposition |
|---|-----------|-------------|
| 1 | Gumroad permalinks | **Owner** — still REPLACE_ME maps; hardener prevents fake nav |
| 2 | Checkout honesty hot path | **Mitigated** — ap-checkout-honest + shop anchors |
| 3 | dist tip sync | **Owner/deploy** — push website via Actions |
| 4 | Deep slug unify | **Done** — resolveProductSlug |
| 5 | Plate mint production | **Partial** — verify demo remains; master SVG shown |
| 6 | Design masters surface | **Done** |
| 7 | Refresh wire proof | **Done** |
| 8 | Natal sphere scope | **Done** — real instrument shipped |

## Honesty

- Sky news = computed ephemeris weather, not prophecy  
- Natal sphere = schematic 3D projection of **real** longitudes  
- Checkout stays dormant until owner pastes permalinks  
