// Every public sample that shows the fictional Aurora Vale must agree to the minute:
// the Keepsake page (website/sample-reading.html), its printed PDF, and the Minute
// Plate that tools/make-studio-samples.mjs renders for her (and embeds in the Whole Sky
// PDF and the v930 Whole Sky shop image). All three are checked against one fresh
// engine call. Positions only; houses and copy are out of scope here.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEngines, buildChart, fmt } from './tools/fulfil-shared.mjs';
import { AURORA } from './tools/make-studio-samples.mjs';
import { minutePlateSvg, helioLongitudes, loadStills } from './tools/minute-plate.mjs';

let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !extra ? '' : `  (${extra})`}`); if (!cond) fails++; };
const { E } = loadEngines();
const chart = buildChart({ ...AURORA }, E);
const BODIES = { sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', chiron: 'Chiron', northNode: 'North Node' };
const want = Object.fromEntries(Object.keys(BODIES).map((k) => [k, fmt(chart.pos[k].lon)]));
want.asc = fmt(chart.asc); want.mc = fmt(chart.mc);
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

// 1. Keepsake page: placement table, cover line, prose and big-three cards
const html = readFileSync(join('website', 'sample-reading.html'), 'utf8');
const page = text(html);
for (const [k, label] of Object.entries(BODIES)) {
  const m = page.match(new RegExp(`${label} (\\d{1,2}°\\d{2}′) (\\w+) \\d{1,2}(?:st|nd|rd|th) \\2`));
  ok(`keepsake table: ${label} ${want[k]}`, m && `${m[1]} ${m[2]}` === want[k], m ? `${m[1]} ${m[2]}` : 'row not found');
}
ok(`keepsake table: Ascendant ${want.asc}`, page.includes(`Ascendant ${want.asc}`));
ok(`keepsake table: MC ${want.mc}`, page.includes(`Top of the chart ${want.mc}`));
ok('keepsake cover line: Sun and Moon', page.includes(`Sun ${want.sun} · Moon ${want.moon}`));
// every arcminute label on the page must be one of the engine labels (catches stale prose)
const engineSet = new Set(Object.values(want));
const stray = [...page.matchAll(/(\d{1,2}°\d{2}′) (Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)/g)].map((m) => `${m[1]} ${m[2]}`).filter((l) => !engineSet.has(l));
ok('keepsake: every arcminute position on the page is an engine position', stray.length === 0, stray.join(', '));
// whole-degree mentions (big-three cards, stellium line) use the floor of the same longitude
for (const [k, label] of [['sun', 'Sun'], ['moon', 'Moon']]) ok(`keepsake big three: ${label} ${Math.floor(chart.pos[k].lon % 30)}°`, page.includes(`${Math.floor(chart.pos[k].lon % 30)}° ${want[k].split(' ')[1]}`));
for (const k of ['saturn', 'uranus', 'neptune']) ok(`keepsake stellium line: ${BODIES[k]} ${Math.floor(chart.pos[k].lon % 30)}°`, new RegExp(`${BODIES[k]} ${Math.floor(chart.pos[k].lon % 30)}°(?!\\d)`).test(page));
// aspect orbs: the ten listed, in engine order, to 0.1°
const ASP = [['Conjunction', 0, 7], ['Opposition', 180, 7], ['Trine', 120, 6], ['Square', 90, 6], ['Sextile', 60, 4]];
const ak = Object.keys(BODIES).filter((b) => b !== 'northNode'); const asp = [];
for (let i = 0; i < ak.length; i++) for (let j = i + 1; j < ak.length; j++) { let d = Math.abs(chart.pos[ak[i]].lon - chart.pos[ak[j]].lon); if (d > 180) d = 360 - d; for (const [, a, o] of ASP) { const x = Math.abs(d - a); if (x <= o) { asp.push({ a: BODIES[ak[i]], b: BODIES[ak[j]], orb: x }); break; } } }
asp.sort((x, y) => x.orb - y.orb);
const listed = [...html.matchAll(/<h2 class="reading-subhead">(\d+)\. (\w+) and (\w+) — [^<]*<\/h2><p>[^(]*\((\d+\.\d)° off exact\)/g)].map((m) => ({ n: +m[1], a: m[2], b: m[3], orb: m[4] }));
ok('keepsake lists ten aspects', listed.length === 10);
listed.forEach((l, i) => ok(`aspect ${l.n}: ${l.a}–${l.b} ${l.orb}° = engine #${i + 1}`, l.n === i + 1 && asp[i] && asp[i].a === l.a && asp[i].b === l.b && asp[i].orb.toFixed(1) === l.orb, asp[i] ? `${asp[i].a}–${asp[i].b} ${asp[i].orb.toFixed(1)}` : ''));
const rows = [...html.matchAll(/<tr><td><span class="glyph">[^<]+<\/span> (\w+) &nbsp;.&nbsp; <span class="glyph">[^<]+<\/span> (\w+)<\/td><td>[^<]*<\/td><td>(\d+\.\d)°<\/td><\/tr>/g)].map((m) => `${m[1]}–${m[2]} ${m[3]}`);
ok('aspect tables match the paragraphs', rows.join('|') === listed.map((l) => `${l.a}–${l.b} ${l.orb}`).join('|'));
const meta = JSON.parse(html.match(/<!-- ap-paid-meta:(\{.*?\}) -->/)[1]);
ok('hidden ap-paid-meta: sun / moon / asc / aspect count', meta.sun === +chart.pos.sun.lon.toFixed(4) && meta.moon === +chart.pos.moon.lon.toFixed(4) && meta.asc === +chart.asc.toFixed(4) && meta.aspects === asp.length);

