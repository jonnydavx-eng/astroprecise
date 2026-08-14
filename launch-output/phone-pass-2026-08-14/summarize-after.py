from pathlib import Path
import json
p = Path(r"C:\Users\jonny\OneDrive\astroprecise\launch-output\phone-pass-2026-08-14\measure-after.json")
data = json.loads(p.read_text(encoding="utf-8"))
for d in data:
    print("=" * 60)
    print(d.get("id"), "status", d.get("status"), "h1", d.get("h1Font"), repr(d.get("h1Text")))
    print("  wordmark", repr(d.get("wordmarkText")), "lines", d.get("wordmarkLines"), "w", d.get("wordmarkW"))
    print("  scrollW", d.get("scrollW"), "clientW", d.get("clientW"), "pFont", d.get("pFont"), repr(d.get("pText")))
    print("  orrEngine", d.get("orrEngine"), "orrReady", d.get("orrReady"), "canvas", d.get("canvas"))
    print("  tapsUnder44", len(d.get("tapsUnder44") or []), "smallest", d.get("smallestTap"))
    print("  overflowers", d.get("overflowers"))
    print("  inputOverflow", d.get("inputOverflow"))
    print("  bluePrimaries", d.get("bluePrimaries"))
    stages = d.get("stages") or []
    tall = [s for s in stages if (s.get("h") or 0) >= 300]
    print("  stages>=300", [(s.get("sel"), s.get("h")) for s in tall[:6]], "n", len(stages))
    print("  errors", d.get("errors"))
    print("  drawer", {k: (d.get("drawer") or {}).get(k) for k in ("expanded","openClass","display","minLinkH","visibleLinks","linkCount","error","missing")})
