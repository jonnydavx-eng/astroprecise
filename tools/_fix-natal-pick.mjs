import { readFileSync, writeFileSync } from 'node:fs';
const p = 'website/js/ap-natal-reading.js';
let t = readFileSync(p, 'utf8');
const re = /function pick\(city\) \{[\s\S]*?drop\.innerHTML = '';\r?\n  \}/;
if (!re.test(t)) {
  console.log('no match');
  process.exit(1);
}
const next = `function pick(city) {
    if (!validTimeZone(city.tz)) {
      tzEl.value = '';
      if (note) note.textContent = 'Pick a place for a real zone. UK summer is not GMT.';
      drop.hidden = true;
      drop.innerHTML = '';
      return;
    }
    input.value = city.name + (city.admin ? ', ' + city.admin : '');
    tzEl.value = city.tz;
    if (note) note.textContent = city.tz;
    drop.hidden = true;
    drop.innerHTML = '';
  }`;
writeFileSync(p, t.replace(re, next));
console.log('updated pick');
