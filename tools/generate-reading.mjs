// AstroPrecise — Deep Reading + Natal Poster generator (paid fulfilment).
//
// PAID STANDARD: canonical UTC conversion · VSOP87/ELP2000 · intentionally
// paginated output · product-specific deliverables only.
// See tools/fulfil-quality.mjs — final files require verified payment evidence.
//
// USAGE
//   node tools/generate-reading.mjs --in canonical-private-order.json
//   order.json includes product: deep-reading | natal-poster-pdf | reading-poster-bundle
//
// FLAGS
//   --out     output dir (default %TEMP%/ap-out).
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  ROOT, JS, MONTHS, norm, sd, fmt, slug, sents, ord, FONTS, esc, sha256,
  canonicalizeStudioOrder, natalWheelSvg, deliverablesForProduct, paidMetaBlock, isPaidOrder,
} from './fulfil-shared.mjs';
import {
  productLabel, modalityBars, chartRulerNarrative, mcCareerBlock, loveValuesBlock,
  saturnChapter, aspectsChapter, placementTable, methodologyPage, closingChapter,
  lifeAreasChapter, houseTourChapter, planetDossiersChapter, chartPatternsChapter,
} from './reading-narrative.mjs';
import {
  detectChartPatterns,
} from './reading-data-bridge.mjs';

const win = {};
const ephSrc = readFileSync(join(JS, 'ephemeris.js'), 'utf8');
new Function('window', 'console', ephSrc)(win, console);
const E = win.AstroEphemeris;
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
if (A_.final) {
  console.error('--final is disabled. Unwatermarked files require verified payment evidence through fulfil-order.mjs.');
  process.exit(1);
}
const PRODUCT = order.product || A_.product || 'whole-sky-edition';
const DELIVER = deliverablesForProduct(PRODUCT);
const paidOrder = isPaidOrder(order, { checkoutVerified: process.env.AP_CHECKOUT_VERIFIED === '1' });
const FINAL = paidOrder;
const WATERMARK = FINAL ? '' : ((usingSample || order.sampleMode === 'fictional') ? 'FICTIONAL SAMPLE' : 'DRAFT');
const STUDIO_INPUT_HASH = /^[a-f0-9]{64}$/i.test(String(process.env.AP_STUDIO_INPUT_HASH || ''))
  ? String(process.env.AP_STUDIO_INPUT_HASH).toLowerCase() : null;
const PROVENANCE_REF = /^AP-[A-F0-9]{16}$/.test(String(process.env.AP_STUDIO_PROVENANCE_REF || ''))
  ? String(process.env.AP_STUDIO_PROVENANCE_REF) : null;
const STUDIO_MODE = FINAL ? 'final' : 'proof';

// ── the sample chart (default when no buyer supplied) ──
const sampleOrder = {
  name: 'Aurora Vale',
  place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613,
  tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
  product: PRODUCT,
};
const canonicalOrder = canonicalizeStudioOrder(usingSample ? sampleOrder : order);
order = { ...order, ...canonicalOrder, product: PRODUCT };
const dateLabel = `${order.d} ${MONTHS[order.mo - 1]} ${order.y}`;
const civilTimeLabel = `${String(order.h).padStart(2, '0')}:${String(order.mi).padStart(2, '0')} ${order.tz}`;
const utcLabel = `${String(order.utc.h).padStart(2, '0')}:${String(order.utc.mi).padStart(2, '0')} UTC`;
const PERSON = {
  name: esc(order.name),
  date: esc(dateLabel),
  time: esc(civilTimeLabel),
  place: esc(order.place),
};
const Y  = order.utc.y, MO = order.utc.mo, D = order.utc.d,
      H  = order.utc.h, MI = order.utc.mi,
      LAT= order.lat, LON = order.lon,
      HSYS = order.house || 'placidus';

const OUT = A_.out || (process.env.TEMP ? process.env.TEMP.replace(/\\/g,'/') + '/ap-out' : 'C:/Users/jonny/AppData/Local/Temp/ap-out');
mkdirSync(OUT,{recursive:true});

