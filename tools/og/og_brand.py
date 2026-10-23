"""Paper & Night drawing helpers for the OG cards (tools/make-og-cards.py).

Ported from the 2C brand pack (recommended/og/brandlib.py, themes.py and plate.py), trimmed to
direction A. Everything is drawn from code:
  * text is shaped with HarfBuzz and outlined from Instrument Serif and Inter with fontTools,
    using the repo's own static OFL instances in tools/print-fonts/ (no installed fonts needed);
  * sign and planet glyphs are our hand-drawn 24-unit SVG set (no Unicode symbols, no fonts);
  * the orrery uses real engine output for the fictional sample chart (og/engine-sample.json)
    and the repo's engine stills in website/img/engine/.
No AI imagery anywhere.
"""
import base64, functools, io, json, math, os, random

import cairosvg
import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PRINT_FONTS = os.path.join(ROOT, 'tools', 'print-fonts')
STILLS = os.path.join(ROOT, 'website', 'img', 'engine')

# Paper & Night palette (website/css/ap-tokens.css)
C = dict(paper='#F6F3EC', paper2='#EDE8DD', card='#FBF9F4', night='#0E1116', ink='#0E1116',
         graphite='#3A3F47', muted='#5C6168', rule='#D6D1C6', gold='#B4693E', goldink='#8A4A24',
         starlight='#F1E7CF')
SANS = 400        # body
SANS_TAG = 500    # small caps tag
SANS_BOLD = 600   # eyebrow


def _font_file(key, weight):
    if key == 'instrument':
        return os.path.join(PRINT_FONTS, 'instrument-serif-static-regular.ttf')
    if key == 'inter':
        w = 400 if weight <= 450 else 500 if weight <= 550 else 600
        return os.path.join(PRINT_FONTS, f'inter-static-{w}.ttf')
    raise KeyError(key)


@functools.lru_cache(None)
def _load(path):
    face = hb.Face(hb.Blob.from_file_path(path))
    return face, TTFont(path)


def text_path(key, text, size, x=0, y=0, anchor='start', tracking=0.0, weight=SANS, features=None):
    """Return (svg path d, width px). tracking in em."""
    face, tt = _load(_font_file(key, weight))
    font = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(font, buf, features or {'kern': True, 'liga': True})
    missing = [text[i.cluster] for i in buf.glyph_infos if i.codepoint == 0 and not text[i.cluster].isspace()]
    if missing:
        raise ValueError(f'{key} has no glyph for {missing!r} in {text!r}')
    gs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    scale = size / face.upem
    track = tracking * face.upem
    total = sum(p.x_advance + track for p in buf.glyph_positions) - (track if text else 0)
    w = total * scale
    ox = x - (w / 2 if anchor == 'middle' else w if anchor == 'end' else 0)
    pen = SVGPathPen(gs)
    cx = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        t = TransformPen(pen, (scale, 0, 0, -scale, ox + (cx + pos.x_offset) * scale, y - pos.y_offset * scale))
        gs[order[info.codepoint]].draw(t)
        cx += pos.x_advance + track
    return pen.getCommands(), w


def T(key, text, size, x, y, fill, anchor='start', tracking=0.0, weight=SANS):
    d, _ = text_path(key, text, size, x, y, anchor, tracking, weight)
    return f'<path d="{d}" fill="{fill}"/>'


def tw(key, text, size, tracking=0.0, weight=SANS):
    return text_path(key, text, size, 0, 0, 'start', tracking, weight)[1]


def wrap(key, text, size, maxw, weight=SANS):
    lines, cur = [], ''
    for word in text.split():
        t = (cur + ' ' + word).strip()
        if tw(key, t, size, weight=weight) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = word
    if cur:
        lines.append(cur)
    return lines


def svg2png(svg, out, w=None):
    cairosvg.svg2png(bytestring=svg.encode(), write_to=out, **({'output_width': w} if w else {}))


