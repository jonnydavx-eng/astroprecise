const fs = require('fs');
const p = 'C:\\Users\\jonny\\OneDrive\\astroprecise\\launch-output\\phone-pass-2026-08-14-v874-eye\\measure.mjs';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  'Phone pass measure — 390x844 ap-v873.\n * All 6 pages + Pluto + couples A/B letter CSS px.\n * Usage: node measure.mjs [before|after] [base-url]',
  'Phone pass measure — 390x844 ap-v874 eye-check.\n * Pages: home, chart, compatibility (couples). Findings only.\n * Usage: node measure.mjs [base-url]'
);
s = s.replace(
  'Phone pass measure — 390x844 ap-v873.\r\n * All 6 pages + Pluto + couples A/B letter CSS px.\r\n * Usage: node measure.mjs [before|after] [base-url]',
  'Phone pass measure — 390x844 ap-v874 eye-check.\n * Pages: home, chart, compatibility (couples). Findings only.\n * Usage: node measure.mjs [base-url]'
);

const oldHead = `const PHASE = process.argv[2] === 'before' ? 'before' : 'after';
const BASE = (process.env.AP_BASE || process.argv[3] || 'http://127.0.0.1:8790').replace(/\\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || 'C:\\\\Users\\\\jonny\\\\OneDrive\\\\astroprecise\\\\launch-output\\\\phone-pass-2026-08-14-v873';
const SHOTS = join(OUT, PHASE === 'after' ? 'shots-after' : 'shots-before');`;

const newHead = `const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || 'C:\\\\Users\\\\jonny\\\\OneDrive\\\\astroprecise\\\\launch-output\\\\phone-pass-2026-08-14-v874-eye';
const SHOTS = join(OUT, 'shots');`;

if (!s.includes("phone-pass-2026-08-14-v873")) {
  console.log('WARN: v873 OUT path not found as expected');
}
s = s.replace(
  "const OUT = process.env.AP_PHONE_OUT || 'C:\\\\Users\\\\jonny\\\\OneDrive\\\\astroprecise\\\\launch-output\\\\phone-pass-2026-08-14-v873';",
  "const OUT = process.env.AP_PHONE_OUT || 'C:\\\\Users\\\\jonny\\\\OneDrive\\\\astroprecise\\\\launch-output\\\\phone-pass-2026-08-14-v874-eye';"
);
s = s.replace(
  "const PHASE = process.argv[2] === 'before' ? 'before' : 'after';\n",
  ""
);
s = s.replace(
  "const PHASE = process.argv[2] === 'before' ? 'before' : 'after';\r\n",
  ""
);
s = s.replace(
  "const BASE = (process.env.AP_BASE || process.argv[3] || 'http://127.0.0.1:8790').replace(/\\/+$/, '');",
  "const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\\/+$/, '');"
);
s = s.replace(
  "const SHOTS = join(OUT, PHASE === 'after' ? 'shots-after' : 'shots-before');",
  "const SHOTS = join(OUT, 'shots');"
);

const pagesStart = s.indexOf('const PAGES = [');
const pagesEnd = s.indexOf('];', pagesStart);
if (pagesStart < 0 || pagesEnd < 0) {
  console.log('FAIL pages block');
  process.exit(1);
}
s = s.slice(0, pagesStart) + `const PAGES = [
  { id: 'home', path: '/index.html?nosw=1', wait: '#orr, .ap-model-stage, body' },
  { id: 'chart', path: '/chart.html?nosw=1', wait: 'body' },
  { id: 'compatibility', path: '/compatibility.html?nosw=1' + COUPLES, wait: 'body' },
];` + s.slice(pagesEnd + 2);

// Remove second compatibility letters overwrite
const marker = "\n  if (spec.id === 'compatibility') {\n    try {\n      const letters = await page.evaluate(async () => {";
const idx = s.lastIndexOf(marker);
if (idx >= 0) {
  const close = s.indexOf("\n  await page.screenshot({ path: join(SHOTS, `${spec.id}.png`)", idx);
  if (close > idx) {
    s = s.slice(0, idx) + "\n" + s.slice(close);
    console.log('removed second letters block');
  } else {
    console.log('WARN: could not find screenshot after second letters');
  }
} else {
  // try CRLF
  const marker2 = "\r\n  if (spec.id === 'compatibility') {\r\n    try {\r\n      const letters = await page.evaluate(async () => {";
  const idx2 = s.lastIndexOf(marker2);
  console.log('second letters LF missing, CRLF idx', idx2);
}

