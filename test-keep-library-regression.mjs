import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const librarySource = readFileSync(new URL('./website/js/ap-keep-library.js', import.meta.url), 'utf8');
const skySource = readFileSync(new URL('./website/js/ap-keep-sky.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
const plate = { id: 'fictional', kind: 'chart-plate', blob: new Blob(['sample']) };

function harness() {
  const timers = [], revoked = [], observers = [], opens = [], reads = [];
  const events = new Map(), nodes = new Map();
  let sequence = 0, clicks = 0, closes = 0;
  function element(tag) {
    return {
      tag, children: [], dataset: {}, textContent: '', isConnected: true,
      handlers: {}, attributes: {},
      appendChild(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      setAttribute(key, value) { this.attributes[key] = value; },
      addEventListener(name, fn) { this.handlers[name] = fn; },
      click() { clicks++; }, remove() {},
    };
  }
  const document = {
    readyState: 'loading', documentElement: element('html'), body: element('body'),
    createElement: element, getElementById: id => nodes.get(id),
    addEventListener(name, fn) { events.set(name, fn); },
  };
  const indexedDB = {
    open() { const request = {}; opens.push(request); return request; },
  };
  const context = vm.createContext({
    document, indexedDB, window: { indexedDB }, Blob,
    URL: {
      createObjectURL() { return `blob:fixture-${++sequence}`; },
      revokeObjectURL(url) { revoked.push(url); },
    },
    setTimeout(fn, ms) { timers.push({ fn, ms }); },
    MutationObserver: class {
      constructor(fn) { this.notify = fn; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    },
  });
  function open(index = opens.length - 1) {
    opens[index].result = {
      close() { closes++; },
      transaction() {
        const tx = { objectStore() { return { getAll() {
          const req = {}; reads.push({ req, tx }); return req;
        } }; } };
        return tx;
      },
    };
    opens[index].onsuccess();
  }
  function complete(index, rows = [plate]) {
    const { req, tx } = reads[index];
    req.result = rows; req.onsuccess(); tx.oncomplete();
  }
  async function render(root, rows = [plate]) {
    const pending = context.window.APKeepLibrary.renderShelf(root);
    open(); await flush(); complete(reads.length - 1, rows); await pending;
  }
  return { context, element, events, nodes, timers, revoked, observers, opens, reads,
    open, complete, render, get clicks() { return clicks; }, get closes() { return closes; } };
}

function loadLibrary(h) { vm.runInContext(librarySource, h.context); }
function download(root) { return root.children[0].children[0].children[1].children[0]; }

test('visible shelf URLs survive elapsed timers and are released on replacement and detach', async () => {
  const h = harness(); loadLibrary(h);
  const root = h.element('section');
  await h.render(root);
  const first = download(root).href;
  h.timers.forEach(timer => timer.fn());
  assert.equal(h.revoked.includes(first), false);
  await h.render(root);
  const second = download(root).href;
  assert.equal(h.revoked.includes(first), true);
  assert.equal(h.revoked.includes(second), false);
  root.isConnected = false; h.observers[0].notify();
  assert.equal(h.revoked.includes(second), true);
  assert.equal(h.observers[0].disconnected, true);
});

test('empty library differs from unavailable storage, and retry can recover', async () => {
  const h = harness(); loadLibrary(h);
  const root = h.element('section');
  await h.render(root, []);
  assert.match(root.children[0].textContent, /^Nothing kept yet/);
  const pending = h.context.window.APKeepLibrary.renderShelf(root);
  h.opens.at(-1).onerror(); await pending;
  assert.equal(root.children[0].attributes.role, 'alert');
  assert.match(root.children[0].textContent, /Could not load/);
  root.children[1].handlers.click(); h.open(); await flush();
  h.complete(h.reads.length - 1); await flush();
  assert.match(download(root).href, /^blob:/);
});

test('read errors reject list, close the database, and release a replaced shelf', async () => {
  const h = harness(); loadLibrary(h);
  const root = h.element('section'); await h.render(root);
  const url = download(root).href;
  const direct = h.context.window.APKeepLibrary.list();
  const rejection = assert.rejects(direct, /idb-req/);
  h.open(); await flush(); h.reads.at(-1).req.onerror(); await rejection;
  assert.equal(h.closes, 2);
  const render = h.context.window.APKeepLibrary.renderShelf(root);
  h.open(); await flush(); h.reads.at(-1).tx.onabort(); await render;
  assert.match(root.children[0].textContent, /Could not load/);
  assert.ok(h.revoked.includes(url));
});

test('out-of-order reads cannot replace the newer shelf', async () => {
  const h = harness(); loadLibrary(h);
  const root = h.element('section');
  const first = h.context.window.APKeepLibrary.renderShelf(root);
  h.open(); await flush();
  const second = h.context.window.APKeepLibrary.renderShelf(root);
  h.open(); await flush();
  h.complete(1); await second;
  const url = download(root).href;
  h.complete(0, []); await first;
  assert.equal(download(root).href, url);
  assert.equal(h.revoked.includes(url), false);
});

test('detaching during a pending read prevents new blob URLs', async () => {
  const h = harness(); loadLibrary(h);
  const root = h.element('section');
  const pending = h.context.window.APKeepLibrary.renderShelf(root);
  h.open(); await flush();
  root.isConnected = false; h.observers[0].notify();
  h.complete(0); await pending;
  assert.equal(root.children.length, 0);
});

function loadSky(h, library, blob = new Blob(['sample'])) {
  const button = h.element('button'); button.textContent = 'Keep this sky';
  h.nodes.set('keep-sky', button);
  h.nodes.set('orr', { captureStill() { return { toBlob(fn) { fn(blob); } }; } });
  if (library) {
    h.context.APKeepLibrary = library;
    h.context.window.APKeepLibrary = library;
  }
  vm.runInContext(skySource, h.context);
  h.events.get('DOMContentLoaded')();
  button.handlers.click();
  return button;
}

test('Keep starts download immediately but waits for put before saved feedback', async () => {
  const h = harness(); let finish;
  const button = loadSky(h, { put: () => new Promise(resolve => { finish = resolve; }) });
  await flush();
  assert.equal(h.clicks, 1);
  assert.match(button.textContent, /Download started; saving/);
  finish({ id: 'stored' }); await flush();
  assert.equal(button.textContent, 'Saved to library on this device');
});

for (const [name, library] of [
  ['unavailable', null], ['rejected', { put: () => Promise.reject(new Error('quota')) }],
  ['oversize', { put: () => Promise.resolve(null) }], ['throwing', { put() { throw new Error('blocked'); } }],
]) {
  test(`Keep reports download-started fallback when storage is ${name}`, async () => {
    const h = harness(); const button = loadSky(h, library); await flush();
    assert.equal(h.clicks, 1);
    assert.equal(button.textContent, 'Download started; not saved to library');
  });
}

test('oversize entries are rejected without opening storage', async () => {
  const h = harness(); loadLibrary(h);
  assert.equal(await h.context.window.APKeepLibrary.put({ blob: { size: 3 * 1024 * 1024 } }), null);
  assert.equal(h.opens.length, 0);
});

test('failed canvas encoding never claims saved or downloaded', async () => {
  const h = harness(); const button = loadSky(h, null, null); await flush();
  assert.equal(h.clicks, 0);
  assert.equal(button.textContent, 'Could not keep this sky');
});

for (const saved of [null, { id: 'stored' }]) {
  test(`failed download reports only the actual library result (${saved ? 'saved' : 'failed'})`, async () => {
    const h = harness();
    h.context.URL.createObjectURL = () => { throw new Error('download unavailable'); };
    const button = loadSky(h, { put: () => Promise.resolve(saved) }); await flush();
    assert.equal(h.clicks, 0);
    assert.equal(button.textContent, saved ? 'Saved to library on this device' : 'Could not keep this sky');
  });
}
