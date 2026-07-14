/* Wave 3 executable contract proof (static, deterministic, no browser needed).
 * Run from tools/visual-check: `node wave3-proof.mjs`.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const checks = [];
const pass = (name, ok, detail = '') => {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const sw = read('website/sw.js');
const asset = read('website/js/ap-asset-v.js');
const nav = read('website/js/ap-nav-model.js');
const profile = read('website/profile.html');
const charts = read('website/charts.html');
const view = read('website/chart-view.html');
const page = read('website/js/chart-page.js');
const share = read('website/js/ap-chart-share.js');
const explore = read('website/js/explore-boot.js');
const reading = read('website/js/reading-format.js');

const swVersion = sw.match(/const V\s*=\s*["']ap-v(\d+)["']/)?.[1] || '';
const assetVersion = asset.match(/AP_ASSET_V\s*=\s*["'](\d+)["']/)?.[1] || '';
pass('AP_ASSET_V matches service-worker V', swVersion && swVersion === assetVersion, `sw=${swVersion || '?'} asset=${assetVersion || '?'}`);
pass('precache has no backup assets', !/\.bak(?:[-.][^'"\]]+)?\.(?:png|jpe?g|webp|gif)/i.test(sw));
pass('AP_NAV declares exactly four bottom tabs', (nav.match(/NAV_BOTTOM_TABS[\s\S]*?\];/)?.[0].match(/\['[^']+',[^\]]+\]/g) || []).length === 4);
pass('profile loads corrective nav layer', /ap-overhaul-s8\.css/.test(profile));
pass('charts loads corrective nav layer', /ap-overhaul-s8\.css/.test(charts));
pass('view guards missing timezone', /recognised timezone/.test(view) && /timezoneKnown/.test(view));
pass('unknown time suppresses angles in view', /timeKnown/.test(view) && /angles withheld/.test(view));
pass('chart page carries timezone/time metadata', /timezoneKnown/.test(page) && /timeAccuracy/.test(page));
pass('share carries accuracy and rejects invalid timezone', /a:\s*src\.timeAccuracy/.test(share) && /isValidTimeZone/.test(share));
pass('WebGL waits for explicit intent', /webglIntent/.test(explore) && /armWebglIntent/.test(explore));
pass('Applying/Separating labels removed', !/Applying|Separating/.test(reading));

const files = fs.readdirSync(path.join(ROOT, 'website'), { recursive: true })
  .filter(f => /\.(?:html|js|css)$/.test(f) && !f.includes('node_modules'));
const stale = [];
for (const rel of files) {
  const txt = read(path.join('website', rel));
  if (/[?&]v=(?:750|751)(?:\b|[^\d])/.test(txt)) stale.push(rel);
}
pass('asset query refs use current tip', stale.length === 0, stale.slice(0, 4).join(', '));

const failed = checks.filter(c => !c.ok).length;
console.log(`\nWave 3 proof: ${failed ? 'FAIL' : 'PASS'} (${checks.length - failed}/${checks.length})`);
process.exitCode = failed ? 1 : 0;
