#!/usr/bin/env python3
"""Light OG cards (1200x630) for every public page, in the Paper & Night brand (2C step 9).

  python3 tools/make-og-cards.py [--only aries,shop] [--out website/img/og]

Replaces the dark navy sign cards (the old make-og-cards.py) and the WebGL banner capture
(make-og-banner.mjs). For each website/*.html page that is not excluded below it reads the
<title> and meta description (read-only), draws a card and writes website/img/og/og-<page>.jpg
plus website/img/og/manifest.json. The right-hand art is the drawn sign glyph on a zodiac ring
for sign pages, an engine still for sky pages, the Minute Plate orrery of the fictional sample
chart for product pages, and the mark otherwise. All lettering is outlined from Instrument
Serif and Inter (tools/print-fonts), so output does not depend on installed fonts. No AI imagery.

Needs: pip install uharfbuzz fonttools cairosvg pillow. Run from anywhere; paths are repo-relative.
test-og-cards.mjs checks the committed output (size, bytes, manifest, page heads) without Python.
"""
import argparse, glob, html, json, math, os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'og'))
from PIL import Image  # noqa: E402
from og_brand import (C, ROOT, SANS, SANS_BOLD, SIGN_META, SIGNS, T, glyph, mark, orrery,  # noqa: E402
                      still_uri, svg2png, tw, wordmark, wrap)

W, H = 1200, 630
EXCLUDE = re.compile(r'^(index-.*|auth-redirect|fulfil-redirect|outreach|profile|journey|catalogue|chart-view|mysky|moment|ephemeris|deep-time|cosmic-.*|synchronicity-card|quiz|angel-numbers|name-numerology|saturn-return|solar-return|synastry|digital-product-terms)$')
EYEBROW = {'index': 'Free birth chart', 'chart': 'Free birth chart', 'shop': 'The Studio', 'natal-plate': 'Archive',
           'sample-reading': 'Sample reading', 'deep-reading': 'Your story', 'horoscope': 'The sky this week', 'this-weeks-sky': 'The sky this week',
           'sky-events': 'Sky events', 'eclipse': 'Eclipses', 'moonphase': 'Moon phases', 'retrograde': 'Retrogrades', 'transits': 'Transits',
           'tonight': 'Tonight', 'observatory': 'The Observatory', 'guides': 'Guides', 'explore': 'Explore', 'compatibility': 'Two Skies',
           'what-is-my-rising-sign': 'Guide', 'why': 'How we calculate', 'accuracy': 'How we calculate', 'verify': 'Verify a plate',
           'privacy': 'Privacy', 'terms': 'Terms', 'refunds': 'Refunds', 'contact': 'Contact', 'offline': 'Offline', 'charts': 'Saved charts',
           'sky-card': 'Sky card', '404': 'Not found', 'lifepath': 'Life Path', 'numerology': 'Numerology', 'links': 'Link hub'}
# Card title when the page <title> does not read well on its own (it leads with the brand name).
TITLE = {'links': 'Observatory, Chart, Events, Shop'}
STILL = {'moonphase': 'moon', 'tonight': 'moon', 'eclipse': 'moon', 'retrograde': 'mercury', 'transits': 'saturn', 'sky-events': 'jupiter',
         'observatory': 'saturn', 'this-weeks-sky': 'venus', 'horoscope': 'venus'}
PLATE = {'index', 'chart', 'shop', 'natal-plate', 'sample-reading', 'deep-reading', 'compatibility', 'verify', 'sky-card', 'charts'}


def meta(path):
    t = open(path, encoding='utf-8', errors='ignore').read()
    title = re.search(r'<title>(.*?)</title>', t, re.S)
    desc = re.search(r'<meta\s+name=["\']description["\']\s+content=(["\'])(.*?)\1', t, re.S | re.I)
    clean = lambda s: html.unescape(re.sub(r'\s+', ' ', s or '')).strip()
    title = clean(title.group(1) if title else '')
    title = re.split(r'\s+[|·—–-]\s+(?:Astro ?Precise).*$', title, flags=re.I)[0] or title
    return title, clean(desc.group(2) if desc else '')


