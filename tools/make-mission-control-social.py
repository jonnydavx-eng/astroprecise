#!/usr/bin/env python3
"""
AstroPrecise Mission Control social asset pack.

Generates profile banners, pins, square posts, story cards, and telemetry
quote cards in the warm observatory palette. SpaceX-inspired telemetry
aesthetic — no trademarked logos.

HD STANDARD: min 1600px longest edge where practical; JPEG q96 subsampling=0.

  py tools/make-mission-control-social.py
"""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "marketing" / "social"
LOGO = ROOT / "website" / "img" / "icon-512.png"

VOID = (5, 4, 6)
BG = (13, 10, 7)
GOLD = (201, 162, 39)
GOLD_LIGHT = (239, 227, 192)
PARCHMENT = (232, 224, 208)
GREEN = (61, 143, 90)
AMBER = (196, 146, 10)
JPEG_Q = 96


def load_font(size: int, mono: bool = False, bold: bool = False) -> ImageFont.FreeTypeFont:
    if mono:
        candidates = [
            Path(r"C:\Windows\Fonts\consola.ttf"),
            Path(r"C:\Windows\Fonts\cour.ttf"),
        ]
    elif bold:
        candidates = [
            Path(r"C:\Windows\Fonts\georgiab.ttf"),
            Path(r"C:\Windows\Fonts\timesbd.ttf"),
        ]
    else:
        candidates = [
            Path(r"C:\Windows\Fonts\georgia.ttf"),
            Path(r"C:\Windows\Fonts\times.ttf"),
        ]
    for p in candidates:
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def radial_glow(size: int, color: tuple, alpha: int = 160) -> Image.Image:
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    cx = cy = size // 2
    for i in range(size // 2, 0, -3):
        a = int(alpha * (1 - i / (size / 2)) ** 2)
        d.ellipse((cx - i, cy - i, cx + i, cy + i), fill=(*color, a))
    return g


def starfield(w: int, h: int, seed: int = 42, count: int = 180) -> Image.Image:
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rng = random.Random(seed)
    for _ in range(count):
        x, y = rng.randint(0, w - 1), rng.randint(0, h - 1)
        s = rng.choice((1, 1, 2, 2, 3))
        c = rng.choice(((255, 255, 255, 140), (*GOLD_LIGHT, 70), (*GOLD, 45)))
        d.ellipse((x, y, x + s, y + s), fill=c)
    return layer


def mission_base(w: int, h: int) -> Image.Image:
    img = Image.new("RGBA", (w, h), (*VOID, 255))
    glow = radial_glow(min(w, h), GOLD, 50)
    img.alpha_composite(glow, ((w - glow.width) // 2, int(h * 0.25) - glow.height // 2))
    img.alpha_composite(starfield(w, h))
    # Grid lines (mission control display)
    grid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    step = 80
    for x in range(0, w, step):
        gd.line((x, 0, x, h), fill=(*GOLD, 12), width=1)
    for y in range(0, h, step):
        gd.line((0, y, w, y), fill=(*GOLD, 12), width=1)
    img.alpha_composite(grid)
    return img


def draw_frame(img: Image.Image, margin: int = 24) -> None:
    d = ImageDraw.Draw(img)
    w, h = img.size
    d.rectangle((margin, margin, w - margin, h - margin), outline=(*GOLD, 70), width=2)
    # Corner brackets
    bl = 28
    for ox, oy, dx, dy in (
        (margin, margin, bl, 0), (margin, margin, 0, bl),
        (w - margin, margin, -bl, 0), (w - margin, margin, 0, bl),
        (margin, h - margin, bl, 0), (margin, h - margin, 0, -bl),
        (w - margin, h - margin, -bl, 0), (w - margin, h - margin, 0, -bl),
    ):
        d.line((ox, oy, ox + dx, oy + dy), fill=(*GOLD, 120), width=2)


def draw_telemetry_bar(img: Image.Image, y: int, lines: list[str]) -> None:
    d = ImageDraw.Draw(img)
    w = img.size[0]
    mono = load_font(18, mono=True)
    for i, line in enumerate(lines):
        color = GREEN if "NOMINAL" in line or "DIRECT" in line else PARCHMENT
        if "CAUTION" in line or "RETROGRADE" in line:
            color = AMBER
        d.text((40, y + i * 26), line, font=mono, fill=(*color, 220))


def text_centered(img: Image.Image, y: int, text: str, font, fill) -> int:
    d = ImageDraw.Draw(img)
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (img.size[0] - tw) // 2
    d.text((x, y), text, font=font, fill=fill)
    return bbox[3] - bbox[1]


def wrap_text(text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines, cur = [], ""
    d = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for w in words:
        test = (cur + " " + w).strip()
        if d.textlength(test, font=font) <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def paste_logo(img: Image.Image, size: int, pos: tuple[int, int]) -> None:
    if not LOGO.exists():
        return
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.resize((size, size), Image.Resampling.LANCZOS)
    img.alpha_composite(logo, pos)


def save_jpg(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = Image.new("RGB", img.size, VOID)
    if img.mode == "RGBA":
        rgb.paste(img, mask=img.split()[3])
    else:
        rgb = img.convert("RGB")
    rgb.save(path, "JPEG", quality=JPEG_Q, subsampling=0, optimize=True)
    print(f"  {path.relative_to(ROOT)}")


def make_banner(w: int, h: int, headline: str, sub: str, fname: str) -> None:
    img = mission_base(w, h)
    draw_frame(img, 20)
    paste_logo(img, min(80, h - 40), (w - 110, (h - 80) // 2))
    d = ImageDraw.Draw(img)
    brand = load_font(14, mono=True)
    d.text((36, 28), "ASTROPRECISE · MISSION CONTROL", font=brand, fill=(*GOLD, 160))
    title = load_font(int(h * 0.14), bold=True)
    subf = load_font(int(h * 0.07))
    y = int(h * 0.32)
    for line in wrap_text(headline, title, w - 200):
        d.text((36, y), line, font=title, fill=(*GOLD_LIGHT, 255))
        y += int(h * 0.16)
    d.text((36, y + 8), sub, font=subf, fill=(*PARCHMENT, 200))
    draw_telemetry_bar(img, h - 90, [
        "EPHEMERIS: VSOP87/ELP2000 · NOMINAL",
        "PRIVACY: LOCAL COMPUTE · NOMINAL",
        "astroprecise.app",
    ])
    save_jpg(img, OUT / fname)


def make_pin(headline: str, sub: str, fname: str) -> None:
    w, h = 1000, 1500
    img = mission_base(w, h)
    draw_frame(img, 32)
    d = ImageDraw.Draw(img)
    brand = load_font(16, mono=True)
    d.text((48, 48), "✦ WEAR YOUR SKY", font=brand, fill=(*GOLD, 200))
    title = load_font(62, bold=True)
    subf = load_font(32)
    y = 200
    for line in wrap_text(headline, title, w - 96):
        d.text((48, y), line, font=title, fill=(*GOLD_LIGHT, 255))
        y += 72
    for line in wrap_text(sub, subf, w - 96):
        d.text((48, y + 24), line, font=subf, fill=(*PARCHMENT, 210))
        y += 42
    # Decorative wheel
    cx, cy, r = w // 2, int(h * 0.72), 140
    for ring, col in ((r, (*GOLD, 80)), (int(r * 0.7), (*GOLD, 50)), (int(r * 0.4), (*GOLD, 30))):
        d.ellipse((cx - ring, cy - ring, cx + ring, cy + ring), outline=col, width=2)
    for i in range(12):
        ang = math.radians(i * 30 - 90)
        x1 = cx + int(r * 0.85 * math.cos(ang))
        y1 = cy + int(r * 0.85 * math.sin(ang))
        x2 = cx + int(r * math.cos(ang))
        y2 = cy + int(r * math.sin(ang))
        d.line((x1, y1, x2, y2), fill=(*GOLD, 60), width=1)
    d.text((48, h - 120), "Free chart → astroprecise.app", font=brand, fill=(*GOLD, 220))
    save_jpg(img, OUT / fname)


def make_square(headline: str, sub: str, fname: str, telemetry: list[str] | None = None) -> None:
    s = 1080
    img = mission_base(s, s)
    draw_frame(img, 36)
    d = ImageDraw.Draw(img)
    brand = load_font(18, mono=True)
    d.text((48, 44), "MISSION CONTROL", font=brand, fill=(*GOLD, 180))
    title = load_font(56, bold=True)
    subf = load_font(30)
    y = 120
    for line in wrap_text(headline, title, s - 96):
        d.text((48, y), line, font=title, fill=(*GOLD_LIGHT, 255))
        y += 64
    for line in wrap_text(sub, subf, s - 96):
        d.text((48, y + 16), line, font=subf, fill=(*PARCHMENT, 200))
        y += 40
    if telemetry:
        draw_telemetry_bar(img, s - 160, telemetry)
    paste_logo(img, 72, (s - 120, 48))
    save_jpg(img, OUT / fname)


def make_story(headline: str, sub: str, fname: str, cta: str = "LINK IN BIO") -> None:
    w, h = 1080, 1920
    img = mission_base(w, h)
    draw_frame(img, 40)
    d = ImageDraw.Draw(img)
    brand = load_font(20, mono=True)
    d.text((48, 60), "ASTROPRECISE", font=brand, fill=(*GOLD, 200))
    title = load_font(72, bold=True)
    subf = load_font(36)
    y = int(h * 0.35)
    for line in wrap_text(headline, title, w - 96):
        d.text((48, y), line, font=title, fill=(*GOLD_LIGHT, 255))
        y += 82
    for line in wrap_text(sub, subf, w - 96):
        d.text((48, y + 20), line, font=subf, fill=(*PARCHMENT, 210))
        y += 48
    # CTA pill
    pill_y = h - 200
    d.rounded_rectangle((48, pill_y, w - 48, pill_y + 64), radius=8, fill=(*GOLD, 40), outline=(*GOLD, 180), width=2)
    cta_f = load_font(28, mono=True)
    tw = ImageDraw.Draw(img).textlength(cta, font=cta_f)
    d.text(((w - tw) // 2, pill_y + 16), cta, font=cta_f, fill=(*GOLD_LIGHT, 255))
    save_jpg(img, OUT / fname)


def make_avatar() -> None:
    s = 400
    img = mission_base(s, s)
    draw_frame(img, 16)
    paste_logo(img, 280, (60, 60))
    d = ImageDraw.Draw(img)
    mono = load_font(14, mono=True)
    d.text((60, s - 44), "NOMINAL", font=mono, fill=(*GREEN, 220))
    save_jpg(img, OUT / "avatar-400.jpg")


def main() -> None:
    print("Mission Control social pack → marketing/social/")
    OUT.mkdir(parents=True, exist_ok=True)

    make_banner(1500, 500, "Mission Control for your sky", "Real ephemeris · private · free birth chart", "banner-x-1500x500.jpg")
    make_banner(2560, 1440, "Mission Control for your sky", "VSOP87 astronomy — every number is real", "banner-youtube-2560x1440.jpg")
    make_banner(1584, 396, "AstroPrecise", "Genuinely accurate astrology — computed in your browser", "banner-linkedin-1584x396.jpg")

    make_avatar()

    make_pin("Your natal chart as wall art", "Every planet, house & aspect from your exact birth sky — not a generic sun sign.", "pin-natal-poster.jpg")
    make_pin("Free birth chart calculator", "VSOP87 precision. Sun, Moon, Rising, houses — computed in your browser. Birth data never uploaded.", "pin-birth-chart.jpg")
    make_pin("Find your zenith star", "The real named star overhead at your birth minute — catalogue of 253 stars.", "pin-zenith-star.jpg")
    make_pin("Mission Control for your sky", "No accounts. No subscriptions. Real math. Your birth moment never leaves your device.", "pin-mission-control.jpg")

    make_square("You're not just your Sun sign", "Your Moon runs your inner world. Your Rising is the face you meet the world with.", "square-big-three.jpg",
                ["SUN: CORE IDENTITY", "MOON: INNER WEATHER", "RISING: FIRST IMPRESSION · GO CHECK"])
    make_square("Flight readiness check", "Wrong birth time by 2 hours = wrong Rising = wrong houses. Dig out your certificate.", "square-birth-time.jpg",
                ["RISING WINDOW: ~2 HOURS", "STATUS: VERIFY BIRTH TIME", "CHART: astroprecise.app/chart.html"])
    make_square("LIVE TELEMETRY", "Generic horoscopes ignore the actual sky. We read where the Moon is — today.", "square-telemetry.jpg",
                ["MOON: LIVE POSITION", "MERCURY: CHECK TRANSITS.HTML", "FORECAST: REAL GEOMETRY"])
    make_square("T-MINUS to your birth minute", "Spin the orrery back. That planetary arrangement never repeated.", "square-orrery.jpg",
                ["ORRERY: TIME TRAVEL ENABLED", "CONFIG: ONE OF ONE", "STATUS: NOMINAL"])
    make_square("Wear your sky", "Not your sign on a shirt 10,000 people own. YOUR sky. One of one.", "square-wear-your-sky.jpg",
                ["PRODUCT: NATAL POSTER · FROM £6", "SHOP: astroprecise.app/shop.html"])

    make_story("Your birth data never leaves your phone", "Computed entirely in your browser. No account. No server upload.", "story-privacy.jpg")
    make_story("Cast your full chart in 30 seconds", "Every planet. All twelve houses. Your aspects. Free.", "story-free-chart.jpg", "FREE CHART · LINK IN BIO")
    make_story("This is AstroPrecise", "Real astronomy. Private. Beautiful artifacts. Mission Control for your sky.", "story-brand-close.jpg")

    # Refresh legacy social-pack images for Postiz scheduler
    legacy = ROOT / "tools" / "social-pack" / "images"
    legacy.mkdir(parents=True, exist_ok=True)
    src_pin = OUT / "pin-birth-chart.jpg"
    src_sq = OUT / "square-wear-your-sky.jpg"
    if src_pin.exists():
        Image.open(src_pin).save(legacy / "pin-birth-chart.jpg", "JPEG", quality=JPEG_Q, subsampling=0)
    if src_sq.exists():
        Image.open(src_sq).save(legacy / "square-your-sky.jpg", "JPEG", quality=JPEG_Q, subsampling=0)

    print(f"\nDone — {len(list(OUT.glob('*.jpg')))} assets in marketing/social/")


if __name__ == "__main__":
    main()