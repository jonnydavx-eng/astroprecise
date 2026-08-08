# LOOK DOWN

**One video. Lead with the feeling.**
Written 2026-08-08, Claude @ BOOK-T1H4NJ753R. Nothing generated yet.

---

## The pitch, in one line

Ten seconds of an ordinary British pavement at teatime while the light drains out of it — the
eclipse told entirely in shadows and crescent-shaped light — ending on the one question the
product answers for free.

**Spine:** it doesn't go dark → it goes *wrong* → look down, not up → does your chart even notice?

---

## What I looked at first

I did not judge the existing work from filenames. I read the contact sheet
`frames\sheet-original-12s.png` and the full-resolution `frames\A-t4.2-lastframe.png` as images,
and both confirm the study phase:

- The crescent in the sky is **a waning Moon at dusk**, not a 91% partial Sun. Dark night-side,
  warm rim, deep-blue post-sunset sky over unlit fields. A 91% Sun is a searing sliver in a sky
  that is still daylit.
- The armillary is in frame to ~2.5s, cranes out from 3.0s and is gone by 6.0s. Panels 14–23 of
  the contact sheet are the same empty field with a 20-pixel speck. Half the runtime carries no
  new information.
- Register is National Trust calendar. Beautiful, and aimed at someone who already respects
  astronomy.

`frames\x-dapples.png` is the one genuinely on-brief asset that already exists — crescent dapples
under a tree, correct physics, correct subject. It is 560×750 and has no people in it. That image
is the seed of this concept and is the fallback reference if the text-to-video route misses.

---

## The concept

**A single continuous shot, 10 seconds, camera 25cm off a suburban pavement. The sun is never in
frame. The people are never in frame. You see the eclipse entirely in what it does to the ground.**

Long hard human shadows reach toward the lens across grey tarmac. Under a street tree the ground
is covered in what looks like ordinary leaf-shadow — and as the camera pushes in you see that
every single dapple is a crescent. Over the ten seconds the light falls about two stops while
staying warm gold. Brightness drains; colour does not. Shadow edges stay razor sharp. One shadow
raises an arm with the silhouette of a phone at the end of it.

That is the whole film.

### Why the sun is out of frame — this is a structural decision, not a style one

The last generation failed because it was asked for a Sun and rendered a Moon, in a brand whose
entire pitch is arcminute accuracy. **A film with no sun in it cannot make that mistake.** The
eclipse is depicted only through its ground-truth effects — pinhole crescents and falling
illuminance — which are the parts a model renders reliably and the parts a British viewer will
actually see.

### Why nobody's face is in it

The research is blunt: 2025's word of the year was "slop", 90% of iHeart's listeners want
human-made media, and consumer distrust of heavy brand AI use has roughly doubled. Shipping
synthetic faces for an honesty product would be the single biggest contradiction available.

But the owner's direction is right too — this has to be **human, contemporary, phones-out,
ordinary streets**, not moorland.

**Shadows resolve both.** Human presence, phones, a British street, teatime — all legible, with
zero faces, zero hands, zero uncanny valley. And it is not a dodge: during an eclipse the shadows
*are* the subject. The constraint and the idea are the same thing.

### Why the camera can never leave

Measured on the existing promo: visual-cortex proxy peaks 0.6155 at t=2 and collapses to 0.3675 by
t=11, a 40% fall, while mind-wandering rises. The collapse begins exactly where the crane leaves
the instrument. So this film is built so leaving is impossible — one take, subject grows
continuously, ends tighter than it started.

---

## Why it lands with THIS audience

**1. It concedes the disappointment before the viewer can.**
The closest comparable is April 2024. What spread was unguarded human reaction *inside* totality;
the countercurrent was "that was it?" underwhelm from everyone outside the path. Britain on
12 August is structurally the outside-the-path case. Any film promising darkness is writing its
own backlash. "It doesn't go dark" promises exactly what people will get, and makes them feel
informed instead of cheated. This is the highest-leverage decision in the concept.

**2. Not one technical word.**
No sextile, orb, midheaven, ephemeris, arcminute. The only chart word on screen is "chart" —
which is fluent-tier vocabulary (birth chart, 673,000 searches/month). Precision survives as a
feeling, never as a noun.

**3. It gives you something to do, which is where Co-Star's tone runs out.**
Co-Star proved blunt, anti-pastel, screenshot-able copy wins in this exact category. 2026 reviews
found its floor: copy that stresses limitation leaves people "deflated rather than illuminated".
"Look down, not up" is blunt *and* generous — it is an instruction, it costs nothing, it works.