const PGL={sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇',chiron:'⚷',northNode:'☊'};
const PNAME={sun:'Sun',moon:'Moon',mercury:'Mercury',venus:'Venus',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',pluto:'Pluto',chiron:'Chiron',northNode:'North Node'};
const ELEM={Aries:'Fire',Leo:'Fire',Sagittarius:'Fire',Taurus:'Earth',Virgo:'Earth',Capricorn:'Earth',Gemini:'Air',Libra:'Air',Aquarius:'Air',Cancer:'Water',Scorpio:'Water',Pisces:'Water'};
const MODE={Aries:'Cardinal',Cancer:'Cardinal',Libra:'Cardinal',Capricorn:'Cardinal',Taurus:'Fixed',Leo:'Fixed',Scorpio:'Fixed',Aquarius:'Fixed',Gemini:'Mutable',Virgo:'Mutable',Sagittarius:'Mutable',Pisces:'Mutable'};
const ELEM_BLURB={
  Fire:'a symbolic emphasis on initiative, momentum and creative action',
  Earth:'a symbolic emphasis on practical form, resources and continuity',
  Air:'a symbolic emphasis on language, ideas and connection',
  Water:'a symbolic emphasis on feeling, memory and imagination',
};


// Paid copy uses a deliberately bounded symbolic vocabulary. The free-site
// corpus is broader and sometimes assertive; commissioned files must never
// turn a chart into a diagnosis, biography, promise, or fixed personality.
const PLANET_THEME={
  Sun:'identity, purpose and creative focus', Moon:'feeling, memory and response',
  Mercury:'language, attention and exchange', Venus:'values, taste and relating',
  Mars:'action, assertion and momentum', Jupiter:'meaning, exploration and perspective',
  Saturn:'structure, limits and responsibility', Uranus:'change, independence and invention',
  Neptune:'imagination, ideals and ambiguity', Pluto:'transformation, power and renewal',
  Chiron:'sensitivity, learning and repair', 'North Node':'development and direction',
};
const PLANET_PROMPT={
  Sun:'Where do identity and creative focus feel most deliberate?',
  Moon:'What helps feeling and response become easier to notice?',
  Mercury:'How do attention and language change with context?',
  Venus:'Which values guide choices about beauty and connection?',
  Mars:'How is action paced, directed, or reconsidered?',
  Jupiter:'Which experiences genuinely broaden perspective?',
  Saturn:'Where do boundaries or responsibilities merit review?',
  Uranus:'Where might change invite careful experimentation?',
  Neptune:'Which ideals inspire, and where would more clarity help?',
  Pluto:'What could renewal mean without forcing a crisis narrative?',
  Chiron:'How might sensitivity be met with care rather than treated as a diagnosis?',
  'North Node':'Which directions feel worth exploring without turning them into destiny?',
};
const SIGN_STYLE={
  Aries:'directness and initiation', Taurus:'steadiness and material focus', Gemini:'curiosity and exchange',
  Cancer:'care and belonging', Leo:'visibility and creative expression', Virgo:'discernment and practical refinement',
  Libra:'balance and mutual consideration', Scorpio:'depth and concentrated attention', Sagittarius:'exploration and wide perspective',
  Capricorn:'structure and long-range effort', Aquarius:'independence and collective thinking', Pisces:'imagination and permeability',
};
const HOUSE_MEANING={
  1:['self-presentation and approach','how a person meets the world and begins things'],
  2:['resources and values','what is valued, maintained, or used for support'],
  3:['communication and learning','language, study, exchange, and the nearby environment'],
  4:['home and private foundations','belonging, home, and the private base of life'],
  5:['creativity and play','creative expression, pleasure, play, and chosen projects'],
  6:['daily routines and craft','daily practice, service, maintenance, and useful skill'],
  7:['partnerships and agreements','one-to-one relationships, agreements, and negotiation'],
  8:['shared resources and change','shared resources, trust, boundaries, and change'],
  9:['study and worldview','learning, travel, belief, and wider frames of reference'],
  10:['public role and vocation','public contribution, reputation, and long-term direction'],
  11:['groups and collective aims','friendships, networks, communities, and shared hopes'],
  12:['rest and inner life','rest, retreat, reflection, and what is processed privately'],
};
const pInterp=(planet,sign)=>`Traditional astrology pairs ${planet} in ${sign} — ${PLANET_THEME[planet]||'this planetary principle'} considered through ${SIGN_STYLE[sign]||`${sign}'s symbolic style`}. As an optional prompt: ${PLANET_PROMPT[planet]||'What associations feel useful here?'}`;
const hMeaning=n=>{ const h=HOUSE_MEANING[n]||['this area of life','this area of life']; return { keyword:h[0], meaning:`In this edition, the ${ord(n)} house supplies symbolic context for ${h[1]}.` }; };
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
  inputHash: STUDIO_INPUT_HASH,
  provenanceRef: PROVENANCE_REF,
  mode: STUDIO_MODE,
  sun: +pos.sun.lon.toFixed(4),
  moon: +pos.moon.lon.toFixed(4),
  asc: +asc.toFixed(4),
  aspects: aspects.length,
};
const paidMeta = paidMetaBlock({ ...order, product: PRODUCT }, chartMeta);

const CSS=`
@page{size:A4;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:210mm;margin:0;}
body{font-family:'Cormorant Garamond',Georgia,serif;color:#EEF4FA;background:#040812;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;height:297mm;padding:22mm 22mm 25mm;position:relative;background:radial-gradient(ellipse 120% 82% at 50% 0%,#0A1424 0%,#07101E 60%,#040812 100%);break-after:page;page-break-after:always;overflow:hidden;overflow-wrap:anywhere;}
.page:last-child{break-after:auto;page-break-after:auto;}
.eyebrow{font-family:'Cinzel',serif;font-size:7.6pt;letter-spacing:.28em;text-transform:uppercase;color:#8BA9FF;opacity:.96;}
h1{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.075em;color:#EEF4FA;font-size:28pt;line-height:1.13;margin:6pt 0;}
h2{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.1em;text-transform:uppercase;font-size:10.2pt;color:#8BA9FF;margin:15pt 0 6pt;display:flex;align-items:center;gap:9pt;}
h2::before{content:'';width:16pt;height:1px;background:#8BA9FF;opacity:.7;}
h3,h2.reading-subhead{font-family:'Cinzel',serif;font-size:9.5pt;line-height:1.35;letter-spacing:.025em;color:#C9D6E3;margin:9pt 0 2.5pt;break-after:avoid;}
h2.reading-subhead{display:block;text-transform:none;}
h2.reading-subhead::before{content:none;}
p{font-size:10pt;line-height:1.47;margin-bottom:6pt;text-wrap:pretty;color:#D7E2ED;orphans:3;widows:3;}
.lede{font-size:11.6pt;line-height:1.48;color:#EEF4FA;font-style:italic;border-left:2px solid rgba(139,169,255,.54);padding-left:12pt;margin:11pt 0;}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding-bottom:22mm;}
.cover .seal{font-size:34pt;color:#8BA9FF;margin-bottom:6pt;}
.meta{font-family:'Cinzel',serif;font-size:8.4pt;letter-spacing:.14em;color:#93A8BF;margin-top:10pt;line-height:1.75;}
.big3{display:flex;gap:9pt;margin:11pt 0;}
.big3 .b{flex:1;border:1px solid rgba(147,168,191,.34);border-radius:5pt;padding:9pt;text-align:center;background:linear-gradient(160deg,rgba(139,169,255,.08),transparent);}
.big3 .g{font-size:22pt;color:#C9D6E3;font-family:'AstroGlyph',serif;}
.big3 .lbl{font-family:'Cinzel',serif;font-size:6.8pt;letter-spacing:.14em;text-transform:uppercase;color:#93A8BF;margin-top:3pt;}
.big3 .v{font-size:11pt;color:#EEF4FA;margin-top:2pt;}
table{width:100%;border-collapse:collapse;font-size:9pt;margin:7pt 0;}
td,th{padding:3.2pt 5pt;border-bottom:1px solid rgba(147,168,191,.2);text-align:left;font-variant-numeric:tabular-nums;}
th{font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:#8BA9FF;}
.glyph{color:#C9D6E3;font-family:'AstroGlyph',serif;font-size:11pt;}
.foot{position:absolute;bottom:11mm;left:22mm;right:22mm;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:6.8pt;letter-spacing:.1em;text-transform:uppercase;color:#93A8BF;border-top:1px solid rgba(147,168,191,.26);padding-top:5pt;}
.watermark{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Cinzel',serif;font-size:40pt;letter-spacing:.14em;color:rgba(139,169,255,.09);white-space:nowrap;pointer-events:none;}
.page::before{content:'';position:absolute;inset:8mm;border:1px solid rgba(147,168,191,.46);pointer-events:none;}
.page::after{content:'';position:absolute;inset:9.4mm;border:1px solid rgba(139,169,255,.18);pointer-events:none;}
.orn{display:flex;align-items:center;gap:10pt;color:#8BA9FF;margin:12pt 0;}
.orn::before,.orn::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(139,169,255,.55),transparent);}
.orn span{font-size:8pt;letter-spacing:.32em;}
.dropcap::first-letter{font-family:'Cinzel',serif;font-size:30pt;line-height:.78;float:left;padding:3pt 7pt 0 0;color:#C9D6E3;}
.balance{display:flex;flex-direction:column;gap:4pt;margin:9pt 0 3pt;}
.balance .row{display:flex;align-items:center;gap:7pt;font-size:8.8pt;}
.balance .el{width:52pt;font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.1em;text-transform:uppercase;color:#93A8BF;}
.balance .track{flex:1;height:5pt;background:rgba(147,168,191,.14);border-radius:3pt;overflow:hidden;}
.balance .fill{height:100%;background:linear-gradient(90deg,#8BA9FF,#A897FF);}
.balance .n{width:14pt;text-align:right;color:#EEF4FA;font-variant-numeric:tabular-nums;}
.cover-wheel{margin:11pt 0 4pt;}
ul.questions{margin:9pt 0 12pt 18pt;font-size:10.4pt;line-height:1.48;color:#D7E2ED;}
ul.questions li{margin-bottom:5pt;}
p.note{font-size:9.2pt;color:#B6C6D8;border-left:2px solid rgba(139,169,255,.38);padding-left:10pt;}
table.placements td,table.placements th{font-size:8.4pt;}
.r{color:#FF8EA8;font-size:8.5pt;}
.symbolic-note{border:1px solid rgba(139,169,255,.34);background:rgba(10,20,36,.72);padding:8pt 10pt;color:#C9D6E3;font-size:9.2pt;}
body.ap-print-light{background:#EEF4FA;color:#101D30;}
body.ap-print-light .page{background:#EEF4FA;color:#101D30;}
body.ap-print-light .page::before{border-color:rgba(16,29,48,.48);}
body.ap-print-light .page::after{border-color:rgba(139,169,255,.36);}
body.ap-print-light h1,body.ap-print-light p,body.ap-print-light .lede,body.ap-print-light .big3 .v{color:#101D30;}
body.ap-print-light h2,body.ap-print-light .eyebrow{color:#315AC9;}
body.ap-print-light h3,body.ap-print-light h2.reading-subhead,body.ap-print-light .glyph,body.ap-print-light .big3 .g{color:#253A58;}
body.ap-print-light .meta,body.ap-print-light .foot,body.ap-print-light p.note{color:#465E7A;}
body.ap-print-light .symbolic-note{background:#F4F7FC;color:#253A58;border-color:#8BA9FF;}
`;

const wm = WATERMARK ? `<div class="watermark">${WATERMARK}</div>` : '';
const wmBig = WATERMARK ? `<div class="watermark" style="font-size:64pt;">${WATERMARK}</div>` : '';
const PLABEL = productLabel(PRODUCT);
const copyLabel = FINAL ? 'Private Studio copy' : WATERMARK === 'FICTIONAL SAMPLE' ? 'Fictional Studio sample' : 'Private proof';
const provenanceLabel = PROVENANCE_REF ? `AP REF ${PROVENANCE_REF}` : '';
const foot=n=>`${wm}<div class="foot"><span>AstroPrecise · ${PLABEL.short}</span><span>${copyLabel}${provenanceLabel ? ` · ${provenanceLabel}` : ''}</span><span>${String(n).padStart(2, '0')} / 19</span></div>`;
const domLineTail = ELEM_BLURB[domEl[0]].replace(/^a /,'');
const chartPatterns = detectChartPatterns(aspects, pos, PNAME);
// ── derived narrative fragments (all from THIS chart) ──
const sunSign=pos.sun.sign, moonSign=pos.moon.sign, ascSign=A.sign;
const lifeAreasCtx = {
  pos, ascSign, mcSign: M.sign, hMeaning, pInterp, sentsFn: sents,
};
const domLine = `This chart has a <strong>${domEl[0]} emphasis</strong> (${domEl[1]} of the seven classical bodies in ${domEl[0].toLowerCase()} signs): ${ELEM_BLURB[domEl[0]]}. Its modal count leans <strong>${domMode[0].toLowerCase()}</strong>, while ${M.sign} sits at the top of the chart — a traditional symbolic lens on public role and visibility.`;
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
    body += `<h1 style="font-size:20pt;">A ${stellium.sign} stellium across&nbsp;<br>the ${hs.join(' & ')} house${hs.length>1?'s':''}.</h1>`;
    body += `<p class="lede">${names} gather in ${stellium.sign} — the most concentrated symbolic pattern in this chart.</p>`;
    body += `<p><strong>${ks.map(k=>`${PGL[k]} ${PNAME[k]} ${pos[k].d}°`).join(' · ')}</strong>, all in ${stellium.sign}. ${sents(pInterp(ks[0]==='sun'?'Sun':PNAME[ks[0]], stellium.sign),2)} Traditional interpretation gives that sign greater emphasis; it does not determine behaviour or outcome.</p>`;
  } else {
    body += `<h1 style="font-size:20pt;">The slow planets&nbsp;<br>and the long arc.</h1>`;
    body += `<p class="lede">The outer planets move slowly, so astrologers often read them as generational symbols before considering their house positions in an individual chart.</p>`;
    ['saturn','uranus','neptune'].forEach(k=>{
      body += `<p><strong>${PGL[k]} ${PNAME[k]} in ${pos[k].sign}</strong> — ${ord(pos[k].house)} house (${hMeaning(pos[k].house).keyword}). ${sents(pInterp(PNAME[k],pos[k].sign),1)}</p>`;
    });
  }
  body += `<p>${PGL.pluto} <strong>Pluto in ${pos.pluto.sign}</strong>, in the ${ord(pos.pluto.house)} house, is traditionally associated with depth and transformation in the area of ${hMeaning(pos.pluto.house).keyword}. ${PGL.chiron} <strong>Chiron in ${pos.chiron.sign}</strong> is read symbolically as a sensitive point rather than as a diagnosis.</p>`;
  body += `<h2 class="reading-subhead">☊ The North Node in ${pos.northNode.sign} — a symbolic growth theme</h2>`;
  body += `<p>Traditional astrology reads the North Node in ${pos.northNode.sign}, in the ${ord(pos.northNode.house)} house of ${hMeaning(pos.northNode.house).keyword}, as a reflective prompt about direction and development. It is not a statement of destiny, deficiency, or required behaviour.</p>`;
  return body;
}

