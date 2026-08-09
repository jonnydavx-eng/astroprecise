# AstroPrecise — Eclipse Launch Runbook

> **Author:** Kimi (Kimi CLI @ BOOK-T1H4NJ753R), written 1 August 2026 as
> `AstroPrecise-Launch-Runbook.md`. Imported into the canonical repo
> 2026-08-08 by Claude @ BOOK-T1H4NJ753R, with the corrections listed in
> **§0 Corrections on import** below.

**Site:** https://astroprecise.app (GitHub Pages behind Cloudflare; deploy = push to `main`, which fires `.github/workflows/deploy-pages.yml` on any change under `website/**`)
**Eclipse:** Wednesday 12 August 2026 · greatest eclipse 18:46 BST (17:46 UT), off western Iceland · UK maximum 19:05 Edinburgh / 19:12 London / 19:16 Truro (there is no single UK time) · full fact set: `marketing/social-2026-08-12/ECLIPSE-FACTS.md`
**Deploy at time of import:** ap-v813 (measured live 2026-08-08; the source doc said ap-v781)
**Companion doc:** `marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md` (email sequence, social posts, launch-day timeline)

---

## 0. Corrections on import — read this before trusting any number below

Four things in the 1 August source were wrong against the code as it actually stands.
They are fixed in place below; they are listed here so nobody reintroduces them.

**1. The prices were wrong, and badly.** The source told you to create three
Gumroad products at prices the site has never shown. Selling at the source's
numbers would have mispriced every one of them:

| Product | Source doc said | The site actually says | Error |
|---|---|---|---|
| Natal Plate | £29 | **£14** | overstated by £15 |
| Eclipse Set | £21 | **£6** | overstated by £15 |
| Sky Pass | £33 | **£5** | overstated by £28 |

The site's prices are the truth, and they are stated in three places that agree:
`website/js/gumroad-unlock.js` lines 16–20 (the comment block) and 33–39 (the
`GUMROAD_PRODUCTS` table), `website/js/ap-gumroad-bridge.js` lines 13–18, and
`website/shop.html` (the price table at lines 320–324, plus the card prices and
the OG/Twitter meta). **Use the site prices. If you want to change a price,
change the code first, then Gumroad — never the other way round.**

**2. "17/17 suites" was wrong. The real count is 19.** Measured 2026-08-08:
13 `test-*.mjs` at the repo root + 5 `tools/_proof-*.mjs` + `ephemeris-package/test/smoke.test.mjs`.
(Note that `npm test` runs a different, smaller set — 12 of the 13 root suites plus
the ephemeris package; it does not include `test-ephemeris-load-order.mjs` or the
five `_proof-*` scripts. The 19-suite loop in §1c is the full gate.)

**3. The claim that `contact.html` carries a legal-name placeholder is false.**
`website/contact.html` contains no `[FULL LEGAL NAME]` or `[POSTAL ADDRESS]`
placeholder — measured 2026-08-08. The placeholders are real, but they live only in
`website/privacy.html` lines 129 and 131 and `website/terms.html` lines 131 and 132.
The legal table in §2 has been corrected.

**4. The Node path was Kimi's.** The source hardcoded
`.../kimi-desktop/resources/.../node.exe`. This machine has Node on PATH
(`C:\Program Files\nodejs\node.exe`, v24.16.0 as of 2026-08-08). Just use `node`.

---

## 1. Flip-day checklist — turning checkout LIVE

Do these in order when the Gumroad products exist and you're ready to take money.
**Until then, commerce is dormant by design:** all 12 permalink slots read
`REPLACE_ME`, every buy button renders as "Notify me — £x", and nothing can charge
a card. That is the correct state, not a bug.

### 1a. Gumroad dashboard (one-time setup)

1. Create the products at the site's prices:
   - **Eclipse Night Reading £2.99**
   - **Eclipse Set £6**
   - **Full / Deep Reading £12**
   - **Numbered Natal Plate £14**
   - **Sky Pass £5**
2. **License keys: ON** for `eclipse-reading` (and `full-reading` if you gate it the same way — the deep-reading page already verifies `full-reading` keys).
3. **Post-purchase redirect** → `https://astroprecise.app/eclipse.html` (the site picks up the `?license=` return param and unlocks automatically).
4. **Custom checkout fields** (date of birth / time / time zone) on **Natal Plate**, **Eclipse Set** and **Sky Pass** — these three have no post-payment birth-data capture on the site (`detailsForm: ''`), so collect it in Gumroad itself.
5. Paste this sentence into **every product description** (mirrors terms.html, required for the CCR reg. 37 digital-content waiver):
   > "By buying you expressly consent to immediate delivery of this digital content and acknowledge you lose your 14-day cancellation right once delivery begins."
