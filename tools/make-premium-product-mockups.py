#!/usr/bin/env python3
"""
Premium LS product mockups — real fulfilment HTML via Edge headless + observatory compositing.
Output: website/img/shop/product-*.jpg (1600×900, no footer bars, customer-facing only).
"""
from __future__ import annotations

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
MUTED = (168, 158, 136)
OXBLOOD = (110, 26, 38)

EDGE_PATHS = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
]
_SCREEN_CACHE: dict[tuple[str, int, int], Image.Image] = {}


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
        str(edge),
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--disable-extensions",
        f"--window-size={vw},{vh}",
        "--virtual-time-budget=12000",
        f"--screenshot={shot}",
        url,
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


def scene_base(accent=(40, 32, 48)) -> Image.Image:
    img = Image.new("RGBA", (W, H), (*VOID, 255))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((W // 2 - 520, H // 2 - 380, W // 2 + 520, H // 2 + 380), fill=(*accent, 28))
    d.ellipse((120, H - 180, 520, H + 60), fill=(*OXBLOOD, 16))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img.alpha_composite(glow)
    rng = random.Random(42)
    d2 = ImageDraw.Draw(img)
    for _ in range(110):
        x, y = rng.randint(0, W - 1), rng.randint(0, H - 1)
        d2.ellipse((x, y, x + rng.choice((1, 2)), y + 1), fill=(*GOLD_LT, rng.randint(35, 110)))
    return img


def vignette(img: Image.Image) -> Image.Image:
    v = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(v)
    d.ellipse((-W * 0.1, -H * 0.15, W * 1.1, H * 1.15), fill=255)
    v = v.filter(ImageFilter.GaussianBlur(80))
    dark = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dark.putalpha(ImageChops.invert(v).point(lambda x: int(x * 0.42)))
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
        sd.rounded_rectangle((20, 20, p.width + 8, p.height + 8), radius=6, fill=(0, 0, 0, 100))
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        base.alpha_composite(sh, (cx - p.width // 2 - 6, cy - p.height // 2 + 10))
    base.alpha_composite(p, (cx - p.width // 2, cy - p.height // 2))


def brand_watermark(img: Image.Image) -> None:
    d = ImageDraw.Draw(img)
    d.text((W // 2, H - 28), "✦  ASTROPRECISE  ·  VSOP87  ·  YOUR DELIVERABLE", font=font(11), fill=(*MUTED, 180), anchor="mm")


def finish(img: Image.Image) -> Image.Image:
    img = vignette(img)
    return img.convert("RGB").filter(ImageFilter.UnsharpMask(1.1, 120, 2))


def save(img: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / name
    img.save(p, "JPEG", quality=Q, subsampling=0, optimize=True)
    print(p)
    return p


def mock_deep_reading() -> Image.Image:
    cover = screenshot_html(AUDIT / "reading-jane-example.html", 794, 1123, "rd-cover")
    img = scene_base((55, 45, 75))
    paste_deliverable(img, cover, W // 2 - 100, H // 2 - 10, 0.42, -5)
    inner = cover.crop((0, int(cover.height * 0.55), cover.width, cover.height))
    paste_deliverable(img, inner, W // 2 + 200, H // 2 + 20, 0.38, 4)
    brand_watermark(img)
    return finish(img)


def mock_poster_pdf() -> Image.Image:
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster")
    img = scene_base((45, 38, 32))
    d = ImageDraw.Draw(img)
    d.polygon([(80, H - 60), (W - 60, H - 100), (W - 30, H - 10), (110, H - 10)], fill=(18, 14, 10, 255))
    paste_deliverable(img, poster, W // 2, H // 2 - 30, 0.36, -2)
    brand_watermark(img)
    return finish(img)


def mock_bundle() -> Image.Image:
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster-b")
    reading = screenshot_html(AUDIT / "reading-jane-example.html", 794, 1123, "rd-b")
    img = scene_base((50, 40, 30))
    paste_deliverable(img, poster, W // 2 - 220, H // 2 - 20, 0.30, -7)
    paste_deliverable(img, reading, W // 2 + 210, H // 2 - 10, 0.34, 5)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((W // 2 - 110, 36, W // 2 + 110, 72), radius=18, fill=(*OXBLOOD, 230), outline=GOLD, width=2)
    d.text((W // 2, 54), "Reading + Poster · one chart", font=font(17, True), fill=GOLD_LT, anchor="mm")
    brand_watermark(img)
    return finish(img)


def mock_two_skies() -> Image.Image:
    sheet = screenshot_html(AUDIT / "twoskies-aurora-orion.html", 900, 1270, "twoskies", timeout=120)
    img = scene_base((70, 35, 40))
    paste_deliverable(img, sheet, W // 2, H // 2 - 20, 0.48, 0)
    brand_watermark(img)
    return finish(img)


def mock_gift_reading() -> Image.Image:
    voucher_path = AUDIT / "voucher-gift-reading-jane.html"
    if not voucher_path.exists():
        voucher_path.write_text((AUDIT / "voucher-recipient.html").read_text(encoding="utf-8")
            .replace("The Whole Sky — Gift Box", "Deep Natal Reading")
            .replace("gift-box-whole-sky", "gift-reading")
            .replace("AP-TGIFT001", "AP-GIFT7K2M"), encoding="utf-8")
    card = screenshot_html(voucher_path, 794, 1123, "gift-rd")
    img = scene_base((65, 40, 55))
    paste_deliverable(img, card, W // 2, H // 2 - 20, 0.50, -3)
    brand_watermark(img)
    return finish(img)


def mock_gift_box() -> Image.Image:
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster-gb")
    voucher = screenshot_html(AUDIT / "voucher-recipient.html", 794, 1123, "voucher-gb")
    img = scene_base((45, 30, 40))
    d = ImageDraw.Draw(img)
    bx, by, bw, bh = W // 2 - 240, H // 2 - 80, 480, 300
    d.polygon([(bx, by + 60), (bx + bw, by + 60), (bx + bw, by + bh), (bx, by + bh)], fill=(42, 30, 22, 255))
    d.polygon([(bx, by + 60), (W // 2, by - 10), (bx + bw, by + 60), (W // 2, by + 110)], fill=(58, 40, 28, 255))
    d.rectangle((W // 2 - 16, by - 10, W // 2 + 16, by + bh), fill=(*OXBLOOD, 245))
    paste_deliverable(img, poster, W // 2 - 100, by + 150, 0.18, 6)
    paste_deliverable(img, voucher, W // 2 + 130, by + 130, 0.22, -4)
    brand_watermark(img)
    return finish(img)


def mock_natal_poster() -> Image.Image:
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "poster-phys")
    img = scene_base((30, 28, 35))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, W, H - 80), fill=(12, 10, 14, 255))
    frame = Image.new("RGBA", (poster.width // 3 + 60, poster.height // 3 + 80), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rectangle((0, 0, frame.width - 1, frame.height - 1), fill=(32, 26, 18, 255), outline=GOLD, width=8)
    inner = poster.resize((poster.width // 3, poster.height // 3), Image.Resampling.LANCZOS)
    frame.alpha_composite(inner, (30, 40))
    paste_deliverable(img, frame, W // 2, H // 2 - 50, 1.0, 0)
    brand_watermark(img)
    return finish(img)


def mock_big_three() -> Image.Image:
    sheet = screenshot_html(AUDIT / "big-three-jane-example.html", 559, 794, "b3")
    img = scene_base((50, 42, 60))
    paste_deliverable(img, sheet, W // 2, H // 2 - 20, 0.72, 2)
    brand_watermark(img)
    return finish(img)


def _poster_art_thumb() -> Image.Image:
    poster = screenshot_html(AUDIT / "poster-jane-example.html", 900, 1270, "art-thumb")
    return poster.resize((420, 560), Image.Resampling.LANCZOS)


def mock_sky_tee() -> Image.Image:
    art = _poster_art_thumb()
    img = scene_base((35, 34, 42))
    d = ImageDraw.Draw(img)
    pts = [(W // 2 - 240, H // 2 - 30), (W // 2 - 170, H // 2 - 210), (W // 2 + 170, H // 2 - 210),
           (W // 2 + 240, H // 2 - 30), (W // 2 + 260, H // 2 + 190), (W // 2 - 260, H // 2 + 190)]
    d.polygon(pts, fill=(24, 22, 26, 255), outline=(*GOLD, 70))
    art_f = art.filter(ImageFilter.GaussianBlur(0.5))
    art_mask = Image.new("L", art_f.size, 0)
    md = ImageDraw.Draw(art_mask)
    md.ellipse((20, 20, art_f.width - 20, art_f.height - 20), fill=255)
    art_f.putalpha(art_mask)
    tee_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    tee_layer.paste(art_f.resize((280, 200), Image.Resampling.LANCZOS), (W // 2 - 140, H // 2 - 120))
    img.alpha_composite(tee_layer)
    for g, ox in (("☉", -55), ("☽", 0), ("↑", 55)):
        d.text((W // 2 + ox, H // 2 + 70), g, font=font(24), fill=GOLD_HI, anchor="mt")
    brand_watermark(img)
    return finish(img)


def mock_sky_hoodie() -> Image.Image:
    art = _poster_art_thumb().resize((360, 240), Image.Resampling.LANCZOS)
    img = scene_base((28, 28, 38))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((W // 2 - 270, H // 2 - 230, W // 2 + 270, H // 2 + 150), radius=28,
                        fill=(18, 18, 24, 255), outline=(*GOLD, 55), width=2)
    d.polygon([(W // 2 - 90, H // 2 - 230), (W // 2, H // 2 - 160), (W // 2 + 90, H // 2 - 230)],
              fill=(14, 14, 18, 255))
    img.paste(art, (W // 2 - art.width // 2, H // 2 - 80), art)
    d.text((W // 2 - 210, H // 2 + 110), "☉  ☽  ↑", font=font(18), fill=GOLD_HI)
    brand_watermark(img)
    return finish(img)


def mock_mug() -> Image.Image:
    art = _poster_art_thumb().resize((300, 120), Image.Resampling.LANCZOS)
    img = scene_base((38, 32, 28))
    d = ImageDraw.Draw(img)
    d.ellipse((W // 2 - 300, H // 2 + 50, W // 2 + 300, H // 2 + 110), fill=(16, 12, 10, 255))
    mx, my = W // 2 - 40, H // 2 - 130
    d.rounded_rectangle((mx - 110, my, mx + 90, my + 180), radius=14, fill=(42, 40, 38, 255), outline=GOLD, width=2)
    d.arc((mx + 70, my + 45, mx + 165, my + 135), 270, 90, fill=GOLD, width=6)
    mug = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mug.paste(art, (mx - 95, my + 35))
    img.alpha_composite(mug)
    d.text((mx - 10, my - 22), "☉", font=font(22), fill=GOLD_HI, anchor="mt")
    brand_watermark(img)
    return finish(img)


def mock_year_ahead() -> Image.Image:
    report = screenshot_html(AUDIT / "year-ahead-jane-example.html", 794, 1123, "ya")
    img = scene_base((42, 50, 72))
    paste_deliverable(img, report, W // 2, H // 2 - 20, 0.44, -2)
    brand_watermark(img)
    return finish(img)


def mock_solar_return() -> Image.Image:
    report = screenshot_html(AUDIT / "solar-return-jane-example.html", 794, 1123, "sr")
    img = scene_base((60, 48, 30))
    paste_deliverable(img, report, W // 2, H // 2 - 20, 0.44, 3)
    brand_watermark(img)
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
        f'<figcaption>{fname.replace("product-", "").replace(".jpg", "").replace("-", " ").title()}</figcaption></figure>'
        for fname, _ in paths
    )
    GALLERY.write_text(f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>AstroPrecise — Premium product mockups</title>
<style>
  body {{ margin:0; background:#050406; color:#efe3c0; font-family:Georgia,serif; padding:24px; }}
  h1 {{ color:#c9a227; font-weight:normal; letter-spacing:.08em; }}
  p {{ color:#a89e88; max-width:720px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(480px,1fr)); gap:28px; margin-top:24px; }}
  figure {{ margin:0; background:#0d0a08; border:1px solid rgba(201,162,39,.25); border-radius:8px; overflow:hidden; }}
  img {{ width:100%; display:block; }}
  figcaption {{ padding:12px 16px; font-size:14px; letter-spacing:.06em; text-transform:uppercase; color:#c9a227; }}
</style></head><body>
<h1>Premium product mockups — fulfilment HTML screenshots</h1>
<p>Real Jane Example deliverables composited for Lemon Squeezy checkout media.</p>
<div class="grid">
{items}
</div></body></html>""", encoding="utf-8")
    print(GALLERY)


def main() -> None:
    saved = []
    for fname, fn in PRODUCTS:
        saved.append((fname, save(fn(), fname)))
    write_gallery(saved)
    print(f"Generated {len(saved)} premium mockups → {OUT}")


if __name__ == "__main__":
    main()