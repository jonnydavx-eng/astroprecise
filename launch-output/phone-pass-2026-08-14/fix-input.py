from pathlib import Path
p = Path(r"C:\Users\jonny\OneDrive\astroprecise\website\css\ap-phone-pass.css")
t = p.read_text(encoding="utf-8")
old = "input:not([type=\\'hidden\\']):not([type=\\'checkbox\\']):not([type=\\'radio\\']):not([type=\\'range\\'])"
new = "input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range'])"
if old not in t:
    print("OLD NOT FOUND")
    for i, line in enumerate(t.splitlines(), 1):
        if "input:not" in line:
            print(i, repr(line))
else:
    p.write_text(t.replace(old, new), encoding="utf-8")
    print("fixed")
