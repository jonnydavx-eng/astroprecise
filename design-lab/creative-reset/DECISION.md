# DECISION — eclipse video, creative direction and first generation

**Written 2026-08-08, Claude @ BOOK-T1H4NJ753R.**
Scope: `design-lab/creative-reset/` only. Nothing under `website/` touched. No git.

---

## The answer first

**Picked:** LOOK DOWN — the phone on the garden table (`concept-demo.md`).
**Generated:** one Seedance 2.0 clip, 1080×1920, 10s, 90 credits. Job `f3cb2658-4481-4da9-9e8c-262173b30db4`.
**Verdict:** **better than the brass version as a plate, not as a film. Do not post it as it stands.**

The single element the whole concept rests on — crescent-shaped light — **did not render.** The dapples
came back as round blobs. Everything structural improved; the subject itself is missing.

---

## Why LOOK DOWN won

Judged on the four tests set for the pick.

**Will a 22-year-old stop scrolling?** It is the only one of the three with the product in frame at
t=0. The other two ask the viewer to wait for a URL at second 9. "Every one of these is the sun" is a
true, surprising, *checkable* fact laid over an image you have to re-read — curiosity, not spectacle.

**Does it survive muted?** Yes, and more than the others do. The payoff is a screen with words on it.
A film whose climax is legible text is the most sound-off-native structure of the three.

**Is the honesty differentiator legible in under 5s?** This is where it wins outright. LOOK DOWN
*demonstrates* the differentiator — the app is shown refusing to make you special. The other two
*assert* it, and both put the assertion at 8s+. "Nothing leaves your phone" lands at 3.6s here, which
is also the live Co-Star/Midjourney wound (announced 24 Jul 2026, two weeks old).

**Is it producible without looking like slop?** It asks the model for the least: a static table, no
humans, no hands, no sky, no camera move. The emotionally load-bearing layer — the real page computing
a real answer — is real screen capture, not generation. That division of labour is the honest answer
to shipping AI footage in the year "slop" won word of the year.

One more reason, structural: **no sky in frame means the model cannot repeat the fatal error.** The
previous promo was asked for a 91% Sun and rendered a crescent Moon in a night sky. Confirmed by
reading `frames/sheet-original-12s.png` directly — dark night-side, warm limb, deep-blue post-sunset
sky over unlit fields. A film with no sky cannot get the sky wrong.

## What I rejected, and what specifically

**`concept-feeling.md` — the pavement with three human shadows.**
Rejected on producibility. It stacks five simultaneous demands on the model: hard-edged human shadows,
a shadow raising an arm holding a phone silhouette, a continuous dolly-plus-tilt, a two-stop light
fall, *and* the crescents. The one it would most likely botch — an articulated human shadow — is
exactly the failure that reads as slop, and it would be unfixable in post. Its differentiator is also
a question ("does your chart even notice?") arriving at 8.4s, which fails the under-5s test.

**`concept-contrarian.md` — QUIET ONE, the driveway.**
Rejected for having no product anywhere in it. It is the most defensible film and the least likely to
be watched: ten seconds of tarmac for a thing you do on your phone in twenty. Its best asset is a
caption line, not a shot. "Flat, cool, silvery" is the correct physics and the weakest thumbnail.

Both were right about the same two things, and I kept both: point the camera at the ground, and never
let it leave its subject.

## What I changed in the prompt, and why

Seven changes to the version in `concept-demo.md`. All research-backed.

1. **Polarity stated three ways.** `frames/x-dapples.png` came back with *dark* crescents on lit
   ground — the exact inversion. So: the patches of LIGHT are the crescents, they glow against
   *darker shaded wood*, plus a negative `no dark crescent-shaped shadows`.
2. **Cut "cools".** The original asked the light to weaken "and cool" while also staying golden — a
   contradiction that invites a blue/teal grade. Replaced with an explicit "stays warm, never turns blue".
3. **Sun position made explicit.** `x-dapples.png` was noon light. 19:12 in August is low and raking,
   so the prompt now says the sun is low and far out of frame, lighting the table from one side.
4. **Dropped the house keys.** A second object competes for the centre of a locked 10s frame. The
   measured lesson from the brass promo is that the camera must never leave its subject; a second
   subject is the same mistake by another route.
5. **Banned screen reflections.** A glossy black phone shot from above will mirror the canopy. That
   would put a sky in the one film whose entire safety argument is that there is no sky.
6. **Phone scale specified** as two-thirds of frame height. The concept's own craft note is that a
   12px mono receipt line is an illegible smear if the phone is small — the payoff depends on it.
7. **10s not 11s**, and `generate_audio false`. Research says 8–10s beats 12s, so the shorter cut is
   both better and 9 credits cheaper. Audio defaults to *true* on this model and can invent voiceover;
   invented speech on an honesty brand is not an acceptable risk.

Also declined the tool's preset recommendation, "IN THE DARK" — precisely the wrong register, since
the thesis is that it does *not* go dark.

## What came back — measured, not impressions

