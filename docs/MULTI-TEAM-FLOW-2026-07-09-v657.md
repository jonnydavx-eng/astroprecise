# Site flow restructure + bugs — ap-v657

**Locked product spine (everywhere):**  
**Cast → Sky → Keep → Daily → Reading → Shop**

## Home chapter order (after v657)
1. `heroChapter` (Cast)
2. `instrumentsChapter` (5-step path — was mid-page)
3. `dailyChapter`
4. `skyChapter`
5. compare / method (secondary)
6. guides · library · match · QA · gallery
7. `shopChapter`

## Chrome alignment
| Surface | Change |
|---------|--------|
| Float nav | Cast · Sky · Keep · Daily · Shop (was Start/Path/Art/Signs/Shop) |
| Instruments | 5 steps matching spine (dropped “signs as step 2”) |
| Bottom tabs | Chart · Sky · Daily · Shop |
| More Explore | Moment badge **Keep** (first item) |
| Footer Tools | Chart · Sky · Moment · Daily · Readings · Shop (+ live `patchToolsCol`) |

## Bugs fixed
| Issue | Fix |
|-------|-----|
| Engine plate stale-load race | `_engineSkyGen` ignore stale onload |
| Outreach `chart.html#deep-reading` | → `shop.html#deep-reading` |
| Chart “what’s next” bazaar | Ordered spine + quiet More row |
| Footer Life Path/Match as peers | Spine tools list |

## Do not thrash
- Orrery bloom / PLANET_VIS
- Export focus trap
- WebGL intro gate
- Primary *words* Chart·Sky·Daily·Readings·Library·Shop (Moment stays Keep/More)

## Remaining (next agent)
1. Static footer HTML still has old Tools until inject runs — OK via `patchToolsCol`
2. Sign mid-body magazine language
3. True birth-timed export sky
4. Horoscope/ephemeris closer copy partially updated only
5. `two-skies-map` id — verify under pdf-only hidden grid
6. Deploy push when ready (SW **ap-v657**)
