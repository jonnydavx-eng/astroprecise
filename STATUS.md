# STATUS — AstroPrecise · 2026-07-13

## State
- **Local tip: ap-v750** · SW `website/sw.js` `const V = "ap-v750"`
- **Live:** pushing — PRODUCT RESET (kill brass CTA, full-bleed Earth, punchy atmosphere)
- **Preview:** http://localhost:8790/?nosw=1
- **Verify:** `npm test` green · owner must use **incognito + ?nosw=1**

## ap-v750 — why prior tips looked "the same"
- Brass CTA law in `ap-observatory-home.css` had higher specificity than brand layer → gold button stayed
- Layout was still side-rail observatory (Earth + education panel) — felt unchanged
- Engine zoom/Bloom tweaks were too subtle on a mid-distance Earth rest frame

## Fixes in 750
| Change | Effect |
|--------|--------|
| Kill brass CTA | Electric cyan→violet→magenta pill |
| Full-bleed cast dock | Bottom glass strip, model owns viewport |
| Collapse honest-model panel | Educational wall of text off first paint |
| Closer Earth + thick atmosphere | cam 2.85, FOV 30°, atmo 1.45, punch bloom |
| Copy | "Meet the sky. Own your chart." |

*History: AGENT-HANDOFF.md*
