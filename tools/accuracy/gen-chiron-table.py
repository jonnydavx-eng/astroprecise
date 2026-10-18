# Regenerate the CHIRON_TAB string in website/js/ephemeris.js from Swiss Ephemeris 2.10.
# Needs pyswisseph and seas_18.se1 (github.com/aloistr/swisseph/ephe) in SE_EPHE_PATH.
import os
import swisseph as swe
swe.set_ephe_path(os.environ.get('SE_EPHE_PATH', 'ephe'))
J0=swe.julday(1850,1,1,0); STEP=200; N=int((swe.julday(2150,1,1,0)-J0)/STEP)+2
vals=[]
for i in range(N):
    l,b,r=swe.calc(J0+i*STEP,15,swe.FLG_SWIEPH|swe.FLG_HELCTR)[0][:3]
    vals.append(f"{round(l*1e4)},{round(b*1e4)},{round(r*1e5)}")
print(J0,STEP,N)
open('chiron_table.txt','w').write(';'.join(vals))
