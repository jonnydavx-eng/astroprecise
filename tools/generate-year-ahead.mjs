/**
 * Year Ahead transit report — 12-month slow-planet transits to natal chart.
 *
 *   node tools/generate-year-ahead.mjs --in order.json [--final]
 */
import { readFileSync, writeFileSync } from 'fs';
import {
  loadEngines, parseArgs, defaultOutDir, ensureOut, buildChart, natalLongitudes,
  scanYearTransits, fmt, esc, slug, sents, PRINT_CSS, htmlDoc, MONTHS,
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
const { order: O, pos } = built;
const natal = natalLongitudes(pos);
const start = new Date();
const end = new Date(start);
end.setMonth(end.getMonth() + 12);
const events = scanYearTransits(E, natal, start, 12);

const aInterp = (type, p1, p2) => {
  try {
    const r = I?.getAspectMeaning?.(String(type).toLowerCase(), p1, p2);
    return (r && typeof r === 'string') ? r : '';
  } catch { return ''; }
};

const byMonth = {};
for (const e of events) {
  const key = e.month;
  if (!byMonth[key]) byMonth[key] = [];
  byMonth[key].push(e);
}

const monthBlocks = Object.entries(byMonth).map(([month, hits]) => `
  <h3>${esc(month)}</h3>
  <table>
    <tr><th>Transit</th><th>Aspect</th><th>Natal</th><th>Orb</th></tr>
    ${hits.map((h) => `<tr><td>${esc(h.transit)}</td><td>${esc(h.glyph)} ${esc(h.aspect)}</td><td>${esc(h.natal)}</td><td>${h.orb.toFixed(1)}°</td></tr>`).join('')}
  </table>
  ${hits[0] ? `<p>${esc(sents(aInterp(hits[0].aspect, hits[0].transit, hits[0].natal), 2) || `${hits[0].transit} ${hits[0].aspect.toLowerCase()} your natal ${hits[0].natal} — a ${hits[0].aspect === 'Square' || hits[0].aspect === 'Opposition' ? 'growth' : 'flow'} point in the month's weather.`)}</p>` : ''}
`).join('');

const body = `
<div class="page">{{WM}}
  <p class="eyebrow">Year Ahead · Transit Report</p>
  <h1>${esc(O.name)}</h1>
  <p class="meta">${esc(O.date)} · ${esc(O.time)} · ${esc(O.place)}</p>
  <p class="lede">From <strong>${MONTHS[start.getMonth()]} ${start.getFullYear()}</strong> through <strong>${MONTHS[end.getMonth()]} ${end.getFullYear()}</strong>, the slow planets — Jupiter, Saturn, Uranus, Neptune, and Pluto — walk across your natal longitudes. This report lists the tightest contacts week by week: where the sky applies pressure, opens doors, or asks for integration.</p>
  <h2>Your natal anchors</h2>
  <p>These transits are measured against your birth chart: Sun ${fmt(pos.sun.lon)} · Moon ${fmt(pos.moon.lon)} · Ascendant ${fmt(built.asc)}. Return to astroprecise.app/transits.html anytime for the live sky against this same map.</p>
  <h2>How to read the months</h2>
  <p>Hard aspects (square, opposition) mark seasons of friction worth planning around — not punishment, but homework. Flowing aspects (trine, sextile) mark support you can lean into if you show up for them. Conjunctions fuse themes: something in that life area gets loud.</p>
  <h2>Month by month</h2>
  ${monthBlocks || '<p>No major slow-planet transits detected in this window — a relatively open year. Outer planets may still contact angles or personal planets; check the live transit tool for daily detail.</p>'}
  <p style="margin-top:16pt;">This is a weather map, not a script. You still choose the journey. Entertainment only — not medical, financial, or legal advice.</p>
  <div class="foot"><span>AstroPrecise · Year Ahead</span><span>${esc(O.name)}</span><span>1</span></div>
</div>`;

const s = slug(O.name);
const path = `${OUT}/year-ahead-${s}.html`;
const html = htmlDoc(`Year Ahead — ${O.name}`, PRINT_CSS, body, WATERMARK);
writeFileSync(path, html.replace('<body>', `<body>${paidMetaBlock({ ...order, product: order.product || 'year-ahead' }, { events: events.length })}`), 'utf8');
console.log(`${O.name} — ${events.length} transit events · Sun ${fmt(pos.sun.lon)}`);
console.log(`watermark: ${WATERMARK || '(none — FINAL)'}`);
console.log('written:', path);