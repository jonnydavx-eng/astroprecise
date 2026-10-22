// Behavioural: after a Saturn close-up, choosing EARTH must reset the focus,
// so the status reads "Earth", never a stale "Saturn close-up". Runs the real
// ap-observatory-v834.js in a vm against a minimal fake DOM and orrery.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('./website/js/ap-observatory-v834.js', import.meta.url), 'utf8');
let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok ' + msg); else { failures++; console.log('  FAIL ' + msg); } };

function makeEnv({ emitOnEarth }) {
  const els = {};
  const el = (id, extra = {}) => {
    const t = new EventTarget();
    Object.assign(t, { id, textContent: '', value: '', disabled: false, selectedIndex: 0, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      setAttribute(k, v) { this['_' + k] = v; }, getAttribute(k) { return this['_' + k] ?? null; }, removeAttribute() {},
      querySelectorAll: () => [], scrollIntoView() {} }, extra);
    els[id] = t; return t;
  };
  ['sky-focus-title', 'sky-scale-status', 'sky-time-status', 'sky-live-status', 'telemetry', 'mladder', 'dock', 'mobileWorld', 'mobileScale', 'nowBtn', 'scrub', 'scrubLabel'].forEach((id) => el(id));
  const orr = el('orr');
  orr._ready = true;
  orr.flyTo = (key) => { if (key !== 'earth' || emitOnEarth) orr.dispatchEvent(Object.assign(new Event('planetfocus'), { detail: { key, name: key[0].toUpperCase() + key.slice(1) } })); return true; };
  orr.flyScale = (lv) => (String(lv).toUpperCase() === 'EARTH' ? orr.flyTo('earth') : true);
  const doc = new EventTarget();
  Object.assign(doc, { readyState: 'complete', getElementById: (id) => els[id] || null, querySelector: () => null,
    documentElement: { classList: { add() {}, remove() {}, contains: () => false } }, body: { classList: { contains: () => false } } });
  const win = new EventTarget();
  const ctx = { document: doc, window: win, location: { hash: '', pathname: '/observatory.html', search: '' }, history: { replaceState() {} },
    sessionStorage: { getItem: () => null, removeItem() {} }, requestAnimationFrame: (f) => f(), setTimeout: () => 0, setInterval: () => 0,
    URLSearchParams, Date, Number, String, Array, Object, Math, JSON, Event, CustomEvent: Event };
  win.matchMedia = () => ({ matches: false });
  ctx.window = Object.assign(win, { matchMedia: win.matchMedia });
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return { els, orr };
}

for (const emitOnEarth of [true, false]) {
  const tag = emitOnEarth ? 'engine emits Earth focus' : 'engine queues Earth (no focus event yet)';
  const { els, orr } = makeEnv({ emitOnEarth });
  // Saturn close-up from the world dock.
  orr.flyTo('saturn');
  ok(els['sky-scale-status'].textContent === 'Saturn close-up', `${tag}: Saturn close-up is labelled by name`);
  // Phone: pick EARTH on the scale picker.
  els.mobileScale.value = 'EARTH';
  els.mobileScale.dispatchEvent(new Event('change'));
  ok(els['sky-scale-status'].textContent === 'Earth', `${tag}: EARTH after Saturn reads "Earth" (got "${els['sky-scale-status'].textContent}")`);
  ok(els['sky-focus-title'].textContent === 'Earth', `${tag}: focus title is Earth`);
  // And a later Saturn close-up still labels Saturn (focus not stuck on Earth).
  orr.flyTo('saturn');
  ok(els['sky-scale-status'].textContent === 'Saturn close-up', `${tag}: a second Saturn close-up is labelled again`);
}

// A refused flight leaves the honest current label alone.
{
  const { els, orr } = makeEnv({ emitOnEarth: true });
  orr.flyTo('saturn');
  orr.flyScale = () => false;
  els.mobileScale.value = 'EARTH';
  els.mobileScale.dispatchEvent(new Event('change'));
  ok(els['sky-scale-status'].textContent === 'Saturn close-up', 'refused EARTH flight does not claim Earth while Saturn is in view');
}

assert.ok(true);
console.log(failures ? `\n${failures} observatory focus check(s) failed` : 'observatory-focus: all checks passed');
process.exit(failures ? 1 : 0);
