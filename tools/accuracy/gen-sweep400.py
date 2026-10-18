import json, random, swisseph as swe
import os; swe.set_ephe_path(os.environ.get('SE_EPHE_PATH','ephe'))
random.seed(20261018)
ids = dict(sun=0, moon=1, mercury=2, venus=3, mars=4, jupiter=5, saturn=6, uranus=7, neptune=8, pluto=9, chiron=15)
rows=[]
for i in range(400):
    y=random.randint(1900,2049); m=random.randint(1,12); d=random.randint(1,28); hh=random.randint(0,23); mm=random.randint(0,59)
    lat=round(random.uniform(-80,80) if i%10==0 else random.uniform(-60,60),4); lon=round(random.uniform(-180,180),4)
    jd=swe.julday(y,m,d,hh+mm/60)
    ref={}
    for k,n in ids.items():
        ref[k]=swe.calc_ut(jd,n,swe.FLG_SWIEPH)[0][0]
    ref['meanNode']=swe.calc_ut(jd,swe.MEAN_NODE,swe.FLG_SWIEPH)[0][0]
    ref['trueNode']=swe.calc_ut(jd,swe.TRUE_NODE,swe.FLG_SWIEPH)[0][0]
    ref['lilith']=swe.calc_ut(jd,swe.MEAN_APOG,swe.FLG_SWIEPH)[0][0]
    _,am=swe.houses(jd,lat,lon,b'O')
    ref['asc'],ref['mc']=am[0],am[1]
    cu=list(swe.houses(jd,lat,lon,b'P')[0]) if abs(lat)<60 else None
    rows.append(dict(ut=[y,m,d,hh,mm],lat=lat,lon=lon,ref=ref,placidus=cu))
json.dump(rows,open('sweep400.json','w'))
print(len(rows))
