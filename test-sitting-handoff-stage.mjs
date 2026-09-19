import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const chart = read('./website/js/chart-page.js');
const observatory = read('./website/js/ap-observatory-v834.js');
// Execute production functions/controllers against a small event-capable DOM.
// No browser, network, storage writes, renderer or generated files are involved.
function element(value = '') {
  const events = new Map(), classes = new Set(), attrs = new Map();
  return {
    value, dataset: {}, textContent: '',
    classList: {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: name => classes.has(name),
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
    },
    setAttribute: (key, val) => attrs.set(key, val),
    getAttribute: key => attrs.get(key),
    removeAttribute: key => attrs.delete(key),
    addEventListener(name, fn) { events.set(name, [...(events.get(name) || []), fn]); },
    dispatchEvent(event) { for (const fn of events.get(event.type) || []) fn.call(this, event); },
    querySelectorAll: () => [],
    focus() {}, scrollIntoView() {},
  };
}
function section(start, end) {
  const a = chart.indexOf(start), b = chart.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'production function boundaries found');
  return chart.slice(a, b);
}

for (const time of ['', undefined, 'bad', '09:15']) {
  test(`handoff time ${JSON.stringify(time)} replaces stale time and accuracy`, () => {
    const fields = Object.fromEntries(['date-input', 'time-input', 'city-input', 'time-accuracy-input', 'time-accuracy-status'].map(id => [id, element()]));
    fields['time-input'].value = '09:15';
    fields['time-accuracy-input'].value = 'approximate';
    const preset = element(); preset.dataset.time = '09:15'; preset.classList.add('active');
    const document = Object.assign(element(), {
      getElementById: id => fields[id] || null,
      querySelectorAll: selector => selector === '.time-btn' ? [preset] : [],
      querySelector: selector => selector === '.time-btn.active' && preset.classList.contains('active') ? preset : null,
    });
    const context = vm.createContext({ document, Event, URLSearchParams, location: { search: '' },
      window: { matchMedia: () => ({ matches: true }) }, setTimeout() {}, form: null,
      readHandoff: () => ({ date: '2000-02-02', city: 'New town', time }) });
    vm.runInContext(section('  function initFormInteractions()', '  function initPersonalMemory()') +
      section('  function prefillFromHandoff()', '  // ── Results rendering') +
      '\ninitFormInteractions(); prefillFromHandoff();', context);
    assert.equal(fields['date-input'].value, '2000-02-02');
    assert.equal(fields['time-input'].value, time === '09:15' ? time : '');
    assert.equal(fields['time-accuracy-input'].value, time === '09:15' ? 'exact' : 'unknown');
    assert.equal(preset.classList.contains('active'), false);
  });
}

for (const [handoff, search, expectedRestore] of [
  ['{"date":"2000-02-02"}', '', false], ['malformed', '', false],
  [null, '?entry=private-reentry', false], [null, '', true],
]) {
  test(`boot restoration: handoff=${handoff}, search=${search}`, () => {
    const calls = [];
    const memory = { watchChartForm: () => calls.push('watch') };
    const context = vm.createContext({ booted: false, form: {}, URLSearchParams,
      location: { search }, sessionStorage: { getItem: () => handoff },
      window: { APPersonalMemory: memory }, APPersonalMemory: memory,
      initNodeToggle() {}, initAdvancedAccordion() {}, initFormInteractions() {},
      initPersonalMemory: () => calls.push('draft'),
      restoreFromPrivateStorage: () => calls.push('restore-and-submit'),
      prefillFromHandoff: () => calls.push('handoff') });
    vm.runInContext(section('  function boot() {', "  if (document.readyState === 'loading')") + '\nboot();', context);
    assert.equal(calls.includes('draft'), expectedRestore);
    assert.equal(calls.includes('restore-and-submit'), expectedRestore);
    assert.equal(calls.at(-1), 'handoff');
  });
}

function stageFixture(hash = '') {
  const stage = element();
  const ids = Object.fromEntries(['orr', 'sky-focus-title', 'sky-scale-status', 'sky-time-status', 'sky-live-status', 'telemetry', 'nowBtn', 'scrub'].map(id => [id, element()]));
  ids.orr._ready = true; ids.orr.setAttribute('data-engine', 'webgl');
  ids.orr.setLive = () => {}; ids.orr.setJD = () => {}; ids.orr.flyTo = () => true;
  const body = element(); body.classList.add('ap-reading-room');
  const document = Object.assign(element(), { readyState: 'complete', body, documentElement: element(),
    getElementById: id => ids[id] || null, querySelector: selector => selector === '.ap-model-stage' ? stage : null });
  const timers = [];
  const location = { hash, pathname: '/index.html', search: '' };
  const window = Object.assign(element(), { matchMedia: () => ({ matches: false }) });
  vm.runInNewContext(observatory, { document, window, location, URLSearchParams, Date,
    history: { replaceState() {} }, sessionStorage: { getItem: () => null },
    requestAnimationFrame: fn => fn(), setTimeout() {}, setInterval: fn => timers.push(fn) });
  return { stage, ids, document, tick: () => timers.forEach(fn => fn()) };
}

test('System, Earth, birth, focus changes and return-to-now labels follow state', () => {
  const { stage, ids, document, tick } = stageFixture();
  assert.equal(stage.getAttribute('aria-label'), 'Live Solar system now');
  ids.orr.dispatchEvent({ type: 'planetfocus', detail: { key: 'earth', name: 'Earth' } });
  assert.equal(stage.getAttribute('aria-label'), 'Live Earth now');
  document.dispatchEvent({ type: 'ap-personal-sky', detail: { date: '2000-02-02T09:15:00Z', live: false } });
  assert.equal(stage.getAttribute('aria-label'), 'Earth · selected birth view');
  const birthClock = ids['sky-time-status'].textContent;
  ids.orr.dispatchEvent({ type: 'scalechange', detail: { level: 'SYSTEM' } });
  tick();
  assert.equal(stage.getAttribute('aria-label'), 'Solar system · selected birth view');
  assert.equal(ids['sky-time-status'].textContent, birthClock);
  assert.equal(ids['sky-live-status'].textContent, 'Selected moment');
  document.dispatchEvent({ type: 'ap-personal-sky', detail: { live: true } });
  assert.equal(stage.getAttribute('aria-label'), 'Live Solar system now');
  ids.scrub.dispatchEvent({ type: 'input' }); tick();
  assert.equal(stage.getAttribute('aria-label'), 'Solar system at selected moment');
  ids.nowBtn.dispatchEvent({ type: 'click' });
  assert.equal(stage.getAttribute('aria-label'), 'Live Solar system now');
  document.dispatchEvent({ type: 'ap-orrery-unavailable' });
  assert.equal(stage.getAttribute('aria-label'), 'Live sky unavailable');
});

test('explicit public historical focus remains selected rather than live now', () => {
  const { stage, tick } = stageFixture('#m=2000-02-02T09%3A15%3A00Z&public=1&focus=earth');
  tick();
  assert.equal(stage.getAttribute('aria-label'), 'Earth at selected moment');
});
