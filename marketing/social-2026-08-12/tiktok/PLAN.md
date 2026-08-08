# TikTok — AstroPrecise eclipse launch, 12 August 2026

**Eight posts, D-4 (Sat 8 Aug) to D+1 (Thu 13 Aug).** Native TikTok, not repurposed ads.
Captions live one-per-file in `posts/` and are paste-ready — copy the whole file into the caption box.
On-screen text, shot lists, sound and cover frames are here.

Written 2026-08-08 by Claude @ BOOK-T1H4NJ753R. Weekdays verified: 12 Aug 2026 is a **Wednesday**.

---

## Read this before filming anything

**Three things could stop this working, and two of them are owner jobs.**

| Blocker | State | What it costs if unfixed |
|---|---|---|
| TikTok account | `SOCIAL-ACCOUNTS-SETUP.md` still lists `@astroprecise` as **CREATE** | No account, no campaign. Fix today. |
| Clickable bio link | Needs 1k followers **or** a TikTok Business account | Without it there is no tappable link anywhere on TikTok. Every caption therefore says `astroprecise.app/eclipse` as plain text — and it must stay that way even after the link works. |
| Postiz | Authenticated but **0 integrations** connected | Schedule in-app instead. Don't discover this at 17:30 on Wednesday. |

Switching to a Business account also restricts you to TikTok's **Commercial Music Library**. That is fine — see Sound below — but it is a one-way door on the day, so do it now, not Wednesday.

A brand-new account will get low reach on its first posts regardless of the work. Post 1 on D-4 partly exists to give the account a history before the eclipse-day posts, which are the ones that matter.

---

## Hard content rules

These are not style preferences. Breaking any of them damages the thing that makes this product different.

**1. Never say Britain sees totality.** It does not. Totality runs Arctic → Greenland → Iceland → northern Spain. Britain gets a deep partial, ~91% in the south of England, peak ≈19:05 BST. Deepest over Britain since 1999. Post 3 exists specifically to correct this, because the misinformation will be everywhere by Monday.

**2. No price, no shop, no purchase.** Checkout is closed — the Gumroad products do not exist. Drive to the free cast and the email capture only.

⚠️ **This is a screen-recording trap.** The live `eclipse.html` shows "£2.99" in three places:
- line 118, a quiet link directly under the hero CTA
- the `#saleBox` heading, "STEP 2 · THE FULL READING — £2.99"
- the notify button, "NOTIFY ME WHEN THE £2.99 UNLOCK OPENS"

So: **stop every recording at the receipt.** Safe capture zone is the hero headline, the live countdown/eclipse-point receipt, the orrery, the form, and the result cards (`#anchorBox`, `#quietBox`). The moment `#saleBox` enters frame, you have quoted a price for a thing nobody can buy. Cut before it, or crop it out.

**3. Safety copy, every eclipse-day-adjacent post.** ISO 12312-2 glasses, pinhole projection, or watch the light change. Never tell anyone to look at the Sun. Sunglasses are not protection — say so explicitly, people genuinely try it.

**4. Voice.** Honest, computed, anti-woo. Weather report of the sky, not prophecy. Never "the universe is telling you". Precision as romance. The disclaimer — *For entertainment. Astronomy computed in-browser; birth data never leaves your device.* — goes on any post that touches chart interpretation (1, 2, 8).

**5. Never bake text into a generated image.** All on-screen text is added in the edit, in TikTok or CapCut. House style bans lettering, logos, watermarks, lens flares, zodiac glyphs, tarot and crystals inside the image itself.

---

## Assets — what exists, verified on disk

All in `design-lab/`. I checked dimensions and content rather than trusting filenames.

