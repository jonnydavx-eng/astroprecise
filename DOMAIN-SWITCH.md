# AstroPrecise — Custom-Domain Switch Plan

**Purpose:** Move AstroPrecise off the GitHub Pages subpath
`https://jonnydavx-eng.github.io/astroprecise/` and onto a custom apex domain served
at the **origin root** (`https://<domain>/`).

**Why this is a Play Store TWA prerequisite:** A Trusted Web Activity verifies
ownership via **Digital Asset Links** (`/.well-known/assetlinks.json`), which the
browser/Play **only fetches from the origin ROOT** — `https://<domain>/.well-known/assetlinks.json`.
On a `github.io` project site the app lives under the `/astroprecise/` **subpath**, and
there is no way to place a file at `jonnydavx-eng.github.io/.well-known/` (that root
belongs to the user's GitHub profile page, not this project). So the TWA cannot be
verified until AstroPrecise sits at a domain root. The custom domain also fixes
`start_url`/`scope` so they can be `/` instead of `/astroprecise/`.

This document is domain-agnostic. It uses **`astroprecise.app`** as a clearly-marked
**RECOMMENDED PLACEHOLDER** throughout — replace it with the final chosen domain
everywhere it appears. Nothing here commits to a registrar or a domain until step 0
is done.

---

## 0. Choose & confirm the domain (do FIRST)

- **RECOMMENDED placeholder:** `astroprecise.app`
  - `.app` is a Google-owned TLD that is **HSTS-preloaded** — HTTPS is mandatory, which
    is exactly what a TWA needs and signals "real app". Short, brandable, on-topic.
  - **Cost note:** `.app` carries an annual fee (no free option); HTTPS is forced (fine,
    GitHub Pages issues a free cert).
- **Alternatives to check at the same time** (buy whichever is available, in this order):
  1. `astroprecise.app` (recommended)
  2. `astroprecise.com` (most universally recognised; check availability — may be taken)
  3. `astroprecise.co.uk` (cheap, fits the UK sole-trader status; weaker for a global app)
- **Action:** Check availability of all three at a registrar (Cloudflare Registrar,
  Namecheap, Porkbun, etc.) BEFORE editing any code. Pick one. From here on, wherever
  this doc says `astroprecise.app`, substitute the **actual** domain you bought.
- **Registrar tip:** A registrar that lets you set **apex A records + a CNAME** is
  required (all the ones above do). Cloudflare Registrar is at-cost and has a clean DNS
  UI; if you use Cloudflare DNS, set the records to **"DNS only" (grey cloud)** for the
  apex A records during initial setup so GitHub can issue its cert without proxy
  interference (you can enable proxy later if desired, but grey-cloud is simplest).

> Everything below assumes the apex (`astroprecise.app`, no `/astroprecise/` subpath)
> is the new canonical origin, with `www.astroprecise.app` redirecting to it.

---

## 1. Complete inventory of hardcoded `jonnydavx-eng.github.io` references

This is the exact mechanical find-replace set. **212 occurrences across 39 files.**

### 1a. The global replacement

In every `.html`, `sitemap.xml`, and `robots.txt`, the literal string

```
https://jonnydavx-eng.github.io/astroprecise
```

becomes

```
https://astroprecise.app
```

(Note: the trailing `/astroprecise` segment is **dropped** — the app moves from a
subpath to the apex root. So `.../astroprecise/chart.html` → `https://astroprecise.app/chart.html`,
and `.../astroprecise/` → `https://astroprecise.app/`.)

A single global find-and-replace of the string `https://jonnydavx-eng.github.io/astroprecise`
→ `https://astroprecise.app` across `website/**/*.html`, `website/sitemap.xml`, and
`website/robots.txt` handles **all** of the HTML/sitemap/robots hits below correctly,
because every one of them includes that full prefix. Verify with a follow-up grep for
`github.io` returning **zero** matches in shipped files afterward (the only allowed
remaining hit is the build tool — see 1d).

### 1b. Per-file inventory by reference type

Every HTML page carries the same four-to-six-line head block. The pattern per page:

| Reference type | Tag / form | Notes |
|---|---|---|
| `og:url` | `<meta property="og:url" content="…/PAGE.html" />` | per-page absolute URL |
| canonical | `<link rel="canonical" href="…/PAGE.html" />` | per-page absolute URL |
| `og:image` | `<meta property="og:image" content="…/img/og-banner-*" />` | **absolute** image URL — must be updated or social cards break |
| `twitter:image` | `<meta name="twitter:image" content="…/img/og-banner-*" />` | absolute image URL (not on every page) |
| JSON-LD `url` / `item` | `<script type="application/ld+json">…</script>` | BreadcrumbList `item`, WebPage `url`, WebSite `url`, isPartOf |

**Content / tool pages** (og:url + canonical + og:image + twitter:image, some with JSON-LD):

| File | Lines | What |
|---|---|---|
| `index.html` | 16, 17, 18, 26 | og:url, canonical, og:image, twitter:image (no JSON-LD block) |
| `links.html` | 18, 19, 20 | og:url, canonical, og:image |
| `compatibility.html` | 18, 19, 20, 24 | og:url, canonical, og:image, twitter:image |
| `lifepath.html` | 18, 19, 20 | og:url, canonical, og:image |
| `charts.html` | 18, 19, 20, 24, 37, 45 | og:url, canonical, og:image, twitter:image, JSON-LD `url`, JSON-LD nested `url` |
| `chart.html` | 18, 19, 20, 24 | og:url, canonical, og:image, twitter:image |
| `ephemeris.html` | 18, 19, 20 | og:url, canonical, og:image |
| `why.html` | 18, 19, 20, 24, (30) | og:url, canonical, og:image, twitter:image, JSON-LD |
| `retrograde.html` | 18, 19, 20, 24, 32 | og:url, canonical, og:image, twitter:image, JSON-LD BreadcrumbList (Home + page item) |
| `what-is-my-rising-sign.html` | 18, 19, 20, 24, (31), 32 | og:url, canonical, og:image, twitter:image, JSON-LD BreadcrumbList |
| `angel-numbers.html` | 18, 19, 20, 24, 40, 42 | og:url, canonical, og:image, twitter:image, JSON-LD `url`, JSON-LD isPartOf WebSite `url` |
| `accuracy.html` | 18, 19, 20, 24, (31), (32) | og:url, canonical, og:image, twitter:image, JSON-LD |
| `name-numerology.html` | 18, 19, 20, 24 | og:url, canonical, og:image, twitter:image |
| `moonphase.html` | 18, 19, 20, 24, 38 | og:url, canonical, og:image, twitter:image, JSON-LD `url` |
| `quiz.html` | 18, 19, 20, 24, (31), (32) | og:url, canonical, og:image, twitter:image, JSON-LD |
| `transits.html` | 18, 19, 20, 24 | og:url, canonical, og:image, twitter:image |
| `profile.html` | 18, 19, 20, 24 | og:url, canonical, og:image, twitter:image |
| `horoscope.html` | 18, 19, 20, 24 | og:url, canonical, og:image, twitter:image |
| `solar-return.html` | 18, 19, 20, 24, (31), 32 | og:url, canonical, og:image, twitter:image, JSON-LD BreadcrumbList |
| `shop.html` | 16, 17, 18 | og:url, canonical, og:image |
| `synastry.html` | 18, 19, 20, 24, (31), 32 | og:url, canonical, og:image, twitter:image, JSON-LD BreadcrumbList |
| `tonight.html` | 18, 19, 20, 24, (31) | og:url, canonical, og:image, twitter:image, JSON-LD |
| `privacy.html` | 8 | canonical only |
| `terms.html` | 8 | canonical only |

*(parenthesised line numbers are JSON-LD blocks that grep flagged as "long matching line";
the global string replace covers them regardless.)*

**Zodiac sign pages** (×12 — `aries`, `taurus`, `gemini`, `cancer`, `leo`, `virgo`,
`libra`, `scorpio`, `sagittarius`, `capricorn`, `aquarius`, `pisces`):
each has the identical pattern at **lines 8, 18, 19, 23, (26), 27**:

| Line | What |
|---|---|
| 8 | canonical |
| 18 | og:url |
| 19 | og:image (these use `img/og-banner.png`, not the `-improved.jpg`) |
| 23 | twitter:image (`img/og-banner.png`) |
| 26 | JSON-LD (long line) |
| 27 | JSON-LD BreadcrumbList — `item` for Home (`…/index.html`) + the sign page |

> ⚠️ The 12 sign pages are **generated** by `tools/generate-sign-pages.mjs` — do NOT
> hand-edit them as the canonical fix. Edit the generator's `BASE_URL` (see 1d) and
> regenerate. (You may still hand-patch them once for the immediate switch, but the
> generator must also be fixed or the next regen reverts them.)

**`sitemap.xml`** — 34 `<loc>` entries, lines 4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54,
59, 64, 69, 74, 79, 84, 89, 94, 99, 104, 109, 114, 119, 124, 129, 134, 139, 144, 149,
154, 159, 164, 169. Every `<loc>` is an absolute `…/astroprecise/PAGE.html` URL — all
must change to `https://astroprecise.app/PAGE.html`.

**`robots.txt`** — line 4: `Sitemap: https://jonnydavx-eng.github.io/astroprecise/sitemap.xml`
→ `Sitemap: https://astroprecise.app/sitemap.xml`.

### 1c. `manifest.json` — subpath fields (NOT a github.io string, but MUST change)

`manifest.json` does **not** contain `github.io`, but it hardcodes the **subpath** in
two fields that must move to the apex root:

| Line | Field | Current | New |
|---|---|---|---|
| 5 | `start_url` | `"/astroprecise/"` | `"/"` |
| 33 | `scope` | `"/astroprecise/"` | `"/"` |

These are **critical for the TWA** — the TWA's verified scope must match the served
origin root. (Icon `src` values are relative — `img/icon-192.png` etc. — and need no
change.) See section 2 for the full manifest audit.

### 1d. Build tool — fix so regeneration doesn't revert the sign pages

| File | Line | What | Fix |
|---|---|---|---|
| `website/tools/generate-sign-pages.mjs` | 14 | `const BASE_URL = 'https://jonnydavx-eng.github.io/astroprecise';` | `const BASE_URL = 'https://astroprecise.app';` |

This is the **only** non-shipped file with the string (it is excluded from deploy via
`exclude_assets: 'tools'` in the workflow), but it MUST be updated or re-running the
generator rewrites the 12 sign pages back to the github.io URL.

### 1e. Files that are already domain-agnostic (NO change needed — verified)

- `sw.js` — uses `self.location.origin` / `self.location.hostname` for the same-origin
  check and **relative** precache paths (`./index.html`, `./js/...`). Domain-portable as
  is. (Still bump `V` at the end — see step 8.)
- `js/app.js` line 1014 — `navigator.serviceWorker.register('sw.js')` is a **relative**
  path. Correct at any origin.
- `404.html` — no github.io / scope / SW references. No change.
- All other `js/*.js` — no hardcoded origin found.

---

## 2. `manifest.json` audit (TWA quality)

Current contents (`website/manifest.json`):

| Field | Current value | TWA verdict |
|---|---|---|
| `name` | `"AstroPrecise — Birth Charts & Horoscopes"` | OK |
| `short_name` | `"AstroPrecise"` | OK (≤12 chars, fine for launcher) |
| `description` | present | OK |
| `start_url` | `"/astroprecise/"` | ❌ **must become `/`** (see 1c) |
| `scope` | `"/astroprecise/"` | ❌ **must become `/`** (see 1c) |
| `display` | `"standalone"` | OK for TWA |
| `orientation` | `"portrait-primary"` | OK |
| `theme_color` | `"#090b16"` (void) | OK — matches brand |
| `background_color` | `"#090b16"` | OK — splash screen colour |
| `categories` | `["lifestyle", "entertainment"]` | OK |
| `lang` / `dir` | `"en"` / `"ltr"` | OK |

**Icons (current):**

| src | sizes | purpose | file on disk? |
|---|---|---|---|
| `img/icon-192.png` | 192×192 | `any` | ✅ 9.3KB |
| `img/icon-512.png` | 512×512 | `any` | ✅ 27KB |
| `img/icon-maskable-512.png` | 512×512 | `maskable` | ✅ 22KB |

✅ **A separate `purpose:"maskable"` 512 icon EXISTS** (`icon-maskable-512.png`,
referenced on manifest line 24–28 and present on disk). This is the single most
common TWA-submission blocker and it is **already satisfied** — good. Also present but
not in the manifest: `apple-touch-icon.png` (iOS), `favicon.svg`, `logo.svg`,
`og-banner.png`, `og-banner-improved.jpg`.

**Gaps / nice-to-haves for TWA quality (none blocking except start_url/scope):**

1. **`id` field — recommended.** Add `"id": "/"` (or `"/?app"`). PWA `id` stabilises the
   app identity across `start_url` changes; since `start_url` is changing in this very
   migration, setting an explicit `id` now avoids a future identity churn.
2. **No maskable 192** — only the 512 is maskable. Optional; a maskable 512 is
   sufficient for Play/Bubblewrap, but adding a `192×192 purpose:"maskable"` improves
   adaptive-icon rendering on older launchers. Low priority.
3. **No `screenshots`** — not required for a TWA, but `screenshots` (with `form_factor`)
   unlock the richer install UI on Chrome/Play. Optional, post-launch polish.
4. **No `shortcuts`** — optional app-icon long-press jump links (e.g. Birth Chart, Today's
   Sky). Nice for TWA polish, not required.

So the only **mandatory** manifest edits for the switch are `start_url` and `scope` → `/`
(section 1c). Adding `id` is strongly recommended to do at the same time.

---

## 3. The switch recipe (order of operations)

Placeholder domain `astroprecise.app` throughout — substitute the real one.

### Step 0 — Buy the domain
Pick & purchase per section 0. Have registrar DNS access ready.

### Step 1 — Add the `CNAME` file (in `website/`, the deploy source)
- **There is currently NO `CNAME` file** (verified — none in `website/`, none at repo
  root). Create `website/CNAME` containing exactly one line, the bare apex host, **no
  scheme, no path, no trailing slash, no www**:
  ```
  astroprecise.app
  ```
- This file must end up at the **served root** of the Pages site. Because deploy mirrors
  `website/` → `gh-pages` root (per the repo CLAUDE.md), putting `CNAME` in `website/`
  lands it at the root. (If you later switch Pages to "GitHub Actions" source, the
  workflow already publishes `./website`, so the same `website/CNAME` works.)
- GitHub writes/expects this file; setting the custom domain in the UI (next step) will
  also create it, but committing it ourselves keeps it from being lost on the next deploy.

### Step 2 — Set the custom domain in GitHub Pages
- Repo → **Settings → Pages → Custom domain** → enter `astroprecise.app` → Save.
- Leave **Enforce HTTPS** unchecked for now — it greys out until the cert is issued
  (step 4).

### Step 3 — DNS records at the registrar
Create these on `astroprecise.app`:

- **Apex (`@`) — four A records** to GitHub Pages' IPs:
  ```
  185.199.108.153
  185.199.109.153
  185.199.110.153
  185.199.111.153
  ```
  (Optionally also the four AAAA/IPv6 records GitHub publishes, but the four A records
  are sufficient.)
- **`www` — one CNAME** → `jonnydavx-eng.github.io` (the GitHub Pages host, **not**
  `astroprecise.app`; trailing dot allowed). This makes `www.astroprecise.app` resolve and
  GitHub auto-redirects it to the apex.
- If using Cloudflare DNS: set the apex A records to **DNS-only (grey cloud)** initially
  so GitHub's cert issuance (HTTP-01/TLS) isn't intercepted by the proxy.

### Step 4 — Wait for DNS propagation + HTTPS certificate
- DNS propagation: minutes to a few hours (occasionally up to 24–48h on slow TTLs).
- GitHub then provisions a free **Let's Encrypt** cert automatically. The Pages settings
  page shows "DNS check successful" then issues the cert (often <1h after DNS resolves,
  sometimes up to 24h).
- When the cert is ready, **tick "Enforce HTTPS"** in Settings → Pages.
- **Do not edit the in-page URLs (steps 5–7) until `https://astroprecise.app/` actually
  loads with a valid cert** — otherwise you ship canonicals pointing at a host that
  doesn't serve yet.

### Step 5 — Update all step-1 URLs (the mechanical replace)
- Global replace `https://jonnydavx-eng.github.io/astroprecise` →
  `https://astroprecise.app` across `website/**/*.html` (covers og:url, canonical,
  og:image, twitter:image, all JSON-LD `url`/`item`/isPartOf).
- Update `website/robots.txt` line 4.
- Update `website/tools/generate-sign-pages.mjs` line 14 `BASE_URL`, then **regenerate the
  12 sign pages** (or hand-patch them once and fix the generator so they don't revert).
- Update `manifest.json`: `start_url` → `"/"`, `scope` → `"/"`, and add `"id": "/"`.
- **Verify:** grep for `github.io` across `website/` → must return **zero** hits in
  shipped files (sole permitted remaining hit: none — the tool file is fixed too).

### Step 6 — Update `sitemap.xml`
- Replace all 34 `<loc>` entries' prefix to `https://astroprecise.app/…` (covered by the
  same global string replace if run over `sitemap.xml`).

### Step 7 — Add `.well-known/assetlinks.json` (TWA placeholder)
- **No `.well-known/` dir exists yet** (verified). Create `website/.well-known/assetlinks.json`.
- The **SHA-256 fingerprint comes LATER** from **Play Console → App Signing** (the "App
  signing key certificate" SHA-256), once the app is uploaded. So commit a placeholder
  now and fill the real fingerprint after the first Play upload. Skeleton:
  ```json
  [{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.astroprecise",
      "sha256_cert_fingerprints": ["REPLACE_WITH_PLAY_APP_SIGNING_SHA256"]
    }
  }]
  ```
- It must be served at exactly `https://astroprecise.app/.well-known/assetlinks.json`
  (origin root — the whole reason for this migration). Confirm GitHub Pages serves the
  `.well-known/` dir (it does; the leading-dot dir is published normally).
- **Gotcha:** Bubblewrap/Play uses the **App Signing key** SHA-256 (Google re-signs the
  app), **not** your local upload/debug keystore's. Use the one from Play Console App
  Signing, or asset-link verification silently fails and the TWA shows a browser URL bar.

### Step 8 — Bump service-worker cache version + redeploy
- In `sw.js`, bump `const V = 'ap-v63';` → `'ap-v64'`. This forces every returning
  visitor's old cache (which has the github.io-era HTML) to be discarded on next load.
- Commit, deploy (mirror `website/` → `gh-pages` root, push — per repo CLAUDE.md), and
  log the change in `astroprecise/AGENT-HANDOFF.md`.
- After deploy: hard-load `https://astroprecise.app/`, confirm cert, confirm
  `/.well-known/assetlinks.json` and `/manifest.json` (with `start_url:"/"`) load at the
  root, and re-submit `https://astroprecise.app/sitemap.xml` in Google Search Console as a
  new property.

---

## 4. Keep the old `github.io` URL working?

**Yes — and it happens automatically; do nothing to disable it.**

Once a custom domain is set on a GitHub Pages site, GitHub **automatically 301-redirects**
the old `https://jonnydavx-eng.github.io/astroprecise/...` URLs to the same path on the
custom domain (`https://astroprecise.app/...`). So:

- Existing inbound links, bookmarks, and already-indexed pages keep working and pass link
  equity to the new domain via the 301s.
- The updated **canonical** tags (step 5) tell search engines the apex is now the source
  of truth, so the redirect + canonical combination cleanly consolidates SEO onto the new
  domain.
- **Do NOT** remove the repo or unpublish Pages — the redirect is served by the same Pages
  deployment. Leave it in place indefinitely.
- One caveat: returning PWA users who installed from the github.io subpath have a SW scoped
  to `/astroprecise/`; the `V` bump (step 8) + the 301 will migrate them on next visit, but
  the cleanest path is the new install from the apex (which is also what the TWA wraps).

---

## 5. Gotchas checklist

- **The subpath problem (the whole point):** assetlinks MUST be at origin root —
  unreachable on the github.io project subpath. Resolved only by the custom apex domain.
- **`og:image` / `twitter:image` are ABSOLUTE URLs** — if you update canonical/og:url but
  forget the image URLs, social share cards 404 their preview image. The global string
  replace catches them; verify zero `github.io` remain.
- **DNS propagation + cert lag:** don't flip the in-page canonicals before
  `https://astroprecise.app/` serves with a valid cert (step 4 gate). Enforce HTTPS only
  after the cert issues.
- **SW cache staleness:** bump `V` (step 8) or returning visitors get the old
  github.io-URL HTML from cache.
- **Sign pages are generated:** fix `generate-sign-pages.mjs` `BASE_URL` or the next
  regen reverts all 12.
- **manifest `start_url`/`scope` must be `/`** (not `/astroprecise/`) at the apex, or the
  PWA/TWA scope won't match the served root and install/verification breaks.
- **assetlinks SHA-256 = Play App Signing key**, not your local keystore — placeholder now,
  real value after first Play upload.
- **CNAME content format:** bare host only (`astroprecise.app`) — no `https://`, no path,
  no `www`, no trailing slash; and it must land at the served root (put it in `website/`).
- **Cloudflare proxy:** grey-cloud the apex A records during cert issuance.
- **`www` CNAME target is the github.io host**, not the apex (a common DNS mistake).

---

## 6. One-line summary

Buy `astroprecise.app` (confirm vs `.com`/`.co.uk`) → add `website/CNAME` → set custom
domain in Pages + 4 apex A records (185.199.108–111.153) + `www` CNAME →
`jonnydavx-eng.github.io` → wait for HTTPS cert → global-replace
`https://jonnydavx-eng.github.io/astroprecise` → `https://astroprecise.app` across all HTML
+ sitemap + robots + generator `BASE_URL`, set manifest `start_url`/`scope` to `/` (+ add
`id`) → add `.well-known/assetlinks.json` (SHA-256 later from Play App Signing) → bump
`sw.js` `V` → deploy. Old github.io URLs auto-301 to the new domain — leave them be.
