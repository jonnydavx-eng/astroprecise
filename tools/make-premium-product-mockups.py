#!/usr/bin/env python3
"""
Premium LS product mockups — per-SKU marketing heroes (distinct layout + hook each).

Each checkout image answers: what is this? · what do I get? · why want it?
Uses real fulfilment HTML screenshots where they sell the product; compositing +
copy/layout differ per item so nothing looks like the same template twice.

Output: website/img/shop/product-*.jpg (1600×900, JPEG q96)
"""
from __future__ import annotations

import math
import random
import subprocess
import time
import uuid
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "tools" / "_audit-out"
OUT = ROOT / "website" / "img" / "shop"
TMP = ROOT / "tools" / "_mockup-tmp"
GALLERY = ROOT / "tools" / "premium-mockups-gallery.html"

W, H = 1600, 900
Q = 96
VOID = (5, 4, 6)
GOLD = (201, 162, 39)
GOLD_LT = (239, 227, 192)
GOLD_HI = (232, 200, 114)
PARCHMENT = (239, 227, 192)
MUTED = (168, 158, 136)
OXBLOOD = (110, 26, 38)

EDGE_PATHS = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
]
_SCREEN_CACHE: dict[tuple[str, int, int], Image.Image] = {}

# Per-SKU marketing + visual identity (accent RGB, layout, enticement copy)
SKU = {
    "deep-reading": {
        "eyebrow": "The Reading",
        "title": "Deep Natal Reading",
        "hook": "13 pages written for your chart alone",
        "badge": "Bestseller",
        "accent": (72, 52, 98),
        "accent2": (110, 26, 38),
    },
    "natal-poster-pdf": {
        "eyebrow": "Print tonight",
        "title": "Natal Sky PDF",
        "hook": "Engraved gold on void black — any size at home",
        "badge": "Instant · £6",
        "accent": (48, 38, 28),
        "accent2": (201, 162, 39),
    },
    "reading-poster-bundle": {
        "eyebrow": "Best value",
        "title": "Reading + Poster",
        "hook": "The words and the map — one chart, two keepsakes",
        "badge": "Save £2",
        "accent": (58, 42, 28),
        "accent2": (180, 60, 50),
    },
    "two-skies-map": {
        "eyebrow": "For two charts",
        "title": "Two Skies",
        "hook": "Your sky & theirs — one anniversary print",
        "badge": "Together",
        "accent": (120, 55, 65),
        "accent2": (127, 184, 176),
    },
    "gift-reading": {
        "eyebrow": "A gift",
        "title": "Gift a Reading",
        "hook": "Voucher + your note — they redeem privately",
        "badge": "Thoughtful",
        "accent": (95, 48, 72),
        "accent2": (220, 160, 175),
    },
    "gift-box-whole-sky": {
        "eyebrow": "The whole sky",
        "title": "Gift Box",
        "hook": "Reading PDF + foil print + card — shipped",
        "badge": "Premium gift",
        "accent": (42, 58, 48),
        "accent2": (168, 200, 138),
    },
    "natal-poster": {
        "eyebrow": "On your wall",
        "title": "Art Poster",
        "hook": "Museum matte · your exact first-breath sky",
        "badge": "Signature",
        "accent": (32, 28, 38),
        "accent2": (201, 162, 39),
    },
    "big-three-print": {
        "eyebrow": "Distilled",
        "title": "Big Three Print",
        "hook": "Sun · Moon · Rising — the spine of your chart",
        "badge": "Desk piece",
        "accent": (50, 48, 72),
        "accent2": (201, 162, 39),
    },
    "sky-tee": {
        "eyebrow": "Wear your sky",
        "title": "Your Sky Tee",
        "hook": "Constellations from your birth night on cotton",
        "badge": "New",
        "accent": (34, 32, 42),
        "accent2": (184, 120, 80),
    },
    "sky-hoodie": {
        "eyebrow": "Heavyweight",
        "title": "Sky Hoodie",
        "hook": "Natal canopy across the back · 350gsm fleece",
        "badge": "Cozy",
        "accent": (22, 22, 32),
        "accent2": (201, 162, 39),
    },
    "constellation-mug": {
        "eyebrow": "Morning ritual",
        "title": "Star Map Mug",
        "hook": "Your birthplace sky wrapped around ceramic",
        "badge": "£9",
        "accent": (38, 32, 28),
        "accent2": (127, 184, 176),
    },
    "year-ahead": {
        "eyebrow": "12 months ahead",
        "title": "Year Ahead",
        "hook": "Every major transit — dated for your chart",
        "badge": "Trending",
        "accent": (38, 62, 78),
        "accent2": (95, 174, 138),
    },
    "solar-return": {
        "eyebrow": "Birthday ritual",
        "title": "Solar Return",
        "hook": "The sky when your Sun returns — your year theme",
        "badge": "Annual",
        "accent": (88, 58, 22),
        "accent2": (232, 176, 48),
    },
}