| Asset | Size | Verdict for TikTok |
|---|---|---|
| `promo-eclipse-vertical.mp4` | 720×1280, 12.06s, 24fps, **has AAC audio** | Already paid for. The workhorse — used in 4 posts. Brass armillary on a dry-stone wall, camera drifts past it, light dims, pulls out to the crescent over green fields at dusk. |
| `eclipse-sextant-02.png` | 1536×2752 (9:16) | The strongest still. Brass sextant, dry-stone wall, crescent over British hills. Perfect as-is. |
| `eclipse-still-01.png` | 1536×2752 (9:16) | Standing stone, crescent, long shadows across a field. Warmer, more romantic. |
| `gen-07-eclipse-quiet-nothing.png` | 2752×1536 (**landscape**) | Grey sky, one bare tree, muddy puddles — a photograph of nothing happening. I test-cropped it to 9:16 centred on the tree and it survives beautifully; the empty grey sky is the whole point. Use for the quiet-chart post. Crop: `crop=ih*9/16:ih` |
| `gen-01/02/05/06/08` | landscape / 21:9 | Not usable full-frame vertical. Ignore for TikTok. |

**Video budget note:** I requested **no new video**. A second 12s film costs 78 credits against a budget shared with Instagram and X, and the existing mp4 covers every motion need here. I asked for two 9:16 images (2 credits each) covering the only two genuine gaps: a meteor-shower night sky, and eclipse-safety projection. Nothing existing can honestly stand in for either.

### The mp4, timecoded

Cut from these. Frames verified.

| Range | Content | Best for |
|---|---|---|
| 0.0–3.5s | Armillary in warm golden light, crescent faint behind the ring | Slow. **Never open a post on this** — it has no hook. |
| 3.5–6.0s | Push past the instrument, gears and engraved arc fill frame, light going bluer | Texture, "instrument" beat |
| 6.0–9.0s | Light noticeably dimmed, uncanny blue-grey, crescent clearing the horizon | **The strangest-looking footage. Open here.** |
| 9.0–12.0s | Wide, dusk, clean crescent over dark fields | End card / caption bed |

---

## Craft rules for every post

**The first 0.8 seconds.** Frame one carries readable text. No logo sting, no "hey guys", no slow fade-up. If the first frame is a pretty landscape with nothing written on it, the post is already lost.

**Assume muted.** On-screen text must carry the entire hook and the entire payoff. Sound is a bonus layer, never load-bearing.

**Safe zones (1080×1920).** Keep text inside roughly x 60–900, y 220–1450. The right rail eats ~180px, the caption and handle eat the bottom ~380px, the top bar ~120px. Text outside that gets covered on some devices and you will not see it in the editor preview.

**Captions on.** Turn on TikTok's auto-captions for anything with voice, then fix the astronomy words by hand — it will mangle "Perseids", "arcminute", "ISO 12312-2" and "ephemeris" every time.

**Pick the cover frame deliberately.** It becomes the profile grid tile. Default is usually frame one, which is often mid-transition. Choose the sharpest crescent frame with the hook text visible.

**Type in-app where you can.** TikTok's native text tool is weighted better by the feed than burned-in CapCut text. Use CapCut only for the monospace telemetry blocks in posts 1 and 2, where the Mission Control look does real work.

**Text style.** House telemetry look from `MISSION-CONTROL-CONTENT.md`: Consolas / Roboto Mono, gold `#C9A227` or parchment `#EFE3C0`, on void. Left-aligned, generous letter-spacing. Restraint — one idea per card.

---

## Sound

Never take a track from another creator's video, and never use a chart record. On a Business account you'll only see the Commercial Music Library anyway; keep it that way even if you stay personal.

Three sources, all clean:

1. **The mp4's own audio.** It ships with an AAC track, already paid for. Ambient wind and low tone. Best for posts 3, 6, 7 — atmosphere doing the work.
2. **TikTok Commercial Music Library**, filtered to ambient / cinematic / low-tension. Search terms that land in the right register: *ambient drone*, *slow strings*, *documentary underscore*. Avoid anything with a drop or a vocal.
3. **Your own voice.** Posts 4, 5 and 8 are better spoken — utility content converts on a calm human voice reading real numbers. Record on the phone in a quiet room, no music underneath, or music at 10%.

Post 1 and 2 want **near-silence plus interface sound**: the keyboard, the tap, and one soft tone on the reveal. Silence is a pattern break in a feed engineered for noise, and it signals "instrument", not "content".

---

# The eight posts

---

