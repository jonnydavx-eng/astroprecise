from pathlib import Path
p = Path(r"C:\Users\jonny\OneDrive\astroprecise\website\css\ap-phone-pass.css")
t = p.read_text(encoding="utf-8")
t = t.replace("    font-size: 16px;\n    line-height: 1.5;", "    font-size: 16px !important;\n    line-height: 1.5;")
t = t.replace("    font-size: 16px;\n  }", "    font-size: 16px !important;\n  }")
p.write_text(t, encoding="utf-8")
print(p.read_text(encoding="utf-8"))
