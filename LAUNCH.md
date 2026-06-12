# AstroPrecise — Launch Readiness

_Assessed 2026-06-12. Verdict: **technically ready to launch the moment it is pushed.** There is no missing backend — the architecture needs none._

## What blocks launch (one thing)

The push. Everything is committed locally on `main` with a matching `gh-pages` mirror staged.

```sh
git -C C:\Users\jonny\OneDrive\astroprecise push origin main gh-pages
```

First push triggers a one-time GitHub browser sign-in (credentials then stored). The site
is live at https://jonnydavx-eng.github.io/astroprecise/ within ~1 minute of the
`gh-pages` push landing.

## Strongly recommended at launch (one click on GitHub)

**Settings → Pages → Source → "GitHub Actions".** Pages currently serves the `gh-pages`
branch; the repo already contains a workflow that deploys `website/` on every push to
`main`. Flipping the source retires the manual mirror step forever and removes the
failure mode where a stale mirror overwrites the live site (this happened on 2026-06-12).

## Back end: none required — by design

| Concern | How it's handled | Cost |
|---|---|---|
| Hosting, TLS, CDN | GitHub Pages | £0 |
| Birth-place search | Open-Meteo geocoder (client-side, no key) | £0 |
| Timezones (incl. historical) | Open-Meteo `timezone=auto` + browser `Intl` tzdata | £0 |
| Astronomy | Computed in-browser (VSOP87/ELP2000 in `ephemeris.js`) | £0 |
| Readings/horoscopes | Deterministic, computed in-browser (`interpretations.js`, `oracle.js`) | £0 |
| Space weather | NOAA SWPC public feeds, fetched client-side | £0 |
| Quantum draw | ANU QRNG public API, honest hardware-entropy fallback | £0 |
| Offline/PWA | `sw.js` versioned cache (bump `V` on cached-asset changes) | £0 |

No accounts, no database, no secrets, no server to monitor. Privacy stance (nothing
personal leaves the browser except the typed place-search text) is a launch *feature* —
keep stating it.

### Future triggers that WOULD need a back end (none needed day one)

| If you want… | You'd need… | Static-friendly alternative |
|---|---|---|
| Accounts / charts synced across devices | Auth + DB (e.g. Supabase/Firebase) | localStorage already persists per device (natal pins do this today) |
| Paid tiers / subscriptions | Stripe + a small server or edge functions | Stripe Payment Links (no server) for one-off gift readings |
| Real LLM-written readings | API proxy holding the key (never ship keys client-side) | Current deterministic readings — already the honest brand position |
| Email capture / newsletter | — | Buttondown / Formspree embed (no server) |
| Heavy traffic on geocoding | Tiny caching proxy | Fine until real scale; Open-Meteo & Photon are generous |

## Optional pre-launch polish (not blocking)

- [ ] **Custom domain** — buy domain → add `CNAME` file to `website/` → DNS `CNAME` to
      `jonnydavx-eng.github.io` → set in repo Settings → Pages. Then update `og:url`,
      `sitemap.xml`, canonicals (currently all point at github.io, which is consistent).
- [ ] **Privacy-friendly analytics** if wanted: GoatCounter/Plausible script tag —
      decide deliberately; current stance is "no analytics" and that is also fine.
- [ ] Submit `sitemap.xml` to Google Search Console after the domain settles.
- [ ] Lighthouse pass on the live URL (local serving skews scores).

## Post-push verification (5 minutes)

1. Hard-refresh the live URL — check `sw.js` shows the new version.
2. Cast a chart for a small village (e.g. Skinningrove) — dropdown, timezone chip, wheel.
3. Homepage: intro plays clean (no debug text), orrery responds; after the chart cast,
   your Sun/Moon/ASC medallions ride the zodiac ring.
4. Instrument page: field weather shows real Kp (never "NaN — Severe storm"),
   Clock of the Spheres ticks, quantum draw states its provenance.
5. 404 check: visit any bad URL → branded "Off the ecliptic" page.

## Rollback

`git revert` the offending commit on `main`, re-mirror `website/` → `gh-pages`, push.
(Or with Pages-on-Actions: revert and push — done.)
