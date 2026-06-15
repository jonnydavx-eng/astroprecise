#!/usr/bin/env python3
"""
Customer-deliverable mockups — what the buyer actually receives.
Each SKU gets unique art showing the personalised product (Jane Example sample chart).
Output: website/img/shop/product-*.jpg + tools/customer-mockups-gallery.html
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "website" / "img" / "shop"
GALLERY = ROOT / "tools" / "customer-mockups-gallery.html"
TEXTURES = ROOT / "website" / "assets" / "textures"

W, H = 1600, 1000
Q = 96
VOID = (5, 4, 6)
PAGE = (7, 6, 8)
GOLD = (201, 162, 39)
GOLD_LT = (239, 227, 192)
GOLD_HI = (232, 200, 114)
PARCH = (232, 224, 208)
MUTED = (168, 158, 136)
OXBLOOD = (110, 26, 38)

JANE = {
    "name": "Jane Example",
    "birth": "15 Mar 1990  ·  14:30  ·  London",
    "sun": ("☉", "Sun", "24°44′ Pisces"),
    "moon": ("☽", "Moon", "10°58′ Scorpio"),
    "rise": ("↑", "Rising", "18°07′ Leo"),
    "partner": "Orion Vale",
    "voucher": "AP-GIFT7K2M",
}


def font(sz: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    paths = [
        Path(r"C:\Windows\Fonts\georgiab.ttf") if bold else Path(r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\timesbd.ttf") if bold else Path(r"C:\Windows\Fonts\times.ttf"),
    ]
    for p in paths:
        if p.exists():
            return ImageFont.truetype(str(p), sz)
    return ImageFont.load_default()


def scene_base(accent=(40, 32, 48)) -> Image.Image:
    img = Image.new("RGBA", (W, H), (*VOID, 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((W // 2 - 500, H // 2 - 350, W // 2 + 500, H // 2 + 350), fill=(*accent, 30))
    d.ellipse((200, H - 200, 600, H + 100), fill=(*OXBLOOD, 18))
    glow = glow.filter(ImageFilter.GaussianBlur(60))
    img.alpha_composite(glow)
    rng = random.Random(11)
    d2 = ImageDraw.Draw(img)
    for _ in range(90):
        x, y = rng.randint(0, W - 1), rng.randint(0, H - 1)
        d2.ellipse((x, y, x + rng.choice((1, 2)), y + 1), fill=(*GOLD_LT, rng.randint(40, 120)))
    return img


def radial_glow(sz: int, col: tuple, a: int = 180) -> Image.Image:
    g = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    c = sz // 2
    for i in range(c, 0, -2):
        d.ellipse((c - i, c - i, c + i, c + i), fill=(*col, int(a * (1 - i / c) ** 1.8)))
    return g


def wheel(draw: ImageDraw.ImageDraw, cx: int, cy: int, r: int, detail: bool = True) -> None:
    for ring, w, col in ((r, 2, GOLD), (int(r * 0.72), 1, (201, 162, 39, 140)), (int(r * 0.44), 1, (201, 162, 39, 80))):
        draw.ellipse((cx - ring, cy - ring, cx + ring, cy + ring), outline=col, width=w)
    for i in range(12):
        ang = math.radians(i * 30 - 90)
        x1 = cx + int(math.cos(ang) * r * 0.44)
        y1 = cy + int(math.sin(ang) * r * 0.44)
        x2 = cx + int(math.cos(ang) * r)
        y2 = cy + int(math.sin(ang) * r)
        draw.line((x1, y1, x2, y2), fill=(201, 162, 39, 60), width=1)
    if detail:
        pts = ((0.35, -0.2, GOLD_LT), (-0.28, 0.22, GOLD), (0.12, 0.36, (200, 130, 90)),
               (-0.15, -0.32, (140, 180, 220)), (0.42, 0.08, (180, 140, 100)))
        for px, py, col in pts:
            pr = max(5, r // 16)
            draw.ellipse((cx + int(px * r) - pr, cy + int(py * r) - pr,
                          cx + int(px * r) + pr, cy + int(py * r) + pr), fill=(*col, 255))


def keepsake_page(w: int, h: int, title: str, subtitle: str = "", body_lines: int = 6) -> Image.Image:
    pg = Image.new("RGBA", (w, h), (*PAGE, 255))
    d = ImageDraw.Draw(pg)
    d.rectangle((8, 8, w - 9, h - 9), outline=(*GOLD, 200), width=1)
    d.rectangle((12, 12, w - 13, h - 13), outline=(*GOLD, 80), width=1)
    eyebrow = font(max(11, w // 28))
    d.text((w // 2, 28), "ASTROPRECISE", font=eyebrow, fill=GOLD, anchor="mt")
    t = font(max(16, w // 14), True)
    d.text((w // 2, 52), title, font=t, fill=GOLD_LT, anchor="mt")
    if subtitle:
        s = font(max(11, w // 24))
        d.text((w // 2, 82), subtitle, font=s, fill=MUTED, anchor="mt")
    y0 = 110 if subtitle else 95
    lf = font(max(10, w // 32))
    for i in range(body_lines):
        y = y0 + i * (max(14, h // 28))
        wlen = int(w * (0.55 + (i % 4) * 0.08))
        d.line((24, y, 24 + wlen, y), fill=(*PARCH, 70 + i * 12), width=2)
    d.text((w // 2, h - 18), "✦  VSOP87  ·  Entertainment only", font=font(9), fill=MUTED, anchor="mb")
    return pg


def poster_sheet(w: int, h: int, name: str) -> Image.Image:
    pg = Image.new("RGBA", (w, h), (*VOID, 255))
    d = ImageDraw.Draw(pg)
    d.rectangle((0, 0, w - 1, h - 1), outline=(*GOLD, 180), width=2)
    d.text((w // 2, 24), "THE NATAL CHART OF", font=font(max(10, w // 32)), fill=GOLD, anchor="mt")
    d.text((w // 2, 48), name.upper(), font=font(max(18, w // 12), True), fill=GOLD_LT, anchor="mt")
    d.text((w // 2, 78), JANE["birth"], font=font(max(9, w // 36)), fill=MUTED, anchor="mt")
    wheel(d, w // 2, int(h * 0.52), min(w, h) // 3)
    for i, (g, lbl, val) in enumerate((JANE["sun"], JANE["moon"], JANE["rise"])):
        bx = 20 + i * (w - 40) // 3
        d.rounded_rectangle((bx, h - 72, bx + (w - 60) // 3, h - 18), radius=6,
                            outline=(*GOLD, 120), width=1)
        d.text((bx + 12, h - 58), g, font=font(14), fill=GOLD_HI)
        d.text((bx + 36, h - 58), lbl, font=font(9), fill=MUTED)
        d.text((bx + 12, h - 38), val, font=font(10), fill=PARCH)
    return pg


def paste_page(base: Image.Image, page: Image.Image, cx: int, cy: int, angle: float = 0, shadow: bool = True) -> None:
    p = page
    if angle:
        p = p.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    if shadow:
        sh = Image.new("RGBA", (p.width + 30, p.height + 30), (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        sd.rounded_rectangle((18, 18, p.width + 12, p.height + 12), radius=8, fill=(0, 0, 0, 90))
        sh = sh.filter(ImageFilter.GaussianBlur(10))
        base.alpha_composite(sh, (cx - p.width // 2 - 4, cy - p.height // 2 + 6))
    base.alpha_composite(p, (cx - p.width // 2, cy - p.height // 2))


def label_bar(img: Image.Image, sku: str, tag: str) -> None:
    d = ImageDraw.Draw(img)
    d.rectangle((0, H - 56, W, H), fill=(2, 2, 4, 230))
    d.text((32, H - 38), sku.replace("-", " ").title(), font=font(22, True), fill=GOLD_LT)
    d.text((W - 32, H - 38), tag, font=font(16), fill=GOLD, anchor="rt")


def finish(img: Image.Image) -> Image.Image:
    return img.convert("RGB").filter(ImageFilter.UnsharpMask(1.2, 125, 2))


def save(img: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    img.save(p, "JPEG", quality=Q, subsampling=0, optimize=True)
    print(p)
    return p


# ── 1 Deep Reading ──────────────────────────────────────────────────────────
def mock_deep_reading() -> Image.Image:
    img = scene_base((55, 45, 75))
    spread = keepsake_page(340, 460, JANE["name"], "Deep Natal Reading  ·  Page 3 of 9", 9)
    paste_page(img, spread, W // 2 - 120, H // 2 - 30, -4)
    p2 = keepsake_page(340, 460, "Sun in Pisces", body_lines=8)
    d2 = ImageDraw.Draw(p2)
    wheel(d2, 170, 200, 55)
    paste_page(img, p2, W // 2 + 130, H // 2 - 10, 6)
    d = ImageDraw.Draw(img)
    d.text((W // 2, 42), "Your personalised PDF — nine pages of measured sky", font=font(20), fill=MUTED, anchor="mt")
    label_bar(img, "deep-reading", "Digital PDF · 24–48h")
    return finish(img)


# ── 2 Poster PDF ────────────────────────────────────────────────────────────
def mock_poster_pdf() -> Image.Image:
    img = scene_base((45, 38, 32))
    # desk surface
    d = ImageDraw.Draw(img)
    d.polygon([(100, H - 80), (W - 80, H - 140), (W - 40, H - 20), (140, H - 20)], fill=(18, 14, 10, 255))
    poster = poster_sheet(420, 580, JANE["name"])
    paste_page(img, poster, W // 2, H // 2 - 40, -2)
    d.text((W // 2, 42), "Print-at-home A3 — engraved gold on void black", font=font(20), fill=MUTED, anchor="mt")
    label_bar(img, "natal-poster-pdf", "Print-ready PDF")
    return finish(img)


# ── 3 Bundle ────────────────────────────────────────────────────────────────
def mock_bundle() -> Image.Image:
    img = scene_base((50, 40, 30))
    paste_page(img, poster_sheet(300, 400, JANE["name"]), W // 2 - 200, H // 2 - 20, -6)
    paste_page(img, keepsake_page(300, 400, JANE["name"], "Deep Reading  ·  9 pages", 7), W // 2 + 180, H // 2 - 10, 5)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((W // 2 - 100, 28, W // 2 + 100, 68), radius=20, fill=(*OXBLOOD, 220), outline=GOLD, width=2)
    d.text((W // 2, 48), "Both from one chart", font=font(18, True), fill=GOLD_LT, anchor="mm")
    label_bar(img, "reading-poster-bundle", "2 PDFs · Save £2")
    return finish(img)


# ── 4 Two Skies ─────────────────────────────────────────────────────────────
def mock_two_skies() -> Image.Image:
    img = scene_base((70, 35, 40))
    sheet = Image.new("RGBA", (720, 480), (*VOID, 255))
    d = ImageDraw.Draw(sheet)
    d.rectangle((0, 0, 719, 479), outline=GOLD, width=2)
    d.text((360, 28), "TWO SKIES", font=font(22, True), fill=GOLD_LT, anchor="mt")
    for i, (nm, ox) in enumerate(((JANE["name"], 180), (JANE["partner"], 540))):
        d.text((ox, 58), nm, font=font(16, True), fill=PARCH, anchor="mt")
        d.text((ox, 82), JANE["birth"].split("·")[0].strip(), font=font(11), fill=MUTED, anchor="mt")
        wheel(d, ox, 270, 110)
    d.line((360, 100, 360, 420), fill=(*GOLD, 100), width=1)
    paste_page(img, sheet, W // 2, H // 2 - 20, 0)
    label_bar(img, "two-skies-map", "Couples print · 250gsm matte")
    return finish(img)


# ── 5 Gift Reading ──────────────────────────────────────────────────────────
def mock_gift_reading() -> Image.Image:
    img = scene_base((65, 40, 55))
    card = Image.new("RGBA", (520, 340), (*PAGE, 255))
    d = ImageDraw.Draw(card)
    d.rectangle((10, 10, 509, 329), outline=GOLD, width=2)
    d.text((260, 36), "ASTROPRECISE GIFT", font=font(14), fill=GOLD, anchor="mt")
    d.text((260, 72), "Deep Natal Reading", font=font(28, True), fill=GOLD_LT, anchor="mt")
    d.text((260, 120), "For someone you love", font=font(16), fill=PARCH, anchor="mt")
    d.text((260, 175), JANE["voucher"], font=font(32, True), fill=GOLD_HI, anchor="mt")
    d.text((260, 230), '"The stars wrote this for you alone."', font=font(14), fill=MUTED, anchor="mt")
    d.text((260, 270), "Redeem at astroprecise.app  ·  Valid 12 months", font=font(11), fill=MUTED, anchor="mt")
    paste_page(img, card, W // 2, H // 2 - 30, -3)
    label_bar(img, "gift-reading", "Gift voucher PDF")
    return finish(img)


# ── 6 Gift Box ──────────────────────────────────────────────────────────────
def mock_gift_box() -> Image.Image:
    img = scene_base((45, 30, 40))
    d = ImageDraw.Draw(img)
    bx, by, bw, bh = W // 2 - 200, H // 2 - 60, 400, 260
    d.polygon([(bx, by + 50), (bx + bw, by + 50), (bx + bw, by + bh), (bx, by + bh)], fill=(42, 30, 22, 255))
    d.polygon([(bx, by + 50), (W // 2, by), (bx + bw, by + 50), (W // 2, by + 100)], fill=(58, 40, 28, 255))
    d.rectangle((W // 2 - 14, by, W // 2 + 14, by + bh), fill=(*OXBLOOD, 240))
    paste_page(img, poster_sheet(160, 220, JANE["name"]), W // 2 - 90, by + 130, 8)
    mini = keepsake_page(140, 90, "Gift card", "Your note here", 2)
    paste_page(img, mini, W // 2 + 100, by + 120, -5)
    label_bar(img, "gift-box-whole-sky", "Reading + foil print + card")
    return finish(img)


# ── 7 Physical Poster ───────────────────────────────────────────────────────
def mock_natal_poster() -> Image.Image:
    img = scene_base((30, 28, 35))
    d = ImageDraw.Draw(img)
    # wall
    d.rectangle((0, 0, W, H - 100), fill=(12, 10, 14, 255))
    frame = Image.new("RGBA", (360, 480), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rectangle((0, 0, 359, 479), fill=(32, 26, 18, 255), outline=GOLD, width=6)
    inner = poster_sheet(300, 400, JANE["name"])
    frame.alpha_composite(inner, (30, 40))
    paste_page(img, frame, W // 2, H // 2 - 60, 0)
    d.text((W // 2, H - 130), "Museum-grade matte  ·  Foil option", font=font(18), fill=MUTED, anchor="mt")
    label_bar(img, "natal-poster", "Fine-art print · made to order")
    return finish(img)


# ── 8 Big Three ─────────────────────────────────────────────────────────────
def mock_big_three() -> Image.Image:
    img = scene_base((50, 42, 60))
    pg = Image.new("RGBA", (400, 520), (*PAGE, 255))
    d = ImageDraw.Draw(pg)
    d.rectangle((8, 8, 391, 511), outline=GOLD, width=1)
    d.text((200, 32), "BIG THREE", font=font(14), fill=GOLD, anchor="mt")
    d.text((200, 58), JANE["name"], font=font(24, True), fill=GOLD_LT, anchor="mt")
    d.text((200, 92), JANE["birth"], font=font(11), fill=MUTED, anchor="mt")
    for i, (g, lbl, val) in enumerate((JANE["sun"], JANE["moon"], JANE["rise"])):
        y = 140 + i * 110
        d.rounded_rectangle((40, y, 360, y + 90), radius=10, outline=(*GOLD, 140), width=1)
        d.text((200, y + 18), g, font=font(36), fill=GOLD_HI, anchor="mt")
        d.text((200, y + 58), lbl.upper(), font=font(10), fill=MUTED, anchor="mt")
        d.text((200, y + 74), val, font=font(14), fill=PARCH, anchor="mt")
    paste_page(img, pg, W // 2, H // 2 - 20, 2)
    label_bar(img, "big-three-print", "Typographic mini print")
    return finish(img)


# ── 9 Sky Tee ───────────────────────────────────────────────────────────────
def mock_sky_tee() -> Image.Image:
    img = scene_base((35, 34, 42))
    d = ImageDraw.Draw(img)
    # flat-lay tee
    pts = [(W // 2 - 220, H // 2 - 40), (W // 2 - 160, H // 2 - 200), (W // 2 + 160, H // 2 - 200),
           (W // 2 + 220, H // 2 - 40), (W // 2 + 240, H // 2 + 180), (W // 2 - 240, H // 2 + 180)]
    d.polygon(pts, fill=(24, 22, 26, 255), outline=(*GOLD, 60))
    rng = random.Random(5)
    for _ in range(55):
        x = W // 2 + rng.randint(-160, 160)
        y = H // 2 + rng.randint(-120, 100)
        d.ellipse((x, y, x + 2, y + 2), fill=(*GOLD_LT, rng.randint(80, 180)))
    d.line((W // 2 - 80, H // 2 - 10, W // 2 + 60, H // 2 - 50), fill=GOLD, width=1)
    for g, ox in (("☉", -50), ("☽", 0), ("↑", 50)):
        d.text((W // 2 + ox, H // 2 + 60), g, font=font(22), fill=GOLD_HI, anchor="mt")
    d.text((W // 2, 42), "Constellations at your birth — gold-thread glyphs", font=font(18), fill=MUTED, anchor="mt")
    label_bar(img, "sky-tee", "Heavyweight cotton · printed to order")
    return finish(img)


# ── 10 Hoodie ───────────────────────────────────────────────────────────────
def mock_sky_hoodie() -> Image.Image:
    img = scene_base((28, 28, 38))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((W // 2 - 250, H // 2 - 220, W // 2 + 250, H // 2 + 160), radius=30,
                        fill=(18, 18, 24, 255), outline=(*GOLD, 50), width=2)
    d.polygon([(W // 2 - 80, H // 2 - 220), (W // 2, H // 2 - 150), (W // 2 + 80, H // 2 - 220)],
              fill=(14, 14, 18, 255))
    wheel(d, W // 2, H // 2 - 10, 130)
    cuff = font(16)
    d.text((W // 2 - 200, H // 2 + 120), "☉ ☽ ↑", font=cuff, fill=GOLD_HI)
    d.text((W // 2, 42), "Natal canopy across the back — Big Three at the cuff", font=font(18), fill=MUTED, anchor="mt")
    label_bar(img, "sky-hoodie", "350gsm fleece")
    return finish(img)


# ── 11 Mug ──────────────────────────────────────────────────────────────────
def mock_mug() -> Image.Image:
    img = scene_base((38, 32, 28))
    d = ImageDraw.Draw(img)
    d.ellipse((W // 2 - 280, H // 2 + 60, W // 2 + 280, H // 2 + 120), fill=(16, 12, 10, 255))
    mx, my = W // 2 - 30, H // 2 - 120
    d.rounded_rectangle((mx - 100, my, mx + 80, my + 170), radius=12, fill=(42, 40, 38, 255), outline=GOLD, width=2)
    d.arc((mx + 60, my + 40, mx + 150, my + 130), 270, 90, fill=GOLD, width=5)
    rng = random.Random(8)
    for _ in range(35):
        ang = rng.random() * math.tau
        rr = 60 + rng.random() * 30
        px = mx - 10 + int(math.cos(ang) * rr)
        py = my + 85 + int(math.sin(ang) * 50)
        d.ellipse((px, py, px + 2, py + 2), fill=(*GOLD_LT, 150))
    d.text((mx - 10, my - 18), "☉", font=font(20), fill=GOLD_HI, anchor="mt")
    label_bar(img, "constellation-mug", "Matte ceramic · wrap-around print")
    return finish(img)


# ── 12 Year Ahead ───────────────────────────────────────────────────────────
def mock_year_ahead() -> Image.Image:
    img = scene_base((42, 50, 72))
    pg = keepsake_page(380, 500, JANE["name"], "Year Ahead Transit Report  ·  2026", 4)
    d = ImageDraw.Draw(pg)
    d.text((190, 130), "Major transits to your natal chart", font=font(12), fill=MUTED, anchor="mt")
    months = ["Jan", "Mar", "Jun", "Sep", "Dec"]
    events = ["Saturn □ Sun", "Jupiter △ Moon", "Pluto ☌ MC", "Neptune ⚹ Venus", "Uranus ☍ Rising"]
    for i, (m, ev) in enumerate(zip(months, events)):
        y = 170 + i * 52
        d.text((30, y), m, font=font(13, True), fill=GOLD)
        d.line((80, y + 8, 350, y + 8), fill=(*GOLD, 80), width=1)
        d.text((90, y + 18), ev, font=font(12), fill=PARCH)
    paste_page(img, pg, W // 2, H // 2 - 20, -2)
    label_bar(img, "year-ahead", "12-month PDF report")
    return finish(img)


# ── 13 Solar Return ─────────────────────────────────────────────────────────
def mock_solar_return() -> Image.Image:
    img = scene_base((60, 48, 30))
    pg = keepsake_page(400, 520, JANE["name"], "Solar Return  ·  15 Mar 2026", 3)
    d = ImageDraw.Draw(pg)
    d.text((200, 120), "The sky at your exact solar return", font=font(12), fill=MUTED, anchor="mt")
    wheel(d, 200, 300, 100)
    d.text((200, 430), "Theme of your birthday year", font=font(13, True), fill=GOLD_LT, anchor="mt")
    paste_page(img, pg, W // 2, H // 2 - 20, 3)
    label_bar(img, "solar-return", "Annual birthday PDF")
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
        f'    <figure><img src="../website/img/shop/{fname}" alt="{fname}"><figcaption>{fname.replace("product-", "").replace(".jpg", "").replace("-", " ").title()}</figcaption></figure>'
        for fname, _ in paths
    )
    GALLERY.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>AstroPrecise — Customer deliverable mockups</title>
<style>
  body {{ margin:0; background:#050406; color:#efe3c0; font-family:Georgia,serif; padding:24px; }}
  h1 {{ color:#c9a227; font-weight:normal; letter-spacing:.08em; }}
  p {{ color:#a89e88; max-width:720px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(480px,1fr)); gap:28px; margin-top:24px; }}
  figure {{ margin:0; background:#0d0a08; border:1px solid rgba(201,162,39,.25); border-radius:8px; overflow:hidden; }}
  img {{ width:100%; display:block; }}
  figcaption {{ padding:12px 16px; font-size:14px; letter-spacing:.06em; text-transform:uppercase; color:#c9a227; }}
</style></head><body>
<h1>Customer deliverable mockups — Jane Example</h1>
<p>What each buyer receives after submitting birth details. These replace LS checkout product images.</p>
<div class="grid">
{items}
</div></body></html>""", encoding="utf-8")
    print(GALLERY)


def main() -> None:
    saved = []
    for fname, fn in PRODUCTS:
        saved.append((fname, save(fn(), fname)))
    write_gallery(saved)
    print(f"Generated {len(saved)} customer-deliverable mockups")


if __name__ == "__main__":
    main()