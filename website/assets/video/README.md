# Cinematic hero backdrop — drop your Seedance clip here

The home page (`index.html`) plays an **ambient cinematic video** behind the hero.
It loads on demand, after first paint, only on capable devices (skipped for
reduced-motion, data-saver, slow connections, and Lighthouse/audit) — so it never
costs you performance, and if the files are missing it simply shows the existing
hero. The text sits on a blurred dark card, so legibility is safe.

## What's here now (placeholder)

| File | What it is |
|------|------------|
| `cosmic-hero.webm` / `cosmic-hero.mp4` | A **placeholder** 12 s slow-drift loop, generated from `img/hero-cosmic-ref.jpg`. Replace these. |
| `cosmic-hero-poster.jpg` | Optimised still (58 KB), spare — not currently referenced. |

## To upgrade with a real Seedance clip

1. Generate a clip in **Seedance 2.0** (via Dreamina, Runway, or CapCut — your account).
   Prompt direction that fits the brand (deep near-black + engraved gold, real astronomy,
   restrained/luxe — NOT busy):
   > "Slow cinematic drift through a deep-black starfield toward a softly glowing
   > golden nebula; subtle parallax of distant stars; calm, premium, observatory
   > mood; seamless loop; no text; no people; muted gold and warm parchment tones."
2. Export it, then encode to **both** formats and overwrite the two files (keep the names):
   ```bash
   # from repo root, with ffmpeg installed
   ffmpeg -y -i YOUR_SEEDANCE_CLIP.mp4 -an -vf "scale=1280:-2,format=yuv420p" \
     -c:v libx264 -preset slow -crf 28 -movflags +faststart \
     website/assets/video/cosmic-hero.mp4
   ffmpeg -y -i website/assets/video/cosmic-hero.mp4 -an -c:v libvpx-vp9 -crf 38 -b:v 0 \
     -row-mt 1 website/assets/video/cosmic-hero.webm
   ```

## Specs / guidance
- **Silent** (the `<video>` is muted; audio is stripped on encode anyway).
- **Seamless loop** — Seedance 2.0 supports loop-friendly output; otherwise keep motion
  gentle so the loop point is unobtrusive (the video plays at ~50% opacity under a dark
  vignette, so small loop jumps disappear).
- Target **≤ ~1.5 MB** per file (it lazy-loads, but smaller = snappier). 1280×720 is plenty
  at 50% opacity; 1080p only if the file stays small.
- No on-screen text or faces — it's ambient, behind the hero copy.
- **Honesty:** keep it abstract/cosmic. It is mood, not a depiction of anyone's chart.

Once the files are replaced, nothing else needs changing — the loader (`index.html`,
inline script near the bottom) and styles (`css/lite-critical.css`, `.hero__cinematic*`)
already pick them up.
