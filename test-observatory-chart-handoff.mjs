import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./website/js/ap-chart-next.js', import.meta.url), 'utf8');

function boot(options = {}) {
  const store = new Map(Object.entries(options.storage || {}));
  const elements = new Map();
  function make(id) {
    const node = {
      id,
      value: '',
      checked: false,
      disabled: false,
      hidden: true,
      textContent: '',
      className: '',
      max: '',
      validity: { valid: true },
      childElementCount: 0,
      parentNode: null,
      children: [],
      setAttribute() {},
      removeAttribute() {},
      focus() { node.focused = true; },
      addEventListener(type, fn) { (node.listeners[type] ||= []).push(fn); },
      listeners: {},
      replaceChildren() { node.children = []; node.childElementCount = 0; },
      append(child) { node.children.push(child); node.childElementCount = node.children.length; child.parentNode = node; },
      before(child) { node.parentNode && node.parentNode.children && node.parentNode.children.push(child); child.parentNode = node.parentNode; },
    };
    return node;
  }
  function el(id) {
    if (!elements.has(id)) elements.set(id, make(id));
    return elements.get(id);
  }
  const form = el('birth-chart-form');
  el('form-error').parentNode = form;
  const location = {
    href: 'https://astroprecise.app/chart.html' + (options.search || ''),
    pathname: '/chart.html',
    search: options.search || '',
    hash: '',
  };
  const history = { state: { kept: true }, replaceState(_state, _title, next) {
    location.href = 'https://astroprecise.app' + next;
    const url = new URL(location.href);
    location.search = url.search;
    location.hash = url.hash;
  } };
  const window = {
    location,
    history,
    sessionStorage: {
      getItem: key => store.has(key) ? store.get(key) : null,
      removeItem: key => store.delete(key),
      setItem: (key, value) => store.set(key, value),
    },
    AstroEphemeris: {
      CITIES: [
        { name: 'London', country: 'GB', lat: 51.5, lon: -0.12, tz: 'Europe/London' },
        { name: 'London', country: 'CA', lat: 42.98, lon: -81.25, tz: 'America/Toronto' },
        { name: 'Paris', country: 'FR', lat: 48.86, lon: 2.35, tz: 'Europe/Paris' },
      ],
    },
    document: {
      getElementById: el,
      createElement() { return make('el'); },
    },
    URL,
    URLSearchParams,
    Intl,
  };
  window.window = window;
  window.globalThis = window;
  runInNewContext(source, window, { filename: 'ap-chart-next.js' });
  return { window, elements, store, location };
}

const carried = boot({
  storage: {
    'ap-chart-handoff': JSON.stringify({
      date: '1990-06-15',
      time: '14:30',
      city: 'London, England, United Kingdom',
      tz: 'Europe/London',
    }),
  },
});
assert.equal(carried.store.has('ap-chart-handoff'), false, 'handoff is consumed once');
assert.equal(carried.elements.get('birth-date').value, '1990-06-15');
assert.equal(carried.elements.get('birth-time').value, '14:30');
assert.equal(carried.elements.get('time-unknown').checked, false);
assert.equal(carried.elements.get('birth-place').value, 'London, England, United Kingdom');
assert.equal(carried.elements.get('place-options').childElementCount, 2, 'both London matches open; coordinates stay unpicked');
assert.equal(carried.window.APChartNext.getResult(), null, 'a carried name is not calculated');
assert.equal(carried.location.search, '', 'birth details never enter the address');
assert.match(carried.elements.get('chart-handoff-note').textContent, /birth date, time and place name/);
assert.match(carried.elements.get('chart-handoff-note').textContent, /Europe\/London|Europe London/);
assert.equal(carried.elements.get('birth-place').focused, true);

const dateOnly = boot({
  storage: { 'ap-chart-handoff': JSON.stringify({ date: '1991-03-02', time: '', city: '' }) },
});
assert.equal(dateOnly.elements.get('birth-date').value, '1991-03-02');
assert.equal(dateOnly.elements.get('birth-time').value, '');
assert.equal(dateOnly.elements.get('time-unknown').checked, false, 'a missing time is not relabelled as unknown');
assert.match(dateOnly.elements.get('chart-handoff-note').textContent, /Add a birth time/);

const blocked = boot({ search: '?entry=private-reentry' });
assert.equal(blocked.location.search, '');
assert.match(blocked.elements.get('chart-handoff-note').textContent, /storage is blocked/);

const ignored = boot({
  storage: { 'ap-chart-handoff': JSON.stringify({ date: 'not-a-date', city: 'x', time: '25:99' }) },
});
assert.equal(ignored.elements.has('chart-handoff-note'), false);
assert.equal(ignored.store.has('ap-chart-handoff'), false);

const api = carried.window.APChartNext;
assert.equal(api.parseHandoff({ date: '2001-01-01', time: '11:11', city: '  York  ', tz: 'Not/AZone' }).tz, '');
assert.equal(api.parseHandoff(['1990-01-01']), null);
assert.equal(api.placeMatches({ name: 'London', country: 'GB' }, 'london, england, united kingdom'), true);
assert.equal(api.placeMatches({ name: 'York', country: 'GB' }, 'new york, usa'), false);

const blank = boot();
const date = blank.elements.get('birth-date');
date.value = '1990-06-15';
blank.elements.get('birth-time').value = '';
blank.elements.get('time-unknown').checked = false;
blank.elements.get('birth-chart-form').listeners.submit[0]({ preventDefault() {} });
assert.equal(blank.elements.get('form-error').hidden, false);
assert.match(blank.elements.get('form-error').textContent, /don’t know my birth time/);
assert.equal(blank.window.APChartNext.getResult(), null, 'a blank time is not calculated as noon');

console.log('PASS observatory handoff prefills the chart without calculating or leaking the minute');