def art(page, x, y, size):
    if page in SIGNS:
        r = size / 2; cx, cy = x + r, y + r; i = SIGNS.index(page)
        o = [f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{C["card"]}" stroke="{C["rule"]}" stroke-width="2"/>']
        for k in range(12):
            a = math.radians(-90 - k * 30); on = k == i
            r0, r1 = (r - 22, r) if on else (r - 12, r - 2)
            o.append(f'<line x1="{cx+r0*math.cos(a):.1f}" y1="{cy+r0*math.sin(a):.1f}" x2="{cx+r1*math.cos(a):.1f}" y2="{cy+r1*math.sin(a):.1f}" stroke="{C["gold"] if on else C["graphite"]}" stroke-width="{3 if on else 1.4}" stroke-linecap="round"/>')
        o.append(glyph(page, cx - r * 0.5, cy - r * 0.5, r, C['ink'], 1.3))
        return ''.join(o)
    if page in PLATE:
        return f'<g transform="translate({x+size/2},{y+size/2}) scale({size/1000})">{orrery(0, 0, 500)}</g>'
    if page in STILL:
        return (f'<circle cx="{x+size/2}" cy="{y+size/2}" r="{size/2}" fill="{C["paper2"]}"/>'
                f'<image href="{still_uri(STILL[page], 512)}" x="{x+size*0.12}" y="{y+size*0.12}" width="{size*0.76}" height="{size*0.76}"/>')
    return mark(x + size / 2, y + size / 2, size * 0.9)


def card(page, title, desc):
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="{C["paper"]}"/>',
         f'<rect x="28" y="28" width="{W-56}" height="{H-56}" fill="none" stroke="{C["rule"]}" stroke-width="2"/>']
    eb = EYEBROW.get(page, 'AstroPrecise')
    if page in SIGNS:
        eb = 'Sun sign guide'; title = page.capitalize(); el, mo, ru = SIGN_META[page]
        desc = f'{el} · {mo} · ruled by {ru}. What the sign means in your chart, and how to find your Sun, Moon and rising.'
    o.append(T('inter', eb.upper(), 17, 84, 118, C['goldink'], tracking=0.2, weight=SANS_BOLD))
    size = 76
    lines = wrap('instrument', title, size, 640)
    while len(lines) > 3 and size > 50:
        size -= 6; lines = wrap('instrument', title, size, 640)
    y = 118 + size * 1.05
    for ln in lines[:3]:
        o.append(T('instrument', ln, size, 82, y, C['ink'], tracking=-0.015)); y += size
    if desc:
        y += 14
        room = max(0, min(3, int((H - 140 - y) // 32) + 1))
        allp = wrap('inter', desc, 22, 620); dl = allp[:room]
        if len(allp) > room and dl:
            words = dl[-1].split()
            while words and tw('inter', ' '.join(words) + '…', 22) > 600:
                words.pop()
            dl[-1] = ' '.join(words).rstrip(',;:—–') + '…'
        for ln in dl:
            o.append(T('inter', ln, 22, 84, y, C['graphite'], weight=SANS)); y += 32
    o.append(art(page, 790, 125, 330))
    o.append(f'<line x1="84" y1="{H-110}" x2="{W-84}" y2="{H-110}" stroke="{C["rule"]}" stroke-width="2"/>')
    o.append(mark(106, H - 66, 40, ticks=False))
    o.append(wordmark(138, H - 56, 30, C['ink']))
    o.append(T('inter', 'astroprecise.app', 18, W - 84, H - 60, C['muted'], 'end'))
    o.append('</svg>')
    return ''.join(o)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'website', 'img', 'og'))
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    only = set(filter(None, a.only.split(',')))
    man_path = os.path.join(a.out, 'manifest.json')
    pages = {p['page']: p for p in json.load(open(man_path, encoding='utf-8'))} if only and os.path.exists(man_path) else {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'website', '*.html'))):
        name = os.path.basename(p)[:-5]
        if EXCLUDE.match(name) or (only and name not in only):
            continue
        title, desc = meta(p)
        title = TITLE.get(name, title)
        if name == 'index' and not title:
            title = 'Your birth sky, to the minute'
        svg = card(name, title or name.replace('-', ' ').capitalize(), desc)
        png = os.path.join(a.out, f'og-{name}.png'); jpg = png[:-4] + '.jpg'
        svg2png(svg, png, w=W)
        Image.open(png).convert('RGB').save(jpg, 'JPEG', quality=86, optimize=True, progressive=True)
        os.remove(png)
        pages[name + '.html'] = dict(page=name + '.html', title=title, og=f'img/og/og-{name}.jpg', bytes=os.path.getsize(jpg))
    out = sorted(pages.values(), key=lambda d: d['page'])
    with open(man_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False); f.write('\n')
    print(f'{len(out)} cards ->', os.path.relpath(a.out, ROOT))


if __name__ == '__main__':
    main()
