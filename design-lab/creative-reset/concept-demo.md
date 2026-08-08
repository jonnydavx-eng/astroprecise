# LOOK DOWN

**One video. Concept, shot list, generation prompt, on-screen text, caption.**
Written 2026-08-08, Claude @ BOOK-T1H4NJ753R. Nothing generated. Nothing outside `creative-reset/` touched.

---

## The pitch

**A locked-off overhead shot of a phone on a garden table while hundreds of little crescent suns crawl across it — and the free tool on that screen works out the viewer's chart and tells them, out loud, that nothing is happening to them.**

Alt title if the hook is led on the twist instead of the light: **NOTHING IS HAPPENING TO YOU**.

---

## The one idea

Britain does not get totality. So the interesting thing at 7pm on Wednesday is not in the sky — it is on the ground. Every gap between the leaves becomes a pinhole camera and the floor fills with crescents.

That single reframe does three jobs at once:

- **Curiosity.** "Every one of these is the sun" is a genuinely surprising true fact, visible in frame one.
- **Safety.** The film never tilts up. It cannot advise looking at the sun, because it never looks at the sun. The rule is enacted, not disclaimed.
- **Product.** Looking down is also where the phone is. The same gesture carries you from the sky to the app.

And it removes the failure that killed the last generation. `sheet-original-12s.png` — I read it myself — shows a warm-rimmed crescent with a dark night side, low in a deep-blue post-sunset sky. That is a crescent Moon, not a 91% Sun. **If the sky is never in frame, the generator cannot get the sky wrong.** The concept is designed around the model's known weakness rather than against it.

---

## Why it lands with THIS audience

| Research finding | What the film does with it |
|---|---|
| Fluent in *big three / placements / birth chart*; **sextile, orb, midheaven, ephemeris are a tier above them** | Zero technical nouns on screen. The one number shown is a plain sentence. See "the honest accident" below — the app's quiet verdict happens to be its only jargon-free output. |
| Co-Star won on **anti-flattery**, black-and-white bluntness, screenshot-as-meme — set explicitly against soft pastels and mystical imagery | The payoff is the app refusing to make the viewer special. "It just told me: nothing." That is the screenshot. |
| But 2026 reviews: bluntness can leave users **"deflated rather than illuminated"** — it has a floor | The last beat is the app's own warmth, verbatim: *"an honest answer, not a smaller one."* The blunt line never sits last. |
| **Midjourney acquired Co-Star** (announced 24 Jul 2026); the loud objection is birth-chart data now living inside an AI image company | "Nothing leaves your phone" is on screen at second 3.6. This is a two-week-old wound and we are the answer to it. Do not waste it in a footnote. |
| **Anti-slop is a market position** — "slop" was Merriam-Webster's 2025 word of the year; younger consumers punish AI-looking output | The emotional payload — the real page, computing a real answer — is *real footage*. The AI does light and nothing else. Division of labour, stated openly. |
| **Sincere believers are the most engaged segment** (LGBTQ adults 54% yearly, women 18-49 at 43%) | The scepticism points at the industry's habit of always finding something. It never points at the viewer. Nobody is the joke. |
| **60-85% watched sound-off**; intro retention scored past 3s; captions 4-7 words | Every beat is 4-7 words. The promise is legible in frame one. No dialogue, no VO, no reliance on music. |
| The measured collapse in the old promo: **camera abandons the armillary at ~4s, six identical frames after that**, visual proxy −40% | The camera never leaves the phone. New information arrives every ~1.6s from the screen, and the only move in the whole film is a slow post punch **toward** the subject. |
| April 2024's countercurrent was **"that was it?" underwhelm from outside the path of totality** — the UK on 12 Aug is structurally that case | The film pre-empts it. It never promises drama. It sells the small, weird, real thing you *can* see, and then hands you an answer that might also be small. Underwhelm cannot be the twist if honesty already was. |

---

## The honest accident that makes this work

I ran the real engine (`website/js/ephemeris.js` + `eclipse-reading.js` + `reading-templates.json`) in Node against the live eclipse longitude. Verbatim outputs:

- Eclipse point computes to **20°02′ Leo** — matches the brief.
- A chart **with** a contact reads: `This eclipse falls 2°15′ from your natal Sun (22°17′ Aquarius) — opposition.`
- A **quiet** chart reads: `The eclipse point sits more than 5° from every placement in your chart — no close contact tonight.`

Read those two again. **The sale path is full of jargon. The honesty path has none.** The quiet verdict is the only output this product makes that is already written in the audience's language. That is not a compromise we are making — it is the film choosing the one screen the audience can actually read, which is also the one that proves the brand.

**Quiet is common, not a freak case.** 7,056 charts swept (1990–2010, days 1–28, untimed, noon UT, tz 0): **1,699 quiet = 24.1%**. Roughly one in four. *My computation, not a published figure — method above. It is an upper bound: supplying a birth time adds Ascendant, Midheaven and the Moon, so real users get quiet less often. **Do not put this number on screen.*** It is here so you know the demo is representative.

---

## Shot list — one shot, 10.0s final

