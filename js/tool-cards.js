/**
 * AstroPrecise — shared free-core tool cards (visuals + links).
 * Used on shop.html; catalog mirrors homepage tool-card copy.
 */
'use strict';

window.AstroToolCards = (() => {

  const TOOLS = [
    {
      id: 'chart',
      href: 'chart.html',
      label: 'Core Tool',
      title: 'Birth Chart',
      desc: 'Full natal chart with VSOP87 planetary positions, house cusps, all Ptolemaic aspects with orbs, and deep interpretations. Includes a downloadable poster at print resolution.',
      cta: 'Open chart calculator',
      icon: 'spiral',
      glyph: '⊙',
      visual: 'wheel',
      wide: true,
      badge: 'Free · No account',
    },
    {
      id: 'horoscope',
      href: 'horoscope.html',
      label: 'Daily',
      title: 'Daily Horoscope',
      desc: 'Element, modality, and planetary ruler-informed readings for each sign. Deterministic — same day, same sign, same reading, always.',
      cta: 'Read yours',
      icon: 'crescent',
      glyph: '☽',
      visual: 'ecliptic',
      badge: 'Free · Offline',
    },
    {
      id: 'lifepath',
      href: 'lifepath.html',
      label: 'Numerology',
      title: 'Life Path',
      desc: 'Pythagorean numerology with all master numbers (11, 22, 33). Life Path, Expression, Soul Urge, and Personal Year — with a downloadable reading card.',
      cta: 'Calculate',
      icon: 'gem',
      glyph: null,
      visual: 'numerology',
      badge: 'Free · Download card',
    },
    {
      id: 'compatibility',
      href: 'compatibility.html',
      label: 'Synastry',
      title: 'Compatibility',
      desc: 'Two charts overlaid in synastry — inter-chart aspects with precise orbs, compatibility score, and shareable invite links so partners can calculate together.',
      cta: 'Compare charts',
      icon: 'heart',
      glyph: null,
      visual: 'synastry',
      badge: 'Free · Shareable',
    },
    {
      id: 'transits',
      href: 'transits.html',
      label: 'Live Sky',
      title: 'Current Transits',
      desc: 'Real-time sky versus your natal chart. See exactly which natal planets are being activated by current transits, with interpretations and a personal forecast.',
      cta: 'View transits',
      icon: 'sunhigh',
      glyph: '☿',
      visual: 'transits',
      badge: 'Free · Live sky',
    },
    {
      id: 'instrument',
      href: 'ephemeris.html',
      label: 'Signature Feature',
      title: 'The Instrument',
      desc: 'Your birth as an event in spacetime. VSOP87 light-cone wavefront, zenith stars, echo dates, field weather, and a precession engine. Unique to AstroPrecise.',
      cta: 'Open The Instrument',
      icon: 'orb',
      glyph: '⬡',
      visual: 'lightcone',
      wide: true,
      badge: 'Free · Unique',
    },
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name, cls) {
    return `<svg class="eng-i ${cls || ''}" aria-hidden="true"><use href="#ei-${name || 'star4'}"/></svg>`;
  }

  function visualHtml(type) {
    switch (type) {
      case 'wheel':
        return `<svg class="ap-tool-viz ap-tool-viz--wheel" viewBox="0 0 120 120" aria-hidden="true">
          <defs><radialGradient id="ap-wh-g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="rgba(201,162,39,0.18)"/><stop offset="100%" stop-color="rgba(5,4,6,0)"/></radialGradient></defs>
          <circle cx="60" cy="60" r="56" fill="url(#ap-wh-g)"/>
          <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(201,162,39,0.45)" stroke-width="1.2"/>
          <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(201,162,39,0.28)" stroke-width="0.9"/>
          <circle cx="60" cy="60" r="22" fill="none" stroke="rgba(201,162,39,0.18)" stroke-width="0.7"/>
          ${[0,30,60,90,120,150,180,210,240,270,300,330].map((d, i) => {
            const r = (d * Math.PI) / 180;
            const x1 = 60 + Math.cos(r) * 22;
            const y1 = 60 + Math.sin(r) * 22;
            const x2 = 60 + Math.cos(r) * 54;
            const y2 = 60 + Math.sin(r) * 54;
            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(201,162,39,${0.12 + (i % 3) * 0.06})" stroke-width="0.6"/>`;
          }).join('')}
          <circle cx="78" cy="42" r="3" fill="#E8C872"/><circle cx="44" cy="68" r="2.5" fill="#C9A227"/>
          <circle cx="72" cy="78" r="2" fill="#b87850"/><text x="60" y="64" text-anchor="middle" font-size="14" fill="#C9A227" font-family="serif">☉</text>
        </svg>`;
      case 'ecliptic':
        return `<svg class="ap-tool-viz ap-tool-viz--ecliptic" viewBox="0 0 120 120" aria-hidden="true">
          <ellipse cx="60" cy="60" rx="50" ry="18" fill="none" stroke="rgba(201,162,39,0.4)" stroke-width="1.2"/>
          <circle cx="88" cy="52" r="8" fill="rgba(201,162,39,0.12)" stroke="#C9A227" stroke-width="0.8"/>
          <text x="88" y="55" text-anchor="middle" font-size="10" fill="#E8C872">☽</text>
          <circle cx="32" cy="68" r="5" fill="rgba(176,74,82,0.2)" stroke="#b04a52" stroke-width="0.6"/>
          <text x="32" y="71" text-anchor="middle" font-size="7" fill="#E8C872">♈</text>
        </svg>`;
      case 'numerology':
        return `<div class="ap-tool-viz ap-tool-viz--nums" aria-hidden="true">
          <span class="ap-tool-viz__num ap-tool-viz__num--main">7</span>
          <span class="ap-tool-viz__num">11</span><span class="ap-tool-viz__num">22</span><span class="ap-tool-viz__num">33</span>
        </div>`;
      case 'synastry':
        return `<svg class="ap-tool-viz ap-tool-viz--synastry" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="48" cy="60" r="28" fill="rgba(176,74,82,0.08)" stroke="rgba(176,120,80,0.5)" stroke-width="1"/>
          <circle cx="72" cy="60" r="28" fill="rgba(201,162,39,0.06)" stroke="rgba(201,162,39,0.45)" stroke-width="1"/>
          <path d="M60 44 C54 52 54 68 60 76 C66 68 66 52 60 44Z" fill="rgba(201,162,39,0.25)" stroke="#C9A227" stroke-width="0.8"/>
        </svg>`;
      case 'transits':
        return `<svg class="ap-tool-viz ap-tool-viz--transits" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(201,162,39,0.25)" stroke-width="1" stroke-dasharray="4 6"/>
          <circle cx="60" cy="60" r="30" fill="none" stroke="rgba(201,162,39,0.15)" stroke-width="0.8"/>
          <circle cx="60" cy="34" r="3" fill="#E8C872"/><circle cx="88" cy="60" r="2.5" fill="#C9A227"/>
          <line x1="60" y1="34" x2="72" y2="48" stroke="rgba(201,162,39,0.5)" stroke-width="0.8"/>
          <circle cx="48" cy="72" r="2" fill="#b87850"/>
        </svg>`;
      case 'lightcone':
        return `<svg class="ap-tool-viz ap-tool-viz--lightcone" viewBox="0 0 120 120" aria-hidden="true">
          <polygon points="60,18 95,88 25,88" fill="none" stroke="rgba(201,162,39,0.35)" stroke-width="1"/>
          <polygon points="60,32 82,82 38,82" fill="rgba(201,162,39,0.06)" stroke="rgba(201,162,39,0.2)" stroke-width="0.6"/>
          <circle cx="60" cy="88" r="4" fill="#C9A227"/>
          <line x1="60" y1="18" x2="60" y2="88" stroke="rgba(201,162,39,0.4)" stroke-width="0.8"/>
          <line x1="38" y1="60" x2="82" y2="60" stroke="rgba(201,162,39,0.15)" stroke-width="0.6"/>
        </svg>`;
      default:
        return `<span class="ap-tool-viz ap-tool-viz--glyph" aria-hidden="true">${icon('star4')}</span>`;
    }
  }

  function cardHtml(t) {
    const glyph = t.glyph
      ? `<span class="ap-tool-card__glyph" aria-hidden="true">${t.glyph}</span>`
      : `<span class="ap-tool-card__glyph" aria-hidden="true">${icon(t.icon)}</span>`;
    return `
      <a href="${esc(t.href)}" class="ap-tool-card${t.wide ? ' ap-tool-card--wide' : ''}" role="listitem" aria-label="${esc(t.title)}">
        <div class="ap-tool-card__visual">${visualHtml(t.visual)}</div>
        <div class="ap-tool-card__body">
          ${glyph}
          <p class="ap-tool-card__label">${esc(t.label)}</p>
          <h3 class="ap-tool-card__title">${esc(t.title)}</h3>
          <p class="ap-tool-card__desc">${esc(t.desc)}</p>
          <span class="ap-tool-card__badge">${esc(t.badge)}</span>
          <span class="ap-tool-card__cta" aria-hidden="true">${esc(t.cta)} &rarr;</span>
        </div>
      </a>`;
  }

  function render(host) {
    if (!host) return;
    host.innerHTML = `
      <header class="ap-free-core__head">
        <p class="shop-section-title" style="justify-content:center;"><svg class="eng-i" aria-hidden="true"><use href="#ei-star4"/></svg> Free core — cast before you buy</p>
        <p class="ap-free-core__sub">Every paid piece is generated from a chart you calculate here. These instruments are free, offline-capable, and never send birth data to a server.</p>
      </header>
      <div class="ap-tools-bento sacred-geo" role="list">${TOOLS.map(cardHtml).join('')}</div>`;
  }

  function init() {
    render(document.getElementById('shop-free-core'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { TOOLS, render, cardHtml, visualHtml };
})();