// 2. The plate rendered for Aurora (the same buildChart call make-studio-samples uses)
const svg = minutePlateSvg({ W: 1200, H: 1800, layout: 'print', light: true, person: AURORA.name, date: AURORA.date, time: AURORA.time, place: AURORA.place, chart, helio: helioLongitudes(E, AURORA), stills: await loadStills(8) });
const plateTxt = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1].trim()).filter(Boolean);
const plateDeg = plateTxt.filter((t) => /^\d{1,2}°\d{2}′$/.test(t));
const plateSigns = plateTxt.filter((t) => /^(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)$/.test(t));
const plateBig = plateDeg.slice(0, 3).map((d, i) => `${d} ${plateSigns[i]}`);
ok('plate shows the big three', plateBig.length === 3 && plateBig.every((x) => !x.includes('undefined')), plateBig.join(' / '));
ok(`plate Sun = keepsake Sun (${want.sun})`, plateBig[0] === want.sun, plateBig[0]);
ok(`plate Moon = keepsake Moon (${want.moon})`, plateBig[1] === want.moon, plateBig[1]);
ok(`plate Rising = keepsake Ascendant (${want.asc})`, plateBig[2] === want.asc, plateBig[2]);

// 3. The committed Keepsake PDF carries the same labels (text layer)
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(join('website', 'downloads', 'studio', 'personal-sky-keepsake-sample.pdf'))), useSystemFonts: false, disableFontFace: true }).promise;
let pdfText = '';
for (let i = 1; i <= doc.numPages; i++) pdfText += ' ' + (await (await doc.getPage(i)).getTextContent()).items.map((t) => t.str).join(' ');
pdfText = pdfText.replace(/\s+/g, ' ');
for (const [k, label] of Object.entries(BODIES)) ok(`keepsake PDF: ${label} ${want[k]}`, pdfText.includes(want[k]));
const pdfStray = [...pdfText.matchAll(/(\d{1,2}°\d{2}′) (Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)/g)].map((m) => `${m[1]} ${m[2]}`).filter((l) => !engineSet.has(l));
ok('keepsake PDF: no position other than the engine\'s', pdfStray.length === 0, [...new Set(pdfStray)].join(', '));
await doc.cleanup?.();

console.log(fails ? `\n${fails} sample-degree check(s) failed` : '\nall sample degree checks passed');
process.exit(fails ? 1 : 0);
