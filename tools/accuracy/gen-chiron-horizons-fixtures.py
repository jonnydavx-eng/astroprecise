#!/usr/bin/env python3
"""Accuracy fixtures for Chiron straight from NASA/JPL Horizons.

For 80 seeded UT moments from 1850 to 2149, plus 46 'edges' moments (20 seeded
in each of 1800-1849 and 2150-2200 and six fixed table/fallback boundaries), ask Horizons (target 2060 Chiron,
geocentric, airless) for quantity 31: the observer ecliptic-of-date longitude
of the apparent position. The moments half a day either side give the
retrograde flag. Writes test-chiron-horizons.fixtures.json. Standard library only.
"""
import json, os, random, urllib.parse, urllib.request, datetime, re
REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))

API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
def jd_ut(y, m, d, hh, mm):
    if m <= 2: y, m = y - 1, m + 12
    a = y // 100; b = 2 - a + a // 4
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5 + (hh + mm / 60) / 24

rnd = random.Random(20261022)
moments = []
for k in range(80):
    y = 1850 + (k * 300) // 80 + rnd.randrange(0, 3)
    moments.append([y, rnd.randint(1, 12), rnd.randint(1, 28), rnd.randint(0, 23), rnd.randint(0, 59)])

rnd_e = random.Random(20261023)
edges = [[1800, 1, 1, 0, 0], [1850, 1, 1, 0, 0], [1850, 7, 1, 12, 0],
         [2149, 7, 1, 12, 0], [2150, 1, 1, 0, 0], [2200, 12, 31, 23, 0]]
for lo in (1800, 2150):
    for k in range(20):
        y = lo + (k * 50) // 20 + rnd_e.randrange(0, 2)
        edges.append([min(y, 2200), rnd_e.randint(1, 12), rnd_e.randint(1, 28), rnd_e.randint(0, 23), rnd_e.randint(0, 59)])
edges.sort()  # Horizons returns a TLIST in time order, so ask in time order

def q31(jds):
    q = {'format': 'text', 'COMMAND': "'2060;'", 'OBJ_DATA': "'YES'", 'MAKE_EPHEM': "'YES'",
         'EPHEM_TYPE': "'OBSERVER'", 'CENTER': "'500@399'", 'QUANTITIES': "'31'",
         'EXTRA_PREC': "'YES'", 'CSV_FORMAT': "'YES'", 'TIME_TYPE': "'UT'", 'TLIST_TYPE': "'JD'",
         'CAL_FORMAT': "'JD'", 'TLIST': ' '.join(f"'{j:.6f}'" for j in jds)}
    t = urllib.request.urlopen(API + '?' + urllib.parse.urlencode(q, safe="'@"), timeout=180).read().decode()
    out = []
    for line in t.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines():
        f = [x.strip() for x in line.split(',')]
        out.append(float(f[-3]))
    assert len(out) == len(jds), (len(out), len(jds))
    assert jds == sorted(jds), 'TLIST must be in time order (Horizons sorts its output)'
    return out, t

soln = None
def fetch_rows(ms):
    global soln
    rows = []
    for i in range(0, len(ms), 20):
        chunk = ms[i:i + 20]
        jds = []
        for m in chunk:
            j = jd_ut(*m); jds += [j - 0.5, j, j + 0.5]
        lons, text = q31(jds)
        soln = soln or (re.search(r'Soln\.\s*date:\s*(\S+)', text).group(1), re.search(r'\{source: (JPL#\d+)\}', text).group(1))
        for n, m in enumerate(chunk):
            b, c, a = lons[3 * n:3 * n + 3]
            speed = ((a - b + 540) % 360) - 180
            rows.append({'ut': m, 'chiron': round(c, 6), 'chironRetro': speed < 0, 'speed': round(speed, 5)})
    return rows
rows = fetch_rows(moments)
edge_rows = fetch_rows(edges)
json.dump({'source': 'NASA/JPL Horizons API, quantity 31 (geocentric apparent ecliptic-of-date longitude), airless',
           'solution': soln[1], 'solution_date': soln[0],
           'fetched_utc': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
           'generator': 'tools/accuracy/gen-chiron-horizons-fixtures.py', 'moments': rows, 'edges': edge_rows},
          open(os.path.join(REPO, 'test-chiron-horizons.fixtures.json'), 'w'), indent=1)
print(len(rows), len(edge_rows), soln)