There are no cuts. Timings are the final cut; generate 11s and top-and-tail.

| t | What is happening |
|---|---|
| 0.0–1.6 | Overhead, locked off. Sun-bleached wooden garden table. A phone lies dead centre, screen off, matte black. Dozens of small bright crescents of sunlight drift across the wood **and across the phone itself**. Nothing else moves. |
| 1.6–3.4 | The light weakens very slightly. Crescents thin. Shadow edges get *harder*, not softer — what a shrinking light source actually does, and almost nobody renders it. |
| 3.4–5.4 | The screen wakes: the real `/eclipse` page. The date field fills. `COMPUTE MY ECLIPSE CONTACT — FREE` is legible under the crescents. Post punch begins, 1.00 → 1.12. |
| 5.4–6.4 | `COMPUTING…` The crescents keep crawling over the live screen. |
| 6.4–8.2 | The receipt lands. Punch continues to 1.25, centred on the receipt line. It reads: *"The eclipse point sits more than 5° from every placement in your chart — no close contact tonight."* |
| 8.2–10.0 | Hold. Light at its lowest, flat and strange. Crescents still moving. Punch settles. URL lower-third resolves. Last frame is the phone, still the subject, still lit by little suns. |

**The only camera move in the film is a post scale toward the screen.** Nothing generated moves. That is deliberate: the measured death of the previous asset was a crane that left its subject at 4s.

### Craft notes that decide whether this works

- **Frame the phone large.** ~65% of frame height at t=0, ~85% by the twist. The receipt is 12px mono — at "phone on a big table" scale it is an illegible grey smear and the film has no payoff.
- **Capture the screen at 390×844 CSS with the browser zoomed 150–175%** so the receipt line is chunky before any scaling. Capture real, on device or in a device-emulated window. This layer must never be AI.
- **Crop the capture above the price copy.** The quiet box carries "£2.99 / £12 / £5" in the DOM. Checkout is closed — **no price may appear in a single frame.** Frame on the free computed receipt only.
- **Do not show the anchor line.** It reads *"a total solar eclipse"* — globally true, but a UK viewer scanning at speed reads it as a promise of totality here. Show the contact line only.
- **Composite:** the plate is locked off, so this is a four-point corner-pin or a static mask. Add a faint screen-glare pass and let one or two crescents fall *over* the screen so it does not read as pasted.
- **No hands.** The fields fill themselves. It reads as the phone doing the work, and it keeps every synthetic hand out of a year when synthetic hands are the tell. (`x-pinhole.png` in `frames/` is the argument — a generated hand, and a projected crescent perhaps fifty times too large for its pinhole distance.)
- **Sound:** ambient garden only — distant birds, a bit of wind. No music sting, no VO. It is watched silent; anything else is decoration.

---

## The generation prompt — seedance_2_0

One prompt. Photoreal, 9:16, no text baked in, no humans, no sky.

```
Photoreal vertical 9:16 overhead shot, locked-off tripod directly above a
sun-bleached wooden garden table in an English back garden, early evening in
August. Centre frame, filling most of the frame, a modern smartphone lies flat
face-up, screen completely off — a plain matte black rectangle, no logo, no
branding, no visible interface, in a plain dark case. A set of house keys rests
near one edge. The table sits in the dappled shade of a tree overhead: scattered
across the wood and across the phone are dozens of small bright crescent-shaped
patches of sunlight, each about three centimetres across, all crescents pointing
the same direction, drifting and trembling very slowly as the leaves move. Over
the ten seconds the light steadily weakens and cools, the crescents thin, and
the shadow edges grow crisper and harder rather than softer — an eerie low
golden light with long shadows. The camera never moves: no pan, no tilt, no
zoom, no crane, no push-in, no handheld drift, no rack focus. No sky, no
horizon, no sun and no clouds ever appear in frame. No people, no hands, no
faces, no animals. No brass instruments, no antiques, no crystals. No text, no
captions, no watermarks, no on-screen graphics. Natural documentary colour, fine
35mm grain, stable focus, no lens flare, no stylisation.
```

Command:

```powershell
higgsfield generate create seedance_2_0 `
  --prompt "<the block above, one line>" `
  --aspect_ratio 9:16 --resolution 1080p --duration 11 `
  --mode std --bitrate_mode high --generate_audio false `
  --wait --wait-timeout 20m
```

**Prefer image-to-video.** Photograph the plate yourself — your own phone, your own table, top-down, locked off, any low-sun evening. The crescents are the only thing missing and they are the only thing the model needs to invent. Add `--start-image ./plate-still.jpg` to the same command. Real table, real phone, synthetic light: the AI does the one thing that cannot be shot before Wednesday, and nothing else.

**i2v is currently working — measured, not assumed.** Job `a506c5b8-7bbf-4017-bcf8-d5bf8c526687`, seedance_2_0 with a `start_image`, 1080p 9:16 8s, `completed` at 21:41 today. The earlier "IP check not finished" jam was on a different reference mode; a plain `start_image` went through. Re-check on the day, but do not plan around a block that is not currently there.

**Watch for on review, before you composite anything:**