def find_edge() -> Path:
    for p in EDGE_PATHS:
        if p.exists():
            return p
    raise FileNotFoundError("Microsoft Edge not found — required for HTML screenshots")


def font(sz: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        Path(r"C:\Windows\Fonts\georgiab.ttf") if bold else Path(r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\timesbd.ttf") if bold else Path(r"C:\Windows\Fonts\times.ttf"),
    ]
    for p in paths:
        if p.exists():
            return ImageFont.truetype(str(p), sz)
    return ImageFont.load_default()


def screenshot_html(html_path: Path, vw: int, vh: int, name: str, timeout: int = 90) -> Image.Image:
    key = (str(html_path.resolve()), vw, vh)
    if key in _SCREEN_CACHE:
        return _SCREEN_CACHE[key].copy()

    edge = find_edge()
    TMP.mkdir(parents=True, exist_ok=True)
    shot = TMP / f"{name}-{uuid.uuid4().hex[:8]}.png"
    url = html_path.resolve().as_uri()
    cmd = [
        str(edge), "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--no-first-run", "--disable-extensions",
        f"--window-size={vw},{vh}", "--virtual-time-budget=12000",
        f"--screenshot={shot}", url,
    ]
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=timeout)
            break
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            last_err = exc
            time.sleep(1.5 * (attempt + 1))
    else:
        raise last_err  # type: ignore[misc]

    img = Image.open(shot).convert("RGBA")
    shot.unlink(missing_ok=True)
    _SCREEN_CACHE[key] = img.copy()
    return img


