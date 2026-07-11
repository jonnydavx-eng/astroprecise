#!/usr/bin/env python3
"""
make-og-cards.py — premium per-sign social share cards for AstroPrecise.

One 1200x630 OG/Twitter card per zodiac sign, built from the SAME proven
engine-still pipeline the shop art uses (tools/_asset_lib.py):

  * deep cool-void plate (#0C1016) with a faint tonal wash — never a painted sky
  * the sign's RULING-PLANET engine still (website/img/engine/<ruler>.webp — our
    own photoreal 3D render) composited on the right, feathered + soft-glowed so
    the transparent disc dissolves into the void (mirrors og-banner-v576.jpg)
  * copy block on the left: Cinzel eyebrow (dates · element), the sign NAME in
    Cormorant Garamond, a brass rule, and an honest one-line descriptor
  * the engraved brass zodiac seal for the sign (rasterized SVG, never a glyph)
  * the "ASTRO PRECISE" compass lockup bottom-left (the v576 brand mark)

Ruler-still map mirrors RULER_STILL in website/tools/generate-sign-pages.mjs
(Scorpio anchors on MARS — the engine's Pluto is a bare generated disc — so the
card matches the hero render exactly). Honesty rule: the still is our real
render, the copy states only facts (dates, element, ruling body). No accuracy
claims. Terracotta appears only as a hairline element accent, if at all.

Output: website/img/og/sign-<slug>.jpg  (JPEG q86, target <200KB each)
Run:    python tools/make-og-cards.py        (no server needed)
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

import _asset_lib as A
from _asset_lib import (
    BRASS, BRASS_BRIGHT, BRASS_VIVID, MID, MUTED, PARCHMENT, VOID,
    engine_still, seal,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "website" / "img" / "og"
FONTS = ROOT / "website" / "fonts"
FONT_CACHE = ROOT / "tools" / "_asset-cache" / "fonts-ttf"

CARD_W, CARD_H = 1200, 630
JPEG_QUALITY = 86
SIZE_BUDGET_KB = 200

# Element accent (semantic — matches --ap-element-* tokens / sign-page hero glow).
ELEMENT_ACCENT = {
    "Fire":  (184, 90, 66),    # #B85A42
    "Earth": (90, 122, 72),    # #5A7A48
    "Air":   (138, 122, 106),  # #8A7A6A
    "Water": (74, 117, 128),   # #4A7580
}

# ── Signs — the fields the card needs. Ruler-still MIRRORS RULER_STILL in
#    website/tools/generate-sign-pages.mjs (Scorpio → mars, not pluto). Keep in sync.
SIGNS = [
    {"key": "aries",       "name": "Aries",       "dates": "Mar 21 – Apr 19", "element": "Fire",  "still": "mars",    "ruler_label": "Mars"},
    {"key": "taurus",      "name": "Taurus",      "dates": "Apr 20 – May 20", "element": "Earth", "still": "venus",   "ruler_label": "Venus"},
    {"key": "gemini",      "name": "Gemini",      "dates": "May 21 – Jun 20", "element": "Air",   "still": "mercury", "ruler_label": "Mercury"},
    {"key": "cancer",      "name": "Cancer",      "dates": "Jun 21 – Jul 22", "element": "Water", "still": "moon",    "ruler_label": "the Moon"},
    {"key": "leo",         "name": "Leo",         "dates": "Jul 23 – Aug 22", "element": "Fire",  "still": "sun",     "ruler_label": "the Sun"},
    {"key": "virgo",       "name": "Virgo",       "dates": "Aug 23 – Sep 22", "element": "Earth", "still": "mercury", "ruler_label": "Mercury"},
    {"key": "libra",       "name": "Libra",       "dates": "Sep 23 – Oct 22", "element": "Air",   "still": "venus",   "ruler_label": "Venus"},
    {"key": "scorpio",     "name": "Scorpio",     "dates": "Oct 23 – Nov 21", "element": "Water", "still": "mars",    "ruler_label": "Mars"},
    {"key": "sagittarius", "name": "Sagittarius", "dates": "Nov 22 – Dec 21", "element": "Fire",  "still": "jupiter", "ruler_label": "Jupiter"},
    {"key": "capricorn",   "name": "Capricorn",   "dates": "Dec 22 – Jan 19", "element": "Earth", "still": "saturn",  "ruler_label": "Saturn"},
    {"key": "aquarius",    "name": "Aquarius",    "dates": "Jan 20 – Feb 18", "element": "Air",   "still": "uranus",  "ruler_label": "Uranus"},
    {"key": "pisces",      "name": "Pisces",      "dates": "Feb 19 – Mar 20", "element": "Water", "still": "neptune", "ruler_label": "Neptune"},
]


# ── Brand fonts (Cormorant Garamond + Cinzel) — convert woff2→ttf once, cache. ──
_FONT_TTF: dict[str, Path | None] = {}


def _woff2_to_ttf(woff2: Path) -> Path | None:
    """Convert a self-hosted woff2 to a cached TTF so PIL/FreeType can load it."""
    if not woff2.exists():
        return None
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    ttf = FONT_CACHE / (woff2.stem + ".ttf")
    if ttf.exists():
        return ttf
    try:
        from fontTools.ttLib import TTFont
        f = TTFont(str(woff2))
        f.flavor = None  # strip woff2 wrapper → plain TTF/OTF
        f.save(str(ttf))
        return ttf
    except Exception:
        return None


def _brand_ttf(stem: str) -> Path | None:
    if stem in _FONT_TTF:
        return _FONT_TTF[stem]
    ttf = _woff2_to_ttf(FONTS / f"{stem}.woff2")
    _FONT_TTF[stem] = ttf
    return ttf


def _load(candidates: list[Path | None], sz: int) -> ImageFont.FreeTypeFont:
    for p in candidates:
        if p and p.exists():
            try:
                return ImageFont.truetype(str(p), sz)
            except Exception:
                continue
    return A.font(sz)  # Georgia/Times fallback from the shared lib


def cormorant(sz: int, weight: int = 600) -> ImageFont.FreeTypeFont:
    return _load([_brand_ttf(f"cormorant-garamond-normal-{weight}"),
                  _brand_ttf("cormorant-garamond-normal-600"),
                  Path(r"C:\Windows\Fonts\georgiab.ttf")], sz)


def cormorant_italic(sz: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    return _load([_brand_ttf(f"cormorant-garamond-italic-{weight}"),
                  Path(r"C:\Windows\Fonts\georgiai.ttf")], sz)


def cinzel(sz: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    return _load([_brand_ttf(f"cinzel-normal-{weight}"),
                  Path(r"C:\Windows\Fonts\georgia.ttf")], sz)


# ── Text helpers ────────────────────────────────────────────────────────────────
def _tracked(draw: ImageDraw.ImageDraw, xy, text: str, font, fill, tracking: float):
    """Draw letter-spaced (tracked) text — Cinzel eyebrows read as small caps."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        w = draw.textbbox((0, 0), ch, font=font)[2]
        x += w + tracking
    return x


