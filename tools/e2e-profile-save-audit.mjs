#!/usr/bin/env node
/**
 * End-to-end audit: profile save sync, commerce links, chart-page buttons wired.
 * Runs without a browser — simulates localStorage + fetches live preview pages.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import http from 'http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB = join(__dirname, '..', 'website');
const BASE = process.env.AP_BASE || 'http://localhost:8790';

const LS_DEEP = 'https://astroprecise.lemonsqueezy.com/checkout/buy/a89e0ee2-fd6f-42bf-85cb-52083eee365e';
const LS_POSTER = 'https://astroprecise.lemonsqueezy.com/checkout/buy/e8f8a32c-b6e1-4be6-9309-16997d5b01bd';
const LS_BUNDLE = 'https://astroprecise.lemonsqueezy.com/checkout/buy/d521b7e8-23f5-448a-90a4-6992179d548b';

let passed = 0;
let failed = 0;

function ok(label) { passed++; console.log('  PASS  ' + label); }
function fail(label, detail) { failed++; console.log('  FAIL  ' + label + (detail ? ' — ' + detail : '')); }

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

// ── Simulate browser localStorage + profile.js save path ──────────────────
function auditSaveSync() {
  console.log('\n1. Save / profile sync (localStorage simulation)');
  const store = new Map();
  const ls = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };
  globalThis.localStorage = ls;
  globalThis.window = globalThis;

  const profileSrc = readFileSync(join(WEB, 'js', 'profile.js'), 'utf8');
  // profile.js is an IIFE — eval in isolated scope
  eval(profileSrc);

  const P = globalThis.AstroProfile;
  if (!P) { fail('AstroProfile loads'); return; }
  ok('AstroProfile loads');

  // Seed cosmic dashboard profile
  ls.setItem('ap_profile_v2', JSON.stringify({
    name: 'Jonny', email: 'test@example.com', created: Date.now(),
    charts: [], prefs: {}, history: [],
  }));

  const saved = P.saveChart({
    name: 'Audit Chart',
    birthDate: '1990-06-15',
    birthTime: '14:30',
    birthCity: 'London, England, United Kingdom',
    city: 'London, England, United Kingdom',
    lat: 51.5074,
    lon: -0.1278,
    tz: 'Europe/London',
    houseSystem: 'placidus',
    sunSign: 'Gemini',
    moonSign: 'Virgo',
    risingSign: 'Libra',
    engineV: 2,
  });

  if (!saved || !saved.id) { fail('saveChart returns record'); return; }
  ok('saveChart returns record with id');

  const charts = P.getCharts();
  if (charts.length !== 1) { fail('ap_charts count', String(charts.length)); return; }
  if (charts[0].birthDate !== '1990-06-15') { fail('birthDate persisted', charts[0].birthDate); return; }
  if (charts[0].birthCity !== 'London, England, United Kingdom') { fail('birthCity persisted'); return; }
  ok('ap_charts stores birthDate + birthCity');

  const dash = JSON.parse(ls.getItem('ap_profile_v2'));
  if (!dash.charts || dash.charts.length !== 1) { fail('dashboard sync count'); return; }
  const row = dash.charts[0];
  if (row.date !== '1990-06-15') { fail('dashboard date', row.date); return; }
  if (row.time !== '14:30') { fail('dashboard time', row.time); return; }
  if (row.sun !== 'Gemini' || row.moon !== 'Virgo' || row.asc !== 'Libra') {
    fail('dashboard Big Three', JSON.stringify({ sun: row.sun, moon: row.moon, asc: row.asc }));
    return;
  }
  ok('ap_profile_v2 synced with correct date/time/Big Three');

  P.deleteChart(saved.id);
  if (P.getCharts().length !== 0) { fail('deleteChart ap_charts'); return; }
  const dash2 = JSON.parse(ls.getItem('ap_profile_v2'));
  if (dash2.charts.length !== 0) { fail('deleteChart dashboard sync'); return; }
  ok('deleteChart removes from both stores');
}

// ── Static wiring checks ────────────────────────────────────────────────────
function auditStaticFiles() {
  console.log('\n2. Chart page buttons + commerce config (static)');

  const appJs = readFileSync(join(WEB, 'js', 'app.js'), 'utf8');
  if (!appJs.includes(LS_DEEP)) fail('AP_MON deepReadingUrl', 'missing');
  else ok('AP_MON deepReadingUrl → Lemon Squeezy Deep Reading');
  if (!appJs.includes(LS_POSTER)) fail('AP_MON posterUrl');
  else ok('AP_MON posterUrl → Lemon Squeezy Poster PDF');
  if (!appJs.includes(LS_BUNDLE)) fail('commerce bundle fulfilUrl');
  else ok('commerce bundle fulfilUrl → Lemon Squeezy Bundle');

  const chartPage = readFileSync(join(WEB, 'js', 'chart-page.js'), 'utf8');
  for (const id of ['save-btn', 'share-btn', 'print-btn', 'json-btn', 'app-btn', 'poster-btn']) {
    if (!chartPage.includes("getElementById('" + id + "')")) fail('chart-page wires #' + id);
    else ok('chart-page wires #' + id);
  }
  if (!chartPage.includes('deepReadingUrl')) fail('chart-page deep teaser');
  else ok('chart-page deep teaser reads AP_MON.deepReadingUrl');

  const profileHtml = readFileSync(join(WEB, 'profile.html'), 'utf8');
  if (!profileHtml.includes('js/profile.js')) fail('profile.html loads profile.js');
  else ok('profile.html loads profile.js');
  if (!profileHtml.includes('getEffectiveCharts')) fail('profile.html merges ap_charts');
  else ok('profile.html merges ap_charts into dashboard view');
}

// ── Live preview fetch (optional) ───────────────────────────────────────────
async function auditLivePreview() {
  console.log('\n3. Live preview pages (' + BASE + ')');
  try {
    const chart = await fetchText(BASE + '/chart.html');
    if (chart.status !== 200) { fail('chart.html HTTP', String(chart.status)); return; }
    ok('chart.html HTTP 200');
    for (const id of ['save-btn', 'share-btn', 'poster-btn', 'deep-teaser']) {
      if (!chart.body.includes('id="' + id + '"') && id !== 'deep-teaser') {
        fail('chart.html contains #' + id);
      } else if (id === 'deep-teaser' && !chart.body.includes('id="deep-teaser"')) {
        fail('chart.html contains #deep-teaser');
      } else {
        ok('chart.html serves #' + id);
      }
    }

    const app = await fetchText(BASE + '/js/app.js');
    if (!app.body.includes(LS_DEEP)) fail('served app.js deepReadingUrl');
    else ok('served app.js has live deepReadingUrl');

    const shop = await fetchText(BASE + '/shop.html');
    if (shop.status !== 200) fail('shop.html HTTP');
    else ok('shop.html HTTP 200');

    const links = await fetchText(BASE + '/links.html');
    if (links.status !== 200) fail('links.html HTTP');
    else ok('links.html HTTP 200');

    const profile = await fetchText(BASE + '/profile.html');
    if (!profile.body.includes('js/profile.js')) fail('served profile.html missing profile.js');
    else ok('served profile.html includes profile.js');

    const charts = await fetchText(BASE + '/charts.html');
    if (!charts.body.includes('charts-dashboard.js')) fail('charts.html dashboard');
    else ok('charts.html serves My Charts dashboard');
  } catch (e) {
    fail('live preview unreachable', e.message);
  }
}

function auditSyntax() {
  console.log('\n4. JS syntax check');
  const require = createRequire(import.meta.url);
  const { execSync } = require('child_process');
  const files = ['js/profile.js', 'js/chart-page.js', 'js/charts-dashboard.js', 'js/app.js'];
  for (const f of files) {
    try {
      execSync('node --check ' + join(WEB, f), { stdio: 'pipe' });
      ok('node --check ' + f);
    } catch (e) {
      fail('node --check ' + f, e.stderr?.toString()?.trim());
    }
  }
}

auditSaveSync();
auditStaticFiles();
auditSyntax();
await auditLivePreview();

console.log('\n── Summary: ' + passed + ' passed, ' + failed + ' failed ──\n');
process.exit(failed ? 1 : 0);