- **Dark crescents instead of bright ones.** `frames/x-dapples.png` produced the negative — crescent *shadows* on lit ground. Correct is hundreds of bright crescents *inside* the shade. Re-roll if it inverts.
- **Crescents pointing different ways.** Every pinhole projects the same orientation. Mixed orientations is the one thing an astronomy-literate commenter will catch, and recruiting exactly those people is the point of the honesty positioning.
- **High midday sun.** `x-dapples.png` is noon light. 19:10 in August is low, raking and warm.
- Any sky, any horizon, any hand, any bezel weirdness on the phone — re-roll. The composite covers the screen but not the edges.

Budget: 1080p/11s ≈ one 12s-class video generation. 4K exists and would give a crisper composite edge, but at real cost — 1080p is the platform target and is enough.

---

## On-screen text beats

All added in post. Nothing baked into the generation.

| t | Text | Job |
|---|---|---|
| 0.2–2.0 | **Every one of these is the sun.** | Hook. True, surprising, and it makes you look at the image again. |
| 2.0–3.4 | **Wednesday's eclipse. Look down, not up.** | Names the event. Carries the safety rule as a creative instruction, not a scold. |
| 3.6–5.4 | **Type your birthday. Nothing leaves your phone.** | Product + the Co-Star/Midjourney wedge, while it is still two weeks old. |
| 6.4–8.0 | **It just told me: nothing.** | The twist. Blunt. Screenshot bait. Never the last thing said. |
| 8.2–10.0 | **An honest answer, not a smaller one.** | Verbatim from the product's own `emptyState.reflection`. Turns deflation into permission. |
| 7.0–10.0 | *lower third, small:* **astroprecise.app/eclipse · free · no account** | Persistent, quiet, no purchase implied. |

Banned from every frame: *sextile, orb, midheaven, ephemeris, arcminute, conjunction, aspect*. Banned from every frame: any price, any clock time (see risk 5), any promise about what the eclipse will do to anyone.

---

## Caption

> Wednesday is the deepest eclipse over southern Britain since 1999 — around 90% of the sun gone, more the further south-west you are, about 7pm. We don't get totality here (that's Iceland and northern Spain), so there is no moment it's safe to look up: ISO 12312-2 glasses only, or do what this video does and watch the ground. Every gap in the leaves turns into a pinhole camera and the floor fills with little crescents. Perseids the same night.
>
> The page on that screen is free and runs on your phone. Type your birthday, it works out where the eclipse actually lands in your chart, and nothing you type ever leaves your device. If it lands on nothing, it says so — that's what happened here.
>
> Quiet charts are real. astroprecise.app/eclipse

TikTok trim: keep paragraph two and the last line; move the safety sentence to the pinned first comment.

---

## Risks, honestly

1. **The generator inverts the dapples or scrambles their orientation.** Highest-probability failure and the one that hands the comments to a physicist. Mitigated by i2v from a real photo, and by reviewing a contact sheet before compositing. Do not skip that step because the thumbnail looks fine.
2. **The composite reads as pasted.** A screen recording dropped into a generated plate is obvious without a glare pass and without letting crescents fall across the screen. Budget the post time; the whole film is one shot, so there is nowhere to hide a bad key.
3. **The twist deflates rather than lands.** 2026 Co-Star reviews say bluntness has a floor. The mitigation is entirely in beat 5 — if you cut the film for length, cut anywhere except the closing line.
4. **Whose birthday is it?** Shoot it with the real birthday of whoever posts. If theirs is not quiet, either shoot the contact version — verified string: `This eclipse falls 2°15′ from your natal Sun (22°17′ Aquarius) — opposition.` — or say plainly on screen that it is a demo. "It just told me: nothing" over someone else's chart is a small lie in a film whose entire subject is not lying.
5. **A time discrepancy I could not resolve, and did not touch.** `website/eclipse.html` states in its headline eyebrow: `~91% OF THE SUN COVERED OVER BRITAIN · PEAK ≈19:05 BST`. The study phase has Royal Observatory at London 19:12, Edinburgh 19:05, Truro 19:16 — i.e. 19:05 is *Edinburgh*, not Britain. One of these is wrong and I have not verified which. **This is why no clock time appears on screen.** Needs the owner: check the source before any asset quotes a UK peak time.
6. **Feed context.** A viewer who has not yet heard about Wednesday may take two beats to place it. Acceptable — confusion resolved in 2s is a retention mechanic — but it is a real cost of leading with the light instead of the news.

---

## What this replaces, and why

`promo-eclipse-vertical.mp4`, `promo-B-reveal-12s.mp4` and `promo-A-instrument-4s.mp4` are one generation, not three — the same job cut and reversed. Its subject is a brass armillary sphere and its crescent is a Moon. Its virality score was 56 overall with a **hook of 42**, and the frame data shows visual interest falling 40% while mind-wandering rises: the scroll-away signature. It has no text, no brand, no date, no URL, no product, no phone, no screen and no person in twelve seconds, for a product you use on your phone in twenty.

This concept keeps exactly one thing from it: the light going strange. Everything else is the thing itself.