# ---------- drawn astro glyphs: 24x24 grid, stroked, round caps. Drawn by us; no unicode, no fonts. ----------
GLYPHS = {
 'aries':       '<path d="M12 21.2V9.2M12 9.2C12 5 9.6 3.2 7.2 3.4C4.4 3.6 3.4 6.6 4.4 8.6C5 9.8 6 10.2 6.8 10.2M12 9.2C12 5 14.4 3.2 16.8 3.4C19.6 3.6 20.6 6.6 19.6 8.6C19 9.8 18 10.2 17.2 10.2"/>',
 'taurus':      '<circle cx="12" cy="15.2" r="5.4"/><path d="M3.8 3.4C4.6 7.8 7.6 9.8 12 9.8S19.4 7.8 20.2 3.4"/>',
 'gemini':      '<path d="M4.6 3.8C9.4 5.4 14.6 5.4 19.4 3.8M4.6 20.2C9.4 18.6 14.6 18.6 19.4 20.2M9 5V19M15 5V19"/>',
 'cancer':      '<path d="M20.6 8.4C18 5.2 11.4 4.4 7.6 6.8"/><circle cx="7.4" cy="9.6" r="2.8"/><path d="M3.4 15.6C6 18.8 12.6 19.6 16.4 17.2"/><circle cx="16.6" cy="14.4" r="2.8"/>',
 'leo':         '<circle cx="6.8" cy="16.2" r="3"/><path d="M9.8 16.2C9.8 12.2 7.4 10 7.4 7.4A4.4 4.4 0 0 1 16.2 7.4C16.2 11.4 13.4 13.8 13.4 17.4C13.4 20.4 16.4 21.6 18.8 19.6"/>',
 'virgo':       '<path d="M3.4 6.6C4.8 6.6 5.6 7.4 5.6 9.2V18.4M5.6 9.4C5.6 6.2 10 6.2 10 9.4V18.4M10 9.4C10 6.2 14.4 6.2 14.4 9.4V16C14.4 18.6 15.6 20.6 17.8 21.2M14.4 13.6C16.4 11.6 20.2 11.6 20.4 14.6C20.6 17.6 17.4 19.4 14.4 18.2"/>',
 'libra':       '<path d="M3.6 19.6H20.4M3.6 15.4H8.4A4.4 4.4 0 1 1 15.6 15.4H20.4"/>',
 'scorpio':     '<path d="M3 6.6C4.4 6.6 5.2 7.4 5.2 9.2V17.6M5.2 9.4C5.2 6.2 9.4 6.2 9.4 9.4V17.6M9.4 9.4C9.4 6.2 13.6 6.2 13.6 9.4V16.4C13.6 18.2 14.8 19.4 16.6 19.4H20.6M18.2 16.8L20.8 19.4L18.2 22"/>',
 'sagittarius': '<path d="M4.6 19.4L19.4 4.6M12 4.6H19.4V12M7 11.4L12.6 17"/>',
 'capricorn':   '<path d="M2.8 5.4L6.8 17L10.2 6C11.2 3 14.8 3.4 14.8 6.6V15.8C14.8 19.6 20.6 19.6 20.6 16C20.6 12.8 16.8 12 14.8 14.4"/>',
 'aquarius':    '<path d="M3 10.2L6 7.6L9 10.2L12 7.6L15 10.2L18 7.6L21 10.2M3 16.4L6 13.8L9 16.4L12 13.8L15 16.4L18 13.8L21 16.4"/>',
 'pisces':      '<path d="M6 3.6C10.2 8.2 10.2 15.8 6 20.4M18 3.6C13.8 8.2 13.8 15.8 18 20.4M5.4 12H18.6"/>',
}
SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
SIGN_META = {
 'aries': ('Fire', 'Cardinal', 'Mars'), 'taurus': ('Earth', 'Fixed', 'Venus'), 'gemini': ('Air', 'Mutable', 'Mercury'),
 'cancer': ('Water', 'Cardinal', 'Moon'), 'leo': ('Fire', 'Fixed', 'Sun'), 'virgo': ('Earth', 'Mutable', 'Mercury'),
 'libra': ('Air', 'Cardinal', 'Venus'), 'scorpio': ('Water', 'Fixed', 'Mars · Pluto'), 'sagittarius': ('Fire', 'Mutable', 'Jupiter'),
 'capricorn': ('Earth', 'Cardinal', 'Saturn'), 'aquarius': ('Air', 'Fixed', 'Saturn · Uranus'), 'pisces': ('Water', 'Mutable', 'Jupiter · Neptune'),
}


