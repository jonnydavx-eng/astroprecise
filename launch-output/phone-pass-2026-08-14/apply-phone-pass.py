from pathlib import Path

root = Path(r"C:\Users\jonny\OneDrive\astroprecise\website")
link = '<link rel="stylesheet" href="css/ap-phone-pass.css?v=860">'

p = root / "tonight.html"
t = p.read_text(encoding="utf-8")
old = '  <script src="js/void-orrery-adapter.js?v=858" defer></script>'
new = old + '\n  <script src="js/ap-nav-model.js?v=858" defer></script>'
if "js/ap-nav-model.js" not in t:
    if old not in t:
        raise SystemExit("tonight adapter marker missing")
    t = t.replace(old, new, 1)
    print("tonight: added nav-model")
else:
    print("tonight: nav-model already present")

oldc = "body:has(.tn-hero) .site-header{min-height:var(--nav-height,72px);contain:layout style;}"
newc = "body:has(.tn-hero) .site-header{min-height:var(--nav-height,72px);contain:none;overflow:visible;}"
if oldc in t:
    t = t.replace(oldc, newc, 1)
    print("tonight: contain none")
else:
    print("tonight: contain marker missing")

if "ap-phone-pass.css" not in t:
    marker = '<link rel="stylesheet" href="css/ap-living-sky-v834.css?v=858" />'
    if marker not in t:
        raise SystemExit("tonight living-sky marker missing")
    t = t.replace(marker, marker + "\n  " + link, 1)
    print("tonight: phone css")
p.write_text(t, encoding="utf-8")

pages = {
    "index.html": '<link rel="stylesheet" href="css/ap-living-sky-v834.css?v=858">',
    "compatibility.html": '<link rel="stylesheet" href="css/ap-living-sky-v834.css?v=858">',
    "shop.html": '<link rel="stylesheet" href="css/ap-living-sky-v834.css?v=858">',
    "eclipse.html": '<link rel="stylesheet" href="css/ap-living-sky-v834.css?v=858">',
    "chart.html": '<link rel="stylesheet" href="css/ap-living-sky-v834.css?v=838" />',
}
for name, marker in pages.items():
    fp = root / name
    txt = fp.read_text(encoding="utf-8")
    if "ap-phone-pass.css" in txt:
        print(name, "already has phone css")
        continue
    if marker not in txt:
        raise SystemExit(f"{name} marker missing")
    txt = txt.replace(marker, marker + "\n    " + link, 1)
    fp.write_text(txt, encoding="utf-8")
    print(name, "phone css")

sw = root / "sw.js"
s = sw.read_text(encoding="utf-8")
if 'const V = "ap-v859"' in s:
    s = s.replace('const V = "ap-v859"', 'const V = "ap-v860"', 1)
    sw.write_text(s, encoding="utf-8")
    print("sw: 859 -> 860")
else:
    print("sw V marker unexpected")
    for line in s.splitlines():
        if line.startswith("const V"):
            print(line)
