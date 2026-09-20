/**
 * Home Personal Sky — birth date → live Earth terminator, then the chart.
 * Town name only goes to Open-Meteo. Birth date/time stay on this device.
 * Personal minutes never enter the address bar.
 */
(function () {
  'use strict';

  var GEO = 'https://geocoding-api.open-meteo.com/v1/search';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var PHASES = [
    [20, 'New Moon'], [70, 'Waxing Crescent'], [110, 'First Quarter'],
    [160, 'Waxing Gibbous'], [200, 'Full Moon'], [250, 'Waning Gibbous'],
    [290, 'Last Quarter'], [340, 'Waning Crescent'], [360, 'New Moon']
  ];

  var form = document.getElementById('coupon-form');
  if (!form) return;

  var dateEl = document.getElementById('f-date');
  var timeEl = document.getElementById('f-time');
  var placeEl = document.getElementById('f-place');
  var drop = document.getElementById('f-place-drop');
  var submitBtn = form.querySelector('[type="submit"]');
  var kicker = document.getElementById('ap-reading-kicker');
  var title = document.getElementById('ap-reading-title');
  var body = document.getElementById('ap-reading-body');
  var honest = document.getElementById('ap-birth-sky-honest');
  var cta = document.getElementById('ap-birth-sky-cta') ||
    document.querySelector('.ap-live-intro .ap-action--primary');
  var nowBtn = document.getElementById('ap-birth-sky-now');
  var lead = document.getElementById('lead');
  var orrery = document.getElementById('orr');
  var picked = null;
  var lastHandoff = null;
  var searchSeq = 0;
  var searchTimer = null;
  var sittingCopy = {
    kicker: kicker ? kicker.textContent : '',
    title: title ? title.textContent : '',
    body: body ? body.textContent : '',
    cta: cta ? cta.textContent : 'Begin with my minute',
    href: cta ? cta.getAttribute('href') : '#personal'
  };

  function captureSitting() {
    sittingCopy = {
      kicker: kicker ? kicker.textContent : sittingCopy.kicker,
      title: title ? title.textContent : '',
      body: body ? body.textContent : '',
      cta: cta ? cta.textContent : 'Begin with my minute',
      href: cta ? cta.getAttribute('href') : '#personal'
    };
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function validTimeZone(tz) {
    if (!tz || tz === 'UTC' || tz === 'GMT') return false;
    if (/^Etc\/(UTC|GMT)/i.test(tz)) return false;
    try {
      Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(new Date());
      return true;
    } catch (e) {
      return false;
    }
  }

  function tzOffsetMinutes(tz, utcDate) {
    if (!validTimeZone(tz)) return 0;
    try {
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, timeZoneName: 'shortOffset',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
      });
      var off = '';
      fmt.formatToParts(utcDate).forEach(function (p) {
        if (p.type === 'timeZoneName') off = p.value;
      });
      var m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
      if (!m) return 0;
      var sign = m[1] === '-' ? -1 : 1;
      return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
    } catch (e) {
      return 0;
    }
  }

  function localToUT(y, mo, d, hh, mm, tz) {
    var utc = new Date(Date.UTC(y, mo - 1, d, hh, mm, 0));
    if (!validTimeZone(tz)) return utc;
    for (var i = 0; i < 2; i++) {
      var off = tzOffsetMinutes(tz, utc);
      utc = new Date(Date.UTC(y, mo - 1, d, hh, mm, 0) - off * 60000);
    }
    return utc;
  }

  function prettyDate(isoDate) {
    var p = String(isoDate || '').split('-').map(Number);
    if (p.length < 3 || !p[0]) return isoDate;
    return p[2] + ' ' + MONTHS[p[1] - 1] + ' ' + p[0];
  }

  function moonCaption(instant) {
    var jd;
    if (window.VoidEphem && typeof window.VoidEphem.jd === 'function') {
      jd = window.VoidEphem.jd(instant);
    } else {
      jd = instant.getTime() / 86400000 + 2440587.5;
    }
    if (window.AstroEphemeris &&
        typeof window.AstroEphemeris.sunPosition === 'function' &&
        typeof window.AstroEphemeris.moonPosition === 'function') {
      var sun = window.AstroEphemeris.sunPosition(jd);
      var moon = window.AstroEphemeris.moonPosition(jd);
      if (sun && moon && Number.isFinite(sun.lon) && Number.isFinite(moon.lon)) {
        var elong = ((moon.lon - sun.lon) % 360 + 360) % 360;
        var label = 'New Moon';
        for (var i = 0; i < PHASES.length; i++) {
          if (elong < PHASES[i][0]) { label = PHASES[i][1]; break; }
        }
        return 'The Moon was a ' + label.toLowerCase() + '.';
      }
    }
    if (window.VoidEphem && typeof window.VoidEphem.moonPhase === 'function') {
      var phase = window.VoidEphem.moonPhase(jd);
      if (phase && phase.name) return 'The Moon was a ' + String(phase.name).toLowerCase() + '.';
    }
    return '';
  }

  function setStatus(msg, isError) {
    var hint = document.getElementById('coupon-hint');
    if (!hint) return;
    hint.textContent = msg;
    hint.classList.toggle('is-error', !!isError);
  }

  function placeLabel(city) {
    var bits = [city.name];
    if (city.admin && city.admin !== city.name) bits.push(city.admin);
    if (city.country) bits.push(city.country);
    return bits.join(', ');
  }

  function choosePlace(city) {
    if (!validTimeZone(city.tz)) {
      picked = null;
      setStatus('That result has no usable zone. Pick another town — UTC and GMT are refused as birth zones.', true);
      return;
    }
    picked = city;
    placeEl.value = placeLabel(city);
    placeEl.dataset.tz = city.tz;
    if (drop) { drop.hidden = true; drop.innerHTML = ''; }
    setStatus('Using ' + placeLabel(city) + ' · ' + city.tz + '. Earth will turn to that instant first.', false);
  }

  function renderPlaces(results) {
    if (!drop) return;
    drop.innerHTML = '';
    (results || []).forEach(function (city) {
      if (!validTimeZone(city.tz)) return;
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'ap-city-item';
      item.textContent = placeLabel(city) + ' · ' + city.tz;
      item.addEventListener('click', function () { choosePlace(city); });
      drop.appendChild(item);
    });
    drop.hidden = !drop.childNodes.length;
  }

  function searchPlaces(query) {
    var q = String(query || '').trim();
    if (q.length < 2) {
      if (drop) { drop.hidden = true; drop.innerHTML = ''; }
      return;
    }
    var my = ++searchSeq;
    fetch(GEO + '?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json')
      .then(function (r) { return r.ok ? r.json() : { results: [] }; })
      .then(function (data) {
        if (my !== searchSeq) return;
        renderPlaces((data.results || []).map(function (r) {
          return {
            name: r.name,
            admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
            country: r.country_code || r.country || '',
            lat: r.latitude,
            lon: r.longitude,
            tz: r.timezone || ''
          };
        }));
      })
      .catch(function () {
        if (my === searchSeq && drop) drop.hidden = true;
      });
  }

  function resolvePlace(typed) {
    if (picked && placeEl.value.trim()) return Promise.resolve(picked);
    var q = String(typed || '').trim();
    if (q.length < 2) return Promise.resolve(null);
    return fetch(GEO + '?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json')
      .then(function (r) { return r.ok ? r.json() : { results: [] }; })
      .then(function (data) {
        var list = (data.results || []).map(function (r) {
          return {
            name: r.name,
            admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
            country: r.country_code || r.country || '',
            lat: r.latitude,
            lon: r.longitude,
            tz: r.timezone || ''
          };
        });
        for (var i = 0; i < list.length; i++) {
          if (validTimeZone(list[i].tz)) return list[i];
        }
        return null;
      })
      .catch(function () { return null; });
  }

  function stashHandoff(payload) {
    lastHandoff = payload;
    try { sessionStorage.setItem('ap-chart-handoff', JSON.stringify(payload)); }
    catch (_) { /* storage blocked — chart re-entry handles this */ }
  }

  function goToChart() {
    var target = 'chart.html';
    if (lastHandoff) {
      try { sessionStorage.setItem('ap-chart-handoff', JSON.stringify(lastHandoff)); }
      catch (_) { target += '?entry=private-reentry'; }
    }
    location.href = target;
  }

  function driveEarth(instant) {
    var reduced = reducedMotion();
    if (orrery && typeof orrery.playBirthEarthView === 'function') {
      orrery.playBirthEarthView(instant, { instant: reduced });
      return;
    }
    if (window.Orrery3D && typeof window.Orrery3D.playBirthEarthView === 'function') {
      window.Orrery3D.playBirthEarthView(instant, { instant: reduced });
      return;
    }
    if (orrery && typeof orrery.setJD === 'function' && window.VoidEphem && window.VoidEphem.jd) {
      orrery.setJD(window.VoidEphem.jd(instant));
      if (orrery.flyTo) orrery.flyTo('earth');
    }
  }

  function paintPlate(view) {
    if (!document.body.classList.contains('is-birth-sky')) captureSitting();
    document.body.classList.add('is-birth-sky');
    if (kicker) kicker.textContent = view.kicker;
    if (title) title.textContent = view.title;
    if (body) body.textContent = view.body;
    if (honest) {
      honest.hidden = false;
      honest.textContent = view.honest;
    }
    if (cta) {
      cta.textContent = 'Open my chart';
      cta.setAttribute('href', 'chart.html');
    }
    if (nowBtn) nowBtn.hidden = false;
    try {
      document.dispatchEvent(new CustomEvent('ap-personal-sky', {
        bubbles: true,
        detail: { date: view.iso, live: false, caption: view.title }
      }));
    } catch (_) {}
  }

  function restoreSitting() {
    document.body.classList.remove('is-birth-sky');
    if (kicker) kicker.textContent = sittingCopy.kicker;
    if (title) title.textContent = sittingCopy.title;
    if (body) body.textContent = sittingCopy.body;
    if (honest) { honest.hidden = true; honest.textContent = ''; }
    if (cta) {
      cta.textContent = sittingCopy.cta;
      cta.setAttribute('href', sittingCopy.href || '#personal');
    }
    if (nowBtn) nowBtn.hidden = true;
    if (orrery && typeof orrery.setLive === 'function') orrery.setLive();
    else if (window.Orrery3D && typeof window.Orrery3D.snapToNow === 'function') {
      window.Orrery3D.snapToNow();
    }
    try {
      document.dispatchEvent(new CustomEvent('ap-personal-sky', {
        bubbles: true,
        detail: { live: true }
      }));
    } catch (_) {}
  }

  function scrollToSky() {
    if (!lead) return;
    lead.scrollIntoView({
      block: 'start',
      behavior: reducedMotion() ? 'auto' : 'smooth'
    });
  }

  function buildView(opts) {
    var dateText = prettyDate(opts.date);
    var moon = moonCaption(opts.instant);
    var town = opts.place ? placeLabel(opts.place) : opts.city;
    var zone = opts.place && opts.place.tz;
    var hasTime = !!opts.time;
    var view = { iso: opts.instant.toISOString() };

    if (hasTime && zone) {
      view.kicker = 'Your minute';
      view.title = 'Your Earth';
      view.body = 'This hemisphere faced the Sun at ' + opts.time + ' in ' + town +
        ', ' + dateText + '.' + (moon ? ' ' + moon : '');
      view.honest = 'Distances in the model are schematic. Earth’s spin and longitudes are live for that instant. Astrology stays on the chart — this is the sky.';
    } else if (zone) {
      view.kicker = 'Your date';
      view.title = 'Your Earth that day';
      view.body = 'Noon in ' + (zone || 'that zone') + ' on ' + dateText +
        ' — a date reference, not a birth hour. Moon and rising wait for a clock time.';
      view.honest = 'Without a birth hour we will not invent one. Distances stay schematic; the globe is still True-Time for that noon.';
    } else {
      view.kicker = 'Your date';
      view.title = 'Your Earth that day';
      view.body = 'UTC noon on ' + dateText + '. Without a town zone this is a date reference, not your local birth hour.';
      view.honest = 'Pick a town from the list to lock the real zone. Distances in the model are schematic.';
    }
    return view;
  }

  if (placeEl) {
    placeEl.addEventListener('input', function () {
      picked = null;
      placeEl.removeAttribute('data-tz');
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { searchPlaces(placeEl.value); }, 220);
    });
    placeEl.addEventListener('blur', function () {
      setTimeout(function () { if (drop) drop.hidden = true; }, 180);
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var date = dateEl && dateEl.value;
    var time = timeEl && timeEl.value ? timeEl.value : '';
    var city = placeEl ? placeEl.value.trim() : '';
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setStatus('Add a birth date first.', true);
      return;
    }
    if (!city) {
      setStatus('Add a town so we can lock the zone.', true);
      return;
    }

    var payload = { date: date, time: time, city: city };
    stashHandoff(payload);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = 'Finding that town…';
    }

    resolvePlace(city).then(function (place) {
      if (!place) {
        setStatus('Pick your town from the suggestions — a typed name is not a location.', true);
        return;
      }
      choosePlace(place);
      var parts = date.split('-').map(Number);
      var hh = 12;
      var mm = 0;
      var hasTime = /^\d{1,2}:\d{2}/.test(time);
      if (hasTime) {
        var t = time.split(':');
        hh = parseInt(t[0], 10);
        mm = parseInt(t[1], 10);
      }
      var tz = place && validTimeZone(place.tz) ? place.tz : null;
      var instant = tz
        ? localToUT(parts[0], parts[1], parts[2], hh, mm, tz)
        : new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));

      stashHandoff({
        date: date,
        time: time,
        city: placeLabel(place) || city,
        tz: tz || ''
      });
      scrollToSky();
      driveEarth(instant);
      paintPlate(buildView({
        date: date,
        time: hasTime ? time : '',
        city: city,
        place: place,
        instant: instant
      }));
      if (hasTime) {
        try {
          document.dispatchEvent(new CustomEvent('ap-keep-sky-context', {
            detail: {
              jd: instant.getTime() / 86400000 + 2440587.5,
              birthDate: date,
              birthTime: time.slice(0, 5),
              timeKnown: true,
              timeAccuracy: 'exact',
              place: placeLabel(place) || city,
              timezone: tz || ''
            }
          }));
        } catch (_) {}
      }
    }).finally(function () {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = 'Show me that Earth';
      }
    });
  });

  if (cta) {
    cta.addEventListener('click', function (event) {
      if (!document.body.classList.contains('is-birth-sky')) return;
      event.preventDefault();
      goToChart();
    });
  }

  if (nowBtn) {
    nowBtn.addEventListener('click', function () { restoreSitting(); });
  }

  var hudNow = document.getElementById('nowBtn');
  if (hudNow) {
    hudNow.addEventListener('click', function () {
      if (document.body.classList.contains('is-birth-sky')) restoreSitting();
    });
  }
})();
