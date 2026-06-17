#!/usr/bin/env node
/**
 * Lightwork prep check — verifies launch assets before spike week.
 * Usage: node tools/launch/lightwork-check.mjs [--json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const SITE = 'https://astroprecise.app';
const jsonOut = process.argv.includes('--json');

const checks = [];

function add(id, label, ok, detail = '') {
  checks.push({ id, label, ok, detail });
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// --- Local files ---
const requiredFiles = [
  'website/sitemap.xml',
  'website/robots.txt',
  'website/chart.html',
  'website/links.html',
  'marketing/SOCIAL-ACCOUNTS-SETUP.md',
  'marketing/MISSION-CONTROL-CAMPAIGN.md',
  'LAUNCH-WEEK-PLAYBOOK.md',
  'outreach-exports/free-traffic/reddit-value-post.txt',
  'outreach-exports/x-posts/x-01.txt',
];

for (const f of requiredFiles) {
  add(`file:${f}`, `File: ${f}`, exists(f));
}

const socialAssets = [
  'marketing/social/avatar-400.jpg',
  'marketing/social/banner-x-1500x500.jpg',
  'marketing/social/pin-birth-chart.jpg',
  'marketing/social/square-big-three.jpg',
];
for (const f of socialAssets) {
  add(`asset:${f}`, `Social asset: ${path.basename(f)}`, exists(f));
}

// AP_SOCIAL wired?
const appJs = exists('website/js/app.js') ? read('website/js/app.js') : '';
const socialBlock = appJs.match(/window\.AP_SOCIAL[\s\S]*?};/);
const emptySocial = socialBlock
  ? (socialBlock[0].match(/:\s*''/g) || []).length
  : 0;
const socialFields = socialBlock ? (socialBlock[0].match(/^\s+\w+:/gm) || []).length : 0;
add(
  'config:ap_social',
  'AP_SOCIAL handles pasted in app.js',
  emptySocial < socialFields - 1,
  emptySocial >= socialFields - 1
    ? `${emptySocial} fields still empty — owner must paste URLs after creating accounts`
    : 'At least one social URL live'
);

// Shop / newsletter live?
add('config:tip', 'Ko-fi tipUrl configured', /tipUrl:\s*'https:\/\/ko-fi\.com/.test(appJs));
add('config:newsletter', 'Newsletter URL configured', /newsletterUrl|emailUrl.*list\.astroprecise/.test(appJs));

// Sitemap count
if (exists('website/sitemap.xml')) {
  const urls = (read('website/sitemap.xml').match(/<loc>/g) || []).length;
  add('seo:sitemap', `Sitemap URLs (${urls})`, urls >= 30, `${urls} URLs`);
}

// IndexNow key file in website root
const indexKey = 'a7f3c9e2b1d84f6a9c0e5b8d7f2a1c4e';
add('seo:indexnow-local', 'IndexNow key file in website/', exists(`website/${indexKey}.txt`));

// Launch output pack
add('pack:copy', 'Copy pack generated', exists('launch-output/MANIFEST.json'), 'Run build-copy-pack.mjs');

// --- Remote probes (light) ---
async function probeUrl(url, expect = 200) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.status === expect || (expect === 200 && res.status < 400);
  } catch {
    return false;
  }
}

async function remoteChecks() {
  add('live:home', `Site live ${SITE}`, await probeUrl(SITE));
  add('live:chart', `Chart page ${SITE}/chart.html`, await probeUrl(`${SITE}/chart.html`));
  add('live:sitemap', `Sitemap ${SITE}/sitemap.xml`, await probeUrl(`${SITE}/sitemap.xml`));
  add('live:indexnow', `IndexNow key on origin`, await probeUrl(`${SITE}/${indexKey}.txt`));
  add('live:links', `Link-in-bio ${SITE}/links.html`, await probeUrl(`${SITE}/links.html`));
  add('live:newsletter', 'Newsletter list.astroprecise.app', await probeUrl('https://list.astroprecise.app/subscribe'));

  report();
}

function report() {
  const pass = checks.filter((c) => c.ok).length;
  const fail = checks.filter((c) => !c.ok).length;
  const blockers = checks.filter((c) => !c.ok && (
    c.id.startsWith('live:') ||
    c.id.startsWith('file:') ||
    c.id === 'pack:copy'
  ));

  if (jsonOut) {
    console.log(JSON.stringify({ pass, fail, blockers: blockers.map((c) => c.id), checks }, null, 2));
    process.exit(fail > 0 ? 1 : 0);
  }

  console.log('\nAstroPrecise — Lightwork prep check\n');
  for (const c of checks) {
    const mark = c.ok ? '✓' : '✗';
    const detail = c.detail ? ` — ${c.detail}` : '';
    console.log(`  ${mark} ${c.label}${detail}`);
  }
  console.log(`\n${pass} passed, ${fail} need attention\n`);

  if (blockers.length) {
    console.log('Blockers before spike week:');
    blockers.forEach((c) => console.log(`  • ${c.label}${c.detail ? ` (${c.detail})` : ''}`));
    console.log('');
  }

  if (!exists('launch-output/MANIFEST.json')) {
    console.log('Next: node tools/launch/build-copy-pack.mjs\n');
  }

  process.exit(fail > 0 ? 1 : 0);
}

remoteChecks();