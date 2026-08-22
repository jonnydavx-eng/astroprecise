/**
 * Couples sky — two birth minutes, one measured-angle ledger and Surface A still.
 * Civil time must use a real IANA zone. Unknown time is not noon.
 * Run: node test-couples-sky.mjs
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'website/js/ap-couples-sky.js'), 'utf8');
const html = readFileSync(join(root, 'website/compatibility.html'), 'utf8');
const css = readFileSync(join(root, 'website/css/ap-couples-v858.css'), 'utf8');
const homeMatch = readFileSync(join(root, 'website/js/home-match.js'), 'utf8');
const sw = readFileSync(join(root, 'website/sw.js'), 'utf8');
const releaseTip = sw.match(/const V\s*=\s*["']ap-v(\d+)["']/)?.[1] || '';
const privateStorage = new Map();

let pass = 0;
let fail = 0;
const ok = (name, cond, got) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  ✗ ${name}${got !== undefined ? ' — got ' + got : ''}`);
  }
};

const ctx = {
  document: {
    addEventListener() {},
    getElementById() { return null; }
  },
  location: {
    hash: '',
    search: '',
    pathname: '/compatibility.html',
    origin: 'http://localhost',
    href: 'http://localhost/compatibility.html'
  },
  history: { replaceState() {} },
  sessionStorage: {
    getItem(key) { return privateStorage.has(key) ? privateStorage.get(key) : null; },
    setItem(key, value) { privateStorage.set(key, String(value)); },
    removeItem(key) { privateStorage.delete(key); }
  },
  navigator: {},
  window: null,
  Intl,
  URLSearchParams,
  Date,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  parseInt,
  setTimeout() { return 0; },
  clearTimeout() {},
  setInterval() { return 0; },
  clearInterval() {},
  console
};
ctx.window = ctx;
runInContext(src, createContext(ctx));
const AP = ctx.APCouplesSky;

ok('exports APCouplesSky', !!(AP && AP.localToUT && AP.personFromFields));
ok('offline towns exist', Array.isArray(AP.OFFLINE_TOWNS) && AP.OFFLINE_TOWNS.length >= 12);

const refused = ['UTC', 'GMT', 'Etc/UTC', 'Etc/GMT', 'Etc/GMT+1', 'Etc/GMT-5', '', null, 'Not/AZone'];
refused.forEach((tz) => {
  ok('refuses ' + String(tz), AP.isValidTimeZone(tz) === false);
});
ok('accepts Europe/London', AP.isValidTimeZone('Europe/London') === true);
ok('accepts America/New_York', AP.isValidTimeZone('America/New_York') === true);
ok('accepts America/Phoenix', AP.isValidTimeZone('America/Phoenix') === true);

function sameUT(got, y, m, d, hh, mm) {
  return !!(got && got.y === y && got.m === m && got.d === d && got.hh === hh && got.mm === mm);
}

ok('UK summer 14:22 is 13:22 UT, not GMT',
  sameUT(AP.localToUT(1990, 6, 15, 14, 22, 'Europe/London'), 1990, 6, 15, 13, 22),
  JSON.stringify(AP.localToUT(1990, 6, 15, 14, 22, 'Europe/London')));
ok('UK winter 14:22 stays 14:22 UT',
  sameUT(AP.localToUT(1990, 1, 15, 14, 22, 'Europe/London'), 1990, 1, 15, 14, 22));
ok('New York December 08:40 is 13:40 UT (EST)',
  sameUT(AP.localToUT(1985, 12, 3, 8, 40, 'America/New_York'), 1985, 12, 3, 13, 40));
ok('New York July 08:40 is 12:40 UT (EDT)',
  sameUT(AP.localToUT(1985, 7, 3, 8, 40, 'America/New_York'), 1985, 7, 3, 12, 40));
ok('Phoenix has no DST — 12:00 is 19:00 UT',
  sameUT(AP.localToUT(1990, 7, 1, 12, 0, 'America/Phoenix'), 1990, 7, 1, 19, 0));
ok('Auckland January 12:00 crosses the UT date',
  sameUT(AP.localToUT(1990, 1, 1, 12, 0, 'Pacific/Auckland'), 1989, 12, 31, 23, 0));
ok('UTC zone cannot produce a civil minute', AP.localToUT(1990, 6, 15, 14, 22, 'UTC') === null);

const known = AP.personFromFields({
  prefix: 'person1',
  name: 'Ada',
  date: '1990-06-15',
  time: '14:22',
  tz: 'Europe/London',
  city: 'London'
});
ok('known minute has a JD', Number.isFinite(known.jd));
ok('known minute keeps the IANA zone', known.tz === 'Europe/London' && known.zoneKnown === true);
ok('known minute UT is 13:22', known.ut && known.ut.hh === 13 && known.ut.mm === 22);

const unknownTime = AP.personFromFields({
  prefix: 'person1',
  date: '1990-06-15',
  time: '',
  tz: 'Europe/London',
  city: 'London'
});
ok('unknown time has no JD', unknownTime.jd == null && unknownTime.timeKnown === false);
ok('unknown time is not filled with noon', unknownTime.time === '' && unknownTime.ut == null);
ok('unknown-time label withholds Moon and angles',
  /time unknown/.test(AP.minuteLabel(unknownTime)) && /not filled with noon/.test(AP.minuteLabel(unknownTime)));

const noZone = AP.personFromFields({
  prefix: 'person2',
  date: '1985-12-03',
  time: '08:40',
  tz: 'UTC',
  city: 'New York'
});
ok('UTC place cannot mint a clock', noZone.jd == null && noZone.zoneKnown === false);

const clocks = AP.clocksFromPeople(known, unknownTime, 'now', 0);
ok('only the known minute becomes a natal clock', !!(clocks.a && clocks.a.jd) && clocks.b == null);
ok('live has no clock focus', clocks.focus == null);

const focused = AP.clocksFromPeople(known, unknownTime, 'a', 0);
ok('A button is focus only', focused.focus === 'a' && !!(focused.a && focused.a.jd));

const both = AP.clocksFromPeople(
  known,
  AP.personFromFields({
    prefix: 'person2',
    name: 'Ben',
    date: '1985-12-03',
    time: '08:40',
    tz: 'America/New_York',
    city: 'New York'
  }),
  'now',
  0
);
ok('both known minutes stay in one spec', !!(both.a && both.b && both.a.jd && both.b.jd));
ok('the two clocks are different minutes', both.a.jd !== both.b.jd);
ok('live keeps both clocks without a focus', both.focus == null);

const london = AP.matchTown('London');
ok('London resolves to Europe/London', !!(london && london.tz === 'Europe/London'));
ok('every offline town has a real IANA zone',
  AP.OFFLINE_TOWNS.every((t) => t && t.name && AP.isValidTimeZone(t.tz)));
ok('offline list never includes UTC/GMT',
  AP.OFFLINE_TOWNS.every((t) => t.tz !== 'UTC' && t.tz !== 'GMT' && !/^Etc\//.test(t.tz)));

const fromHash = AP.sceneFromHash('#a=1990-06-15&at=14:22&az=Europe/London&ac=London&an=Ada&b=1985-12-03&bt=08:40&bz=America/New_York&bc=New%20York');
ok('legacy personal-data hash is rejected', !fromHash.a && !fromHash.b && fromHash.rejected === true);
const fromNativeFormHash = AP.sceneFromHash('#person1-name=Ada&person1-date=1990-06-15&person1-time=14%3A22&person1-city=London&person1-lat=51.5074&person1-lon=-0.1278&person1-tz=Europe%2FLondon&person2-name=Ben&person2-date=1985-12-03');
ok('historical native-form personal-data hash is rejected',
  !fromNativeFormHash.a && !fromNativeFormHash.b && fromNativeFormHash.rejected === true);
const fromMixedCaseHash = AP.sceneFromHash('#Person1-Name=Ada&PERSON1-DATE=1990-06-15&P2C=London');
ok('mixed-case historical personal-data hash is rejected',
  !fromMixedCaseHash.a && !fromMixedCaseHash.b && fromMixedCaseHash.rejected === true);
ok('safe anchor carries no pair', AP.sceneFromHash('#minutes').a === null && AP.sceneFromHash('#minutes').rejected === false);

privateStorage.set('ap-compat-pair', JSON.stringify({
  version: 1,
  a: { date: '1990-06-15', time: '14:22', name: 'Ada', tz: 'Europe/London', city: 'London' },
  b: { date: '1985-12-03', time: '08:40', name: 'Ben', tz: 'America/New_York', city: 'New York' }
}));
const privateScene = AP.sceneFromSession();
ok('same-tab session restores both dates', privateScene.a?.date === '1990-06-15' && privateScene.b?.date === '1985-12-03');
ok('same-tab session keeps valid IANA zones', privateScene.a?.tz === 'Europe/London' && privateScene.b?.tz === 'America/New_York');
ok('same-tab session keeps town labels', privateScene.a?.city === 'London' && privateScene.b?.city === 'New York');

ok('page is Surface A and owns no WebGL context',
  html.includes('class="ap-surface-a"') && html.includes('img/engine/earth-256.webp') &&
  html.includes('img/engine/earth-512.webp 512w') &&
  !/<void-orrery\b/.test(html) && !/<canvas\b/.test(html));
ok('page does not load a 2D orrery.js', !/<script[^>]+js\/orrery\.js/.test(html));
ok('page does not load retired compatibility-page.js', !html.includes('compatibility-page.js'));
ok('place is not labelled optional', !/Birth place <span class="opt">optional<\/span>/.test(html));
ok('time is needed for the clock', html.includes('Birth time <span class="opt">needed for the clock</span>'));
ok('keep-sky stays current-view, not birth-hour',
  html.includes('id="keep-sky"') && !/id="keep-sky"[^>]*data-keep-mode/.test(html));
ok('no checkout or SKU on the couples page', !/gumroad|catalogueSkus|checkout/i.test(html + src));
ok('house wordmark splits Precise', html.includes('logo-text__precise'));
ok('A/B cards keep redundant silver and ion identity',
  css.includes('.ap-couples-card--a') && css.includes('#93A8BF') && css.includes('#8BA9FF'));
ok('city items are 44px taps', css.includes('.ap-city-item') && /min-height:\s*44px/.test(css));
ok('Midnight Meridian house colours stay locked',
  css.includes('#040812') && css.includes('#EEF4FA') && css.includes('#93A8BF') &&
  css.includes('#8BA9FF') && css.includes('#A5BCFF') && css.includes('#FF8EA8'));
ok('copy withholds the clock when time is blank',
  /blank time withholds that clock/i.test(html) || html.includes('that clock, the Moon, and angles are withheld'));
ok('private session restore stays Live so both clocks stay equally up',
  /function applyHash\(\)[\s\S]*setPressed\('now'\)/.test(src) &&
  !/function applyHash\(\)[\s\S]*setPressed\('a'\)/.test(src));
ok('couples URL never serializes birth fields',
  !/q\.set\(['"](?:a|at|an|az|ac|b|bt|bn|bz|bc)['"]/.test(src) &&
  /sessionStorage\.setItem\(PRIVATE_PAIR_KEY/.test(src));
ok('dormant Home match handoff also keeps personal fields out of the URL',
  !/['"]p1(?:n|d|t|la|lo|tz)=/.test(homeMatch) &&
  /sessionStorage\.setItem\(['"]ap-compat-pair['"]/.test(homeMatch) &&
  /return ['"]compatibility\.html['"]/.test(homeMatch));
ok('historical native-form address keys remain on the scrub list',
  ['person1-name', 'person1-date', 'person1-time', 'person1-city', 'person1-lat', 'person1-lon', 'person1-tz',
    'person2-name', 'person2-date', 'person2-time', 'person2-city', 'person2-lat', 'person2-lon', 'person2-tz']
    .every((key) => src.includes(`'${key}'`)));
ok('copy action emits a clean page URL only',
  /return location\.origin \+ location\.pathname;/.test(src) &&
  /Copy clean page link/.test(html));
ok('couples page does not fly the camera on A/B',
  !src.includes('flyTo') && !src.includes('focusPlanet') && !src.includes('setJD'));
ok('blank form keeps the withheld-angle ledger quiet',
  src.includes("var started = ['person1-date'") && src.includes('if (!started)') && src.includes('box.hidden = true'));
ok('couples assets stay on the release tip',
  Boolean(releaseTip) && html.includes(`ap-couples-sky.js?v=${releaseTip}`) &&
  html.includes(`ap-couples-v858.css?v=${releaseTip}`));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
