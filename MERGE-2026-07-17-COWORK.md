# MERGE — 2026-07-17 · Cowork link session → canonical

**What this is:** the launch-critical engines built and tested in the Cowork/Claude-Design workstream, merged additively into the canonical repo. **No existing file was modified** — all files below are new. Website deploys as usual (git add · commit · push → Actions → Pages → astroprecise.app).

## Files landed

| File | What it is | Tests |
|---|---|---|
| `website/js/eclipse-reading.js` | The £2.99 Eclipse Night Reading engine, v2 five-beat: anchor · closest contact (+whole-sign house, ≤2 secondaries) · governs · question · honest close. Quiet chart ⇒ `gateSale:true` — **the empty state gates the sale**. | 19/19 |
| `website/js/reading-templates.json` | Template library AP-READING-2 (voice-locked; mono=computed, serif=meaning; legal line included). | — |
| `website/js/deep-reading.js` | The £12 Deep Reading engine — seven chapters, all computed (frame · three lights · shape · tightest aspects · long arcs · this season's sky · a letter to keep). Honest fallbacks: no birth time ⇒ no houses, dignified note; no transits ⇒ live-edition note. | 18/18 |
| `website/js/deep-templates.json` | Deep Reading templates AP-DEEP-1. | — |
| `website/js/plate-fingerprint.js` | Plate provenance: canonical fingerprint (**AP-FP-1 — format LOCKED, never change key order/rounding once a plate sells**) + append-only hash-chain register + `verifyPlate` recompute. | 10/10 |
| `website/js/gumroad-unlock.js` | Gumroad overlay checkout + license verify + on-load unlock. **Payments = Gumroad** (allows astrology, handles UK/EU VAT — Paddle prohibits the category). Fill `GUMROAD_PRODUCTS` permalinks when the owner creates the products. | — |
| `website/verify.html` | `/verify` page: recomputes the sky in-browser and matches the sealed fingerprint live. Demo plate №001 embedded. | verifies ✓ |

## Canonical facts (cross-checked)
- **Eclipse:** 12 Aug 2026, exact **17:47 UT**, Sun·Moon at **20°08′ Leo** (ecl. lon. **140.133°**) — verified vs astro-seek + NASA path. UK ~91% partial, local peak ~19:05 BST. Perseids peak the same night.
- **Pricing ladder (locked by owner):** free chart/daily → **£2.99** Eclipse Night Reading (→ £4 archive after 12 Aug) → £6 Eclipse Set → **£12** Deep Reading → **£14→£19** numbered Plate → £5 Sky Pass. **Prices only rise via dated editions — never a sale.**
- **House rules:** computed, never fabricated · never charge for anything invented · quiet charts told honestly *before* payment · astrology = tradition for reflection (legal line ships everywhere) · **no brass/gold** in the new identity work.

## Wiring notes (for the next local agent)
1. **Eclipse hub / reading page:** call `buildEclipseReading5(140.133, natal, templates, {local, dark})`; render beats mono/serif per type law; if `gateSale`, show the quiet verdict and do **not** show the £2.99 buy as primary (offer £6 Set path per design-lab pattern).
2. **Deep Reading page:** `buildDeepReading(natal, base, deep, {birth, transits})` — feed today's longitudes from the live ephemeris for CH6.
3. **Checkout:** fill `GUMROAD_PRODUCTS` permalinks → `openCheckout(slug)` → success URL returns `?license=` → `handleUnlockOnLoad` verifies + unlocks. Owner is creating the Gumroad products; run license verify worker-side before launch.
4. **Plate:** on purchase, mint via `fingerprint()` + append to the public register; QR → `/verify/<edition>`. Print pipeline note: **bundle brand fonts locally** for the production PDF (design-lab rehearsal preflighted A3+3 mm bleed, one sheet).
5. Design-lab masters (Glacial Observatory pages: eclipse hub, plate, sky cards, daily card) live in the Claude-Design project "AstroPrecise Design Overhaul" — port markup progressively; engines above are shared.

## Provenance
Built + tested in the Cowork cloud session 16–17 Jul 2026; full decision ledger in the design project (`The Standing Teams.html`, `Full-Bench Audit.html`, re-review 4.7→5.9). Bench scores at merge: design-lab Astro 95/100.
