import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  } catch (error) {
    if (!/Executable doesn't exist/i.test(String(error))) throw error;
    return chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  }
}
const browser = await launchBrowser();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:8790/eclipse.html?nosw=1', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(1800);
const info = await page.evaluate(() => {
  const sels = [
    '.ap-eclipse-live__chapter p',
    '.ap-eclipse-guide article p',
    '.ap-eclipse-next article p',
    '.ap-eclipse-hero p',
    '.ap-eclipse-live p',
    '.ap-live-copy',
    'main p',
    '.ap-eclipse-page-shell p',
    '.ap-eclipse-kicker',
    '.ap-eclipse-live__hint',
    '.ap-eclipse-live__copy',
    '.ap-eclipse-live__chapter',
  ];
  const out = [];
  for (const sel of sels) {
    document.querySelectorAll(sel).forEach((el, i) => {
      if (i > 2) return;
      const st = getComputedStyle(el);
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 70);
      if (!t) return;
      out.push({ sel, fs: parseFloat(st.fontSize), cls: String(el.className || '').slice(0, 60), t });
    });
  }
  const hit = Array.from(document.querySelectorAll('p')).filter((el) => {
    const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
    return t.includes('Choose Maximum');
  }).map((el) => {
    const st = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: String(el.className || '').slice(0, 80),
      fs: parseFloat(st.fontSize),
      parent: el.parentElement ? el.parentElement.tagName + '.' + String(el.parentElement.className || '').slice(0, 70) : '',
      t: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90),
    };
  });
  return { out, hit };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
