import fs from 'fs';

const path = new URL('../index-full.html', import.meta.url);
let html = fs.readFileSync(path, 'utf8');

const start = '    /* ── 8. Live sky strip population ─────────────────────────────────── */';
const orrery = '      /* ── Initialise 3D orrery (skipped in lite hero until user opts in) ── */';
const si = html.indexOf(start);
const oi = html.indexOf(orrery, si);
if (si < 0 || oi < 0) {
  console.error('markers not found', { si, oi });
  process.exit(1);
}

const replacement = `    /* ── 8. Initialise 3D orrery (live sky dock in lite-sky-dock.js) ─── */
    ready(async function () {
`;

html = html.slice(0, si) + replacement + html.slice(oi);
fs.writeFileSync(path, html);
console.log('Trimmed inline live-sky block');