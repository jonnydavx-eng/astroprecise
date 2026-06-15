#!/usr/bin/env python3
"""
AstroPrecise shop artwork — warm observatory palette (#050406 / #C9A227).

HD STANDARD: min 1600px longest edge for web cards (source art);
LANCZOS + UnsharpMask; JPEG q96 subsampling=0.
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "website" / "img" / "shop"
TEXTURES = ROOT / "website" / "assets" / "textures"
LOGO_PNG = ROOT / "website" / "img" / "icon-512.png"

CARD_W, CARD_H = 1600, 1000
JPEG_QUALITY = 96

VOID = (5, 4, 6)
BG = (13, 10, 7)
GOLD = (201, 162, 39)
GOLD_LIGHT = (239, 227, 192)
PARCHMENT = (232, 224, 208)
OXBLOOD = (110, 26, 38)
VIOLET = (92, 74, 110)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path(r"C:\Windows\Fonts\georgiab.ttf") if bold else Path(r"C:\Windows\Fonts\georgia.ttf"),
        Path(r"C:\Windows\Fonts\timesbd.ttf") if bold else Path(r"C:\Windows\Fonts\times.ttf"),
    ]
    for p in candidates:
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def radial_glow(size: int, color: tuple, alpha: int = 180) -> Image.Image:
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    cx = cy = size // 2
    for i in range(size // 2, 0, -2):
        a = int(alpha * (1 - i / (size / 2)) ** 1.9)
        d.ellipse((cx - i, cy - i, cx + i, cy + i), fill=(*color, a))
    return g


def warm_base(w: int, h: int, accent: tuple = VIOLET) -> Image.Image:
    img = Image.new("RGBA", (w, h), (*VOID, 255))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for cx, cy, rx, ry, col in (
        (int(w * 0.5), int(h * 0.42), int(w * 0.55), int(h * 0.45), (*accent, 38)),
        (int(w * 0.25), int(h * 0.6), int(w * 0.35), int(h * 0.3), (*OXBLOOD, 22)),
        (int(w * 0.78), int(h * 0.35), int(w * 0.28), int(h * 0.25), (*GOLD, 18)),
    ):
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=col)
    layer = layer.filter(ImageFilter.GaussianBlur(48))
    img.alpha_composite(layer)
    draw = ImageDraw.Draw(img)
    rng = random.Random(42)
    for _ in range(120):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        s = rng.choice((1, 1, 2, 2, 3))
        c = rng.choice(((255, 255, 255, 160), (*GOLD_LIGHT, 90), (*GOLD, 60)))
        draw.ellipse((x, y, x + s, y + s), fill=c)
    return img


def paste_center(base: Image.Image, overlay: Image.Image, cx: int, cy: int) -> None:
    base.alpha_composite(overlay, (cx - overlay.width // 2, cy - overlay.height // 2))


def circle_mask(size: int) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    return m


def load_planet(filename: str, px: int) -> Image.Image:
    path = TEXTURES / filename
    if not path.exists():
        return Image.new("RGBA", (px, px), (*GOLD, 255))
    img = Image.open(path).convert("RGBA")
    img = img.resize((px * 2, px * 2), Image.Resampling.LANCZOS)
    img = img.resize((px, px), Image.Resampling.LANCZOS)
    img.putalpha(circle_mask(px))
    return img


def draw_natal_wheel(img: Image.Image, cx: int, cy: int, r: int) -> None:
    draw = ImageDraw.Draw(img)
    for ring, w, col in ((r, 2, (*GOLD, 90)), (int(r * 0.72), 1, (*GOLD, 55)), (int(r * 0.44), 1, (*GOLD, 35))):
        draw.ellipse((cx - ring, cy - ring, cx + ring, cy + ring), outline=col, width=w)
    for i in range(12):
        ang = math.radians(i * 30 - 90)
        x1 = cx + int(math.cos(ang) * r * 0.44)
        y1 = cy + int(math.sin(ang) * r * 0.44)
        x2 = cx + int(math.cos(ang) * r)
        y2 = cy + int(math.sin(ang) * r)
        draw.line((x1, y1, x2, y2), fill=(*GOLD, 40), width=1)
    for px_off, py_off, col in ((r * 0.35, -r * 0.2, GOLD_LIGHT), (-r * 0.3, r * 0.25, GOLD), (r * 0.1, r * 0.38, (184, 120, 80))):
        pr = max(6, r // 18)
        draw.ellipse((cx + int(px_off) - pr, cy + int(py_off) - pr, cx + int(px_off) + pr, cy + int(py_off) + pr), fill=(*col, 255))


def draw_book_stack(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    for i, (dx, dy, w, h, col) in enumerate([
        (-80, 20, 140, 180, (60, 48, 72)),
        (0, 0, 150, 200, (40, 32, 48)),
        (90, 30, 130, 170, (80, 60, 40)),
    ]):
        x0, y0 = cx + dx - w // 2, cy + dy - h // 2
        draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=6, fill=(*col, 255), outline=(*GOLD, 120), width=2)
        draw.line((x0 + 18, y0 + 30, x0 + w - 18, y0 + 30), fill=(*GOLD_LIGHT, 80), width=2)


def draw_crystal(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    pts = [(cx, cy - 120), (cx + 70, cy - 20), (cx + 50, cy + 100), (cx - 50, cy + 100), (cx - 70, cy - 20)]
    draw.polygon(pts, fill=(120, 80, 160, 180), outline=(*GOLD_LIGHT, 200))
    draw.polygon([(cx, cy - 80), (cx + 40, cy), (cx, cy + 60), (cx - 40, cy)], fill=(180, 140, 220, 140))


def draw_tarot_fan(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    for i, ang in enumerate(range(-24, 28, 12)):
        rad = math.radians(ang - 90)
        w, h = 90, 140
        ox = cx + int(math.cos(rad) * 30)
        oy = cy + int(math.sin(rad) * 20)
        corners = []
        for corner in [(-w // 2, -h // 2), (w // 2, -h // 2), (w // 2, h // 2), (-w // 2, h // 2)]:
            x = ox + int(corner[0] * math.cos(rad) - corner[1] * math.sin(rad))
            y = oy + int(corner[0] * math.sin(rad) + corner[1] * math.cos(rad))
            corners.append((x, y))
        fill = (30, 24, 18) if i % 2 else (45, 36, 28)
        draw.polygon(corners, fill=(*fill, 255), outline=(*GOLD, 100))


def draw_necklace(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    draw.arc((cx - 160, cy - 100, cx + 160, cy + 140), 200, 340, fill=(*GOLD, 200), width=3)
    for i in range(7):
        ang = math.radians(200 + i * 22)
        px = cx + int(150 * math.cos(ang))
        py = cy + 20 + int(120 * math.sin(ang))
        draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill=(*GOLD_LIGHT, 255))
    draw.ellipse((cx - 18, cy + 95, cx + 18, cy + 131), fill=(*GOLD, 255), outline=(*GOLD_LIGHT, 255), width=2)


def draw_star_map(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((cx - 200, cy - 140, cx + 200, cy + 140), radius=8, fill=(18, 14, 10, 255), outline=(*GOLD, 100), width=2)
    rng = random.Random(9)
    for _ in range(40):
        x = cx + rng.randint(-170, 170)
        y = cy + rng.randint(-120, 120)
        draw.ellipse((x, y, x + 2, y + 2), fill=(*GOLD_LIGHT, rng.randint(80, 200)))
    draw.line((cx - 60, cy + 20, cx + 40, cy - 30), fill=(*GOLD, 120), width=1)
    draw.line((cx + 40, cy - 30, cx + 90, cy + 50), fill=(*GOLD, 120), width=1)


def draw_reading_pages(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    for i, dx in enumerate((-50, 0, 50)):
        x0, y0 = cx + dx - 100, cy - 130 + i * 8
        draw.rounded_rectangle((x0, y0, x0 + 200, y0 + 260), radius=6, fill=(22, 18, 14, 255), outline=(*GOLD, 90), width=2)
        for line in range(8):
            ly = y0 + 40 + line * 22
            draw.line((x0 + 24, ly, x0 + 170 - (line % 3) * 20, ly), fill=(*PARCHMENT, 50 + line * 8), width=2)


def finish(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    return rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=125, threshold=2))


def save(img: Image.Image, name: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    img.save(path, "JPEG", quality=JPEG_QUALITY, subsampling=0, optimize=True)
    print(path)


def product_reading() -> None:
    img = warm_base(CARD_W, CARD_H, VIOLET)
    draw_natal_wheel(img, CARD_W // 2, int(CARD_H * 0.48), 280)
    draw_reading_pages(img, CARD_W // 2 + 280, int(CARD_H * 0.5))
    draw = ImageDraw.Draw(img)
    title = load_font(52, True)
    sub = load_font(28)
    t = "Deep Natal Reading"
    tw = draw.textbbox((0, 0), t, font=title)[2]
    draw.text(((CARD_W - tw) // 2, 60), t, font=title, fill=GOLD_LIGHT)
    s = "Written for your chart alone"
    sw = draw.textbbox((0, 0), s, font=sub)[2]
    draw.text(((CARD_W - sw) // 2, 130), s, font=sub, fill=GOLD)
    save(finish(img), "product-deep-reading.jpg")


def product_poster() -> None:
    img = warm_base(CARD_W, CARD_H, (60, 48, 40))
    cx, cy = CARD_W // 2, int(CARD_H * 0.52)
    draw_natal_wheel(img, cx, cy, 320)
    paste_center(img, radial_glow(400, GOLD, 80), cx, cy)
    draw = ImageDraw.Draw(img)
    title = load_font(52, True)
    sub = load_font(28)
    t = "Print-at-Home Poster"
    tw = draw.textbbox((0, 0), t, font=title)[2]
    draw.text(((CARD_W - tw) // 2, 60), t, font=title, fill=GOLD_LIGHT)
    s = "Void black · engraved gold"
    sw = draw.textbbox((0, 0), s, font=sub)[2]
    draw.text(((CARD_W - sw) // 2, 130), s, font=sub, fill=GOLD)
    save(finish(img), "product-poster-pdf.jpg")


def product_bundle() -> None:
    img = warm_base(CARD_W, CARD_H, (70, 55, 35))
    draw_natal_wheel(img, int(CARD_W * 0.38), int(CARD_H * 0.5), 220)
    draw_reading_pages(img, int(CARD_W * 0.68), int(CARD_H * 0.5))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((CARD_W // 2 - 120, CARD_H - 120, CARD_W // 2 + 120, CARD_H - 50), radius=40, fill=(*OXBLOOD, 200), outline=(*GOLD, 200), width=2)
    badge = load_font(26, True)
    b = "Best value · Save £2"
    bw = draw.textbbox((0, 0), b, font=badge)[2]
    draw.text(((CARD_W - bw) // 2, CARD_H - 105), b, font=badge, fill=GOLD_LIGHT)
    title = load_font(48, True)
    t = "Reading + Poster Bundle"
    tw = draw.textbbox((0, 0), t, font=title)[2]
    draw.text(((CARD_W - tw) // 2, 55), t, font=title, fill=GOLD_LIGHT)
    save(finish(img), "product-bundle.jpg")


def category(name: str, label: str, drawer) -> None:
    img = warm_base(CARD_W, CARD_H)
    drawer(img, CARD_W // 2, int(CARD_H * 0.52))
    draw = ImageDraw.Draw(img)
    title = load_font(44, True)
    tw = draw.textbbox((0, 0), label, font=title)[2]
    draw.text(((CARD_W - tw) // 2, 70), label, font=title, fill=GOLD_LIGHT)
    save(finish(img), f"cat-{name}.jpg")


def hero_banner() -> None:
    img = warm_base(2400, 900, VIOLET)
    draw_solar_mini(img, 1200, 450, 320)
    draw = ImageDraw.Draw(img)
    title = load_font(72, True)
    sub = load_font(36)
    t = "Your sky, made tangible"
    tw = draw.textbbox((0, 0), t, font=title)[2]
    draw.text(((2400 - tw) // 2, 80), t, font=title, fill=GOLD_LIGHT)
    s = "VSOP87 precision · instant PDF delivery"
    sw = draw.textbbox((0, 0), s, font=sub)[2]
    draw.text(((2400 - sw) // 2, 170), s, font=sub, fill=GOLD)
    save(finish(img), "hero-banner.jpg")


def draw_solar_mini(img: Image.Image, cx: int, cy: int, max_r: int) -> None:
    draw = ImageDraw.Draw(img)
    planets = [
        ("mercury.jpg", 0.2, 200, 28),
        ("venus.jpg", 0.3, 130, 36),
        ("earth.jpg", 0.4, 40, 44),
        ("mars.jpg", 0.48, 310, 38),
        ("jupiter.jpg", 0.58, 80, 72),
    ]
    for fname, orbit_f, angle, base_px in planets:
        r = int(max_r * orbit_f)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(*GOLD, 45), width=1)
    paste_center(img, radial_glow(200, (255, 220, 140), 180), cx, cy)
    sun_px = 48
    sun = Image.new("RGBA", (sun_px, sun_px), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    sd.ellipse((4, 4, sun_px - 4, sun_px - 4), fill=(255, 230, 160, 255))
    paste_center(img, sun, cx, cy)
    for fname, orbit_f, angle, base_px in planets:
        r = int(max_r * orbit_f)
        rad = math.radians(angle - 90)
        px_pos = cx + int(r * math.cos(rad))
        py_pos = cy + int(r * math.sin(rad))
        paste_center(img, load_planet(fname, base_px), px_pos, py_pos)


def draw_two_skies(img: Image.Image, cx: int, cy: int) -> None:
    draw_star_map(img, cx - 220, cy)
    draw_star_map(img, cx + 220, cy)
    draw = ImageDraw.Draw(img)
    draw.line((cx - 20, cy - 80, cx + 20, cy + 80), fill=(*GOLD, 160), width=3)


def draw_gift_voucher(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    w, h = 280, 180
    x0, y0 = cx - w // 2, cy - h // 2
    draw.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=12, fill=(28, 20, 14, 255), outline=(*GOLD, 200), width=3)
    ribbon = load_font(22, True)
    draw.text((x0 + 24, y0 + 28), "GIFT", font=ribbon, fill=GOLD_LIGHT)
    sub = load_font(18)
    draw.text((x0 + 24, y0 + 70), "Deep Natal Reading", font=sub, fill=PARCHMENT)
    draw.text((x0 + 24, y0 + 100), "Redeem by email", font=sub, fill=GOLD)


def draw_gift_box(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    bw, bh, depth = 220, 160, 40
    x0, y0 = cx - bw // 2, cy - bh // 2
    draw.polygon([(x0, y0 + depth), (x0 + bw, y0 + depth), (x0 + bw, y0 + bh), (x0, y0 + bh)], fill=(50, 35, 25, 255))
    draw.polygon([(x0, y0 + depth), (cx, y0), (x0 + bw, y0 + depth), (cx, y0 + depth * 2)], fill=(70, 48, 32, 255))
    draw.rectangle((cx - 12, y0, cx + 12, y0 + bh), fill=(*OXBLOOD, 220))
    draw.rectangle((x0, cy - 12, x0 + bw, cy + 12), fill=(*OXBLOOD, 220))
    draw_natal_wheel(img, cx, cy + 20, 70)


def draw_framed_poster(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    fw, fh = 240, 320
    x0, y0 = cx - fw // 2 - 16, cy - fh // 2 - 16
    draw.rectangle((x0, y0, x0 + fw + 32, y0 + fh + 32), fill=(35, 28, 20, 255), outline=(*GOLD, 180), width=4)
    draw_natal_wheel(img, cx, cy, 120)


def draw_big_three(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    title = load_font(36, True)
    sub = load_font(24)
    for i, (label, glyph) in enumerate((("Sun", "☉"), ("Moon", "☽"), ("Rising", "↑"))):
        y = cy - 90 + i * 90
        draw.text((cx - 120, y), label, font=sub, fill=GOLD)
        draw.text((cx + 40, y), glyph, font=title, fill=GOLD_LIGHT)


def draw_tee_mockup(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    draw.polygon([(cx - 140, cy - 60), (cx - 100, cy - 140), (cx + 100, cy - 140), (cx + 140, cy - 60),
                  (cx + 160, cy + 120), (cx - 160, cy + 120)], fill=(30, 28, 26, 255), outline=(*GOLD, 80), width=2)
    draw_star_map(img, cx, cy + 10)


def draw_hoodie_mockup(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((cx - 150, cy - 80, cx + 150, cy + 130), radius=20, fill=(22, 22, 28, 255), outline=(*GOLD, 70), width=2)
    draw.polygon([(cx - 50, cy - 80), (cx, cy - 30), (cx + 50, cy - 80)], fill=(18, 18, 24, 255))
    draw_star_map(img, cx, cy + 30)


def draw_mug(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((cx - 90, cy - 70, cx + 70, cy + 90), radius=8, fill=(40, 38, 36, 255), outline=(*GOLD, 100), width=2)
    draw.arc((cx + 60, cy - 20, cx + 130, cy + 50), 270, 90, fill=(*GOLD, 180), width=4)
    rng = random.Random(3)
    for _ in range(18):
        x = cx + rng.randint(-70, 50)
        y = cy + rng.randint(-55, 75)
        draw.ellipse((x, y, x + 2, y + 2), fill=(*GOLD_LIGHT, 140))


def draw_year_calendar(img: Image.Image, cx: int, cy: int) -> None:
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((cx - 180, cy - 120, cx + 180, cy + 120), radius=8, fill=(18, 14, 10, 255), outline=(*GOLD, 100), width=2)
    months = load_font(16)
    for row in range(3):
        for col in range(4):
            m = row * 4 + col + 1
            x = cx - 150 + col * 78
            y = cy - 90 + row * 55
            draw.text((x, y), f"M{m}", font=months, fill=GOLD if m % 3 == 0 else PARCHMENT)
    draw.line((cx - 60, cy + 40, cx + 80, cy - 20), fill=(*GOLD, 150), width=2)


def draw_solar_return(img: Image.Image, cx: int, cy: int) -> None:
    paste_center(img, radial_glow(200, (255, 220, 140), 200), cx, cy)
    draw_natal_wheel(img, cx, cy, 140)
    draw = ImageDraw.Draw(img)
    sub = load_font(22)
    draw.text((cx - 80, cy + 170), "Solar Return", font=sub, fill=GOLD_LIGHT)


def product_card(filename: str, title: str, subtitle: str, drawer, accent=VIOLET) -> None:
    img = warm_base(CARD_W, CARD_H, accent)
    drawer(img, CARD_W // 2, int(CARD_H * 0.52))
    draw = ImageDraw.Draw(img)
    tf = load_font(48, True)
    sf = load_font(26)
    tw = draw.textbbox((0, 0), title, font=tf)[2]
    draw.text(((CARD_W - tw) // 2, 55), title, font=tf, fill=GOLD_LIGHT)
    sw = draw.textbbox((0, 0), subtitle, font=sf)[2]
    draw.text(((CARD_W - sw) // 2, 125), subtitle, font=sf, fill=GOLD)
    save(finish(img), filename)


def main() -> None:
    product_reading()
    product_poster()
    product_bundle()
    product_card("product-two-skies.jpg", "Two Skies", "Couples star map · side by side", draw_two_skies, OXBLOOD)
    product_card("product-gift-reading.jpg", "Gift a Reading", "Voucher + your personal note", draw_gift_voucher, (80, 50, 70))
    product_card("product-gift-box.jpg", "Whole Sky Gift Box", "Reading PDF + foil print + card", draw_gift_box, (60, 40, 55))
    product_card("product-natal-poster.jpg", "Natal Sky Poster", "Museum-grade · made to order", draw_framed_poster, (60, 48, 40))
    product_card("product-big-three.jpg", "Big Three Print", "Sun · Moon · Rising", draw_big_three, (55, 45, 65))
    product_card("product-sky-tee.jpg", "Your Sky Tee", "Constellations · gold thread", draw_tee_mockup, (40, 38, 50))
    product_card("product-sky-hoodie.jpg", "Your Sky Hoodie", "350gsm fleece · back print", draw_hoodie_mockup, (35, 35, 45))
    product_card("product-mug.jpg", "Star Map Mug", "Morning ritual · matte ceramic", draw_mug, (50, 42, 38))
    product_card("product-year-ahead.jpg", "Year Ahead", "Twelve months of transits", draw_year_calendar, (45, 55, 75))
    product_card("product-solar-return.jpg", "Solar Return", "Your birthday year theme", draw_solar_return, (75, 60, 35))
    hero_banner()
    category("books", "Essential Reading", draw_book_stack)
    category("crystals", "Crystals & Stones", draw_crystal)
    category("oracle", "Oracle & Tarot", draw_tarot_fan)
    category("jewelry", "Jewellery & Accessories", draw_necklace)
    category("prints", "Art Prints & Journals", draw_star_map)
    bundle = Image.open(OUT_DIR / "product-bundle.jpg").convert("RGB")
    bundle.resize((1600, 1600), Image.Resampling.LANCZOS).save(
        ROOT / "website" / "img" / "shop-product-cover.jpg",
        "JPEG", quality=JPEG_QUALITY, subsampling=0, optimize=True,
    )
    print("Updated website/img/shop-product-cover.jpg")


if __name__ == "__main__":
    main()