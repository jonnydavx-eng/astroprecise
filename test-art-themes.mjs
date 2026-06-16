/**
 * Art theme library smoke test
 * node test-art-themes.mjs
 */
import { loadArtThemes, themeById, resolveOrderTheme } from './tools/art-theme-data.mjs';

const data = loadArtThemes();
let pass = 0;
let fail = 0;

function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓', msg); }
  else { fail++; console.error('  ✗', msg); }
}

console.log('Art theme library tests\n');

ok(data.packs.length === 7, '7 expansion packs');
ok(data.themes.length >= 30, `≥30 themes (got ${data.themes.length})`);
ok(themeById('observatory-gold'), 'default observatory-gold exists');
ok(themeById('sign-leo')?.sign === 'Leo', 'sign-leo maps to Leo');
ok(themeById('couples-rose-gold')?.dual, 'couples theme has dual palette');
ok(themeById('masculine-copper')?.pack === 'masculine', 'masculine pack');
ok(themeById('feminine-lunar')?.pack === 'feminine', 'feminine pack');

const resolved = resolveOrderTheme({ artTheme: 'sign-scorpio' });
ok(resolved?.id === 'sign-scorpio', 'resolveOrderTheme by artTheme');
const fallback = resolveOrderTheme({});
ok(fallback?.id === data.defaultTheme, 'fallback to default');

const packIds = new Set(data.packs.map(p => p.id));
const orphanThemes = data.themes.filter(t => !packIds.has(t.pack));
ok(orphanThemes.length === 0, 'all themes belong to a pack');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);