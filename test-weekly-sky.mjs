/**
 * Regression test for the Weekly Sky module (website/js/weekly-sky.js).
 * Run: node test-weekly-sky.mjs   (exit 0 = pass)
 * Golden values are independently documented sky events (eclipse new moon,
 * March equinox, Mercury station), so the scan/bisection pipeline can't
 * silently drift.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const win = {};
for (const f of ['website/js/ephemeris.js', 'website/js/weekly-sky.js']) {
  new Function('window', 'console', readFileSync(join(here, f), 'utf8'))(win, console);
}
const W = win.WeeklySky;

let pass = 0, fail = 0;
const ok = (name, cond, got) => {
  if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`); }
};

// ── Week anchoring (UTC Monday) ──────────────────────────────────────────
{
  const wk = W.computeWeek(new Date(Date.UTC(2026, 6, 2, 15, 0, 0))); // Thu 2026-07-02
  ok('week starts Mon 2026-06-29 UTC', wk.start.toISOString().startsWith('2026-06-29T00:00:00'), wk.start.toISOString());
  ok('week spans 7 days', Math.abs(wk.jdEnd - wk.jdStart - 7) < 1e-9);
  const wkSun = W.computeWeek(new Date(Date.UTC(2026, 6, 5, 23, 0, 0))); // Sun 2026-07-05
  ok('Sunday anchors to same Monday', wkSun.start.toISOString().startsWith('2026-06-29'), wkSun.start.toISOString());
}

// ── Determinism ──────────────────────────────────────────────────────────
{
  const a = JSON.stringify(W.buildWeekReport(new Date(Date.UTC(2026, 6, 2))));
  const b = JSON.stringify(W.buildWeekReport(new Date(Date.UTC(2026, 6, 2))));
  ok('same week → identical report', a === b);
}

// ── Golden: total-eclipse New Moon 2024-04-08 18:21 UTC ──────────────────
{
  const r = W.buildWeekReport(new Date(Date.UTC(2024, 3, 8)));
  const nm = r.events.find((e) => e.kind === 'phase' && e.name === 'New Moon');
  ok('eclipse week finds a New Moon', !!nm);
  if (nm) {
    const t = new Date(nm.tDate);
    ok('New Moon on 2024-04-08 UTC', t.toISOString().startsWith('2024-04-08'), t.toISOString());
    const mins = Math.abs(t.getTime() - Date.UTC(2024, 3, 8, 18, 21)) / 60000;
    ok('New Moon within 20 min of 18:21 UTC', mins < 20, `${mins.toFixed(1)} min off`);
    ok('eclipse New Moon in Aries', nm.sign === 'Aries', nm.sign);
  }
}

// ── Golden: March equinox — Sun enters Aries 2024-03-20 03:06 UTC ────────
{
  const r = W.buildWeekReport(new Date(Date.UTC(2024, 2, 20)));
  const ing = r.events.find((e) => e.kind === 'ingress' && e.body === 'sun');
  ok('equinox week finds Sun ingress', !!ing);
  if (ing) {
    ok('Sun enters Aries', ing.sign === 'Aries', ing.sign);
    const mins = Math.abs(new Date(ing.tDate).getTime() - Date.UTC(2024, 2, 20, 3, 6)) / 60000;
    ok('equinox within 30 min of 03:06 UTC', mins < 30, `${mins.toFixed(1)} min off`);
  }
}

// ── Golden: Mercury stations retrograde ~2024-04-01/02 ───────────────────
{
  const r = W.buildWeekReport(new Date(Date.UTC(2024, 3, 1)));
  const st = r.events.find((e) => e.kind === 'station' && e.body === 'mercury');
  ok('week of 2024-04-01 finds Mercury station', !!st);
  if (st) {
    ok('Mercury station is → retrograde', st.toRetro === true);
    const day = new Date(st.tDate).toISOString().slice(0, 10);
    ok('station lands 04-01/04-02', day === '2024-04-01' || day === '2024-04-02', day);
    ok('station flagged approximate', st.approx === true);
  }
}

// ── Structural invariants on an arbitrary week ───────────────────────────
{
  const r = W.buildWeekReport(new Date(Date.UTC(2026, 6, 2)));
  const inBounds = r.events.every((e) => {
    const t = new Date(e.tDate).getTime();
    return t >= r.weekStart.getTime() && t <= r.weekEnd.getTime() + 1000;
  });
  ok('all events inside the week', inBounds);
  const sorted = r.events.every((e, i, a) => i === 0 || a[i - 1].tJD <= e.tJD);
  ok('events chronologically sorted', sorted);
  ok('every event has title + note', r.events.every((e) => e.title && e.note !== undefined));
  ok('≤5 aspect events', r.events.filter((e) => e.kind === 'aspect').length <= 5);
  const strip = r.moonStrip;
  ok('Moon strip has 1–4 ingresses', strip.length >= 1 && strip.length <= 4, strip.length);
  // every found phase instant must sit on its exact elongation target
  const phaseOk = r.events.filter((e) => e.kind === 'phase').every((e) => {
    const target = { 'New Moon': 0, 'First Quarter': 90, 'Full Moon': 180, 'Last Quarter': 270 }[e.name];
    let d = win.AstroEphemeris.mod360(W._elongation(e.tJD) - target);
    if (d > 180) d -= 360;
    return Math.abs(d) < 0.01;
  });
  ok('phase instants sit on exact elongation', phaseOk);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
