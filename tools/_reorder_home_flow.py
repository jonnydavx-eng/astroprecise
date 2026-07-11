# one-shot: move instrumentsChapter after hero (before dailyChapter)
from pathlib import Path
import re

p = Path(__file__).resolve().parents[1] / "website" / "index.html"
c = p.read_text(encoding="utf-8")

pat = re.compile(
    r'<section class="department section-bleed ap-chapter ap-chapter--tier2" '
    r'id="instrumentsChapter".*?</section>',
    re.S,
)
m = pat.search(c)
if not m:
    raise SystemExit("instruments section not found")

inst = m.group(0) + "\n\n"
c2 = c[: m.start()] + c[m.end() :]

# Prefer comment block before daily if present
dm = re.search(
    r"(?:\n<!-- =+\s*\n\s*§[^\n]*\n\s*=+ -->\s*)?\n*<section[^>]+id=\"dailyChapter\"",
    c2,
)
if not dm:
    dm = re.search(r"<section[^>]+id=\"dailyChapter\"", c2)
if not dm:
    raise SystemExit("dailyChapter not found")

c3 = c2[: dm.start()] + "\n" + inst + c2[dm.start() :]
if 'data-ap-flow="secondary"' not in c3:
    c3 = c3.replace(
        'id="compareChapter"',
        'id="compareChapter" data-ap-flow="secondary"',
        1,
    )
    c3 = c3.replace(
        'id="methodChapter"',
        'id="methodChapter" data-ap-flow="secondary"',
        1,
    )

p.write_text(c3, encoding="utf-8")
ids = re.findall(r'<section[^>]+id="([^"]+)"', c3)
print("OK order:", ids)
