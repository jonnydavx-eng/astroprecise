/**
 * v576 copy + mobile-conversion-fold verification.
 * Runs against the standing preview server. Screenshots → out/redesign/copy-v576-*.png
 * Usage: node copy-v576-verify.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out', 'redesign');
const CSS_PATH = join(__dirname, '..', '..', 'website', 'css', 'ap-horizon-2026.css');

let failures = 0;
const ok = (m) => console.log('ok   ' + m);
const fail = (m) => { failures++; console.log('FAIL ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bootPage(browser, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: 'dark', ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  return { ctx, page, errors };
}

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });

  /* ════════ Desktop 1440x900 — copy + dateline + console ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 1440, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });

    // standfirst
    const sf = norm(await page.textContent('.standfirst.hero-why-lead'));
    if (sf === 'The planets behind this page are real — computed live in your browser, accurate to roughly an arcminute. Your birth chart is where they stood the minute you were born.')
      ok('desktop: standfirst matches reconciled copy');
    else fail('desktop: standfirst mismatch: "' + sf + '"');

    // H1 + CTA locked
    const h1 = norm(await page.textContent('#heroChapter h1.display'));
    if (h1 === "You're not one of twelve. This chart is yours alone.") ok('desktop: H1 untouched (locked)');
    else fail('desktop: H1 changed: "' + h1 + '"');
    const cta = norm(await page.textContent('#hero-chart-form .btn-press'));
    if (cta === 'Calculate my chart') ok('desktop: CTA label untouched (locked)');
    else fail('desktop: CTA label changed: "' + cta + '"');

    // form label
    const label = norm(await page.textContent('label[for="hero-birthdate"]'));
    if (label === 'Your date of birth') ok('desktop: form label = "Your date of birth"');
    else fail('desktop: form label = "' + label + '"');

    // friction note
    const note = norm(await page.textContent('#hero-chart-form .hero-form-note'));
    if (note === 'Just your date starts it — time and place sharpen it on the next step.')
      ok('desktop: hero-form-note present with reconciled copy');
    else fail('desktop: hero-form-note = "' + note + '"');
    const noteCss = await page.evaluate(() => {
      const el = document.querySelector('#hero-chart-form .hero-form-note');
      const cs = getComputedStyle(el);
      return { size: cs.fontSize, family: cs.fontFamily, mt: cs.marginTop, color: cs.color };
    });
    console.log('     note css: ' + JSON.stringify(noteCss));

    // trust chips — exactly 3, reconciled texts
    const chips = await page.$$eval('ul.hero-solar-trust > li', (lis) => lis.map((li) => li.textContent.replace(/\s+/g, ' ').trim()));
    if (chips.length === 3) ok('desktop: exactly 3 trust chips'); else fail('desktop: ' + chips.length + ' trust chips: ' + JSON.stringify(chips));
    const want = [
      '✓ Free — no account',
      '✓ Accurate to about an arcminute (VSOP87)',
      '✓ Private — computed on your device',
    ];
    want.forEach((w, i) => {
      if (chips[i] === w) ok('desktop: chip ' + (i + 1) + ' = "' + w + '"');
      else fail('desktop: chip ' + (i + 1) + ' = "' + chips[i] + '" (want "' + w + '")');
    });
    const abbrTitle = await page.getAttribute('ul.hero-solar-trust abbr.ap-gloss', 'title');
    if (abbrTitle && abbrTitle.includes('published planetary theory')) ok('desktop: VSOP87 abbr gloss present');
    else fail('desktop: VSOP87 abbr gloss missing/wrong: ' + abbrTitle);

    // dateline — wait for JS populate (datetime attr is only set by fillDateline)
    try {
      await page.waitForFunction(() => document.getElementById('dateline-date') && document.getElementById('dateline-date').hasAttribute('datetime'), null, { timeout: 15000 });
      ok('desktop: dateline populated by JS (datetime attr set)');
    } catch { fail('desktop: dateline never populated by JS'); }
    const dl = norm(await page.textContent('#masthead-dateline'));
    console.log('     dateline text: "' + dl + '"');
    if (/^Vol\. MMXXVI · The sky right now — \d{1,2} \w+ \d{4} · Sun in \w+ · Moon in \w+$/.test(dl))
      ok('desktop: dateline format correct after JS');
    else fail('desktop: dateline format unexpected');
    if (/·\s*·|—\s*—|·\s*—|—\s*·/.test(dl)) fail('desktop: doubled separators in dateline');
    else ok('desktop: no doubled separators in dateline');
    const dlTitle = await page.getAttribute('#masthead-dateline', 'title');
    if (dlTitle === 'Recomputed in your browser on every load') ok('desktop: dateline title attr present');
    else fail('desktop: dateline title attr = ' + dlTitle);

    // sky chapter
    const h2 = norm(await page.textContent('#cosmic-band-heading'));
    if (h2 === 'Tonight, the planets stand where we say they do.') ok('desktop: sky chapter H2 updated');
    else fail('desktop: sky chapter H2 = "' + h2 + '"');
    const lead = norm(await page.textContent('#skyChapter .ap-chapter-lead'));
    if (lead === 'Step outside and check — or open any planetarium app. The same engine turning the model above, read from where you stand, recomputed every time you open the page.')
      ok('desktop: sky chapter lead updated');
    else fail('desktop: sky chapter lead = "' + lead + '"');

    // meta descriptions
    const metas = await page.evaluate(() => ({
      d: document.querySelector('meta[name="description"]').content,
      og: document.querySelector('meta[property="og:description"]').content,
      tw: document.querySelector('meta[name="twitter:description"]').content,
    }));
    const wantMeta = 'The planets on this page are real — computed live in your browser, accurate to about an arcminute. Free precise birth charts: no account, private, computed on your device.';
    for (const [k, v] of Object.entries(metas)) {
      if (v === wantMeta) ok('desktop: meta ' + k + ' merged');
      else fail('desktop: meta ' + k + ' = "' + v + '"');
    }

    await sleep(2500); // fade-ins settle
    await page.screenshot({ path: join(OUT, 'copy-v576-desktop-1440.png') });
    await page.screenshot({ path: join(OUT, 'copy-v576-desktop-copyrail.png'), clip: { x: 0, y: 0, width: 560, height: 820 } });

    if (errors.length) fail('desktop: console errors: ' + JSON.stringify(errors));
    else ok('desktop: zero console errors');
    await ctx.close();
  }

  /* ════════ Desktop 1440 pixel-identity — v576 media block on vs off ════════ */
  {
    const cssText = await readFile(CSS_PATH, 'utf8');
    const marker = '@media (max-width: 640px) {\n  .ap-award-511 #heroChapter {\n    min-height: 0;';
    const idx = cssText.indexOf(marker);
    if (idx === -1) { fail('pixel-diff: v576 media marker not found in CSS'); }
    const stripped = idx === -1 ? cssText : cssText.slice(0, idx);

    async function shootRail(withStrip) {
      const { ctx, page } = await bootPage(browser, { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
      if (withStrip) {
        await page.route('**/ap-horizon-2026.css*', (route) => route.fulfill({ contentType: 'text/css', body: stripped }));
      }
      await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 560, height: 820 } });
      await ctx.close();
      return buf;
    }
    const a = await shootRail(true);   // without v576 mobile block
    const b = await shootRail(false);  // with v576 mobile block
    if (a.equals(b)) ok('pixel-diff: 1440 copy rail identical with/without v576 mobile block (byte-equal)');
    else {
      // decode + count differing pixels in-browser (no extra deps)
      const { ctx, page } = await bootPage(browser, { width: 200, height: 200 });
      const diff = await page.evaluate(async ([pa, pb]) => {
        const load = (b64) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + b64; });
        const [ia, ib] = await Promise.all([load(pa), load(pb)]);
        const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
        const g = c.getContext('2d');
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
        g.clearRect(0, 0, c.width, c.height);
        g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) > 6 || Math.abs(da[i + 1] - db[i + 1]) > 6 || Math.abs(da[i + 2] - db[i + 2]) > 6) n++;
        }
        return { n, total: da.length / 4 };
      }, [a.toString('base64'), b.toString('base64')]);
      await ctx.close();
      const pct = (100 * diff.n / diff.total).toFixed(3);
      if (diff.n / diff.total < 0.001) ok('pixel-diff: 1440 copy rail ' + pct + '% pixels differ (< 0.1% — antialias noise)');
      else fail('pixel-diff: 1440 copy rail ' + pct + '% pixels differ (' + diff.n + ' px)');
    }
  }

  /* ════════ Mobile 390x844 — conversion fold ════════ */
  {
    const { ctx, page, errors } = await bootPage(browser, { width: 390, height: 844 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1500); // fade-in delays settle; NO scroll — fresh-load measurement

    const scrollY = await page.evaluate(() => window.scrollY);
    if (scrollY === 0) ok('mobile: fresh load, scrollY = 0'); else fail('mobile: page scrolled to ' + scrollY);

    const box = await (await page.$('#hero-chart-form .btn-press')).boundingBox();
    console.log('     CTA bounding box: ' + JSON.stringify(box));
    if (box && box.y + box.height <= 844) ok('mobile: CTA fully above the 844px fold (bottom = ' + Math.round(box.y + box.height) + 'px)');
    else fail('mobile: CTA below fold (bottom = ' + (box ? Math.round(box.y + box.height) : 'n/a') + 'px)');
    const inputBox = await (await page.$('#hero-birthdate')).boundingBox();
    if (inputBox && inputBox.y + inputBox.height <= 844) ok('mobile: date input above fold (bottom = ' + Math.round(inputBox.y + inputBox.height) + 'px)');
    else fail('mobile: date input below fold');

    // visual order: eyebrow → H1 → standfirst → form → trust → stage
    const ys = await page.evaluate(() => {
      const y = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect().top : null; };
      return {
        eyebrow: y('#heroChapter .eyebrow-rose'),
        h1: y('#heroChapter h1.display'),
        standfirst: y('.standfirst.hero-why-lead'),
        form: y('#hero-chart-form'),
        trust: y('ul.hero-solar-trust'),
        stage: y('#heroChapter .hero-solar-stage'),
        deck: y('#heroChapter .ap-orrery-deck'),
      };
    });
    console.log('     mobile section tops: ' + JSON.stringify(ys));
    const order = ['eyebrow', 'h1', 'standfirst', 'form', 'trust', 'stage'];
    let ordered = true;
    for (let i = 1; i < order.length; i++) {
      if (!(ys[order[i - 1]] < ys[order[i]])) { ordered = false; fail('mobile: order broken — ' + order[i - 1] + ' !< ' + order[i]); }
    }
    if (ordered) ok('mobile: visual order eyebrow → H1 → standfirst → form → trust → stage');
    if (ys.deck !== null && ys.deck > ys.stage) ok('mobile: HUD deck after stage'); else if (ys.deck !== null) fail('mobile: HUD deck above stage');

    const chips = await page.$$eval('ul.hero-solar-trust > li', (lis) => lis.length);
    if (chips === 3) ok('mobile: exactly 3 trust chips'); else fail('mobile: ' + chips + ' trust chips');

    await page.screenshot({ path: join(OUT, 'copy-v576-mobile-390x844.png') });
    await page.screenshot({ path: join(OUT, 'copy-v576-mobile-full.png'), fullPage: true });

    if (errors.length) fail('mobile: console errors: ' + JSON.stringify(errors));
    else ok('mobile: zero console errors');
    await ctx.close();
  }

  /* ════════ No-JS fallback wheel — VS-15 glyph render ════════ */
  {
    const { ctx, page } = await bootPage(browser, { width: 1440, height: 900 }, { javaScriptEnabled: false });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 30000 });
    await sleep(800);
    const wheel = await page.$('#apHeroWheelFallback svg');
    if (wheel) {
      await wheel.screenshot({ path: join(OUT, 'copy-v576-nojs-wheel.png') });
      ok('no-js: fallback wheel screenshot captured');
      const glyphs = await page.$$eval('#apHeroWheelFallback svg .eng-glyph', (ts) => ts.map((t) => t.textContent));
      const allVS = glyphs.length === 12 && glyphs.every((g) => g.endsWith('︎'));
      if (allVS) ok('no-js: all 12 zodiac glyphs carry U+FE0E (text presentation)');
      else fail('no-js: glyph VS-15 check failed: ' + JSON.stringify(glyphs));
    } else fail('no-js: fallback wheel not found');
    await ctx.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' CHECK(S) FAILED');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
