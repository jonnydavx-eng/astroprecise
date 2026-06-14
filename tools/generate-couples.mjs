// AstroPrecise — "Two Skies" couples reading + 2-up synastry poster generator.
//
// Computes BOTH partners' real charts (VSOP87/ELP2000), runs the SAME synastry
// engine the website uses (interpretations.js calculateCompatibility), and renders
// a print-ready couples Deep Reading (A4) + a two-chart "Two Skies" poster (A3) as
// standalone HTML you "Print to PDF". The couples prose below is a scaffold drawn
// from the computed scores + cross-chart aspects — a human edit pass (the
// "professionally personalised" promise) is expected before --final delivery.
//
// USAGE
//   node generate-couples.mjs --in couples.json --final
//   couples.json: { "p1": {name,date,time,place,y,mo,d,h,mi,lat,lon,house},
//                   "p2": {name,date,time,place,y,mo,d,h,mi,lat,lon,house} }
//
// FLAGS
//   --final   drop the watermark (paid copy). Omit = "DRAFT" (proofing).
//   --out     output dir (default %TEMP%/ap-out).
//
// With NO args it falls back to two built-in sample people (watermark "SAMPLE").
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// ── load the real engines into a shared sandbox ──
const win = {};
const ROOT = 'C:/Users/jonny/OneDrive/astroprecise/website/js';
new Function('window', 'console', readFileSync(`${ROOT}/ephemeris.js`, 'utf8'))(win, console);
const E = win.AstroEphemeris;
let I = null;
try {
  new Function('window', 'console', 'document', readFileSync(`${ROOT}/interpretations.js`, 'utf8'))(win, console, undefined);
  I = win.AstroInterpretations || win.Interpretations || null;
} catch (e) { console.warn('interpretations.js not loaded — synastry prose limited:', e.message); }

// ── arg parsing ──
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2), n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) a[k] = true; else { a[k] = n; i++; } }
    else a._.push(t);
  }
  return a;
}
const A_ = parseArgs(process.argv.slice(2));
let order = {};
if (A_.in) { try { order = JSON.parse(readFileSync(A_.in, 'utf8')); } catch (e) { console.error('Could not read --in JSON:', e.message); process.exit(1); } }

const FINAL = !!A_.final;
const usingSample = !order.p1 || !order.p2;
const WATERMARK = FINAL ? '' : (usingSample ? 'SAMPLE' : 'DRAFT');

// built-in sample couple (Aurora + Orion) when no input supplied
const SAMPLE = {
  p1: { name: 'Aurora Vale', date: '14 June 1990', time: '03:42 BST', place: 'Whitby, England', y: 1990, mo: 6, d: 14, h: 2, mi: 42, lat: 54.486, lon: -0.613 },
  p2: { name: 'Orion Brooke', date: '2 March 1988', time: '17:10 GMT', place: 'Bath, England', y: 1988, mo: 3, d: 2, h: 17, mi: 10, lat: 51.381, lon: -2.359 },
};
const P1 = order.p1 || SAMPLE.p1;
const P2 = order.p2 || SAMPLE.p2;

const OUT = A_.out || (process.env.TEMP ? process.env.TEMP.replace(/\\/g, '/') + '/ap-out' : 'C:/Users/jonny/AppData/Local/Temp/ap-out');
mkdirSync(OUT, { recursive: true });

