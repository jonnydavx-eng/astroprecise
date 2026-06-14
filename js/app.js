/**
 * AstroPrecise — Main Application Orchestrator
 * Wires together ephemeris, rendering, interpretations, and profile modules.
 */

'use strict';

const AstroApp = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let _currentChart = null;
  let _toast_queue  = [];

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    renderNav();        // canonical site nav on every page — single source of truth
    initNavbar();
    initToastContainer();
    initScrollAnimations();
    initModalHandlers();

    // Load preferences
    if (window.AstroProfile) {
      const prefs = AstroProfile.getPrefs();
      document.documentElement.dataset.houseSystem = prefs.houseSystem;
    }
  }

  // ── Navbar ────────────────────────────────────────────────────────────────

  function initNavbar() {
    const navbar = document.querySelector('.navbar');
    const toggle = document.querySelector('.navbar__toggle');
    const mobile = document.querySelector('.navbar__mobile-menu');

    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
      }, { passive: true });
    }

    if (toggle && mobile) {
      toggle.addEventListener('click', () => {
        const isOpen = mobile.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      mobile.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          mobile.classList.remove('open');
          toggle.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }
  }

  // Single source of truth for site navigation. Injected on every page that has
  // a .navbar so the hardcoded per-page nav (kept only as a no-JS fallback) can
  // never drift again. Desktop = lean core; mobile menu = core + secondary tools.
  // Adding a page = add one line here; it then appears everywhere automatically.
  const NAV_CORE = [
    ['index.html', 'Home'], ['chart.html', 'Chart'], ['horoscope.html', 'Horoscope'],
    ['compatibility.html', 'Compatibility'], ['transits.html', 'Transits'],
    ['lifepath.html', 'Life Path'], ['ephemeris.html', 'Instrument'],
    ['why.html', 'Why'], ['shop.html', 'Shop'], ['profile.html', 'Profile'],
  ];
  const NAV_EXTRAS = [ // mobile menu only — the scrolling list keeps the top bar lean
    ['accuracy.html', 'Accuracy'], ['charts.html', 'My Charts'], ['quiz.html', 'Cosmic Quiz'],
    ['tonight.html', "Tonight's Sky"], ['moonphase.html', 'Moon Phase'], ['retrograde.html', 'Retrograde'],
    ['angel-numbers.html', 'Angel Numbers'], ['name-numerology.html', 'Name Numerology'],
    ['what-is-my-rising-sign.html', 'Rising Sign'], ['synastry.html', 'Synastry'],
    ['solar-return.html', 'Solar Return'],
  ];

  function renderNav() {
    const here = location.pathname.split('/').pop() || 'index.html';
    const linkHtml = pairs => pairs.map(([href, label]) => {
      const active = here === href;
      return '<a href="' + href + '" class="navbar__link' + (active ? ' active' : '') + '"' +
        (active ? ' aria-current="page"' : '') + '>' + label + '</a>';
    }).join('');
    const desktop = document.querySelector('.navbar__nav');
    const mobile = document.querySelector('.navbar__mobile-menu');
    if (desktop) desktop.innerHTML = linkHtml(NAV_CORE);
    if (mobile) mobile.innerHTML = linkHtml(NAV_CORE.concat(NAV_EXTRAS));
  }

  // ── Toast Notifications ───────────────────────────────────────────────────

  function initToastContainer() {
    if (!document.querySelector('.toast-container')) {
      const tc = document.createElement('div');
      tc.className = 'toast-container';
      document.body.appendChild(tc);
    }
  }

  function showToast(title, message, type = 'info', duration = 4000) {
    const icons = { success: '✓', error: '✕', warning: '<svg class="eng-i" aria-hidden="true"><use href="#ei-warn"/></svg>', info: '✦' };
    const tc    = document.querySelector('.toast-container');
    if (!tc) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${icons[type] || '✦'}</span>
      <div class="toast__body">
        <div class="toast__title">${title}</div>
        ${message ? `<div class="toast__message">${message}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Close">✕</button>
    `;

    tc.appendChild(toast);

    const close = () => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast__close').addEventListener('click', close);
    if (duration > 0) setTimeout(close, duration);

    return toast;
  }

  // ── Loading Overlay ───────────────────────────────────────────────────────

  function showLoading(message = 'Calculating your cosmic blueprint…') {
    let overlay = document.getElementById('ap-loading');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ap-loading';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner">
          <div class="spinner__ring spinner__ring--outer"></div>
          <div class="spinner__ring spinner__ring--mid"></div>
          <div class="spinner__ring spinner__ring--inner"></div>
          <div class="spinner__center"></div>
        </div>
        <p class="loading-overlay__text">${message}</p>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('.loading-overlay__text').textContent = message;
      overlay.classList.remove('hidden');
    }
  }

  function hideLoading() {
    const overlay = document.getElementById('ap-loading');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 400);
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function initModalHandlers() {
    document.addEventListener('click', e => {
      const backdrop = e.target.closest('.modal-backdrop');
      if (backdrop && e.target === backdrop) closeModal(backdrop.id);

      const trigger = e.target.closest('[data-modal-open]');
      if (trigger) openModal(trigger.dataset.modalOpen);

      const closer = e.target.closest('[data-modal-close]');
      if (closer) {
        const modal = closer.closest('.modal-backdrop');
        if (modal) closeModal(modal.id);
      }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal-backdrop.open');
        if (open) closeModal(open.id);
      }
    });
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  function initTabs(container) {
    const triggers = container.querySelectorAll('.tabs__trigger');
    const panels   = container.querySelectorAll('.tabs__panel');

    triggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const target = trigger.dataset.tab;

        triggers.forEach(t => { t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => { p.setAttribute('aria-hidden', 'true'); });

        trigger.setAttribute('aria-selected', 'true');
        const panel = container.querySelector(`#tab-${target}`);
        if (panel) panel.setAttribute('aria-hidden', 'false');
      });
    });

    // Activate first tab
    if (triggers[0]) triggers[0].click();
  }

  // ── Score Bars ────────────────────────────────────────────────────────────

  function animateScoreBars(container) {
    const bars = (container || document).querySelectorAll('.score-bar__fill');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const fill  = entry.target;
          const value = fill.dataset.value || '0';
          fill.style.width = value + '%';
          observer.unobserve(fill);
        }
      });
    }, { threshold: 0.2 });

    bars.forEach(b => observer.observe(b));
  }

  function animateCircularProgress(el) {
    if (!el) return;
    const fill  = el.querySelector('.circular-progress__fill');
    const num   = el.querySelector('.circular-progress__number');
    if (!fill) return;

    const target    = parseFloat(fill.dataset.value) || 0;
    const circumference = 440;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        const offset = circumference - (target / 100) * circumference;
        fill.style.strokeDashoffset = offset;
        if (num) {
          let current = 0;
          const step = target / 60;
          const timer = setInterval(() => {
            current = Math.min(current + step, target);
            num.textContent = Math.round(current) + '%';
            if (current >= target) clearInterval(timer);
          }, 16);
        }
        observer.unobserve(el);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
  }

  // ── Scroll Animations ─────────────────────────────────────────────────────

  function initScrollAnimations() {
    const animatable = document.querySelectorAll('.card, .zodiac-card, .step, .testimonial-card, .transit-item');
    const observer   = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    animatable.forEach(el => observer.observe(el));
  }

  // ── Chart Form Helpers ────────────────────────────────────────────────────

  // City autocomplete using a static dataset of major cities
  const CITIES = [
    { name: 'New York',      country: 'US', lat: 40.7128,  lon: -74.0060  },
    { name: 'Los Angeles',   country: 'US', lat: 34.0522,  lon: -118.2437 },
    { name: 'Chicago',       country: 'US', lat: 41.8781,  lon: -87.6298  },
    { name: 'Houston',       country: 'US', lat: 29.7604,  lon: -95.3698  },
    { name: 'Phoenix',       country: 'US', lat: 33.4484,  lon: -112.0740 },
    { name: 'London',        country: 'UK', lat: 51.5074,  lon: -0.1278   },
    { name: 'Paris',         country: 'FR', lat: 48.8566,  lon: 2.3522    },
    { name: 'Berlin',        country: 'DE', lat: 52.5200,  lon: 13.4050   },
    { name: 'Tokyo',         country: 'JP', lat: 35.6762,  lon: 139.6503  },
    { name: 'Sydney',        country: 'AU', lat: -33.8688, lon: 151.2093  },
    { name: 'Mumbai',        country: 'IN', lat: 19.0760,  lon: 72.8777   },
    { name: 'São Paulo',     country: 'BR', lat: -23.5505, lon: -46.6333  },
    { name: 'Mexico City',   country: 'MX', lat: 19.4326,  lon: -99.1332  },
    { name: 'Cairo',         country: 'EG', lat: 30.0444,  lon: 31.2357   },
    { name: 'Toronto',       country: 'CA', lat: 43.6532,  lon: -79.3832  },
    { name: 'Madrid',        country: 'ES', lat: 40.4168,  lon: -3.7038   },
    { name: 'Rome',          country: 'IT', lat: 41.9028,  lon: 12.4964   },
    { name: 'Moscow',        country: 'RU', lat: 55.7558,  lon: 37.6173   },
    { name: 'Istanbul',      country: 'TR', lat: 41.0082,  lon: 28.9784   },
    { name: 'Dubai',         country: 'AE', lat: 25.2048,  lon: 55.2708   },
    { name: 'Singapore',     country: 'SG', lat: 1.3521,   lon: 103.8198  },
    { name: 'Seoul',         country: 'KR', lat: 37.5665,  lon: 126.9780  },
    { name: 'Bangkok',       country: 'TH', lat: 13.7563,  lon: 100.5018  },
    { name: 'Buenos Aires',  country: 'AR', lat: -34.6037, lon: -58.3816  },
    { name: 'Lagos',         country: 'NG', lat: 6.5244,   lon: 3.3792    },
    { name: 'Johannesburg',  country: 'ZA', lat: -26.2041, lon: 28.0473   },
    { name: 'Amsterdam',     country: 'NL', lat: 52.3676,  lon: 4.9041    },
    { name: 'Vienna',        country: 'AT', lat: 48.2082,  lon: 16.3738   },
    { name: 'Athens',        country: 'GR', lat: 37.9838,  lon: 23.7275   },
    { name: 'Stockholm',     country: 'SE', lat: 59.3293,  lon: 18.0686   },
    { name: 'Copenhagen',    country: 'DK', lat: 55.6761,  lon: 12.5683   },
    { name: 'Warsaw',        country: 'PL', lat: 52.2297,  lon: 21.0122   },
    { name: 'Prague',        country: 'CZ', lat: 50.0755,  lon: 14.4378   },
    { name: 'Lisbon',        country: 'PT', lat: 38.7223,  lon: -9.1393   },
    { name: 'Barcelona',     country: 'ES', lat: 41.3851,  lon: 2.1734    },
    { name: 'Vancouver',     country: 'CA', lat: 49.2827,  lon: -123.1207 },
    { name: 'Melbourne',     country: 'AU', lat: -37.8136, lon: 144.9631  },
    { name: 'Nairobi',       country: 'KE', lat: -1.2921,  lon: 36.8219   },
    { name: 'Cape Town',     country: 'ZA', lat: -33.9249, lon: 18.4241   },
    { name: 'Casablanca',    country: 'MA', lat: 33.5731,  lon: -7.5898   },
    { name: 'Beirut',        country: 'LB', lat: 33.8886,  lon: 35.4955   },
    { name: 'Tel Aviv',      country: 'IL', lat: 32.0853,  lon: 34.7818   },
    { name: 'Karachi',       country: 'PK', lat: 24.8607,  lon: 67.0011   },
    { name: 'Dhaka',         country: 'BD', lat: 23.8103,  lon: 90.4125   },
    { name: 'Manila',        country: 'PH', lat: 14.5995,  lon: 120.9842  },
    { name: 'Jakarta',       country: 'ID', lat: -6.2088,  lon: 106.8456  },
    { name: 'Kuala Lumpur',  country: 'MY', lat: 3.1390,   lon: 101.6869  },
    { name: 'Ho Chi Minh City', country: 'VN', lat: 10.8231, lon: 106.6297 },
    { name: 'Beijing',       country: 'CN', lat: 39.9042,  lon: 116.4074  },
    { name: 'Shanghai',      country: 'CN', lat: 31.2304,  lon: 121.4737  },
    { name: 'San Francisco', country: 'US', lat: 37.7749,  lon: -122.4194 },
    { name: 'Seattle',       country: 'US', lat: 47.6062,  lon: -122.3321 },
    { name: 'Miami',         country: 'US', lat: 25.7617,  lon: -80.1918  },
    { name: 'Boston',        country: 'US', lat: 42.3601,  lon: -71.0589  },
    { name: 'Austin',        country: 'US', lat: 30.2672,  lon: -97.7431  },
    { name: 'Denver',        country: 'US', lat: 39.7392,  lon: -104.9903 },
  ];

  // ── Worldwide place search ────────────────────────────────────────────────
  // Live geocoding via Open-Meteo (GeoNames data — any town or village on
  // Earth), falling back to the built-in city lists when the network is
  // unreachable. Only the typed place query is sent; never the birth moment.

  const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  const geoCache = new Map();

  function offlinePlaceMatches(q) {
    const list = (window.AstroEphemeris && window.AstroEphemeris.CITIES) || CITIES;
    const starts = [], contains = [];
    for (const c of list) {
      const n = c.name.toLowerCase();
      if (n.startsWith(q)) starts.push(c);
      else if (n.includes(q)) contains.push(c);
    }
    return starts.concat(contains).slice(0, 8).map(c => ({
      name: c.name, admin: '', country: c.country,
      lat: c.lat, lon: c.lon, tz: c.tz || null,
    }));
  }

  async function searchPlaces(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { results: [], source: 'live' };
    if (geoCache.has(q)) return geoCache.get(q);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(
        `${GEO_URL}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
        { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`geocoder HTTP ${res.status}`);
      const data = await res.json();
      const results = (data.results || []).map(r => ({
        name: r.name,
        admin: r.admin1 && r.admin1 !== r.name ? r.admin1 : '',
        country: r.country_code || r.country || '',
        lat: r.latitude,
        lon: r.longitude,
        tz: r.timezone || null,
      }));
      const out = { results, source: 'live' };
      geoCache.set(q, out);
      return out;
    } catch (e) {
      return { results: offlinePlaceMatches(q), source: 'offline' };
    }
  }

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function initCityAutocomplete(inputEl, latEl, lonEl, dropdown) {
    if (!inputEl || !dropdown) return;
    let seq = 0;

    const run = debounce(query => {
      const mySeq = ++seq;
      searchPlaces(query).then(({ results }) => {
        if (mySeq !== seq) return;
        dropdown.innerHTML = '';
        if (results.length === 0) { dropdown.classList.remove('open'); return; }

        results.forEach(city => {
          const item = document.createElement('div');
          item.className = 'autocomplete-item';
          item.setAttribute('role', 'option');
          const region = city.admin ? `${city.admin}, ${city.country}` : city.country;
          item.textContent = city.name + ' ';
          const span = document.createElement('span');
          span.className = 'city-country';
          span.textContent = region;
          item.appendChild(span);
          item.addEventListener('click', () => {
            inputEl.value = city.name;
            if (latEl) latEl.value = city.lat;
            if (lonEl) lonEl.value = city.lon;
            if (city.tz) inputEl.dataset.tz = city.tz;
            dropdown.classList.remove('open');
            inputEl.dispatchEvent(new CustomEvent('citySelected', { detail: city }));
          });
          dropdown.appendChild(item);
        });

        dropdown.classList.add('open');
      });
    }, 250);

    inputEl.addEventListener('input', () => {
      // Editing the text invalidates any previously-picked place — clear the
      // resolved coordinates/timezone so a submit can't reuse stale values for
      // a city the visitor has since retyped (matches chart-page.js).
      if (latEl) latEl.value = '';
      if (lonEl) lonEl.value = '';
      delete inputEl.dataset.tz;
      if (inputEl.value.trim().length < 2) { seq++; dropdown.classList.remove('open'); return; }
      run(inputEl.value);
    });
    inputEl.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 200));

    // Keyboard navigation
    inputEl.addEventListener('keydown', e => {
      const items = [...dropdown.querySelectorAll('.autocomplete-item')];
      const hi    = dropdown.querySelector('.highlighted');
      const idx   = hi ? items.indexOf(hi) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        hi?.classList.remove('highlighted');
        items[Math.min(idx + 1, items.length - 1)]?.classList.add('highlighted');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        hi?.classList.remove('highlighted');
        items[Math.max(idx - 1, 0)]?.classList.add('highlighted');
      } else if (e.key === 'Enter' && hi) {
        e.preventDefault();
        hi.click();
      } else if (e.key === 'Escape') {
        dropdown.classList.remove('open');
      }
    });
  }

  // ── Timezone Detection ────────────────────────────────────────────────────

  function detectTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  // ── Planet Table Builder ──────────────────────────────────────────────────

  function buildPlanetTable(positions, container) {
    if (!positions || !container) return;

    const rows = Object.values(positions).map(p => `
      <tr>
        <td>${p.symbol} ${p.name}</td>
        <td>${p.signSymbol || ''} ${p.sign}</td>
        <td>${p.degree}°</td>
        <td>${p.retrograde ? '<span class="planet-card__retrograde">℞ Rx</span>' : '—'}</td>
        <td><span class="badge badge--${p.element || 'purple'}">${p.element || ''}</span></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>Planet</th><th>Sign</th><th>Degree</th><th>Motion</th><th>Element</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ── Horoscope Card Builder ────────────────────────────────────────────────

  function buildHoroscopeCard(sign, date, container) {
    if (!container) return;
    const Interp = window.Interpretations;
    if (!Interp) return;

    const data = Interp.getDailyHoroscope(sign, date);
    container.innerHTML = `
      <div class="card card--gold">
        <div class="flex-between mb-4">
          <h3 class="text-gold">${sign}</h3>
          <span class="tag tag--gold">${data.date}</span>
        </div>
        <p style="line-height:1.8; margin-bottom:var(--space-4)">${data.overview}</p>
        <div class="grid-3 gap-4" style="margin-bottom:var(--space-4)">
          <div class="card" style="padding:var(--space-4)">
            <div class="text-gold" style="font-size:1.2rem;margin-bottom:var(--space-2)">♥</div>
            <strong class="text-white" style="display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2)">Love</strong>
            <p style="font-size:var(--text-sm);color:var(--color-silver-dim)">${data.love}</p>
          </div>
          <div class="card" style="padding:var(--space-4)">
            <div class="text-gold" style="font-size:1.2rem;margin-bottom:var(--space-2)">⬡</div>
            <strong class="text-white" style="display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2)">Career</strong>
            <p style="font-size:var(--text-sm);color:var(--color-silver-dim)">${data.career}</p>
          </div>
          <div class="card" style="padding:var(--space-4)">
            <div class="text-gold" style="font-size:1.2rem;margin-bottom:var(--space-2)">✦</div>
            <strong class="text-white" style="display:block;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:.08em;margin-bottom:var(--space-2)">Health</strong>
            <p style="font-size:var(--text-sm);color:var(--color-silver-dim)">${data.health}</p>
          </div>
        </div>
        <div class="flex gap-4" style="font-size:var(--text-sm)">
          <span>Lucky Number: <strong class="text-gold">${data.luckyNumber}</strong></span>
          <span>Lucky Color: <strong class="text-gold">${data.luckyColor}</strong></span>
        </div>
      </div>
    `;
  }

  return {
    init,
    showToast,
    showLoading,
    hideLoading,
    openModal,
    closeModal,
    initTabs,
    animateScoreBars,
    animateCircularProgress,
    initCityAutocomplete,
    searchPlaces,
    debounce,
    detectTimezone,
    buildPlanetTable,
    buildHoroscopeCard,
    CITIES,
  };
})();