// ── READING (data-driven from THIS chart) ──
const reading=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Personal Sky Keepsake — AstroPrecise</title>${FONTS}<style>${CSS}</style></head><body data-ap-product="${esc(PRODUCT)}" data-ap-page-count="20">${paidMeta}
<main>
<div class="page cover" data-page="cover">
  ${wm}
  <div class="seal">✦</div>
  <p class="eyebrow">${PLABEL.tag}</p>
  <h1>The Sky at Your&nbsp;<br>First Breath</h1>
  <p class="lede" style="border:none;text-align:center;max-width:120mm;">A designed, reflective sky reading for<br><strong style="font-style:normal;color:#EEF4FA;font-size:16pt;">${PERSON.name}</strong></p>
  <div class="cover-wheel">${wheel(300)}</div>
  <p class="meta">${PERSON.date} &nbsp;·&nbsp; ${PERSON.time}<br>${PERSON.place}<br>Sun ${fmt(pos.sun.lon)} · Moon ${fmt(pos.moon.lon)} · ${ascSign} rising</p>
  <p style="position:absolute;bottom:18mm;font-size:7.6pt;letter-spacing:.16em;color:#93A8BF;font-family:'Cinzel',serif;">COMPUTED POSITIONS · TRADITIONAL SYMBOLIC INTERPRETATION · VSOP87 / ELP2000</p>
  ${provenanceLabel ? `<p style="position:absolute;bottom:13mm;font:7pt 'DM Mono',monospace;letter-spacing:.06em;color:#8BA9FF;">${provenanceLabel}</p>` : ''}