**4. The anti-woo points at the industry, never the viewer.**
Everyone else spends this week pointing at the sky. We point at the pavement, where the evidence
is. Sincere believers — women under 50 at 43%, LGBTQ adults the single most engaged group at 54% —
are never the joke.

**5. It respects that belief is held lightly.**
Pew: 20% engage "just for fun" against 10% who say it gives helpful insight; 1% rely on it a lot.
So the film sells *the evening*, not the horoscope. The chart arrives last, as a question, free.

**6. Sound-off native.**
60–85% watched muted. Every beat of meaning is on-screen text, 4–5 words each, promise legible in
frame one, hook closed inside 2 seconds.

**7. Reali-TEA, not polished fantasy.**
TikTok Next 2026 says polished ads lose to feed-native honesty. A pavement at 7pm is as
feed-native as this subject gets.

**8. The privacy line is newly live.**
Midjourney acquired Co-Star on 24 July 2026 and the reported user objection is precisely that
birth-chart data now sits inside an AI image company. "Computed on your phone, nothing uploaded"
has never been more pointed. It goes in the caption — there is no room for it in ten seconds.

---

## Shot list — one continuous take, 10.0s

| Time | What happens |
|---|---|
| **0.0–2.0** | Low camera ~25cm above a suburban pavement. Late-evening sun, low, out of frame behind camera-left. Three long hard human shadows reach toward the lens across grey tarmac, a faded white line, a kerb. Light is full, warm, ordinary. Slow dolly forward begins. |
| **2.0–4.0** | Light level starts to fall. Colour stays warm gold; brightness goes. Shadow edges stay razor sharp. The left-hand shadow slowly raises an arm; the silhouette of a phone appears at the end of it. |
| **4.0–6.2** | Dolly continues forward, tilting down onto the dappled ground under a street tree. What read as ordinary leaf-shadow resolves into hundreds of overlapping crescents. |
| **6.2–8.2** | Tightest framing. Crescents fill the frame, each thinning as the eclipse deepens. Light now ~2 stops below the opening. |
| **8.2–10.0** | Camera comes to rest. Light settles at its dimmest — still gold, still sharp. Crescents are thin blades. No cut, no crane away, no reveal. |

The subject is larger and more detailed in every second than the one before it.

**Time compression, stated plainly:** the real light-fall takes about half an hour. Compressing it
into ten seconds is ordinary film grammar and the film makes no claim about rate — but it is a
compression, and it should not be described anywhere as real-time.

---

## Generation prompt — seedance_2_0, production-ready

Verified against `higgsfield model get seedance_2_0` on 2026-08-08.

```
higgsfield generate create seedance_2_0 \
  --aspect-ratio 9:16 \
  --duration 10 \
  --resolution 1080p \
  --mode std \
  --generate-audio false \
  --prompt "<below>"
```

> Photoreal documentary video, vertical 9:16, single continuous steady take, no cuts. Low camera
> 25cm above a British suburban pavement on a warm August evening. The sun is very low and
> completely out of frame behind camera-left; never show the sun, the moon, the sky or the
> horizon. Long, hard-edged shadows of three standing people stretch toward the lens across grey
> tarmac, a faded white line and a kerb. No people, faces, hands or bodies are visible in frame —
> human presence exists only as shadow; one shadow slowly raises an arm holding the silhouette of
> a phone. Beneath a street tree the ground is covered in overlapping dapples of light, and every
> dapple is a distinct thin crescent shape, not a round blob. The camera dollies slowly forward
> and tilts down across the whole take, ending framed tight on the crescent dapples, so the
> subject grows continuously and is never abandoned. Across the take the light level falls about
> two stops while staying warm gold — brightness drains, colour does not turn blue; shadow edges
> stay razor sharp; the crescents grow thinner and more sharply defined. Ordinary, unglamorous,
> real British residential street. Natural colour, fine grain, 35mm lens look, no stylisation.
> Negative: no text, no captions, no logos, no signage, no visible sun, no moon, no stars, no
> night, no darkness, no purple or teal grade, no lens flare, no faces, no hands, no crowds, no
> drone shot, no crane up, no cut away.

**`--generate-audio false` is deliberate.** The default is true and the model can invent voiceover
or music. Invented speech on an honesty brand is an unacceptable risk, and a TikTok Business
account is restricted to the Commercial Music Library anyway — so sound is a post decision.

**1080p, not 720p.** The previous promo was 720×1280 and the Instagram reel is a 720p upscale,
which adds pixels and no detail. Cost measured today:

| | 720p | 1080p |
|---|---|---|
| 8s | 36 | 72 |
| 10s | 45 | **90** |
| 12s | 54 | 108 |

