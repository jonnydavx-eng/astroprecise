#!/usr/bin/env node
/**
 * Keep website/sitemap.xml <lastmod> honest for the pages you name.
 *
 *   node tools/update-sitemap-lastmod.mjs --paths chart.html,shop.html            # update
 *   node tools/update-sitemap-lastmod.mjs --check --paths chart.html,shop.html    # verify
 *   node tools/update-sitemap-lastmod.mjs --date 2026-10-20 --paths chart.html    # pin a date
 *
 * A page's required date is the later of its last git commit date (today if the
 * working tree copy is modified) and the date in its "Last updated: D Month YYYY"
 * line, when it has one. --check fails if any listed page's <lastmod> is older
 * than that. Pages marked noindex are skipped; indexable pages missing from the
 * sitemap are reported, not failed, so adding them stays an owner decision.
 * Offline, dependency-free; git is the only external command.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const SITEMAP = join(root, 'website', 'sitemap.xml');
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : '';
};

const paths = value('paths').split(',').map((p) => p.trim()).filter(Boolean);
if (paths.length === 0) {
  console.error('Usage: update-sitemap-lastmod.mjs [--check] [--date YYYY-MM-DD] --paths page.html[,page.html]');
  process.exit(2);
}
for (const p of paths) {
  if (!/^[a-z0-9][a-z0-9/-]*\.html$/i.test(p) || p.includes('..')) throw new Error(`Not a safe relative .html path: ${p}`);
  if (!existsSync(join(root, 'website', p))) throw new Error(`Page does not exist: website/${p}`);
}

const isoDate = (d) => d.toISOString().slice(0, 10);
const today = isoDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000));
const pinned = value('date');
if (pinned && (!/^\d{4}-\d{2}-\d{2}$/.test(pinned) || Number.isNaN(Date.parse(`${pinned}T00:00:00Z`)))) {
  throw new Error('--date must be a real YYYY-MM-DD date');
}

function git(...cmd) {
  return execFileSync('git', cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function requiredDate(page) {
  const file = join(root, 'website', page);
  let date = '';
  let basis = '';
  try {
    if (git('status', '--porcelain', '--', `website/${page}`)) {
      date = today;
      basis = 'modified in working tree';
    } else {
      date = git('log', '-1', '--format=%cs', '--', `website/${page}`);
      basis = 'last git commit';
    }
  } catch {
    date = '';
  }
  if (!date) {
    date = isoDate(statSync(file).mtime);
    basis = 'file mtime (git unavailable)';
  }
  const m = readFileSync(file, 'utf8').match(/Last updated:\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    if (month >= 0) {
      const line = `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (line > date) {
        date = line;
        basis = '"Last updated" line';
      }
    }
  }
  return { date, basis };
}

const noindex = (page) => /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(readFileSync(join(root, 'website', page), 'utf8'));

const source = readFileSync(SITEMAP, 'utf8');
const entries = new Map(
  [...source.matchAll(/<loc>https:\/\/astroprecise\.app\/([^<]*)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map((m) => [m[1], m[2]]),
);
if (entries.size === 0) throw new Error('No dated sitemap entries found');

const check = flag('check');
let next = source;
let failures = 0;
let changed = 0;

for (const page of paths) {
  if (noindex(page)) {
    if (entries.has(page)) {
      console.error(`  FAIL ${page}: marked noindex but listed in the sitemap`);
      failures++;
    } else {
      console.log(`  skip ${page}: noindex, not in sitemap`);
    }
    continue;
  }
  if (!entries.has(page)) {
    console.log(`  note ${page}: indexable but has no sitemap entry (add one if it should be listed)`);
    continue;
  }
  const current = entries.get(page);
  const { date, basis } = requiredDate(page);
  if (check) {
    if (current < date) {
      console.error(`  FAIL ${page}: lastmod ${current} is older than ${date} (${basis})`);
      failures++;
    } else {
      console.log(`  ok   ${page}: lastmod ${current} >= ${date} (${basis})`);
    }
    continue;
  }
  const target = pinned || (date > current ? date : current);
  if (target === current) {
    console.log(`  keep ${page}: ${current}`);
    continue;
  }
  const escaped = page.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<loc>https://astroprecise\\.app/${escaped}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`);
  if (!pattern.test(next)) throw new Error(`Could not update sitemap entry: ${page}`);
  next = next.replace(pattern, `$1${target}$2`);
  console.log(`  set  ${page}: ${current} -> ${target}`);
  changed++;
}

if (check) {
  if (failures > 0) {
    console.error(`sitemap lastmod: ${failures} stale or inconsistent entr${failures === 1 ? 'y' : 'ies'}; run: node tools/update-sitemap-lastmod.mjs --paths ${paths.join(',')}`);
    process.exit(1);
  }
  console.log(`PASS sitemap lastmod: ${paths.length} pages checked`);
} else {
  if (changed > 0) writeFileSync(SITEMAP, next);
  console.log(`sitemap lastmod: ${changed} entr${changed === 1 ? 'y' : 'ies'} updated`);
}
