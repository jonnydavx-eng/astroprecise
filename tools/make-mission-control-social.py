#!/usr/bin/env python3
"""
AstroPrecise social asset pack in the Paper & Night brand (step 10b).

Generates profile banners, pins, square posts, story cards and the avatar for
marketing/social/ (and refreshes the two tools/social-pack/images copies used by
the scheduler). Paper ground, ink and copper; lettering in Instrument Serif and
Inter outlined from the repo's own fonts (tools/print-fonts) via tools/og/og_brand.py,
so output does not depend on installed fonts. Sign glyphs and the mark are drawn
from code (og_brand.glyph / og_brand.mark); the only night area is the orrery
plate disc of the fictional sample chart. No starfield, no prices, no AI imagery.

HD STANDARD: min 1600px longest edge where practical; JPEG q96 subsampling=0.

  python3 tools/make-mission-control-social.py

Needs: pip install uharfbuzz fonttools cairosvg pillow.
"""
from __future__ import annotations

import io
import math
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "og"))
from PIL import Image  # noqa: E402
from og_brand import C, SANS, SANS_BOLD, SANS_TAG, SIGNS, T, glyph, mark, orrery, tw, wordmark, wrap  # noqa: E402
import cairosvg  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "marketing" / "social"
JPEG_Q = 96
PROOF = "#3D6B55"
ALERT = "#A64526"


def svg_doc(w: int, h: int, body: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            f'width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>')


def ground(w: int, h: int, margin: int, sw: float = 2) -> str:
    """Paper fill with a single rule frame (the OG card plate)."""
    return (f'<rect width="{w}" height="{h}" fill="{C["paper"]}"/>'
            f'<rect x="{margin}" y="{margin}" width="{w - 2 * margin}" height="{h - 2 * margin}" fill="none" '
            f'stroke="{C["rule"]}" stroke-width="{sw}"/>')


def eyebrow(text: str, x: float, y: float, size: float, anchor: str = "start") -> str:
    return T("inter", text.upper(), size, x, y, C["goldink"], anchor, tracking=0.16, weight=SANS_BOLD)


def lines(key: str, text: str, size: float, x: float, y: float, maxw: float, lead: float, fill: str,
          weight: int = SANS, anchor: str = "start") -> tuple[str, float]:
    out, yy = [], y
    for ln in wrap(key, text, size, maxw, weight=weight):
        out.append(T(key, ln, size, x, yy, fill, anchor, weight=weight))
        yy += lead
    return "".join(out), yy


def readout(items: list[str], x: float, y: float, size: float, lead: float, anchor: str = "start") -> str:
    """The old telemetry bar as a quiet ledger: small tracked caps, proof/alert tones kept."""
    out = []
    for i, line in enumerate(items):
        col = C["muted"]
        if "NOMINAL" in line or "DIRECT" in line:
            col = PROOF
        if "CAUTION" in line or "RETROGRADE" in line:
            col = ALERT
        out.append(T("inter", line.upper(), size, x, y + i * lead, col, anchor, tracking=0.08, weight=SANS_TAG))
    return "".join(out)


def brand(x: float, y: float, size: float, anchor: str = "start") -> str:
    """Mark + wordmark lock-up; y is the wordmark baseline."""
    m = size * 1.25
    if anchor == "middle":
        total = m + size * 0.35 + tw("instrument", "AstroPrecise", size, tracking=-0.012)
        x0 = x - total / 2
    elif anchor == "end":
        x0 = x - (m + size * 0.35 + tw("instrument", "AstroPrecise", size, tracking=-0.012))
    else:
        x0 = x
    return mark(x0 + m / 2, y - size * 0.33, m, ticks=False) + wordmark(x0 + m + size * 0.35, y, size, C["ink"])