</div>

<div class="page" data-page="1">
  <p class="eyebrow">I · The Recorded Moment</p>
  <h1 style="font-size:22pt;">A coordinate in time&nbsp;<br>and place.</h1>
  <p class="lede">The chart begins with the recorded civil time ${PERSON.time} on ${PERSON.date} in ${PERSON.place}. That clock reading was converted to ${utcLabel} before the astronomical positions were calculated.</p>
  <p class="symbolic-note"><strong>How to read this.</strong> The positions and angles are computed; the meanings are traditional astrological interpretations offered for reflection and entertainment. They are not scientific personality findings, predictions, or professional advice.</p>
  <p class="dropcap">Three familiar lenses frame what follows. The <strong>Sun in ${sunSign}</strong> is traditionally associated with identity and purpose. The <strong>Moon in ${moonSign}</strong> is associated with feeling and memory. <strong>${ascSign} rising</strong> describes the eastern horizon at the recorded minute and is read as a lens on first impressions.</p>
  <p>${domLine}</p>
  ${balanceBars()}
  <p style="font-size:9pt;color:#93A8BF;margin-top:6pt;">Modality balance — a traditional classification of how signs initiate, sustain, or adapt:</p>
  ${modalityBars(mC)}
  ${foot(1)}
</div>

<div class="page" data-page="2">
  <p class="eyebrow">II · The Big Three</p>
  <h1 style="font-size:18pt;">The Big Three.</h1>
  <div class="big3">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun · identity lens</div><div class="v">${pos.sun.d}° ${sunSign}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon · feeling lens</div><div class="v">${pos.moon.d}° ${moonSign}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising · horizon lens</div><div class="v">${A.d}° ${ascSign}</div></div>
  </div>
  <h2 class="reading-subhead">${PGL.sun} The Sun in ${sunSign} — ${ord(pos.sun.house)} house (${hMeaning(pos.sun.house).keyword})</h2>
  <p>Your Sun is at ${fmt(pos.sun.lon)}. ${sents(pInterp('Sun',sunSign),3)} In the ${ord(pos.sun.house)} house, this is traditionally read through ${hMeaning(pos.sun.house).keyword.toLowerCase()}.</p>
  <h2 class="reading-subhead">${PGL.moon} The Moon in ${moonSign} — ${ord(pos.moon.house)} house (${hMeaning(pos.moon.house).keyword})</h2>
  <p>${sents(pInterp('Moon',moonSign),3)} The Moon's house is traditionally associated here with ${hMeaning(pos.moon.house).keyword.toLowerCase()}.</p>
  <h2 class="reading-subhead">↑ ${ascSign} rising</h2>
  <p>${chartRulerNarrative(ruler, pos, PNAME[ruler], pInterp, hMeaning)}</p>
  ${foot(2)}
