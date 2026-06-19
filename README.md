# AstroPrecise

Real astronomy, used as orientation — birth charts, horoscopes, synastry, transits,
and **The Instrument** (light-cone, zenith star, echo dates, daimon, quantum draw,
field weather). Every number is computed from the real sky, in the browser, with
sources labelled and unavailable feeds honestly marked.

**Live site:** https://jonnydavx-eng.github.io/astroprecise/

## Repository layout

| Path | What it is |
|---|---|
| `website/` | **The product.** Static PWA — no build step, vanilla JS modules, hand-written HTML. See `CLAUDE.md` for module map and conventions. |
| `ephemeris-package/` | Standalone NPM package of the astronomy engine (VSOP87/ELP2000). `cd ephemeris-package && npm test` to test, `npm run sync` to regenerate `ephemeris.cjs` from `website/js/ephemeris.js`. |
| `app/` + `build.gradle.kts`, `gradle/`, `gradlew*` | Android app (Kotlin 2.0, Jetpack Compose, Hilt). `./gradlew assembleDebug` — needs JDK 17+ and the Android SDK. |
| `landing/` | Single-file landing page from the Android-app era (pre-dates `website/`). Previewed via `./preview.sh --landing`. Not deployed anywhere. |
| `AstroPrecise-Desktop/` | End-user launcher kit (double-click shortcuts to the live site / local preview). |
| `launch.sh` / `launch.bat` | Dev preview: serve `website/` on **http://localhost:8790** (override with `PORT`). `launch.sh --install` adds a Linux desktop icon. |
| `preview.sh` | Android helper: build the APK and run it on a device/emulator. |
| `add-to-desktop.sh` | Self-contained Linux desktop-icon installer (embeds its own icon). |

## Develop & deploy (website)

There is no build step — edit files in `website/`, refresh the browser.

```sh
./launch.sh        # or launch.bat on Windows → http://localhost:8790
```

**Deploying:** GitHub Pages currently serves the **`gh-pages` branch from its root**.
To publish, copy the changed files from `website/` onto `gh-pages` and push:

```sh
git worktree add /tmp/gh gh-pages
rsync -a --delete --exclude .git website/ /tmp/gh/
cd /tmp/gh && git add -A && git commit -m "Publish website" && git push origin gh-pages
```

> ⚠ `.github/workflows/deploy-pages.yml` exists but does nothing while the Pages
> source is set to "branch". Switching the repo's Pages source to **GitHub Actions**
> (Settings → Pages) would make every push of `website/**` to `main` deploy
> automatically and retire the manual copy above.

When you change any precached asset, bump `const V` in `website/sw.js` or returning
visitors keep the old files.

## Conventions

Honesty (never fake data), determinism (same inputs → same reading), privacy
(everything computes client-side; the only external calls are labelled public
feeds — NOAA SWPC, ANU QRNG, Open-Meteo place search). Full details: `CLAUDE.md`.