window.AstroApp = AstroApp;

// ═══ ENGRAVED ICON SYSTEM ════════════════════════════════════════════════
// Hairline single-colour icons replacing platform colour-emoji, so every
// symbol on the site is drawn in the same engraved hand. stroke:currentColor
// means they inherit gold/silver from their context automatically.
(function injectEngravedIcons() {
  const I = {
    pin: '<path d="M12 21c-4-5.3-6-8.4-6-11a6 6 0 1 1 12 0c0 2.6-2 5.7-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',
    crescent: '<path d="M14.5 3.5a9 9 0 1 0 6.2 11.8A7.2 7.2 0 0 1 14.5 3.5Z"/>',
    sunrise: '<path d="M4 17h16M7 13.5a5 5 0 0 1 10 0M12 8V4.5M9.6 6.4 12 4l2.4 2.4"/>',
    sunhigh: '<circle cx="12" cy="12" r="3.4"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/>',
    sunset: '<path d="M4 17h16M7 13.5a5 5 0 0 1 10 0M12 4v3.5M9.6 6.1 12 8.5l2.4-2.4"/>',
    planet: '<circle cx="12" cy="12" r="4.2"/><path d="M4.5 14.8C2.6 13.9 1.6 12.9 2 12c.6-1.4 4.6-1.6 9.4-.4M19.5 9.2c1.9.9 2.9 1.9 2.5 2.8-.6 1.4-4.6 1.6-9.4.4" transform="rotate(-18 12 12)"/>',
    house: '<path d="M4 11.5 12 5l8 6.5M6.5 10v8.5h11V10M10.5 18.5v-5h3v5"/>',
    gem: '<path d="M7 4h10l3.5 5L12 20 3.5 9 7 4ZM3.5 9h17M9.5 9 12 19.5 14.5 9M7 4l2.5 5M17 4l-2.5 5"/>',
    spiral: '<path d="M12 12a1.6 1.6 0 1 0 1.6 1.6A3.6 3.6 0 1 0 10 9.4 6 6 0 1 1 6.4 15 8.6 8.6 0 1 0 12 3.4"/>',
    orb: '<circle cx="12" cy="10.5" r="6.3"/><path d="M8.5 19h7M9.8 16.5h4.4M8.8 8.2a3.6 3.6 0 0 1 3-1.8"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>',
    gear: '<circle cx="12" cy="12" r="3.1"/><path d="M12 4.2v2.1M12 17.7v2.1M4.2 12h2.1M17.7 12h2.1M6.5 6.5 8 8M16 16l1.5 1.5M17.5 6.5 16 8M8 16l-1.5 1.5"/>',
    infinity: '<path d="M6 12c0-2.1 1.5-3.4 2.9-3.4 2.7 0 4.5 6.8 7.2 6.8 1.4 0 2.9-1.3 2.9-3.4s-1.5-3.4-2.9-3.4c-2.7 0-4.5 6.8-7.2 6.8C7.5 15.4 6 14.1 6 12Z"/>',
    chat: '<path d="M4.5 6.5h15v9.5h-10l-5 4v-13.5Z" stroke-linejoin="round"/>',
    star4: '<path d="M12 3.5 13.7 10l6.5 2-6.5 2L12 20.5 10.3 14l-6.5-2 6.5-2L12 3.5Z"/>',
    eye: '<path d="M2.8 12S6.2 6.8 12 6.8 21.2 12 21.2 12 18 17.2 12 17.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    flame: '<path d="M12 3.2c.9 3.1-3.2 4.7-3.2 8.2a4.7 4.7 0 0 0 9.4.4c.3-3.6-4.2-5.3-6.2-8.6Z"/><path d="M12 20.8a3 3 0 0 1-1.6-5.4"/>',
    wind: '<path d="M3 9.5h10.5a2.3 2.3 0 1 0-2.3-2.3M3 13.5h14.5a2.3 2.3 0 1 1-2.3 2.3M3 17.5h7"/>',
    wave: '<path d="M3 10.5c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 15.5c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/>',
    leaf: '<path d="M19 4.5c-8 0-13 4-13 10.5 0 2 .4 3.4 1 5 5 .6 13-3 12-15.5Z"/><path d="M7 19.5C9 12.5 13 8.5 18 5.5"/>',
    heart: '<path d="M12 19.8s-7.3-4.6-9-8.7A5 5 0 0 1 12 7a5 5 0 0 1 9 4.1c-1.7 4.1-9 8.7-9 8.7Z"/>',
    book: '<path d="M5 4.5h6.5V19H7a2 2 0 0 1-2-2V4.5ZM19 4.5h-6.5V19H17a2 2 0 0 0 2-2V4.5ZM11.5 4.5v14.5"/>',
    books: '<path d="M4 19.5V5h3.5v14.5M9 19.5V7.5h3.5v12M14.5 18.8 17 6.5l3.4.8-2.5 12.3"/><path d="M3 19.5h18"/>',
    telescope: '<path d="m4.5 13.5 11-6.4 2.2 3.8-11 6.4zM15.5 7.1 18 4.5l2.8 4.8-3.1 1.4M9 17.5l-2.2 3.3M11.5 16.8l1.7 4"/>',
    map: '<path d="m3.5 6 5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2V6ZM9 4v14M15 6v14"/>',
    journal: '<rect x="6" y="4" width="13" height="16.5" rx="2"/><path d="M9.5 4v16.5M12.5 8.5h3.5M12.5 12h3.5"/>',
    rings: '<circle cx="9.2" cy="12" r="5"/><circle cx="14.8" cy="12" r="5"/>',
    trident: '<path d="M12 21V6M12 6a4 4 0 0 0 4-4M12 6a4 4 0 0 1-4-4M6.5 9.5a5.5 5.5 0 0 0 11 0M9.5 21h5"/>',
    warn: '<path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.2M12 16.8v.4"/>',
    moon0: '<circle cx="12" cy="12" r="7.6"/>',
    moon1: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2A10.4 10.4 0 0 0 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon2: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon3: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2A10.4 10.4 0 0 1 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon4: '<circle cx="12" cy="12" r="7.6" fill="currentColor" opacity=".85"/><circle cx="12" cy="12" r="7.6"/>',
    moon5: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 0 0 15.2A10.4 10.4 0 0 0 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon6: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 0 0 15.2Z" fill="currentColor" stroke="none" opacity=".8"/>',
    moon7: '<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 0 0 15.2A10.4 10.4 0 0 1 12 4.4Z" fill="currentColor" stroke="none" opacity=".8"/>',
  };
  const sym = Object.entries(I).map(([k, p]) =>
    `<symbol id="ei-${k}" viewBox="0 0 24 24">${p}</symbol>`).join('');
  const holder = document.createElement('div');
  holder.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  holder.setAttribute('aria-hidden', 'true');
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${sym}</svg>`;
  document.body.insertBefore(holder, document.body.firstChild);
  const st = document.createElement('style');
  st.textContent = `.eng-i{width:1em;height:1em;display:inline-block;vertical-align:-0.12em;
    fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}`;
  document.head.appendChild(st);
})();

// ═══ UNIVERSAL LEGAL FOOTER LINKS ════════════════════════════════════════
// The footer markup varies across pages (and the generated sign pages), so
// rather than hand-edit each one, ensure a consistent Privacy · Terms line
// exists once per page. Idempotent; skips the legal pages themselves.
(function injectLegalLinks() {
  const here = (location.pathname.split('/').pop() || 'index.html');
  if (here === 'privacy.html' || here === 'terms.html') return;
  function place() {
    if (document.querySelector('.ap-legal-links')) return;
    const host = document.querySelector('.footer-legal')
      || document.querySelector('footer .container')
      || document.querySelector('footer');
    if (!host) return;
    const p = document.createElement('p');
    p.className = 'ap-legal-links';
    p.style.cssText = 'font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;'
      + 'margin-top:10px;opacity:0.7;font-family:Inter,system-ui,sans-serif;';
    p.innerHTML = '<a href="privacy.html" style="color:var(--gold,#C9A227);text-decoration:none;">Privacy</a>'
      + ' <span style="opacity:.4">&middot;</span> '
      + '<a href="terms.html" style="color:var(--gold,#C9A227);text-decoration:none;">Terms</a>'
      + ' <span style="opacity:.4">&middot;</span> '
      + '<a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer" '
      + 'style="color:var(--gold,#C9A227);text-decoration:none;">Planet textures &copy; Solar System Scope</a>'
      + ' <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" '
      + 'style="color:inherit;opacity:.65;text-decoration:none;">CC&nbsp;BY&nbsp;4.0</a>';
    host.appendChild(p);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══ UNIVERSAL "ACCURACY" NAV LINK ═══════════════════════════════════════
// Nav markup is hardcoded per page; rather than edit ~25 files, inject the
// Accuracy link into both the desktop and mobile nav lists once, here.
(function injectExtraNav() {
  // Secondary tools go in the MOBILE menu only (it scrolls) — keep the desktop
  // top-bar lean at its hardcoded core. Footer guide-links cover desktop discovery.
  var EXTRAS = [
    { href: 'charts.html', label: 'My Charts' },
    { href: 'quiz.html', label: 'Cosmic Quiz' },
    { href: 'tonight.html', label: "Tonight's Sky" },
    { href: 'moonphase.html', label: 'Moon Phase' },
    { href: 'retrograde.html', label: 'Retrograde' },
    { href: 'angel-numbers.html', label: 'Angel Numbers' },
    { href: 'name-numerology.html', label: 'Name Numerology' },
    { href: 'what-is-my-rising-sign.html', label: 'Rising Sign' },
    { href: 'synastry.html', label: 'Synastry' },
    { href: 'solar-return.html', label: 'Solar Return' },
    { href: 'accuracy.html', label: 'Accuracy' },
  ];
  function place() {
    // Superseded by renderNav() (the single source of truth in init()), which now
    // injects these secondary tools into the mobile menu itself. Kept as a no-op.
    return;
    var lists = document.querySelectorAll('.navbar__mobile-menu');
    if (!lists.length) return;
    var here = (location.pathname.split('/').pop() || 'index.html');
    lists.forEach(function (list) {
      var anchor = list.querySelector('a[href="shop.html"]'); // insert before Shop, in order
      EXTRAS.forEach(function (x) {
        if (list.querySelector('a[href="' + x.href + '"]')) return;
        var a = document.createElement('a');
        a.className = 'navbar__link' + (here === x.href ? ' active' : '');
        a.href = x.href;
        a.textContent = x.label;
        if (here === x.href) a.setAttribute('aria-current', 'page');
        if (anchor) list.insertBefore(a, anchor); else list.appendChild(a);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══ FOOTER GUIDE / TOOL LINKS (site-wide internal links for SEO) ════════
(function injectGuideLinks() {
  function place() {
    if (document.querySelector('.ap-guide-links')) return;
    var host = document.querySelector('footer .container') || document.querySelector('footer');
    if (!host) return;
    var links = [
      ['what-is-my-rising-sign.html', 'Rising sign'],
      ['quiz.html', 'Cosmic archetype quiz'],
      ['tonight.html', 'Tonight’s sky'],
      ['moonphase.html', 'Moon phase'],
      ['retrograde.html', 'Mercury retrograde'],
      ['angel-numbers.html', 'Angel numbers'],
      ['name-numerology.html', 'Name numerology'],
      ['synastry.html', 'Synastry'],
      ['solar-return.html', 'Solar return'],
      ['charts.html', 'My charts'],
      ['accuracy.html', 'How it’s accurate'],
    ];
    var p = document.createElement('p');
    p.className = 'ap-guide-links';
    p.style.cssText = 'font-size:0.62rem;letter-spacing:0.08em;margin-top:10px;opacity:0.6;'
      + 'font-family:Inter,system-ui,sans-serif;text-align:center;line-height:1.9;';
    p.innerHTML = 'Guides &amp; tools: ' + links.map(function (l) {
      return '<a href="' + l[0] + '" style="color:var(--gold,#C9A227);text-decoration:none;">' + l[1] + '</a>';
    }).join(' <span style="opacity:.4">&middot;</span> ');
    host.appendChild(p);

    // Family of sites — dormant-safe: only links the siblings whose URLs are set in AP_MON.family
    var fam = (window.AP_MON && window.AP_MON.family) || {};
    var famLinks = [];
    if (fam.biggerPicture) famLinks.push('<a href="' + fam.biggerPicture + '" target="_blank" rel="noopener" style="color:var(--gold,#C9A227);text-decoration:none;">The Bigger Picture</a>');
    if (fam.backInTime) famLinks.push('<a href="' + fam.backInTime + '" target="_blank" rel="noopener" style="color:var(--gold,#C9A227);text-decoration:none;">Back In Time</a>');
    if (famLinks.length) {
      var fp = document.createElement('p');
      fp.className = 'ap-family-links';
      fp.style.cssText = 'font-size:0.6rem;letter-spacing:0.1em;margin-top:8px;opacity:0.5;'
        + 'font-family:Inter,system-ui,sans-serif;text-align:center;';
      fp.innerHTML = 'A small family of sites — <span style="color:var(--gold,#C9A227)">AstroPrecise</span> <span style="opacity:.4">&middot;</span> '
        + famLinks.join(' <span style="opacity:.4">&middot;</span> ');
      host.appendChild(fp);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══ SOCIAL LINKS — dormant-by-default, single config (honesty: only render set handles) ═══
// Paste a full profile URL to switch each channel on; empty = hidden (no dead links).
// Used by the footer social row AND by links.html (the link-in-bio page).
window.AP_SOCIAL = window.AP_SOCIAL || {
  handle:    '@astroprecise',                                  // display handle (link-in-bio)
  tiktok:    '',  // https://www.tiktok.com/@astroprecise
  instagram: '',  // https://www.instagram.com/astroprecise
  pinterest: '',  // https://www.pinterest.com/astroprecise
  reddit:    '',  // https://www.reddit.com/user/astroprecise
  youtube:   '',  // https://www.youtube.com/@astroprecise
  x:         '',  // https://x.com/astroprecise
  threads:   '',  // https://www.threads.net/@astroprecise
};

(function injectSocialLinks() {
  var ORDER = [['tiktok','TikTok'],['instagram','Instagram'],['pinterest','Pinterest'],
               ['reddit','Reddit'],['youtube','YouTube'],['x','X'],['threads','Threads']];
  function place() {
    if (document.querySelector('.ap-social-links')) return;
    var S = window.AP_SOCIAL || {};
    var live = ORDER.filter(function (o) { return S[o[0]] && /^https?:\/\//.test(S[o[0]]); });
    if (!live.length) return; // dormant — nothing configured yet, render nothing
    var host = document.querySelector('footer .container') || document.querySelector('footer');
    if (!host) return;
    var p = document.createElement('p');
    p.className = 'ap-social-links';
    p.style.cssText = 'font-size:0.66rem;letter-spacing:0.1em;margin-top:10px;opacity:0.85;'
      + 'font-family:Inter,system-ui,sans-serif;text-align:center;';
    p.innerHTML = 'Follow ' + (S.handle || 'us') + ': ' + live.map(function (o) {
      return '<a href="' + S[o[0]] + '" target="_blank" rel="noopener noreferrer" '
        + 'style="color:var(--gold,#C9A227);text-decoration:none;">' + o[1] + '</a>';
    }).join(' <span style="opacity:.4">&middot;</span> ');
    host.appendChild(p);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', place);
  else place();
})();

// ═══════════════════════════════════════════════════════════════════════
// MONETISATION — provider-agnostic, dormant-by-default, link-out only.
// GitHub Pages forbids SELLING on the site, but permits donation/crowdfunding
// links, and outbound links to storefronts hosted elsewhere are fine. So every
// avenue here is an external link (tips, hosted product pages, newsletter,
// affiliate). Nothing renders until you paste a real URL below — so a visitor
// never sees a broken or fake checkout.  ◆ EDIT THIS BLOCK TO GO LIVE ◆
// ═══════════════════════════════════════════════════════════════════════
window.AP_MON = Object.assign({
  family: { biggerPicture: '', backInTime: '' },  // sibling sites — footer "family of sites" links (dormant until set)
  tipUrl:       '',   // tips/support — Ko-fi (0% on tips) or buymeacoffee. Pages-permitted.
  reportUrl:    '',   // premium written natal report — hosted product (Gumroad / Ko-fi Shop / Lemon Squeezy)
  posterUrl:    '',   // printable / print-on-demand chart poster — hosted store (Gumroad / Etsy / Gelato store)
  giftUrl:      '',   // gift a reading — hosted product
  newsletterUrl:'',   // email list signup — hosted (Buttondown / Kit / MailerLite)
  affiliateTag: '',   // honest affiliate tag for the shop page (e.g. Amazon Associates)
  // Deep Reading purchase link — the chart-page teaser's CTA points here when set.
  // Same rule as the rest: a hosted product page (Gumroad / Ko-fi Shop / Lemon
  // Squeezy). Empty '' = DORMANT: the teaser button falls back to email capture,
  // never a fake checkout.
  deepReadingUrl: '',
  // Price shown on the chart-page Deep Reading CTA — e.g. '£29'. Blank = no price
  // displayed (honesty: never show a price until the product is live and it matches
  // the storefront listing exactly).
  deepReadingPrice: '',
  // Email-list signup ENDPOINT (a hosted newsletter form-action, e.g. Buttondown
  // https://buttondown.email/api/emails/embed-subscribe/<user>, or a Mailchimp
  // post URL). Empty '' = DORMANT: the chart-page email form saves intent in
  // localStorage only — no data leaves the device. When set, the form POSTs here.
  emailUrl: '',

  // ═══════════════════════════════════════════════════════════════════════
  // COMMERCE — the "wear your sky" shop (config-driven, dormant by default).
  // ─────────────────────────────────────────────────────────────────────
  // Read by js/shop-commerce.js (window.AstroShop). The whole catalogue is
  // PERSONALISED-per-chart, ONE-TIME purchases — no subscriptions. Every
  // product fulfils elsewhere (hosted store / Etsy / Gelato / Gumroad), so
  // the site itself never takes money — Pages-compliant, link-out only.
  //
  // GO-LIVE: paste a URL into ONE of these and the matching path lights up.
  // Checkout priority (per item, highest first):
  //   1. product.fulfilUrl   — that product's own hosted listing ("Buy Now")
  //   2. checkout.externalStoreUrl / checkout.etsyUrl — whole-cart handoff
  //   3. checkout.paypalClientId — on-site PayPal Buttons (advanced)
  //   4. (none set) — DORMANT branded modal + email-signup invite
  // While every field below is '' the shop stays in honest pre-launch mode:
  // the cart is real and saved locally, but checkout invites you to be told
  // when the doors open — it never shows a fake or broken checkout.
  commerce: {
    // ── CHECKOUT — how the cart actually fulfils ──────────────────────────
    checkout: {
      paypalClientId:   '',   // PayPal REST Client ID → on-site Buttons (developer.paypal.com)
      currency:         'GBP',
      externalStoreUrl: '',   // whole-cart handoff to a hosted store (Shopify / Gelato pop-up)
      etsyUrl:          '',    // Etsy storefront ("Browse on Etsy" path)
    },

    // ── COLLECTIONS — the architecture of the sky ─────────────────────────
    // Every piece belongs to one collection. Re-themed from TBP's tree to
    // the chart: what you were born under, what you wear, what you keep.
    collections: {
      wearYourSky: {
        name: 'Wear Your Sky',
        story: 'Your exact birth sky, rendered for the body. Each piece is generated from your own chart — no two are alike.',
      },
      onYourWall: {
        name: 'On Your Wall',
        story: 'The map of the moment you arrived, printed to keep. Archive paper, your real placements, museum-grade.',
      },
      theReading: {
        name: 'The Reading',
        story: 'Words for your chart alone. Deep written readings and personalised guidance, delivered to you.',
      },
      gifts: {
        name: 'Gifts',
        story: 'A chart made for someone else — their exact sky, delivered with a note from you. Recipient birth details and your gift message are collected privately at checkout, never on this site.',
      },
    },

    // ── PRODUCTS ──────────────────────────────────────────────────────────
    // type: 'digital' | 'print' | 'apparel' | 'accessory'
    // personalized: true  → art/text is generated from the buyer's own chart
    // fulfilUrl: ''       → DORMANT (no per-product link yet); '' keeps it honest
    products: [
      {
        id:           'natal-poster',
        name:         'Your Natal Sky — Art Poster',
        type:         'print',
        collection:   'onYourWall',
        price:        42.00,
        personalized: true,
        badge:        'Signature',
        blurb:        'Your full birth chart as a fine-art print — the exact planetary geometry of your first breath, drawn in engraved gold on void black. 250gsm museum-grade matte, made to order. Foil and framed options at checkout.',
        icon:         'map',
        fulfilUrl:    '',
      },
      {
        id:           'sky-tee',
        name:         'Your Sky — Tee',
        type:         'apparel',
        collection:   'wearYourSky',
        price:        36.00,
        personalized: true,
        badge:        'New',
        blurb:        'The constellations overhead at your birth, printed across heavyweight cotton. Your sun, moon and rising marked in gold thread — a chart you can wear.',
        icon:         'star4',
        fulfilUrl:    '',
      },
      {
        id:           'sky-hoodie',
        name:         'Your Sky — Heavyweight Hoodie',
        type:         'apparel',
        collection:   'wearYourSky',
        price:        64.00,
        personalized: true,
        badge:        null,
        blurb:        'Your natal canopy across the back in fine line-work; your big-three glyphs at the cuff. Premium 350 gsm fleece, printed to order from your chart.',
        icon:         'crescent',
        fulfilUrl:    '',
      },
      {
        id:           'big-three-print',
        name:         'Big Three — Mini Print',
        type:         'print',
        collection:   'onYourWall',
        price:        20.00,
        personalized: true,
        badge:        null,
        blurb:        'Sun, Moon and Rising — your three load-bearing placements set as a clean typographic print. The chart distilled to its spine.',
        icon:         'sunhigh',
        fulfilUrl:    '',
      },
      {
        id:           'constellation-mug',
        name:         'Your Star Map — Mug',
        type:         'accessory',
        collection:   'wearYourSky',
        price:        19.00,
        personalized: true,
        badge:        null,
        blurb:        'The sky over your birthplace wrapped around matte ceramic, your sun-sign glyph at the rim. The first synchronicity of every morning.',
        icon:         'orb',
        fulfilUrl:    '',
      },
      {
        id:           'deep-reading',
        name:         'Deep Natal Reading — Digital',
        type:         'digital',
        collection:   'theReading',
        price:        39.00,
        personalized: true,
        badge:        'Bestseller',
        blurb:        'A long-form written reading of your whole chart — every placement and the major aspects, interpreted in depth. Typeset as a beautifully set multi-page PDF, yours to keep forever.',
        icon:         'book',
        fulfilUrl:    '',
      },
      {
        id:           'year-ahead',
        name:         'Your Year Ahead — Transit Report',
        type:         'digital',
        collection:   'theReading',
        // ⚠ NO generator backing yet — generate-reading.mjs is natal-only (no transit
        // module). Keep fulfilUrl '' until a transit report is built, or it can't be fulfilled.
        price:        32.00,
        personalized: true,
        badge:        null,
        blurb:        'Every major transit to your natal chart for the next twelve months, dated and interpreted — so you can read the weather before it arrives.',
        icon:         'calendar',
        fulfilUrl:    '',
      },
      {
        id:           'natal-poster-pdf',
        name:         'Your Natal Sky — Print-at-Home PDF',
        type:         'digital',
        collection:   'onYourWall',
        price:        14.00,
        personalized: true,
        badge:        'Instant',
        blurb:        'Your full birth chart as a print-ready PDF — the exact planetary geometry of your first breath, set on void black. Print it at home or at any print shop, any size. Delivered as a PDF, yours to keep.',
        icon:         'map',
        fulfilUrl:    '',   // ✅ generator-backed today: generate-reading.mjs outputs poster-<slug>.html
      },
      {
        id:           'reading-poster-bundle',
        name:         'Deep Reading + Poster — Bundle',
        type:         'digital',
        collection:   'theReading',
        price:        46.00,
        personalized: true,
        badge:        'Best value',
        blurb:        'Your long-form Deep Natal Reading and your print-at-home natal poster, generated together from one chart. The words and the map of your sky — two PDFs, yours to keep, for less than buying both.',
        icon:         'book',
        fulfilUrl:    '',   // ✅ generator-backed today: one run yields both reading + poster PDFs
      },
      {
        id:           'solar-return',
        name:         'Solar Return — Your Birthday Year',
        type:         'digital',
        collection:   'theReading',
        // ⚠ NO generator backing yet — needs a solar-return/transit module. Keep fulfilUrl '' until built.
        price:        29.00,
        personalized: true,
        badge:        null,
        blurb:        'Your solar-return chart for this birthday — the sky at the exact moment the Sun returns to its natal degree, read as the theme of your coming year. An annual ritual, no subscription. Delivered as a PDF.',
        icon:         'sunhigh',
        fulfilUrl:    '',
      },
      {
        id:           'gift-reading',
        name:         'Gift a Reading',
        type:         'digital',
        collection:   'gifts',
        price:        42.00,
        personalized: true,
        giftNote:     true,
        badge:        null,
        blurb:        'A Deep Natal Reading for someone you love — sent as a PDF gift voucher with a redemption code. They redeem by email and give us their own birth details; we generate the reading and deliver it with your note. Choose a delivery date at checkout.',
        icon:         'heart',
        fulfilUrl:    '',
      },
      {
        id:           'gift-box-whole-sky',
        name:         'The Whole Sky — Gift Box',
        type:         'print',
        collection:   'gifts',
        price:        69.00,
        personalized: true,
        giftNote:     true,
        badge:        'Gift',
        blurb:        'The complete gift: a Deep Natal Reading PDF plus an A4 foil natal print, shipped, with a personalised gift card carrying your note. They redeem the reading by email with their own birth details — their sky, never our server. Choose a delivery date at checkout, for less than the two bought separately.',
        icon:         'star4',
        fulfilUrl:    '',
      },
      {
        id:           'two-skies-map',
        name:         'Two Skies — Couples Star Map',
        type:         'print',
        collection:   'gifts',
        price:        48.00,
        personalized: true,
        giftNote:     true,
        badge:        'Together',
        blurb:        'Two birth charts, one print — your sky and theirs, set side by side on void black. The proven anniversary and wedding keepsake. 250gsm museum-grade matte; framed option at checkout.',
        icon:         'crescent',
        fulfilUrl:    '',
      },
    ],
  },
}, window.AP_MON || {});

(function monetisation() {
  const M = window.AP_MON;
  const isUrl = u => typeof u === 'string' && /^https?:\/\//i.test(u.trim());
  const keyToUrl = k => M[k + 'Url'];

  function wire() {
    // Buttons/links opt in with data-mon="report|poster|gift|newsletter|tip".
    // mode: data-mon-mode="hide" (default — vanish until configured) or "dormant"
    // (stay visible but disabled with a gentle "coming soon").
    document.querySelectorAll('[data-mon]').forEach(el => {
      const url = keyToUrl(el.dataset.mon);
      const mode = el.dataset.monMode || 'hide';
      if (isUrl(url)) {
        if (el.tagName === 'A') { el.href = url; el.target = '_blank'; el.rel = 'noopener'; }
        else el.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
        el.removeAttribute('aria-disabled');
        el.style.removeProperty('display');
      } else if (mode === 'dormant') {
        el.setAttribute('aria-disabled', 'true');
        el.style.opacity = '0.55'; el.style.cursor = 'default';
        el.addEventListener('click', e => { e.preventDefault();
          if (window.AstroApp) AstroApp.showToast('Coming soon', 'This offering isn’t open yet.', 'info'); });
      } else {
        el.style.display = 'none'; // honest: no link, no clutter
      }
    });

    // Footer support line — appears the moment a tip URL is configured.
    if (isUrl(M.tipUrl) && !document.querySelector('.ap-support-link')) {
      const host = document.querySelector('.ap-legal-links') || document.querySelector('.footer-legal')
        || document.querySelector('footer .container') || document.querySelector('footer');
      if (host) {
        const a = document.createElement('a');
        a.className = 'ap-support-link';
        a.href = M.tipUrl; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = '♥ Support the free chart';
        a.style.cssText = 'display:inline-block;margin-top:8px;font-family:Inter,system-ui,sans-serif;'
          + 'font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold,#C9A227);text-decoration:none;';
        host.appendChild(document.createElement('br'));
        host.appendChild(a);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();

document.addEventListener('DOMContentLoaded', () => AstroApp.init());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* Horizon: privacy banner (first visit) + offline-ready pill */
(function () {
  const ACK_KEY = 'ap_privacy_ack';

  function showPrivacyBanner() {
    if (localStorage.getItem(ACK_KEY)) return;
    const b = document.createElement('div');
    b.className = 'privacy-banner';
    b.setAttribute('role', 'status');
    b.innerHTML =
      '<span class="privacy-banner__text"><strong>Everything happens in your hands.</strong> ' +
      'Charts and readings compute in your browser. Only place-name searches query a geocoder ' +
      '(Open-Meteo) — your birth moment and readings never leave your device.</span>' +
      '<button class="privacy-banner__close" aria-label="Dismiss privacy notice">Understood</button>';
    document.body.appendChild(b);
    b.querySelector('.privacy-banner__close').addEventListener('click', () => {
      b.classList.add('is-hidden');
      try { localStorage.setItem(ACK_KEY, '1'); } catch (e) {}
      setTimeout(() => b.remove(), 600);
    });
  }

  function showOfflinePill() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(() => {
      if (!navigator.serviceWorker.controller) return;
      const p = document.createElement('div');
      p.className = 'offline-ready-pill';
      p.textContent = 'Works offline';
      document.body.appendChild(p);
      requestAnimationFrame(() => p.classList.add('is-visible'));
      setTimeout(() => { p.classList.remove('is-visible'); setTimeout(() => p.remove(), 600); }, 5000);
    }).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { showPrivacyBanner(); showOfflinePill(); });
  } else {
    showPrivacyBanner();
    showOfflinePill();
  }
})();

/* Horizon: scroll-reveal entrances + mobile bottom nav */
(function () {
  function initReveal() {
    if (!window.IntersectionObserver) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const candidates = document.querySelectorAll(
      '.feature-card, .planet-weather-card, .sign-card, .reading-card, ' +
      '.transit-item, .element-compat-card, .category-score-item, .moon-card, .manifesto'
    );
    if (!candidates.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('revealed');
        obs.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    candidates.forEach((el, i) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('reveal-init');
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      obs.observe(el);
    });
  }

  function initBottomNav() {
    if (document.querySelector('.bottom-nav')) return;
    const here = (location.pathname.split('/').pop() || 'index.html');
    const items = [
      { href: 'index.html',         icon: '✦', label: 'Home' },
      { href: 'chart.html',         icon: '◉', label: 'Chart' },
      { href: 'horoscope.html',     icon: '☽', label: 'Daily' },
      { href: 'lifepath.html',      icon: '✩', label: 'Life Path' },
      { href: 'compatibility.html', icon: '♡', label: 'Match' },
    ];
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');
    nav.innerHTML = '<div class="bottom-nav__inner">' + items.map(it =>
      '<a href="' + it.href + '" class="bottom-nav__item' + (here === it.href ? ' is-active' : '') + '"' +
      (here === it.href ? ' aria-current="page"' : '') + '>' +
      '<span class="bottom-nav__icon" aria-hidden="true">' + it.icon + '</span>' +
      '<span class="bottom-nav__label">' + it.label + '</span></a>'
    ).join('') + '</div>';
    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initReveal(); initBottomNav(); });
  } else {
    initReveal();
    initBottomNav();
  }
})();

/* Corner solar system: real heliocentric longitudes via VSOP87.
   Orbital periods scaled so Mercury = 14 s CSS animation.
   Saturn, Uranus and Neptune appended dynamically with proper radii. */
(function () {
  const PLANETS = [
    { id: 'mercury', period: 87.969 },
    { id: 'venus',   period: 224.701 },
    { id: 'earth',   period: 365.256 },
    { id: 'mars',    period: 686.980 },
    { id: 'jupiter', period: 4332.589 },
  ];
  const OUTER = [
    { id: 'saturn',  period: 10759.22,  r: 360,  cls: 'css-planet--saturn' },
    { id: 'uranus',  period: 30688.5,   r: 415,  cls: 'css-planet--uranus' },
    { id: 'neptune', period: 60182.0,   r: 460,  cls: 'css-planet--neptune' },
  ];
  const S = 14 / 87.969; // seconds-per-day scale: Mercury = 14 s

  function helioLon(E, id, jd) {
    const sun = E.sunPosition(jd);
    const sx = sun.distance * Math.cos(sun.lon * Math.PI / 180);
    const sy = sun.distance * Math.sin(sun.lon * Math.PI / 180);
    let hx, hy;
    if (id === 'earth') {
      hx = -sx; hy = -sy;
    } else {
      const g = E[id + 'Position'](jd);
      hx = g.distance * Math.cos(g.lon * Math.PI / 180) - sx;
      hy = g.distance * Math.sin(g.lon * Math.PI / 180) - sy;
    }
    return ((Math.atan2(hy, hx) * 180 / Math.PI) + 360) % 360;
  }

  function applyPhase(orbit, lon, dur) {
    orbit.style.animationDuration  = dur + 's';
    orbit.style.animationDirection = 'reverse';
    orbit.style.animationDelay     = -(((360 - lon) / 360) * dur) + 's';
  }

  function init() {
    const E = window.AstroEphemeris;
    if (!E || typeof E.julianDay !== 'function' || typeof E.sunPosition !== 'function') {
      setTimeout(init, 400);
      return;
    }
    const systems = document.querySelectorAll('.cosmos-solar-system');
    if (!systems.length) return;

    const now = new Date();
    const jd  = E.julianDay(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
                             now.getUTCHours(), now.getUTCMinutes(), 0);

    systems.forEach(sys => {
      // Update inner planets already in the HTML
      sys.querySelectorAll('.css-orbit').forEach((orbit, i) => {
        const p = PLANETS[i];
        if (!p) return;
        try { applyPhase(orbit, helioLon(E, p.id, jd), p.period * S); } catch (_) {}
      });

      // Append outer planets if not already done
      OUTER.forEach(op => {
        const marker = 'css-orbit--' + op.id + '-live';
        if (sys.querySelector('.' + marker)) return;
        let lon;
        try { lon = helioLon(E, op.id, jd); } catch (_) { return; }
        const dur    = op.period * S;
        const d      = op.r * 2;
        const orbit  = document.createElement('div');
        orbit.className = 'css-orbit ' + marker;
        orbit.style.cssText = `--r:${op.r}px;width:${d}px;height:${d}px;`;
        applyPhase(orbit, lon, dur);
        orbit.innerHTML = `<div class="css-planet ${op.cls}"></div>`;
        sys.appendChild(orbit);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ═══════════════════════════════════════════════════════════════════════
// EMAIL CAPTURE / SUBSCRIBERS — one honest engine, dormant-by-default.
// The "subscriber database" is a hosted provider (Kit / Buttondown / MailerLite)
// the site POSTs to via AP_MON.newsletterUrl. Until that's set, sign-ups are
// relayed to the owner by mailto (AP_MON.ownerEmail) AND saved on-device — so an
// early sign-up is never silently lost. Only the email is ever sent; birth data
// never leaves the device. Adds a site-wide footer signup, "Cosmic Weather
// Premium" waitlist wiring, and an owner CSV export (AstroApp.exportIntents()).
// ═══════════════════════════════════════════════════════════════════════
(function emailEngine() {
  var M = window.AP_MON = window.AP_MON || {};
  if (typeof M.waitlistUrl === 'undefined') M.waitlistUrl = '';   // separate list/tag for the premium waitlist
  if (typeof M.ownerEmail  === 'undefined') M.ownerEmail  = '';   // mailto relay target before a provider is live
  // emailUrl and newsletterUrl are aliases — set EITHER, get both.
  var liveUrl = (M.newsletterUrl && String(M.newsletterUrl).trim()) || (M.emailUrl && String(M.emailUrl).trim()) || '';
  M.newsletterUrl = M.emailUrl = liveUrl;

  window.AP_COPY = window.AP_COPY || {
    privacyMicro: 'Only the email you choose to give us is ever sent — your birth data never leaves your device. Unsubscribe anytime.',
    confirmDoubleOptIn: 'Almost there — check your inbox and tap the confirmation link. (Just one email; your birth data stayed on your device.)',
    dormantSaved: 'Sign-up isn’t live yet, so nothing left your browser. The moment it opens, you’ll be first.'
  };

  var isUrl = function (u) { return typeof u === 'string' && /^https?:\/\//i.test((u || '').trim()); };
  var isEmail = function (e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || ''); };

  // Honest 3-tier capture: configured provider POST → owner mailto relay → localStorage.
  function captureEmail(email, opts) {
    opts = opts || {};
    var Mn = window.AP_MON || {};
    var endpoint = (opts.list === 'waitlist' && isUrl(Mn.waitlistUrl)) ? Mn.waitlistUrl.trim()
                 : (isUrl(Mn.newsletterUrl) ? Mn.newsletterUrl.trim() : '');
    if (endpoint) {
      try {
        var body = new FormData();
        body.append('email', email);
        if (opts.tag) body.append('tags', opts.tag);
        fetch(endpoint, { method: 'POST', mode: 'no-cors', body: body });
      } catch (e) {}
    } else if (Mn.ownerEmail && isEmail(Mn.ownerEmail)) {
      try {
        var subj = encodeURIComponent('AstroPrecise sign-up' + (opts.list ? ' — ' + opts.list : ''));
        var bdy = encodeURIComponent('New subscriber: ' + email + (opts.source ? '\nSource: ' + opts.source : ''));
        var a = document.createElement('a');
        a.href = 'mailto:' + Mn.ownerEmail + '?subject=' + subj + '&body=' + bdy;
        a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } catch (e) {}
    }
    // Always also save same-device intent (owner backstop / offline convenience, capped).
    try {
      var key = 'ap_email_intent';
      var prev = JSON.parse(localStorage.getItem(key) || '[]');
      prev.push(Object.assign({ email: email, savedAt: Date.now(), source: opts.source || null }, opts.meta || {}));
      localStorage.setItem(key, JSON.stringify(prev.slice(-50)));
    } catch (e) {}
    return { sent: endpoint ? 'provider' : (Mn.ownerEmail ? 'mailto' : 'local') };
  }

  // Owner utility: download captured local intents as CSV (run AstroApp.exportIntents() or visit #export-intents).
  function exportIntents() {
    var rows; try { rows = JSON.parse(localStorage.getItem('ap_email_intent') || '[]'); } catch (e) { rows = []; }
    if (!rows.length) return '';
    var cols = ['email', 'source', 'sunSign', 'forName', 'savedAt'];
    var csv = [cols.join(',')].concat(rows.map(function (r) {
      return cols.map(function (c) {
        return JSON.stringify(c === 'savedAt' && r[c] ? new Date(r[c]).toISOString() : (r[c] == null ? '' : r[c]));
      }).join(',');
    })).join('\n');
    try {
      var blob = new Blob([csv], { type: 'text/csv' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'ap-email-intents.csv'; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) {}
    return csv;
  }

  if (window.AstroApp) { window.AstroApp.captureEmail = captureEmail; window.AstroApp.exportIntents = exportIntents; }
  if (location.hash === '#export-intents') setTimeout(exportIntents, 400);

  // ── Site-wide footer email signup (every page; skips the chart page's richer form) ──
  function injectFooterSignup() {
    if (document.querySelector('.ap-footer-signup')) return;
    if (document.getElementById('email-capture')) return;   // chart page already has the primary form
    var host = document.querySelector('footer .container') || document.querySelector('footer');
    if (!host) return;
    var wrap = document.createElement('div');
    wrap.className = 'ap-footer-signup';
    wrap.style.cssText = 'max-width:440px;margin:18px auto 6px;text-align:center;font-family:Inter,system-ui,sans-serif;';
    wrap.innerHTML =
      '<p style="font-size:0.8rem;color:var(--silver,#C8D0E8);margin:0 0 8px;letter-spacing:0.02em;">Your sky, in your inbox — a little cosmic weather, now and then.</p>'
      + '<form class="ap-footer-signup__form" novalidate style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">'
      + '<input type="email" name="email" required placeholder="you@example.com" autocomplete="email" aria-label="Your email address" '
      + 'style="flex:1;min-width:180px;padding:9px 12px;border-radius:10px;border:1px solid var(--border,rgba(150,175,230,0.2));background:rgba(9,11,22,0.6);color:#fff;font-size:0.82rem;">'
      + '<button type="submit" style="padding:9px 16px;border-radius:10px;border:1px solid var(--gold,#C9A227);background:rgba(201,162,39,0.14);color:var(--gold,#C9A227);font-size:0.78rem;font-weight:600;cursor:pointer;white-space:nowrap;">&#10022; Subscribe</button>'
      + '</form>'
      + '<p class="ap-footer-signup__msg" role="status" aria-live="polite" style="font-size:0.62rem;color:var(--silver-dim,#8891AA);margin:8px 0 0;line-height:1.6;">' + window.AP_COPY.privacyMicro + '</p>';
    host.appendChild(wrap);
    var form = wrap.querySelector('form'), msg = wrap.querySelector('.ap-footer-signup__msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      if (!isEmail(email)) { if (window.AstroApp) AstroApp.showToast('Check your email', 'That address looks off.', 'warning'); return; }
      var res = captureEmail(email, { source: 'footer', tag: 'tag_footer' });
      msg.innerHTML = res.sent === 'provider'
        ? '<strong style="color:var(--gold,#C9A227)">' + window.AP_COPY.confirmDoubleOptIn + '</strong>'
        : '<strong style="color:var(--gold,#C9A227)">Noted.</strong> ' + window.AP_COPY.dormantSaved;
      form.style.display = 'none';
    });
  }

  // ── "Cosmic Weather Premium" waitlist forms (validate the future subscription) ──
  function wireWaitlist() {
    document.querySelectorAll('.cw-waitlist__form').forEach(function (f) {
      if (f._wired) return; f._wired = true;
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = f.email.value.trim();
        if (!isEmail(email)) { if (window.AstroApp) AstroApp.showToast('Check your email', 'That looks off.', 'warning'); return; }
        var res = captureEmail(email, { list: 'waitlist', source: 'waitlist', tag: 'tag_waitlist' });
        var box = f.closest('.cw-waitlist');
        if (box) box.innerHTML = '<p class="cw-waitlist__eyebrow" style="font-size:0.58rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--silver-dim,#8891AA);margin:0 0 0.3rem;">You’re on the waitlist.</p><p style="font-family:\'Cormorant Garamond\',serif;font-size:0.98rem;color:var(--silver,#C8D0E8);margin:0;">'
          + (res.sent === 'provider' ? 'Check your inbox to confirm. We’ll only ever email you if this becomes real.'
                                     : 'Saved — nothing was sent or charged. If enough of you want it, we’ll build it.') + '</p>';
      });
    });
  }

  function boot() { injectFooterSignup(); wireWaitlist(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
