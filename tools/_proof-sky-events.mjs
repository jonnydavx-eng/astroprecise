/**
 * Proof: sky-events computes from VoidEphem without mounting a second WebGL orrery.
 */
import { readFileSync } from 'node:fs';

const html = readFileSync('website/sky-events.html', 'utf8');
const adapter = readFileSync('website/js/void-orrery-adapter.js', 'utf8');
const fails = [];

if (!/void-orrery-adapter\.js\?v=865/.test(html)) fails.push('sky-events must load the adapter for VoidEphem');
if (!/skip-link/.test(html)) fails.push('sky-events missing skip link');
if (/POSITIONS NEVER ROUNDED/.test(html)) fails.push('sky-events oversells unrounded positions');
if (!/VoidEphem/.test(html)) fails.push('sky-events must name VoidEphem in the lede');
if (/<void-orrery/.test(html)) fails.push('sky-events must not mount a WebGL orrery');
if (!/window\.VoidEphem/.test(html)) fails.push('sky-events must compute from VoidEphem');
if (/index\.html#cast/.test(html)) fails.push('sky-events still points at the retired #cast hash');
if (!/chart\.html/.test(html)) fails.push('sky-events must send chart casting to chart.html');
if (!/ap-footer-inject\.js/.test(html)) fails.push('sky-events must load the compact footer');
if (!/defineVoidEphem\(\)/.test(adapter)) fails.push('adapter must define VoidEphem even without <void-orrery>');
if (!/never pay for Three\.js/.test(adapter)) fails.push('adapter must keep VoidEphem-only pages off Three.js');

if (fails.length) {
  fails.forEach((fail) => console.error('FAIL', fail));
  process.exit(1);
}
console.log('PASS sky-events VoidEphem wire (no second WebGL)');