## 1 — D-4 · Saturday 8 August, 19:00 · THE CAST
**File:** `posts/tt-01-cast-demo.txt` · **Format:** screen recording, 22–28s · **This is the flagship.**

The unfair advantage is that the product computes something true about the viewer's own birth minute in about twenty seconds. That is a demonstrable payoff, which is exactly what TikTok rewards. Everything else in this plan supports this post.

**Structure — cold open on the answer, then earn it.**

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–0.8s | **Start on the finished receipt**, already computed, held still | `Where does Wednesday's eclipse land in YOUR chart?` |
| 0.8–1.5s | Hard cut back to the empty form | `20 seconds. On your phone. Nothing uploaded.` |
| 1.5–8s | Real typing: date of birth, time, timezone. Don't speed-ramp — the honest pace is the point | `DATE OF BIRTH` / `TIME (SHARPENS THE MOON)` — let the site's own labels read |
| 8–10s | Thumb hits `COMPUTE MY ECLIPSE CONTACT — FREE` | — |
| 10–16s | Result scrolls in. Hold on `#anchorBox` — the degrees, the orb, the aspect | `Computed on the device. Not fetched. Not guessed.` |
| 16–22s | Slow scroll of the receipt lines. **STOP BEFORE `#saleBox`** | `VSOP87 · ELP2000 · Meeus Ch.25` |
| 22–26s | Cut to `eclipse-sextant-02.png`, slow push in | `astroprecise.app/eclipse` |

**Use a real birth date that produces a real hit** — a chart the eclipse actually touches. Cast a few first and pick one with a tight orb. Never fake the output; the whole brand is that the numbers are checkable.

**Sound:** near-silence. Room tone, key taps, one soft tone at the reveal.
**Cover:** the receipt frame at ~12s with the hook text.

---

## 2 — D-3 · Sunday 9 August, 12:30 · THE QUIET CHART
**File:** `posts/tt-02-quiet-chart.txt` · **Format:** screen recording + still, 18–22s

The pattern break, and the most shareable thing here. Every other astrology account on the platform is telling people this eclipse will transform them. This one says: for you, probably nothing. Category violation is what gets stitched and duetted.

The site's actual words, which you should show rather than paraphrase:

> The eclipse point sits more than 5° from every placement in your chart — no close contact tonight.

> For you, this is a quiet one — and that's an honest answer, not a smaller one.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–1.0s | `gen-07-eclipse-quiet-nothing.png`, cropped 9:16 — the grey field, the bare tree, the puddles | `I built an astrology site that tells you when the eclipse does nothing to you.` |
| 1.0–2.0s | Hold on that nothing | — |
| 2.0–9s | Cut to screen: cast a birth date that triggers the quiet gate, land on `#quietBox` | `This is the actual result screen.` |
| 9–15s | Hold on the green `A QUIET ONE FOR YOU — SAID BEFORE ANY PAYMENT` label and the 5° line | let the site's copy read — do not overlay it |
| 15–20s | Back to the grey field | `Quiet charts are real.` then `astroprecise.app/eclipse` |

**You will need to hunt for a birth date that trips the gate** — it fires when the eclipse point is >5° from every placement. Cast a handful and keep the one that comes back quiet. Screenshot it now so you're not searching on camera.

⚠️ The paragraph at the bottom of `#quietBox` names **three** prices — £2.99, £12 and £5 — and links to two dead products. It sits just below the receipt. Frame tight on the green label and the 5° line and do not scroll into it. This is the easiest mistake to make in the whole plan, because the quiet box otherwise looks completely safe.

**Sound:** silence, or wind from the mp4's audio track laid under. No music. The quiet is the joke.
**Cover:** the grey field with the hook text.

---

## 3 — D-2 · Monday 10 August, 19:30 · NOT TOTALITY
**File:** `posts/tt-03-not-totality.txt` · **Format:** mp4 cutdown, 15–18s

