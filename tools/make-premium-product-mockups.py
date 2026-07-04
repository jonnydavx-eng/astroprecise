#!/usr/bin/env python3
"""
Premium product heroes — anchored to the REAL 3D-engine art.

Every checkout hero is built from:
  * a real ENGINE still (website/img/engine/*.webp) as the sky backdrop / print art,
  * engraved brass chart framing (vector, cool palette),
  * rasterized engraved brass seals for ☉ ☽ ↑ ✦ (no more ☐ glyph tofu),
all on the LIVE cool-void palette. Oxblood is a badge/CTA accent only.

Sky-preview heroes (Deep Reading, Natal Poster) show a large engine still as the
anchor with the printed chart-wheel as a secondary layer, and carry an honesty
caption because the sample chart is a fixed "Jane Example", not the buyer's.

Edge-free: the previous headless-Edge screenshot path is broken on this machine, so
"PDF cover" previews are composited from engine stills + engraved plates in PIL.

Output: website/img/shop/product-*.jpg (1600×900, JPEG q96)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import _asset_lib as A
from _asset_lib import (
    BRASS, BRASS_BRIGHT, BRASS_VIVID, MUTED, PARCHMENT, MID, RAISED, VOID,
    OXBLOOD, TERRACOTTA,
    badge, chart_plate, engine_backdrop, engine_still, finish, font,
    paste_seal, sample_caption, seal, watermark,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "website" / "img" / "shop"
GALLERY = ROOT / "tools" / "premium-mockups-gallery.html"

W, H = 1600, 900
Q = 96

# Per-SKU marketing identity. accent2 is a supporting brass/cool tone (never a
# fake sky). The engine 'body' names the real still used as backdrop/print.
SKU = {
    "deep-reading":    dict(eyebrow="The Reading",    title="Deep Natal Reading", hook="13 pages written for your chart alone",           badge="Personalised", body="earth",       sky_hero=True),
    "natal-poster-pdf":dict(eyebrow="Print tonight",  title="Natal Sky PDF",      hook="Engraved brass on cool void — any size at home", badge="Instant · £6", body="earth",       sky_hero=False),
    "reading-poster-bundle":dict(eyebrow="Best value",title="Reading + Poster",   hook="The words and the map — one chart, two keepsakes",badge="Save £2",     body="earth-moon",  sky_hero=False),
    "two-skies-map":   dict(eyebrow="For two charts", title="Two Skies",          hook="Your sky & theirs — one anniversary print",       badge="Together",     body="earth-moon",  sky_hero=False),
    "gift-reading":    dict(eyebrow="A gift",         title="Gift a Reading",     hook="Voucher + your note — they redeem privately",     badge="Thoughtful",   body="moon",        sky_hero=False),
    "gift-box-whole-sky":dict(eyebrow="The whole sky",title="Gift Box",          hook="Reading PDF + brass print + card — shipped",      badge="Premium gift", body="earth-moon",  sky_hero=False),
    "natal-poster":    dict(eyebrow="On your wall",   title="Art Poster",         hook="Museum matte · your exact first-breath sky",      badge="Signature",    body="earth",       sky_hero=True),
    "big-three-print": dict(eyebrow="Distilled",      title="Big Three Print",    hook="Sun · Moon · Rising — the spine of your chart",   badge="Desk piece",   body="sun",         sky_hero=False),
    "sky-tee":         dict(eyebrow="Wear your sky",  title="Your Sky Tee",       hook="Your birth-night sky, engraved on cotton",        badge="New",          body="earth",       sky_hero=False),
    "sky-hoodie":      dict(eyebrow="Heavyweight",    title="Sky Hoodie",         hook="Natal canopy across the back · 350gsm fleece",    badge="Cozy",         body="earth-moon",  sky_hero=False),
    "constellation-mug":dict(eyebrow="Morning ritual",title="Star Map Mug",      hook="Your birthplace sky wrapped around ceramic",      badge="£9",           body="moon",        sky_hero=False),
    "year-ahead":      dict(eyebrow="12 months ahead",title="Year Ahead",        hook="Every major transit — dated for your chart",      badge="12 months",    body="jupiter",     sky_hero=False),
    "solar-return":    dict(eyebrow="Birthday ritual",title="Solar Return",      hook="The sky when your Sun returns — your year theme",  badge="Annual",       body="sun",         sky_hero=False),
}


# ── shared framing helpers ──────────────────────────────────────────────────────
def base_scene(sku: str, *, darken: float = 0.55, cx_frac: float = 0.72,
               scale: float = 0.95) -> Image.Image:
    m = SKU[sku]
    return engine_backdrop(W, H, m["body"], darken=darken, cx_frac=cx_frac, scale=scale)


def left_scrim(img: Image.Image, width: int = 620) -> None:
    """Cool scrim under the left copy rail so type stays legible over the still."""
    scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(scrim)
    d.rectangle((0, 0, width, H), fill=(*VOID, 205))
    scrim = scrim.filter(ImageFilter.GaussianBlur(60))
    img.alpha_composite(scrim)


def hero_copy(img: Image.Image, sku: str, ax: int = 72, ay: int = 118) -> None:
    m = SKU[sku]
    d = ImageDraw.Draw(img)
    d.text((ax, ay), m["eyebrow"].upper(), font=font(14), fill=(*BRASS, 210))
    d.text((ax, ay + 34), m["title"], font=font(46, True), fill=PARCHMENT)
    d.text((ax, ay + 100), m["hook"], font=font(21), fill=(*MUTED, 255))
    badge(img, m["badge"], ax, ay + 152)


def divider(img: Image.Image, x: int, y0: int = 100, y1: int = H - 80) -> None:
    ImageDraw.Draw(img).line((x, y0, x, y1), fill=(*BRASS, 55), width=1)


def framed_print(body: str, size: int, *, plate: bool = True) -> Image.Image:
    """A print tile: engine still cropped square, engraved brass border + chart plate."""
    still = engine_still(body).resize((size, size), Image.Resampling.LANCZOS)
    tile = Image.new("RGBA", (size, size), (*VOID, 255))
    tile.alpha_composite(still)
    if plate:
        tile.alpha_composite(chart_plate(size))
    d = ImageDraw.Draw(tile)
    d.rectangle((0, 0, size - 1, size - 1), outline=(*BRASS, 220), width=max(2, size // 90))
    d.rectangle((6, 6, size - 7, size - 7), outline=(*BRASS, 90), width=1)
    return tile


def paste(base: Image.Image, layer: Image.Image, cx: int, cy: int,
          scale: float = 1.0, angle: float = 0.0, shadow: bool = True) -> None:
    p = layer
    if scale != 1.0:
        p = p.resize((int(p.width * scale), int(p.height * scale)), Image.Resampling.LANCZOS)
    if angle:
        p = p.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", (p.width + 48, p.height + 48), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((24, 26, p.width + 12, p.height + 14),
                                             radius=8, fill=(0, 0, 0, 130))
        sh = sh.filter(ImageFilter.GaussianBlur(16))
        base.alpha_composite(sh, (cx - p.width // 2 - 8, cy - p.height // 2 + 8))
    base.alpha_composite(p, (cx - p.width // 2, cy - p.height // 2))


def save(img: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    img.save(p, "JPEG", quality=Q, subsampling=0, optimize=True)
    print(p)
    return p


# ── SKY-PREVIEW HEROES ──────────────────────────────────────────────────────────
def mock_deep_reading() -> Image.Image:
    """Sky-preview hero: large blue-marble earth anchor + printed chart-wheel layer."""
    img = engine_backdrop(W, H, "earth", darken=0.34, cx_frac=0.70, cy_frac=0.48, scale=1.06)
    left_scrim(img, 640)
    hero_copy(img, "deep-reading")
    # printed chart wheel as secondary layer over the sky
    paste(img, chart_plate(520), int(W * 0.70), int(H * 0.50), shadow=False)
    divider(img, 500)
    # big-three seals as engraved marks
    for i, k in enumerate(("sun", "moon", "ascendant")):
        paste_seal(img, k, 540 + i * 74, 470, px=64)
    d = ImageDraw.Draw(img)
    d.text((540, 520), "Sun · Moon · Rising  +  10 aspects · house tour", font=font(15), fill=(*BRASS_BRIGHT, 200))
    sample_caption(img, int(W * 0.70), H - 118)
    watermark(img, "DEEP READING")
    return finish(img)


def mock_natal_poster() -> Image.Image:
    """Sky-preview hero: the print IS a captured sky still, framed and hung."""
    img = engine_backdrop(W, H, "earth", darken=0.66, cx_frac=0.30, cy_frac=0.5, scale=1.3)
    d = ImageDraw.Draw(img)
    # gallery wall panel behind the frame
    wall = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(wall).rectangle((int(W * 0.44), 40, W - 40, H - 80), fill=(*MID, 235))
    wall = wall.filter(ImageFilter.GaussianBlur(2))
    img.alpha_composite(wall)
    hero_copy(img, "natal-poster")
    # framed poster = engine still + chart plate in a brass frame
    print_tile = framed_print("earth", 470)
    fw, fh = print_tile.width + 60, print_tile.height + 60
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rectangle((0, 0, fw - 1, fh - 1), fill=(*RAISED, 255), outline=(*BRASS, 230), width=10)
    frame.alpha_composite(print_tile, (30, 30))
    # soft cool spotlight
    spot = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(spot).ellipse((int(W * 0.55), 30, int(W * 0.95), 520), fill=(*PARCHMENT, 16))
    img.alpha_composite(spot.filter(ImageFilter.GaussianBlur(46)))
    paste(img, frame, int(W * 0.74), int(H * 0.46))
    d.text((int(W * 0.74), H - 150), "250gsm museum matte · made to order",
           font=font(16), fill=(*BRASS, 190), anchor="ma")
    sample_caption(img, int(W * 0.74), H - 116)
    watermark(img, "ART POSTER")
    return finish(img)


# ── DELIVERABLE / PRINT HEROES ──────────────────────────────────────────────────
def mock_poster_pdf() -> Image.Image:
    img = base_scene("natal-poster-pdf", darken=0.6, cx_frac=0.74)
    left_scrim(img, 600)
    hero_copy(img, "natal-poster-pdf")
    paste(img, framed_print("earth", 440), int(W * 0.70), int(H * 0.46), angle=-3)
    d = ImageDraw.Draw(img)
    d.text((510, H - 92), "Download · print at home tonight", font=font(16), fill=(*BRASS_BRIGHT, 200))
    sample_caption(img, int(W * 0.70), H - 130)
    watermark(img, "POSTER PDF")
    return finish(img)


def mock_bundle() -> Image.Image:
    img = base_scene("reading-poster-bundle", darken=0.58, cx_frac=0.68)
    left_scrim(img, 560)
    hero_copy(img, "reading-poster-bundle", ay=100)
    # two keepsakes: poster tile + reading plate
    paste(img, framed_print("earth-moon", 380), int(W * 0.60), int(H * 0.48), angle=-6)
    reading = chart_plate(360)
    rframe = Image.new("RGBA", (400, 400), (*MID, 255))
    rframe.alpha_composite(reading, (20, 20))
    ImageDraw.Draw(rframe).rectangle((0, 0, 399, 399), outline=(*BRASS, 210), width=6)
    paste(img, rframe, int(W * 0.78), int(H * 0.52), angle=5)
    # oxblood save ribbon (accent)
    d = ImageDraw.Draw(img)
    d.polygon([(W - 250, 0), (W, 0), (W, 180), (W - 110, 180)], fill=(*OXBLOOD, 240))
    d.text((W - 150, 66), "SAVE", font=font(20, True), fill=PARCHMENT, anchor="mm")
    d.text((W - 150, 100), "£2", font=font(30, True), fill=PARCHMENT, anchor="mm")
    d.text((510, H - 88), "2 PDFs · 1 chart · 24–48h", font=font(16), fill=(*BRASS, 200))
    sample_caption(img, int(W * 0.69), H - 120)
    watermark(img, "BUNDLE")
    return finish(img)


def mock_two_skies() -> Image.Image:
    img = base_scene("two-skies-map", darken=0.6, cx_frac=0.72)
    left_scrim(img, 540)
    hero_copy(img, "two-skies-map", ay=110)
    # two framed prints side by side
    paste(img, framed_print("earth", 340), int(W * 0.63), int(H * 0.50), angle=-4)
    paste(img, framed_print("moon", 340), int(W * 0.82), int(H * 0.50), angle=4)
    # brass link seal (star) between them — accent heart in terracotta
    d = ImageDraw.Draw(img)
    cx = int(W * 0.725)
    d.ellipse((cx - 30, int(H * 0.5) - 30, cx + 30, int(H * 0.5) + 30), fill=(*TERRACOTTA, 220), outline=(*BRASS, 200), width=2)
    paste_seal(img, "star", cx, int(H * 0.5), px=34)
    d.text((510, H - 92), "Aurora & Orion · side by side", font=font(16), fill=(*BRASS_BRIGHT, 200))
    sample_caption(img, int(W * 0.72), H - 122)
    watermark(img, "TWO SKIES")
    return finish(img)


def mock_gift_reading() -> Image.Image:
    img = base_scene("gift-reading", darken=0.6, cx_frac=0.72)
    left_scrim(img, 560)
    hero_copy(img, "gift-reading")
    d = ImageDraw.Draw(img)
    # engraved voucher card over a real moon still
    vx, vy, vw, vh = int(W * 0.60), int(H * 0.30), 460, 300
    d.rounded_rectangle((vx, vy, vx + vw, vy + vh), radius=14, fill=(*MID, 245), outline=(*BRASS, 210), width=2)
    d.text((vx + 30, vy + 28), "GIFT VOUCHER", font=font(18, True), fill=(*BRASS_BRIGHT, 235))
    d.text((vx + 30, vy + 70), "Deep Natal Reading", font=font(26, True), fill=PARCHMENT)
    d.text((vx + 30, vy + 116), "Redeemed privately by email", font=font(16), fill=(*MUTED, 235))
    d.text((vx + 30, vy + 210), "“your note here …”", font=font(18), fill=(*BRASS, 200))
    paste_seal(img, "moon", vx + vw - 60, vy + 70, px=72)
    badge(img, "AP-GIFT7K2M", vx + 30, vy + 150)
    watermark(img, "GIFT READING")
    return finish(img)


def mock_gift_box() -> Image.Image:
    img = base_scene("gift-box-whole-sky", darken=0.62, cx_frac=0.72)
    left_scrim(img, 560)
    hero_copy(img, "gift-box-whole-sky", ay=95)
    d = ImageDraw.Draw(img)
    # engraved gift box (isometric) with brass ribbon (accent = oxblood tie)
    bx, by, bw, bh = int(W * 0.56), int(H * 0.30), 460, 300
    d.polygon([(bx, by + 70), (bx + bw, by + 70), (bx + bw, by + bh), (bx, by + bh)], fill=(*RAISED, 255))
    d.polygon([(bx, by + 70), (bx + bw // 2, by - 6), (bx + bw, by + 70), (bx + bw // 2, by + 120)], fill=(*MID, 255))
    d.rectangle((bx + bw // 2 - 16, by - 6, bx + bw // 2 + 16, by + bh), fill=(*OXBLOOD, 240))
    d.rectangle((bx, by + bh // 2 - 10, bx + bw, by + bh // 2 + 10), fill=(*OXBLOOD, 240))
    d.polygon([(bx, by + 70), (bx + bw, by + 70), (bx + bw, by + bh), (bx, by + bh)], outline=(*BRASS, 160))
    # contents peeking: a small framed print + voucher edge
    paste(img, framed_print("earth-moon", 150), bx + 130, by + 200, angle=8, shadow=False)
    paste_seal(img, "star", bx + bw // 2, by + 40, px=42)
    d.text((510, H - 90), "Reading PDF · brass print · card — shipped", font=font(16), fill=(*BRASS, 200))
    watermark(img, "GIFT BOX")
    return finish(img)


def mock_big_three() -> Image.Image:
    img = base_scene("big-three-print", darken=0.6, cx_frac=0.74)
    left_scrim(img, 560)
    hero_copy(img, "big-three-print")
    # framed sun print + three engraved seals labelled
    paste(img, framed_print("sun", 420, plate=False), int(W * 0.74), int(H * 0.46))
    d = ImageDraw.Draw(img)
    for i, (k, lab) in enumerate((("sun", "Sun"), ("moon", "Moon"), ("ascendant", "Rising"))):
        y = 300 + i * 96
        paste_seal(img, k, 540, y, px=64)
        d.text((588, y - 14), lab, font=font(22, True), fill=PARCHMENT)
        d.text((588, y + 14), "engraved on cool void", font=font(13), fill=(*MUTED, 220))
    sample_caption(img, int(W * 0.74), H - 116)
    watermark(img, "BIG THREE")
    return finish(img)


def mock_year_ahead() -> Image.Image:
    img = base_scene("year-ahead", darken=0.58, cx_frac=0.74)
    left_scrim(img, 560)
    hero_copy(img, "year-ahead")
    paste(img, framed_print("jupiter", 400), int(W * 0.72), int(H * 0.44))
    d = ImageDraw.Draw(img)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for i, mo in enumerate(months):
        x = 510 + (i % 6) * 64
        y = H - 132 + (i // 6) * 38
        d.rounded_rectangle((x, y, x + 56, y + 30), radius=5, fill=(*RAISED, 220), outline=(*BRASS, 110))
        d.text((x + 28, y + 15), mo, font=font(12), fill=(*BRASS_BRIGHT, 220), anchor="mm")
    sample_caption(img, int(W * 0.72), H - 176)
    watermark(img, "YEAR AHEAD")
    return finish(img)


def mock_solar_return() -> Image.Image:
    img = base_scene("solar-return", darken=0.5, cx_frac=0.72, scale=1.0)
    left_scrim(img, 560)
    hero_copy(img, "solar-return")
    # sun still already the backdrop; add framed chart + returns seal
    paste(img, framed_print("sun", 380), int(W * 0.74), int(H * 0.46))
    d = ImageDraw.Draw(img)
    # "☉ returns" marker — rasterized sun seal, NO tofu
    sx, sy = int(W * 0.52), 300
    paste_seal(img, "sun", sx, sy, px=70)
    d.text((sx + 46, sy - 12), "returns", font=font(22, True), fill=PARCHMENT)
    d.text((sx + 46, sy + 16), "your year theme, dated", font=font(14), fill=(*MUTED, 220))
    d.text((510, H - 92), "One birthday · one chart · no subscription", font=font(16), fill=(*BRASS, 200))
    sample_caption(img, int(W * 0.74), H - 122)
    watermark(img, "SOLAR RETURN")
    return finish(img)


# ── POD GARMENTS / CERAMIC (believable, cool palette) ───────────────────────────
def _print_art(body: str, w: int, h: int, base_tone: tuple[int, int, int] = MID) -> Image.Image:
    """The 'your sky' print: engine still + engraved chart plate on the garment tone,
    cropped to w×h so it reads as ink ON the fabric (no floating black rectangle)."""
    side = max(w, h)
    still = engine_still(body).resize((side, side), Image.Resampling.LANCZOS)
    art = Image.new("RGBA", (side, side), (*base_tone, 255))
    art.alpha_composite(still)
    art.alpha_composite(chart_plate(side))
    art = art.crop(((side - w) // 2, (side - h) // 2, (side - w) // 2 + w, (side - h) // 2 + h))
    return art


def _multiply_onto(garment: Image.Image, art: Image.Image, box: tuple[int, int, int, int],
                   mask: Image.Image | None = None, blend: float = 0.82) -> None:
    """Composite print art onto fabric so it sits ON the material (screen-print feel)."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    a = art.resize((bw, bh), Image.Resampling.LANCZOS)
    region = garment.crop(box).convert("RGBA")
    # blend art with a hint of the fabric tone underneath for a printed look
    printed = Image.blend(region, a, blend)
    if mask is not None:
        m = mask.resize((bw, bh)).convert("L")
        region.paste(printed, (0, 0), m)
    else:
        region = printed
    garment.paste(region, (x0, y0))


