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
  ok('link targets the Observatory', link.startsWith('observatory.html#'));
  ok('link has focus=venus', link.includes('focus=venus'));
  ok('missing storage fails closed with NO moment', !link.includes('m='), link);
}

// APDeepLink normalizeMoment bare ISO
{
  const link = DL.buildSkyLink({ m: '1990-06-14T12:00', focus: 'mars' });
  ok('bare ISO gets Z', link.includes(encodeURIComponent('1990-06-14T12:00:00.000Z')));
  ok('fixed public instant is explicitly marked', link.includes('&public=1'), link);
  const nowLink = DL.buildSkyLink({ m: 'now', focus: 'earth' });
  ok('live-now link needs no public-event marker', nowLink === 'observatory.html#m=now&focus=earth', nowLink);
}

/* stashSkyLink — a BIRTH moment must not appear in the link at all. It goes to
   observatory.html in sessionStorage; only the focus body (a planet, not a person)
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
  ok('stash link keeps the focus body', link === 'observatory.html#focus=venus', link);
  const stashed = JSON.parse(store.get('ap-explore-moment') || '{}');
  ok('the moment went to sessionStorage', stashed.m === '1994-03-14T09:12:00.000Z', stashed.m);
  ok('the focus went with it', stashed.focus === 'venus', stashed.focus);

  const bare = DL.stashSkyLink({ m: '1994-03-14T09:12:00.000Z' });
  ok('no focus → a bare page link, still no moment', bare === 'observatory.html', bare);

  // A birth chart routed through the bridge must take the same road.
  const chartLink = SB.buildLinkFromChart({ birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' }, { focus: 'earth' });
  ok('buildLinkFromChart stashes rather than publishes', !chartLink.includes('m='), chartLink);
  ok('buildLinkFromChart points at the Observatory', chartLink === 'observatory.html#focus=earth', chartLink);
  const chartStash = JSON.parse(store.get('ap-explore-moment') || '{}');
  ok('the birth minute is in storage, to the minute', chartStash.m === '1994-03-14T09:12:00.000Z', chartStash.m);

  const lifeMoment = SB.emitMomentSkyReady({ utc: new Date('2012-07-08T14:35:00.000Z'), kind: 'wedding' });
  const lifeMomentStash = JSON.parse(store.get('ap-explore-moment') || '{}');
  ok('a life-moment freeze publishes no instant', lifeMoment.link === 'observatory.html#focus=earth', lifeMoment.link);
  ok('a life-moment freeze stays in same-tab storage',
    lifeMomentStash.m === '2012-07-08T14:35:00.000Z', lifeMomentStash.m);

  // Storage blocked (private mode): keep only non-sensitive navigation state.
  ctx.sessionStorage = { setItem() { throw new Error('blocked'); }, getItem: () => null, removeItem() {} };
  const fallback = DL.stashSkyLink({ m: '1994-03-14T09:12:00.000Z', focus: 'venus' });
  ok('storage blocked → fallback carries NO moment', !fallback.includes('m='), fallback);
  ok('storage blocked → fallback keeps safe focus', fallback === 'observatory.html#focus=venus', fallback);

  const safeScale = DL.stashSkyLink({
    m: '1994-03-14T09:12:00.000Z',
    focus: 'mars',
    scale: 2,
    base: 'observatory.html#m=stale-private-value',
  });
  ok('fallback strips a stale base fragment', safeScale === 'observatory.html#focus=mars&scale=2', safeScale);

  const safeQuery = DL.stashSkyLink({
    m: '1994-03-14T09:12:00.000Z',
    focus: 'mars',
    base: 'observatory.html?nosw=1&m=stale-private-value#focus=earth',
  });
  ok('fallback removes stale moment query but keeps safe query', safeQuery === 'observatory.html?nosw=1#focus=mars', safeQuery);

  const doubleEncodedMoment = SB.buildLinkFromChart(
    { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
    { focus: 'venus', base: 'observatory.html?%256D=secret&nosw=1&campaign=drop' },
  );
  ok('double-encoded moment keys and unknown query fields are rejected',
    doubleEncodedMoment === 'observatory.html?nosw=1#focus=venus', doubleEncodedMoment);

  [
    'javascript:alert(document.domain)',
    'data:text/html,needle',
    '//evil.example/observatory.html',
    'https://evil.example/observatory.html',
    'elsewhere/observatory.html',
  ].forEach(base => {
    const safeDestination = SB.buildLinkFromChart(
      { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
      { focus: 'venus', base },
    );
    ok('bridge rejects unsafe/custom base ' + base,
      safeDestination === 'observatory.html#focus=venus', safeDestination);
  });

  const directDeepLinkBase = DL.buildFocusLink({
    focus: 'mars',
    base: 'javascript:alert(1)?%256D=secret&lite=1',
  });
  ok('deep-link helper independently rejects executable bases and encoded keys',
    directDeepLinkBase === 'observatory.html?lite=1#focus=mars', directDeepLinkBase);

  const inheritedFocus = DL.stashSkyLink({
    m: '1994-03-14T09:12:00.000Z',
    focus: '__proto__',
  });
  ok('prototype names are not accepted as focus slugs', inheritedFocus === 'observatory.html', inheritedFocus);

  const dateLink = SB.buildLinkFromDate('1994-03-14', { focus: 'earth' });
  ok('date-only birth route also carries NO moment', dateLink === 'observatory.html#focus=earth', dateLink);

  // A stale cached helper may itself leak on storage failure. The bridge must
  // reject its result rather than trusting that implementation.
  const currentDL = ctx.APDeepLink;
  ctx.APDeepLink = {
    stashSkyLink: () => 'observatory.html#m=1994-03-14T09%3A12%3A00.000Z&focus=venus',
    buildSkyLink: () => 'observatory.html#m=1994-03-14T09%3A12%3A00.000Z&focus=venus',
  };
  const staleHelperLink = SB.buildLinkFromChart(
    { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
    { focus: 'venus', scale: 1 },
  );
  ok('stale helper result is rejected', staleHelperLink === 'observatory.html#focus=venus&scale=1', staleHelperLink);

  ctx.APDeepLink = {
    stashSkyLink: () => 'observatory.html#%6D=1994-03-14T09%3A12%3A00.000Z&focus=venus',
  };
  const encodedStaleHelperLink = SB.buildLinkFromChart(
    { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
    { focus: 'venus' },
  );
  ok('percent-encoded stale moment key is rejected',
    encodedStaleHelperLink === 'observatory.html#focus=venus', encodedStaleHelperLink);

  ctx.APDeepLink = {
    stashSkyLink: () => 'observatory.html#focus=venus',
    buildFocusLink: () => 'observatory.html#%6D=1994-03-14T09%3A12%3A00.000Z&focus=venus',
  };
  const bothStaleHelpersLink = SB.buildLinkFromChart(
    { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
    { focus: 'venus' },
  );
  ok('stale focus helper cannot reintroduce an encoded moment key',
    bothStaleHelpersLink === 'observatory.html#focus=venus', bothStaleHelpersLink);

  ctx.APDeepLink = {
    stashSkyLink: () => 'javascript:alert(document.domain)',
  };
  const unsafeSchemeHelperLink = SB.buildLinkFromChart(
    { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
    { focus: 'venus' },
  );
  ok('stale helper cannot choose an unsafe destination',
    unsafeSchemeHelperLink === 'observatory.html#focus=venus', unsafeSchemeHelperLink);

  // Missing helper entirely takes the same local, address-safe route.
  delete ctx.APDeepLink;
  const missingHelperLink = SB.buildLinkFromChart(
    { birthDate: '1994-03-14', birthTime: '09:12', tz: 'UTC' },
    { focus: 'saturn' },
  );
  ok('missing helper fails closed', missingHelperLink === 'observatory.html#focus=saturn', missingHelperLink);
  ctx.APDeepLink = currentDL;
  delete ctx.sessionStorage;
}

console.log(`\ntest-ap-sky-bridge: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
