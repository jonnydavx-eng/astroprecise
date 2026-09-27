import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.AP_BASE||'http://127.0.0.1:8797';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  assert((await page.evaluate(()=>caches.keys())).includes('ap-v916'));
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
  writeFileSync('output/playwright/guided-20260927/offline.json',JSON.stringify({at:new Date().toISOString(),cache:'ap-v916',...result},null,2));
  console.log('PASS new guided opening survives a fresh worker install and offline reload');
  await context.close();
} finally { await browser.close(); }
