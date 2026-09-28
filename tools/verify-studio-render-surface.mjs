/** Confirm the relocated private chart surface loads; do not regenerate a pack. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { ROOT, canonicalizeStudioOrder, loadEngines } from './fulfil-shared.mjs';
import { readStudioRenderAsset, verifyStudioRenderSurface } from './studio-render-surface.mjs';

const evidence = { at:new Date().toISOString(), inventory:verifyStudioRenderSurface(), errors:[], requested:[] };
for (const path of ['../package.json','/chart.html','snapshot/../../secret','not-in-manifest']) assert.throws(()=>readStudioRenderAsset(path));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer((req,res)=>{
  try {
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const {file,bytes}=readStudioRenderAsset(relative);
    evidence.requested.push(relative);
    res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(bytes);
  } catch(error) { evidence.errors.push(error.message); res.writeHead(404).end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const order=canonicalizeStudioOrder(JSON.parse(readFileSync(resolve(ROOT,'tools/order-template-natal.json'),'utf8')));
const {E}=loadEngines();
const expectedJd=E.julianDay(order.utc.y,order.utc.mo,order.utc.d,order.utc.h,order.utc.mi,0);
const restore=new URLSearchParams({n:order.name,d:`${order.y}-${String(order.mo).padStart(2,'0')}-${String(order.d).padStart(2,'0')}`,t:`${String(order.h).padStart(2,'0')}:${String(order.mi).padStart(2,'0')}`,a:'exact',c:order.place,lat:String(order.lat),lon:String(order.lon),tz:order.tz,hs:order.house}).toString();
let browser;
try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block',locale:'en-GB'});
  await context.addInitScript(value=>sessionStorage.setItem('ap-chart-restore',value),restore);
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.hostname==='127.0.0.1'||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
  const page=await context.newPage();
  page.on('pageerror',error=>evidence.errors.push(error.message));
  await page.goto(base+'/chart.html?nosw=1');
  await page.waitForSelector('#chart-result:not(.hidden) #natal-wheel svg',{state:'visible',timeout:30000});
  const handoff=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('ap-sitting-handoff')||'null'));
  assert(handoff && Math.abs(handoff.jd-expectedJd)<1e-7);
  assert(!page.url().includes(order.name));
  const more=page.locator('.chart-sitting-more > summary');
  if(await more.count())await more.click();
  await page.locator('#poster-btn').click();
  const formats=await page.locator('#share-format-menu button[data-fmt]').evaluateAll(buttons=>buttons.map(button=>button.dataset.fmt));
  for(const format of ['print','square','story','wallpaper','bigthree'])assert(formats.includes(format));
  evidence.expectedJd=expectedJd;evidence.actualJd=handoff.jd;evidence.formats=formats;
  assert.deepEqual(evidence.errors,[]);
  evidence.passed=true;
  await context.close();
} finally {
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
  evidence.serverClosed=!server.listening;
  const folder=resolve(ROOT,'output/playwright/studio-candidate-20260928');mkdirSync(folder,{recursive:true});
  writeFileSync(resolve(folder,'render-surface.json'),JSON.stringify(evidence,null,2)+'\n');
}
console.log('PASS pinned private chart: exact fictional JD, five export controls and no pack regeneration; browser/server closed');