| Check | Result | Method |
|---|---|---|
| Resolution | 1080×1920, h264, 24fps, 14.3 Mbps | `ffprobe` |
| Duration | 10.04s | `ffprobe` |
| Native 1080p, not an upscale | yes | generated at 1080p; bitrate consistent |
| Camera movement | none — locked off for all 20 sampled panels | `sheet-lookdown-v1-10s.png` |
| Light fall | meanY 70 → 49, monotonic, −30% = **0.51 stops** | 1×1 area-scale luma, per second |
| Dead/static stretch | none — every second differs | same |
| Sky / sun / moon in frame | none | contact sheet |
| Humans, hands, faces | none | contact sheet |
| Hallucinated UI on screen | none — screen is genuinely blank matte black | `ld-t0.2.png`, `ld-t9.8.png` |
| **Crescent-shaped dapples** | **absent — round blobs** | `ld-zoom-t2.5-top.png` at 3× |
| Dapple count | ~3–8 per frame, not the "dozens" asked for | contact sheet |
| Phone size | **538px = 28% of frame height** (asked for ~67%) | dark-run column scan at x=540 |

### Is it better than the brass version?

**As a finished film: no.** It is worse in the one way that decides the brief. The brass promo at
least showed a celestial event — the wrong one, in the wrong sky, but visible. This shows no eclipse
at all. Strip the crescents out and what remains is a phone on a table getting slowly darker, which
is dusk, not an eclipse. Putting "Every one of these is the sun" over round blobs would be a false
claim on screen, and that is the one lie this brand cannot survive — the honesty positioning exists
to recruit exactly the people who would catch it.

**As a compositing plate: yes, clearly, and it is genuinely usable.** Every structural failure of the
brass version is fixed and the fixes are measured, not asserted:

- The camera never leaves the subject. The brass promo abandoned the armillary at ~4s and spent its
  last six seconds on an unchanging empty field; that is where the −40% visual-cortex collapse sat.
- The light falls smoothly and monotonically across all ten seconds, so no second repeats the one
  before it. There is no plateau for attention to fall into.
- It is natively 1080×1920, against 720p upscaled.
- The wood is convincingly photoreal — grain, knots, weathering, a correct soft contact shadow under
  the phone. The phone itself renders cleanly: real bezel, plausible case, and a truly blank screen
  with no hallucinated interface, which is exactly what a composite needs.

So the generation half-succeeded, and it failed on the half that cannot be faked.

## What I would do next

**Stop trying to generate the crescents.** That is the real finding. Two independent attempts have now
failed on the one load-bearing element: `x-dapples.png` inverted them into dark crescents, and this
run omitted them entirely. Two for two on the only thing that matters is enough evidence — re-rolling
is buying lottery tickets at 90 credits each.

**The crescents are the one element that does not need AI.** A pinhole projection is deterministic
geometry: a bright disc minus an offset dark disc, every one at the same orientation. In rough order
of cost:

1. **Shoot it for real on Wednesday 12 Aug, ~19:12.** Free, unfakeable, and it removes the last
   AI-honesty contradiction from the piece. `concept-contrarian.md` already argues for the two-post
   arc — generated teaser, then the real thing — and that arc is stronger than either post alone.
2. **Composite crescents procedurally over this plate.** The plate is locked off, so this is a static
   overlay with slow drift: multiply a few dozen same-orientation crescents over the wood, thinning
   over the ten seconds. Physically correct by construction, no model in the loop, and it reuses the
   90 credits already spent.
3. **Image-to-video from a real start frame** that already contains crescents. i2v was measured
   working today (job `a506c5b8`), but this is still the model doing the part it has twice failed.

**Re-frame tighter if the plate is re-generated.** 28% of frame height is less than half what the
composite needs; the receipt would be an illegible smear. Ask for a closer overhead — phone filling
two-thirds — and cap the light fall so the end frame stays daylight. A 90% partial is dim but it is
not dusk, and the last second here is drifting toward dusk-murk.

## Open items for the owner

- **The peak-time conflict is still unresolved and is on the live site.** `website/eclipse.html` says
  "PEAK ≈19:05 BST" for Britain; the research has that as *Edinburgh*, with London 19:12 and Truro
  19:16. Flagged, not fixed — `website/` is out of scope here. **No clock time appears in any asset**
  until someone picks a source.
- **Whose birthday is used in the composite.** "It just told me: nothing" over someone else's chart
  is a small lie in a film whose entire subject is not lying. Shoot the real one, or label it a demo.
- **Crop the screen capture above the price copy.** Checkout is closed; no price may appear in any frame.

## Spend

- This generation: **90 credits** (10s, 1080p, std, high bitrate). One job, as briefed.
- Brief said ~78; 1080p at 10s is 90 on current pricing (9 credits/s). 720p was not an option — the
  brass version's 720p, upscaled for the Reel, is one of the documented failures.
- Balance fell 394.5 → 220.5, which is 174, not 90. **The other 84 is not mine.** A concurrent session
  on the same Higgsfield account ran a Jasper & Berlioz cat study (`8901d594`, 22:15) plus several 4K
  `gpt_image_2` jobs. Worth knowing: **the Higgsfield account is shared and two agents were spending
  on it at the same time tonight.**

## Files

| Path | What |
|---|---|
| `creative-reset/lookdown-v1-1080x1920-10s.mp4` | the generation, 17.9 MB |
| `creative-reset/frames/sheet-lookdown-v1-10s.png` | 20-panel contact sheet, 0.5s spacing |
| `creative-reset/frames/ld-t0.2.png` · `ld-t5.0.png` · `ld-t9.8.png` | full-res frames |
| `creative-reset/frames/ld-zoom-t2.5-top.png` · `ld-zoom-t1.0-lowerleft.png` | 3× crops — the crescent evidence |
