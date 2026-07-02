/**
 * UX user-journey audit — AstroPrecise v547
 * Usage: node user-journey-v547.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const VERSION = '546';
const OUT_DIR = join(__dirname, 'out', 'user-journey-v547');
const REPORT_PATH = join(__dirname, 'out', 'user-journey-v547.json');

function makeConsoleCollector() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    attach(page) {
      page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') errors.push(text);
        else if (type === 'warning') warnings.push(text);
      });
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message || e}`));
      page.on('requestfailed', (req) => {
        const fail = req.failure();
        if (fail) errors.push(`[requestfailed] ${req.url()} — ${fail.errorText}`);
      });
    },
  };
}

async function snap(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function scrollToSection(page, selector, waitMs = 600) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, selector);
  await page.waitForTimeout(waitMs);
}

async function analyzeHomepage(page) {
  return page.evaluate(() => {
    const issues = [];
    const positives = [];

    const hero = document.getElementById('heroChapter') || document.querySelector('.cosmic-hero, .hero');
    const h1 = document.querySelector('h1');
    const h1Cs = h1 ? getComputedStyle(h1) : null;

    // Orrery / lite vs webgl
    const orreryViewport = document.getElementById('orrery-viewport');
    const orreryCanvas = document.getElementById('orrery-canvas');
    const litePoster = document.getElementById('orrery-lite-poster');
    const liteCanvas = document.getElementById('lite-poster-canvas');
    const liteLaunch = document.getElementById('orrery-lite-launch');
    const solarModel = document.querySelector('.solar-model, #solar-model, .hero-showstopper__solar');
    const webglCanvas = document.querySelector('canvas#orrery-canvas, canvas.orrery-canvas, #orrery-viewport canvas:not(#lite-poster-canvas)');

    let orreryMode = 'unknown';
    if (document.documentElement.classList.contains('ap-lite-hero') || litePoster?.offsetParent !== null) {
      orreryMode = liteLaunch && !liteLaunch.hidden ? 'lite-with-launch-cta' : 'lite';
    }
    if (orreryCanvas && orreryCanvas.width > 100) orreryMode = 'webgl';
    if (document.body.classList.contains('orrery-active') || document.documentElement.classList.contains('ap-orrery-loaded')) {
      orreryMode = 'webgl';
    }
    if (solarModel) orreryMode = 'solar-model';

    const orreryRect = (orreryViewport || litePoster || solarModel || orreryCanvas)?.getBoundingClientRect();
    if (!orreryRect || orreryRect.width < 80 || orreryRect.height < 80) {
      issues.push({ type: 'orrery', severity: 'high', text: 'Hero sky instrument area missing or undersized above fold' });
    } else {
      positives.push(`Hero sky instrument visible (${Math.round(orreryRect.width)}×${Math.round(orreryRect.height)}px), mode: ${orreryMode}`);
    }

    // Hero readability
    if (h1Cs && parseFloat(h1Cs.opacity) < 0.85) {
      issues.push({ type: 'readability', severity: 'high', text: `Hero H1 low opacity (${h1Cs.opacity}) — may feel invisible on first paint` });
    }
    if (hero) {
      const heroOpacity = getComputedStyle(hero).opacity;
      if (parseFloat(heroOpacity) < 0.5) {
        issues.push({ type: 'readability', severity: 'high', text: `Hero chapter opacity ${heroOpacity} — content may be hidden before scroll reveal` });
      }
    }

    // Layout: float nav overlap
    const floatNav = document.getElementById('apFloatNav');
    const pageWrap = document.querySelector('.page-wrap');
    const padEnd = pageWrap ? parseFloat(getComputedStyle(pageWrap).paddingInlineEnd) : 0;
    if (floatNav && getComputedStyle(floatNav).display !== 'none' && padEnd < 60) {
      issues.push({ type: 'layout', severity: 'medium', text: 'Float nav visible but page content lacks right padding — possible overlap with body copy' });
    }

    // Compare section
    const compare = document.getElementById('compareChapter');
    if (!compare) issues.push({ type: 'structure', severity: 'medium', text: 'compareChapter section not found' });
    else {
      const compareTitle = compare.querySelector('h2')?.textContent?.trim();
      const compareVisible = compare.getBoundingClientRect().top < window.innerHeight;
      if (compareVisible) positives.push(`Compare section reachable: "${compareTitle?.slice(0, 50)}"`);
    }

    // Why section
    const why = document.getElementById('whyChapter');
    if (why) {
      const whyLead = why.querySelector('.ap-chapter-lead, p');
      const leadOpacity = whyLead ? parseFloat(getComputedStyle(whyLead).opacity) : 1;
      if (leadOpacity < 0.75) {
        issues.push({ type: 'readability', severity: 'medium', text: 'Why Astro Precise lead copy appears faded (low opacity)' });
      }
    }

    // Sky chapter
    const sky = document.getElementById('skyChapter');
    const datelineSun = document.getElementById('dateline-sun');
    if (sky && datelineSun) {
      const sunText = datelineSun.textContent?.trim() || '';
      if (!/^Sun in/i.test(sunText)) {
        issues.push({ type: 'dead-data', severity: 'medium', text: `Live dateline not populated: "${sunText.slice(0, 40)}"` });
      } else {
        positives.push(`Live sky dateline populated: ${sunText}`);
      }
    }

    // Guides
    const guidesWrap = document.getElementById('skyGuidesWrap');
    const guideCards = document.querySelectorAll('.sg-card').length;
    const guidesLoading = document.querySelector('.sg-loading');
    if (guidesWrap) {
      if (guideCards === 0 && guidesLoading) {
        issues.push({ type: 'dead-controls', severity: 'high', text: 'Sky guides still showing loading placeholder — cards not rendered after scroll' });
      } else if (guideCards > 0) {
        positives.push(`${guideCards} sky guide cards loaded`);
      }
      const filterChips = document.querySelectorAll('.sg-filter-chip');
      if (filterChips.length === 0 && guideCards === 0) {
        issues.push({ type: 'dead-controls', severity: 'medium', text: 'Sky guides filter chips absent — filtering unavailable' });
      }
    }

    // Dead / confusing controls
    const liteLaunchBtn = document.getElementById('orrery-lite-launch');
    if (liteLaunchBtn && !liteLaunchBtn.hidden) {
      positives.push('Lite hero offers explicit "Launch 3D orrery" opt-in');
    }

    const ctaButtons = [...document.querySelectorAll('a.btn, a.ap-btn, .hero a[href*="chart"]')].slice(0, 5);
    const deadCtas = ctaButtons.filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#');
    if (deadCtas.length) {
      issues.push({ type: 'dead-controls', severity: 'high', text: `${deadCtas.length} hero/primary CTA(s) have empty or # href` });
    }

    // Copy clarity
    const standfirst = document.querySelector('.standfirst, .cosmic-hero__standfirst, .hero__standfirst');
    if (standfirst) {
      const sf = standfirst.textContent?.trim() || '';
      if (sf.length > 220) {
        issues.push({ type: 'copy', severity: 'low', text: 'Hero standfirst is long (>220 chars) — value prop may scan slowly' });
      } else if (sf.length > 30) {
        positives.push('Hero standfirst present and concise enough to scan');
      }
    }

    const confusingTerms = [...document.querySelectorAll('main *')].filter((el) => {
      const t = el.childNodes.length === 1 && el.textContent ? el.textContent.trim() : '';
      return /VSOP87|ephemeris|synastry/i.test(t) && t.length < 80 && !el.closest('.sg-trust-note, .ap-mini-trust, footer');
    });
    if (confusingTerms.length > 3) {
      issues.push({ type: 'copy', severity: 'low', text: 'Jargon (VSOP87/ephemeris) appears in body without immediate plain-language gloss' });
    }

    // Horizontal overflow
    const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    if (overflow) {
      issues.push({ type: 'layout', severity: 'medium', text: `Horizontal overflow detected (scrollWidth ${document.documentElement.scrollWidth} > viewport ${window.innerWidth})` });
    }

    return {
      orreryMode,
      guideCards,
      h1Text: h1?.textContent?.trim()?.slice(0, 80) || '',
      issues,
      positives,
      sections: {
        compare: !!compare,
        why: !!why,
        sky: !!sky,
        guides: !!guidesWrap,
      },
    };
  });
}

async function analyzeHoroscope(page) {
  return page.evaluate(() => {
    const issues = [];
    const positives = [];

    const hero = document.querySelector('.horoscope-hero, .hero, main h1');
    if (!hero) issues.push({ type: 'structure', severity: 'medium', text: 'No clear horoscope hero / H1 above fold' });

    const h1 = document.querySelector('h1');
    if (h1) {
      const cs = getComputedStyle(h1);
      if (parseFloat(cs.opacity) < 0.8) {
        issues.push({ type: 'readability', severity: 'medium', text: 'Horoscope H1 low opacity' });
      } else positives.push(`Horoscope title visible: "${h1.textContent?.trim().slice(0, 50)}"`);
    }

    const skyToggle = document.getElementById('sky-board-toggle');
    if (skyToggle) {
      const expanded = skyToggle.getAttribute('aria-expanded');
      positives.push(`Planetary weather toggle present (aria-expanded=${expanded})`);
    }

    const reading = document.querySelector('.today-reading, #today-reading, [aria-live="polite"]');
    if (reading?.classList.contains('is-loading')) {
      issues.push({ type: 'dead-data', severity: 'high', text: 'Today reading still in loading state above fold' });
    }

    const signPicker = document.querySelector('.sign-picker, .zodiac-grid, [data-sign]');
    if (!signPicker) {
      issues.push({ type: 'structure', severity: 'medium', text: 'No obvious sign picker / zodiac grid above fold' });
    } else positives.push('Sign selection UI present');

    const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    if (overflow) issues.push({ type: 'layout', severity: 'medium', text: 'Horizontal overflow on horoscope page' });

    return { issues, positives };
  });
}

async function analyzeChart(page) {
  return page.evaluate(() => {
    const issues = [];
    const positives = [];

    const form = document.querySelector('#chart-form, form.chart-form, form');
    if (form) positives.push('Birth chart form present above fold');
    else issues.push({ type: 'structure', severity: 'high', text: 'Chart form not found above fold' });

    const required = form ? [...form.querySelectorAll('input[required], select[required]')] : [];
    const unlabeled = required.filter((el) => {
      const id = el.id;
      const label = id ? document.querySelector(`label[for="${id}"]`) : null;
      return !label && !el.getAttribute('aria-label');
    });
    if (unlabeled.length) {
      issues.push({ type: 'a11y', severity: 'medium', text: `${unlabeled.length} required chart field(s) lack visible label or aria-label` });
    }

    const wheel = document.getElementById('natal-wheel-wrap');
    if (wheel && !wheel.classList.contains('hidden')) {
      positives.push('Natal wheel mount visible (may show before form submit — check UX)');
    }

    const locationInput = document.querySelector('#birth-place, [name="place"], [id*="location"], [id*="place"]');
    if (locationInput) positives.push('Birth place field present');
    else issues.push({ type: 'structure', severity: 'medium', text: 'Birth place / location field not obvious in form' });

    const submit = form?.querySelector('button[type="submit"], input[type="submit"]');
    if (!submit) issues.push({ type: 'dead-controls', severity: 'high', text: 'No submit button found on chart form' });
    else positives.push(`Submit CTA: "${submit.textContent?.trim().slice(0, 40)}"`);

    return { issues, positives };
  });
}

function dedupeStrings(arr) {
  return [...new Set(arr)];
}

function mergeIssues(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const item of list) {
      const key = typeof item === 'string' ? item : item.text;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(typeof item === 'string' ? item : item.text);
      }
    }
  }
  return out;
}

function buildTopFixes(pages) {
  const candidates = [];

  for (const p of pages) {
    for (const issue of p.issues) {
      const text = typeof issue === 'string' ? issue : issue;
      let priority = 3;
      let fix = '';

      if (/loading placeholder|still in loading|not populated|dead|empty or # href/i.test(text)) {
        priority = 1;
      } else if (/invisible|opacity|undersized|not found above fold|overflow/i.test(text)) {
        priority = 2;
      } else if (/overlap|faded|filter chips|sign picker/i.test(text)) {
        priority = 2;
      } else {
        priority = 3;
      }

      if (/Sky guides still showing loading/i.test(text)) {
        fix = 'Eager-fetch sky_guides.json on homepage idle or prefetch; render skeleton cards immediately; wire hashchange before async load completes.';
      } else if (/Hero H1 low opacity|Hero chapter opacity/i.test(text)) {
        fix = 'Exclude #heroChapter from .ap-chapter scroll-reveal initial opacity:0; ensure hero paints at opacity:1 on first frame.';
      } else if (/Float nav visible but page content lacks right padding/i.test(text)) {
        fix = 'Apply padding-inline-end on .page-wrap when body.ap-award-511--nav-visible; verify float nav does not cover compare/why copy.';
      } else if (/Live dateline not populated/i.test(text)) {
        fix = 'Run ephemeris dateline init on DOMContentLoaded; show fallback "Computing sky…" with aria-busy until Sun sign resolves.';
      } else if (/Today reading still in loading/i.test(text)) {
        fix = 'Horoscope page: resolve today-reading promise before paint or show cached reading with stale badge.';
      } else if (/required chart field.*lack visible label/i.test(text)) {
        fix = 'Associate <label for> with birth date/time/place inputs; add aria-describedby for timezone hint.';
      } else if (/Horizontal overflow/i.test(text)) {
        fix = 'Audit section-bleed and orrery viewport max-width; add overflow-x:hidden on body or fix offending element width.';
      } else if (/Jargon/i.test(text)) {
        fix = 'Add one-line gloss after first VSOP87 mention: "NASA-grade planetary math, runs on your device."';
      } else if (/standfirst is long/i.test(text)) {
        fix = 'Split hero standfirst into headline + 2-line subhead; move methodology detail below fold.';
      } else if (/CTA.*empty or #/i.test(text)) {
        fix = 'Wire hero CTAs to /chart.html and /horoscope.html; remove placeholder href="#".';
      } else if (/Sky guides filter chips absent/i.test(text)) {
        fix = 'Render default "All" chip synchronously; populate filters from sky_guides.json categories on load.';
      } else if (/Birth place.*not obvious/i.test(text)) {
        fix = 'Promote place autocomplete above optional fields; add placeholder "City, country".';
      } else if (/No obvious sign picker/i.test(text)) {
        fix = 'Move zodiac sign grid into first viewport on horoscope.html or add sticky sign tabs.';
      } else if (/sky instrument area missing/i.test(text)) {
        fix = 'Verify orrery/solar-model mount dimensions; ensure canvas gets non-zero width after CSS load.';
      } else {
        fix = `Investigate and fix: ${text}`;
      }

      candidates.push({ priority, issue: text, fix });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  const seen = new Set();
  const top = [];
  for (const c of candidates) {
    if (!seen.has(c.issue)) {
      seen.add(c.issue);
      top.push(c);
    }
    if (top.length >= 8) break;
  }
  return top;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });

  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  });

  const pages = [];

  // ── Homepage journey ──
  const homeConsole = makeConsoleCollector();
  const homePage = await context.newPage();
  homeConsole.attach(homePage);

  const homeUrl = `${BASE}/?v=${VERSION}`;
  await homePage.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await homePage.waitForSelector('h1, .ap-chapter-title', { timeout: 15000 }).catch(() => {});
  await homePage.waitForTimeout(1200);

  // Reveal scroll-hidden chapters for fair audit
  await homePage.evaluate(() => {
    document.querySelectorAll('.ap-chapter, .ap-reveal').forEach((el) => {
      el.classList.add('is-visible');
      el.style.opacity = '1';
    });
  });

  const homeShots = {};
  homeShots.hero = await snap(homePage, 'home-hero');

  let homeAnalysis = await analyzeHomepage(homePage);

  const sections = [
    { key: 'compare', sel: '#compareChapter' },
    { key: 'why', sel: '#whyChapter' },
    { key: 'sky', sel: '#skyChapter' },
    { key: 'guides', sel: '#skyGuidesWrap' },
  ];

  for (const { key, sel } of sections) {
    await scrollToSection(homePage, sel, key === 'guides' ? 1500 : 700);
    if (key === 'guides') {
      await homePage.waitForFunction(() => document.querySelectorAll('.sg-card').length >= 4, null, { timeout: 12000 }).catch(() => {});
      await homePage.waitForTimeout(800);
    }
    homeShots[key] = await snap(homePage, `home-${key}`);
  }

  homeAnalysis = await analyzeHomepage(homePage);
  homeAnalysis.screenshots = homeShots;
  homeAnalysis.orreryState = homeAnalysis.orreryMode;

  pages.push({
    url: homeUrl,
    issues: homeAnalysis.issues.map((i) => i.text),
    positives: homeAnalysis.positives,
    meta: {
      orreryState: homeAnalysis.orreryState,
      guideCards: homeAnalysis.guideCards,
      h1: homeAnalysis.h1Text,
      consoleErrors: dedupeStrings(homeConsole.errors),
      consoleWarnings: dedupeStrings(homeConsole.warnings).slice(0, 10),
      screenshots: homeShots,
    },
  });

  await homePage.close();

  // ── Horoscope ──
  const horoConsole = makeConsoleCollector();
  const horoPage = await context.newPage();
  horoConsole.attach(horoPage);

  const horoUrl = `${BASE}/horoscope.html?v=${VERSION}`;
  await horoPage.goto(horoUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await horoPage.waitForSelector('main, h1, .section__title', { timeout: 15000 }).catch(() => {});
  await horoPage.waitForTimeout(1500);

  const horoShot = await snap(horoPage, 'horoscope-above-fold');
  const horoAnalysis = await analyzeHoroscope(horoPage);

  pages.push({
    url: horoUrl,
    issues: horoAnalysis.issues.map((i) => i.text),
    positives: horoAnalysis.positives,
    meta: {
      consoleErrors: dedupeStrings(horoConsole.errors),
      consoleWarnings: dedupeStrings(horoConsole.warnings).slice(0, 10),
      screenshot: horoShot,
    },
  });

  await horoPage.close();

  // ── Chart ──
  const chartConsole = makeConsoleCollector();
  const chartPage = await context.newPage();
  chartConsole.attach(chartPage);

  const chartUrl = `${BASE}/chart.html?v=${VERSION}`;
  await chartPage.goto(chartUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await chartPage.waitForSelector('#chart-form, form, main', { timeout: 15000 }).catch(() => {});
  await chartPage.waitForTimeout(1200);

  const chartShot = await snap(chartPage, 'chart-above-fold');
  const chartAnalysis = await analyzeChart(chartPage);

  pages.push({
    url: chartUrl,
    issues: chartAnalysis.issues.map((i) => i.text),
    positives: chartAnalysis.positives,
    meta: {
      consoleErrors: dedupeStrings(chartConsole.errors),
      consoleWarnings: dedupeStrings(chartConsole.warnings).slice(0, 10),
      screenshot: chartShot,
    },
  });

  await chartPage.close();
  await browser.close();

  const report = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    version: VERSION,
    viewport: { width: 1440, height: 900 },
    pages,
    topFixes: buildTopFixes(pages),
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});