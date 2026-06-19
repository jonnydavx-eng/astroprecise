/**
 * AstroPrecise — lightweight footer social row for legal / error pages.
 * No app.js, ephemeris, or affiliate ads — only the social icon row.
 */
'use strict';

(function () {

  window.AP_SOCIAL = window.AP_SOCIAL || {
    handle: '@astroprecise',
    tiktok: '',
    instagram: '',
    pinterest: '',
    reddit: '',
    youtube: '',
    x: '',
    threads: '',
    facebook: '',
    linkedin: '',
    bluesky: '',
  };

  var SOCIAL_ORDER = [
    ['tiktok', 'TikTok'],
    ['instagram', 'Instagram'],
    ['pinterest', 'Pinterest'],
    ['youtube', 'YouTube'],
    ['x', 'X'],
    ['threads', 'Threads'],
    ['reddit', 'Reddit'],
    ['facebook', 'Facebook'],
    ['linkedin', 'LinkedIn'],
    ['bluesky', 'Bluesky'],
  ];

  var SOCIAL_SVG = {
    tiktok: '<path d="M14 4.5v8.2a3.3 3.3 0 1 1-2.3-3.1V8.8c2.4.5 4.3 2 5.3 4.2V4.5H14Z"/>',
    instagram: '<rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.2"/><circle cx="16.2" cy="7.8" r="0.9" fill="currentColor" stroke="none"/>',
    pinterest: '<circle cx="12" cy="12" r="8"/><path d="M12 8.5c-1.8 0-3 1.2-3 2.9 0 1.1.6 1.7 1.4 1.9-.2.9-.7 2.1-.7 2.1s1-.3 1.8-1.5c.4.2.9.3 1.5.3 2 0 3.4-1.5 3.4-3.6S14 8.5 12 8.5Z"/>',
    youtube: '<rect x="4" y="7" width="16" height="10" rx="2.5"/><path d="M11 10.5v5l4.5-2.5-4.5-2.5Z" fill="currentColor" stroke="none" opacity=".9"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    threads: '<path d="M12 4.5c3.2 0 5.8 2.2 5.8 5.5 0 2.8-2 4.8-4.6 5.2 1.2.6 2.2 1.8 2.6 3.3h-2.4c-.5-1.5-1.8-2.6-3.4-2.6-2 0-3.4-1.6-3.4-3.8S9.2 8 11.2 8c1.1 0 2 .4 2.7 1.1V8.8c-.6-.5-1.5-.8-2.5-.8-2.5 0-4.4 2-4.4 4.5s1.9 4.5 4.4 4.5c2.6 0 4.3-1.8 4.3-4.2 0-2.5-1.8-4-4-4Z"/>',
    reddit: '<circle cx="12" cy="13" r="6.5"/><circle cx="9.5" cy="12.5" r="1"/><circle cx="14.5" cy="12.5" r="1"/><path d="M9.5 15.2c.9.9 2.1 1.3 2.5 1.3s1.6-.4 2.5-1.3M8.5 9.5l-2-1.5M15.5 9.5l2-1.5"/><circle cx="17.5" cy="7.5" r="1.2"/>',
    facebook: '<path d="M14 8.5h2.5V5.5H14c-2.2 0-3.5 1.4-3.5 3.6V10H8v3h2.5v7H14v-7h2.8l.7-3H14V9.2c0-.8.2-1.2 1.2-1.2Z"/>',
    linkedin: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M8.5 10v7M8.5 8.2v-.3M12 17v-4.2c0-1.4.8-2.3 2.1-2.3 1.2 0 1.9.8 1.9 2.2V17"/>',
    bluesky: '<path d="M6.5 8.5c2.8-2 5.8-2.8 5.5-.5-.2 1.5-1.2 2.5-1.2 2.5s1.5-.2 2.8-1.8c1.8-2 3.2-1.2 2.5.8-.5 1.5-2.2 4.5-3.2 5.8-1 1.2-2.2 2.5-3.8 2.5s-2.8-1.2-3.8-2.5C7.5 14.5 5.8 11.5 5.3 10c-.7-2 .7-2.8 2.5-.8 1.3 1.6 2.8 1.8 2.8 1.8s-1-.8-1.2-2.5c-.3-2.3 2.7-1.5 5.5.5"/>',
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
  }

  function cfg() {
    return window.AP_SOCIAL || {};
  }

  function socialIconSvg(key) {
    var path = SOCIAL_SVG[key] || SOCIAL_SVG.x;
    return '<svg class="ap-social-icon__svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  function socialNode(key, label, url) {
    var live = isUrl(url);
    var inner = socialIconSvg(key);
    if (live) {
      return '<a class="ap-social-icon ap-social-icon--live" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(label) + '">' + inner + '</a>';
    }
    return '<button type="button" class="ap-social-icon ap-social-icon--soon" aria-label="' + esc(label) + ' — coming soon" title="Coming soon" disabled>' + inner + '</button>';
  }

  function injectStyles() {
    if (document.getElementById('ap-footer-chrome-css')) return;
    var st = document.createElement('style');
    st.id = 'ap-footer-chrome-css';
    st.textContent = [
      '.legal-footer,.ap-legal-footer{max-width:720px;margin:0 auto;padding:0 0 48px;text-align:center;min-height:168px;}',
      '.ap-social-row{padding:1.25rem 0 0;}',
      '.ap-social-row__head{margin-bottom:0.75rem;}',
      '.ap-social-row__label{display:block;font-family:Inter,system-ui,sans-serif;font-size:0.62rem;letter-spacing:0.18em;text-transform:uppercase;color:#A89E88;}',
      '.ap-social-row__note{font-family:Inter,system-ui,sans-serif;font-size:0.58rem;letter-spacing:0.08em;color:#7A7268;}',
      '.ap-social-row__icons{display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;align-items:center;}',
      '.ap-social-icon{min-width:44px;min-height:44px;width:44px;height:44px;border-radius:10px;',
      'background:rgba(14,11,8,0.72);border:1px solid rgba(168,158,136,0.18);display:inline-flex;',
      'align-items:center;justify-content:center;color:#9A9084;text-decoration:none;cursor:pointer;padding:0;box-sizing:border-box;}',
      '.ap-social-icon__svg{width:18px;height:18px;}',
      '.ap-social-icon--soon{opacity:0.42;cursor:default;}',
      '.ap-social-icon--live:hover{color:#C9A227;border-color:rgba(201,162,39,0.35);}',
    ].join('');
    document.head.appendChild(st);
  }

  function renderSocialRow(host) {
    if (!host) return;
    var S = cfg();
    host.innerHTML = '<div class="ap-social-row__head"><span class="ap-social-row__label">Follow ' + esc(S.handle || '@astroprecise') + '</span>'
      + '<span class="ap-social-row__note">Profiles launching soon</span></div>'
      + '<div class="ap-social-row__icons" role="list"></div>';
    var icons = host.querySelector('.ap-social-row__icons');
    if (!icons) return;
    icons.innerHTML = SOCIAL_ORDER.map(function (o) {
      return '<span role="listitem">' + socialNode(o[0], o[1], S[o[0]]) + '</span>';
    }).join('');
  }

  function ensureFooter() {
    var footer = document.querySelector('footer.legal-footer, footer.ap-legal-footer, footer[role="contentinfo"]');
    if (footer) return footer;
    footer = document.createElement('footer');
    footer.className = 'legal-footer';
    footer.setAttribute('role', 'contentinfo');
    document.body.appendChild(footer);
    return footer;
  }

  function hydrateExistingRow() {
    var row = document.querySelector('.ap-social-row');
    if (!row) return false;
    injectStyles();
    var icons = row.querySelector('.ap-social-row__icons');
    if (icons && icons.querySelector('.ap-social-icon')) {
      return true;
    }
    if (icons && !icons.querySelector('.ap-social-icon__svg')) {
      var S = cfg();
      icons.innerHTML = SOCIAL_ORDER.map(function (o) {
        return '<span role="listitem">' + socialNode(o[0], o[1], S[o[0]]) + '</span>';
      }).join('');
    }
    return true;
  }

  function boot() {
    if (hydrateExistingRow()) return;
    injectStyles();
    var footer = ensureFooter();
    var row = document.createElement('div');
    row.className = 'ap-social-row';
    renderSocialRow(row);
    footer.appendChild(row);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();