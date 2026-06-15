/**
 * AstroPrecise preloader visual capture — run after orrery/CSS changes.
 * Usage: node capture-preloader.mjs [baseUrl]
 * Output: tools/visual-check/out/*.png + report.json
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'http://localhost:8790';
const OUT = join(__dirname, 'out');

async function snap(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function readProbe(page) {
  return page.evaluate(() => {
    const phase = document.getElementById('preloader-phase')?.textContent?.trim() || '';
    const pre = document.getElementById('preloader');
    const canvas = document.getElementById('orrery-canvas');
    const O = window.Orrery3D;
    const preStyle = pre ? getComputedStyle(pre) : null;
    return {
      phase,
      preloaderVisible: !!pre && preStyle?.display !== 'none' && preStyle?.visibility !== 'hidden' && preStyle?.opacity !== '0',
      preloaderClasses: pre?.className || '',
      aligned: pre?.classList.contains('aligned'),
      canvasClientW: canvas?.clientWidth || 0,
      canvasClientH: canvas?.clientHeight || 0,
      orrery: O ? {
        introActive: O.isIntroActive?.(),
        introCompleted: O.hasIntroCompleted?.(),
        introProgress: O.getIntroProgress?.(),
        introStartedAt: O.getIntroStartedAt?.(),
        introDurationMs: O.getIntroDurationMs?.(),
        scaleLevel: O.getScaleLevel?.(),
      } : null,
      bodyIntro: document.body.classList.contains('preloader-intro-playing'),
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });

  await context.addInitScript(() => {
    try { sessionStorage.removeItem('ap_intro_complete'); } catch (_) {}
  });

  const page = await context.newPage();
  const report = { base: BASE, capturedAt: new Date().toISOString(), shots: [], states: [], issues: [] };

  try {
    await page.goto(`${BASE}/?v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.Orrery3D, { timeout: 45000 });

    const phases = new Set();
    let maxProgress = 0;
    let earthHoldState = null;
    let introStartedAt = 0;
    const deadline = Date.now() + 90000;

    while (Date.now() < deadline) {
      const row = await readProbe(page);
      phases.add(row.phase);
      if (row.orrery) {
        maxProgress = Math.max(maxProgress, row.orrery.introProgress ?? 0);
        if (row.orrery.introStartedAt > 0) introStartedAt = row.orrery.introStartedAt;
      }

      if (!earthHoldState && row.orrery?.introActive && !row.aligned) {
        earthHoldState = row;
        report.shots.push({ label: '00-earth-hold', file: await snap(page, '00-earth-hold') });
        report.states.push({ label: '00-earth-hold', ...row });
      }

      if (row.orrery?.introCompleted && row.aligned) break;
      await page.waitForTimeout(45);
    }

    const enterState = await readProbe(page);
    report.shots.push({ label: '03-sky-aligned', file: await snap(page, '03-sky-aligned') });
    report.states.push({ label: '03-sky-aligned', ...enterState });

    const introElapsed = await page.evaluate(() => {
      const started = window.Orrery3D?.getIntroStartedAt?.() ?? 0;
      return started > 0 ? Math.round(performance.now() - started) : 0;
    });
    report.introElapsedMs = introElapsed;
    report.timeline = { phases: [...phases], maxProgress };

    if (!earthHoldState) report.issues.push('00-earth-hold: no Earth-hold frame captured');
    if (!enterState.aligned) report.issues.push('Enter CTA not revealed after intro');
    if (!enterState.orrery?.introCompleted) report.issues.push('hasIntroCompleted() false after intro');
    if (introElapsed > 0 && introElapsed < 6500) {
      report.issues.push(`Intro elapsed ${introElapsed}ms — expected ~7500ms`);
    }
    if (!phases.has('Earth') && !phases.has('Approaching Earth')) {
      report.issues.push(`Phase copy missing Earth/Approaching (saw: ${[...phases].join(', ')})`);
    }
    if (maxProgress < 0.9) report.issues.push(`Intro max progress only ${maxProgress.toFixed(2)}`);
    if (enterState.phase === 'Inner system') report.issues.push('Enter screen shows "Inner system"');
    if (earthHoldState?.aligned) report.issues.push('Enter revealed during Earth-hold');
    if (enterState.canvasClientW < 400) report.issues.push('Canvas too small on Enter screen');

    const brightness = await page.evaluate(() => {
      const c = document.getElementById('orrery-canvas');
      if (!c || !c.width) return null;
      const ctx = c.getContext('webgl') || c.getContext('webgl2');
      if (!ctx) return { error: 'no webgl' };
      const buf = new Uint8Array(4);
      ctx.readPixels(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, buf);
      return { r: buf[0], g: buf[1], b: buf[2], a: buf[3] };
    });
    report.centerPixel = brightness;
    if (brightness && brightness.r < 8 && brightness.g < 8 && brightness.b < 8) {
      report.issues.push('Center pixel near black — Earth may not be rendering');
    }

    report.ok = report.issues.length === 0;
    await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    report.error = String(err);
    report.ok = false;
    await snap(page, 'error-state').catch(() => {});
    await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();