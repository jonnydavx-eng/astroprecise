import { readFileSync, writeFileSync, mkdirSync } from 'fs';
const src = readFileSync('C:/Users/jonny/OneDrive/astroprecise/website/js/ephemeris.js','utf8');
const win={}; new Function('window','console',src)(win,console); const E=win.AstroEphemeris;
const OUT='C:/Users/jonny/AppData/Local/Temp/ap-out'; mkdirSync(OUT,{recursive:true});

const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SGL=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PGL={sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇',chiron:'⚷',northNode:'☊'};
const PNAME={sun:'Sun',moon:'Moon',mercury:'Mercury',venus:'Venus',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',pluto:'Pluto',chiron:'Chiron',northNode:'North Node'};
const ELEM={Aries:'Fire',Leo:'Fire',Sagittarius:'Fire',Taurus:'Earth',Virgo:'Earth',Capricorn:'Earth',Gemini:'Air',Libra:'Air',Aquarius:'Air',Cancer:'Water',Scorpio:'Water',Pisces:'Water'};
const norm=x=>((x%360)+360)%360;
const sd=l=>{const s=norm(l);return {sign:SIGNS[Math.floor(s/30)], idx:Math.floor(s/30), d:Math.floor(s%30), m:Math.floor((s%1)*60)};};
const fmt=l=>{const x=sd(l);return `${x.d}°${String(x.m).padStart(2,'0')}′ ${x.sign}`;};

// ── Sample person ──
const PERSON={name:'Aurora Vale', date:'14 June 1990', time:'03:42 BST', place:'Whitby, England'};
const c=E.calculateNatalChart(1990,6,14,2,42,54.486,-0.613,'placidus');
const houses=c.houses;
function houseOf(lon){lon=norm(lon);for(let i=0;i<12;i++){const a=houses[i],b=houses[(i+1)%12];const span=norm(b-a)||30;if(norm(lon-a)<span)return i+1;}return 1;}
const BODIES=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','northNode'];
const pos={}; BODIES.forEach(k=>{const p=c.positions[k];pos[k]={lon:p.longitude,...sd(p.longitude),house:houseOf(p.longitude),retro:p.retrograde};});
const asc=c.ascendant, mc=c.midheaven, A=sd(asc), M=sd(mc);

// ── Aspects ──
const ASP=[['Conjunction',0,7,'☌'],['Opposition',180,7,'☍'],['Trine',120,6,'△'],['Square',90,6,'□'],['Sextile',60,4,'⚹']];
const aspects=[]; const ak=BODIES.filter(b=>b!=='northNode');
for(let i=0;i<ak.length;i++)for(let j=i+1;j<ak.length;j++){let d=Math.abs(pos[ak[i]].lon-pos[ak[j]].lon);if(d>180)d=360-d;for(const[nm,ang,orb,gl]of ASP){const o=Math.abs(d-ang);if(o<=orb){aspects.push({a:ak[i],b:ak[j],type:nm,gl,orb:o});break;}}}
aspects.sort((x,y)=>x.orb-y.orb);

// ── Element / modality tally ──
const eC={Fire:0,Earth:0,Air:0,Water:0};
['sun','moon','mercury','venus','mars','jupiter','saturn'].forEach(k=>eC[ELEM[pos[k].sign]]++);

// ── SVG natal wheel ──
function wheel(size){
  const cx=size/2, cy=size/2, R=size/2-8, rSign=R-size*0.085, rHouse=rSign-size*0.11, rPlanet=rHouse-size*0.05, rAspect=rPlanet-size*0.02;
  const ang=lon=>(180-(norm(lon)-asc))*Math.PI/180; // ASC at left, CCW
  const pt=(lon,r)=>[cx+r*Math.cos(ang(lon)), cy-r*Math.sin(ang(lon))];
  let s='';
  s+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#C9A227" stroke-width="1.5" opacity=".75"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="${rSign}" fill="none" stroke="#C9A227" stroke-width="1" opacity=".5"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="${rHouse}" fill="none" stroke="#C9A227" stroke-width=".7" opacity=".35"/>`;
  s+=`<circle cx="${cx}" cy="${cy}" r="${rAspect}" fill="none" stroke="#C9A227" stroke-width=".5" opacity=".25"/>`;
  // sign sectors
  for(let i=0;i<12;i++){
    const a0=i*30; const [x1,y1]=pt(a0,rSign),[x2,y2]=pt(a0,R);
    s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#C9A227" stroke-width=".7" opacity=".4"/>`;
    const [gx,gy]=pt(a0+15,(R+rSign)/2);
    s+=`<text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" font-size="${size*0.035}" fill="#E8C872" text-anchor="middle" dominant-baseline="central" font-family="serif">${SGL[i]}</text>`;
  }
  // house cusps
  for(let i=0;i<12;i++){
    const axis=[0,3,6,9].includes(i);
    const [x1,y1]=pt(houses[i],rAspect),[x2,y2]=pt(houses[i],rHouse);
    s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${axis?'rgba(232,200,114,.8)':'rgba(201,162,39,.3)'}" stroke-width="${axis?1.4:.6}"/>`;
    const [nx,ny]=pt(houses[i]+ (norm(houses[(i+1)%12]-houses[i])/2), rHouse-size*0.028);
    s+=`<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" font-size="${size*0.018}" fill="#A89E88" text-anchor="middle" dominant-baseline="central" font-family="sans-serif">${i+1}</text>`;
  }
  // ASC / MC labels
  const [ax,ay]=pt(asc,R+size*0.02);
  s+=`<text x="${(ax).toFixed(1)}" y="${(ay).toFixed(1)}" font-size="${size*0.02}" fill="#E8C872" text-anchor="middle" font-family="sans-serif" font-weight="bold">ASC</text>`;
  const [mx,my]=pt(mc,R+size*0.02);
  s+=`<text x="${(mx).toFixed(1)}" y="${(my).toFixed(1)}" font-size="${size*0.02}" fill="#E8C872" text-anchor="middle" font-family="sans-serif" font-weight="bold">MC</text>`;
  // aspect lines
  const AC={Conjunction:'#E8C872',Trine:'#5fae8a',Sextile:'#5fae8a',Square:'#b06a6a',Opposition:'#c98e5a'};
  aspects.forEach(asp=>{const [x1,y1]=pt(pos[asp.a].lon,rAspect),[x2,y2]=pt(pos[asp.b].lon,rAspect);
    s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${AC[asp.type]||'#888'}" stroke-width=".5" opacity=".4"/>`;});
  // planets
  BODIES.forEach((k,n)=>{
    const [px,py]=pt(pos[k].lon,rPlanet);
    const [tx,ty]=pt(pos[k].lon,rHouse-size*0.005);
    s+=`<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${px.toFixed(1)}" y2="${py.toFixed(1)}" stroke="rgba(232,200,114,.3)" stroke-width=".4"/>`;
    s+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size*0.022}" fill="rgba(10,8,6,.85)" stroke="#C9A227" stroke-width=".6"/>`;
    s+=`<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" font-size="${size*0.026}" fill="#EFE3C0" text-anchor="middle" dominant-baseline="central" font-family="serif">${PGL[k]}</text>`;
  });
  s+=`<circle cx="${cx}" cy="${cy}" r="3" fill="#C9A227"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${s}</svg>`;
}

const CSS=`
@page{size:A4;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Cormorant Garamond',Georgia,serif;color:#E8E0D0;background:#070608;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;min-height:297mm;padding:26mm 24mm;position:relative;background:radial-gradient(ellipse 120% 80% at 50% 0%,#0F0B07 0%,#070608 60%,#040305 100%);page-break-after:always;overflow:hidden;}
.page:last-child{page-break-after:auto;}
.eyebrow{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.34em;text-transform:uppercase;color:#C9A227;opacity:.85;}
h1{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.1em;color:#EFE3C0;font-size:30pt;line-height:1.15;margin:6pt 0;}
h2{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:11pt;color:#C9A227;margin:20pt 0 8pt;display:flex;align-items:center;gap:10pt;}
h2::before{content:'';width:16pt;height:1px;background:#C9A227;opacity:.6;}
h3{font-family:'Cinzel',serif;font-size:10.5pt;letter-spacing:.04em;color:#E8C872;margin:12pt 0 3pt;}
p{font-size:11.5pt;line-height:1.62;margin-bottom:8pt;text-wrap:pretty;color:#DCD3C0;}
.lede{font-size:13pt;line-height:1.6;color:#E8E0D0;font-style:italic;border-left:2px solid rgba(201,162,39,.4);padding-left:14pt;margin:14pt 0;}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:245mm;}
.cover .seal{font-size:40pt;color:#C9A227;margin-bottom:8pt;}
.meta{font-family:'Cinzel',serif;font-size:9pt;letter-spacing:.2em;color:#A89E88;margin-top:14pt;line-height:2;}
.big3{display:flex;gap:10pt;margin:14pt 0;}
.big3 .b{flex:1;border:1px solid rgba(201,162,39,.3);border-radius:8pt;padding:12pt;text-align:center;background:linear-gradient(160deg,rgba(201,162,39,.06),transparent);}
.big3 .g{font-size:24pt;color:#E8C872;font-family:serif;}
.big3 .lbl{font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.18em;text-transform:uppercase;color:#A89E88;margin-top:4pt;}
.big3 .v{font-size:12pt;color:#EFE3C0;margin-top:3pt;}
table{width:100%;border-collapse:collapse;font-size:10pt;margin:8pt 0;}
td,th{padding:4pt 6pt;border-bottom:1px solid rgba(201,162,39,.14);text-align:left;font-variant-numeric:tabular-nums;}
th{font-family:'Cinzel',serif;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#C9A227;}
.glyph{color:#E8C872;font-family:serif;font-size:12pt;}
.foot{position:absolute;bottom:12mm;left:24mm;right:24mm;display:flex;justify-content:space-between;font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:#5E5748;border-top:1px solid rgba(201,162,39,.15);padding-top:6pt;}
.watermark{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Cinzel',serif;font-size:60pt;letter-spacing:.2em;color:rgba(201,162,39,.06);white-space:nowrap;pointer-events:none;}
`;
const FONTS=`<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">`;
const foot=n=>`<div class="foot"><span>AstroPrecise · The Deep Reading</span><span>${PERSON.name}</span><span>${n}</span></div>`;

// ── READING (bespoke to the computed chart) ──
const reading=`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head><body>
<div class="page cover">
  <div class="watermark">SAMPLE</div>
  <div class="seal">✦</div>
  <p class="eyebrow">The Deep Reading</p>
  <h1>The Sky at Your<br>First Breath</h1>
  <p class="lede" style="border:none;text-align:center;max-width:120mm;">A complete reading of the natal chart of<br><strong style="font-style:normal;color:#EFE3C0;font-size:16pt;">${PERSON.name}</strong></p>
  <p class="meta">${PERSON.date} &nbsp;·&nbsp; ${PERSON.time}<br>${PERSON.place}<br>Sun ${fmt(pos.sun.lon)} · Moon ${fmt(pos.moon.lon)} · ${A.sign} Rising</p>
  <p style="position:absolute;bottom:18mm;font-size:8pt;letter-spacing:.2em;color:#5E5748;font-family:'Cinzel',serif;">EVERY NUMBER COMPUTED FROM THE REAL SKY · VSOP87 · ELP2000</p>
</div>

<div class="page">
  <p class="eyebrow">I · The Event in Spacetime</p>
  <h1 style="font-size:22pt;">You were a coordinate<br>the universe held once.</h1>
  <p class="lede">At 3:42 on the morning of 14 June 1990, the sky above Whitby held a configuration of light it had never shown before and will never show again. This reading is the transcription of that exact moment — your blueprint, in the old language.</p>
  <p>Three signatures govern everything that follows. Your <strong>Sun in ${pos.sun.sign}</strong> is the engine — the will, the thing being grown across a lifetime. Your <strong>Moon in ${pos.moon.sign}</strong> is the inner weather — how you feel, soothe, and remember. And ${A.sign} <strong>rising</strong> is the mask and the doorway — the first thing the world meets, and the lens you meet it through.</p>
  <p>You are an <strong>Air-dominant</strong> chart (${eC.Air} of the seven classical bodies in air signs): a mind-led nature, alive in language, pattern and connection. The work of the chart is to bring that quick, bright air down into form — and your ${M.sign} Midheaven and a cluster of planets in Capricorn show exactly where it asks to be built.</p>
  <div class="big3">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun · Core Self</div><div class="v">${pos.sun.d}° ${pos.sun.sign}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon · Inner World</div><div class="v">${pos.moon.d}° ${pos.moon.sign}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising · The Mask</div><div class="v">${A.d}° ${A.sign}</div></div>
  </div>
  ${foot('1')}
</div>

<div class="page">
  <p class="eyebrow">II · The Luminaries</p>
  <h3>${PGL.sun} The Sun in ${pos.sun.sign} — ${pos.sun.house}${['','st','nd','rd'][pos.sun.house]||'th'} House</h3>
  <p>Your Sun sits at ${fmt(pos.sun.lon)}, in the house of the self and the body — and in the sign of the messenger. This is a self made of curiosity: you become more yourself the more you learn, link, and put into words. Gemini suns are rarely one thing; you contain several, and the lifelong art is to let them coexist rather than demanding you choose. You shine when you are translating — making one world legible to another.</p>
  <h3>${PGL.moon} The Moon in ${pos.moon.sign} — ${pos.moon.house}th House</h3>
  <p>Your emotional nature is ${pos.moon.sign} — and it lives high in the chart, near the Midheaven, where private feeling and public life touch. You feel through ideas and ideals; you steady yourself with a certain cool distance, observing your own weather rather than drowning in it. This can read as detachment, but it is really a need for freedom and for the bigger picture. You are nourished by community, by causes, by being useful to something larger than yourself.</p>
  <h3>↑ ${A.sign} Rising — and its ruler, ${PNAME[c.chartRuler]} in ${pos[c.chartRuler].sign}</h3>
  <p>${A.sign} rising makes you appear quick, youthful, and approachable — a person of many doorways. Because ${A.sign} rises, your whole chart is ruled by <strong>${PNAME[c.chartRuler]}</strong>, here at ${fmt(pos[c.chartRuler].lon)} in the ${pos[c.chartRuler].house}th house. Your ruling planet rests just behind the eastern horizon, in the house of the hidden and the inward — so beneath the bright, communicative surface runs a deep private current. Much of your real work happens out of sight.</p>
  ${foot('2')}
</div>

<div class="page">
  <p class="eyebrow">III · The Personal Planets</p>
  <h3>${PGL.mercury} Mercury in ${pos.mercury.sign} — the doubled messenger</h3>
  <p>With Mercury in its own sign and ruling your chart, the mind is the centre of gravity here. You think fast, in branches and bridges; you persuade by sheer fluency. The 12th-house placement gives that mind a back room — intuition, dreams, things half-known before they are said. Write them down: your best thinking arrives sideways.</p>
  <h3>${PGL.venus} Venus in ${pos.venus.sign} &nbsp; ${PGL.mars} Mars in ${pos.mars.sign}</h3>
  <p>You love in ${pos.venus.sign} — steadily, sensually, with loyalty and a need for the tangible: touch, beauty, the kept promise. But you act in ${pos.mars.sign}: fast, first, direct. Desire and affection run on different clocks — Mars wants it now, Venus wants it to last. Naming that difference out loud is how the two stop pulling against each other.</p>
  <h3>${PGL.jupiter} Jupiter in ${pos.jupiter.sign}</h3>
  <p>Where life over-delivers when you say yes is through ${pos.jupiter.sign} — care, belonging, the making of a home or a tribe. Generosity given here returns with interest.</p>
  ${foot('3')}
</div>

<div class="page">
  <p class="eyebrow">IV · The Architecture of Depth</p>
  <h1 style="font-size:20pt;">A Capricorn stellium in the<br>houses of transformation.</h1>
  <p class="lede">Saturn, Uranus and Neptune all stand together in Capricorn, across the 8th and 9th houses — the rarest and most defining signature in your chart.</p>
  <p><strong>${PGL.saturn} Saturn ${pos.saturn.d}° · ${PGL.uranus} Uranus ${pos.uranus.d}° · ${PGL.neptune} Neptune ${pos.neptune.d}°</strong>, all in Capricorn. This is the great generational conjunction of 1988–90 — but in your chart it falls in the houses of shared resources, intimacy, death-and-rebirth (8th) and meaning, philosophy, the long horizon (9th). You carry a serious, structural relationship to transformation itself: you rebuild rather than patch, and you are drawn to the deep questions — what is true, what lasts, what is worth the climb.</p>
  <p>${PGL.pluto} <strong>Pluto in ${pos.pluto.sign}</strong> in the 6th adds a quiet intensity to your daily work and health: you transform through discipline, through the unglamorous repeated act. ${PGL.chiron} <strong>Chiron in ${pos.chiron.sign}</strong> marks the tender place — a wound around being seen and being enough — that, tended, becomes a gift for helping others shine.</p>
  <h3>☊ The North Node in ${pos.northNode.sign} — your growing edge</h3>
  <p>The soul's direction points toward ${pos.northNode.sign} in the 10th: away from working quietly behind the scenes, toward a visible, original public contribution. Every time a choice feels both exposing and strangely inevitable, it is pointing you up this path.</p>
  ${foot('4')}
</div>

<div class="page">
  <p class="eyebrow">V · The Conversations Between Planets</p>
  <h1 style="font-size:20pt;">Your tightest aspects.</h1>
  <p>Aspects are the angles planets make to one another — the wiring of the chart. These are the closest in yours, listed by exactness:</p>
  <table><tr><th>Bodies</th><th>Aspect</th><th>Orb</th></tr>
  ${aspects.slice(0,10).map(a=>`<tr><td><span class="glyph">${PGL[a.a]}</span> ${PNAME[a.a]} &nbsp;${a.gl}&nbsp; <span class="glyph">${PGL[a.b]}</span> ${PNAME[a.b]}</td><td>${a.type}</td><td>${a.orb.toFixed(1)}°</td></tr>`).join('')}
  </table>
  <p style="margin-top:12pt;">The tightest of these set the key signature of the whole life — the recurring negotiations your story keeps returning to. A flowing aspect (trine, sextile) is a gift to spend; a hard one (square, opposition) is an engine, not an accident — pressure applied exactly where strength is meant to grow.</p>
  <h2>The Closing</h2>
  <p>${PERSON.name}, you are a bright, mercurial mind built over a deep and serious foundation — air over earth, the translator over the architect. Your chart asks you to bring what you privately understand into a public, original form, and to trust that the slow Capricorn structure underneath can carry the quick Gemini light. This is not prediction. It is orientation — a map of the sky you were born under, drawn honestly. What you build on it is yours.</p>
  ${foot('5')}
</div>
</body></html>`;

// ── POSTER (A3) ──
const posterCSS=CSS.replace('size:A4','size:A3').replace('width:210mm;min-height:297mm;padding:26mm 24mm','width:297mm;min-height:420mm;padding:24mm');
const poster=`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${posterCSS}
.wheel-wrap{display:flex;justify-content:center;margin:6mm 0;}
.placements{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm 10mm;margin-top:8mm;}
.pl{display:flex;align-items:baseline;gap:6pt;font-size:12pt;border-bottom:1px solid rgba(201,162,39,.14);padding:3pt 0;}
.pl .g{font-size:15pt;color:#E8C872;font-family:serif;width:18pt;}
.pl .n{font-family:'Cinzel',serif;font-size:8.5pt;letter-spacing:.06em;text-transform:uppercase;color:#A89E88;width:64pt;}
.pl .v{color:#EFE3C0;font-variant-numeric:tabular-nums;}
.pl .r{color:#b06a6a;font-size:9pt;}
</style></head><body>
<div class="page" style="text-align:center;">
  <div class="watermark" style="font-size:90pt;">SAMPLE</div>
  <p class="eyebrow">The Natal Chart of</p>
  <h1 style="font-size:34pt;margin-top:2mm;">${PERSON.name}</h1>
  <p class="meta">${PERSON.date} &nbsp;·&nbsp; ${PERSON.time} &nbsp;·&nbsp; ${PERSON.place}</p>
  <div class="wheel-wrap">${wheel(620)}</div>
  <div class="big3" style="max-width:200mm;margin:4mm auto;">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun</div><div class="v">${fmt(pos.sun.lon)}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon</div><div class="v">${fmt(pos.moon.lon)}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising</div><div class="v">${fmt(asc)}</div></div>
  </div>
  <div class="placements">
    ${BODIES.map(k=>`<div class="pl"><span class="g">${PGL[k]}</span><span class="n">${PNAME[k]}</span><span class="v">${fmt(pos[k].lon)}</span> ${pos[k].retro?'<span class="r">℞</span>':''}</div>`).join('')}
    <div class="pl"><span class="g">↑</span><span class="n">Ascendant</span><span class="v">${fmt(asc)}</span></div>
    <div class="pl"><span class="g">MC</span><span class="n">Midheaven</span><span class="v">${fmt(mc)}</span></div>
  </div>
  <p style="margin-top:10mm;font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.28em;color:#5E5748;">✦ ASTROPRECISE ✦ &nbsp; COMPUTED FROM THE REAL SKY</p>
</div>
</body></html>`;

writeFileSync(OUT+'/reading.html', reading,'utf8');
writeFileSync(OUT+'/poster.html', poster,'utf8');
console.log('Sun',fmt(pos.sun.lon),'| Moon',fmt(pos.moon.lon),'| ASC',fmt(asc),'| aspects',aspects.length);
console.log('written to',OUT);