</div>

<div class="page" data-page="3">
  <p class="eyebrow">III · Mind &amp; Expansion</p>
  <h1 style="font-size:20pt;">Language, learning&nbsp;<br>and perspective.</h1>
  <h2 class="reading-subhead">${PGL.mercury} Mercury in ${pos.mercury.sign} — ${ord(pos.mercury.house)} house</h2>
  <p>${sents(pInterp('Mercury',pos.mercury.sign),3)} The house places that symbolism in ${hMeaning(pos.mercury.house).keyword.toLowerCase()}.</p>
  <h2 class="reading-subhead">${PGL.jupiter} Jupiter in ${pos.jupiter.sign} — ${ord(pos.jupiter.house)} house</h2>
  <p>${sents(pInterp('Jupiter',pos.jupiter.sign),3)} Traditional interpretation connects this placement with growth themes in ${hMeaning(pos.jupiter.house).keyword.toLowerCase()}.</p>
  <p class="note">These passages describe a symbolic tradition, not cognitive, educational, financial, or life-outcome claims.</p>
  ${foot(3)}
</div>

<div class="page" data-page="4">
  <p class="eyebrow">IV · Love, Desire &amp; Values</p>
  <h1 style="font-size:20pt;">Relating as a&nbsp;<br>reflective theme.</h1>
  ${loveValuesBlock(pos, pInterp, hMeaning, sents, PGL)}
  <p class="note">This section does not assess compatibility or predict a relationship. It offers traditional symbolism to consider against lived experience.</p>
  ${foot(4)}
