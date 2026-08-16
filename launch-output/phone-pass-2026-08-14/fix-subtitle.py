from pathlib import Path
p = Path(r"C:\Users\jonny\OneDrive\astroprecise\website\css\ap-phone-pass.css")
t = p.read_text(encoding="utf-8")
old = "  .chart-hero__subtitle,"
new = "  html body.page-chart .chart-hero__subtitle,"
if old not in t:
    raise SystemExit("selector not found")
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("updated chart subtitle specificity")
