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
    initNavbar();
    initToastContainer();
    initScrollAnimations();
    initModalHandlers();
    markActiveNavLink();

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

  function markActiveNavLink() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar__link, .navbar__mobile-menu a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href === page || (page === 'index.html' && href === '#')) {
        a.classList.add('active');
      }
    });
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
    const icons = { success: '✓', error: '✕', warning: '⚠', info: '✦' };
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

  function initCityAutocomplete(inputEl, latEl, lonEl, dropdown) {
    if (!inputEl || !dropdown) return;

    function search(query) {
      const q = query.toLowerCase().trim();
      if (q.length < 2) { dropdown.classList.remove('open'); return; }

      const results = CITIES.filter(c =>
        c.name.toLowerCase().startsWith(q) ||
        c.name.toLowerCase().includes(q)
      ).slice(0, 8);

      dropdown.innerHTML = '';
      if (results.length === 0) { dropdown.classList.remove('open'); return; }

      results.forEach(city => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `${city.name} <span class="city-country">${city.country}</span>`;
        item.addEventListener('click', () => {
          inputEl.value = city.name;
          if (latEl) latEl.value = city.lat;
          if (lonEl) lonEl.value = city.lon;
          dropdown.classList.remove('open');
          inputEl.dispatchEvent(new Event('citySelected', { detail: city }));
        });
        dropdown.appendChild(item);
      });

      dropdown.classList.add('open');
    }

    inputEl.addEventListener('input', () => search(inputEl.value));
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
    detectTimezone,
    buildPlanetTable,
    buildHoroscopeCard,
    CITIES,
  };
})();

document.addEventListener('DOMContentLoaded', () => AstroApp.init());

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