// ── shared tables/helpers ──
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SGL = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
const PGL = { sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇',chiron:'⚷',northNode:'☊' };
const PNAME = { sun:'Sun',moon:'Moon',mercury:'Mercury',venus:'Venus',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',pluto:'Pluto',chiron:'Chiron',northNode:'North Node' };
const ELEM = { Aries:'Fire',Leo:'Fire',Sagittarius:'Fire',Taurus:'Earth',Virgo:'Earth',Capricorn:'Earth',Gemini:'Air',Libra:'Air',Aquarius:'Air',Cancer:'Water',Scorpio:'Water',Pisces:'Water' };
const norm = x => ((x % 360) + 360) % 360;
const sd = l => { const s = norm(l); return { sign: SIGNS[Math.floor(s / 30)], idx: Math.floor(s / 30), d: Math.floor(s % 30), m: Math.floor((s % 1) * 60) }; };
const fmt = l => { const x = sd(l); return `${x.d}°${String(x.m).padStart(2, '0')}′ ${x.sign}`; };
const sents = (t, n = 2) => { if (!t) return ''; const m = String(t).match(/[^.!?]+[.!?]+/g); return (m ? m.slice(0, n).join(' ') : String(t)).trim(); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const ASP = [['Conjunction',0,7,'☌'],['Opposition',180,7,'☍'],['Trine',120,6,'△'],['Square',90,6,'□'],['Sextile',60,4,'⚹']];
const BODIES = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','northNode'];

// ── build one person's computed chart ──
function buildPerson(p) {
  const c = E.calculateNatalChart(p.y, p.mo, p.d, p.h, p.mi, p.lat, p.lon, p.house || 'placidus');
  const houses = c.houses;
  const houseOf = lon => { lon = norm(lon); for (let i = 0; i < 12; i++) { const a = houses[i], b = houses[(i + 1) % 12], span = norm(b - a) || 30; if (norm(lon - a) < span) return i + 1; } return 1; };
  const pos = {};
  BODIES.forEach(k => { const q = c.positions[k]; pos[k] = { lon: q.longitude, ...sd(q.longitude), house: houseOf(q.longitude), retro: q.retrograde }; });
  // per-chart natal aspects (for the wheel lines)
  const aspects = []; const ak = BODIES.filter(b => b !== 'northNode');
  for (let i = 0; i < ak.length; i++) for (let j = i + 1; j < ak.length; j++) {
    let dd = Math.abs(pos[ak[i]].lon - pos[ak[j]].lon); if (dd > 180) dd = 360 - dd;
    for (const [nm, ang, orb, gl] of ASP) { if (Math.abs(dd - ang) <= orb) { aspects.push({ a: ak[i], b: ak[j], type: nm, gl }); break; } }
  }
  return {
    name: p.name, date: p.date, time: p.time, place: p.place,
    pos, asc: c.ascendant, mc: c.midheaven, houses, aspects,
    A: sd(c.ascendant), M: sd(c.midheaven),
  };
}
const a = buildPerson(P1), b = buildPerson(P2);

// ── synastry via the website's engine ──
const toCompat = pe => ({ sunSign: pe.pos.sun.sign, moonSign: pe.pos.moon.sign, venusSign: pe.pos.venus.sign, marsSign: pe.pos.mars.sign, mercurySign: pe.pos.mercury.sign, rising: pe.A.sign });
const syn = (I && I.calculateCompatibility) ? I.calculateCompatibility(toCompat(a), toCompat(b))
  : { overall: 50, love: 50, communication: 50, values: 50, longTerm: 50, passion: 50, synastryAspects: [], overview: 'Synastry engine unavailable.' };
const synAspects = (syn.synastryAspects || []).map(x => ({
  p1: x.p1 || x.planet1 || '', p2: x.p2 || x.planet2 || '',
  aspect: x.aspect || x.type || '', orb: x.orb, interpretation: x.interpretation || '',
  harmony: x.harmony || '',
}));

// ── SVG natal wheel for a given person ──
function wheel(P, size) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 8, rSign = R - size * 0.085, rHouse = rSign - size * 0.11, rPlanet = rHouse - size * 0.05, rAspect = rPlanet - size * 0.02;
  const ang = lon => (180 - (norm(lon) - P.asc)) * Math.PI / 180;
  const pt = (lon, r) => [cx + r * Math.cos(ang(lon)), cy - r * Math.sin(ang(lon))];
  let s = '';
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#C9A227" stroke-width="1.5" opacity=".75"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rSign}" fill="none" stroke="#C9A227" stroke-width="1" opacity=".5"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rHouse}" fill="none" stroke="#C9A227" stroke-width=".7" opacity=".35"/>`;
  for (let i = 0; i < 12; i++) {
    const a0 = i * 30, [x1, y1] = pt(a0, rSign), [x2, y2] = pt(a0, R);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#C9A227" stroke-width=".7" opacity=".4"/>`;
    const [gx, gy] = pt(a0 + 15, (R + rSign) / 2);
    s += `<text x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" font-size="${size * 0.04}" fill="#E8C872" text-anchor="middle" dominant-baseline="central" font-family="serif">${SGL[i]}</text>`;
  }
  const AC = { Conjunction:'#E8C872',Trine:'#5fae8a',Sextile:'#5fae8a',Square:'#b06a6a',Opposition:'#c98e5a' };
  P.aspects.forEach(asp => { const [x1, y1] = pt(P.pos[asp.a].lon, rAspect), [x2, y2] = pt(P.pos[asp.b].lon, rAspect);
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${AC[asp.type] || '#888'}" stroke-width=".5" opacity=".4"/>`; });
  BODIES.forEach(k => {
    const [px, py] = pt(P.pos[k].lon, rPlanet);
    s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${size * 0.026}" fill="rgba(10,8,6,.85)" stroke="#C9A227" stroke-width=".6"/>`;
    s += `<text x="${px.toFixed(1)}" y="${py.toFixed(1)}" font-size="${size * 0.03}" fill="#EFE3C0" text-anchor="middle" dominant-baseline="central" font-family="serif">${PGL[k]}</text>`;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="3" fill="#C9A227"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${s}</svg>`;
}

// ── print CSS (matches the single-chart generator) ──
const CSS = `
@page{size:A4;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Cormorant Garamond',Georgia,serif;color:#E8E0D0;background:#070608;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{width:210mm;min-height:297mm;padding:26mm 24mm;position:relative;background:radial-gradient(ellipse 120% 80% at 50% 0%,#0F0B07 0%,#070608 60%,#040305 100%);page-break-after:always;overflow:hidden;}
.page:last-child{page-break-after:auto;}
.eyebrow{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.34em;text-transform:uppercase;color:#C9A227;opacity:.85;}
h1{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.1em;color:#EFE3C0;font-size:28pt;line-height:1.15;margin:6pt 0;}
h2{font-family:'Cinzel',serif;font-weight:600;letter-spacing:.12em;text-transform:uppercase;font-size:11pt;color:#C9A227;margin:18pt 0 8pt;}
h3{font-family:'Cinzel',serif;font-size:10.5pt;letter-spacing:.04em;color:#E8C872;margin:12pt 0 3pt;}
p{font-size:11.5pt;line-height:1.62;margin-bottom:8pt;text-wrap:pretty;color:#DCD3C0;}
.lede{font-size:13pt;line-height:1.6;color:#E8E0D0;font-style:italic;border-left:2px solid rgba(201,162,39,.4);padding-left:14pt;margin:14pt 0;}
.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:245mm;}
.cover .seal{font-size:40pt;color:#C9A227;margin-bottom:8pt;}
.meta{font-family:'Cinzel',serif;font-size:9pt;letter-spacing:.2em;color:#A89E88;margin-top:14pt;line-height:2;}
.twocol{display:flex;gap:14pt;margin:14pt 0;}
.twocol .col{flex:1;border:1px solid rgba(201,162,39,.2);border-radius:8pt;padding:12pt;background:linear-gradient(160deg,rgba(201,162,39,.05),transparent);}
.twocol .who{font-family:'Cinzel',serif;font-size:11pt;color:#EFE3C0;letter-spacing:.06em;margin-bottom:6pt;}
.b3{font-size:10.5pt;color:#DCD3C0;line-height:1.9;}
.b3 .g{color:#E8C872;font-family:serif;}
.scorebig{font-family:'Cinzel',serif;font-size:46pt;color:#E8C872;}
.cat{display:flex;align-items:center;gap:10pt;margin:6pt 0;font-size:10.5pt;}
.cat .lbl{width:120pt;font-family:'Cinzel',serif;font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;color:#A89E88;}
.cat .track{flex:1;height:6pt;background:rgba(201,162,39,.12);border-radius:4pt;overflow:hidden;}
.cat .fill{height:100%;background:linear-gradient(90deg,#C9A227,#E8C872);}
.cat .pct{width:36pt;text-align:right;color:#EFE3C0;font-variant-numeric:tabular-nums;}
table{width:100%;border-collapse:collapse;font-size:10pt;margin:8pt 0;}
td,th{padding:4pt 6pt;border-bottom:1px solid rgba(201,162,39,.14);text-align:left;font-variant-numeric:tabular-nums;}
th{font-family:'Cinzel',serif;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;color:#C9A227;}
.glyph{color:#E8C872;font-family:serif;font-size:12pt;}
.foot{position:absolute;bottom:12mm;left:24mm;right:24mm;display:flex;justify-content:space-between;font-family:'Cinzel',serif;font-size:7pt;letter-spacing:.16em;text-transform:uppercase;color:#5E5748;border-top:1px solid rgba(201,162,39,.15);padding-top:6pt;}
.watermark{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Cinzel',serif;font-size:60pt;letter-spacing:.2em;color:rgba(201,162,39,.06);white-space:nowrap;pointer-events:none;}
`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">`;
const wm = WATERMARK ? `<div class="watermark">${WATERMARK}</div>` : '';
const wmBig = WATERMARK ? `<div class="watermark" style="font-size:90pt;">${WATERMARK}</div>` : '';
const both = `${esc(a.name)} & ${esc(b.name)}`;
const foot = n => `<div class="foot"><span>AstroPrecise · Two Skies</span><span>${both}</span><span>${n}</span></div>`;

const b3 = P => `<div class="b3">
  <span class="g">${PGL.sun}</span> Sun ${P.pos.sun.d}° ${P.pos.sun.sign}<br>
  <span class="g">${PGL.moon}</span> Moon ${P.pos.moon.d}° ${P.pos.moon.sign}<br>
  <span class="g">↑</span> ${P.A.sign} Rising<br>
  <span class="g">${PGL.venus}</span> Venus ${P.pos.venus.sign} &nbsp; <span class="g">${PGL.mars}</span> Mars ${P.pos.mars.sign}
</div>`;

const CATS = [['Romantic Attraction','love'],['Emotional Depth','passion'],['Communication','communication'],['Long-Term Potential','longTerm'],['Shared Values','values']];
const catRow = ([lbl, key]) => { const v = Math.round(syn[key] || 0); return `<div class="cat"><span class="lbl">${lbl}</span><span class="track"><span class="fill" style="width:${v}%"></span></span><span class="pct">${v}%</span></div>`; };

// ── READING (A4) ──
const reading = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head><body>
<div class="page cover">
  ${wm}
  <div class="seal">✦</div>
  <p class="eyebrow">Two Skies · A Couples Reading</p>
  <h1>Where Two Charts<br>Meet</h1>
  <p class="lede" style="border:none;text-align:center;max-width:130mm;">The synastry of<br><strong style="font-style:normal;color:#EFE3C0;font-size:16pt;">${both}</strong></p>
  <p class="meta">${esc(a.name)} — ${esc(a.date)} · ${esc(a.place)}<br>${esc(b.name)} — ${esc(b.date)} · ${esc(b.place)}</p>
  <p style="position:absolute;bottom:18mm;font-size:8pt;letter-spacing:.2em;color:#5E5748;font-family:'Cinzel',serif;">BOTH CHARTS COMPUTED FROM THE REAL SKY · VSOP87 · ELP2000</p>
</div>

<div class="page">
  <p class="eyebrow">I · Two People, Two Skies</p>
  <h1 style="font-size:22pt;">The two charts,<br>side by side.</h1>
  <p class="lede">Every relationship is two whole skies learning to share one horizon. Here is each of you, in the old language, before we look at what happens between you.</p>
  <div class="twocol">
    <div class="col"><div class="who">${esc(a.name)}</div>${b3(a)}</div>
    <div class="col"><div class="who">${esc(b.name)}</div>${b3(b)}</div>
  </div>
  <p>${esc(a.name)} leads with a ${a.pos.sun.sign} Sun and a ${a.pos.moon.sign} Moon; ${esc(b.name)} with a ${b.pos.sun.sign} Sun and a ${b.pos.moon.sign} Moon. Where your elements agree, things flow without translation; where they differ, the difference is the work — and often the attraction.</p>
  ${foot('1')}
</div>

<div class="page">
  <p class="eyebrow">II · The Overall Weather</p>
  <h1 style="font-size:22pt;">How your skies<br>get along.</h1>
  <div style="display:flex;align-items:center;gap:18pt;margin:14pt 0;">
    <div style="text-align:center;"><div class="scorebig">${Math.round(syn.overall || 0)}</div><div style="font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.18em;color:#A89E88;">OVERALL</div></div>
    <div style="flex:1;">${CATS.map(catRow).join('')}</div>
  </div>
  <p>${esc(syn.overview || '')}</p>
  ${foot('2')}
</div>

<div class="page">
  <p class="eyebrow">III · The Conversations Between Your Charts</p>
  <h1 style="font-size:20pt;">Cross-chart aspects.</h1>
  <p>These are the angles your planets make to <em>each other</em> — the real wiring of the connection. Harmony aspects flow; tension aspects are where the relationship does its growing.</p>
  <table><tr><th>Between</th><th>Aspect</th><th>Orb</th></tr>
  ${synAspects.slice(0, 12).map(x => `<tr><td>${esc(a.name.split(' ')[0])}'s ${esc(x.p1)} &nbsp;·&nbsp; ${esc(b.name.split(' ')[0])}'s ${esc(x.p2)}</td><td>${esc(x.aspect)}</td><td>${x.orb !== undefined ? Number(x.orb).toFixed(1) + '°' : '—'}</td></tr>`).join('')}
  </table>
  ${synAspects[0] && synAspects[0].interpretation ? `<p style="margin-top:12pt;"><strong>${esc(synAspects[0].p1)} ${esc(String(synAspects[0].aspect).toLowerCase())} ${esc(synAspects[0].p2)}</strong> — ${esc(sents(synAspects[0].interpretation, 2))}</p>` : ''}
  ${foot('3')}
</div>

<div class="page">
  <p class="eyebrow">IV · The Closing</p>
  <h1 style="font-size:20pt;">One horizon.</h1>
  <p class="lede">${esc(a.name)} & ${esc(b.name)} — your charts score ${Math.round(syn.overall || 0)} for fit, but a chart is not a verdict. It is a map of where you flow and where you stretch.</p>
  <p>Lead with what already agrees between you, and treat the friction points not as faults but as the places the relationship is asking each of you to grow. This reading is orientation, not prediction — the sky you were each born under, and the geometry between them, drawn honestly. What you build on it is yours.</p>
  <p style="margin-top:18pt;font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.2em;color:#5E5748;">✦ This reading is computed; the words are then personally edited before delivery. ✦</p>
  ${foot('4')}
</div>
</body></html>`;

// ── POSTER (A3, two wheels) ──
const posterCSS = CSS.replace('size:A4', 'size:A3').replace('width:210mm;min-height:297mm;padding:26mm 24mm', 'width:297mm;min-height:420mm;padding:22mm');
const poster = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${posterCSS}
.skies{display:flex;justify-content:center;gap:8mm;margin:8mm 0;}
.sky{text-align:center;}
.sky .nm{font-family:'Cinzel',serif;font-size:14pt;color:#EFE3C0;letter-spacing:.08em;margin-bottom:3mm;}
.sky .dt{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.14em;color:#A89E88;margin-top:2mm;}
.amp{display:flex;align-items:center;font-family:'Cinzel',serif;font-size:30pt;color:#C9A227;}
.scoreline{text-align:center;font-family:'Cinzel',serif;letter-spacing:.1em;color:#E8C872;margin-top:6mm;font-size:13pt;}
</style></head><body>
<div class="page" style="text-align:center;">
  ${wmBig}
  <p class="eyebrow">Two Skies</p>
  <h1 style="font-size:30pt;margin-top:2mm;">${both}</h1>
  <div class="skies">
    <div class="sky"><div class="nm">${esc(a.name)}</div>${wheel(a, 360)}<div class="dt">${esc(a.date)} · ${esc(a.place)}</div></div>
    <div class="amp">&amp;</div>
    <div class="sky"><div class="nm">${esc(b.name)}</div>${wheel(b, 360)}<div class="dt">${esc(b.date)} · ${esc(b.place)}</div></div>
  </div>
  <div class="scoreline">Overall synastry · ${Math.round(syn.overall || 0)} / 100</div>
  <div style="max-width:200mm;margin:6mm auto 0;">${CATS.map(catRow).join('')}</div>
  <p style="margin-top:10mm;font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.28em;color:#5E5748;">✦ ASTROPRECISE ✦ &nbsp; BOTH CHARTS COMPUTED FROM THE REAL SKY</p>
</div>
</body></html>`;

const slug = `${a.name}-${b.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'couple';
const rPath = `${OUT}/couples-${slug}.html`, pPath = `${OUT}/twoskies-${slug}.html`;
writeFileSync(rPath, reading, 'utf8');
writeFileSync(pPath, poster, 'utf8');
console.log(`${both} — overall ${Math.round(syn.overall || 0)} | ${synAspects.length} cross-chart aspects`);
console.log(`watermark: ${WATERMARK || '(none — FINAL)'}`);
console.log('written:', rPath);
console.log('written:', pPath);
