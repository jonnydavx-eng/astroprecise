/**
 * AstroPrecise — Art Theme Library (expansion packs for shop + fulfilment)
 * Loads website/data/art-themes.json · persists selection in localStorage.
 */
'use strict';

(function initArtThemeLibrary() {
  const STORAGE_KEY = 'ap_art_theme';
  const SIGN_TO_THEME = {
    Aries: 'sign-aries', Taurus: 'sign-taurus', Gemini: 'sign-gemini', Cancer: 'sign-cancer',
    Leo: 'sign-leo', Virgo: 'sign-virgo', Libra: 'sign-libra', Scorpio: 'sign-scorpio',
    Sagittarius: 'sign-sagittarius', Capricorn: 'sign-capricorn', Aquarius: 'sign-aquarius', Pisces: 'sign-pisces',
  };

  const ELEMENT_STROKE = {
    fire: '#F0A878', earth: '#A8C07A', air: '#C6AEDA', water: '#7FB8B0',
  };
  const ELEMENT_FILL = {
    fire: 'rgba(216,90,44,.22)', earth: 'rgba(94,122,58,.22)',
    air: 'rgba(167,139,186,.2)', water: 'rgba(63,125,118,.22)',
  };

  let data = null;
  let ready = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function load() {
    if (ready) return ready;
    ready = fetch('data/art-themes.json?v=186')
      .then(r => { if (!r.ok) throw new Error('art-themes.json ' + r.status); return r.json(); })
      .then(json => {
        data = json;
        const map = {};
        (data.themes || []).forEach(t => { map[t.id] = t; });
        data._map = map;
        return data;
      })
      .catch(() => {
        data = { version: 0, defaultTheme: 'observatory-gold', packs: [], themes: [], _map: {} };
        return data;
      });
    return ready;
  }

  function themeById(id) {
    if (!data || !data._map) return null;
    return data._map[id] || data._map[data.defaultTheme] || null;
  }

  function packs() {
    return (data && data.packs) || [];
  }

  function themesForPack(packId) {
    if (!data) return [];
    if (!packId || packId === 'all') return data.themes || [];
    return (data.themes || []).filter(t => t.pack === packId);
  }

  function getSelected() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) { /* ignore */ }
    return { id: (data && data.defaultTheme) || 'observatory-gold', savedAt: null };
  }

  function setSelected(id) {
    const theme = themeById(id);
    if (!theme) return null;
    const payload = {
      id: theme.id,
      name: theme.name,
      pack: theme.pack,
      savedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (e) { /* ignore */ }
    window.dispatchEvent(new CustomEvent('ap-art-theme', { detail: payload }));
    return payload;
  }

  function savedChart() {
    try {
      const list = window.AstroProfile && AstroProfile.getCharts ? AstroProfile.getCharts() : [];
      return (list && list.length) ? list[0] : null;
    } catch (e) { return null; }
  }

  function recommend(chart, packId) {
    if (!data) return data && data.defaultTheme;
    const c = chart || savedChart();
    const sun = c && (c.sunSign || c.sun);
    if (packId === 'sun-sign' && sun && SIGN_TO_THEME[sun]) return SIGN_TO_THEME[sun];
    if (packId === 'couples') return 'couples-rose-gold';
    if (packId === 'lifepath') return 'lifepath-sacred';
    if (packId === 'horoscope') return 'horoscope-solar';
    if (packId === 'masculine') return 'masculine-copper';
    if (packId === 'feminine') return 'feminine-rose-gold';
    if (sun && SIGN_TO_THEME[sun] && (!packId || packId === 'natal')) {
      return packId === 'natal' ? 'observatory-gold' : SIGN_TO_THEME[sun];
    }
    return data.defaultTheme || 'observatory-gold';
  }

  function themePalette(theme) {
    const t = typeof theme === 'string' ? themeById(theme) : theme;
    if (!t || !t.palette) return null;
    return {
      void: t.palette.void,
      plate: t.palette.plate,
      mid: t.palette.mid,
      gold: t.palette.gold,
      goldLight: t.palette.goldLight,
      parchment: t.palette.parchment,
      silver: t.palette.silver,
      accent: t.palette.accent,
      elementStroke: { ...ELEMENT_STROKE },
      elementFill: { ...ELEMENT_FILL },
    };
  }

  /** Mini SVG wheel preview for theme cards */
  function previewSvg(themeId, size) {
    const theme = themeById(themeId);
    if (!theme) return '';
    const sz = size || 120;
    const p = theme.palette;
    const cx = sz / 2;
    const cy = sz / 2;
    const R = sz / 2 - 4;
    const rIn = R * 0.55;
    const dual = theme.dual;
    let rings = '';
    for (let i = 0; i < 12; i++) {
      const a0 = (i * 30 - 90) * Math.PI / 180;
      const a1 = ((i + 1) * 30 - 90) * Math.PI / 180;
      const elem = ['fire', 'earth', 'air', 'water'][i % 4];
      const fill = dual && i < 6 ? dual.left : (dual && i >= 6 ? dual.right : (ELEMENT_FILL[elem] || p.accent));
      const x0 = cx + R * Math.cos(a0);
      const y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1);
      const y1 = cy + R * Math.sin(a1);
      const xi0 = cx + rIn * Math.cos(a0);
      const yi0 = cy + rIn * Math.sin(a0);
      const xi1 = cx + rIn * Math.cos(a1);
      const yi1 = cy + rIn * Math.sin(a1);
      rings += `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0,1 ${x1.toFixed(1)},${y1.toFixed(1)} L${xi1.toFixed(1)},${yi1.toFixed(1)} A${rIn},${rIn} 0 0,0 ${xi0.toFixed(1)},${yi0.toFixed(1)} Z" fill="${typeof fill === 'string' && fill.startsWith('#') ? fill + '33' : fill}" stroke="${p.gold}" stroke-width="0.4" opacity="0.85"/>`;
    }
    return `<svg class="ap-art-preview__wheel" viewBox="0 0 ${sz} ${sz}" width="${sz}" height="${sz}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><radialGradient id="apw-${esc(themeId)}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${p.plate}"/><stop offset="60%" stop-color="${p.mid}"/><stop offset="100%" stop-color="${p.void}"/>
      </radialGradient></defs>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#apw-${esc(themeId)})"/>
      ${rings}
      <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="none" stroke="${p.gold}" stroke-width="0.8" opacity="0.6"/>
      <circle cx="${cx}" cy="${cy}" r="2.5" fill="${p.goldLight}"/>
    </svg>`;
  }

  function swatchHtml(theme) {
    const sw = (theme && theme.swatch) || [];
    return sw.map(c => `<span class="ap-art-swatch" style="background:${esc(c)}"></span>`).join('');
  }

  window.AP_ART = {
    load,
    packs,
    themesForPack,
    themeById,
    getSelected,
    setSelected,
    recommend,
    savedChart,
    themePalette,
    previewSvg,
    swatchHtml,
    esc,
    SIGN_TO_THEME,
    STORAGE_KEY,
  };
})();