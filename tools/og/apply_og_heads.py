#!/usr/bin/env python3
"""Point each page head at its card in website/img/og/manifest.json (og:image, twitter:image, size, alt).

Run after tools/make-og-cards.py: python3 tools/og/apply_og_heads.py. Idempotent; adds missing tags next to og:image,
og:url, og:description or the meta description, in the head's own style. Sign pages also come from
website/tools/generate-sign-pages.mjs, which writes the same tags."""
import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import json, re, html, sys
sys.path.insert(0, 'tools/og')
import importlib.util
spec = importlib.util.spec_from_file_location('m', 'tools/make-og-cards.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
BASE = 'https://astroprecise.app/'
man = json.load(open('website/img/og/manifest.json'))
report = []
for e in man:
    path = 'website/' + e['page']; name = e['page'][:-5]
    s = open(path, encoding='utf-8').read(); orig = s
    url = BASE + e['og']
    title = name.capitalize() if name in m.SIGNS else e['title']
    eb = 'Sun sign guide' if name in m.SIGNS else m.EYEBROW.get(name, 'AstroPrecise')
    lead = title if title.lower().startswith(eb.lower()) else f'{eb}: {title}'
    alt = html.escape(f'{lead}. AstroPrecise card, lettered in Instrument Serif and Inter on paper.', quote=True)
    close = ' />' if re.search(r'<meta [^>]*/>', s[:s.find('</head>')]) else '>'
    had = bool(re.search(r'property="og:image"', s))
    s = re.sub(r'(<meta property="og:image" content=")[^"]*(")', lambda g: g.group(1) + url + g.group(2), s)
    s = re.sub(r'(<meta name="twitter:image" content=")[^"]*(")', lambda g: g.group(1) + url + g.group(2), s)
    if re.search(r'property="og:image:alt"', s):
        s = re.sub(r'(<meta property="og:image:alt" content=")[^"]*(")', lambda g: g.group(1) + alt + g.group(2), s)
    def tag(attr, key, val): return f'<meta {attr}="{key}" content="{val}"{close}'
    add = []
    if not had: add.append(tag('property', 'og:image', url))
    for k, v in (('og:image:width', '1200'), ('og:image:height', '630'), ('og:image:alt', alt)):
        if f'property="{k}"' not in s: add.append(tag('property', k, v))
    if 'name="twitter:card"' not in s: add.append(tag('name', 'twitter:card', 'summary_large_image'))
    if 'name="twitter:image"' not in s: add.append(tag('name', 'twitter:image', url))
    if add:
        mo = re.search(r'<meta property="og:image" content="[^"]*"[^>]*>', s)
        anchor = mo or re.search(r'<meta property="og:url"[^>]*>', s) or re.search(r'<meta property="og:description"[^>]*>', s) or re.search(r'<meta name="description"[^>]*>', s)
        if mo: add = [a for a in add if 'og:image"' not in a]
        line_start = s.rfind('\n', 0, anchor.start()) + 1
        indent = re.match(r'[ \t]*', s[line_start:]).group(0)
        if s[line_start:anchor.start()].strip():  # tag not at line start (minified head)
            ins = ''.join(add)
        else:
            ins = ''.join('\n' + indent + a for a in add)
        s = s[:anchor.end()] + ins + s[anchor.end():]
    if s != orig:
        open(path, 'w', encoding='utf-8').write(s)
    report.append((name, had, len(add)))
for r in report: print(*r)
