/**
 * Static proof: AstroPrecise v899 launch architecture.
 *
 * Current contract: one general WebGL Observatory, one dedicated Eclipse
 * simulation, authored Surface A stills on reading/conversion routes, truthful
 * archived commerce, and a four-route public spine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = path.join(root, 'website');
const RELEASE = '899';
const failures = [];

function read(file) { return fs.readFileSync(path.join(web, file), 'utf8'); }
function ok(condition, message) {
  if (condition) console.log('PASS', message);
  else { console.error('FAIL', message); failures.push(message); }
}

for (const file of [
  'index.html', 'chart.html', 'deep-reading.html', 'shop.html', 'compatibility.html',
  'tonight.html', 'sky-events.html', 'eclipse.html', 'privacy.html', 'terms.html',
  'refunds.html', 'contact.html', 'sw.js', 'js/orrery-webgl.js',
  'js/void-orrery-adapter.js', 'js/ap-eclipse-live-v834.js',
  'js/ap-eclipse-edition-v841.js', 'js/gumroad-unlock.js',
  'img/engine/earth.webp', 'downloads/astroprecise-eclipse-field-guide-2026.pdf',
]) ok(fs.existsSync(path.join(web, file)), 'exists ' + file);

const sw = read('sw.js');
ok(new RegExp(`const V\\s*=\\s*["']ap-v${RELEASE}["']`).test(sw), `service worker is ap-v${RELEASE}`);

const index = read('index.html');
const adapter = read('js/void-orrery-adapter.js');
ok((index.match(/<void-orrery\b/g) || []).length === 1 && /data-renderer="webgl-only"/.test(index),
  'Home owns one strict general WebGL model');
ok(/start-focus="earth"/.test(index) && /Sit with the sky first/.test(index),
  'Home opens directly on the Earth-first promise');
ok(new RegExp(`js/void-orrery-adapter\\.js\\?v=${RELEASE}`).test(index) &&
    /ADAPTER_V[\s\S]*u\.searchParams\.set\('v', ASSET_V\)[\s\S]*import\(assetUrl\('orrery-webgl\.js'\)\)/.test(adapter),
  `Home model chain inherits release tip ${RELEASE}`);
ok(/mobileWorld/.test(index) && /mobileScale/.test(index),
  'Home retains the opt-in world and scale instrument controls');

const surfacePages = ['chart.html', 'deep-reading.html', 'shop.html', 'compatibility.html', 'tonight.html'];
for (const file of surfacePages) {
  const html = read(file);
  ok(!/<void-orrery\b/.test(html) && !/<canvas\b/.test(html), `${file} owns no WebGL context`);
  ok(/class="ap-surface-a"/.test(html) && /img\/engine\/earth\.webp/.test(html) &&
      /Engine still · schematic/.test(html) && /not a live feed/.test(html),
    `${file} exposes an honest clean Surface A still`);
  ok(/index\.html#m=now&amp;focus=earth/.test(html), `${file} bridges to the one Observatory`);
  ok(new RegExp(`window\\.AP_ASSET_V=['"]${RELEASE}['"]`).test(html), `${file} exposes runtime tip ${RELEASE}`);
}

const eclipse = read('eclipse.html');
ok((eclipse.match(/class="ap-eclipse-live__canvas"/g) || []).length === 1 && !/<void-orrery\b/.test(eclipse),
  'Eclipse owns one dedicated simulation and no general model');
ok(/ap-eclipse-live-v834\.js\?v=899/.test(eclipse) && /data-eclipse-play/.test(eclipse) &&
    /data-eclipse-lens="earth"/.test(eclipse), 'Eclipse simulation and controls are pinned and present');
ok(/downloads\/astroprecise-eclipse-field-guide-2026\.pdf/.test(eclipse),
  'Eclipse keeps the completed free field guide');
ok(!/(?:Buy now|£7|Checkout is live)/i.test(eclipse), 'Eclipse advertises no archived checkout');

const chart = read('chart.html');
ok(/id="chart-form"/.test(chart) && /min="1800-01-01"/.test(chart) && /max="2200-12-31"/.test(chart),
  'Chart declares its form and supported date range');
ok(/js\/chart-page\.js\?v=899/.test(chart) && /js\/chart-render\.js\?v=899/.test(chart),
  'Chart controllers are pinned to v899');
ok(/id="sitting-cta"/.test(chart) && /id="ap-chart-sky-bridge"/.test(chart),
  'Chart has the sitting and privacy-safe Observatory handoffs');

const shop = read('shop.html');
ok(/https:\/\/ko-fi\.com\/astroprecise/.test(shop) && /Voluntary support/.test(shop),
  'Shop exposes voluntary support');
ok(/no product checkout is linked or opened on AstroPrecise/i.test(shop) && !/(?:£7|Buy now|gumroad\.com\/l\/)/i.test(shop),
  'Shop states the closed product checkout without a stale sales path');
ok(!/list\.astroprecise\.app\/subscribe/.test(shop) && /Email updates are paused/.test(shop),
  'Shop has no unverified email capture');

const app = read('js/app.js');
ok(/catalogueSkus:\s*\[\s*\]/.test(app) && /price:\s*null/.test(app),
  'Public catalogue has no live SKU or invented price');

const nav = read('js/ap-nav-model.js');
for (const route of ['index.html', 'chart.html', 'sky-events.html', 'shop.html']) {
  ok(nav.includes(route), `shared navigation includes ${route}`);
}

const legal = read('terms.html') + read('refunds.html') + read('privacy.html') + read('contact.html');
ok(/archived|closed/i.test(legal) && !/(?:Buy now|£7 edition)/i.test(legal),
  'Legal and contact copy reflect the archived edition');

const sitemap = read('sitemap.xml');
for (const route of ['chart.html', 'sky-events.html', 'eclipse.html', 'shop.html', 'deep-reading.html']) {
  ok(sitemap.includes(route), `sitemap includes ${route}`);
}

if (failures.length) {
  console.error(`\n${failures.length} launch architecture proof(s) failed`);
  process.exit(1);
}
console.log('\nPASS v899 launch architecture + one-model law + commerce honesty');