6. Set Gumroad's refund policy to match `refunds.html` (7-day change-of-mind if not accessed; statutory rights for defective content always apply). Link to https://astroprecise.app/refunds.html.

### 1b. Code wiring (5 minutes, two files)

Paste each product's **short permalink code** (the `xxxxx` in `gumroad.com/l/xxxxx`) into BOTH tables. There are **12 `REPLACE_ME` slots** in total, six in each file:

- `website/js/gumroad-unlock.js` lines 33–39 — `GUMROAD_PRODUCTS`
- `website/js/ap-gumroad-bridge.js` lines 13–18 — `PRODUCTS`

Notes:

- `full-reading` is the canonical key for the £12 reading. The `deep-reading` key is an alias for the same product — fill it anyway.
- The moment a real permalink exists, every "Notify me — £x" button on shop/eclipse/deep-reading flips to a live buy link automatically (dormant→live is already built; `isCheckoutReady()` is the switch).
- Already done: `_headers` connect-src includes `https://api.gumroad.com` (the file is inert on GitHub Pages anyway).

### 1c. After ANY code edit (the deploy discipline)

```bash
cd /c/Users/jonny/OneDrive/astroprecise/website
node tools/generate-sw-precache.mjs        # regenerates precache + bumps ap-vNNN
# bump the void-orrery-adapter.js?v=NNN tags on:
#   deep-time.html  eclipse.html  index.html  natal-plate.html  sky-card.html  sky-events.html
cd /c/Users/jonny/OneDrive/astroprecise
for t in test-*.mjs tools/_proof-*.mjs ephemeris-package/test/smoke.test.mjs; do node "$t" || echo "FAIL: $t"; done   # 23 suites, must be 23/23
git add -A && git commit -m "…" && git push origin main
# ~10 min later verify:
curl -s "https://astroprecise.app/sw.js?cb=$(date +%s)" | grep -o 'ap-v[0-9]*' | head -1
node tools/byte-audit.mjs     # served bytes == local dist/ for every deployable path
```

> The source doc said "bump `orrery.js?v=NNN`". Those pages no longer load
> `orrery.js` directly — since the M2 unification they load
> `js/void-orrery-adapter.js`, which boots Orrery3D behind the legacy
> `<void-orrery>` surface and falls back to `orrery.js` on `?engine=legacy`.
> Bump the adapter tag.

### 1d. Keep published prices stable

The site has no pre-scheduled price increase. Keep Gumroad and all public copy at the published £2.99 / £6 / £12 / £14 / £5 prices until the owner deliberately changes the product and code together. Never describe a price as a saving unless someone has actually paid the higher price.

---

## 2. Legal — owner actions before first sale

| # | Action | Where |
|---|--------|-------|
| 1 | Replace `[FULL LEGAL NAME]` and `[POSTAL ADDRESS]` | `website/privacy.html` lines 129 and 131; `website/terms.html` lines 131 and 132. **Not contact.html** — it has no placeholder. |
| 2 | Gumroad refund policy matches refunds.html | Gumroad dashboard (see 1a.6) |
| 3 | Eclipse-dawn list hygiene **after 12 Aug**: delete the segment, or email it once with a fresh-consent invite before marketing to it | Email worker storage (`list.astroprecise.app`) |
| 4 | ICO registration check (UK sole traders processing personal data usually need to register — ~£40/yr) | ico.org.uk |
| 5 | Confirm you're happy with the plate design-asset licence (CC/BY on the shared design assets) | `natal-plate.html` / design repo |

Done already (1 Aug): full UK-GDPR privacy policy (lawful bases, retention table, international transfers, ICO complaints, localStorage truth), Gumroad-seller-of-record terms (reg. 37 waiver, licence keys, numbered-edition definition, 18+, IP licence), refunds.html self-hosted fonts, dev-only `phone-*.html` pages moved out of the deployed site, Amazon affiliate disclosure in terms.

---

## 3. Ops — running the site

**Backups.** `repo-guard` autosnapshots the repo periodically and everything pushes to GitHub. Your real backup is `git log` — nothing exists only on this machine.

**Rollback.** `git revert <bad-sha> && git push origin main` — wait ~10 min, then hard-verify with the sw.js curl above. Never force-push.

