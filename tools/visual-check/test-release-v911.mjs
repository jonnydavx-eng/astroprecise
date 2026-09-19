import {chromium} from './node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.AP_BASE||'http://127.0.0.1:8796';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
try {
const context=await browser.newContext(); const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const width of [1440,390]) {
 await page.setViewportSize({width,height:900});await page.goto(base+'/index.html?nosw=1');
 await page.waitForFunction(()=>document.getElementById('orr')?._ready===true,{timeout:35000});
 assert.equal(await page.locator('#orr canvas').count(),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 if(width===1440) await page.locator('#dock button[data-name="Earth"]').click(); else await page.locator('#mobileWorld').selectOption('earth');
 await page.waitForFunction(()=>document.querySelector('.ap-model-stage').getAttribute('aria-label').includes('Earth'));
 mkdirSync('release-evidence',{recursive:true});await page.screenshot({path:`release-evidence/home-${width}.png`});
 console.log('PASS model viewport '+width+' and Earth selection');
}
for(const route of ['chart.html','deep-reading.html','shop.html','privacy.html','terms.html','refunds.html','tonight.html','eclipse.html','profile.html']) {
 const response=await page.goto(base+'/'+route+'?nosw=1');assert.equal(response.status(),200,route);assert(await page.locator('main').count(),route+' main');
 console.log('PASS route '+route);
}
await page.goto(base+'/index.html');
await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});
await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
assert((await page.evaluate(()=>caches.keys())).includes('ap-v911'),'worker cache 911 missing');
await context.setOffline(true);
for(const route of ['index.html','chart.html','shop.html']){const r=await page.goto(base+'/'+route);assert.equal(r.status(),200);console.log('PASS real worker offline '+route);}
assert.deepEqual(errors,[]);console.log('PASS release smoke and real service worker');
}finally{await browser.close();}
