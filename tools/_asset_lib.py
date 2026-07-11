#!/usr/bin/env python3
"""
Shared asset library for AstroPrecise shop-art generators.

Provides the LIVE cool-void + engraved-brass palette, real ENGINE-still backdrops
(website/img/engine/*.webp), rasterized engraved brass seals (no more ☐ glyph tofu),
and an Edge-free "PDF cover" builder (engine still + engraved chart plate + typography)
so product heroes no longer depend on a broken headless-Edge screenshot path.

Hard rules honoured:
  * sky imagery comes ONLY from the real engine renders — never painted starfields.
  * ☉ ☽ ↑ ✦ come from rasterized engraved SVG seals — never text glyphs.
  * oxblood / terracotta strictly a badge / CTA accent.
"""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ENGINE = ROOT / "website" / "img" / "engine"
SEALS = ROOT / "website" / "assets" / "images" / "seals"
CACHE = ROOT / "tools" / "_asset-cache"

# ── LIVE COOL-VOID + ENGRAVED-BRASS TOKENS (verified 2026-07-02) ────────────────
VOID = (12, 16, 22)        # #0C1016 deep/base
MID = (18, 24, 38)         # #121826 mid
RAISED = (26, 34, 48)      # #1A2230 raised
BRASS = (194, 160, 94)     # #C2A05E core
BRASS_BRIGHT = (205, 174, 106)  # #CDAE6A
BRASS_VIVID = (216, 185, 120)   # #D8B978
PARCHMENT = (236, 230, 216)     # #ECE6D8
MUTED = (150, 158, 172)         # cool grey-blue body ink support
# accent — badge / CTA ONLY
OXBLOOD = (122, 42, 46)         # cool-leaning oxblood
TERRACOTTA = (176, 92, 70)

# Hex forms for SVG retokening (warm → cool)
WARM_TO_COOL_HEX = {
    "#050406": "#0C1016",
    "#040305": "#0A0E14",
    "#070509": "#0E141F",
    "#0d0a09": "#10151E",
    "#0d0a08": "#10151E",
    "#120e0a": "#141A26",
    "#2a2218": "#1F2735",
    "#1a1208": "#141A26",
    "#c9a227": "#C2A05E",
    "#C9A227": "#C2A05E",
    "#e6c24a": "#CDAE6A",
    "#f3dd97": "#D8B978",
    "#fff6dd": "#F1EAD6",
    "#b8901f": "#A98A4E",
    "#efe3c0": "#ECE6D8",
    "#f0e9da": "#ECE6D8",
    "#caa46a": "#C2A05E",
    "#d8d2cc": "#D6D2C8",
    "#a6aeb8": "#969EAC",
    "#b9c4cf": "#9AA6B4",
    # warm rgba() brass → cool brass rgba (194,160,94)
    "rgba(201,162,39,": "rgba(194,160,94,",
    "rgba(201, 162, 39,": "rgba(194,160,94,",
    "rgba(230,194,74,": "rgba(205,174,106,",
    "rgba(4,3,5,": "rgba(9,12,18,",
}

_MAGICK = Path(r"C:\Program Files\ImageMagick-7.1.2-Q16-HDRI\magick.exe")


def magick() -> Path:
    if _MAGICK.exists():
        return _MAGICK
    raise FileNotFoundError("ImageMagick 'magick' not found — needed to rasterize seals")


