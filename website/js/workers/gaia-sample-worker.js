// GENERATED — canonical source: OrbitLab js/. Edit there, sync via scripts/sync-to-astroprecise.mjs
/* OrbitLab — build Gaia-inspired sample off the main thread */
'use strict';

importScripts('../gaia-sample.js');

self.onmessage = function (ev) {
  var msg = ev.data || {};
  var id = msg.id || 0;
  try {
    if (!self.GaiaSample || typeof self.GaiaSample.generate !== 'function') {
      self.postMessage({ id: id, ok: false, error: 'GaiaSample missing in worker' });
      return;
    }
    var count = msg.count | 0;
    var seed = msg.seed != null ? msg.seed | 0 : 20260709;
    var sample = self.GaiaSample.generate(count, seed);
    // Transfer buffers — main thread rebuilds typed arrays
    self.postMessage({
      id: id,
      ok: true,
      count: sample.count,
      seed: sample.seed,
      pos: sample.pos.buffer,
      col: sample.col.buffer,
      // meta is small enough as JSON for Phase 4b (optional)
      meta: sample.meta,
    }, [sample.pos.buffer, sample.col.buffer]);
  } catch (err) {
    self.postMessage({ id: id, ok: false, error: String(err && err.message || err) });
  }
};
