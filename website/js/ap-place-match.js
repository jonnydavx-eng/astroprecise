/* AstroPrecise place matching: offline word-start matches and UK/IE-first online ordering.
   Pure functions, no network. Used by ap-chart-next.js and test-place-search.mjs. */
(function (root) {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const escapeRe = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Match from the start of the name or the start of a word in it ("bury" finds Bury,
  // not Canterbury; "lyne" finds Ashton-under-Lyne). A trailing country code is allowed
  // ("york gb").
  function matchOffline(query, cities) {
    const q = normalize(query);
    if (q.length < 2 || !Array.isArray(cities)) return [];
    const parts = q.split(' ');
    const last = parts[parts.length - 1];
    const countryFilter = parts.length > 1 && /^[a-z]{2}$/.test(last) ? last : '';
    const nameQuery = countryFilter ? parts.slice(0, -1).join(' ') : q;
    const pattern = new RegExp('(^|[\\s\\-\'’(])' + escapeRe(nameQuery));
    return cities
      .filter(city => {
        const name = normalize(city.name);
        if (countryFilter && normalize(city.country) !== countryFilter) return false;
        return pattern.test(name);
      })
      .map(city => ({ city, rank: normalize(city.name) === nameQuery ? 0 : normalize(city.name).startsWith(nameQuery) ? 1 : 2 }))
      .sort((a, b) => a.rank - b.rank)
      .map(row => row.city);
  }
  const COUNTRY_RANK = { GB: 0, IE: 1 };
  // Online rows (Open-Meteo shape): GB first, then IE, then the rest, keeping the provider order within each group.
  function sortOnline(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((row, index) => ({ row, index, rank: COUNTRY_RANK[String(row && row.country_code || '').toUpperCase()] ?? 2 }))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map(item => item.row);
  }
  const api = Object.freeze({ normalize, matchOffline, sortOnline });
  root.APPlaceMatch = api;
})(typeof window !== 'undefined' ? window : globalThis);