A public-service correction, which is reliably good TikTok: people argue in the comments, and the argument is one you win because you have the numbers. By Monday the "UK GOES DARK" posts will be everywhere.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–1.0s | mp4 **from 6.5s** — the dimmed, uncanny blue-grey stretch | `Britain does not go dark on Wednesday.` |
| 1.0–4s | continue | `Totality: Iceland and northern Spain.` |
| 4–8s | mp4 9–12s, the wide crescent | `Here: ~91% covered. Peak 19:05 BST, south of England.` |
| 8–13s | hold | `91% is not darkness. It's the light going wrong — flat, silver, shadows too sharp.` |
| 13–17s | final frame | `Deepest over Britain since 1999.` then `Glasses or pinhole. Never bare eyes.` |

**Sound:** the mp4's own audio. Let the wind carry it.
**Cover:** the wide crescent frame.

---

## 4 — D-1 · Tuesday 11 August, 18:00 · SORT YOUR GLASSES
**File:** `posts/tt-04-glasses-today.txt` · **Format:** spoken to camera or voiceover over stills, 20–25s

Utility content. This is the one people save and send to their mum, and saves are weighted heavily.

Uses `asset: pinhole-projection` (requested) as the hero, with `eclipse-sextant-02.png` as the closer.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–1.0s | pinhole-projection image, or your hands with a card | `Sort this TODAY. Not Wednesday afternoon.` |
| 1–6s | hold / slow push | `ISO 12312-2 — printed on the frame. Not printed = don't trust it.` |
| 6–12s | pinhole image | `No glasses? Pinhole in card. Projects onto the pavement. Free, and you're looking DOWN.` |
| 12–17s | — | `Sunglasses are not protection. Not two pairs. Not a phone screen.` |
| 17–23s | `eclipse-sextant-02.png` | `Or just watch the light. At 91% the colour drains and shadows go razor-sharp.` |
| 23–25s | — | `astroprecise.app/eclipse` |

**Say the ISO number out loud.** It's the single most useful thing in the whole campaign and the search term people will use.

**Sound:** your voice, calm, no music. This is the post where being a person beats being a brand.
**Cover:** the pinhole image with `ISO 12312-2` visible.

---

## 5 — D-DAY · Wednesday 12 August, 08:00 · TODAY. YOUR TIMES.
**File:** `posts/tt-05-today-times.txt` · **Format:** static-ish times card, 15–20s

Morning utility. People screenshot this. Built for saving, not for watching.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–0.8s | `eclipse-still-01.png`, very slow push | `It's today.` |
| 0.8–8s | same, text builds line by line | `FIRST BITE ≈18:00 BST` → `MAXIMUM ≈19:05 · ~91%` → `SUNSET, STILL ECLIPSED ≈20:10` |
| 8–13s | — | `Greatest eclipse 17:46 UT, over the Arctic.` / `Totality: Iceland, N. Spain. Not here.` |
| 13–17s | — | `Then the Perseids peak the same night.` |
| 17–20s | — | `ISO 12312-2 or pinhole. Never bare eyes.` / `astroprecise.app/eclipse` |

Set the times block in monospace, gold on void, left-aligned, like a departure board. That is the house look and it is genuinely the clearest way to present it.

**Sound:** voice reading the times, or Commercial Library ambient at low volume.
**Cover:** the frame showing all three times at once — that's the screenshot people want.

---

## 6 — D-DAY · Wednesday 12 August, 17:35 · NINETY MINUTES
**File:** `posts/tt-06-ninety-minutes.txt` · **Format:** mp4, 8–10s, minimal

Short and urgent. Post it and put the phone away. Do not over-produce this one — a raw, hurried post at the right moment outperforms a polished one at the wrong moment.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–1.0s | mp4 from 7s, dimmed light | `Ninety minutes.` |
| 1–5s | continue | `Clear view west. Watch the light go strange.` |
| 5–8s | wide crescent | `Glasses or pinhole. Never bare eyes.` |
| 8–10s | — | `astroprecise.app/eclipse` |

If it's raining where you are, say so in the first comment — "cloudy here, tell me what you're getting" opens a live thread and the replies carry the post.

**Sound:** mp4 native audio.
**Cover:** dimmed-light frame with `Ninety minutes.`

---

## 7 — D-DAY · Wednesday 12 August, 21:30 · NOW THE PERSEIDS
**File:** `posts/tt-07-perseids-tonight.txt` · **Format:** requested meteor asset, 15–20s

