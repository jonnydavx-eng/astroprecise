// AstroPrecise — Deep Reading + Natal Poster generator (paid fulfilment).
//
// PAID STANDARD: VSOP87/ELP2000 · arcminute longitudes · interpretations.js prose
// · element-tinted wheel (chart-render palette) · product-specific deliverables only.
// See tools/fulfil-quality.mjs — every customer order must pass --final + quality gate.
//
// USAGE
//   node tools/generate-reading.mjs --in order.json --final
//   order.json includes product: deep-reading | natal-poster-pdf | reading-poster-bundle
//
// FLAGS
//   --final   paid copy (no watermark). Omit = DRAFT/SAMPLE for proofing.
//   --out     output dir (default %TEMP%/ap-out).
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  JS, norm, sd, fmt, slug, sents, ord,
  natalWheelSvg, deliverablesForProduct, paidMetaBlock, isPaidOrder,
} from './fulfil-shared.mjs';
import {
  productLabel, modalityBars, chartRulerNarrative, mcCareerBlock, loveValuesBlock,
  saturnChapter, aspectsChapter, placementTable, methodologyPage, closingChapter,
  skyFactsBlock, lifeAreasChapter, houseTourChapter, planetDossiersChapter, chartPatternsChapter,
} from './reading-narrative.mjs';
import {
  buildAnalyzePayload, detectChartPatterns,
} from './reading-data-bridge.mjs';

const win = {};
const ephSrc = readFileSync(join(JS, 'ephemeris.js'), 'utf8');
new Function('window', 'console', ephSrc)(win, console);
const E = win.AstroEphemeris;
let I = null;
try {
  const interpSrc = readFileSync(join(JS, 'interpretations.js'), 'utf8');
  new Function('window', 'console', 'document', interpSrc)(win, console, undefined);
  I = win.AstroInterpretations || win.Interpretations || null;
} catch (e) { console.warn('interpretations.js not loaded — using built-in fallbacks:', e.message); }

// ── arg parsing ──
function parseArgs(argv){
  const a={ _:[] };
  for(let i=0;i<argv.length;i++){
    const t=argv[i];
    if(t.startsWith('--')){ const k=t.slice(2); const n=argv[i+1];
      if(n===undefined||n.startsWith('--')){ a[k]=true; } else { a[k]=n; i++; } }
    else a._.push(t);
  }
  return a;
}
const A_ = parseArgs(process.argv.slice(2));
let order = {};
if (A_.in) { try { order = JSON.parse(readFileSync(A_.in,'utf8')); } catch(e){ console.error('Could not read --in JSON:',e.message); process.exit(1); } }
// flag overrides JSON
['name','date','time','place','house'].forEach(k=>{ if(A_[k]!==undefined) order[k]=A_[k]; });
['y','mo','d','h','mi','lat','lon'].forEach(k=>{ if(A_[k]!==undefined) order[k]=Number(A_[k]); });

const usingSample = order.y === undefined;
const PRODUCT = order.product || A_.product || 'reading-poster-bundle';
const DELIVER = deliverablesForProduct(PRODUCT);
const paidOrder = isPaidOrder(order);
const FINAL = !!A_.final || paidOrder;
const WATERMARK = FINAL ? '' : (usingSample ? 'SAMPLE' : 'DRAFT');

// ── the sample chart (default when no buyer supplied) ──
const PERSON = {
  name:  order.name  || 'Aurora Vale',
  date:  order.date  || '14 June 1990',
  time:  order.time  || '03:42 BST',
  place: order.place || 'Whitby, England',
};
const Y  = order.y  ?? 1990, MO = order.mo ?? 6, D = order.d ?? 14,
      H  = order.h  ?? 2,    MI = order.mi ?? 42,
      LAT= order.lat?? 54.486, LON = order.lon ?? -0.613,
      HSYS = order.house || 'placidus';

const OUT = A_.out || (process.env.TEMP ? process.env.TEMP.replace(/\\/g,'/') + '/ap-out' : 'C:/Users/jonny/AppData/Local/Temp/ap-out');
mkdirSync(OUT,{recursive:true});

