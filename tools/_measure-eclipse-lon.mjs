import { readFileSync } from 'fs';
const src = readFileSync(new URL('../website/js/ephemeris.js', import.meta.url), 'utf8');
const win = {};
new Function('window', 'console', src)(win, console);
const E = win.AstroEphemeris;
const jd = E.julianDay(2026, 8, 12, 17, 45, 51);
const sun = E.sunPosition(jd);
const moon = E.moonPosition(jd);
const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
function fmt(lon) {
  const n = ((lon % 360) + 360) % 360;
  const si = Math.floor(n / 30);
  const d = n - si * 30;
  const m = Math.round((d - Math.floor(d)) * 60);
  return `${Math.floor(d)}°${String(m).padStart(2, '0')}' ${signs[si]}`;
}
const sep = Math.abs(((sun.lon - moon.lon + 540) % 360) - 180);
console.log(JSON.stringify({
  jd,
  sunLon: sun.lon,
  sunFmt: fmt(sun.lon),
  moonLon: moon.lon,
  moonFmt: fmt(moon.lon),
  sep,
  oldHardcode: 140.133,
  deltaVsOld: sun.lon - 140.133,
}, null, 2));
