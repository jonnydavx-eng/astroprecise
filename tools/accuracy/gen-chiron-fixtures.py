# Regenerate test-chiron-swiss.fixtures.json: 60 seeded moments 1900-2049,
# Swiss Ephemeris 2.10 (seas_18.se1) apparent geocentric Chiron, mean/true node
# and mean Lilith. SE_EPHE_PATH must point at the .se1 files.
import json, os, random, swisseph as swe
swe.set_ephe_path(os.environ.get('SE_EPHE_PATH', 'ephe'))
random.seed(20261018)
rows = []
for i in range(60):
    y, m, d, hh, mm = random.randint(1900, 2049), random.randint(1, 12), random.randint(1, 28), random.randint(0, 23), random.randint(0, 59)
    jd = swe.julday(y, m, d, hh + mm / 60)
    ch = swe.calc_ut(jd, swe.CHIRON, swe.FLG_SWIEPH | swe.FLG_SPEED)[0]
    rows.append(dict(ut=[y, m, d, hh, mm], chiron=round(ch[0], 5), chironRetro=ch[3] < 0,
                     meanNode=round(swe.calc_ut(jd, swe.MEAN_NODE, swe.FLG_SWIEPH)[0][0], 5),
                     trueNode=round(swe.calc_ut(jd, swe.TRUE_NODE, swe.FLG_SWIEPH)[0][0], 5),
                     lilith=round(swe.calc_ut(jd, swe.MEAN_APOG, swe.FLG_SWIEPH)[0][0], 5)))
json.dump(rows, open('test-chiron-swiss.fixtures.json', 'w'), indent=0)