def _garment_silhouette(kind: str) -> Image.Image:
    """Cool-toned rendered blank garment/ceramic on the void."""
    g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    fabric = (30, 34, 44)      # cool charcoal cotton
    fabric_hi = (44, 50, 62)
    if kind == "tee":
        cx, cy = int(W * 0.68), int(H * 0.52)
        # flat-lay tee silhouette
        pts = [(cx - 210, cy - 150), (cx - 150, cy - 210), (cx - 90, cy - 170),
               (cx - 60, cy - 200), (cx + 60, cy - 200), (cx + 90, cy - 170),
               (cx + 150, cy - 210), (cx + 210, cy - 150), (cx + 160, cy - 70),
               (cx + 130, cy - 90), (cx + 150, cy + 230), (cx - 150, cy + 230),
               (cx - 130, cy - 90), (cx - 160, cy - 70)]
        d.polygon(pts, fill=(*fabric, 255))
        # collar + subtle fold shading
        d.arc((cx - 60, cy - 210, cx + 60, cy - 150), 20, 160, fill=(*fabric_hi, 255), width=8)
        for fx in (cx - 90, cx + 90):
            d.line((fx, cy - 120, fx, cy + 200), fill=(*fabric_hi, 120), width=2)
    elif kind == "hoodie":
        cx, cy = int(W * 0.68), int(H * 0.52)
        d.rounded_rectangle((cx - 210, cy - 150, cx + 210, cy + 240), radius=40, fill=(*fabric, 255))
        # hood
        d.pieslice((cx - 130, cy - 230, cx + 130, cy - 70), 180, 360, fill=(*fabric_hi, 255))
        d.arc((cx - 130, cy - 230, cx + 130, cy - 70), 180, 360, fill=(*fabric, 255), width=10)
        # kangaroo pocket + drawstrings
        d.line((cx - 40, cy - 150, cx - 30, cy - 90), fill=(*fabric_hi, 200), width=6)
        d.line((cx + 40, cy - 150, cx + 30, cy - 90), fill=(*fabric_hi, 200), width=6)
        d.rounded_rectangle((cx - 120, cy + 90, cx + 120, cy + 200), radius=16, outline=(*fabric_hi, 160), width=3)
    else:  # mug — cylindrical ceramic
        cx, cy = int(W * 0.66), int(H * 0.52)
        mw, mh = 300, 260
        # body
        d.rounded_rectangle((cx - mw // 2, cy - mh // 2, cx + mw // 2, cy + mh // 2), radius=26, fill=(46, 52, 64, 255))
        # rim ellipse
        d.ellipse((cx - mw // 2, cy - mh // 2 - 18, cx + mw // 2, cy - mh // 2 + 26), fill=(58, 66, 80, 255), outline=(*BRASS, 90))
        d.ellipse((cx - mw // 2 + 14, cy - mh // 2 - 6, cx + mw // 2 - 14, cy - mh // 2 + 16), fill=(24, 28, 36, 255))
        # handle
        d.arc((cx + mw // 2 - 30, cy - 60, cx + mw // 2 + 90, cy + 90), 300, 60, fill=(58, 66, 80, 255), width=22)
        # cylindrical shading
        shade = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shade)
        sd.rectangle((cx - mw // 2, cy - mh // 2, cx - mw // 2 + 40, cy + mh // 2), fill=(0, 0, 0, 90))
        sd.rectangle((cx + mw // 2 - 40, cy - mh // 2, cx + mw // 2, cy + mh // 2), fill=(0, 0, 0, 110))
        g.alpha_composite(shade.filter(ImageFilter.GaussianBlur(18)))
    return g


def mock_sky_tee() -> Image.Image:
    img = engine_backdrop(W, H, "earth", darken=0.78, cx_frac=0.5, cy_frac=0.5, scale=1.4)
    left_scrim(img, 520)
    img.alpha_composite(_garment_silhouette("tee"))
    cx, cy = int(W * 0.68), int(H * 0.52)
    art = _print_art("earth", 240, 240, base_tone=(30, 34, 44))
    # circular print on chest
    mask = Image.new("L", (240, 240), 0)
    ImageDraw.Draw(mask).ellipse((6, 6, 234, 234), fill=255)
    _multiply_onto(img, art, (cx - 120, cy - 130, cx + 120, cy + 110), mask=mask, blend=0.9)
    hero_copy(img, "sky-tee", ay=105)
    d = ImageDraw.Draw(img)
    d.text((int(W * 0.68), H - 108), "Heavyweight cotton · printed to order",
           font=font(16), fill=(*BRASS, 190), anchor="ma")
    sample_caption(img, int(W * 0.68), H - 78)
    watermark(img, "SKY TEE")
    return finish(img)


def mock_sky_hoodie() -> Image.Image:
    img = engine_backdrop(W, H, "earth-moon", darken=0.8, cx_frac=0.5, cy_frac=0.5, scale=1.4)
    left_scrim(img, 520)
    img.alpha_composite(_garment_silhouette("hoodie"))
    cx, cy = int(W * 0.68), int(H * 0.52)
    art = _print_art("earth-moon", 320, 220, base_tone=(30, 34, 44))
    _multiply_onto(img, art, (cx - 150, cy - 60, cx + 150, cy + 150), blend=0.85)
    hero_copy(img, "sky-hoodie", ay=100)
    d = ImageDraw.Draw(img)
    d.text((int(W * 0.68), H - 108), "350gsm fleece · natal canopy across the back",
           font=font(16), fill=(*BRASS, 190), anchor="ma")
    sample_caption(img, int(W * 0.68), H - 78)
    watermark(img, "HOODIE")
    return finish(img)


def mock_mug() -> Image.Image:
    img = engine_backdrop(W, H, "moon", darken=0.8, cx_frac=0.5, cy_frac=0.5, scale=1.3)
    left_scrim(img, 520)
    img.alpha_composite(_garment_silhouette("mug"))
    cx, cy = int(W * 0.66), int(H * 0.52)
    mug_tone = (46, 52, 64)
    art = _print_art("moon", 300, 200, base_tone=mug_tone)
    # cylindrical warp: horizontal squeeze toward the edges of the ceramic body
    warped = art.resize((236, 190), Image.Resampling.LANCZOS)
    # round the print label so it reads as ink on the curved wall, not a hard rectangle
    lbl = Image.new("RGBA", warped.size, (0, 0, 0, 0))
    lm = Image.new("L", warped.size, 0)
    ImageDraw.Draw(lm).rounded_rectangle((0, 0, warped.width - 1, warped.height - 1), radius=14, fill=255)
    lbl.paste(warped, (0, 0), lm)
    _multiply_onto(img, lbl, (cx - 116, cy - 90, cx + 120, cy + 100), mask=lm, blend=0.9)
    # steam using faint parchment arcs (not a sky element)
    d = ImageDraw.Draw(img)
    for ox in (-30, 10, 50):
        d.arc((cx + ox, cy - 200, cx + ox + 44, cy - 130), 200, 340, fill=(*PARCHMENT, 60), width=3)
    hero_copy(img, "constellation-mug")
    d.text((int(W * 0.66), H - 108), "Matte ceramic · dishwasher safe",
           font=font(16), fill=(*BRASS, 190), anchor="ma")
    sample_caption(img, int(W * 0.66), H - 78)
    watermark(img, "STAR MUG")
    return finish(img)


PRODUCTS = [
    ("product-deep-reading.jpg", mock_deep_reading),
    ("product-poster-pdf.jpg", mock_poster_pdf),
    ("product-bundle.jpg", mock_bundle),
    ("product-two-skies.jpg", mock_two_skies),
    ("product-gift-reading.jpg", mock_gift_reading),
    ("product-gift-box.jpg", mock_gift_box),
    ("product-natal-poster.jpg", mock_natal_poster),
    ("product-big-three.jpg", mock_big_three),
    ("product-sky-tee.jpg", mock_sky_tee),
    ("product-sky-hoodie.jpg", mock_sky_hoodie),
    ("product-mug.jpg", mock_mug),
    ("product-year-ahead.jpg", mock_year_ahead),
    ("product-solar-return.jpg", mock_solar_return),
]


def write_gallery(paths: list[tuple[str, Path]]) -> None:
    items = "\n".join(
        f'    <figure><img src="../website/img/shop/{fname}" alt="{fname}">'
        f'<figcaption>{fname}</figcaption></figure>'
        for fname, _ in paths
    )
    GALLERY.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>AstroPrecise — Product heroes (engine-anchored)</title>
<style>
  body {{ margin:0; background:#0C1016; color:#ECE6D8; font-family:Georgia,serif; padding:24px; }}
  h1 {{ color:#C2A05E; font-weight:normal; letter-spacing:.08em; }}
  p {{ color:#969EAC; max-width:720px; line-height:1.6; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(480px,1fr)); gap:28px; margin-top:24px; }}
  figure {{ margin:0; background:#121826; border:1px solid rgba(194,160,94,.25); border-radius:8px; overflow:hidden; }}
  img {{ width:100%; display:block; }}
  figcaption {{ padding:12px 16px; font-size:14px; letter-spacing:.06em; text-transform:uppercase; color:#C2A05E; }}
</style></head><body>
<h1>Product heroes — engine-anchored, cool brass</h1>
<p>Every hero built from a real engine still + engraved brass framing. Sample charts labelled.</p>
<div class="grid">
{items}
</div></body></html>""", encoding="utf-8")
    print(GALLERY)


def main() -> None:
    saved = []
    for fname, fn in PRODUCTS:
        saved.append((fname, save(fn(), fname)))
    write_gallery(saved)
    print(f"Generated {len(saved)} engine-anchored product heroes -> {OUT}")


if __name__ == "__main__":
    main()
