# STATUS — AstroPrecise

**State:** Friday 14 Aug 2026 night (Europe/London). Local only. Live site stays as-is. Do not push.

## Now
- Local tip: `cba32b4` on `main`, tracking `origin/audit-improve-20260814`, ahead 23. Not pushed. Live site stays as-is.
- Measured while writing this: machine HEAD is `11f9f0d` (repo-guard autosnapshot after `cba32b4`), ahead 24. Still not pushed.
- Runtime: `AP_ASSET_V=874`, `sw.js` `ap-v874`
- Product: one house, live 3D Observatory on index, couples two clocks, real planet maps in progress
- Next product / gift: night-you-were-born = sky-card + deep-reading + one Observatory still (solar-system-that-hour, Earth marked, no HUD). Plan: `NIGHT-YOU-WERE-BORN.md`
- Shop hold: Eclipse Edition £7 test only. No new SKUs. No live checkout.
- Overnight 14–15 Aug: Cursor PRs in flight — 17 birth-hour still, 18 gift/sky-card, plus couples, phone, maps, leftover house-fit. Fold into local when they land. No push.

## Retired (off the front path)
quiz, angel numbers, name numerology, sun-sign grid, Daily, `moment.html`, natal-plate

## Hard rules
no React, WebGL only, no gate on the sky, no UFO brand

## Not current truth
Do not treat `CATALOGUE.md`, `SHOP-AUDIT.md`, or `MONETIZATION.md` as current. They still list invented / old SKUs and checkout paths. No new SKUs.

Older 8–12 Aug stamps in git history (ap-v813 / v833 / v847 / v849 / v850 live-or-local claims) are superseded.

⚠️ **Deploy warning:** pushing to `origin/main` auto-deploys production via `.github/workflows/deploy-pages.yml` on changes under `website/**` (plus a named list including `tools/build.mjs` and most root test suites). Do not push without the owner's say-so.