The second act, and the reason this campaign doesn't die at 20:10. Everyone else's eclipse content ends at sunset. Yours carries the audience into the night with a second real event.

Uses `asset: perseid-night` (requested). No existing asset shows a night sky — every one of them is a dusk crescent, and using one here would be a visual lie.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–1.0s | perseid-night image | `Don't go in yet.` |
| 1–5s | slow push | `The Perseids peak tonight.` |
| 5–11s | hold | `Twenty minutes for your eyes to adapt. No phone screen or you start again.` |
| 11–16s | — | `Look up, slightly away from the north-east. Wait.` |
| 16–19s | — | `Best after midnight. No equipment. Just up.` |

**Sound:** near-silence, or the faintest ambient bed. Night content should sound like night.
**Cover:** the meteor image, text minimal.

---

## 8 — D+1 · Thursday 13 August, 12:00 · WHAT IT ACTUALLY WAS
**File:** `posts/tt-08-what-it-was.txt` · **Format:** screen recording + still, 20–25s

Catches the day-after search surge, when people who half-noticed the light go odd start looking things up. Also the most evergreen post in the set — it keeps working for weeks.

| Time | Screen | On-screen text |
|---|---|---|
| 0.0–1.0s | `eclipse-still-01.png` | `You saw it. Here's what it actually was.` |
| 1–6s | hold | `20°02′ Leo. ~91% covered. 19:05 BST.` / `Deepest over Britain since 1999.` |
| 6–14s | cut to screen — cast a chart live, land on the receipt. **Stop before `#saleBox`** | `That point sits somewhere in your chart.` |
| 14–19s | cut to the quiet-chart result | `For plenty of people it lands on nothing — and it says so.` |
| 19–24s | `eclipse-sextant-02.png` | `astroprecise.app/eclipse` |

The countdown on the live page flips after the event to `THE ECLIPSE HAS PASSED — THE READING STILL HOLDS`. That's a good frame to catch — it shows the site is computed and live rather than a static page someone forgot to update.

**Sound:** voice, or ambient.
**Cover:** the sextant still.

---

## After posting

**Reply with video.** The single highest-leverage thing on TikTok. Pick the best comment on posts 1, 2 and 3 and answer it as a new video — those inherit the parent's reach and cost ten minutes. Likely candidates: "does it work if I don't know my birth time?" (yes — leave it at noon, signs stay exact, the Moon gets fuzzier and the site says so), "is this an app?" (no, it's a web page, nothing installed, nothing uploaded), and someone insisting Britain gets totality (it does not — you have the receipts).

**Pin post 1** on the profile through the whole week. It's the one that shows the product working.

**Watch for the quiet-chart post to outperform.** If post 2 beats post 1, the honesty angle is the wedge and the follow-up content should lean there, not into eclipse urgency.

**Don't boost anything.** Checkout is closed. There is nothing to convert paid traffic into. Spend the attention on the email capture.

---

## Files

```
marketing/social-2026-08-12/tiktok/
├── PLAN.md                          (this file)
└── posts/
    ├── tt-01-cast-demo.txt          D-4  Sat 8 Aug, 19:00
    ├── tt-02-quiet-chart.txt        D-3  Sun 9 Aug, 12:30
    ├── tt-03-not-totality.txt       D-2  Mon 10 Aug, 19:30
    ├── tt-04-glasses-today.txt      D-1  Tue 11 Aug, 18:00
    ├── tt-05-today-times.txt        D0   Wed 12 Aug, 08:00
    ├── tt-06-ninety-minutes.txt     D0   Wed 12 Aug, 17:35
    ├── tt-07-perseids-tonight.txt   D0   Wed 12 Aug, 21:30
    └── tt-08-what-it-was.txt        D+1  Thu 13 Aug, 12:00
```

Posts 6 and 7 sit inside the `18:00–19:10` window that `ECLIPSE-LAUNCH-PACK-2026-08-12.md` §3 reserves as "be outside with the audience". Post 6 goes out at 17:35, before that window opens; post 7 at 21:30, well after it closes. Nothing here asks you to be on your phone during the eclipse itself.
