/**
 * Live-sky presence mode — a quiet one-minute sit when the device clock
 * hits a mirror hour (especially 11:11). No notification permission.
 * Demo: ?ap-presence=1 or ?ap-mirror=11:11 (localhost / ?nosw=1).
 */
(function () {
  'use strict';

  var api = window.APMirrorHour;
  if (!api) return;

  var banner = null;
  var activeLabel = '';
  var pollTimer = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function writeLiveHandoff(match) {
    var payload = {
      date: todayIso(),
      time: match.label,
      livePattern: true,
      source: 'live-clock',
      ts: Date.now()
    };
    try { sessionStorage.setItem('ap-sky-card-handoff', JSON.stringify(payload)); }
    catch (e) { /* blocked — sky card still opens empty */ }
    api.rememberLive(match);
  }

  function setPresence(on) {
    document.body.classList.toggle('ap-presence-on', !!on);
  }

  function hide() {
    if (banner) banner.hidden = true;
    setPresence(false);
    activeLabel = '';
  }

  function show(match) {
    if (!banner || !match) return;
    if (api.isDismissed(match.label)) return;
    activeLabel = match.label;
    api.rememberLive(match);
    byId('ap-presence-title').textContent = match.label + ' · sit with the sky';
    byId('ap-presence-folk').textContent = match.folk;
    byId('ap-presence-note').textContent = api.HONESTY;
    banner.hidden = false;
    setPresence(true);
  }

  function tick() {
    var match = api.detectNow();
    if (!match) {
      if (activeLabel) hide();
      return;
    }
    if (banner && !banner.hidden && activeLabel === match.label) return;
    show(match);
  }

  function bind() {
    banner = byId('ap-presence-banner');
    if (!banner) return;

    var dismiss = byId('ap-presence-dismiss');
    var keep = byId('ap-presence-keep');
    var wish = byId('ap-presence-wish');

    if (dismiss) {
      dismiss.addEventListener('click', function () {
        if (activeLabel) api.dismiss(activeLabel);
        hide();
      });
    }
    if (keep) {
      keep.addEventListener('click', function (event) {
        event.preventDefault();
        var match = api.detectNow() || api.readLive();
        if (match) writeLiveHandoff(match);
        window.location.href = 'synchronicity-card.html';
      });
    }
    if (wish) {
      wish.addEventListener('input', function () {
        wish.dataset.localOnly = '1';
      });
    }

    tick();
    pollTimer = window.setInterval(tick, 4000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) tick();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
