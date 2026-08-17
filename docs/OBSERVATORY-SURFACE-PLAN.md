# Observatory Surface Plan — cloud-first · build · then shop products

**For:** Jonny · AstroPrecise · tip ap-v876 · revised 2026-08-17  
**Supersedes:** earlier §5–§6 order in this file, and the React Three Fiber paste.  
**Owner law:** no React · WebGL only · one WebGL context per page · no gate on the live sky · no UFO brand · **no new SKUs and no live checkout until the 3D gift is built and you have looked** · Night you were born (`NIGHT-YOU-WERE-BORN.md`).

**Sequence (this is the law of the plan):**

```
1. Cloud agents build the 3D / Keep path (local PRs, fold in, no push)
2. You look on laptop + phone
3. Shop research (major) — already started in parallel as research only
4. Products / SKUs — ONLY after step 2, chosen to fit the finished 3D design
```

Research may run beside the build. Listing, pricing, Gumroad paste, and new products may not.

---

## Phase 0 — Cloud agents first (armed)

Owner has asked for cloud credits to start here. Spawn **three** non-overlapping cloud agents. Fold PRs into local. **Do not push `origin/main`.** Close leftover PRs 16–23 without merge after `gh auth login`.

| Agent | Job | Exact scope | Forbidden |
|---|---|---|---|
| **A — Sky-card / Keep path** | House-fit sky card + quiet Keep links from Observatory / Chart / Deep reading | `website/sky-card.html`, `website/js/ap-sky-card.js`, keep links on `index.html` / `chart.html` / `deep-reading.html`, IANA honesty | No React · no shop · no SKUs · no push · no second WebGL |
| **B — Birth-hour still wire** | Wire Keep → existing authored still (Earth marked, no HUD in frame) | Call existing `applyAuthoredBirthHourStill(jd)` in `orrery-webgl.js` (~7054); `ap-keep-sky.js` caption + SCHEMATIC honesty on saved PNG | Do **not** rebuild the camera · no HUD in still · no React · no push |
| **C — Shop research only** | Major market / packaging research for what could sell **after** the gift exists | New doc only: `docs/SHOP-RESEARCH-2026-08.md` (competitors, price bands, formats that fit a 3D keep object, what to retire) | **No code** · **no SKUs** · **no Gumroad edits** · **no shop.html product invent** · no Stripe |

### Agent A brief (paste into Cursor Cloud)

```
AstroPrecise website/ only. No React. No push.
House-fit sky-card.html to the home look (nav, tokens, IANA place, refuse UTC/GMT as birth zone).
Add quiet Keep-this-sky links from index Observatory, chart, deep-reading — no new folder.
Honesty: unknown time must say what is missing.
PR only. Do not invent SKUs. Do not edit shop products.
```

### Agent B brief

```
AstroPrecise website/ only. No React. No push.
applyAuthoredBirthHourStill(jd) already exists in orrery-webgl.js — wire the Keep path to call it with the birth JD.
Still: Earth marked, no HUD/nav in the saved frame. Caption: date, place, time, camera.
Saved PNG is Surface A — SCHEMATIC or no LIVE badge (MODEL-SURFACE-CONTRACT).
Do not rebuild the camera. Do not add a second WebGL context.
PR only.
```

### Agent C brief

```
Research only. Write docs/SHOP-RESEARCH-2026-08.md.
Question: after Night-you-were-born (3D still + sky card + deep reading) exists, what should AstroPrecise sell?
Cover: comparable digital birth-sky / natal gifts, price bands, print vs digital vs combo, what fits a full-viewport Observatory brand, what to do with Eclipse £7.
Do NOT invent SKUs, edit Gumroad, edit shop.html commerce, or recommend checkout now.
End with: "Products wait until Jonny has looked at the built Keep path."
```

Polar clamp note for whoever touches camera later: `clampCamToLevel()` clamps **radius only**; elevation clamps live in drag handlers — tighten there if needed, not by assuming level-clamp owns elevation.

---

## Phase 1 — Local fold + look (after cloud PRs)

1. Fold A + B into local tip. Bump `sw.js` `V` + `?v=` together if assets change.  
2. `npm test` / `npm run test:ui` as needed.  
3. You look: laptop + phone 390. Free play must still work without paying.  
4. Only then open Phase 3 product decisions.

Hard stops: no React tree · leftover rooms stay off front path · no push without you.

---

## Phase 2 — Shop research (major, parallel, non-shipping)

Agent C owns the research file. Local may deepen it. Required sections in `docs/SHOP-RESEARCH-2026-08.md`:

1. **What exists today** — Eclipse £7 Gumroad only; natal reading has no SKU; quiet charts unsold; `CATALOGUE.md` / `SHOP-AUDIT.md` / `MONETIZATION.md` are not truth.  
2. **Comparables** — birth chart / sky gift / digital still + reading products (price, format, promise, honesty failures to avoid).  
3. **Fit to the new 3D design** — score each candidate against the Keep object (still + card + reading), Observatory brand, no merch, no UFO.  
4. **Eclipse £7** — keep as test, retire, or fold into the gift later — recommendation only, no listing change.  
5. **Price bands** — direction only; no Gumroad SKU text.  
6. **Explicit wait gate** — “No product goes live until the Keep path is built and Jonny has looked.”

Research may recommend. It may not ship.

---

## Phase 3 — Products after the product (owner gate)

**Trigger:** Phase 1 look done. Keep path yields still + card + reading for one birth minute.

Then, and only then:

1. Pick **one** primary paid object that matches the finished 3D design (not a catalogue dump).  
2. You paste Gumroad / listing copy (owner-only).  
3. Shop page shows only what is real. No invented SKUs.  
4. Eclipse £7 handled per research + your call.  
5. Couples stays a separate product — do not fold into the gift SKU.

Until Phase 3 trigger: shop hold stands.

---

## Surface / engine (unchanged architecture)

| Job | House |
|---|---|
| Full-viewport 3D | Surface C · `index.html` · `orrery-webgl.js` |
| Camera / focus | Existing adapter owner + `focusPlanet` / authored still |
| Keep PNG | `ap-keep-sky.js` · Surface A honesty |
| Nodes | `earth` · `system_hour` · `chart` · `reading` · `sky_card` · `couples` — not lab hardware |
| HUD | Glass `--ap-*` · house language (System / Inner / Earth) — after Keep path works |

Full mapping from the dead R3F paste: earlier “What stays, what dies” table still applies. Do not create `components/`.

---

## Done when

- Cloud A + B folded; Keep path works free-to-play.  
- You have looked.  
- Shop research file exists and names what fits the **built** 3D gift.  
- No new SKU until that look.  
- No React under `website/`.