**Monitoring cadence (daily through eclipse week):**

- Actions: `curl -s "https://api.github.com/repos/jonnydavx-eng/astroprecise/actions/runs?per_page=1"` → `conclusion` should be `success`.
- Live version: the sw.js curl should match `const V` in `website/sw.js`.
- Deploy integrity: `npm run build && node tools/byte-audit.mjs` — every served path should match local dist/ byte for byte. `node tools/sweep.mjs` is the faster status-code-only check.
- Formspree inbox (contact form) + `contact@astroprecise.app` mailbox — reply within 48h (the site promises it).
- Gumroad dashboard after flip: sales, license-key generation, refund requests.
- GA4 / Umami: traffic to /eclipse.html and /chart.html is the funnel; watch the eclipse-dawn email signups.

**Testing cadence.** Run the 19-suite gate (command in 1c) before every push. It covers the engine maths, houses, edge cases, the orrery adapter, eclipse wiring, shop co-work wiring, sky news, plate verify, and the ephemeris smoke test.

**Known acceptable quirks:**

- Email forms show success unconditionally (the worker POST is `no-cors`, so failures are invisible). Backstop: the address is also saved in the visitor's localStorage (`ap_email_intent`) and can be re-captured. Acceptable for launch.
- License verification is client-side against Gumroad's API — a determined user could bypass it. Fine for a £2.99–£14 product; if it ever matters, move verify behind the Cloudflare worker.
- The cart-wide "pending" modal in the shop sends no email tag (per-product forms do: `shop-natal-plate`, `shop-eclipse-set`, `shop-sky-pass`, `checkout-eclipse-reading`, `checkout-full-reading`, `quiz-cosmic-blueprint`).
- `fulfil-redirect.html` keeps a legacy Typeform allowlist for old product links — inert, harmless.
- **Timezone dropdowns are fixed-offset with no DST history** (`index.html` line 351, nine options; `eclipse.html` lines 141–143, seven options). A UK summer birth entered as "UT / GMT" lands an hour out, which moves the Moon by roughly half a degree and can move the Ascendant by a whole sign. This is an accuracy gap wearing a UX hat — see `docs/DECISION-LOG.md`.

---

## 4. Pre-launch QA checklist (manual, ~30 min)

- [ ] **Orrery on a real phone**: loads, pan/zoom works, no context loss after 5 min idle; then `?nobloom=1` and confirm the kill switch renders; then `?engine=legacy` and confirm the fallback boots.
- [ ] **Enter-key casting**: index + eclipse forms — press Enter in the date field, chart casts.
- [ ] **Chart → eclipse handoff**: cast a chart, tap the gold eclipse CTA, confirm eclipse.html pre-fills DOB/TOB/TZ and auto-renders.
- [ ] **Deep-reading gate**: deep-reading.html shows locked chapters + notify form; `?license=bogus` shows "KEY NOT RECOGNISED"; the free sample (sample-reading.html) still works.
- [ ] **Offline**: load index, go offline, reload — cached page or offline.html (not a browser error).
- [ ] **Contact form**: submit once via Formspree, confirm it lands in the inbox.
- [ ] **OG previews**: paste /, /eclipse.html, /chart.html, /shop.html into a social-preview validator.
- [ ] **Compatibility + moonphase**: enter a bad date — inline error appears (no alert popup), message says "Check the date — use DD/MM/YYYY, between 1900 and 2100."
- [ ] **Eclipse countdown**: eclipse.html counts down to 12 Aug 2026 **17:45:57 UT** = 18:46 BST (`Date.UTC(2026, 7, 12, 17, 45, 57)` in the inline module). That is 17:47:06 TT minus ΔT 69.1 s; the ΔT working is in the comment directly above the constant.

---

## 5. Honest residuals (why this isn't a self-awarded 100)

- Bloom/ACES orrery pipeline is **not yet device-verified** — code-reviewed and gated, but it needs one real-phone pass (checklist above).
- License verify is client-side (see §3).
- No end-to-end purchase test exists yet — it can't, until Gumroad products exist. Do a £0 test purchase on flip day.
- Fixed-offset timezones with no DST history (see §3).
- `index-lite.html` and other utility pages carry thin meta (deliberate — they're utility surfaces, not landing pages).

---

*Source written 1 Aug 2026 by Kimi at deploy ap-v781. Corrected and imported
2026-08-08 by Claude @ BOOK-T1H4NJ753R against deploy ap-v813. Update this doc
when anything above changes — and re-measure before quoting any number in it.*
