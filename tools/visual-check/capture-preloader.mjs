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
const CLI_ARGS = process.argv.slice(2);
const MOBILE = CLI_ARGS.includes('--mobile');
const BASE = CLI_ARGS.find((a) => !a.startsWith('--')) || 'http://localhost:8790';
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
    viewport: MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: MOBILE ? 3 : 1,
    colorScheme: 'dark',
    userAgent: MOBILE
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : undefined,
    isMobile: MOBILE,
    hasTouch: MOBILE,
  });

  await context.addInitScript(() => {
    try { sessionStorage.removeItem('ap_intro_complete'); } catch (_) {}
  });

  const page = await context.newPage();
  const report = { base: BASE, capturedAt: new Date().toISOString(), shots: [], states: [], issues: [] };

  try {
    await page.goto(`${BASE}/index-full.html?full=1&v=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(async () => {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.Orrery3D, { timeout: 90000 });

    const phases = new Set();
    let maxProgress = 0;
    let cosmosHoldState = null;
    let earthLandState = null;
    let introStartedAt = 0;
    const deadline = Date.now() + 200000;

    while (Date.now() < deadline) {
      const row = await readProbe(page);
      phases.add(row.phase);
      const pre = await page.evaluate(() => document.getElementById('preloader')?.className || '');
      if (row.orrery) {
        maxProgress = Math.max(maxProgress, row.orrery.introProgress ?? 0);
        if (row.orrery.introStartedAt > 0) introStartedAt = row.orrery.introStartedAt;
      }

      if (!cosmosHoldState && row.orrery?.introActive && !row.aligned
          && (pre.includes('preloader--cosmic') || (row.orrery.scaleLevel ?? 0) >= 5)
          && row.canvasClientW >= (MOBILE ? 360 : 500)
          && row.canvasClientH >= (MOBILE ? 600 : 500)) {
        cosmosHoldState = row;
        report.shots.push({ label: '01-cosmos-hold', file: await snap(page, MOBILE ? '01-cosmos-hold-mobile' : '01-cosmos-hold') });
        report.states.push({ label: '01-cosmos-hold', preloaderClasses: pre, ...row });
      }

      if (!earthLandState && row.orrery?.introCompleted && row.aligned) {
        earthLandState = row;
        break;
      }
      await page.waitForTimeout(50);
    }

    const enterState = earthLandState || await readProbe(page);
    report.shots.push({ label: '04-earth-land', file: await snap(page, MOBILE ? '04-earth-land-mobile' : '04-earth-land') });
    report.states.push({ label: '04-earth-land', ...enterState });

    const introElapsed = await page.evaluate(() => {
      const started = window.Orrery3D?.getIntroStartedAt?.() ?? 0;
      return started > 0 ? Math.round(performance.now() - started) : 0;
    });
    report.introElapsedMs = introElapsed;
    report.timeline = { phases: [...phases], maxProgress };

    report.mobile = MOBILE;
    if (!cosmosHoldState) report.issues.push('01-cosmos-hold: no galaxy/cosmos frame captured');
    if (!enterState.aligned) report.issues.push('Enter CTA not revealed after intro');
    if (!enterState.orrery?.introCompleted) report.issues.push('hasIntroCompleted() false after intro');
    const expectMin = MOBILE ? 22000 : 26000;
    const expectMax = MOBILE ? 38000 : 45000;
    if (introElapsed > 0 && introElapsed < expectMin) {
      report.issues.push(`Intro elapsed ${introElapsed}ms — expected ~${expectMin / 1000}s+ continuous cosmic descent`);
    }
    if (introElapsed > expectMax) {
      report.issues.push(`Intro elapsed ${introElapsed}ms — slower than ${expectMax / 1000}s budget`);
    }
    const hasCosmicPhase = [...phases].some((p) => /deep field|stardust|galactic|ecliptic|transpersonal|gas-giant|personal sky|blue marble|meridian|cosmic|galaxy|horizon/i.test(p));
    if (!hasCosmicPhase) {
      report.issues.push(`Phase copy missing cosmic journey (saw: ${[...phases].join(', ')})`);
    }
    if (maxProgress < 0.9) report.issues.push(`Intro max progress only ${maxProgress.toFixed(2)}`);
    if (enterState.orrery?.scaleLevel !== 0) {
      report.issues.push(`Enter screen scale ${enterState.orrery?.scaleLevel} — expected Earth (0)`);
    }
    const minCanvas = MOBILE ? 280 : 400;
    if (enterState.canvasClientW < minCanvas) report.issues.push('Canvas too small on Enter screen');

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
    if (brightness && brightness.a > 0 && brightness.r < 8 && brightness.g < 8 && brightness.b < 8) {
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