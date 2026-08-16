# Night you were born

One gift. The real solar system at your birth minute, plus a reading you can keep.

Not a generic star poster. Not a UFO brand. Not tees or mugs. Play stays free. We do not gate the live sky.

This is a local Act 1 plan. Do not push. Do not invent SKUs. Do not open checkout.

## How it fits the site

The house already has the pieces. We sit them together. No new folder.

```
Home / Observatory     play the live sky, free
        |
        |  Keep this sky
        v
Chart                  free positions from that minute
        |
        +-- Deep reading     seven chapters, already on the house
        +-- Sky card         keepable 2D card (needs the house look)
        +-- Observatory still  3D solar system that hour, Earth marked, no HUD
        |
        v
Shop                   later, when the gift is actually good
                       hold the eclipse £7 for now
                       no new SKUs until Jonny says
```

Couples is a different product: two birth minutes in one sky. Do not fold it into this gift.

`moment.html` is leftover. Do not revive it as a second brand. Leave it off the front path.

`natal-plate.html` stays archived.

`observatory.html` already sends people home. Keep that.

## What already exists

- `website/index.html` — Observatory. Free play.
- `website/chart.html` — free chart.
- `website/deep-reading.html` — seven-chapter natal. House look. IANA place. Honesty copy. Paid print unlock is not open.
- `website/sky-card.html` — 1200×630 Sun / Moon / Venus card. Still UTC. Old look. Free PNG. Off the front path.
- `website/js/ap-keep-sky.js` — saves the current 3D view as a PNG. No account.
- `website/js/orrery-webgl.js` — the 3D engine. Authored shots already exist for Earth limb and Earth-to-system.
- `website/shop.html` — Eclipse Edition £7 and a free field guide. Hold.

## What we build

### 1. One keep path

From Observatory and Chart, a quiet “Keep this sky” step.

It does not open a new product site. It uses the pages above.

The keepable object is three things together:

1. One 3D still of the solar system at that hour. Earth marked. No HUD. No nav chrome in the frame.
2. The sky card, drawn on device.
3. The seven-chapter reading.

A person can play forever without paying. Keep is optional.

### 2. Make the sky card part of the house

Bring `sky-card.html` onto the same look as home.

- Void `#020307`, paper `#F2ECDF`, mute `#A89C84`, ember `#FF6428`, brass `#D8B46A` hairline only.
- Wordmark AstroPrecise, one word.
- City → IANA zone. Refuse UTC / GMT / Etc/GMT as a birth zone.
- Date, place, and time on the card.
- If the birth is in daylight, do not call it “night” unless the caption says so.
- Unknown time: say rising is missing. Do not invent noon and hide it.

### 3. The 3D still

Add an authored camera for “solar system that hour”.

- Real positions from the same engine.
- Earth marked so you can find home.
- No HUD, no A/B letters, no debug.
- Save through `ap-keep-sky.js` with a filename that carries the date.
- Caption: date, place, time, and what the camera is.

### 4. Honesty

- Date + place + time required for the paid-quality gift. Unknown time is allowed on the free reading, and it must say what is missing.
- Do not claim the reading is true. Meaning is offered for reflection.
- Place search sends only the town name to a public geocoder. Say that.
- A 2pm birth is not “the night you were born” unless we caption the hour.

### 5. Shop, later

Shop stays as it is until this gift is good.

When Jonny says, the shop sells this keepable object. Not merch. Not a new brand.

Price band from research (direction only, not a listing): artisan combo about £50–£128. Digital still plus reading can sit lower. Do not write a Gumroad SKU. Do not touch Stripe.

Eclipse £7 can retire when this is ready. Not before.

### 6. Phone

After the keep path works on a laptop, Phone Look does a 390 pass. 16px copy. 44×44 taps. Stage does not collapse.

## Build order

1. House-fit the sky card. IANA. Honesty. Same nav as home.
2. Authored still + keep filename + caption.
3. One keep path from Observatory / Chart / Deep reading. No new folder.
4. Phone pass.
5. Jonny looks. Then shop, only if he says.

## Cursor jobs

Two agents. They open pull requests. We fold those into local. We do not push live.

- Site fit: sky card into the house, keep path, links, no new folder.
- Still: authored solar-system-that-hour camera, Earth mark, no HUD, honesty caption.

## Hard rules

- Local only. No push to live.
- No new folder.
- No invented SKUs.
- No live checkout.
- Do not gate the live sky.
- No React rewrite. WebGL only. No silent 2D swap.
- No UFO brand.
- Leftover rooms (quiz, angel numbers, name numerology, sun-sign grid) stay off the front path.
- Version lock: one tip. Do not invent a new `ap-v` number unless you also align `sw.js`, `ap-asset-v.js`, and Act 1 `?v=` pins together.
