#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = execSync('git show HEAD:website/js/interpretations.js', {
  cwd: join(ROOT, '..'),
  encoding: 'utf8',
});
const lines = src.split(/\r?\n/);
const block = [...lines.slice(168, 245), ...lines.slice(344, 416)].join('\n');

const out = `/**
 * AstroPrecise sign-daily — lightweight daily horoscope for sign landing pages.
 * ~18 KB vs full interpretations.js (~464 KB). Sign pages load this only.
 */
(function () {
  'use strict';

${block}

  window.SignDaily = { getDailyHoroscope, ZODIAC_SIGNS_ORDER };
  window.Interpretations = window.Interpretations || {};
  window.Interpretations.getDailyHoroscope = getDailyHoroscope;
})();
`;

writeFileSync(join(ROOT, 'js', 'sign-daily.js'), out);
console.log('sign-daily.js:', out.length, 'bytes, PLANET_IN_SIGN:', out.includes('PLANET_IN_SIGN'));