def zodiac_ring(cx: float, cy: float, r: float, hi: int | None = None) -> str:
    """Card-filled disc with twelve drawn sign glyphs and copper ticks (no Unicode)."""
    o = [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{C["card"]}" stroke="{C["graphite"]}" stroke-width="{r * 0.012:.2f}"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r * 0.78:.1f}" fill="none" stroke="{C["rule"]}" stroke-width="{r * 0.008:.2f}"/>',
         f'<circle cx="{cx}" cy="{cy}" r="{r * 0.46:.1f}" fill="none" stroke="{C["rule"]}" stroke-width="{r * 0.008:.2f}"/>']
    for k in range(12):
        a = math.radians(-90 - k * 30)
        o.append(f'<line x1="{cx + r * 0.78 * math.cos(a):.1f}" y1="{cy + r * 0.78 * math.sin(a):.1f}" '
                 f'x2="{cx + r * math.cos(a):.1f}" y2="{cy + r * math.sin(a):.1f}" stroke="{C["rule"]}" stroke-width="{r * 0.008:.2f}"/>')
        g = math.radians(-90 - k * 30 - 15)
        gs = r * 0.15
        gx, gy = cx + r * 0.89 * math.cos(g), cy + r * 0.89 * math.sin(g)
        col = C["gold"] if hi == k else C["muted"]
        o.append(glyph(SIGNS[k], gx - gs / 2, gy - gs / 2, gs, col, 1.4))
    for k in range(72):
        a = math.radians(k * 5)
        r0 = r * (0.74 if k % 6 == 0 else 0.76)
        o.append(f'<line x1="{cx + r0 * math.cos(a):.1f}" y1="{cy + r0 * math.sin(a):.1f}" x2="{cx + r * 0.78 * math.cos(a):.1f}" '
                 f'y2="{cy + r * 0.78 * math.sin(a):.1f}" stroke="{C["gold"]}" stroke-width="{r * 0.006:.2f}"/>')
    return "".join(o)