</div>

<div class="page" data-page="5">
  <p class="eyebrow">V · Life Areas · One</p>
  ${lifeAreasChapter(lifeAreasCtx, ['love', 'career'])}
  ${foot(5)}
</div>

<div class="page" data-page="6">
  <p class="eyebrow">V · Life Areas · Two</p>
  ${lifeAreasChapter(lifeAreasCtx, ['health', 'purpose'])}
  ${foot(6)}
</div>

<div class="page" data-page="7">
  <p class="eyebrow">VI · Vocation &amp; Mastery</p>
  <h1 style="font-size:20pt;">Public life &amp;&nbsp;<br>the long game.</h1>
  ${mcCareerBlock(M, mc, sunSign, pInterp, hMeaning, sents)}
  ${saturnChapter(pos, pInterp, hMeaning, sents, PGL)}
  <p class="note">Vocation language here is symbolic reflection, not career or financial advice.</p>
  ${foot(7)}
</div>

<div class="page" data-page="8">
  <p class="eyebrow">VII · Architecture of Depth</p>
  ${architecture()}
  ${foot(8)}
</div>

<div class="page" data-page="9">
  <p class="eyebrow">VIII · Houses 1–6</p>
  ${houseTourChapter(houses, pos, hMeaning, fmt, PGL, PNAME, BODIES, 1, 6)}
  ${foot(9)}
</div>

<div class="page" data-page="10">
  <p class="eyebrow">VIII · Houses 7–12</p>
  ${houseTourChapter(houses, pos, hMeaning, fmt, PGL, PNAME, BODIES, 7, 12)}
  ${foot(10)}
</div>

