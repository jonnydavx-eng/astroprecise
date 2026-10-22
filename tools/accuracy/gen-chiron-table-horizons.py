#!/usr/bin/env python3
"""Regenerate CHIRON_TAB in website/js/ephemeris.js from NASA/JPL Horizons.

Source: JPL Horizons API (https://ssd.jpl.nasa.gov/api/horizons.api), target
2060 Chiron, geometric heliocentric state vectors (CENTER=500@10), ecliptic and
mean equinox of J2000, TDB. Each row is precessed to the mean ecliptic and
equinox of date (Meeus, Astronomical Algorithms, eq. 21.5 with J2000 start
epoch). Standard library only, no Swiss Ephemeris data involved.

Writes the CHIRON_TAB string and its comment date straight into website/js/ephemeris.js,
and the provenance to tools/accuracy/chiron-horizons-source.json. Then run
`npm --prefix ephemeris-package run sync` and `node test-chiron-horizons.mjs`.
Rows are "lon*1e4,lat*1e4,r*1e5" joined by ';'.
"""
import json, math, os, re, sys, urllib.parse, urllib.request, datetime
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))

J0, STEP = 2396758.5, 200                      # 1850-01-01 TDB, 200-day step
N = int((2506331.5 - J0) / STEP) + 2           # through 2150-01-01 (+1 spare row)
API = 'https://ssd.jpl.nasa.gov/api/horizons.api'

def fetch(start, stop):
    q = {'format': 'text', 'COMMAND': "'2060;'", 'OBJ_DATA': "'YES'", 'MAKE_EPHEM': "'YES'",
         'EPHEM_TYPE': "'VECTORS'", 'CENTER': "'500@10'", 'REF_PLANE': "'ECLIPTIC'",
         'REF_SYSTEM': "'ICRF'", 'VEC_TABLE': "'2'", 'VEC_CORR': "'NONE'", 'OUT_UNITS': "'AU-D'",
         'CSV_FORMAT': "'YES'", 'VEC_LABELS': "'NO'",
         'START_TIME': f"'JD{start}'", 'STOP_TIME': f"'JD{stop}'", 'STEP_SIZE': f"'{STEP} d'"}
    url = API + '?' + urllib.parse.urlencode(q, safe="'@")
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read().decode()

def nutation_lon(jd):
    """Nutation in longitude, degrees (Meeus ch. 22 short series, ~0.5 arcsec)."""
    T = (jd - 2451545.0) / 36525.0
    om = math.radians(125.04452 - 1934.136261 * T)
    L = math.radians(280.4665 + 36000.7698 * T)
    Lm = math.radians(218.3165 + 481267.8813 * T)
    return (-17.20 * math.sin(om) - 1.32 * math.sin(2 * L) - 0.23 * math.sin(2 * Lm) + 0.21 * math.sin(2 * om)) / 3600.0

def precess(lon, lat, jd):
    """Mean ecliptic of J2000 -> mean ecliptic and equinox of date (Meeus 21.5)."""
    t = (jd - 2451545.0) / 36525.0
    s = math.pi / 648000.0
    eta = (47.0029 * t - 0.03302 * t * t + 0.000060 * t ** 3) * s
    Pi = math.radians(174.876384) + (-869.8089 * t + 0.03536 * t * t) * s
    p = (5029.0966 * t + 1.11113 * t * t - 0.000006 * t ** 3) * s
    l, b = math.radians(lon), math.radians(lat)
    A = math.cos(eta) * math.cos(b) * math.sin(Pi - l) - math.sin(eta) * math.sin(b)
    B = math.cos(b) * math.cos(Pi - l)
    C = math.cos(eta) * math.sin(b) + math.sin(eta) * math.cos(b) * math.sin(Pi - l)
    return math.degrees(p + Pi - math.atan2(A, B)) % 360.0, math.degrees(math.asin(C))

text = fetch(J0, J0 + (N - 1) * STEP)
soln = re.search(r'Target body name: (.*?)\{source: ([^}]*)\}', text)
body = text.split('$$SOE')[1].split('$$EOE')[0]
rows = []
for line in body.strip().splitlines():
    f = [x.strip() for x in line.split(',')]
    jd, x, y, z = float(f[0]), float(f[2]), float(f[3]), float(f[4])
    vx, vy, vz = float(f[5]), float(f[6]), float(f[7])
    tau = math.sqrt(x * x + y * y + z * z) * 0.0057755183  # Sun-distance light time, days
    x, y, z = x - vx * tau, y - vy * tau, z - vz * tau
    lon = math.degrees(math.atan2(y, x)) % 360.0
    lat = math.degrees(math.atan2(z, math.hypot(x, y)))
    r = math.sqrt(x * x + y * y + z * z)
    lon, lat = precess(lon, lat, jd)
    lon = (lon + nutation_lon(jd)) % 360.0                   # true equinox of date
    rows.append((jd, lon, lat, r))
if len(rows) != N or abs(rows[0][0] - J0) > 1e-6:
    sys.exit(f'unexpected rows: {len(rows)} vs {N}')
vals = [f"{round(l * 1e4) % 3600000},{round(b * 1e4)},{round(r * 1e5)}" for _, l, b, r in rows]
meta = {'source': 'NASA/JPL Horizons API, https://ssd.jpl.nasa.gov/api/horizons.api',
        'target': soln.group(1).strip() if soln else '2060 Chiron',
        'solution': soln.group(2).strip() if soln else None,
        'solution_date': re.search(r'Soln\.\s*date:\s*(\S+)', text).group(1),
        'fetched_utc': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'frame': 'heliocentric, light time over the Sun distance, J2000 ecliptic precessed to the ecliptic of date (Meeus 21.5) plus nutation in longitude (Meeus 22)',
        't0_jd_tdb': J0, 'step_days': STEP, 'rows': N}
json.dump(meta, open(os.path.join(HERE, 'chiron-horizons-source.json'), 'w'), indent=1)
eph = os.path.join(REPO, 'website', 'js', 'ephemeris.js')
src = open(eph, encoding='utf-8').read()
src, n = re.subn(r"const CHIRON_TAB = '[^']*'", "const CHIRON_TAB = '" + ';'.join(vals) + "'", src)
src = re.sub(r'(NASA/JPL Horizons \(solution )[^,]*, fetched [0-9-]+', r'\g<1>' + str(meta['solution']) + ', fetched ' + meta['fetched_utc'][:10], src)
if n != 1: sys.exit('CHIRON_TAB not found in ephemeris.js')
open(eph, 'w', encoding='utf-8').write(src)
print(json.dumps(meta, indent=1))
