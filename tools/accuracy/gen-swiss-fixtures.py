"""Regenerate test-accuracy-20charts.fixtures.json with pyswisseph (Moshier).
pip install pyswisseph; python3 tools/accuracy/gen-swiss-fixtures.py
Reference: apparent geocentric tropical longitude of date; ASC/MC via swe.houses."""
import json, swisseph as swe
F = 'test-accuracy-20charts.fixtures.json'
ids = dict(sun=0, moon=1, mercury=2, venus=3, mars=4, jupiter=5, saturn=6, uranus=7, neptune=8, pluto=9)
rows = json.load(open(F))
for r in rows:
    y, m, d, hh, mm = r['ut']
    jd = swe.julday(y, m, d, hh + mm / 60)
    r['ref'] = {k: round(swe.calc_ut(jd, i, swe.FLG_MOSEPH)[0][0], 5) for k, i in ids.items()}
    _, am = swe.houses(jd, r['lat'], r['lon'], b'O')
    r['ref']['asc'], r['ref']['mc'] = round(am[0], 5), round(am[1], 5)
    r['placidus'] = [round(x, 5) for x in swe.houses(jd, r['lat'], r['lon'], b'P')[0]] if abs(r['lat']) < 66 else None
json.dump(rows, open(F, 'w'), indent=1)