def scene_base(accent: tuple, accent2: tuple | None = None, seed: int = 42) -> Image.Image:
    a2 = accent2 or accent
    img = Image.new("RGBA", (W, H), (*VOID, 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((W // 2 - 560, H // 2 - 400, W // 2 + 560, H // 2 + 400), fill=(*accent, 32))
    d.ellipse((W * 0.72, H * 0.2, W * 0.72 + 420, H * 0.2 + 380), fill=(*a2, 22))
    d.ellipse((-40, H - 200, 400, H + 80), fill=(*OXBLOOD, 14))
    glow = glow.filter(ImageFilter.GaussianBlur(72))
    img.alpha_composite(glow)
    rng = random.Random(seed)
    d2 = ImageDraw.Draw(img)
    for _ in range(100):
        x, y = rng.randint(0, W - 1), rng.randint(0, H - 1)
        d2.ellipse((x, y, x + rng.choice((1, 2)), y + 1), fill=(*GOLD_LT, rng.randint(30, 100)))
    return img


def vignette(img: Image.Image, strength: float = 0.42) -> Image.Image:
    v = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(v)
    d.ellipse((-W * 0.1, -H * 0.15, W * 1.1, H * 1.15), fill=255)
    v = v.filter(ImageFilter.GaussianBlur(80))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dark.putalpha(ImageChops.invert(v).point(lambda x: int(x * strength)))
    return Image.alpha_composite(img, dark)


def paste_deliverable(base: Image.Image, page: Image.Image, cx: int, cy: int,
                      scale: float = 1.0, angle: float = 0, shadow: bool = True) -> None:
    p = page
    if scale != 1.0:
        nw, nh = int(p.width * scale), int(p.height * scale)
        p = p.resize((nw, nh), Image.Resampling.LANCZOS)
    if angle:
        p = p.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", (p.width + 40, p.height + 40), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        sd.rounded_rectangle((20, 20, p.width + 8, p.height + 8), radius=6, fill=(0, 0, 0, 110))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        base.alpha_composite(sh, (cx - p.width // 2 - 6, cy - p.height // 2 + 10))
    base.alpha_composite(p, (cx - p.width // 2, cy - p.height // 2))


def draw_badge(img: Image.Image, text: str, x: int, y: int,
               fill=OXBLOOD, outline=GOLD, pad_x: int = 18, pad_y: int = 8) -> None:
    d = ImageDraw.Draw(img)
    f = font(15, True)
    bb = d.textbbox((0, 0), text, font=f)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.rounded_rectangle(
        (x, y, x + tw + pad_x * 2, y + th + pad_y * 2),
        radius=16, fill=(*fill, 235), outline=(*outline, 200), width=2,
    )
    d.text((x + pad_x, y + pad_y - 2), text, font=f, fill=GOLD_LT)


def draw_hero_copy(img: Image.Image, meta: dict, anchor_x: int = 72, anchor_y: int = 120) -> None:
    """Left-rail product marketing — unique per SKU."""
    d = ImageDraw.Draw(img)
    d.text((anchor_x, anchor_y), meta["eyebrow"].upper(), font=font(14), fill=(*GOLD, 200))
    d.text((anchor_x, anchor_y + 36), meta["title"], font=font(46, True), fill=PARCHMENT)
    # Hook wraps ~2 lines
    hook = meta["hook"]
    d.text((anchor_x, anchor_y + 100), hook, font=font(22), fill=(*MUTED, 255))
    draw_badge(img, meta["badge"], anchor_x, anchor_y + 155)


def draw_divider_line(img: Image.Image, x: int, y0: int, y1: int) -> None:
    d = ImageDraw.Draw(img)
    d.line((x, y0, x, y1), fill=(*GOLD, 45), width=1)


def brand_watermark(img: Image.Image, label: str = "ASTROPRECISE") -> None:
    d = ImageDraw.Draw(img)
    d.text((W // 2, H - 26), f"✦  {label}  ·  VSOP87  ·  PERSONALISED FROM YOUR CHART", font=font(10), fill=(*MUTED, 170), anchor="mm")


def finish(img: Image.Image, vignette_strength: float = 0.38) -> Image.Image:
    return vignette(img, vignette_strength).convert("RGB").filter(ImageFilter.UnsharpMask(1.1, 120, 2))


def save(img: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    img.save(p, "JPEG", quality=Q, subsampling=0, optimize=True)
    print(p)
    return p


def _meta(sku: str) -> dict:
    return SKU[sku]


def mock_deep_reading() -> Image.Image:
    m = _meta("deep-reading")
    cover = screenshot_html(AUDIT / "reading-jane-example.html", 794, 1123, "rd-cover")
    img = scene_base(m["accent"], m["accent2"], seed=11)
    draw_hero_copy(img, m)
    draw_divider_line(img, 480, 100, H - 80)
    # Fan of pages — text product
    paste_deliverable(img, cover, W // 2 + 280, H // 2 - 30, 0.40, -6)
    inner = cover.crop((0, int(cover.height * 0.12), cover.width, int(cover.height * 0.45)))
    paste_deliverable(img, inner, W // 2 + 120, H // 2 + 60, 0.36, 4)
    love = cover.crop((0, int(cover.height * 0.48), cover.width, int(cover.height * 0.62)))
    paste_deliverable(img, love, W // 2 + 480, H // 2 + 40, 0.32, -3)
    d = ImageDraw.Draw(img)
    d.text((500, H - 100), "Love · Career · 10 aspects · House tour", font=font(16), fill=(*GOLD_HI, 180))
    brand_watermark(img, "DEEP READING")
    return finish(img)


def mock_poster_pdf() -> Image.Image:
    m = _meta("natal-poster-pdf")
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster")
    img = scene_base(m["accent"], m["accent2"], seed=22)
    draw_hero_copy(img, m)
    # Desk / print-at-home scene
    d = ImageDraw.Draw(img)
    d.polygon([(90, H - 50), (W - 70, H - 90), (W - 40, H - 8), (120, H - 8)], fill=(16, 12, 10, 255))
    d.rounded_rectangle((520, H - 130, 620, H - 70), radius=6, fill=(28, 24, 20, 255), outline=(*GOLD, 80), width=1)
    d.text((545, H - 108), "PDF", font=font(14, True), fill=GOLD_LT)
    paste_deliverable(img, poster, W // 2 + 200, H // 2 - 40, 0.38, -4)
    d.text((520, H - 155), "↓ Print at home tonight", font=font(18), fill=GOLD_HI)
    brand_watermark(img, "POSTER PDF")
    return finish(img)


def mock_bundle() -> Image.Image:
    m = _meta("reading-poster-bundle")
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster-b")
    reading = screenshot_html(AUDIT / "reading-jane-example.html", 794, 1123, "rd-b")
    img = scene_base(m["accent"], m["accent2"], seed=33)
    draw_hero_copy(img, m, anchor_y=100)
    # Diagonal ribbon
    d = ImageDraw.Draw(img)
    d.polygon([(W - 280, 0), (W, 0), (W, 200), (W - 120, 200)], fill=(*OXBLOOD, 240))
    d.text((W - 155, 72), "SAVE", font=font(22, True), fill=GOLD_LT, anchor="mm")
    d.text((W - 155, 102), "£2", font=font(32, True), fill=PARCHMENT, anchor="mm")
    paste_deliverable(img, poster, W // 2 + 60, H // 2 - 10, 0.32, -8)
    paste_deliverable(img, reading, W // 2 + 340, H // 2, 0.36, 6)
    d.text((500, H - 90), "2 PDFs · 1 chart · 24–48h delivery", font=font(17), fill=(*GOLD, 190))
    brand_watermark(img, "BUNDLE")
    return finish(img)


def mock_two_skies() -> Image.Image:
    m = _meta("two-skies-map")
    sheet = screenshot_html(AUDIT / "twoskies-aurora-orion.html", 900, 1270, "twoskies", timeout=120)
    img = scene_base(m["accent"], m["accent2"], seed=44)
    draw_hero_copy(img, m, anchor_y=110)
    paste_deliverable(img, sheet, W // 2 + 220, H // 2 - 10, 0.50, 0)
    d = ImageDraw.Draw(img)
    d.text((W // 2 + 200, H // 2 - 120), "♡", font=font(48), fill=(*m["accent2"], 220), anchor="mm")
    d.text((500, H - 95), "Aurora & Orion · side by side", font=font(17), fill=(*GOLD_HI, 200))
    brand_watermark(img, "TWO SKIES")
    return finish(img)


def mock_gift_reading() -> Image.Image:
    m = _meta("gift-reading")
    voucher_path = AUDIT / "voucher-gift-reading-jane.html"
    if not voucher_path.exists():
        voucher_path.write_text(
            (AUDIT / "voucher-recipient.html").read_text(encoding="utf-8")
            .replace("The Whole Sky — Gift Box", "Deep Natal Reading")
            .replace("gift-box-whole-sky", "gift-reading")
            .replace("AP-TGIFT001", "AP-GIFT7K2M"),
            encoding="utf-8",
        )
    card = screenshot_html(voucher_path, 794, 1123, "gift-rd")
    img = scene_base(m["accent"], m["accent2"], seed=55)
    draw_hero_copy(img, m)
    # Envelope peek
    d = ImageDraw.Draw(img)
    d.polygon([(W // 2 + 80, H // 2 + 80), (W // 2 + 420, H // 2 + 80),
               (W // 2 + 420, H // 2 + 280), (W // 2 + 80, H // 2 + 280)], fill=(32, 24, 28, 255))
    d.polygon([(W // 2 + 80, H // 2 + 80), (W // 2 + 250, H // 2 + 20), (W // 2 + 420, H // 2 + 80)],
              fill=(48, 32, 40, 255), outline=(*m["accent2"], 120))
    paste_deliverable(img, card, W // 2 + 250, H // 2 + 30, 0.48, -5)
    d.polygon([(W // 2 + 220, H // 2 - 8), (W // 2 + 250, H // 2 - 28), (W // 2 + 280, H // 2 - 8),
               (W // 2 + 250, H // 2 + 18)], fill=(*m["accent2"], 220))
    brand_watermark(img, "GIFT READING")
    return finish(img)


def mock_gift_box() -> Image.Image:
    m = _meta("gift-box-whole-sky")
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster-gb")
    voucher = screenshot_html(AUDIT / "voucher-recipient.html", 794, 1123, "voucher-gb")
    img = scene_base(m["accent"], m["accent2"], seed=66)
    draw_hero_copy(img, m, anchor_y=95)
    d = ImageDraw.Draw(img)
    bx, by, bw, bh = W // 2 + 40, H // 2 - 100, 500, 320
    d.polygon([(bx, by + 70), (bx + bw, by + 70), (bx + bw, by + bh), (bx, by + bh)], fill=(38, 28, 22, 255))
    d.polygon([(bx, by + 70), (bx + bw // 2, by - 20), (bx + bw, by + 70), (bx + bw // 2, by + 120)], fill=(55, 38, 28, 255))
    d.rectangle((bx + bw // 2 - 18, by - 20, bx + bw // 2 + 18, by + bh), fill=(*OXBLOOD, 245))
    d.rectangle((bx, by + bh // 2 - 10, bx + bw, by + bh // 2 + 10), fill=(*OXBLOOD, 245))
    paste_deliverable(img, poster, bx + 140, by + 200, 0.20, 8)
    paste_deliverable(img, voucher, bx + bw - 130, by + 180, 0.24, -5)
    brand_watermark(img, "GIFT BOX")
    return finish(img)


def mock_natal_poster() -> Image.Image:
    m = _meta("natal-poster")
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster-phys")
    img = scene_base(m["accent"], m["accent2"], seed=77)
    draw_hero_copy(img, m)
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, H - 70), fill=(10, 8, 12, 255))
    # Gallery wall + frame
    fw, fh = poster.width // 3 + 70, poster.height // 3 + 90
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rectangle((0, 0, fw - 1, fh - 1), fill=(28, 22, 16, 255), outline=(*GOLD, 220), width=10)
    inner = poster.resize((poster.width // 3, poster.height // 3), Image.Resampling.LANCZOS)
    frame.alpha_composite(inner, (35, 45))
    paste_deliverable(img, frame, W // 2 + 180, H // 2 - 60, 1.0, 0)
    # Spotlight
    spot = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(spot)
    sd.ellipse((W // 2 - 80, 40, W // 2 + 480, 500), fill=(255, 248, 220, 18))
    spot = spot.filter(ImageFilter.GaussianBlur(40))
    img.alpha_composite(spot)
    d.text((W // 2 + 180, H - 110), "250gsm museum matte · made to order", font=font(16), fill=(*GOLD, 180), anchor="mm")
    brand_watermark(img, "ART POSTER")
    return finish(img)


def mock_big_three() -> Image.Image:
    m = _meta("big-three-print")
    sheet = screenshot_html(AUDIT / "big-three-jane-example.html", 559, 794, "b3")
    img = scene_base(m["accent"], m["accent2"], seed=88)
    draw_hero_copy(img, m)
    paste_deliverable(img, sheet, W // 2 + 200, H // 2 - 20, 0.78, 1)
    d = ImageDraw.Draw(img)
    for i, (g, lab) in enumerate((("☉", "Sun"), ("☽", "Moon"), ("↑", "Rising"))):
        y = 280 + i * 72
        d.text((520, y), g, font=font(36), fill=GOLD_HI)
        d.text((580, y + 4), lab, font=font(20), fill=MUTED)
    brand_watermark(img, "BIG THREE")
    return finish(img)


def _poster_art_thumb() -> Image.Image:
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "art-thumb")
    return poster.resize((420, 560), Image.Resampling.LANCZOS)


def mock_sky_tee() -> Image.Image:
    m = _meta("sky-tee")
    art = _poster_art_thumb()
    img = scene_base(m["accent"], m["accent2"], seed=99)
    draw_hero_copy(img, m, anchor_y=105)
    d = ImageDraw.Draw(img)
    pts = [(W // 2 + 40, H // 2 - 20), (W // 2 + 110, H // 2 - 200), (W // 2 + 350, H // 2 - 200),
           (W // 2 + 420, H // 2 - 20), (W // 2 + 440, H // 2 + 200), (W // 2 + 20, H // 2 + 200)]
    d.polygon(pts, fill=(22, 20, 26, 255), outline=(*GOLD, 90), width=2)
    art_f = art.filter(ImageFilter.GaussianBlur(0.4))
    art_mask = Image.new("L", art_f.size, 0)
    ImageDraw.Draw(art_mask).ellipse((20, 20, art_f.width - 20, art_f.height - 20), fill=255)
    art_f.putalpha(art_mask)
    tee_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    tee_layer.paste(art_f.resize((300, 210), Image.Resampling.LANCZOS), (W // 2 + 80, H // 2 - 110))
    img.alpha_composite(tee_layer)
    for g, ox in (("☉", 120), ("☽", 200), ("↑", 280)):
        d.text((W // 2 + ox, H // 2 + 85), g, font=font(26), fill=GOLD_HI, anchor="mt")
    d.text((W // 2 + 230, H - 95), "Heavyweight cotton · printed to order", font=font(16), fill=(*GOLD, 170), anchor="mm")
    brand_watermark(img, "SKY TEE")
    return finish(img)


def mock_sky_hoodie() -> Image.Image:
    m = _meta("sky-hoodie")
    art = _poster_art_thumb().resize((400, 260), Image.Resampling.LANCZOS)
    img = scene_base(m["accent"], m["accent2"], seed=101)
    draw_hero_copy(img, m, anchor_y=100)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((W // 2 + 30, H // 2 - 240, W // 2 + 430, H // 2 + 160), radius=32,
                        fill=(14, 14, 20, 255), outline=(*GOLD, 70), width=2)
    d.polygon([(W // 2 + 150, H // 2 - 240), (W // 2 + 230, H // 2 - 170), (W // 2 + 310, H // 2 - 240)],
              fill=(10, 10, 14, 255))
    # Back print (larger than tee)
    img.paste(art, (W // 2 + 50, H // 2 - 90), art)
    d.rectangle((W // 2 + 50, H // 2 + 120, W // 2 + 200, H // 2 + 145), fill=(18, 18, 24, 255))
    d.text((W // 2 + 125, H // 2 + 128), "☉  ☽  ↑  cuff", font=font(15), fill=GOLD_HI, anchor="mm")
    brand_watermark(img, "HOODIE")
    return finish(img)


def mock_mug() -> Image.Image:
    m = _meta("constellation-mug")
    art = _poster_art_thumb().resize((320, 130), Image.Resampling.LANCZOS)
    img = scene_base(m["accent"], m["accent2"], seed=112)
    draw_hero_copy(img, m)
    d = ImageDraw.Draw(img)
    # Morning steam
    for sx, sy in ((W // 2 + 180, H // 2 - 200), (W // 2 + 220, H // 2 - 220), (W // 2 + 260, H // 2 - 195)):
        d.arc((sx, sy, sx + 40, sy + 80), 200, 340, fill=(*PARCHMENT, 80), width=3)
    d.ellipse((W // 2 + 60, H // 2 + 70, W // 2 + 460, H // 2 + 130), fill=(14, 10, 8, 255))
    mx, my = W // 2 + 150, H // 2 - 150
    d.rounded_rectangle((mx - 115, my, mx + 95, my + 200), radius=16, fill=(44, 42, 40, 255), outline=(*GOLD, 120), width=2)
    d.arc((mx + 75, my + 50, mx + 175, my + 150), 270, 90, fill=GOLD, width=7)
    mug = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mug.paste(art, (mx - 100, my + 40))
    img.alpha_composite(mug)
    d.text((mx - 10, my - 28), "☉", font=font(28), fill=GOLD_HI, anchor="mt")
    brand_watermark(img, "STAR MUG")
    return finish(img)


def mock_year_ahead() -> Image.Image:
    m = _meta("year-ahead")
    report = screenshot_html(AUDIT / "year-ahead-jane-example.html", 794, 1123, "ya")
    img = scene_base(m["accent"], m["accent2"], seed=123)
    draw_hero_copy(img, m)
    # Calendar strip
    d = ImageDraw.Draw(img)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for i, mo in enumerate(months):
        x = 520 + (i % 6) * 62
        y = H - 130 + (i // 6) * 36
        d.rounded_rectangle((x, y, x + 54, y + 28), radius=4, fill=(20, 32, 38, 200), outline=(*m["accent2"], 100))
        d.text((x + 27, y + 12), mo, font=font(11), fill=(*m["accent2"], 220), anchor="mm")
    paste_deliverable(img, report, W // 2 + 260, H // 2 - 30, 0.42, -3)
    transit = report.crop((0, int(report.height * 0.2), report.width, int(report.height * 0.38)))
    paste_deliverable(img, transit, W // 2 + 480, H // 2 + 20, 0.30, 5)
    brand_watermark(img, "YEAR AHEAD")
    return finish(img)


def mock_solar_return() -> Image.Image:
    m = _meta("solar-return")
    report = screenshot_html(AUDIT / "solar-return-jane-example.html", 794, 1123, "sr")
    img = scene_base(m["accent"], m["accent2"], seed=134)
    draw_hero_copy(img, m)
    d = ImageDraw.Draw(img)
    # Birthday sun corona
    scx, scy = W // 2 + 420, H // 2 - 180
    for r, a in ((70, 40), (55, 70), (40, 100)):
        d.ellipse((scx - r, scy - r, scx + r, scy + r), fill=(*m["accent2"], a))
    d.ellipse((scx - 28, scy - 28, scx + 28, scy + 28), fill=(255, 220, 140, 255))
    d.text((scx, scy + 55), "☉ returns", font=font(16), fill=GOLD_HI, anchor="mm")
    paste_deliverable(img, report, W // 2 + 200, H // 2 - 10, 0.44, 4)
    d.text((520, H - 100), "One birthday · one chart · no subscription", font=font(16), fill=(*GOLD, 180))
    brand_watermark(img, "SOLAR RETURN")
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
<html lang="en"><head><meta charset="utf-8"><title>AstroPrecise — Product heroes (per-SKU)</title>
<style>
  body {{ margin:0; background:#050406; color:#efe3c0; font-family:Georgia,serif; padding:24px; }}
  h1 {{ color:#c9a227; font-weight:normal; letter-spacing:.08em; }}
  p {{ color:#a89e88; max-width:720px; line-height:1.6; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(480px,1fr)); gap:28px; margin-top:24px; }}
  figure {{ margin:0; background:#0d0a08; border:1px solid rgba(201,162,39,.25); border-radius:8px; overflow:hidden; }}
  img {{ width:100%; display:block; }}
  figcaption {{ padding:12px 16px; font-size:14px; letter-spacing:.06em; text-transform:uppercase; color:#c9a227; }}
</style></head><body>
<h1>Product heroes — each SKU distinct</h1>
<p>Per-item layout, accent colour, marketing hook, and deliverable preview. Lemon Squeezy checkout media.</p>
<div class="grid">
{items}
</div></body></html>""", encoding="utf-8")
    print(GALLERY)


def main() -> None:
    saved = []
    for fname, fn in PRODUCTS:
        saved.append((fname, save(fn(), fname)))
    write_gallery(saved)
    print(f"Generated {len(saved)} distinct product heroes → {OUT}")


if __name__ == "__main__":
    main()