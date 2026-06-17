# AstroPrecise Launch — Multi-Agent Manifest

Machine-readable task graph: `agents.json`  
One-click lightwork: `AstroPrecise - Launch Lightwork.bat` (repo root)

## Lightwork (run first — any agent)

```powershell
cd C:\Users\jonny\OneDrive\astroprecise
.\tools\launch\launch-lightwork.ps1
```

Or parallel dispatch:

| Agent | Script | Output |
|-------|--------|--------|
| Copy pack | `node tools/launch/build-copy-pack.mjs` | `launch-output/` |
| Outreach export | `node tools/export-outreach.mjs` | `outreach-exports/` |
| Prep check | `node tools/launch/lightwork-check.mjs` | pass/fail report |

## Phase order (do not skip)

```
lightwork → owner-social + owner-search (parallel)
         → seo-content + directories (parallel, agents)
         → postiz (after social accounts)
         → spike (HN + Reddit, Jonny)
         → compound (daily social)
         → product-hunt (L+22)
         → paid (gate: 1 organic Lemon Squeezy sale)
```

## Squad ownership

| Squad | Owner | Paste from |
|-------|-------|------------|
| SEO & indexing | Grok / Claude | `launch-output/search-engines/` |
| Directory batch | any agent | `launch-output/directories/` |
| Social accounts | **Jonny** | `launch-output/social-bios/` |
| Postiz schedule | Hermes / Grok | `tools/schedule-free-traffic.ps1` |
| Spike week | **Jonny** + Grok | `launch-output/spike/` |
| Product Hunt | **Jonny** | `launch-output/product-hunt/` |
| Paid ads | **Jonny** | gate in `agents.json` |

## Heavy work (not lightwork — next waves)

- `website/what-is-my-moon-sign.html` — SEO squad
- `website/big-three-astrology.html` — SEO squad
- `website/mercury-retrograde-2026.html` — SEO squad (timely: Rx Jun 29)
- Screen-record 7 TikTok shorts — social squad
- Product Hunt gallery images — design squad

## Handoff

After lightwork completes, append to `AGENT-HANDOFF.md`:

`| YYYY-MM-DD HH:MM | Grok | Launch lightwork pack generated (launch-output/) | Owner: social accounts + GSC checklist |`