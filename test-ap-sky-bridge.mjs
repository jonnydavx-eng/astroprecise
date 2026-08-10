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
  ok('link targets the Observatory', link.startsWith('index.html#'));
  ok('link has focus=venus', link.includes('focus=venus'));
  ok('link has encoded m', link.includes('m='));
}

// APDeepLink normalizeMoment bare ISO
{
  const link = DL.buildSkyLink({ m: '1990-06-14T12:00', focus: 'mars' });
  ok('bare ISO gets Z', link.includes(encodeURIComponent('1990-06-14T12:00:00.000Z')));
}

/* stashSkyLink — a BIRTH moment must not appear in the link at all. It goes to
   index.html in sessionStorage; only the focus body (a planet, not a person)
   stays in the fragment. Added 2026-08-09 with the leak fix. */
{
  const store = new Map();
  ctx.sessionStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  };

  const link = DL.stashSkyLink({ m: '1994-03-14T09:12:00.000Z', focus: 'venus' });
  ok('stash link carries NO moment', !link.includes('m='), link);
  ok('stash link keeps the focus body', link === 'index.html#focus=venus', link);
  const stashed = JSON.parse(store.get('ap-explore-moment') || '{}');
  ok('the moment went to sessionStorage', stashed.m === '1994-03-14T09:12:00.000Z', stashed.m);
  ok('the focus went with it', stashed.focus === 'venus', stashed.focus);

  const bare = DL.stashSkyLink({ m: '1994-03-14T09:12:00.000Z' });
  ok('no focus → a bare page link, still no moment', bare === 'index.html', bare);

  // A birth chart routed through the bridge must take the same road.
  const chartLink = SB.buildLinkFromChart({ birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' }, { focus: 'earth' });
  ok('buildLinkFromChart stashes rather than publishes', !chartLink.includes('m='), chartLink);
  ok('buildLinkFromChart points at the Observatory', chartLink === 'index.html#focus=earth', chartLink);
  const chartStash = JSON.parse(store.get('ap-explore-moment') || '{}');
  ok('the birth minute is in storage, to the minute', chartStash.m === '1994-03-14T09:12:00.000Z', chartStash.m);

  // Storage blocked (private mode): fall back to the fragment rather than break
  // the feature. A fragment is still never sent to a server.
  ctx.sessionStorage = { setItem() { throw new Error('blocked'); }, getItem: () => null, removeItem() {} };
  const fallback = DL.stashSkyLink({ m: '1994-03-14T09:12:00.000Z', focus: 'venus' });
  ok('storage blocked → fragment fallback carries the moment',
    fallback.includes('m=') && fallback.includes('focus=venus'), fallback);
  delete ctx.sessionStorage;
}

console.log(`\ntest-ap-sky-bridge: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
