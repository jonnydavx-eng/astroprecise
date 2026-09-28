import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=resolve(root,'dist');
const output=resolve(root,'output/playwright/opening-offline');
mkdirSync(output,{recursive:true});
let server;
let base=process.env.AP_BASE;
if(!base){
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
  server=createServer((request,response)=>{
    try {
      let path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
      if(path.endsWith('/'))path+='index.html';
      const file=resolve(dist,'.'+path);
      if(!file.startsWith(dist+sep)){response.writeHead(403).end();return;}
      response.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'}).end(readFileSync(file));
    } catch {response.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
}
let browser;
try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
  const page=await context.newPage();
  const worker=await (await page.request.get(base+'/sw.js')).text();
  const cache=worker.match(/ap-v\d+/)?.[0];
  assert(cache,'The selected site must declare a versioned worker cache');
  await page.goto(base+'/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert((await page.evaluate(()=>caches.keys())).includes(cache));
  await context.setOffline(true);
  await page.reload();
  await page.locator('#sky-instrument svg').waitFor();
  const result=await page.evaluate(()=>({
    actionBottom:document.querySelector('.intro-cta .button').getBoundingClientRect().bottom,
    tabs:getComputedStyle(document.querySelector('.ap-next-tabs')).display,
    styleLoaded:[...document.styleSheets].some(sheet=>sheet.href?.includes('ap-opening-flow.css')),
    height:innerHeight
  }));
  assert(result.styleLoaded);
  assert.equal(result.tabs,'none');
  assert(result.actionBottom<result.height);
  writeFileSync(resolve(output,'offline.json'),JSON.stringify({at:new Date().toISOString(),cache,...result},null,2));
  console.log('PASS new guided opening survives a fresh worker install and offline reload');
  await context.close();
} finally {
  if(browser)await browser.close();
  if(server)await new Promise(resolve=>server.close(resolve));
}
