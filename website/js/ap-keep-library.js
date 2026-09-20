/**
 * Personal keep library — schematic plates on this device only.
 *
 * Birth-hour stills, sky cards and chart plates. IndexedDB, max 12.
 * Never a LIVE badge. Never a photograph claim. Birth minutes never
 * go in the address bar; this store never leaves the origin.
 */
(function () {
  'use strict';

  var DB_NAME = 'ap-keep-library';
  var STORE = 'plates';
  var VERSION = 1;
  var MAX = 12;
  var MAX_BYTES = 2.8 * 1024 * 1024;
  var KINDS = {
    'birth-hour': 'Birth-hour still',
    'sky-card': 'Sky card',
    'chart-plate': 'Chart plate',
    observatory: 'Observatory still',
    'sync-card': 'Synchronicity card'
  };

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('no-idb'));
        return;
      }
      var req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('idb-open')); };
    });
  }

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error || new Error('idb-tx')); };
      tx.onabort = function () { reject(tx.error || new Error('idb-abort')); };
    });
  }

  function requestToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('idb-req')); };
    });
  }

  function uid() {
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function list() {
    return openDb().then(function (db) {
      return Promise.resolve().then(function () {
        var tx = db.transaction(STORE, 'readonly');
        var done = txDone(tx);
        return Promise.all([requestToPromise(tx.objectStore(STORE).getAll()), done]);
      }).then(function (results) {
        var rows = results[0];
        var items = Array.isArray(rows) ? rows.slice() : [];
        items.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        return items;
      }).finally(function () { db.close(); });
    });
  }

  function remove(id) {
    if (!id) return Promise.resolve(false);
    return openDb().then(function (db) {
      var tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(String(id));
      return txDone(tx).then(function () {
        db.close();
        return true;
      });
    }).catch(function () { return false; });
  }

  function put(entry) {
    if (!entry || !entry.blob || typeof entry.blob.size !== 'number') {
      return Promise.resolve(null);
    }
    if (entry.blob.size > MAX_BYTES) return Promise.resolve(null);
    var kind = KINDS[entry.kind] ? entry.kind : 'observatory';
    var record = {
      id: uid(),
      kind: kind,
      createdAt: Date.now(),
      caption: String(entry.caption || '').slice(0, 400),
      birthDate: /^\d{4}-\d{2}-\d{2}$/.test(String(entry.birthDate || ''))
        ? String(entry.birthDate)
        : '',
      place: String(entry.place || '').slice(0, 120),
      schematic: entry.schematic !== false,
      blob: entry.blob
    };
    return openDb().then(function (db) {
      var tx = db.transaction(STORE, 'readwrite');
      var os = tx.objectStore(STORE);
      return requestToPromise(os.getAll()).then(function (rows) {
        var existing = Array.isArray(rows) ? rows.slice() : [];
        existing.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
        while (existing.length >= MAX) {
          var old = existing.shift();
          if (old) os.delete(old.id);
        }
        os.put(record);
        return txDone(tx);
      }).then(function () {
        db.close();
        try {
          document.dispatchEvent(new CustomEvent('ap-keep-library-changed', {
            detail: { id: record.id, kind: record.kind }
          }));
        } catch (_) { /* ignore */ }
        return { id: record.id, kind: record.kind };
      });
    }).catch(function () { return null; });
  }

  function kindLabel(kind) {
    return KINDS[kind] || 'Plate';
  }

  var shelves = new WeakMap();

  function releaseUrls(state) {
    state.urls.forEach(function (url) { URL.revokeObjectURL(url); });
    state.urls = [];
  }

  function renderShelf(root) {
    if (!root) return;
    var state = shelves.get(root);
    if (!state) {
      state = { urls: [], version: 0 };
      shelves.set(root, state);
      // A removed shelf must release its blobs, including pending renders.
      if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function () {
          if (root.isConnected) return;
          state.version++;
          releaseUrls(state);
          shelves.delete(root);
          observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    }
    var version = ++state.version;
    return list().then(function (items) {
      if (version !== state.version) return;
      root.replaceChildren();
      releaseUrls(state);
      if (!items.length) {
        var empty = document.createElement('p');
        empty.className = 'ap-keep-library__empty';
        empty.textContent = 'Nothing kept yet. A birth-hour still from the Observatory, a sky card, or a chart plate will appear here. They stay on this device. They are schematic — not photographs, not a live feed.';
        root.appendChild(empty);
        return;
      }
      var listEl = document.createElement('ul');
      listEl.className = 'ap-keep-library__grid';
      items.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'ap-keep-library__card';
        var fig = document.createElement('figure');
        if (item.blob) {
          var url = URL.createObjectURL(item.blob);
          state.urls.push(url);
          var img = document.createElement('img');
          img.src = url;
          img.alt = (item.schematic ? 'Schematic ' : '') + kindLabel(item.kind);
          img.loading = 'lazy';
          img.decoding = 'async';
          fig.appendChild(img);
        }
        var cap = document.createElement('figcaption');
        var stamp = document.createElement('span');
        stamp.className = 'ap-keep-library__stamp';
        stamp.textContent = item.schematic ? 'SCHEMATIC' : 'PLATE';
        var title = document.createElement('strong');
        title.textContent = kindLabel(item.kind);
        var meta = document.createElement('p');
        var bits = [];
        if (item.birthDate) bits.push(item.birthDate);
        if (item.place) bits.push(item.place);
        meta.textContent = bits.join(' · ') || 'Kept on this device';
        var note = document.createElement('p');
        note.className = 'ap-keep-library__caption';
        note.textContent = item.caption || '';
        cap.appendChild(stamp);
        cap.appendChild(title);
        cap.appendChild(meta);
        if (item.caption) cap.appendChild(note);
        fig.appendChild(cap);
        li.appendChild(fig);
        var actions = document.createElement('div');
        actions.className = 'ap-keep-library__actions';
        var save = document.createElement('a');
        save.href = item.blob ? url : '#';
        save.download = 'astroprecise-' + (item.birthDate || item.kind) + '.png';
        save.rel = 'noopener';
        save.textContent = 'Download';
        var forget = document.createElement('button');
        forget.type = 'button';
        forget.textContent = 'Remove';
        forget.addEventListener('click', function () {
          remove(item.id).then(function () { renderShelf(root); });
        });
        actions.appendChild(save);
        actions.appendChild(forget);
        li.appendChild(actions);
        listEl.appendChild(li);
      });
      root.appendChild(listEl);
    }).catch(function () {
      if (version !== state.version) return;
      root.replaceChildren();
      releaseUrls(state);
      var error = document.createElement('p');
      error.setAttribute('role', 'alert');
      error.textContent = 'Could not load your saved plates. Storage may be unavailable. This does not mean your library is empty.';
      root.appendChild(error);
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Try again';
      retry.addEventListener('click', function () { renderShelf(root); });
      root.appendChild(retry);
    });
  }

  function boot() {
    var shelf = document.getElementById('ap-keep-library-shelf');
    if (shelf) renderShelf(shelf);
    document.addEventListener('ap-keep-library-changed', function () {
      var live = document.getElementById('ap-keep-library-shelf');
      if (live) renderShelf(live);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.APKeepLibrary = {
    put: put,
    list: list,
    remove: remove,
    renderShelf: renderShelf,
    MAX: MAX,
    kindLabel: kindLabel
  };
})();
