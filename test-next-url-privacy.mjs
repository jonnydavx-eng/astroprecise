import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const pages = [
  ['index.html', 'main-content'], ['chart.html', 'main'],
  ['deep-reading.html', 'story-chapter-3'], ['sky-card.html', 'main-content'],
];
const savedId = '810951dc-383f-47bf-8108-58095637bb12';
const root = process.env.AP_PRIVACY_ROOT || './website/';
for (const [file, anchor] of pages) {
  const html = readFileSync(new URL(root.replace(/\/?$/, '/') + file, import.meta.url), 'utf8');
  const guard = html.match(/<script\b[^>]*id=["']ap-url-privacy["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(guard, file + ' has its inline privacy guard');
  const referrer = html.search(/<meta\b[^>]*name=["']referrer["'][^>]*content=["']no-referrer["']/i);
  const firstAsset = html.search(/<(?:link\b[^>]*href|script\b[^>]*src|img\b[^>]*src|iframe\b[^>]*src|style\b)/i);
  assert.ok(referrer >= 0 && referrer < guard.index, file + ' sets no-referrer before cleanup');
  assert.ok(firstAsset > guard.index + guard[0].length, file + ' scrubs before any subresource');

  function boot(search, hash, options = {}) {
    const state = { saved: true }, events = {}, replacements = [];
    const location = { pathname: '/astroprecise/' + file, search, hash, replace(target) {
      if (options.blockNavigation) throw Error('blocked');
      replacements.push(target);
    } };
    const window = {
      location, history: { state, replaceState(nextState, title, target) {
        if (options.blockHistory) throw Error('blocked');
        assert.equal(nextState, state, 'history state is preserved');
        const clean = new URL(target, 'https://example.test');
        location.search = clean.search; location.hash = clean.hash;
      } },
      localStorage: { getItem() {
        if (options.blockStorage) throw Error('blocked');
        return options.malformedStorage ? '{' : JSON.stringify([{ id: savedId }]);
      } },
      addEventListener(type, fn) { events[type] = fn; },
      stop() { window.stopped = true; },
    };
    runInNewContext(guard[1], { window, URLSearchParams });
    return { window, location, events, replacements };
  }

  const dirty = '?date=1990-01-01&time=11%3A11&name=Private&lat=51&lon=0&tz=Europe%2FLondon&nosw=1&lite=1';
  const initial = boot(dirty, '#birthDate=1990-01-01&birthTime=11:11');
  assert.equal(initial.location.search, '?nosw=1&lite=1', file + ' removes personal query fields');
  assert.equal(initial.location.hash, '', file + ' removes personal fragments');
  initial.location.hash = '#m=1990-01-01T11:11:00Z';
  initial.events.hashchange();
  assert.equal(initial.location.hash, '', file + ' removes later personal fragments');
  initial.location.hash = '#' + anchor;
  initial.events.hashchange();
  assert.equal(initial.location.hash, '#' + anchor, file + ' retains a real section route');
  const entry = boot('?nosw=0&lite=private&entry=private-reentry', '#%E0%A4%A');
  assert.equal(entry.location.search, file === 'chart.html' ? '?entry=private-reentry' : '');
  if (file === 'chart.html') {
    assert.equal(boot('?entry=private-reentry&date=1990-01-01&time=11:11', '').location.search, '?entry=private-reentry', 'chart keeps the storage-blocked signal and drops birth fields');
    assert.equal(boot('?entry=1990-01-01', '').location.search, '', 'chart rejects an entry value that could carry a birth detail');
    assert.equal(boot('?entry=private-reentry&entry=private-reentry', '').location.search, '', 'chart rejects an ambiguous entry');
  }
  assert.equal(boot('', '#%E0%A4%A').location.hash, '', file + ' discards malformed fragments');
  assert.equal(boot('?NOSW=1&nosw=1&LITE=1', '').location.search, '?nosw=1&lite=1');

  const withId = boot('?id=' + savedId + '&date=1990-01-01', '');
  assert.equal(withId.location.search, file === 'chart.html' ? '?id=' + savedId : '', file + ' preserves only its supported saved-record route');
  for (const options of [{ blockStorage: true }, { malformedStorage: true }]) {
    assert.equal(boot('?id=' + savedId, '', options).location.search, '', file + ' fails closed when the record cannot be resolved');
  }
  assert.equal(boot('?id=private-personal-value', '').location.search, '', file + ' removes unknown IDs');
  assert.equal(boot('?id=' + savedId + '&id=private', '').location.search, '', file + ' removes ambiguous IDs');
  const fallback = boot(dirty, '#private', { blockHistory: true });
  assert.deepEqual(fallback.replacements, ['/astroprecise/' + file], file + ' falls back to a clean same-origin route');
  const stopped = boot(dirty, '#private', { blockHistory: true, blockNavigation: true });
  assert.equal(stopped.window.stopped, true, file + ' stops if both cleanup paths are blocked');
}
console.log('PASS early journey URL privacy, hash changes, safe local routes, and fail-closed cleanup');
