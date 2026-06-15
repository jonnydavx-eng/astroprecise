/**
 * Solar Return PDF generator — return moment + chart at birth place.
 *
 *   node tools/generate-solar-return.mjs --in order.json [--final]
 */
import { readFileSync, writeFileSync } from 'fs';
import {
  loadEngines, parseArgs, defaultOutDir, ensureOut, buildChart, nextSolarReturn,
  fmt, esc, slug, sents, ord, PGL, PNAME, PRINT_CSS, htmlDoc, MONTHS,
  paidMetaBlock, isPaidOrder,
} from './fulfil-shared.mjs';

const A = parseArgs(process.argv.slice(2));
let order = {};
if (A.in) order = JSON.parse(readFileSync(A.in, 'utf8'));
const FINAL = !!A.final || isPaidOrder(order);
const WATERMARK = FINAL ? '' : 'DRAFT';
const OUT = ensureOut(A.out || defaultOutDir());
const { E, I } = loadEngines();

const built = buildChart(order, E);
const { order: O, pos, asc, mc, A: Asc, M } = built;
const sr = nextSolarReturn(E, O.y, O.mo, O.d, O.h, O.mi, new Date());
const srChart = E.calculateNatalChart(sr.date.year, sr.date.month, sr.date.day, sr.date.hour, sr.date.minute, O.lat, O.lon, O.house);
const srPos = {};
['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].forEach((k) => {
  const p = srChart.positions[k];
  srPos[k] = { lon: p.longitude, sign: E.signOf(p.longitude), house: null };
});
const srAsc = srChart.ascendant;
const srAscSign = E.signOf(srAsc);

const pInterp = (planet, sign) => (I?.getPlanetInterpretation)
  ? I.getPlanetInterpretation(planet, sign)
  : `${planet} in ${sign} colours the year ahead.`;

const returnLabel = `${MONTHS[sr.date.month - 1]} ${sr.date.day}, ${sr.date.year} at ${String(sr.date.hour).padStart(2, '0')}:${String(sr.date.minute).padStart(2, '0')} UT`;
const body = `
<div class="page">{{WM}}
  <p class="eyebrow">Solar Return · AstroPrecise</p>
  <h1>${esc(O.name)}</h1>
  <p class="meta">Natal · ${esc(O.date)} · ${esc(O.time)} · ${esc(O.place)}</p>
  <p class="lede">Each year the Sun returns to the exact degree it held at your birth — ${fmt(built.pos.sun.lon)}. Your next return falls on <strong>${esc(returnLabel)}</strong>. We cast the chart for that instant at your birth place (${esc(O.place)}): the Ascendant and houses describe the <em>tone</em> of the year ahead. If you will celebrate elsewhere, recast for that location — geography changes the rising sign.</p>
  <h2>Return Ascendant · ${esc(srAscSign)}</h2>
  <p>The solar return Ascendant is the year's front door — how the next twelve months present themselves publicly. With <strong>${esc(srAscSign)}</strong> rising, the chapter leans toward ${sents(pInterp('Ascendant', srAscSign), 2) || esc(srAscSign.toLowerCase()) + ' themes in how you meet the world.'}</p>
  <h2>Return Sun · ${esc(srPos.sun.sign)}</h2>
  <p>The return Sun always occupies your natal Sun sign — here, <strong>${esc(srPos.sun.sign)}</strong> — concentrating solar purpose for the year. ${sents(pInterp('Sun', srPos.sun.sign), 2)}</p>
  <h2>Key return placements</h2>
  <table>
    <tr><th>Planet</th><th>Sign</th><th>Note</th></tr>
    ${['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'].map((k) =>
      `<tr><td><span class="glyph">${PGL[k]}</span> ${PNAME[k]}</td><td>${esc(srPos[k].sign)}</td><td>${esc(sents(pInterp(PNAME[k], srPos[k].sign), 1))}</td></tr>`
    ).join('')}
  </table>
  <h2>Natal reference</h2>
  <p>Sun ${fmt(pos.sun.lon)} · Moon ${fmt(pos.moon.lon)} · Rising ${fmt(asc)} · MC ${fmt(mc)} (${Asc.sign} / ${M.sign}).</p>
  <p style="margin-top:12pt;">Pair this return with your natal Deep Reading for context — the return chart colours the year; the natal chart is the instrument. Computed from VSOP87 ephemeris. Entertainment only — not medical, financial, or legal advice.</p>
  <div class="foot"><span>AstroPrecise · Solar Return</span><span>${esc(O.name)}</span><span>1</span></div>
</div>`;

const s = slug(O.name);
const path = `${OUT}/solar-return-${s}.html`;
const html = htmlDoc(`Solar Return — ${O.name}`, PRINT_CSS, body, WATERMARK);
writeFileSync(path, html.replace('<body>', `<body>${paidMetaBlock({ ...order, product: order.product || 'solar-return' }, { returnYear: sr.date.year })}`), 'utf8');
console.log(`${O.name} — return ${returnLabel} · ASC ${srAscSign}`);
console.log(`watermark: ${WATERMARK || '(none — FINAL)'}`);
console.log('written:', path);