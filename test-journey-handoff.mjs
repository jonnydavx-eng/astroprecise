/**
 * Phone path: Observatory/Life Path sitting → live chart → chapter → sky card.
 * Birth details stay in sessionStorage. The address may keep only the fixed
 * storage-blocked token `entry=private-reentry`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const personalSky = read('./website/js/ap-home-personal-sky.js');
const chartNext = read('./website/js/ap-chart-next.js');
const reading = read('./website/js/ap-reading-next.js');
const keepsake = read('./website/js/ap-keepsake-next.js');
const explore = read('./website/explore.html');
const beacon = read('./website/js/ap-error-beacon.js');

assert.match(personalSky, /sessionStorage\.setItem\('ap-chart-handoff'/);
assert.match(chartNext, /sessionStorage\.getItem\('ap-chart-handoff'/);
assert.match(personalSky, /credentials:\s*'omit'/);
assert.match(personalSky, /referrerPolicy:\s*'no-referrer'/);
assert.match(reading, /if\s*\(\s*!chart\s*\|\|\s*!chart\.positions\s*\)/);
assert.match(reading, /sessionStorage\.setItem\('ap-next-sky'/);
assert.match(keepsake, /sessionStorage\.getItem\('ap-next-sky'/);
assert.equal(/URLSearchParams|location\.(?:search|hash)/.test(keepsake), false);
assert.equal(explore.includes('synastry.html'), false);
assert.equal(explore.includes('href="compatibility.html"'), true);

function element() {
  return {
    value: '',
    textContent: '',
    hidden: true,
    disabled: false,
    checked: false,
    max: '',
    validity: { valid: true },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    focus() { this.focused = true; },
    replaceChildren() { this.childElementCount = 0; },
    append() {},
    childElementCount: 0,
    scrollIntoView() {},
  };
}

function bootChart({ search = '', storage = {}, storageThrows = false } = {}) {
  const ids = new Map();
  const document = {
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, element());
      return ids.get(id);
    },
    querySelector() { return element(); },
    querySelectorAll() { return []; },
    createElement() { return element(); },
    head: { append() {} },
    body: { append() {} },
  };
  const store = new Map(Object.entries(storage));
  const sessionStorage = {
    getItem(key) {
      if (storageThrows) throw new Error('blocked');
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (storageThrows) throw new Error('blocked');
      store.set(key, String(value));
    },
    removeItem(key) {
      if (storageThrows) throw new Error('blocked');
      store.delete(key);
    },
  };
  const location = { search, pathname: '/chart.html', href: 'https://astroprecise.app/chart.html' + search, hash: '' };
  const window = { matchMedia: () => ({ matches: true }), dispatchEvent() {} };
  vm.runInNewContext(chartNext, {
    document, window, location, sessionStorage, localStorage: { getItem: () => '[]' },
    URLSearchParams, Intl, Date, URL, setTimeout, clearTimeout, matchMedia: window.matchMedia,
  });
  return { ids, store, location };
}

const sitting = bootChart({
  storage: {
    'ap-chart-handoff': JSON.stringify({
      date: '1994-03-14',
      time: '09:12',
      city: 'Whitby',
      lat: 54.48,
      lon: -0.61,
      tz: 'Europe/London',
    }),
  },
});
assert.equal(sitting.ids.get('birth-date').value, '1994-03-14');
assert.equal(sitting.ids.get('birth-time').value, '09:12');
assert.equal(sitting.ids.get('birth-place').value, 'Whitby');
assert.equal(sitting.ids.has('chart-result'), false, 'a typed town must not calculate a chart');
assert.equal(sitting.store.has('ap-chart-handoff'), false);
assert.equal(sitting.location.search, '');
assert.match(sitting.ids.get('form-error').textContent, /stayed on this device/);

const dateOnly = bootChart({
  storage: { 'ap-chart-handoff': JSON.stringify({ date: '2001-01-02', time: '', city: '' }) },
});
assert.equal(dateOnly.ids.get('birth-date').value, '2001-01-02');
assert.equal(dateOnly.ids.get('birth-time').value, '');
assert.match(dateOnly.ids.get('form-error').textContent, /birth date stayed on this device/);

const dirtyAddress = bootChart({ search: '?date=1990-01-01&time=11:11&name=Ada&lat=51&lon=0' });
assert.equal(dirtyAddress.ids.get('birth-date').value, '');
assert.equal(dirtyAddress.ids.get('birth-time').value, '');
assert.equal(dirtyAddress.ids.get('birth-place').value, '');

const blocked = bootChart({ search: '?entry=private-reentry', storageThrows: true });
assert.match(blocked.ids.get('form-error').textContent, /not carried in the address/);
assert.equal(blocked.ids.get('birth-date').value, '');

const savedWins = bootChart({
  storage: {
    'ap-chart-handoff': JSON.stringify({ date: '1994-03-14', time: '09:12', city: 'Whitby' }),
    'ap-next-chart-open': '{',
  },
});
assert.equal(savedWins.store.has('ap-chart-handoff'), false);
assert.equal(savedWins.ids.get('birth-date').value, '');
assert.equal(savedWins.ids.get('form-error').hidden, false);

function bootBeacon(href) {
  const events = {};
  const store = new Map();
  const sessionStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  const window = {
    addEventListener(type, fn) { events[type] = fn; },
    location: { href },
  };
  const warnings = [];
  vm.runInNewContext(beacon, {
    window,
    location: window.location,
    sessionStorage,
    document: { querySelector: () => null },
    console: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    URL,
    URLSearchParams,
  });
  return { events, store, warnings };
}

const logged = bootBeacon('https://astroprecise.app/chart.html?date=1990-05-02&name=Ada&nosw=1#m=1990-05-02T11:11:00Z');
logged.events.error({
  message: 'failed for ada@example.com on 1990-05-02',
  filename: 'https://astroprecise.app/js/chart.js?date=1990-05-02',
  lineno: 4,
  colno: 1,
  error: { stack: 'Error\n at birth 1990-05-02T11:11:00Z' },
});
const entries = JSON.parse(logged.store.get('ap_client_errors_v1'));
assert.equal(entries[0].href, 'https://astroprecise.app/chart.html?nosw=1');
assert.equal(/1990-05-02|ada@example\.com/.test(JSON.stringify(entries[0])), false);
assert.equal(logged.warnings.some((line) => /1990-05-02|ada@example\.com/.test(line)), false);

console.log('PASS observatory handoff, private re-entry, chapter guard, and error-log redaction');