def save_jpg(svg: str, w: int, h: int, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    png = cairosvg.svg2png(bytestring=svg_doc(w, h, svg).encode(), output_width=w, output_height=h)
    im = Image.open(io.BytesIO(png)).convert("RGBA")
    rgb = Image.new("RGB", im.size, C["paper"])
    rgb.paste(im, mask=im.split()[3])
    rgb.save(path, "JPEG", quality=JPEG_Q, subsampling=0, optimize=True)
    print(f"  {path.relative_to(ROOT)}")


def make_banner(w: int, h: int, headline: str, sub: str, fname: str) -> None:
    u = h / 500  # layout unit (X banner = 1)
    m = int(20 * u)
    body = [ground(w, h, m)]
    x = 64 * u
    # The X avatar overlaps the bottom-left on desktop, so the type sits in the upper band.
    body.append(eyebrow("AstroPrecise · the sky at your minute", x, 92 * u, 15 * u))
    size = 64 * u if h / w > 0.3 else 52 * u
    t, y = lines("instrument", headline, size, x, 92 * u + size * 1.15, w * 0.55, size * 1.02, C["ink"])
    body.append(t)
    s, _ = lines("inter", sub, 22 * u, x, y + 14 * u, w * 0.55, 30 * u, C["graphite"])
    body.append(s)
    r = min(h * 0.30, w * 0.15)
    cx, cy = w - m - r - 60 * u, m + 30 * u + r
    body.append(orrery(cx, cy, r))
    body.append(readout(["Ephemeris: VSOP87 / ELP2000 · nominal", "Privacy: local compute · nominal", "astroprecise.app"],
                        cx + r, cy + r + 34 * u, 13 * u, 20 * u, anchor="end"))
    save_jpg("".join(body), w, h, OUT / fname)


def make_pin(headline: str, sub: str, fname: str, hi: int | None = None) -> None:
    w, h = 1000, 1500
    body = [ground(w, h, 32)]
    x = 72
    body.append(eyebrow("Wear your sky", x, 120, 20))
    t, y = lines("instrument", headline, 88, x, 230, w - 2 * x, 90, C["ink"])
    body.append(t)
    s, y = lines("inter", sub, 32, x, y + 24, w - 2 * x, 46, C["graphite"])
    body.append(s)
    body.append(zodiac_ring(w / 2, (y + h - 170) / 2 + 10, min(300, (h - 170 - y) / 2 - 50), hi))
    body.append(f'<line x1="{x}" y1="{h - 170}" x2="{w - x}" y2="{h - 170}" stroke="{C["rule"]}" stroke-width="2"/>')
    body.append(brand(x, h - 98, 40))
    body.append(T("inter", "Free chart · astroprecise.app", 22, w - x, h - 106, C["goldink"], "end", weight=SANS_BOLD))
    save_jpg("".join(body), w, h, OUT / fname)


def make_square(headline: str, sub: str, fname: str, telemetry: list[str] | None = None) -> None:
    s = 1080
    body = [ground(s, s, 36)]
    x = 84
    body.append(eyebrow("AstroPrecise · field notes", x, 132, 20))
    t, y = lines("instrument", headline, 84, x, 240, s - 2 * x, 86, C["ink"])
    body.append(t)
    sb, y = lines("inter", sub, 32, x, y + 20, s - 2 * x - 40, 46, C["graphite"])
    body.append(sb)
    if telemetry:
        ty = s - 160 - (len(telemetry) - 1) * 32
        body.append(f'<line x1="{x}" y1="{ty - 52}" x2="{s - x}" y2="{ty - 52}" stroke="{C["rule"]}" stroke-width="2"/>')
        body.append(readout(telemetry, x, ty, 20, 32))
    body.append(brand(s - x, s - 104, 32, anchor="end") if telemetry else brand(x, s - 104, 32))
    save_jpg("".join(body), s, s, OUT / fname)


def make_story(headline: str, sub: str, fname: str, cta: str = "LINK IN BIO") -> None:
    w, h = 1080, 1920
    body = [ground(w, h, 40)]
    x = 96
    body.append(brand(x, 190, 44))
    body.append(eyebrow("The sky at your minute", x, int(h * 0.36) - 40, 24))
    t, y = lines("instrument", headline, 112, x, int(h * 0.36) + 90, w - 2 * x, 112, C["ink"])
    body.append(t)
    sb, y = lines("inter", sub, 40, x, y + 30, w - 2 * x, 58, C["graphite"])
    body.append(sb)
    py = h - 250
    body.append(f'<rect x="{x}" y="{py}" width="{w - 2 * x}" height="96" rx="4" fill="{C["ink"]}"/>')
    body.append(T("inter", cta.upper(), 30, w / 2, py + 59, C["paper"], "middle", tracking=0.12, weight=SANS_BOLD))
    save_jpg("".join(body), w, h, OUT / fname)


def make_avatar() -> None:
    s = 400
    body = [f'<rect width="{s}" height="{s}" fill="{C["paper"]}"/>', mark(s / 2, s / 2, s * 0.82, ticks=True)]
    save_jpg("".join(body), s, s, OUT / "avatar-400.jpg")


def main() -> None:
    print("Paper & Night social pack → marketing/social/")
    OUT.mkdir(parents=True, exist_ok=True)

    make_banner(1500, 500, "Mission Control for your sky", "Real ephemeris · private · free birth chart", "banner-x-1500x500.jpg")
    make_banner(2560, 1440, "Mission Control for your sky", "VSOP87 astronomy — every number is real", "banner-youtube-2560x1440.jpg")
    make_banner(1584, 396, "AstroPrecise", "Genuinely accurate astrology — computed in your browser", "banner-linkedin-1584x396.jpg")

    make_avatar()

    make_pin("Your natal chart as wall art", "Every planet, house & aspect from your exact birth sky — not a generic sun sign.", "pin-natal-poster.jpg")
    make_pin("Free birth chart calculator", "VSOP87 precision. Sun, Moon, Rising, houses — computed in your browser. Birth data never uploaded.", "pin-birth-chart.jpg", hi=0)
    make_pin("Find your zenith star", "The real named star overhead at your birth minute — catalogue of 253 stars.", "pin-zenith-star.jpg")
    make_pin("Mission Control for your sky", "No accounts. No subscriptions. Real math. Your birth moment never leaves your device.", "pin-mission-control.jpg")

    make_square("You're not just your Sun sign", "Your Moon runs your inner world. Your Rising is the face you meet the world with.", "square-big-three.jpg",
                ["SUN: CORE IDENTITY", "MOON: INNER WEATHER", "RISING: FIRST IMPRESSION · GO CHECK"])
    make_square("Flight readiness check", "Wrong birth time by 2 hours = wrong Rising = wrong houses. Dig out your certificate.", "square-birth-time.jpg",
                ["RISING WINDOW: ~2 HOURS", "STATUS: VERIFY BIRTH TIME", "CHART: astroprecise.app/chart.html"])
    make_square("Live telemetry", "Generic horoscopes ignore the actual sky. We read where the Moon is — today.", "square-telemetry.jpg",
                ["MOON: LIVE POSITION", "MERCURY: CHECK TRANSITS.HTML", "FORECAST: REAL GEOMETRY"])
    make_square("T-minus to your birth minute", "Spin the orrery back. That planetary arrangement never repeated.", "square-orrery.jpg",
                ["ORRERY: TIME TRAVEL ENABLED", "CONFIG: ONE OF ONE", "STATUS: NOMINAL"])
    # Step 10b: the old "PRODUCT: NATAL POSTER · FROM £6" line is dropped (no prices in the brand pack).
    make_square("Wear your sky", "Not your sign on a shirt 10,000 people own. YOUR sky. One of one.", "square-wear-your-sky.jpg",
                ["SHOP: astroprecise.app/shop.html"])

    make_story("Your birth data never leaves your phone", "Computed entirely in your browser. No account. No server upload.", "story-privacy.jpg")
    make_story("Cast your full chart in 30 seconds", "Every planet. All twelve houses. Your aspects. Free.", "story-free-chart.jpg", "FREE CHART · LINK IN BIO")
    make_story("This is AstroPrecise", "Real astronomy. Private. Beautiful artifacts. Mission Control for your sky.", "story-brand-close.jpg")

    # Refresh legacy social-pack images for the scheduler
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
