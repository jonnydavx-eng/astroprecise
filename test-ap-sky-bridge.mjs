/**
 * Regression tests for Personal Sky bridge + deep-link builder.
 * Run: node test-ap-sky-bridge.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const ctx = { document: { dispatchEvent: () => {} } };
ctx.window = ctx;
for (const f of ['website/js/ap-deep-link.js', 'website/js/ap-sky-bridge.js']) {
  new Function('window', 'document', 'console', readFileSync(join(here, f), 'utf8'))(
    ctx,
    ctx.document,
    console
  );
}
const DL = ctx.APDeepLink;
const SB = ctx.APSkyBridge;

let pass = 0;
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`);
  }
};

// planetFocusSlug
ok('Sun → sun', SB.planetFocusSlug('Sun') === 'sun');
ok('Moon → moon', SB.planetFocusSlug('Moon') === 'moon');
ok('Chiron unsupported', SB.planetFocusSlug('Chiron') === null);

// chartMomentIso date-only → UTC noon
{
  const iso = SB.chartMomentIso({ birthDate: '1990-06-14' });
  ok('date-only noon Z', iso === '1990-06-14T12:00:00.000Z', iso);
}

// buildLinkFromChart with planet focus
{
  const chart = { birthDate: '1990-06-14', birthTime: '14:30', tz: 'UTC' };
  const link = SB.buildLinkFromChart(chart, { focus: 'venus' });
  ok('link targets explore', link.startsWith('explore.html#'));
  ok('link has focus=venus', link.includes('focus=venus'));
  ok('link has encoded m', link.includes('m='));
}

// APDeepLink normalizeMoment bare ISO
{
  const link = DL.buildSkyLink({ m: '1990-06-14T12:00', focus: 'mars' });
  ok('bare ISO gets Z', link.includes(encodeURIComponent('1990-06-14T12:00:00.000Z')));
}

console.log(`\ntest-ap-sky-bridge: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
