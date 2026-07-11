import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const axeSrc = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const URL = process.argv[2] || 'http://localhost:8794/';
const b = await chromium.launch();
const ctx = await b.newContext({ userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' });
await ctx.addInitScript(() => Object.defineProperty(navigator,'webdriver',{get:()=>undefined}));
const pg = await ctx.newPage();
await pg.goto(URL+(URL.includes('?')?'&':'?')+'fresh='+Date.now(), { waitUntil:'load' });
await pg.waitForTimeout(3200);
await pg.evaluate(axeSrc);
const res = await pg.evaluate(async () => await window.axe.run(document, { runOnly:['color-contrast'] }));
const cc = res.violations.find(v=>v.id==='color-contrast');
if(!cc){ console.log('NO color-contrast violations on '+URL); }
else {
  const groups={};
  for(const n of cc.nodes){ const d=(n.any[0]||{}).data||{}; const key=`${d.fgColor} on ${d.bgColor} = ${d.contrastRatio} (need ${d.expectedContrastRatio})`; (groups[key]=groups[key]||[]).push({sel:n.target.join(' '), html:(n.html||'').slice(0,80)}); }
  console.log(cc.nodes.length+' contrast nodes on '+URL+', grouped:');
  for(const [k,v] of Object.entries(groups).sort((a,b)=>b[1].length-a[1].length)){ console.log('\n['+v.length+'x] '+k); for(const e of v.slice(0,2)) console.log('   '+e.sel+'  ::  '+e.html); }
}
await b.close();
