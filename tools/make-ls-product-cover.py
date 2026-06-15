#!/usr/bin/env python3
"""
AstroPrecise Lemon Squeezy product cover — logo + solar system.

HD STANDARD (owner rule — all generated AstroPrecise images):
  - Min 3200px on longest edge for product/commerce art
  - LANCZOS resampling + 2x supersample on textures
  - UnsharpMask finish; JPEG quality >= 96, subsampling=0
  - Clear type, crisp planet detail, no muddy blur on hero elements
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BANNER = ROOT / "website" / "img" / "og-banner-improved.jpg"
LOGO_PNG = ROOT / "website" / "img" / "icon-512.png"
TEXTURES = ROOT / "website" / "assets" / "textures"
OUT = Path.home() / "OneDrive" / "Desktop" / "AstroPrecise-LS-Product-Cover.jpg"

# HD commerce cover — 3200px square
SIZE = 3200
JPEG_QUALITY = 96
SCALE = SIZE / 1600

GOLD = (201, 162, 39)
GOLD_LIGHT = (239, 227, 192)

# (texture, orbit factor, angle°, base display px @ 1600, optional ring)
PLANETS = [
    ("mercury.jpg", 0.16, 210, 34),
    ("venus.jpg", 0.24, 140, 42),
    ("earth.jpg", 0.32, 35, 52),
    ("mars.jpg", 0.39, 300, 46),
    ("jupiter.jpg", 0.50, 95, 96),
    ("saturn.jpg", 0.62, 250, 82, True),
    ("uranus.jpg", 0.72, 170, 62),
    ("neptune.jpg", 0.82, 20, 58),
]


def s(px: float) -> int:
    return max(1, int(px * SCALE))


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    base = int(size * SCALE)
    candidates = [
        Path(r"C:\Windows\Fonts\georgiab.ttf") if bold else Path(r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\timesbd.ttf") if bold else Path(r"C:\Windows\Fonts\times.ttf"),
    ]
    for p in candidates:
        if p.exists():
            return ImageFont.truetype(str(p), base)
    return ImageFont.load_default()


def render_logo(size: int) -> Image.Image:
    px = s(size)
    if not LOGO_PNG.exists():
        return Image.new("RGBA", (px, px), (0, 0, 0, 0))
    logo = Image.open(LOGO_PNG).convert("RGBA")
    w, h = logo.size
    side = min(w, h)
    logo = logo.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    # 2x supersample from source icon for crisp gold ring
    logo = logo.resize((px * 2, px * 2), Image.Resampling.LANCZOS)
    logo = logo.resize((px, px), Image.Resampling.LANCZOS)
    mask = Image.new("L", (px, px), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, px - 3, px - 3), fill=255)
    logo.putalpha(ImageChops.multiply(logo.split()[3], mask))
    return logo


def circle_mask(size: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    return m


def load_planet(filename: str, px: int) -> Image.Image:
    path = TEXTURES / filename
    if not path.exists():
        return Image.new("RGBA", (px, px), (*GOLD, 255))
    # 2x supersample textures for surface detail
    img = Image.open(path).convert("RGBA")
    img = img.resize((px * 2, px * 2), Image.Resampling.LANCZOS)
    img = img.resize((px, px), Image.Resampling.LANCZOS)
    img.putalpha(circle_mask(px))
    # Subtle limb shading
    shade = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    sd.ellipse((2, 2, px - 2, px - 2), fill=(0, 0, 0, 0))
    sd.ellipse((int(px * 0.55), int(px * 0.1), px - 2, px - 2), fill=(0, 0, 0, 55))
    img = Image.alpha_composite(img, shade)
    return img


def radial_glow(size: int, color: tuple[int, int, int], alpha: int = 180) -> Image.Image:
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    cx = cy = size // 2
    step = max(1, size // 160)
    for i in range(size // 2, 0, -step):
        a = int(alpha * (1 - i / (size / 2)) ** 1.8)
        d.ellipse((cx - i, cy - i, cx + i, cy + i), fill=(*color, a))
    return g


def draw_stars(draw: ImageDraw.ImageDraw, w: int, h: int, n: int) -> None:
    rng = random.Random(7)
    for _ in range(n):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        s_px = rng.choice((1, 1, 2, 2, 3, 4))
        c = rng.choice(((255, 255, 255, 200), (239, 227, 192, 160), (201, 162, 39, 110)))
        draw.ellipse((x, y, x + s_px, y + s_px), fill=c)


def draw_nebula(img: Image.Image) -> None:
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for cx, cy, rx, ry, col in (
        (int(w * 0.55), int(h * 0.48), s(420), s(280), (40, 80, 120, 40)),
        (int(w * 0.35), int(h * 0.55), s(300), s(200), (80, 40, 100, 32)),
        (int(w * 0.7), int(h * 0.35), s(260), s(180), (30, 100, 90, 26)),
    ):
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=col)
    layer = layer.filter(ImageFilter.GaussianBlur(s(38)))
    img.alpha_composite(layer)


def paste_center(base: Image.Image, overlay: Image.Image, cx: int, cy: int) -> None:
    base.alpha_composite(overlay, (cx - overlay.width // 2, cy - overlay.height // 2))


def draw_solar_system(img: Image.Image, cx: int, cy: int, max_r: int) -> None:
    draw = ImageDraw.Draw(img)
    orbit_w = max(1, s(1))

    for spec in PLANETS:
        r = int(max_r * spec[1])
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(201, 162, 39, 55), width=orbit_w)

    paste_center(img, radial_glow(s(340), (255, 220, 140), 200), cx, cy)
    paste_center(img, radial_glow(s(180), (255, 240, 200), 255), cx, cy)

    sun_px = s(56)
    sun = Image.new("RGBA", (sun_px, sun_px), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    sd.ellipse((4, 4, sun_px - 4, sun_px - 4), fill=(255, 248, 230, 255))
    sd.ellipse((10, 10, sun_px - 10, sun_px - 10), fill=(255, 220, 120, 255))
    paste_center(img, sun, cx, cy)

    for spec in PLANETS:
        fname, orbit_f, angle, base_px = spec[:4]
        has_ring = len(spec) > 4 and spec[4]
        r = int(max_r * orbit_f)
        rad = math.radians(angle - 90)
        px_pos = cx + int(r * math.cos(rad))
        py_pos = cy + int(r * math.sin(rad))
        planet = load_planet(fname, s(base_px))
        paste_center(img, planet, px_pos, py_pos)
        if has_ring:
            px = s(base_px)
            ring = Image.new("RGBA", (px + s(40), px + s(16)), (0, 0, 0, 0))
            rd = ImageDraw.Draw(ring)
            rw = max(2, s(3))
            rd.ellipse((4, 6, px + s(36), px + s(10)), outline=(210, 185, 140, 200), width=rw)
            rd.ellipse((8, 8, px + s(32), px + s(8)), outline=(180, 150, 100, 130), width=max(1, s(1)))
            ring = ring.rotate(-18, expand=True, resample=Image.Resampling.BICUBIC)
            paste_center(img, ring, px_pos, py_pos)


def finish_hd(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    return rgb.filter(ImageFilter.UnsharpMask(radius=s(1.2), percent=130, threshold=2))


def save_hd(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "JPEG", quality=JPEG_QUALITY, subsampling=0, optimize=True)


def main() -> None:
    if BANNER.exists():
        w, h = Image.open(BANNER).size
        side = min(w, h)
        left = (w - side) // 2
        top = int(h * 0.08)
        base = Image.open(BANNER).convert("RGBA").crop((left, top, left + side, top + side))
        base = base.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        base = base.filter(ImageFilter.GaussianBlur(s(2.2)))
    else:
        base = Image.new("RGBA", (SIZE, SIZE), (6, 8, 14, 255))

    img = Image.alpha_composite(base, Image.new("RGBA", (SIZE, SIZE), (4, 6, 12, 225)))
    draw_nebula(img)
    draw = ImageDraw.Draw(img)
    draw_stars(draw, SIZE, SIZE, int(280 * SCALE))

    logo_y = int(SIZE * 0.10)
    paste_center(img, radial_glow(s(320), GOLD, 120), SIZE // 2, logo_y)
    paste_center(img, render_logo(240), SIZE // 2, logo_y)

    title_font = load_font(88, bold=True)
    sub_font = load_font(42)
    tag_font = load_font(32)
    foot_font = load_font(28)

    title = "AstroPrecise"
    tw = draw.textbbox((0, 0), title, font=title_font)[2]
    draw.text(((SIZE - tw) // 2, int(SIZE * 0.185)), title, font=title_font, fill=GOLD_LIGHT)

    sub = "Personalised Chart Products"
    sw = draw.textbbox((0, 0), sub, font=sub_font)[2]
    draw.text(((SIZE - sw) // 2, int(SIZE * 0.245)), sub, font=sub_font, fill=GOLD)

    draw_solar_system(img, SIZE // 2, int(SIZE * 0.56), int(SIZE * 0.42))

    tags = "Deep Reading  ·  Poster PDF  ·  Gifts  ·  Year Ahead"
    taw = draw.textbbox((0, 0), tags, font=tag_font)[2]
    draw.text(((SIZE - taw) // 2, int(SIZE * 0.79)), tags, font=tag_font, fill=(215, 205, 185))

    bar_y = int(SIZE * 0.86)
    draw.rectangle((0, bar_y, SIZE, SIZE), fill=(2, 3, 8, 245))
    foot = "Your exact birth sky — computed, interpreted, delivered"
    fw = draw.textbbox((0, 0), foot, font=foot_font)[2]
    draw.text(((SIZE - fw) // 2, int(SIZE * 0.895)), foot, font=foot_font, fill=GOLD_LIGHT)
    legal = "Entertainment only"
    lw = draw.textbbox((0, 0), legal, font=foot_font)[2]
    draw.text(((SIZE - lw) // 2, int(SIZE * 0.935)), legal, font=foot_font, fill=(130, 120, 105))

    final = finish_hd(img)
    save_hd(final, OUT)
    alt = Path.home() / "Desktop" / OUT.name
    if alt.parent.exists():
        save_hd(final, alt)
    print(OUT)
    print(f"{SIZE}x{SIZE} HD @ q{JPEG_QUALITY} — {final.size[0]}px clear detail")


if __name__ == "__main__":
    main()