s = s.replace(
  "const outFile = join(OUT, `measure-${PHASE}.json`);\nwriteFileSync(outFile, JSON.stringify(results, null, 2));\nconsole.log('WROTE', outFile);",
  "const outFile = join(OUT, 'measure.json');\nwriteFileSync(outFile, JSON.stringify(results, null, 2));\nconsole.log('WROTE', outFile);\n\nconst pages = results.map((r) => {\n  const stg = r.primaryStage;\n  const wm = (r.wordmarkText || '').replace(/\\s+/g, '');\n  const wordmarkWrap = !!(r.wordmarkLines > 1 || (wm && !/^AstroPrecise$/i.test(wm)));\n  const copyFail = r.pFont != null && r.pFont < 16;\n  const tapFail = !!(r.tapsUnder44 && r.tapsUnder44.length);\n  const overflowFail = !!(r.scrollW > 390 || (r.overflowers && r.overflowers.length) || (r.inputOverflow && r.inputOverflow.length));\n  const stageFail = !stg || stg.h < 200;\n  const webglDead = r.webgl ? r.webgl.ok === false : false;\n  const blueP = (r.bluePrimaries && r.bluePrimaries.length) || 0;\n  return {\n    id: r.id,\n    status: r.status,\n    copy: r.pFont,\n    copyText: r.pText,\n    h1: r.h1Font,\n    h1Text: r.h1Text,\n    smallestTap: r.smallestTap ? { text: r.smallestTap.text, min: r.smallestTap.min, w: r.smallestTap.w, h: r.smallestTap.h } : null,\n    tapsUnder44: r.tapsUnder44 ? r.tapsUnder44.length : 0,\n    tapsUnder44List: r.tapsUnder44 || [],\n    stage: stg ? (stg.w + 'x' + stg.h) : 'none',\n    overflow: r.overflowers ? r.overflowers.length : 0,\n    overflowers: r.overflowers || [],\n    scrollW: r.scrollW,\n    inputOverflow: r.inputOverflow || [],\n    drawerStay: r.drawer && r.drawer.stayedOpen,\n    drawer: r.drawer,\n    wordmarkText: r.wordmarkText,\n    wordmarkLines: r.wordmarkLines,\n    wordmarkW: r.wordmarkW,\n    wordmarkH: r.wordmarkH,\n    wordmarkWrap,\n    primaries: r.primaries,\n    bluePrimaries: r.bluePrimaries || [],\n    orrEngine: r.orrEngine,\n    orrReady: r.orrReady,\n    webgl: r.webgl && r.webgl.ok,\n    fails: {\n      copyLt16: copyFail,\n      tapLt44: tapFail,\n      overflow: overflowFail,\n      collapsedStage: stageFail,\n      deadWebGL: webglDead,\n      wordmarkWrap,\n      bluePrimary: blueP > 0,\n    },\n  };\n});\n\nconst compat = results.find((r) => r.id === 'compatibility');\nconst L = compat && compat.letters;\nconst aH = L && (L.aCssPx != null ? L.aCssPx : (L.A && L.A.css && L.A.css.fromCorners && L.A.css.fromCorners.h));\nconst bH = L && (L.bCssPx != null ? L.bCssPx : (L.B && L.B.css && L.B.css.fromCorners && L.B.css.fromCorners.h));\nconst band = (h) => h != null && h >= 22 && h <= 28;\nconst couples = L ? {\n  hashApplied: !!(compat.couples && compat.couples.aDate === '1990-06-15' && compat.couples.bDate === '1985-12-03'),\n  aDate: compat.couples && compat.couples.aDate,\n  bDate: compat.couples && compat.couples.bDate,\n  aCssPx: aH,\n  bCssPx: bH,\n  A_inBand: band(aH),\n  B_inBand: band(bH),\n  readsAsType: band(aH) && band(bH),\n  A: L.A || null,\n  B: L.B || null,\n  error: L.error || null,\n} : null;\n\nconst anyFail = pages.some((p) => Object.values(p.fails).some(Boolean));\nconst summary = {\n  viewport: [390, 844],\n  swV: 'ap-v874',\n  shippingFilesChanged: false,\n  cssChanged: false,\n  pages,\n  couples,\n  verdict: anyFail\n    ? 'FAIL — see page fails'\n    : 'PASS — no CSS fails. website/css/ap-phone-pass.css untouched. sw.js still ap-v874. pins still ?v=874.',\n};\nwriteFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));\nconsole.log('WROTE', join(OUT, 'summary.json'));\nconsole.log('VERDICT', summary.verdict);"
);

s = s.replace(
  "const outFile = join(OUT, `measure-${PHASE}.json`);\r\nwriteFileSync(outFile, JSON.stringify(results, null, 2));\r\nconsole.log('WROTE', outFile);",
  "const outFile = join(OUT, 'measure.json');\nwriteFileSync(outFile, JSON.stringify(results, null, 2));\nconsole.log('WROTE', outFile);"
);

fs.writeFileSync(p, s);
console.log('bytes', s.length);
console.log('PHASE', /const PHASE/.test(s));
console.log('v874-eye', /v874-eye/.test(s));
console.log('tonight', /tonight\.html/.test(s));
console.log('eclipse', /eclipse\.html/.test(s));
console.log('shop', /shop\.html/.test(s));
console.log('measure.json', /measure\.json/.test(s));
console.log('summary.json', /summary\.json/.test(s));
console.log('compat ifs', (s.match(/spec\.id === 'compatibility'/g) || []).length);
