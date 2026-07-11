# Model-centered structure research (2026-07-09)

## Pattern (NASA Eyes / Stellarium)
- 3D stage fills the viewport; chrome is secondary
- Primary actions dock on the stage (not a marketing form left of a widget)
- Navigation labels the instruments that *use* the sky model

## AP decisions
1. **Orrery dead-center** on home (`left:50%; transform:translate(-50%,-50%)`)
2. **Cast form = glass dock** over bottom of stage (pointer-events so drag still works on model)
3. **Primary tabs:** Explore · Chart · Sky · Daily · Shop
4. **Bottom tabs:** Explore · Chart · Sky · Daily
5. **On-page tools strip:** Explore 3D · Home orrery · Cast · Sky · Daily · My Sky + engine body rail

## Constraints kept
- One ESM Three stack (home + explore only)
- Engine stills on other pages (no dual-Three)
- Tools remain functional
