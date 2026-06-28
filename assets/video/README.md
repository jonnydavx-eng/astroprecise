# Optional Seedance cinematic backdrop — drop your clip here

The home page can play an **optional cinematic loop *behind the live orrery*** in the
hero (it is **OFF by default** — the page is identical to today until you add a clip).
When configured, it loads lazily after first paint, only on capable devices
(skipped for reduced-motion, coarse-pointer/mobile, data-saver, sub-4g, and
headless/audit), sits **behind** the live orrery instrument with a soft ring mask,
and **pauses itself whenever the orrery scrolls off-screen**. It can never become a
blocking intro, and if the file is missing it simply shows the live orrery (today's view).

> ⚠️ The old `cosmic-hero.mp4` / `cosmic-hero.webm` / `cosmic-hero-poster.jpg` here are
> **leftovers** from the previous full-hero ambient-video feature, which was **removed**
> (ap-v471). Nothing references them anymore — you can delete them, or repurpose one as
> the orrery clip below.

## To activate (two steps)

1. **Add a clip** here as `orrery-loop.mp4` (an ~8-second seamless loop). Encode it:
   ```bash
   # from repo root, with ffmpeg installed
   ffmpeg -y -i YOUR_SEEDANCE_CLIP.mp4 -an -vf "scale=1920:-2,format=yuv420p" \
     -c:v libx264 -preset slow -crf 24 -movflags +faststart \
     website/assets/video/orrery-loop.mp4
   ```
   Keep it **≤ 4 MB**. (A `.webm` variant is optional; if you make one, point the
   attribute below at whichever single file you prefer.)

2. **Flip it on**: in `index.html`, find the `<video id="orrery-seedance" …>` element
   (first child of `#orrery-viewport`) and set its attribute:
   ```html
   data-ap-seedance-src="assets/video/orrery-loop.mp4"
   ```
   That's it. `js/ap-seedance.js` reads the attribute and handles the rest.

## Prompt direction (Seedance 2.x — your account)

Fits the "Living Observatory" brand (deep near-black void + engraved gold, real
astronomy, restrained/luxe — **not** busy):

> "deep void #040305, engraved-gold #C9A227 astral orrery rotating gently, cool-silver
> starlight accents, 35mm cinematic depth, slow orbital camera, 8s seamless loop, no text"

## Specs / guidance
- **Silent** (the `<video>` is muted; strip audio on encode).
- **Seamless loop** — keep motion gentle so the loop point is unobtrusive (it plays at
  ~45% opacity under a ring mask, so small loop jumps disappear).
- **1920×1080**, `+faststart`, **≤ 4 MB**.
- No on-screen text or faces — it's ambient, behind the instrument.
- **Honesty:** keep it abstract/cosmic. It is mood, not a depiction of anyone's chart.
- Want more/less of the clip visible? Tune the `.orrery-seedance` `mask-image` radial
  stops in `css/lite-critical.css`.