def font(sz: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        Path(r"C:\Windows\Fonts\georgiab.ttf") if bold else Path(r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\timesbd.ttf") if bold else Path(r"C:\Windows\Fonts\times.ttf"),
    ]
    for p in paths:
        if p.exists():
            return ImageFont.truetype(str(p), sz)
    return ImageFont.load_default()


def retoken_svg_text(text: str) -> str:
    """Warm → cool hex/rgba find-replace for SVG source."""
    for warm, cool in WARM_TO_COOL_HEX.items():
        text = text.replace(warm, cool)
    return text


# ── ENGINE STILLS ───────────────────────────────────────────────────────────────
_ENGINE_CACHE: dict[str, Image.Image] = {}


def engine_still(name: str) -> Image.Image:
    """Load a transparent 1024² engine render (e.g. 'earth', 'earth-moon', 'sun')."""
    if name in _ENGINE_CACHE:
        return _ENGINE_CACHE[name].copy()
    p = ENGINE / f"{name}.webp"
    if not p.exists():
        p = ENGINE / "earth.webp"
    img = Image.open(p).convert("RGBA")
    _ENGINE_CACHE[name] = img.copy()
    return img


def engine_backdrop(w: int, h: int, body: str = "earth", *,
                    scale: float = 0.92, cx_frac: float = 0.72, cy_frac: float = 0.46,
                    darken: float = 0.52, seed: int = 0) -> Image.Image:
    """
    A cool-void canvas with a REAL engine still composited as the backdrop body,
    darkened + vignetted so engraved product framing reads on top. No painted sky.
    """
    base = Image.new("RGBA", (w, h), (*VOID, 255))
    # subtle cool gradient wash (not a sky — just tonal depth on the void)
    wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse((int(w * 0.30), int(-h * 0.25), int(w * 1.15), int(h * 0.95)),
               fill=(*MID, 90))
    wash = wash.filter(ImageFilter.GaussianBlur(120))
    base.alpha_composite(wash)

    body_img = engine_still(body)
    target = int(min(w, h) * scale)
    body_img = body_img.resize((target, target), Image.Resampling.LANCZOS)
    # darken by scaling the still's OWN pixels (not a rectangular overlay) so the
    # bounding box never reads as a dark square on the void
    r, g, b, a = body_img.split()
    k = 1.0 - darken
    r = r.point(lambda v: int(v * k))
    g = g.point(lambda v: int(v * k))
    b = b.point(lambda v: int(v * k))
    # feather the alpha with a radial mask so the disc dissolves into the void
    feather = Image.new("L", body_img.size, 0)
    ImageDraw.Draw(feather).ellipse((0, 0, target - 1, target - 1), fill=255)
    feather = feather.filter(ImageFilter.GaussianBlur(target * 0.03))
    a = ImageChops.multiply(a, feather)
    body_img = Image.merge("RGBA", (r, g, b, a))
    cx = int(w * cx_frac)
    cy = int(h * cy_frac)
    base.alpha_composite(body_img, (cx - target // 2, cy - target // 2))
    return base


# ── VIGNETTE / FINISH ─────────────────────────────────────────────────────────
def vignette(img: Image.Image, strength: float = 0.42) -> Image.Image:
    w, h = img.size
    v = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(v)
    d.ellipse((-w * 0.12, -h * 0.16, w * 1.12, h * 1.16), fill=255)
    v = v.filter(ImageFilter.GaussianBlur(90))
    dark = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dark.putalpha(ImageChops.invert(v).point(lambda x: int(x * strength)))
    return Image.alpha_composite(img.convert("RGBA"), dark)


# ── ENGRAVED BRASS SEALS (rasterized once, cached) ──────────────────────────────
_SEAL_CACHE: dict[tuple[str, int], Image.Image] = {}


def _rasterize_svg(svg_path: Path, px: int, out_png: Path) -> None:
    """Retoken warm→cool then rasterize to a transparent PNG via ImageMagick."""
    src = retoken_svg_text(svg_path.read_text(encoding="utf-8"))
    tmp_svg = CACHE / (svg_path.stem + "_cool.svg")
    CACHE.mkdir(parents=True, exist_ok=True)
    tmp_svg.write_text(src, encoding="utf-8")
    subprocess.run(
        [str(magick()), "-background", "none", "-density", "384",
         str(tmp_svg), "-resize", f"{px}x{px}", str(out_png)],
        check=True, capture_output=True,
    )


def seal(kind: str, px: int = 128) -> Image.Image:
    """
    Return a rasterized cool-brass engraved seal image (RGBA, transparent).
    kind: a planet name ('sun','moon',…), an instrument ('chart'), or a synthetic
    glyph ('ascendant','star').
    """
    key = (kind, px)
    if key in _SEAL_CACHE:
        return _SEAL_CACHE[key].copy()

    if kind in ("ascendant", "star"):
        img = _synthetic_seal(kind, px)
        _SEAL_CACHE[key] = img.copy()
        return img

    # locate the source SVG
    candidates = [
        SEALS / "planets" / f"{kind}.svg",
        SEALS / "instruments" / f"{kind}.svg",
        SEALS / "zodiac" / f"{kind}.svg",
        SEALS / "elements" / f"{kind}.svg",
    ]
    svg = next((c for c in candidates if c.exists()), None)
    CACHE.mkdir(parents=True, exist_ok=True)
    out = CACHE / f"seal-{kind}-{px}.png"
    if svg is not None:
        try:
            _rasterize_svg(svg, px, out)
            img = Image.open(out).convert("RGBA")
        except Exception:
            img = _synthetic_seal("star", px)
    else:
        img = _synthetic_seal("star", px)
    _SEAL_CACHE[key] = img.copy()
    return img


def _plate(px: int) -> Image.Image:
    """Hexagonal engraved brass plate matching the seal SVGs (cool palette)."""
    s = px
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def hexpts(inset: float):
        # matches viewBox 0..96 x 0..112 hex: top, ur, lr, bottom, ll, ul
        pts96 = [(48, 6), (86, 28), (86, 84), (48, 106), (10, 84), (10, 28)]
        out = []
        for x, y in pts96:
            nx = 48 + (x - 48) * inset
            ny = 56 + (y - 56) * inset
            out.append((nx / 112 * s, ny / 112 * s))
        return out

    # plate fill (raised void)
    d.polygon(hexpts(1.0), fill=(*MID, 255))
    d.polygon(hexpts(1.0), outline=(*BRASS, 230))
    d.polygon(hexpts(0.82), outline=(*BRASS, 100))
    return img


def _synthetic_seal(kind: str, px: int) -> Image.Image:
    """Build ascendant (↑) and star (✦) engraved seals in the plate style."""
    img = _plate(px)
    d = ImageDraw.Draw(img)
    c = px / 2
    if kind == "ascendant":
        # engraved upward arrow / ascendant marker
        r = px * 0.24
        d.line((c, c + r, c, c - r), fill=(*BRASS_VIVID, 255), width=max(2, px // 40))
        d.line((c - r * 0.62, c - r * 0.30, c, c - r), fill=(*BRASS_VIVID, 255), width=max(2, px // 40))
        d.line((c + r * 0.62, c - r * 0.30, c, c - r), fill=(*BRASS_VIVID, 255), width=max(2, px // 40))
        d.line((c - r * 0.5, c + r * 0.55, c + r * 0.5, c + r * 0.55), fill=(*BRASS, 200), width=max(1, px // 60))
    else:  # star ✦
        r = px * 0.26
        r2 = r * 0.4
        pts = []
        for i in range(8):
            ang = math.radians(i * 45 - 90)
            rr = r if i % 2 == 0 else r2
            pts.append((c + rr * math.cos(ang), c + rr * math.sin(ang)))
        d.polygon(pts, fill=(*BRASS_VIVID, 235), outline=(*BRASS_BRIGHT, 255))
    return img


def paste_seal(base: Image.Image, kind: str, cx: int, cy: int, px: int = 96) -> None:
    s = seal(kind, px)
    base.alpha_composite(s, (cx - s.width // 2, cy - s.height // 2))


# ── ENGRAVED CHART PLATE (secondary layer, Edge-free) ───────────────────────────
def chart_plate(size: int, *, planets: bool = True) -> Image.Image:
    """
    Engraved natal chart-wheel rendered on a transparent layer in cool brass.
    Replaces the need for an Edge screenshot of a printed wheel.
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = cy = size // 2
    r = int(size * 0.46)
    for ring, w, a in ((r, 2, 150), (int(r * 0.80), 1, 90), (int(r * 0.52), 1, 60)):
        d.ellipse((cx - ring, cy - ring, cx + ring, cy + ring), outline=(*BRASS, a), width=w)
    for i in range(12):
        ang = math.radians(i * 30 - 90)
        x1 = cx + math.cos(ang) * r * 0.52
        y1 = cy + math.sin(ang) * r * 0.52
        x2 = cx + math.cos(ang) * r
        y2 = cy + math.sin(ang) * r
        d.line((x1, y1, x2, y2), fill=(*BRASS, 70), width=1)
    if planets:
        # a few engraved planet ticks (sample positions)
        for frac_a, frac_r, col in ((28, 0.66, BRASS_VIVID), (140, 0.70, BRASS_BRIGHT),
                                    (212, 0.60, BRASS), (300, 0.72, TERRACOTTA)):
            ang = math.radians(frac_a - 90)
            px_ = cx + math.cos(ang) * r * frac_r
            py_ = cy + math.sin(ang) * r * frac_r
            pr = max(4, size // 90)
            d.ellipse((px_ - pr, py_ - pr, px_ + pr, py_ + pr), fill=(*col, 255))
    return img


def badge(img: Image.Image, text: str, x: int, y: int) -> None:
    """Oxblood CTA/accent badge (accent used ONLY here)."""
    d = ImageDraw.Draw(img)
    f = font(15, True)
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle((x, y, x + tw + 34, y + th + 18), radius=15,
                        fill=(*OXBLOOD, 235), outline=(*BRASS, 200), width=2)
    d.text((x + 17, y + 7 - bb[1] % 4), text, font=f, fill=PARCHMENT)


def sample_caption(img: Image.Image, cx: int, y: int,
                   text: str = "Example chart · personalised from your birth details") -> None:
    """Honesty caption — the hero art uses a fixed sample; label it as such."""
    d = ImageDraw.Draw(img)
    f = font(16)
    bb = d.textbbox((0, 0), text, font=f)
    tw = bb[2] - bb[0]
    pad = 14
    d.rounded_rectangle((cx - tw // 2 - pad, y - 6, cx + tw // 2 + pad, y + 28),
                        radius=14, fill=(*VOID, 210), outline=(*BRASS, 120), width=1)
    d.text((cx, y + 3), text, font=f, fill=(*PARCHMENT, 235), anchor="ma")


def watermark(img: Image.Image, label: str = "ASTROPRECISE") -> None:
    """Brand line with a rasterized ✦ seal instead of a tofu glyph."""
    w, h = img.size
    d = ImageDraw.Draw(img)
    text = f"{label}  ·  VSOP87  ·  PERSONALISED FROM YOUR CHART"
    f = font(11)
    bb = d.textbbox((0, 0), text, font=f)
    tw = bb[2] - bb[0]
    star_px = 22
    total = tw + star_px + 10
    x0 = w // 2 - total // 2
    paste_seal(img, "star", x0 + star_px // 2, h - 24, px=star_px)
    d.text((x0 + star_px + 10, h - 30), text, font=f, fill=(*MUTED, 190))


def finish(img: Image.Image, vstrength: float = 0.36) -> Image.Image:
    return vignette(img, vstrength).convert("RGB").filter(ImageFilter.UnsharpMask(1.1, 115, 2))