def _tracked_width(draw: ImageDraw.ImageDraw, text: str, font, tracking: float) -> float:
    w = 0.0
    for ch in text:
        w += draw.textbbox((0, 0), ch, font=font)[2] + tracking
    return w - tracking if text else 0.0


# ── Engine-still body, feathered + glowed into the void (right side) ─────────────
def _planet_layer(still_id: str, accent: tuple[int, int, int]) -> Image.Image:
    """
    Full-card layer with the ruling-planet engine still anchored right, feathered
    with a soft alpha falloff + an element-tinted glow well behind it. Mirrors the
    og-banner-v576 treatment (Earth right, dissolving into the void on the left).
    """
    layer = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))

    # Crop each still to its actual content so padding differences between engine
    # frames (sun ~0.58 fill, mars ~0.77, saturn's rings span full-width) don't
    # make the disc read big or small — every body is normalised to one on-card
    # diameter. Saturn (rings wider than tall) is fit by its LARGER edge so the
    # rings never clip; round bodies fit by diameter.
    body = engine_still(still_id)
    bb = body.split()[3].getbbox() or (0, 0, body.width, body.height)
    body = body.crop(bb)
    bw, bh = body.size

    diameter = 720  # on-card visual size of a round body
    long_edge = max(bw, bh)
    scale = diameter / long_edge
    tw, th = max(1, round(bw * scale)), max(1, round(bh * scale))
    body = body.resize((tw, th), Image.Resampling.LANCZOS)

    # anchor: centre-right, the disc bleeds a little off the right edge
    cx = int(CARD_W * 0.735)
    cy = int(CARD_H * 0.50)
    ox = cx - tw // 2
    oy = cy - th // 2

    # element glow well sized to the disc (paints depth without a painted sky)
    glow = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gr = int(max(tw, th) * 0.56)
    gd.ellipse((cx - gr, cy - gr, cx + gr, cy + gr), fill=(*accent, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(96))
    layer.alpha_composite(glow)

    # feather the still's own alpha so the cropped bounding box never reads as a
    # hard edge; the left-side linear fade below dissolves it toward the copy.
    r, g, b, a = body.split()
    feather = a.filter(ImageFilter.GaussianBlur(max(2, int(max(tw, th) * 0.012))))
    body = Image.merge("RGBA", (r, g, b, feather))

    layer.alpha_composite(body, (ox, oy))

    # left-edge dissolve: fade the whole planet layer into the void from ~x=0.40
    fade = Image.new("L", (CARD_W, CARD_H), 255)
    fd = ImageDraw.Draw(fade)
    x0, x1 = int(CARD_W * 0.34), int(CARD_W * 0.56)
    for x in range(CARD_W):
        if x <= x0:
            v = 0
        elif x >= x1:
            v = 255
        else:
            v = int(255 * (x - x0) / (x1 - x0))
        fd.line((x, 0, x, CARD_H), fill=v)
    la = ImageChops.multiply(layer.split()[3], fade)
    layer.putalpha(la)
    return layer


# ── Brand lockup (compass mark + ASTRO PRECISE) ─────────────────────────────────
def _brand_mark(px: int) -> Image.Image:
    """Rasterize the v576 compass logo-mark SVG to a transparent PNG (cached)."""
    svg = ROOT / "website" / "img" / "logo-mark.svg"
    out = FONT_CACHE.parent / f"logo-mark-{px}.png"
    if not out.exists():
        try:
            A._rasterize_svg(svg, px, out)  # retokens warm→cool then rasterizes
        except Exception:
            return Image.new("RGBA", (px, px), (0, 0, 0, 0))
    return Image.open(out).convert("RGBA")


def _lockup(img: Image.Image, x: int, y: int) -> None:
    d = ImageDraw.Draw(img)
    mark_px = 52
    mark = _brand_mark(mark_px)
    img.alpha_composite(mark, (x, y - mark.height // 2))
    tx = x + mark_px + 16
    f = cinzel(27, 600)
    baseline = y - 15
    end = _tracked(d, (tx, baseline), "ASTRO", f, PARCHMENT, 3.2)
    _tracked(d, (end + 12, baseline), "PRECISE", f, (*BRASS_BRIGHT, 255), 3.2)


# ── Card ────────────────────────────────────────────────────────────────────────
def build_card(s: dict) -> Image.Image:
    accent = ELEMENT_ACCENT[s["element"]]

    # 1) deep cool-void plate + faint tonal wash (same recipe as engine_backdrop)
    img = Image.new("RGBA", (CARD_W, CARD_H), (*VOID, 255))
    wash = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse((int(CARD_W * 0.34), int(-CARD_H * 0.30), int(CARD_W * 1.2), int(CARD_H * 1.0)),
               fill=(*MID, 110))
    wash = wash.filter(ImageFilter.GaussianBlur(130))
    img.alpha_composite(wash)

    # 2) ruling-planet engine still, feathered + glowed on the right
    img.alpha_composite(_planet_layer(s["still"], accent))

    # 3) left readability scrim so the copy always holds on the void
    scrim = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    ImageDraw.Draw(scrim).rectangle((0, 0, int(CARD_W * 0.52), CARD_H), fill=(*VOID, 150))
    img.alpha_composite(scrim.filter(ImageFilter.GaussianBlur(70)))

    d = ImageDraw.Draw(img)
    left = 72

    # 4) engraved zodiac seal (brass hex plate) above the name
    sl = seal(s["key"], 96)
    seal_y = 150
    img.alpha_composite(sl, (left, seal_y - sl.height // 2))

    # 5) Cinzel eyebrow — dates · element (tracked small caps, brass)
    eyebrow = f"{s['dates'].upper()}   ·   {s['element'].upper()} SIGN"
    ef = cinzel(20, 600)
    _tracked(d, (left, 218), eyebrow, ef, (*BRASS_BRIGHT, 255), 2.6)

    # 6) sign NAME — Cormorant Garamond, parchment
    nf = cormorant(96, 600)
    d.text((left - 3, 250), s["name"], font=nf, fill=PARCHMENT)

    # 7) brass rule
    name_bottom = 250 + d.textbbox((0, 0), s["name"], font=nf)[3]
    ry = name_bottom + 22
    d.line((left, ry, left + 120, ry), fill=(*BRASS, 200), width=2)

    # 8) honest one-line descriptor (italic Cormorant) — states only facts
    sub = f"Ruled by {s['ruler_label']}"
    sf = cormorant_italic(31, 400)
    d.text((left, ry + 20), sub, font=sf, fill=(*MUTED, 255))

    # 9) brand lockup bottom-left
    _lockup(img, left, CARD_H - 52)

    # 10) subtle vignette finish (soften corners, unify plate)
    return A.vignette(img, 0.30)


def save(img: Image.Image, slug: str) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"sign-{slug}.jpg"
    # UnsharpMask for a crisp, printed-plate feel; q86 keeps each card <200KB
    out = img.convert("RGB").filter(ImageFilter.UnsharpMask(1.0, 90, 2))
    out.save(path, "JPEG", quality=JPEG_QUALITY, subsampling=1, optimize=True, progressive=True)
    kb = path.stat().st_size / 1024
    flag = "  OVER BUDGET" if kb > SIZE_BUDGET_KB else ""
    print(f"  {path.name:24s} {kb:6.1f} KB{flag}")
    return path.stat().st_size


def main() -> None:
    print(f"Building {len(SIGNS)} OG cards → {OUT_DIR.relative_to(ROOT)}")
    total = 0
    over = []
    for s in SIGNS:
        img = build_card(s)
        size = save(img, s["key"])
        total += size
        if size / 1024 > SIZE_BUDGET_KB:
            over.append(s["key"])
    print(f"Total {total/1024:.1f} KB across {len(SIGNS)} cards")
    if over:
        print(f"OVER BUDGET: {', '.join(over)} — lower JPEG_QUALITY and re-run")


if __name__ == "__main__":
    main()
