/** v576 focused re-capture: moon/saturn/jupiter/system-label frames, scrolled to top. */
import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL !== false &&
      document.documentElement.classList.contains('orrery-full'),
    null, { timeout: 45000 }
  );
  await sleep(9000); // rest frame settles

  const grab = async (name) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    await page.screenshot({ path: join(OUT, name + '.png') });
    console.log('shot', name);
  };
  const pill = (id) => page.evaluate((pid) => {
    const b = document.querySelector(`.lite-vp-btn[data-lite-planet="${pid}"]`);
    if (b) b.click();
  }, id);

  await pill('moon');   await sleep(3200); await grab('craft-v576-04-moon');
  await pill('saturn'); await sleep(3200); await grab('craft-v576-05-saturn');
  await pill('jupiter');await sleep(3200); await grab('craft-v576-06-jupiter');
  await page.evaluate(() => {
    const b = document.querySelector('#ap-scale-strip .orrery-scale-btn[data-scale="2"]');
    if (b) b.click();
  });
  await sleep(3400); await grab('craft-v576-07-system-labels');
  await pill('earth');  await sleep(4000); await grab('craft-v576-08-earth-return');
  await ctx.close();

  /* mobile — scroll the model into view for the rest-frame artifact */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const mpage = await mctx.newPage();
  await mpage.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await mpage.waitForFunction(
    () => window.Orrery3D && window.Orrery3D.isWebGL !== false &&
      document.documentElement.classList.contains('orrery-full'),
    null, { timeout: 45000 }
  );
  await mpage.evaluate(() => new Promise((r) => setTimeout(r, 8500)));
  await mpage.evaluate(() => {
    const el = document.getElementById('orrery-viewport');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await sleep(700);
  await mpage.screenshot({ path: join(OUT, 'craft-v576-09-mobile-rest.png') });
  console.log('shot craft-v576-09-mobile-rest');
  await mpage.evaluate(() => {
    const b = document.querySelector('.lite-vp-btn[data-lite-planet="moon"]');
    if (b) b.click();
  });
  await sleep(3200);
  await mpage.evaluate(() => {
    const el = document.getElementById('orrery-viewport');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await sleep(500);
  await mpage.screenshot({ path: join(OUT, 'craft-v576-10-mobile-moon.png') });
  console.log('shot craft-v576-10-mobile-moon');

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(2); });