const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SGL=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PGL={sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇',chiron:'⚷',northNode:'☊'};
const PNAME={sun:'Sun',moon:'Moon',mercury:'Mercury',venus:'Venus',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',pluto:'Pluto',chiron:'Chiron',northNode:'North Node'};
const ELEM={Aries:'Fire',Leo:'Fire',Sagittarius:'Fire',Taurus:'Earth',Virgo:'Earth',Capricorn:'Earth',Gemini:'Air',Libra:'Air',Aquarius:'Air',Cancer:'Water',Scorpio:'Water',Pisces:'Water'};
const MODE={Aries:'Cardinal',Cancer:'Cardinal',Libra:'Cardinal',Capricorn:'Cardinal',Taurus:'Fixed',Leo:'Fixed',Scorpio:'Fixed',Aquarius:'Fixed',Gemini:'Mutable',Virgo:'Mutable',Sagittarius:'Mutable',Pisces:'Mutable'};
const ELEM_BLURB={
  Fire:'a will-led nature, alive in action, courage and momentum',
  Earth:'a body-led nature, alive in the tangible — the built, the useful, the lasting',
  Air:'a mind-led nature, alive in language, pattern and connection',
  Water:'a feeling-led nature, alive in emotion, memory and intuition',
};


// interpretation accessors (with safe fallbacks if interpretations.js is absent)
const pInterp=(planet,sign)=> (I&&I.getPlanetInterpretation) ? I.getPlanetInterpretation(planet,sign)
  : `${planet} in ${sign} blends ${planet}'s principle with ${sign}'s qualities.`;
const hMeaning=n=>{ const h=(I&&I.getHouseMeaning)?I.getHouseMeaning(n):null;
  return { keyword:(h&&h.keyword)?h.keyword:'this area of life', meaning:(h&&(h.meaning||h.description))||'' }; };
const aInterp=(type,p1,p2)=>{ try{ const r=(I&&I.getAspectMeaning)?I.getAspectMeaning(type,p1,p2):''; return (r&&typeof r==='string')?r:''; }catch{ return ''; } };
const timeUnknown = !!(order.timeUnknown || /unknown|don'?t know|not sure|approx/i.test(String(PERSON.time || order.time || '')));

// ── compute the chart ──
const c=E.calculateNatalChart(Y,MO,D,H,MI,LAT,LON,HSYS);
const houses=c.houses;
function houseOf(lon){lon=norm(lon);for(let i=0;i<12;i++){const a=houses[i],b=houses[(i+1)%12];const span=norm(b-a)||30;if(norm(lon-a)<span)return i+1;}return 1;}
const BODIES=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','northNode'];
const pos={}; BODIES.forEach(k=>{const p=c.positions[k];pos[k]={lon:p.longitude,...sd(p.longitude),house:houseOf(p.longitude),retro:p.retrograde};});
const asc=c.ascendant, mc=c.midheaven, A=sd(asc), M=sd(mc);
const ruler = c.chartRuler && pos[c.chartRuler] ? c.chartRuler : 'mars';

// ── aspects ──
const ASP=[['Conjunction',0,7,'☌'],['Opposition',180,7,'☍'],['Trine',120,6,'△'],['Square',90,6,'□'],['Sextile',60,4,'⚹']];
const aspects=[]; const ak=BODIES.filter(b=>b!=='northNode');
for(let i=0;i<ak.length;i++)for(let j=i+1;j<ak.length;j++){let d=Math.abs(pos[ak[i]].lon-pos[ak[j]].lon);if(d>180)d=360-d;for(const[nm,ang,orb,gl]of ASP){const o=Math.abs(d-ang);if(o<=orb){aspects.push({a:ak[i],b:ak[j],type:nm,gl,orb:o});break;}}}
aspects.sort((x,y)=>x.orb-y.orb);

// ── element / modality dominance (7 classical bodies) ──
const CLASSICAL=['sun','moon','mercury','venus','mars','jupiter','saturn'];
const eC={Fire:0,Earth:0,Air:0,Water:0}; CLASSICAL.forEach(k=>eC[ELEM[pos[k].sign]]++);
const mC={Cardinal:0,Fixed:0,Mutable:0}; CLASSICAL.forEach(k=>mC[MODE[pos[k].sign]]++);
const domEl = Object.entries(eC).sort((a,b)=>b[1]-a[1])[0];     // [element,count]
const domMode = Object.entries(mC).sort((a,b)=>b[1]-a[1])[0];

// ── stellium detection (3+ of sun..pluto+chiron in one sign) ──
const STELLI_BODIES=['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron'];
const bySign={}; STELLI_BODIES.forEach(k=>{(bySign[pos[k].sign]=bySign[pos[k].sign]||[]).push(k);});
const stellium = Object.entries(bySign).map(([sign,ks])=>({sign,ks})).filter(s=>s.ks.length>=3).sort((a,b)=>b.ks.length-a.ks.length)[0]||null;

const wheel = (size) => natalWheelSvg({ size, asc, houses, pos, aspects, mc, bodies: BODIES, idPrefix: `rd-${slug(PERSON.name)}` });
const chartMeta = {
  sun: +pos.sun.lon.toFixed(4),
  moon: +pos.moon.lon.toFixed(4),
  asc: +asc.toFixed(4),
  aspects: aspects.length,
};
const paidMeta = paidMetaBlock({ ...order, product: PRODUCT }, chartMeta);

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
/* ── premium engraved keepsake: double-rule frame, ornaments, drop cap, balance ── */
.page::before{content:'';position:absolute;inset:8mm;border:1px solid rgba(201,162,39,.42);pointer-events:none;}
.page::after{content:'';position:absolute;inset:9.4mm;border:1px solid rgba(201,162,39,.15);pointer-events:none;}
.orn{display:flex;align-items:center;gap:10pt;color:#C9A227;margin:16pt 0;}
.orn::before,.orn::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(201,162,39,.5),transparent);}
.orn span{font-size:9pt;letter-spacing:.4em;}
.dropcap::first-letter{font-family:'Cinzel',serif;font-size:33pt;line-height:.78;float:left;padding:3pt 7pt 0 0;color:#E8C872;}
.balance{display:flex;flex-direction:column;gap:5pt;margin:12pt 0 4pt;}
.balance .row{display:flex;align-items:center;gap:8pt;font-size:9.5pt;}
.balance .el{width:52pt;font-family:'Cinzel',serif;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#A89E88;}
.balance .track{flex:1;height:5pt;background:rgba(201,162,39,.12);border-radius:3pt;overflow:hidden;}
.balance .fill{height:100%;background:linear-gradient(90deg,#9a6a2a,#E8C872);}
.balance .n{width:14pt;text-align:right;color:#EFE3C0;font-variant-numeric:tabular-nums;}
.cover-wheel{margin:16pt 0 6pt;}
ul.questions{margin:10pt 0 14pt 18pt;font-size:11.5pt;line-height:1.55;color:#DCD3C0;}
ul.questions li{margin-bottom:6pt;}
p.note{font-size:10.5pt;color:#A89E88;border-left:2px solid rgba(201,162,39,.25);padding-left:12pt;}
table.placements td,table.placements th{font-size:9.5pt;}
.r{color:#b06a6a;font-size:9pt;}
`;
const FONTS=`<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">`;
const wm = WATERMARK ? `<div class="watermark">${WATERMARK}</div>` : '';
const wmBig = WATERMARK ? `<div class="watermark" style="font-size:90pt;">${WATERMARK}</div>` : '';
const PLABEL = productLabel(PRODUCT);
const foot=n=>`<div class="foot"><span>AstroPrecise · ${PLABEL.short}</span><span>${PERSON.name}</span><span>${n}</span></div>`;
const domLineTail = ELEM_BLURB[domEl[0]].replace(/^a /,'');
const chartPatterns = detectChartPatterns(aspects, pos, PNAME);
const analyzePayload = buildAnalyzePayload({ pos, asc, mc, ruler, aspects, BODIES, PNAME });
// ── derived narrative fragments (all from THIS chart) ──
const sunSign=pos.sun.sign, moonSign=pos.moon.sign, ascSign=A.sign;
const lifeAreasCtx = {
  pos, ascSign, mcSign: M.sign, I, analyzePayload, hMeaning, pInterp, sentsFn: sents,
};
const domLine = `You are a <strong>${domEl[0]}-dominant</strong> chart (${domEl[1]} of the seven classical bodies in ${domEl[0].toLowerCase()} signs): ${ELEM_BLURB[domEl[0]]}. The chart leans <strong>${domMode[0].toLowerCase()}</strong> in mode, and your ${M.sign} Midheaven shows the public shape it wants to take.`;
// element balance mini-chart (the 7 classical bodies across fire/earth/air/water)
const balanceBars = () => `<div class="balance">${['Fire','Earth','Air','Water'].map(el =>
  `<div class="row"><span class="el">${el}</span><span class="track"><span class="fill" style="width:${Math.round(eC[el] / 7 * 100)}%"></span></span><span class="n">${eC[el]}</span></div>`).join('')}</div>`;

// page IV — architecture of depth (stellium if present, else outer-planet generation)
function architecture(){
  let body='';
  if(stellium){
    const ks=stellium.ks;
    const hs=[...new Set(ks.map(k=>pos[k].house))].sort((a,b)=>a-b).map(ord);
    const names = ks.map(k=>PNAME[k]).join(', ').replace(/, ([^,]*)$/,' and $1');
    body += `<h1 style="font-size:20pt;">A ${stellium.sign} stellium across<br>your ${hs.join(' & ')} house${hs.length>1?'s':''}.</h1>`;
    body += `<p class="lede">${names} all gather in ${stellium.sign} — the most concentrated signature in your chart, and the theme your life keeps returning to.</p>`;
    body += `<p><strong>${ks.map(k=>`${PGL[k]} ${PNAME[k]} ${pos[k].d}°`).join(' · ')}</strong>, all in ${stellium.sign}. ${sents(pInterp(ks[0]==='sun'?'Sun':PNAME[ks[0]], stellium.sign),2)} Where this much weight collects in one sign, that sign's lessons are not optional — they are the spine of the story.</p>`;
  } else {
    body += `<h1 style="font-size:20pt;">The slow planets<br>and the long arc.</h1>`;
    body += `<p class="lede">The outer planets move slowly — they mark the deep, generational currents your chart channels into a single life.</p>`;
    ['saturn','uranus','neptune'].forEach(k=>{
      body += `<p><strong>${PGL[k]} ${PNAME[k]} in ${pos[k].sign}</strong> — ${ord(pos[k].house)} house (${hMeaning(pos[k].house).keyword}). ${sents(pInterp(PNAME[k],pos[k].sign),1)}</p>`;
    });
  }
  body += `<p>${PGL.pluto} <strong>Pluto in ${pos.pluto.sign}</strong>, in your ${ord(pos.pluto.house)} house, marks where you transform through depth and repetition — the house of ${hMeaning(pos.pluto.house).keyword}. ${PGL.chiron} <strong>Chiron in ${pos.chiron.sign}</strong> marks the tender place that, tended, becomes a gift for others.</p>`;
  body += `<h3>☊ The North Node in ${pos.northNode.sign} — your growing edge</h3>`;
  body += `<p>The soul's direction points toward ${pos.northNode.sign} in your ${ord(pos.northNode.house)} house — the house of ${hMeaning(pos.northNode.house).keyword}. Every choice that feels both exposing and strangely inevitable is pointing you up this path.</p>`;
  return body;
}

// ── READING (data-driven from THIS chart) ──
const reading=`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head><body>${paidMeta}
<div class="page cover">
  ${wm}
  <div class="seal">✦</div>
  <p class="eyebrow">${PLABEL.tag}</p>
  <h1>The Sky at Your<br>First Breath</h1>
  <p class="lede" style="border:none;text-align:center;max-width:120mm;">A complete natal reading for<br><strong style="font-style:normal;color:#EFE3C0;font-size:16pt;">${PERSON.name}</strong></p>
  <div class="cover-wheel">${wheel(300)}</div>
  <p class="meta">${PERSON.date} &nbsp;·&nbsp; ${PERSON.time}<br>${PERSON.place}<br>Sun ${fmt(pos.sun.lon)} · Moon ${fmt(pos.moon.lon)} · ${ascSign} Rising</p>
  <p style="position:absolute;bottom:18mm;font-size:8pt;letter-spacing:.2em;color:#5E5748;font-family:'Cinzel',serif;">EVERY NUMBER COMPUTED FROM THE REAL SKY · VSOP87 · ELP2000</p>
</div>

<div class="page">
  <p class="eyebrow">I · The Event in Spacetime</p>
  <h1 style="font-size:22pt;">You were a coordinate<br>the universe held once.</h1>
  <p class="lede">At ${PERSON.time} on ${PERSON.date}, the sky above ${PERSON.place} held a configuration of light it had never shown before and will never show again. This reading is the transcription of that exact moment — your blueprint, written in the old language of the heavens.</p>
  ${timeUnknown ? '<p class="note">Birth time was approximate or unknown. Sign placements remain accurate; houses and angles are cast from a solar chart and should be read as illustrative until an exact time is supplied.</p>' : ''}
  <p class="dropcap">Three signatures govern everything that follows. Your <strong>Sun in ${sunSign}</strong> is the engine — the will being grown across a lifetime. Your <strong>Moon in ${moonSign}</strong> is the inner weather — how you feel, soothe, and remember. And <strong>${ascSign} rising</strong> is the doorway — the first face the world meets, and the lens you meet it through.</p>
  <p>${domLine}</p>
  ${balanceBars()}
  <p style="font-size:10pt;color:#A89E88;margin-top:8pt;">Modality — how you move through change:</p>
  ${modalityBars(mC)}
  ${skyFactsBlock(pos, asc, mc, fmt, PGL, PNAME, BODIES)}
  <div class="orn"><span>✦ THE BIG THREE ✦</span></div>
  <div class="big3">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun · Core Self</div><div class="v">${pos.sun.d}° ${sunSign}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon · Inner World</div><div class="v">${pos.moon.d}° ${moonSign}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising · The Mask</div><div class="v">${A.d}° ${ascSign}</div></div>
  </div>
  ${foot('1')}
</div>

<div class="page">
  <p class="eyebrow">II · The Luminaries</p>
  <h3>${PGL.sun} The Sun in ${sunSign} — ${ord(pos.sun.house)} House (${hMeaning(pos.sun.house).keyword})</h3>
  <p>Your Sun sits at ${fmt(pos.sun.lon)}. ${sents(pInterp('Sun',sunSign),4)} In the ${ord(pos.sun.house)} house, this solar purpose expresses through ${hMeaning(pos.sun.house).keyword.toLowerCase()} — the arena where your vitality most wants to be spent.</p>
  <h3>${PGL.moon} The Moon in ${moonSign} — ${ord(pos.moon.house)} House (${hMeaning(pos.moon.house).keyword})</h3>
  <p>${sents(pInterp('Moon',moonSign),4)} The Moon's house shows where you seek emotional safety: here, in ${hMeaning(pos.moon.house).keyword.toLowerCase()}.</p>
  <h3>↑ ${ascSign} Rising</h3>
  <p>${chartRulerNarrative(ruler, pos, PNAME[ruler], pInterp, hMeaning)}</p>
  ${foot('2')}
</div>

<div class="page">
  <p class="eyebrow">III · Mind & Expansion</p>
  <h3>${PGL.mercury} Mercury in ${pos.mercury.sign} — ${ord(pos.mercury.house)} House (${hMeaning(pos.mercury.house).keyword})</h3>
  <p>${sents(pInterp('Mercury',pos.mercury.sign),2)} Mercury's house shows where the mind is busiest: ${hMeaning(pos.mercury.house).keyword.toLowerCase()}.</p>
  <h3>${PGL.jupiter} Jupiter in ${pos.jupiter.sign} — ${ord(pos.jupiter.house)} House (${hMeaning(pos.jupiter.house).keyword})</h3>
  <p>Where life tends to over-deliver when you say yes is through ${pos.jupiter.sign}, in the house of ${hMeaning(pos.jupiter.house).keyword}. ${sents(pInterp('Jupiter',pos.jupiter.sign),2)} Generosity invested here tends to return with interest.</p>
  ${foot('3')}
</div>

<div class="page">
  <p class="eyebrow">IV · Love, Desire & Values</p>
  ${loveValuesBlock(pos, pInterp, hMeaning, sents, PGL)}
  ${foot('4')}
</div>

<div class="page">
  <p class="eyebrow">V · Life Areas</p>
  ${lifeAreasChapter(lifeAreasCtx)}
  ${foot('5')}
</div>

<div class="page">
  <p class="eyebrow">VI · Vocation & Mastery</p>
  <h1 style="font-size:20pt;">Public life & the long game.</h1>
  ${mcCareerBlock(M, mc, pInterp, hMeaning, sents)}
  ${saturnChapter(pos, pInterp, hMeaning, sents, PGL)}
  ${foot('6')}
</div>

<div class="page">
  <p class="eyebrow">VII · The Architecture of Depth</p>
  ${architecture()}
  ${foot('7')}
</div>

<div class="page">
  <p class="eyebrow">VIII · The Twelve Houses</p>
  ${houseTourChapter(houses, pos, hMeaning, fmt, PGL, PNAME, BODIES)}
  ${foot('8')}
</div>

<div class="page">
  <p class="eyebrow">IX · Planet by Planet</p>
  ${planetDossiersChapter(pos, pInterp, hMeaning, sents, PGL, PNAME, BODIES)}
  ${foot('9')}
</div>

<div class="page">
  <p class="eyebrow">X · Chart Patterns</p>
  ${chartPatternsChapter(chartPatterns)}
  ${foot('10')}
</div>

<div class="page">
  <p class="eyebrow">XI · The Conversations Between Planets</p>
  <h1 style="font-size:20pt;">Your tightest aspects.</h1>
  ${aspectsChapter(aspects, I, PNAME, PGL, 10)}
  ${foot('11')}
</div>

<div class="page">
  <p class="eyebrow">XII · Closing</p>
  <h1 style="font-size:20pt;">Living the chart.</h1>
  ${closingChapter(PERSON.name, sunSign, moonSign, ascSign, domEl, domMode, domLineTail)}
  ${foot('12')}
</div>

<div class="page">
  ${methodologyPage(PERSON, { ...order, timeUnknown })}
  <div class="orn"><span>✦ CHART REFERENCE ✦</span></div>
  ${placementTable(BODIES, pos, PGL, PNAME, fmt, asc, mc)}
  ${foot('13')}
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
</style></head><body>${paidMeta}
<div class="page" style="text-align:center;">
  ${wmBig}
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
  <p style="margin-top:6mm;font-size:11pt;color:#A89E88;font-style:italic;">The sky at your first breath — every position computed, never invented.</p>
  <p style="margin-top:4mm;font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.28em;color:#5E5748;">✦ ASTROPRECISE ✦ &nbsp; VSOP87 · ELP2000 · PLACIDUS HOUSES</p>
</div>
</body></html>`;

const fileSlug = slug(PERSON.name) || 'reading';
const rPath = `${OUT}/reading-${fileSlug}.html`;
const pPath = `${OUT}/poster-${fileSlug}.html`;
const written = [];
if (DELIVER.reading) { writeFileSync(rPath, reading, 'utf8'); written.push(rPath); }
if (DELIVER.poster) { writeFileSync(pPath, poster, 'utf8'); written.push(pPath); }
console.log(`${PERSON.name} — Sun ${fmt(pos.sun.lon)} | Moon ${fmt(pos.moon.lon)} | ASC ${fmt(asc)} | ${domEl[0]}-dominant | ${aspects.length} aspects${stellium ? ` | ${stellium.sign} stellium (${stellium.ks.length})` : ''}`);
console.log(`product: ${PRODUCT} → reading:${DELIVER.reading} poster:${DELIVER.poster}`);
console.log(`watermark: ${WATERMARK || '(none — FINAL / paid)'}`);
for (const p of written) console.log('written:', p);
