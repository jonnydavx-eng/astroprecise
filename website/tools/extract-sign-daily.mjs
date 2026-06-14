#!/usr/bin/env node
import { readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const interpPath = join(ROOT, 'js', 'interpretations.js');
const src = readFileSync(interpPath, 'utf8');
const lines = src.split(/\r?\n/);
// DAILY_OVERVIEWS + WEEKLY_THEMES (169–245) + getDailyHoroscope + ZODIAC_SIGNS_ORDER (345–416)
const dailyBlock = [
  ...lines.slice(168, 245),
  ...lines.slice(344, 416),
].join('\n');

const out = `/**
 * AstroPrecise sign-daily — lightweight daily horoscope for sign landing pages.
 * ~15 KB vs full interpretations.js (~464 KB). Sign pages load this only.
 */
(function () {
  'use strict';

${dailyBlock}

  window.SignDaily = { getDailyHoroscope, ZODIAC_SIGNS_ORDER };
  window.Interpretations = window.Interpretations || {};
  window.Interpretations.getDailyHoroscope = getDailyHoroscope;
})();
`;

writeFileSync(join(ROOT, 'js', 'sign-daily.js'), out);

const stub = `  // Daily horoscope: sign-daily.js (sign pages) + PART B below (rich version).
  function getDailyHoroscope() { return null; }
`;
// NOTE: do not auto-trim interpretations.js here — run manually after reviewing line ranges.
console.log('sign-daily.js written only — interpretations.js not modified by this script');

console.log('sign-daily.js:', statSync(join(ROOT, 'js', 'sign-daily.js')).size, 'bytes');