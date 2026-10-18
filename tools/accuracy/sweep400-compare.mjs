import { readFileSync } from 'node:fs';
const repo = process.argv[2];
const src = readFileSync(repo + '/website/js/ephemeris.js', 'utf8');
const win = {}; new Function('window', 'console', src)(win, {log(){},warn(){},error(){}});
const E = win.AstroEphemeris;
const rows = JSON.parse(readFileSync(process.argv[3] || 'sweep400.json', 'utf8'));
const diff = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
const K = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','asc','mc'];
const worst = {}, signMis = {}, over = {}; let cuspW = 0, cuspOver = 0, nodeW = {mean:0,true:0}, lilW = 0;
const tol = k => (k === 'asc' || k === 'mc') ? 0.1 : (k === 'chiron' ? 0.1 : 0.05);
const worstRow = {};
for (const r of rows) {
  const [y,m,d,hh,mm] = r.ut;
  const c = E.calculateNatalChart(y,m,d,hh,mm,r.lat,r.lon,'placidus');
  const ct = E.calculateNatalChart(y,m,d,hh,mm,r.lat,r.lon,'placidus','true');
  for (const k of K) {
    const g = c.positions[k]?.longitude; if (g == null) continue;
    const e = diff(g, r.ref[k]);
    if (e > (worst[k]||0)) { worst[k] = e; worstRow[k] = `${r.ut.join('-')} lat ${r.lat}`; }
    if (e > tol(k)) over[k] = (over[k]||0)+1;
    if (Math.floor((((g%360)+360)%360)/30) !== Math.floor(r.ref[k]/30)) signMis[k] = (signMis[k]||0)+1;
  }
  nodeW.mean = Math.max(nodeW.mean, diff(c.positions.northNode.longitude, r.ref.meanNode));
  nodeW.true = Math.max(nodeW.true, diff(ct.positions.northNode.longitude, r.ref.trueNode));
  lilW = Math.max(lilW, diff(c.positions.lilith.longitude, r.ref.lilith));
  if (r.placidus) {
    const cusps = (c.houses.cusps || c.houses).map(x => typeof x === 'object' ? x.longitude : x);
    r.placidus.forEach((ref,i)=>{ const e = diff(cusps[i], ref); cuspW = Math.max(cuspW,e); if (e>0.1) cuspOver++; });
  }
}
const f = o => Object.fromEntries(Object.entries(o).map(([k,v])=>[k, +v.toFixed(4)]));
console.log(JSON.stringify({repo, charts: rows.length, maxErrDeg: f(worst), overTol: over, signMismatches: signMis, placidusCuspMax: +cuspW.toFixed(4), placidusCuspOver01: cuspOver, meanNodeMax: +nodeW.mean.toFixed(4), trueNodeMax: +nodeW.true.toFixed(4), lilithMax: +lilW.toFixed(4), worstAt: worstRow}, null, 1));