<div class="page" data-page="11">
  <p class="eyebrow">IX · Planet Dossiers · One</p>
  ${planetDossiersChapter(pos, pInterp, hMeaning, sents, PGL, PNAME, BODIES.slice(0,4), { heading: 'The personal planets.', intro: true })}
  ${foot(11)}
</div>

<div class="page" data-page="12">
  <p class="eyebrow">IX · Planet Dossiers · Two</p>
  ${planetDossiersChapter(pos, pInterp, hMeaning, sents, PGL, PNAME, BODIES.slice(4,8), { heading: 'Action, growth &amp; structure.', intro: false })}
  ${foot(12)}
</div>

<div class="page" data-page="13">
  <p class="eyebrow">IX · Planet Dossiers · Three</p>
  ${planetDossiersChapter(pos, pInterp, hMeaning, sents, PGL, PNAME, BODIES.slice(8,12), { heading: 'Outer &amp; nodal symbols.', intro: false })}
  ${foot(13)}
</div>

<div class="page" data-page="14">
  <p class="eyebrow">X · Chart Patterns</p>
  ${chartPatternsChapter(chartPatterns, { pos, hMeaning, pInterp, sentsFn: sents, ord, PNAME })}
  ${foot(14)}
</div>

<div class="page" data-page="15">
  <p class="eyebrow">XI · Planetary Angles · One</p>
  <h1 style="font-size:20pt;">Five close aspects.</h1>
  ${aspectsChapter(aspects, null, PNAME, PGL, 5, 0)}
  ${foot(15)}
</div>

<div class="page" data-page="16">
  <p class="eyebrow">XI · Planetary Angles · Two</p>
  <h1 style="font-size:20pt;">Five more aspects.</h1>
  ${aspectsChapter(aspects, null, PNAME, PGL, 5, 5)}
  ${foot(16)}
</div>

<div class="page" data-page="17">
  <p class="eyebrow">XII · Closing</p>
  <h1 style="font-size:20pt;">Living with the map.</h1>
  ${closingChapter(PERSON.name, sunSign, moonSign, ascSign, domEl, domMode, domLineTail)}
  ${foot(17)}
</div>

<div class="page" data-page="18">
  ${methodologyPage(PERSON, { ...order, utcLabel })}
  ${foot(18)}
</div>

<div class="page" data-page="19">
  <p class="eyebrow">Reference · Computed Positions</p>
  <h1 style="font-size:20pt;">Chart reference.</h1>
  <p class="lede">Longitudes are shown to the displayed degree and minute. Chiron is listed separately from the VSOP87 planetary set; no blanket arcminute-accuracy claim is made for every point.</p>
  ${placementTable(BODIES, pos, PGL, PNAME, fmt, asc, mc)}
  <p class="note">Calculation time: ${utcLabel} · Time zone supplied: ${esc(order.tz)} · Placidus houses · Personal use only.</p>
  ${foot(19)}
