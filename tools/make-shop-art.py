#!/usr/bin/env python3
"""
AstroPrecise shop category tiles + hero banner — LIVE cool-void + engraved-brass.

Category tiles are engine-still / engraved-seal compositions on cool void (no more
flat clip-art lozenges or line constellations). Product HERO images are owned by
tools/make-premium-product-mockups.py — this script no longer regenerates them.

HD STANDARD: min 1600px longest edge; LANCZOS + UnsharpMask; JPEG q96 subsampling=0.
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import _asset_lib as A
from _asset_lib import (
    BRASS, BRASS_BRIGHT, BRASS_VIVID, MID, MUTED, PARCHMENT, RAISED, VOID,
    OXBLOOD, TERRACOTTA,
    chart_plate, engine_backdrop, engine_still, finish, font, paste_seal, seal,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "website" / "img" / "shop"

CARD_W, CARD_H = 1600, 1000
JPEG_QUALITY = 96


def save(img: Image.Image, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    img.convert("RGB").save(path, "JPEG", quality=JPEG_QUALITY, subsampling=0, optimize=True)
    print(path)


def title(img: Image.Image, label: str) -> None:
    d = ImageDraw.Draw(img)
    tf = font(44, True)
    bb = d.textbbox((0, 0), label, font=tf)
    tw = bb[2] - bb[0]
    # cool scrim behind the title
    scrim = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(scrim).rectangle((0, 40, CARD_W, 150), fill=(*VOID, 160))
    img.alpha_composite(scrim.filter(ImageFilter.GaussianBlur(30)))
    d.text(((CARD_W - tw) // 2, 66), label, font=tf, fill=PARCHMENT)


def engraved_plate(img: Image.Image, cx: int, cy: int, w: int, h: int) -> None:
    """Engraved brass plate frame (the 'captured sky in a plate' motif)."""
    d = ImageDraw.Draw(img)
    d.rectangle((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2), outline=(*BRASS, 220), width=3)
    d.rectangle((cx - w // 2 + 8, cy - h // 2 + 8, cx + w // 2 - 8, cy + h // 2 - 8), outline=(*BRASS, 90), width=1)


# ── CATEGORY TILES — engine-still / seal compositions ───────────────────────────
def cat_prints() -> None:
    """A real captured sky still framed in an engraved plate."""
    img = engine_backdrop(CARD_W, CARD_H, "earth", darken=0.6, cx_frac=0.5, cy_frac=0.52, scale=0.72)
    cx, cy = CARD_W // 2, int(CARD_H * 0.54)
    engraved_plate(img, cx, cy, 640, 640)
    img.alpha_composite(chart_plate(560), (cx - 280, cy - 280))
    title(img, "Art Prints & Journals")
    save(finish(img), "cat-prints.jpg")


def cat_books() -> None:
    """Engine stills as 'volumes' on a cool shelf with engraved spines."""
    img = engine_backdrop(CARD_W, CARD_H, "jupiter", darken=0.72, cx_frac=0.5, cy_frac=0.4, scale=0.9)
    d = ImageDraw.Draw(img)
    shelf_y = int(CARD_H * 0.66)
    # three engraved 'book' plates, each faced with a small engine still
    bodies = ("saturn", "mars", "neptune")
    for i, (dx, bw, bh, body) in enumerate((( -220, 150, 300, bodies[0]),
                                            (0, 168, 340, bodies[1]),
                                            (210, 150, 300, bodies[2]))):
        x0 = CARD_W // 2 + dx - bw // 2
        y0 = shelf_y - bh
        d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), radius=8, fill=(*RAISED, 255), outline=(*BRASS, 150), width=2)
        still = engine_still(body).resize((bw - 28, bw - 28), Image.Resampling.LANCZOS)
        img.alpha_composite(still, (x0 + 14, y0 + 22))
        d.line((x0 + 16, y0 + 16, x0 + bw - 16, y0 + 16), fill=(*BRASS_BRIGHT, 120), width=2)
    d.line((CARD_W // 2 - 300, shelf_y, CARD_W // 2 + 300, shelf_y), fill=(*BRASS, 120), width=3)
    title(img, "Essential Reading")
    save(finish(img), "cat-books.jpg")


def cat_crystals() -> None:
    """Engraved faceted mineral over a real planet still (no purple lozenge)."""
    img = engine_backdrop(CARD_W, CARD_H, "neptune", darken=0.62, cx_frac=0.5, cy_frac=0.52, scale=0.8)
    cx, cy = CARD_W // 2, int(CARD_H * 0.55)
    d = ImageDraw.Draw(img)
    # engraved crystal facets in brass
    pts = [(cx, cy - 150), (cx + 88, cy - 20), (cx + 60, cy + 130), (cx - 60, cy + 130), (cx - 88, cy - 20)]
    d.polygon(pts, fill=(*MID, 150), outline=(*BRASS, 220))
    d.polygon([(cx, cy - 100), (cx + 48, cy), (cx, cy + 74), (cx - 48, cy)], outline=(*BRASS_BRIGHT, 200))
    d.line((cx, cy - 150, cx, cy + 130), fill=(*BRASS, 120), width=1)
    d.line((cx - 88, cy - 20, cx + 88, cy - 20), fill=(*BRASS, 120), width=1)
    title(img, "Crystals & Stones")
    save(finish(img), "cat-crystals.jpg")


def cat_oracle() -> None:
    """A fan of engraved brass seal cards over a cool void with a real still."""
    img = engine_backdrop(CARD_W, CARD_H, "moon", darken=0.66, cx_frac=0.5, cy_frac=0.5, scale=0.85)
    cx, cy = CARD_W // 2, int(CARD_H * 0.56)
    kinds = ("sun", "star", "moon", "star", "ascendant")
    for i, ang in enumerate(range(-32, 34, 16)):
        card = Image.new("RGBA", (150, 230), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, 149, 229), radius=12, fill=(*RAISED, 255), outline=(*BRASS, 170), width=2)
        s = seal(kinds[i], 96)
        card.alpha_composite(s, (75 - s.width // 2, 70))
        cd.line((28, 180, 122, 180), fill=(*BRASS, 90), width=1)
        card = card.rotate(-ang, expand=True, resample=Image.Resampling.BICUBIC)
        img.alpha_composite(card, (cx + int(math.sin(math.radians(ang)) * 150) - card.width // 2,
                                   cy - card.height // 2 + abs(ang)))
    title(img, "Oracle & Tarot")
    save(finish(img), "cat-oracle.jpg")


def cat_jewelry() -> None:
    """Engraved brass pendant seal on a chain over a real planet still."""
    img = engine_backdrop(CARD_W, CARD_H, "venus", darken=0.6, cx_frac=0.5, cy_frac=0.5, scale=0.78)
    cx, cy = CARD_W // 2, int(CARD_H * 0.5)
    d = ImageDraw.Draw(img)
    d.arc((cx - 200, cy - 160, cx + 200, cy + 120), 200, 340, fill=(*BRASS, 200), width=3)
    for i in range(9):
        ang = math.radians(200 + i * 17.5)
        px = cx + int(190 * math.cos(ang))
        py = cy - 20 + int(140 * math.sin(ang))
        d.ellipse((px - 4, py - 4, px + 4, py + 4), fill=(*BRASS_BRIGHT, 255))
    # pendant = engraved sun seal
    paste_seal(img, "sun", cx, cy + 150, px=130)
    title(img, "Jewellery & Accessories")
    save(finish(img), "cat-jewelry.jpg")


def hero_banner() -> None:
    """Wide shop hero: real earth-moon still + engraved chart plate on cool void."""
    W, H = 2400, 900
    img = engine_backdrop(W, H, "earth-moon", darken=0.5, cx_frac=0.74, cy_frac=0.52, scale=1.0)
    img.alpha_composite(chart_plate(560), (int(W * 0.74) - 280, H // 2 - 280))
    # left scrim + copy
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(scrim).rectangle((0, 0, int(W * 0.5), H), fill=(*VOID, 200))
    img.alpha_composite(scrim.filter(ImageFilter.GaussianBlur(80)))
    d = ImageDraw.Draw(img)
    d.text((120, 300), "Your sky, made tangible", font=font(72, True), fill=PARCHMENT)
    d.text((124, 400), "VSOP87 precision · instant PDF delivery", font=font(34), fill=(*BRASS, 220))
    paste_seal(img, "star", 140, 250, px=40)
    save(finish(img), "hero-banner.jpg")


def main() -> None:
    cat_books()
    cat_crystals()
    cat_oracle()
    cat_jewelry()
    cat_prints()
    hero_banner()


if __name__ == "__main__":
    main()