def glyph(name, x, y, size, color, sw=1.5):
    """A drawn glyph (24-unit grid) at x,y (top-left), scaled to size px."""
    s = size / 24
    return (f'<g transform="translate({x:.2f},{y:.2f}) scale({s:.4f})" fill="none" stroke="{color}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{GLYPHS[name]}</g>')


@functools.lru_cache(None)
def still_uri(name, px=256):
    im = Image.open(os.path.join(STILLS, name + '.webp')).convert('RGBA').resize((px, px), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


# ---------- the Paper & Night mark and wordmark ----------
def star4(cx, cy, r, fill, waist=0.22):
    return f'<path d="{star_d(cx, cy, r, waist)}" fill="{fill}"/>'


def star_d(cx, cy, r, waist=0.22):
    w = r * waist
    return (f'M{cx:.2f},{cy-r:.2f} C{cx+w*0.35:.2f},{cy-w:.2f} {cx+w:.2f},{cy-w*0.35:.2f} {cx+r:.2f},{cy:.2f} '
            f'C{cx+w:.2f},{cy+w*0.35:.2f} {cx+w*0.35:.2f},{cy+w:.2f} {cx:.2f},{cy+r:.2f} '
            f'C{cx-w*0.35:.2f},{cy+w:.2f} {cx-w:.2f},{cy+w*0.35:.2f} {cx-r:.2f},{cy:.2f} '
            f'C{cx-w:.2f},{cy-w*0.35:.2f} {cx-w*0.35:.2f},{cy-w:.2f} {cx:.2f},{cy-r:.2f} Z')


def mark(cx, cy, S, ticks=True):
    """Half paper, half night disc with a copper four-point star; optional minute ticks."""
    r = S * 0.40
    out = [f'<path d="M{cx},{cy-r} A{r},{r} 0 0,0 {cx},{cy+r} Z" fill="{C["paper"]}"/>',
           f'<path d="M{cx},{cy-r} A{r},{r} 0 0,1 {cx},{cy+r} Z" fill="{C["night"]}"/>',
           f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{C["night"]}" stroke-width="{S*0.018:.2f}"/>',
           star4(cx + r * 0.42, cy - r * 0.26, r * 0.30, C['gold'])]
    if ticks:
        for i in range(60):
            a = math.radians(i * 6 - 90)
            r0, r1 = S * 0.455, S * (0.49 if i % 5 == 0 else 0.475)
            col, wdt = C['night'], S * 0.007
            if i == 0:
                r0, r1, col, wdt = S * 0.44, S * 0.50, C['gold'], S * 0.014
            out.append(f'<line x1="{cx+r0*math.cos(a):.2f}" y1="{cy+r0*math.sin(a):.2f}" x2="{cx+r1*math.cos(a):.2f}" y2="{cy+r1*math.sin(a):.2f}" stroke="{col}" stroke-width="{wdt:.2f}" stroke-linecap="round"/>')
    return ''.join(out)


def wordmark(x, y, size, color, anchor='start'):
    return T('instrument', 'AstroPrecise', size, x, y, color, anchor, tracking=-0.012)


# ---------- the Minute Plate orrery for the fictional sample chart ----------
ENG = json.load(open(os.path.join(HERE, 'engine-sample.json'), encoding='utf-8'))


def orrery(cx, cy, R, seed=7):
    sky, ink = C['night'], C['paper']
    out = [f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="{sky}"/>']
    rnd = random.Random(seed)
    for _ in range(int(R * 0.9)):
        a = rnd.random() * math.tau; rr = R * math.sqrt(rnd.random()) * 0.97
        out.append(f'<circle cx="{cx+rr*math.cos(a):.1f}" cy="{cy+rr*math.sin(a):.1f}" r="{rnd.random()*R*0.0022+R*0.0006:.2f}" fill="{C["starlight"]}" opacity="{rnd.random()*0.55+0.15:.2f}"/>')
    H = ENG['helio']; Le = H['earth']['lonDeg']
    order = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']
    axis = {'mercury': .387, 'venus': .723, 'earth': 1, 'mars': 1.524, 'jupiter': 5.20, 'saturn': 9.58, 'uranus': 19.2, 'neptune': 30.1}
    amax = math.log(1 + 30.1 * 1.6)
    rad = lambda a: R * 0.12 + R * 0.72 * (math.log(1 + a * 1.6) / amax)
    phi = lambda L: math.radians(L - Le - 90)
    P = lambda L, r: (cx + r * math.cos(phi(L)), cy - r * math.sin(phi(L)))
    rz = R * 0.905
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{R*0.86}" fill="none" stroke="{ink}" stroke-opacity=".22" stroke-width="{R*0.002:.2f}"/>')
    for i in range(12):
        x1, y1 = P(i * 30, R * 0.86); x2, y2 = P(i * 30, R * 0.95)
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{ink}" stroke-opacity=".28" stroke-width="{R*0.002:.2f}"/>')
        gx, gy = P(i * 30 + 15, rz); gs = R * 0.05
        out.append(f'<g opacity=".72">{glyph(SIGNS[i], gx-gs/2, gy-gs/2, gs, ink, 1.3)}</g>')
    for k in range(360):
        if k % 30 == 0:
            continue
        x1, y1 = P(k, R * 0.86); x2, y2 = P(k, R * (0.872 if k % 5 else 0.882))
        out.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{ink}" stroke-opacity=".22" stroke-width="{R*0.0015:.2f}"/>')
    sizes = {'mercury': .030, 'venus': .040, 'earth': .062, 'mars': .034, 'jupiter': .072, 'saturn': .090, 'uranus': .046, 'neptune': .046}
    for b in order:
        r = rad(axis[b])
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r:.1f}" fill="none" stroke="{ink}" stroke-opacity="{.5 if b=="earth" else .2}" stroke-width="{R*(0.0028 if b=="earth" else 0.0018):.2f}"/>')
    sr = R * 0.075
    out.append(f'<image href="{still_uri("sun", 384)}" x="{cx-sr:.1f}" y="{cy-sr:.1f}" width="{2*sr:.1f}" height="{2*sr:.1f}"/>')
    for b in order:
        x, y = P(H[b]['lonDeg'], rad(axis[b])); s = R * sizes[b]
        out.append(f'<image href="{still_uri(b, 256)}" x="{x-s:.1f}" y="{y-s:.1f}" width="{2*s:.1f}" height="{2*s:.1f}"/>')
        if b == 'earth':
            lm = ENG['pos']['moon']['lon']; mr = s * 2.0
            mx, my = x + mr * math.cos(phi(lm)), y - mr * math.sin(phi(lm))
            ms = R * 0.018
            out.append(f'<image href="{still_uri("moon", 128)}" x="{mx-ms:.1f}" y="{my-ms:.1f}" width="{2*ms:.1f}" height="{2*ms:.1f}"/>')
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{s*1.45:.1f}" fill="none" stroke="{C["gold"]}" stroke-width="{R*0.003:.2f}"/>')
    ex, ey = P(Le, rad(1)); tx, ty = P(Le + 180, R * 0.86)
    out.append(f'<line x1="{ex:.1f}" y1="{ey-R*0.07:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" stroke="{C["gold"]}" stroke-opacity=".55" stroke-dasharray="{R*0.006:.1f} {R*0.012:.1f}" stroke-width="{R*0.0025:.2f}"/>')
    return ''.join(out)