</div>
</main>
</body></html>`;

// ── POSTER (A3) ──
const posterCSS=CSS.replace('size:A4','size:A3').replaceAll('width:210mm','width:297mm').replace('height:297mm','height:420mm');
const poster=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Natal Sky Home-Print Plate — AstroPrecise</title>${FONTS}<style>${posterCSS}
.wheel-wrap{display:flex;justify-content:center;margin:6mm 0;}
.placements{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm 10mm;margin-top:8mm;}
.pl{display:flex;align-items:baseline;gap:6pt;font-size:12pt;border-bottom:1px solid rgba(147,168,191,.22);padding:3pt 0;}
.pl .g{font-size:15pt;color:#C9D6E3;font-family:'AstroGlyph',serif;width:18pt;}
.pl .n{font-family:'Cinzel',serif;font-size:8.5pt;letter-spacing:.06em;text-transform:uppercase;color:#93A8BF;width:64pt;}
.pl .v{color:#EEF4FA;font-variant-numeric:tabular-nums;}
.pl .r{color:#FF8EA8;font-size:9pt;}
.poster-kicker{font-family:'DM Mono',monospace;font-size:9pt;letter-spacing:0;text-transform:none;color:#8BA9FF;}
.poster-meta{letter-spacing:0;font-family:'DM Mono',monospace;}
.poster-footer{letter-spacing:0;font-family:'DM Mono',monospace;}
body.ap-print-light .pl{border-color:rgba(16,29,48,.22);}
body.ap-print-light .pl .g,body.ap-print-light .pl .n,body.ap-print-light .pl .v{color:#253A58;}
body.ap-print-light .pl .r{color:#B3264B;}
body.ap-print-light .big3 .lbl{color:#465E7A;}
body.ap-print-light .poster-kicker{color:#315AC9;}
body.ap-print-light .poster-reflection,body.ap-print-light .poster-footer{color:#465E7A!important;}
</style></head><body data-ap-product="${esc(PRODUCT)}" data-ap-page-count="1">${paidMeta}
<div class="page" data-page="plate" style="text-align:center;">
  ${wmBig}
  <p class="poster-kicker">The Natal Chart of</p>
  <h1 style="font-size:34pt;margin-top:2mm;">${PERSON.name}</h1>
  <p class="meta poster-meta">${PERSON.date} &nbsp;·&nbsp; ${PERSON.time} &nbsp;·&nbsp; ${PERSON.place}</p>
  <div class="wheel-wrap">${wheel(620)}</div>
  <div class="big3" style="max-width:200mm;margin:4mm auto;">
    <div class="b"><div class="g">${PGL.sun}</div><div class="lbl">Sun</div><div class="v">${fmt(pos.sun.lon)}</div></div>
    <div class="b"><div class="g">${PGL.moon}</div><div class="lbl">Moon</div><div class="v">${fmt(pos.moon.lon)}</div></div>
    <div class="b"><div class="g">↑</div><div class="lbl">Rising</div><div class="v">${fmt(asc)}</div></div>
  </div>
  <div class="placements">
    ${BODIES.map(k=>`<div class="pl"><span class="g">${PGL[k]}</span><span class="n">${PNAME[k]}</span><span class="v">${fmt(pos[k].lon)}</span> ${pos[k].retro?'<span class="r">℞</span>':''}</div>`).join('')}
    <div class="pl"><span class="g">↑</span><span class="n">Ascendant</span><span class="v">${fmt(asc)}</span></div>
    <div class="pl"><span class="g">MC</span><span class="n">Top of chart</span><span class="v">${fmt(mc)}</span></div>
  </div>
  <p class="poster-reflection" style="margin-top:6mm;font-size:11pt;color:#93A8BF;font-style:italic;">Computed positions · traditional astrological chart · for reflection and entertainment.</p>
  <p class="poster-footer" style="margin-top:4mm;font-size:8pt;color:#93A8BF;">✦ AstroPrecise ✦ &nbsp; HOME-PRINT A3 · RGB · VSOP87 / ELP2000 · PLACIDUS</p>
  ${provenanceLabel ? `<p class="poster-footer" style="margin-top:2mm;font-size:7pt;color:#8BA9FF;">${provenanceLabel}</p>` : ''}
</div>
</body></html>`;

const fileSlug = usingSample ? 'sample' : `order-${sha256(String(order.orderId || 'proof')).slice(0, 12)}`;
const rPath = `${OUT}/reading-${fileSlug}.html`;
const pPath = `${OUT}/poster-${fileSlug}.html`;
const tidyHtml = (html) => html.replace(/[ \t]+$/gm, '');
const readingOut = tidyHtml(reading);
const posterOut = tidyHtml(poster);
const written = [];
if (DELIVER.reading) { writeFileSync(rPath, readingOut, 'utf8'); written.push(rPath); }
if (DELIVER.poster) { writeFileSync(pPath, posterOut, 'utf8'); written.push(pPath); }
console.log(`order-ref: ${fileSlug} · chart computed · ${aspects.length} aspects${stellium ? ' · concentrated sign pattern present' : ''}`);
console.log(`product: ${PRODUCT} → reading:${DELIVER.reading} poster:${DELIVER.poster}`);
console.log(`watermark: ${WATERMARK || '(none — FINAL / paid)'}`);
for (const p of written) console.log('written:', p);

// Publish the fictional, watermarked sample to the site.
if (usingSample && DELIVER.reading && !FINAL) {
  const samplePath = join(ROOT, 'website', 'sample-reading.html');
  const sampleHead = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Watermarked 20-page sample of the AstroPrecise Personal Sky Keepsake: computed positions with clearly labelled traditional astrological interpretation." />
<meta name="robots" content="noindex, follow" />
<link rel="canonical" href="https://astroprecise.app/sample-reading.html" />
<title>Personal Sky Keepsake sample | AstroPrecise</title>
${FONTS}`;
  const sampleHtml = readingOut.replace(
    /<!doctype html><html lang="en"><head><meta charset="utf-8"><title>[^<]*<\/title>\s*<link rel="stylesheet" href="css\/fonts\.css">\s*<style>/i,
    `${sampleHead}<style>`,
  );
  writeFileSync(samplePath, sampleHtml, 'utf8');
  console.log('published:', samplePath);
}
