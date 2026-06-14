#!/usr/bin/env python3
"""Upscale AstroPrecise raster assets to HD targets (LANCZOS)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "website"

JOBS = [
    ("assets/images/zodiac-cards/*.jpg", 1200, 1800, 92),
    ("img/og-banner-improved.jpg", 2400, 1260, 90),
    ("img/hero-cosmic-ref.jpg", 2560, 1440, 90),
]


def upscale(path: Path, tw: int, th: int, quality: int) -> None:
    img = Image.open(path)
    if img.size == (tw, th):
        print(f"skip {path.name} (already {tw}x{th})")
        return
    out = img.resize((tw, th), Image.LANCZOS)
    if path.suffix.lower() in (".jpg", ".jpeg"):
        out.save(path, "JPEG", quality=quality, optimize=True)
    else:
        out.save(path, optimize=True)
    print(f"upscaled {path.relative_to(ROOT.parent)} -> {tw}x{th}")


def main() -> None:
    for pattern, tw, th, q in JOBS:
        for path in sorted(ROOT.glob(pattern)):
            upscale(path, tw, th, q)


if __name__ == "__main__":
    main()