**10s at 1080p = 90 credits.** Balance measured today is **418.5**, not the ~579 in the brief —
so this is 21.5% of what is left. One shot, not a series of experiments.

**Fallback if the crescents come out as ordinary blobs.** The phenomenon is subtle and models
under-render it. `frames\x-dapples.png` already proves the stack can produce it. Re-run with that
file as `--start-image`. Note image-to-video was jamming in moderation earlier today ("IP check
not finished"), so try text-to-video first — this prompt is written to stand alone without a
reference.

---

## On-screen text beats

Added in post. Nothing baked into the generation.

| Time | Text | Words |
|---|---|---|
| 0.0–2.0 | **it won't go dark** | 4 |
| 2.1–4.2 | **the light goes wrong instead** | 5 |
| 4.3–6.4 | **look down, not up** | 4 |
| 6.5–8.3 | **those aren't leaf shadows** | 4 |
| 8.4–10.0 | **does your chart even notice?**<br>small second line: *free · astroprecise.app/eclipse* | 5 |

Persistent from 0.5s, small, top-left: **Wed 12 Aug · UK**

### No time on screen, and that is on purpose

`REVIEW-2026-08-08.md` line 89 rules that maximum is **19:10–19:13 BST in England and Wales**, and
that 19:05 is Edinburgh — and then adds the caveat that the city table is single-sourced (BBC Sky
at Night) and was not re-derived. Owner is asked to confirm against a second source **before it
goes on a countdown sticker.**

A number burned into a render cannot be corrected; a number in a caption can be fixed up to the
second of posting. So the film carries the date only, and the caption carries the time.

⚠️ **This contradicts `marketing\social-2026-08-12\tiktok\PLAN.md` and `website\eclipse.html:113`,
both of which still say "PEAK ≈19:05 BST" for Britain.** That is Edinburgh's time on a
southern-Britain claim. It is already item 8 on the Saturday blocker list. Flagging, not fixing —
`website/` is out of scope here.

---

## Caption

> it doesn't go dark. that's the bit nobody tells you.
>
> wednesday evening, just after 7, roughly nine tenths of the sun goes behind the moon over
> britain. the light doesn't switch off, it drains — still gold, just wrong. and every gap in
> every tree turns into a pinhole camera, so the pavement fills up with little crescents.
>
> that's also the safe way to watch it: look down. dappled shade under a tree, or a pinhole in a
> bit of card. if you're looking up you need proper eclipse glasses (ISO 12312-2) — sunglasses are
> not that.
>
> after: astroprecise.app/eclipse works out where the eclipse lands in your chart. free, on your
> phone, nothing uploaded. if it lands on nothing, it says so. most do.
>
> britain gets no totality — that's iceland and northern spain. southern britain's deepest
> since 1999.

**Owner: insert your confirmed local time** in place of "just after 7" once the second source is
checked — England and Wales 19:10–19:13, Edinburgh 19:05, Truro ~19:16.

URL stays plain text, per the TikTok plan — there is no clickable bio link until 1k followers or a
Business account, and the caption should not depend on one existing.

---

## Honesty audit

| Rule | How this passes |
|---|---|
| No implied purchase | The only offer is "free". No price, no shop, no checkout, no "unlock", nothing that reads as a product for sale. |
| No prophecy | The film asks whether the eclipse *touches* the chart. It never says what that means, predicts nothing, promises no insight. |
| No unsafe sun advice | The central instruction is to look at the ground. Glasses named with the ISO standard, and only for people who look up. Nobody is shown looking up. |
| Nothing the product doesn't do | It computes eclipse contacts against a birth chart on-device, free, and says so when there are none. That is exactly what the caption claims. |
| Quiet charts kept | "if it lands on nothing, it says so. most do." Permission, not correction. |
| No sextile-tier vocabulary | Zero occurrences on screen or in caption. |
| Factually clean | No totality claim for Britain. "Deepest since 1999" scoped to southern Britain, per the 2015-was-deeper-in-Scotland correction. No burned-in time. |

---

## Risks, honestly

- **The crescents may render as generic blotches.** This is the whole film. Mitigation: the
  fallback `--start-image` route above; check the first output at full resolution before
  accepting it.
- **A ten-second shadow film may read as "nothing happening" without text.** The text is
  load-bearing. Review it muted, on a phone, before posting — if it does not work silent, it does
  not work.
- **The two-stop drop is a compression.** Flagged above. Do not caption it as real-time.
- **No faces means no easy warmth.** Carried by the phone gesture and the ordinariness of the
  street. If it feels cold in review, the fix is a second shadow reacting, not a face.
- **90 credits of 418.5.** One considered shot. Do not iterate for fun.

---

## Not done

Nothing generated. No files outside this folder touched. No git.
