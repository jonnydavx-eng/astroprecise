/**
 * AstroPrecise — footer social icons + affiliate wiring/ads.
 * Loaded after app.js (reads AP_SOCIAL + AP_MON).
 */
'use strict';

(function () {

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

  // Minimal engraved brand marks (stroke, 24×24)
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

  function cfg() {
    return window.AP_SOCIAL || {};
  }

  function mon() {
    return window.AP_MON || {};
  }

  function isUrl(u) {
    return typeof u === 'string' && /^https?:\/\//i.test(u.trim());
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function socialIconSvg(key) {
    var path = SOCIAL_SVG[key] || SOCIAL_SVG.x;
    return '<svg class="ap-social-icon__svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  function toastSoon(label) {
    if (window.AstroApp && AstroApp.showToast) {
      AstroApp.showToast(label + ' — coming soon', 'Profiles are being built. Follow via links.html when live.', 'info');
      return;
    }
  }

  function socialNode(key, label, url, opts) {
    var live = isUrl(url);
    var inner = socialIconSvg(key);
    if (live) {
      return '<a class="ap-social-icon ap-social-icon--live" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(label) + '">' + inner + '</a>';
    }
    if (opts && opts.textOnly) {
      return '<span class="lib-social lib-social--soon" role="status" aria-label="' + esc(label) + ' coming soon">' + esc(label) + '</span>';
    }
    return '<button type="button" class="ap-social-icon ap-social-icon--soon" data-social-soon="' + esc(label) + '" aria-label="' + esc(label) + ' — coming soon" title="Coming soon">' + inner + '</button>';
  }

  function renderSocialRow(host, opts) {
    if (!host) return;
    var S = cfg();
    var showAll = opts && opts.showAll !== false;
    var channels = SOCIAL_ORDER.filter(function (o) {
      return showAll || isUrl(S[o[0]]);
    });
    if (!channels.length) return;

    if (opts && opts.wrap !== false) {
      host.innerHTML = '<div class="ap-social-row__head"><span class="ap-social-row__label">Follow ' + esc(S.handle || '@astroprecise') + '</span>'
        + '<span class="ap-social-row__note">Profiles launching soon</span></div>'
        + '<div class="ap-social-row__icons" role="list"></div>';
      host = host.querySelector('.ap-social-row__icons') || host;
    }

    host.innerHTML = channels.map(function (o) {
      return '<span role="listitem">' + socialNode(o[0], o[1], S[o[0]], opts) + '</span>';
    }).join('');

    host.querySelectorAll('[data-social-soon]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toastSoon(btn.getAttribute('data-social-soon') || 'Social');
      });
    });
  }

  function injectFooterSocial() {
    if (document.querySelector('.ap-social-row')) return;
    var footerHost = document.querySelector('footer .container') || document.querySelector('footer .footer__grid') || document.querySelector('footer');
    if (!footerHost) return;
    var row = document.createElement('div');
    row.className = 'ap-social-row';
    renderSocialRow(row, { wrap: true, showAll: true });
    var legal = footerHost.querySelector('.footer-legal, .footer__bottom, .ap-legal-links');
    if (legal) footerHost.insertBefore(row, legal);
    else footerHost.appendChild(row);
  }

  function amazonTag() {
    var M = mon();
    return (M.affiliateTag || (M.affiliate && M.affiliate.amazonTag) || '').trim();
  }

  function withAmazonTag(href, tag) {
    if (!tag || !/amazon\./i.test(href)) return href;
    try {
      var u = new URL(href);
      u.searchParams.set('tag', tag);
      return u.toString();
    } catch (e) {
      return href + (href.indexOf('?') >= 0 ? '&' : '?') + 'tag=' + encodeURIComponent(tag);
    }
  }

  function wireAffiliateLinks() {
    var tag = amazonTag();
    if (!tag) return;
    document.querySelectorAll('a[href*="amazon."], a[data-affiliate-amazon]').forEach(function (a) {
      if (a.dataset.affiliateWired) return;
      a.dataset.affiliateWired = '1';
      a.href = withAmazonTag(a.href, tag);
      if (!/\bsponsored\b/.test(a.rel || '')) {
        a.rel = ((a.rel || '') + ' sponsored noopener').trim();
      }
    });
  }

  function affiliatePicks() {
    var M = mon();
    var picks = (M.affiliate && M.affiliate.picks) || [];
    return picks.filter(function (p) { return p && isUrl(p.url); });
  }

  function shouldShowAds() {
    var M = mon();
    var aff = M.affiliate || {};
    if (aff.adsEnabled === false) return false;
    var here = (location.pathname.split('/').pop() || 'index.html');
    var pages = aff.pages || [
      'index.html', 'index-full.html', 'chart.html', 'horoscope.html',
      'compatibility.html', 'transits.html', 'lifepath.html',
      'shop.html', 'ephemeris.html', 'tonight.html',
    ];
    return pages.indexOf(here) >= 0 && affiliatePicks().length > 0;
  }

  function affiliateAdMarkup(picks, tag) {
    return '<div class="container ap-affiliate-ad__inner">'
      + '<p class="ap-affiliate-ad__eyebrow">Recommended <span class="ap-affiliate-ad__disc">Affiliate</span></p>'
      + '<p class="ap-affiliate-ad__lede">Books and tools we actually use — commissions help keep the free chart tools running.</p>'
      + '<div class="ap-affiliate-ad__grid" role="group" aria-label="Affiliate product picks">'
      + picks.map(function (p) {
        var href = withAmazonTag(p.url, tag);
        return '<a class="ap-affiliate-ad__card" href="' + esc(href) + '" target="_blank" rel="noopener sponsored">'
          + '<span class="ap-affiliate-ad__tag">' + esc(p.tag || 'Pick') + '</span>'
          + '<span class="ap-affiliate-ad__title">' + esc(p.title) + '</span>'
          + '<span class="ap-affiliate-ad__blurb">' + esc(p.blurb || '') + '</span>'
          + '<span class="ap-affiliate-ad__meta">' + esc(p.price || '') + ' · ' + esc(p.source || 'Curated pick') + ' →</span>'
          + '</a>';
      }).join('')
      + '</div>'
      + '<p class="ap-affiliate-ad__fine">Some links earn a small commission at no extra cost to you. <a href="shop.html#shop-curated">Browse the full curated shelf</a>.</p>'
      + '</div>';
  }

  function affiliateInsertPoint() {
    var siteFooter = document.querySelector('footer.site-footer, footer.footer');
    if (siteFooter && siteFooter.parentNode) {
      return { parent: siteFooter.parentNode, before: siteFooter };
    }
    if (!document.querySelector('footer.site-footer')) {
      var steps = document.querySelector('.ap-lite-steps');
      if (steps && steps.parentNode) {
        return { parent: steps.parentNode, before: steps.nextElementSibling };
      }
      var liteFooter = document.querySelector('.ap-lite-footer, footer.ap-lite-footer');
      if (liteFooter && liteFooter.parentNode) {
        return { parent: liteFooter.parentNode, before: liteFooter };
      }
    }
    var anyFooter = document.querySelector('footer[role="contentinfo"]');
    if (anyFooter && anyFooter.parentNode) {
      return { parent: anyFooter.parentNode, before: anyFooter };
    }
    return null;
  }

  function renderAffiliateAd() {
    if (!shouldShowAds() || document.querySelector('.ap-affiliate-ad')) return;
    var picks = affiliatePicks().slice(0, 3);
    if (!picks.length) return;
    var tag = amazonTag();
    var point = affiliateInsertPoint();
    if (!point) return;

    var el = document.createElement('aside');
    el.className = 'ap-affiliate-ad';
    el.setAttribute('aria-label', 'Recommended picks');
    el.innerHTML = affiliateAdMarkup(picks, tag);
    if (point.before) point.parent.insertBefore(el, point.before);
    else point.parent.appendChild(el);
  }

  function renderInlineAffiliateCard(hostSelector) {
    if (!shouldShowAds()) return;
    var host = typeof hostSelector === 'string' ? document.querySelector(hostSelector) : hostSelector;
    if (!host || host.querySelector('.ap-affiliate-inline')) return;
    var picks = affiliatePicks();
    if (!picks.length) return;
    var pick = picks[0];
    var tag = amazonTag();
    var href = withAmazonTag(pick.url, tag);
    host.innerHTML = '<aside class="ap-affiliate-inline" aria-label="Recommended pick">'
      + '<span class="ap-affiliate-inline__disc">Affiliate</span>'
      + '<a class="ap-affiliate-inline__link" href="' + esc(href) + '" target="_blank" rel="noopener sponsored">'
      + '<span class="ap-affiliate-inline__title">' + esc(pick.title) + '</span>'
      + '<span class="ap-affiliate-inline__blurb">' + esc(pick.blurb || '') + '</span>'
      + '<span class="ap-affiliate-inline__meta">' + esc(pick.price || '') + ' · ' + esc(pick.source || 'Curated pick') + ' →</span>'
      + '</a></aside>';
  }

  function softenShopAffiliateDisclosure() {
    if (amazonTag()) return;
    var banner = document.querySelector('[data-ap-affiliate-disclosure], .disclosure-banner');
    if (!banner || banner.dataset.apDisclosureSoftened) return;
    banner.dataset.apDisclosureSoftened = '1';
    banner.innerHTML = '<strong>Affiliate note</strong> — Some links may earn us a commission at no extra cost to you.';
  }

  function renderShopEditorialStrip() {
    var here = (location.pathname.split('/').pop() || 'index.html');
    if (here !== 'shop.html') return;
    var host = document.getElementById('ap-shop-affiliate-editorial');
    if (!host || host.querySelector('.ap-affiliate-ad__grid')) return;
    var picks = affiliatePicks().slice(0, 3);
    if (!picks.length) return;
    var tag = amazonTag();
    host.className = 'ap-affiliate-ad';
    host.setAttribute('aria-label', 'Editorial curated picks');
    host.innerHTML = affiliateAdMarkup(picks, tag)
      .replace('shop.html#shop-curated', '#shop-curated');
  }

  function boot() {
    injectFooterSocial();
    wireAffiliateLinks();
    softenShopAffiliateDisclosure();
    renderAffiliateAd();
    renderShopEditorialStrip();
    var slot = document.getElementById('ap-affiliate-slot');
    if (slot) renderInlineAffiliateCard(slot);
  }

  window.AstroSocial = {
    SOCIAL_ORDER: SOCIAL_ORDER,
    renderSocialRow: renderSocialRow,
    renderAffiliateAd: renderAffiliateAd,
    renderShopEditorialStrip: renderShopEditorialStrip,
    renderInlineAffiliateCard: renderInlineAffiliateCard,
    withAmazonTag: withAmazonTag,
    wireAffiliateLinks: wireAffiliateLinks,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();