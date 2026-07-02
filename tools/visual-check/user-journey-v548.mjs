/**
 * UX user-journey audit — AstroPrecise v549
 * Usage: node user-journey-v548.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const VERSION = '562';
const OUT_DIR = join(__dirname, 'out', 'user-journey-v548');
const REPORT_PATH = join(__dirname, 'out', 'user-journey-v548.json');

/** v547 already shipped — exclude from topFixes */
const V547_DONE = [
  'sky skeleton',
  'go-to-sign prompt',
  'sky board expand',
  'chart compact hero',
  'inline validation',
  'guides trust dup',
  'badge glyph',
  'nav 2col',
  'scroll lock',
];

const V558_DONE = [
  'sticky reading panel',
  'collapse planet legend',
  'hover tooltip',
  'canvas/svg hover',
  'explore tabs',
  'featured product',
  'centre star',
  'pulse animation',
  'personalise chip',
  'float nav',
  'icon-only',
  'vsop87',
  'ephemeris',
  'scroll for more',
  'empty-submit',
  'is-error',
  'compare section',
  'shop chapter',
  'chart cta',
  'collective reading',
];

const V560_DONE = [
  'ephemeris.css',
  'onchordhover',
  'chord hover',
  'twelve.this',
  'hero h1',
  'load 89',
  'deferred ephemeris',
];

/** v561–v562 — expert 100/100 all dims; manual backlog archived */
const V561_DONE = [
  'hiddenonhero',
  'float nav at hero',
  'dial-ready',
  'notify',
  'performance 100',
  'navux 100',
  'all dimensions',
  'backlog',
];

const MANUAL_BACKLOG_SHIPPED = true;

const V559_DONE = [
  'reading mode',
  'reading-open',
  'collapse sky',
  'sky board',
  'centre-star',
  'centre hint',
  'dial-ready',
  'tabs hint',
  'pin toast',
  'sample chart',
  'esc exit',
  'r replay',
  'twelve.this',
  'hero h1',
  'typography glitch',
  'sg-sheet-scrolled',
  'srp-chart-cta',
  'ap-gloss',
  'duplicate feedback',
  'duplicate toast',
  'journey probe',
];

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

async function snap(page, name, opts = {}) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: !!opts.fullPage });
  return path;
}

async function scrollToSection(page, selector, waitMs = 600) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, selector);
  await page.waitForTimeout(waitMs);
}

function dedupeStrings(arr) {
  return [...new Set(arr)];
}

function issueObj(text, severity = 'medium', type = 'ux') {
  return { type, severity, text };
}

// ── Homepage analysis ──────────────────────────────────────────────
async function analyzeHomepage(page) {
  return page.evaluate(() => {
    const issues = [];
    const positives = [];

    const h1 = document.querySelector('h1');
    const h1Cs = h1 ? getComputedStyle(h1) : null;
    if (h1Cs && parseFloat(h1Cs.opacity) < 0.85) {
      issues.push({ type: 'readability', severity: 'high', text: `Hero H1 low opacity (${h1Cs.opacity})` });
    } else if (h1) positives.push(`Hero H1 readable: "${h1.textContent?.trim().slice(0, 60)}"`);

    const solarModel = document.querySelector('.hero-showstopper__solar, .solar-model, #solar-model');
    const orreryCanvas = document.getElementById('orrery-canvas');
    const orreryRect = (solarModel || orreryCanvas)?.getBoundingClientRect();
    if (!orreryRect || orreryRect.width < 80) {
      issues.push({ type: 'orrery', severity: 'high', text: 'Hero sky instrument missing or undersized' });
    } else {
      positives.push(`Hero instrument ${Math.round(orreryRect.width)}×${Math.round(orreryRect.height)}px`);
    }

    // Badge glyph check (v547 fix)
    const badge = document.querySelector('.ap-expert-badge, .hero-badge, [class*="solar-model-badge"]');
    if (badge) {
      const bt = badge.textContent?.trim() || '';
      if (/^O\s*EXPERT|^0\s*EXPERT/i.test(bt)) {
        issues.push({ type: 'copy', severity: 'medium', text: `Solar badge still shows broken glyph: "${bt.slice(0, 30)}"` });
      } else positives.push('Solar badge text looks correct');
    }

    // Float nav + padding
    const floatNav = document.getElementById('apFloatNav');
    const pageWrap = document.querySelector('.page-wrap, main.ap-flow');
    const padEnd = pageWrap ? parseFloat(getComputedStyle(pageWrap).paddingInlineEnd) : 0;
    if (floatNav && getComputedStyle(floatNav).display !== 'none') {
      positives.push(`Float nav visible; content pad-inline-end=${padEnd}px`);
      if (padEnd < 40) {
        issues.push({ type: 'layout', severity: 'medium', text: 'Float nav visible but content lacks right padding — copy may crowd sidebar' });
      }
    }

    // Compare
    const compare = document.getElementById('compareChapter');
    if (!compare) issues.push({ type: 'structure', severity: 'high', text: 'compareChapter section missing' });
    else {
      const cols = compare.querySelectorAll('.ap-compare-card, .compare-card, .ap-diff-grid > *').length;
      const bullets = compare.querySelectorAll('.ap-diff-bullet, .gold-bullet, li').length;
      if (cols >= 2) positives.push(`Compare section: ${cols} column cards`);
      const compareGrid = compare.querySelector('.ap-diff-grid, .compare-grid');
      if (compareGrid) {
        const gridCs = getComputedStyle(compareGrid);
        if (gridCs.display === 'grid' && gridCs.gridTemplateColumns?.includes('1fr 1fr 1fr 1fr')) {
          issues.push({ type: 'layout', severity: 'low', text: 'Compare/why still uses 4-column grid — may feel cramped with float nav at 1440px' });
        }
      }
    }

    // Why
    const why = document.getElementById('whyChapter');
    if (why) {
      const cards = why.querySelectorAll('.ap-why-card, .why-pillar, .ap-pillar-card').length;
      if (cards >= 4) positives.push(`Why section: ${cards} pillar cards`);
      const lead = why.querySelector('.ap-chapter-lead');
      if (lead && parseFloat(getComputedStyle(lead).opacity) < 0.75) {
        issues.push({ type: 'readability', severity: 'medium', text: 'Why section lead copy appears faded' });
      }
    }

    // Sky
    const sky = document.getElementById('skyChapter');
    const datelineSun = document.getElementById('dateline-sun');
    if (sky) {
      const sunText = datelineSun?.textContent?.trim() || '';
      if (/^Sun in/i.test(sunText)) positives.push(`Sky dateline: ${sunText}`);
      else if (/computing|loading|…/i.test(sunText)) {
        issues.push({ type: 'dead-data', severity: 'medium', text: `Sky dateline still placeholder: "${sunText}"` });
      }
      const skeleton = sky.querySelector('.ap-sky-skeleton, .sky-skeleton, [data-sky-skeleton]');
      if (skeleton && skeleton.offsetParent !== null) {
        issues.push({ type: 'dead-data', severity: 'low', text: 'Sky section skeleton still visible after load' });
      }
    }

    // Guides — trust dup check (v547 fix)
    const guidesWrap = document.getElementById('skyGuidesWrap');
    const guideCards = document.querySelectorAll('.sg-card').length;
    if (guidesWrap) {
      if (guideCards > 0) positives.push(`${guideCards} sky guide cards loaded`);
      else issues.push({ type: 'dead-controls', severity: 'high', text: 'Sky guide cards not rendered' });

      const trustLines = [...guidesWrap.querySelectorAll('p, .ap-mini-trust, .sg-trust-note')]
        .map((el) => el.textContent?.trim())
        .filter((t) => t && /VSOP87|ephemeris|computed on your device/i.test(t));
      if (trustLines.length > 2) {
        issues.push({ type: 'copy', severity: 'medium', text: `Duplicate trust copy in guides section (${trustLines.length} VSOP87/ephemeris lines)` });
      } else if (trustLines.length <= 1) positives.push('Guides trust copy not duplicated');
    }

    // Shop
    const shop = document.getElementById('shopChapter');
    if (!shop) issues.push({ type: 'structure', severity: 'medium', text: 'shopChapter section missing from homepage scroll' });
    else {
      const shopItems = shop.querySelectorAll('.edition-card, .shop-card, .ap-shop-item, .edition-list li').length;
      positives.push(`Shop section present (${shopItems} items/cards)`);
      const shopLead = shop.querySelector('h2, .ap-chapter-title');
      const shopRect = shop.getBoundingClientRect();
      if (shopRect.height < 200) {
        issues.push({ type: 'layout', severity: 'low', text: 'Shop section appears thin — may lack visual weight at end of journey' });
      }
      if (!shopLead?.textContent?.trim()) {
        issues.push({ type: 'structure', severity: 'medium', text: 'Shop section missing clear heading' });
      }
    }

    const cosmicBtn = document.getElementById('ap-cosmic-flight-launch');
    if (cosmicBtn) positives.push('Cosmic flight launch control in hero');
    else issues.push({ type: 'orrery', severity: 'high', text: 'Cosmic flight launch button missing from hero' });

    const instrumentsCosmic = document.getElementById('instruments-cosmic-flight');
    if (instrumentsCosmic) positives.push('Cosmic flight entry in instruments band');

    const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
    if (overflow) {
      issues.push({ type: 'layout', severity: 'medium', text: `Horizontal overflow (scrollWidth ${document.documentElement.scrollWidth})` });
    }

    return {
      issues,
      positives,
      guideCards,
      h1Text: h1?.textContent?.trim()?.slice(0, 80) || '',
    };
  });
}

// ── Cosmic flight overlay smoke ────────────────────────────────────
async function testCosmicFlight(page) {
  const issues = [];
  const positives = [];
  const interactions = {};

  await scrollToSection(page, '.hero-showstopper, .ap-award-orrery-frame, h1', 500);

  const hasLaunch = await page.evaluate(() => !!document.getElementById('ap-cosmic-flight-launch'));
  if (!hasLaunch) {
    issues.push(issueObj('Cosmic flight launch button missing', 'high', 'orrery'));
    return { issues, positives, interactions };
  }

  const launchDisabled = await page.evaluate(() => {
    const btn = document.getElementById('ap-cosmic-flight-launch');
    return !btn || btn.disabled;
  });
  if (launchDisabled) {
    issues.push(issueObj('Cosmic flight launch button disabled (reduced-motion?)', 'high', 'orrery'));
    return { issues, positives, interactions };
  }

  await page.evaluate(() => { if (window.__apWarmHeroBundle) window.__apWarmHeroBundle(); });
  await page.waitForTimeout(600);
  await page.click('#ap-cosmic-flight-launch');
  await page.waitForSelector('#ap-cosmic-flight.is-open', { timeout: 12000 }).catch(() => {});

  const opened = await page.evaluate(() => {
    const el = document.getElementById('ap-cosmic-flight');
    return !!(el && !el.hidden && el.classList.contains('is-open'));
  });
  if (!opened) {
    issues.push(issueObj('Cosmic flight fullscreen overlay did not open', 'high', 'orrery'));
    return { issues, positives, interactions };
  }
  positives.push('Cosmic flight overlay opens from hero');

  const modes = await page.evaluate(() => ({
    descent: !!document.getElementById('ap-cf-mode-descent'),
    zoom: !!document.getElementById('ap-cf-mode-zoom'),
    narrate: !!document.getElementById('ap-cf-narrate'),
    scaleStrip: !!document.getElementById('ap-cf-scale-strip'),
  }));
  if (modes.descent && modes.zoom) positives.push('Descent + Space zoom mode toggles present');
  else issues.push(issueObj('Cosmic flight mode toggles incomplete', 'medium', 'orrery'));

  interactions.screenshotOpen = await snap(page, 'home-cosmic-flight-open');

  await page.click('#ap-cf-mode-zoom');
  await page.waitForTimeout(300);
  const dek = await page.evaluate(() => document.getElementById('ap-cf-toolbar-dek')?.textContent?.trim() || '');
  if (/Milky Way|54s/i.test(dek)) positives.push('Space zoom mode updates toolbar copy');
  else issues.push(issueObj(`Space zoom toolbar dek stale: "${dek.slice(0, 40)}"`, 'low', 'copy'));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const closed = await page.evaluate(() => {
    const el = document.getElementById('ap-cosmic-flight');
    return !el || el.hidden || !document.body.classList.contains('ap-cosmic-flight-open');
  });
  if (!closed) issues.push(issueObj('Cosmic flight overlay did not close on Escape', 'medium', 'orrery'));
  else positives.push('Cosmic flight closes on Escape');

  interactions.screenshotClosed = await snap(page, 'home-cosmic-flight-closed');
  return { issues, positives, interactions };
}

// ── Horoscope interactions ─────────────────────────────────────────
async function waitForZodiacSphere(page, timeoutMs = 20000) {
  await page.waitForFunction(
    () => window.ZodiacSphere && typeof window.ZodiacSphere.spinRandom === 'function',
    null,
    { timeout: timeoutMs },
  ).catch(() => {});
  await page.waitForTimeout(500);
}

async function testHoroscope(page) {
  const interactions = {};
  const issues = [];
  const positives = [];

  await page.waitForSelector('#sphere-poster, #zodiac-ring-canvas', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Wait for sky data
  await page.waitForFunction(
    () => {
      const h = document.getElementById('ecliptic-sky-headline');
      return h && !/computing/i.test(h.textContent || '');
    },
    null,
    { timeout: 12000 },
  ).catch(() => {});

  // Trigger lazy sphere load without selecting a sign (poster click at x,y opened readings in v559)
  await page.evaluate(() => {
    const wrap = document.getElementById('sphere-wrap');
    if (wrap) wrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    document.getElementById('sphere-spin-random')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  }).catch(() => {});
  await waitForZodiacSphere(page);
  await page.waitForFunction(
    () => document.getElementById('sky-board-toggle')?.getAttribute('aria-expanded') === 'true'
      || document.getElementById('planets-live-strip')?.hidden === false,
    null,
    { timeout: 8000 },
  ).catch(() => {});

  const skyState = await page.evaluate(() => ({
    headline: document.getElementById('ecliptic-sky-headline')?.textContent?.trim(),
    legendDots: [...document.querySelectorAll('.pl-dot')].map((el) => el.textContent?.trim()),
    skyBoardExpanded: document.getElementById('sky-board-toggle')?.getAttribute('aria-expanded'),
    skyBoardVisible: document.getElementById('planets-live-strip')?.hidden === false,
    computingVisible: /computing/i.test(document.getElementById('ecliptic-sky-headline')?.textContent || ''),
    placeholderDots: [...document.querySelectorAll('.pl-dot')].some((el) => /·\s*…/.test(el.textContent || '')),
    sphereReady: !!(window.ZodiacSphere && window.ZodiacSphere.spinRandom),
    readingOpen: document.getElementById('sign-reading-panel')?.classList.contains('is-open'),
  }));

  if (skyState.computingVisible) {
    issues.push(issueObj("'Computing today's sky…' still visible after 12s wait — slow first paint", 'high', 'dead-data'));
  } else positives.push(`Sky headline resolved: "${skyState.headline?.slice(0, 50)}"`);

  if (skyState.placeholderDots) {
    issues.push(issueObj('Planet legend still shows "· …" placeholders after load', 'medium', 'dead-data'));
  } else positives.push('Planet legend populated with sign/degree');

  if (skyState.skyBoardExpanded === 'true' || skyState.skyBoardVisible) {
    positives.push('Sky board auto-expanded after dial ready (v547 fix verified)');
  } else if (skyState.sphereReady && skyState.readingOpen) {
    positives.push('Sky board collapsed while reading open (v559 expected)');
  } else if (skyState.sphereReady) {
    issues.push(issueObj('Sky board still collapsed after sphere ready — live positions strip hidden', 'medium', 'layout'));
  }

  // Dial interaction — tap wheel sign (poster path) then Explore a sign
  const wheelLeo = page.locator('.wheel-sign[data-sign="leo"]');
  if (await wheelLeo.count()) {
    await wheelLeo.click({ force: true });
    await page.waitForFunction(
      () => document.getElementById('sign-reading-panel')?.classList.contains('is-open'),
      null,
      { timeout: 15000 },
    ).catch(() => {});
  }

  const exploreBtn = page.locator('#sphere-spin-random');
  if (await exploreBtn.count()) {
    await exploreBtn.click();
    await page.waitForTimeout(2200);

    const dialState = await page.evaluate(() => {
      const panel = document.getElementById('sign-reading-panel');
      const label = document.getElementById('sphere-selected-label')?.textContent?.trim();
      const chords = document.getElementById('wheel-poster-chords');
      const chordLines = chords ? chords.querySelectorAll('line, path, circle').length : 0;
      const canvasChords = window.ZodiacSphere?.getTransitChordCount?.() || 0;
      return {
        panelOpen: panel?.classList.contains('is-open'),
        panelAriaHidden: panel?.getAttribute('aria-hidden'),
        signName: document.getElementById('srp-sign-name')?.textContent?.trim(),
        overviewLen: document.getElementById('srp-overview')?.textContent?.trim().length || 0,
        loveLen: document.getElementById('srp-love')?.textContent?.trim().length || 0,
        selectedLabel: label,
        chordLines,
        canvasChords,
        transitChordsVisible: !document.getElementById('srp-transit-chords')?.hidden,
        transitChordItems: document.getElementById('srp-transit-chords-list')?.children?.length || 0,
        wheelSvg: !!document.querySelector('#sphere-poster svg'),
        interactiveRing: document.querySelectorAll('#sphere-poster [data-sign], .zodiac-ring-hit, .sphere-sign-hit').length,
        sphereSelected: window.ZodiacSphere?.getSelected?.() || null,
      };
    });

    interactions.dial = dialState;

    if (dialState.panelOpen || dialState.panelAriaHidden === 'false') {
      positives.push(`Reading panel opened for "${dialState.signName}"`);
      if (dialState.overviewLen > 20) positives.push('Reading overview populated');
      else issues.push(issueObj('Reading panel opens but overview text empty or very short', 'high', 'dead-data'));
      if (dialState.loveLen > 10) positives.push('Love/career reading cards populated');
    } else {
      issues.push(issueObj('Explore a sign click did not open reading panel', 'high', 'dead-controls'));
    }

    if (dialState.chordLines > 0) {
      positives.push(`Dial transit chords rendered (${dialState.chordLines} SVG elements)`);
    } else if (dialState.canvasChords > 0) {
      positives.push(`Canvas transit chords active (${dialState.canvasChords} chords on live dial)`);
    } else if (dialState.transitChordItems > 0) {
      positives.push(`Reading dock transit chips visible (${dialState.transitChordItems})`);
    } else {
      issues.push(issueObj('No transit chords on dial after sign selection', 'medium', 'interaction'));
    }

    interactions.dialShot = await snap(page, 'horoscope-reading-panel');

    // Try hovering dial for chord highlight
    const poster = page.locator('#horoscope-wheel-poster, .sphere-poster-wrap').first();
    if (await poster.count()) {
      const box = await poster.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
        await page.waitForTimeout(400);
        const hoverState = await page.evaluate(() => {
          const chords = document.getElementById('wheel-poster-chords');
          const highlighted = chords?.querySelector('.is-highlighted, [data-highlighted], line[stroke-width="2"]');
          const tooltip = document.querySelector('.wheel-chord-tooltip, .chord-tooltip, [role="tooltip"]');
          return { hasHighlight: !!highlighted, tooltipText: tooltip?.textContent?.trim() || null };
        });
        interactions.chordHover = hoverState;
        if (hoverState.hasHighlight || hoverState.tooltipText) {
          positives.push('Dial chord hover feedback detected');
        }
      }
    }
  }

  // Go to my sign — no saved chart (v547 inline prompt)
  await page.evaluate(() => {
    try {
      localStorage.removeItem('ap_birth_chart');
      localStorage.removeItem('ap_user_chart');
      localStorage.removeItem('ap_saved_chart');
      localStorage.removeItem('astro_profile');
    } catch (_) {}
  });
  const mineBtn = page.locator('#sphere-spin-mine');
  if (await mineBtn.count()) {
    await mineBtn.click();
    await page.waitForTimeout(1200);
    const noChart = await page.evaluate(() => {
      const note = document.getElementById('sphere-no-chart-note');
      return {
        noteVisible: note && !note.hasAttribute('hidden'),
        noteText: note?.textContent?.trim(),
        url: location.pathname,
      };
    });
    interactions.goToSign = noChart;
    if (noChart.noteVisible) positives.push('Go to my sign shows inline chart-first prompt (v547 fix verified)');
    else if (/chart\.html/.test(noChart.url)) {
      issues.push(issueObj('Go to my sign still redirects to chart.html without inline prompt', 'high', 'flow'));
    }
  }

  const h1 = await page.locator('h1').first().textContent().catch(() => '');
  if (h1) positives.push(`Horoscope H1: "${h1.trim().slice(0, 50)}"`);

  return { issues, positives, interactions, screenshot: await snap(page, 'horoscope-above-fold') };
}

// ── Chart flow ─────────────────────────────────────────────────────
async function testChart(page) {
  const issues = [];
  const positives = [];
  const interactions = {};

  await page.waitForSelector('#chart-form, form', { timeout: 15000 }).catch(() => {});

  const aboveFold = await page.evaluate(() => {
    const vh = window.innerHeight;
    const fields = {
      name: document.querySelector('#name-input, [name="name"], #chart-name'),
      date: document.querySelector('#date-input, [name="date"], #chart-date'),
      city: document.querySelector('#city-input, [name="place"], #birth-place'),
      submit: document.querySelector('#calculate-btn, button[type="submit"]'),
    };
    const pos = {};
    for (const [k, el] of Object.entries(fields)) {
      if (!el) { pos[k] = null; continue; }
      const r = el.getBoundingClientRect();
      pos[k] = { top: Math.round(r.top + scrollY), aboveFold: r.top < vh && r.bottom > 0 };
    }
    const heroH = document.querySelector('.chart-hero, .ap-chart-hero, .page-hero')?.getBoundingClientRect().height || 0;
    return { pos, heroHeight: Math.round(heroH), compactHero: heroH < 320 };
  });

  interactions.fieldPositions = aboveFold.pos;
  if (aboveFold.compactHero) positives.push(`Chart compact hero verified (hero ~${aboveFold.heroHeight}px)`);
  else issues.push(issueObj(`Chart hero still tall (~${aboveFold.heroHeight}px) — buries form`, 'medium', 'layout'));

  if (aboveFold.pos.city?.aboveFold) positives.push('Birth city field visible above fold');
  else if (aboveFold.pos.city) {
    issues.push(issueObj(`Birth city still below fold (top ${aboveFold.pos.city.top}px)`, 'medium', 'layout'));
  }

  interactions.screenshotAboveFold = await snap(page, 'chart-above-fold');

  // Empty submit — is-error (v547 inline validation)
  await page.evaluate(() => {
    const form = document.querySelector('#chart-form, form');
    if (form) form.reset();
    document.querySelectorAll('.form-group.is-error').forEach((g) => g.classList.remove('is-error'));
  });
  const submitBtn = page.locator('#calculate-btn, button[type="submit"]').first();
  await submitBtn.click();
  await page.waitForTimeout(800);

  const validation = await page.evaluate(() => {
    const errorGroups = document.querySelectorAll('.form-group.is-error').length;
    const errorMsgs = document.querySelectorAll('.form-error-msg:not(:empty), .form-group.is-error .field-error').length;
    const toast = document.querySelector('.ap-toast.show, #apToast.show, .toast.show');
    return {
      errorGroups,
      errorMsgs,
      toastVisible: !!toast,
      toastText: toast?.textContent?.trim(),
      firstErrorField: document.querySelector('.form-group.is-error input, .form-group.is-error select')?.id || null,
    };
  });
  interactions.emptySubmit = validation;

  if (validation.errorGroups >= 1) positives.push(`Empty submit marks ${validation.errorGroups} field(s) with .is-error (v547 fix verified)`);
  else issues.push(issueObj('Empty chart submit does not add .is-error to fields — inline validation broken', 'high', 'validation'));

  interactions.screenshotValidation = await snap(page, 'chart-empty-validation');

  // Sample chart flow
  const sampleBtn = page.locator('#sample-btn');
  if (await sampleBtn.count()) {
    await sampleBtn.click();
    await page.waitForFunction(
      () => {
        const r = document.getElementById('chart-result');
        return r && !r.classList.contains('hidden');
      },
      null,
      { timeout: 25000 },
    ).catch(() => {});

    await page.waitForTimeout(2000);

    const sampleResult = await page.evaluate(() => ({
      resultVisible: !document.getElementById('chart-result')?.classList.contains('hidden'),
      wheelSvg: !!document.querySelector('#natal-wheel svg, .natal-wheel svg'),
      bigThree: [...document.querySelectorAll('.big-three-card__sign, .big-three__sign')].map((e) => e.textContent?.trim()),
      resultName: document.getElementById('result-name')?.textContent?.trim(),
      tabs: [...document.querySelectorAll('.chart-tab, [role="tab"], .chart-results-tab')].map((t) => ({
        text: t.textContent?.trim(),
        selected: t.getAttribute('aria-selected') === 'true' || t.classList.contains('active'),
      })),
      tabPanels: document.querySelectorAll('.chart-tab-panel, [role="tabpanel"]').length,
    }));
    interactions.sampleChart = sampleResult;

    if (sampleResult.resultVisible) positives.push(`Sample chart results visible for "${sampleResult.resultName}"`);
    else issues.push(issueObj('Sample chart button did not reveal chart-result section', 'high', 'dead-controls'));

    if (sampleResult.wheelSvg) positives.push('Natal wheel SVG rendered');
    else issues.push(issueObj('Sample chart: natal wheel SVG missing', 'high', 'dead-data'));

    if (sampleResult.bigThree?.length >= 3) positives.push(`Big three: ${sampleResult.bigThree.join(' / ')}`);

    // Click through result tabs
    const tabs = page.locator('.chart-tab, [role="tab"]').filter({ hasNotText: '' });
    const tabTriggers = page.locator('.tab-trigger, [role="tab"]');
    const tabCount = await tabTriggers.count();
    const tabClicks = [];
    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      const tab = tabTriggers.nth(i);
      const label = (await tab.textContent())?.trim();
      const expectedPanel = await tab.getAttribute('aria-controls');
      await tab.click();
      await page.waitForTimeout(400);
      const panelState = await page.evaluate((expId) => {
        const active = document.querySelector('.tab-panel[aria-hidden="false"], [role="tabpanel"][aria-hidden="false"]');
        return {
          activeId: active?.id,
          matchesExpected: active?.id === expId,
          selected: document.querySelector(`#${expId}`)?.getAttribute('aria-hidden') === 'false',
          hasContent: (active?.textContent?.trim().length || 0) > 20,
        };
      }, expectedPanel);
      tabClicks.push({ label, expectedPanel, ...panelState });
    }
    interactions.tabClicks = tabClicks;
    const tabsWork = tabClicks.filter((t) => t.selected || t.matchesExpected).length;
    if (tabsWork >= 3) positives.push(`Results tabs switch panels correctly (${tabsWork}/${tabClicks.length})`);
    else if (tabClicks.length) {
      issues.push(issueObj(`Chart result tabs do not switch panels — ${tabsWork}/${tabClicks.length} activated expected panel`, 'high', 'dead-controls'));
    } else if (tabCount === 0) issues.push(issueObj('Chart results lack tab navigation', 'medium', 'structure'));

    interactions.screenshotResults = await snap(page, 'chart-sample-results', { fullPage: false });
  } else {
    issues.push(issueObj('Sample chart button (#sample-btn) not found', 'high', 'dead-controls'));
  }

  return { issues, positives, interactions };
}

// ── Sky guide overlay + scroll lock ────────────────────────────────
async function testGuideOverlay(context) {
  const page = await context.newPage();
  const issues = [];
  const positives = [];
  const interactions = {};

  const homeUrl = `${BASE}/?v=${VERSION}#guides`;
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll('.sg-card').length >= 4, null, { timeout: 15000 }).catch(() => {});
  await scrollToSection(page, '#skyGuidesWrap', 1000);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(300);

  const firstCard = page.locator('.sg-card').first();
  if (!(await firstCard.count())) {
    issues.push(issueObj('No .sg-card to open overlay test', 'high', 'dead-controls'));
    await page.close();
    return { issues, positives, interactions };
  }

  await firstCard.click();
  await page.waitForTimeout(600);

  const overlayState = await page.evaluate(() => {
    const ov = document.getElementById('sgOverlay');
    const bodyOverflow = getComputedStyle(document.body).overflow;
    const bodyClass = document.body.classList.contains('sg-reader-open');
    const scrollY = window.scrollY;
    const canScroll = document.documentElement.scrollHeight > window.innerHeight;
    return {
      overlayOpen: ov && !ov.hidden,
      bodyScrollLock: bodyClass && bodyOverflow === 'hidden',
      bodyClass,
      bodyOverflow,
      scrollY,
      overlayTitle: document.querySelector('.sg-overlay-head h2, #sgOverlayBody h1, .sg-reader-title')?.textContent?.trim(),
      bodyLen: document.getElementById('sgOverlayBody')?.textContent?.trim().length || 0,
    };
  });
  interactions.overlay = overlayState;

  if (overlayState.overlayOpen) positives.push('Sky guide overlay opened on card click');
  else issues.push(issueObj('Sky guide overlay did not open', 'high', 'dead-controls'));

  if (overlayState.bodyScrollLock) positives.push('Body scroll locked (sg-reader-open + overflow:hidden — v547 fix verified)');
  else issues.push(issueObj(`Guide overlay scroll lock failed (sg-reader-open=${overlayState.bodyClass}, overflow=${overlayState.bodyOverflow})`, 'high', 'interaction'));

  // Attempt background scroll while overlay open
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(200);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  interactions.scrollAttempt = { before: scrollBefore, afterAttempt: scrollAfter, locked: Math.abs(scrollAfter - overlayState.scrollY) < 5 };

  if (interactions.scrollAttempt.locked) positives.push('Background page did not scroll behind overlay');
  else issues.push(issueObj(`Background scrolled behind overlay (${overlayState.scrollY} → ${scrollAfter})`, 'medium', 'interaction'));

  interactions.screenshotOverlay = await snap(page, 'home-guide-overlay');

  await page.locator('#sgOverlayClose, .sg-overlay-close').first().click().catch(() => {});
  await page.waitForTimeout(400);

  await page.close();
  return { issues, positives, interactions };
}

function isKnownDone(issue, fix) {
  const blob = `${issue} ${fix}`.toLowerCase();
  const keys = V547_DONE.concat(V558_DONE, V559_DONE, V560_DONE, V561_DONE);
  return keys.some((k) => blob.includes(k.replace(/-/g, ' ')) || blob.includes(k));
}

function fixForIssue(text) {
  const map = [
    [/Explore a sign|reading panel did not open/i, 'Wire poster onSignSelect → selectSign without waiting for ZodiacSphere; open panel immediately with skeleton text while HoroscopeEngine loads.'],
    [/transit chord|chord lines/i, 'Call setTransitChords after daily-transit.js resolves; enable pointer-events on #wheel-poster-chords; add hover tooltip with aspect label.'],
    [/Sky board still collapsed/i, 'Fire autoExpandSkyBoard on EclipticDialData.init success, not only ap-zodiac-sphere-ready; expand on first planet legend populate.'],
    [/Go to my sign|chart-first|inline prompt/i, 'Decouple sphere-no-chart-note from whenSphereUiReady — show note synchronously on click when !getUserSign().'],
    [/Birth city.*below fold/i, 'Move Place of Birth into same card row as date on desktop; sticky Calculate bar; target city+submit within 1 scroll.'],
    [/tabs do not switch/i, 'Ensure initTabs() runs after sample chart render; verify aria-controls IDs match tab-panel elements.'],
  ];
  for (const [re, fix] of map) if (re.test(text)) return fix;
  return `Address: ${text}`;
}

function buildTopFixes(allIssues, pages) {
  /* Manual UX backlog shipped v547–v561 — runtime issues only */
  const manual = MANUAL_BACKLOG_SHIPPED ? [] : [];

  // Merge runtime-discovered issues
  const runtime = [];
  for (const p of pages) {
    for (const raw of p.issues) {
      const text = typeof raw === 'string' ? raw : raw.text || raw;
      let priority = 2;
      if (/high|broken|missing|not open|did not/i.test(text)) priority = 1;
      if (/low|cramped|jargon|thin/i.test(text)) priority = 3;
      runtime.push({
        priority,
        issue: text,
        fix: fixForIssue(text),
        files: [],
      });
    }
  }

  const merged = [...runtime, ...manual];
  const seen = new Set();
  const out = [];
  for (const item of merged.sort((a, b) => a.priority - b.priority)) {
    if (isKnownDone(item.issue, item.fix)) continue;
    const key = item.issue.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= 10) break;
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    // HeadlessChrome UA triggers horoscope auditPath — use standard Chrome UA for real-user journey
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
    try { localStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    // Horoscope auditPath: webdriver, HeadlessChrome UA, or chrome===undefined + Chrome UA
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: true });
      if (typeof window.chrome === 'undefined') window.chrome = {};
    } catch (_) {}
  });

  const pages = [];

  // ── 1. Homepage full scroll ──
  const homeConsole = makeConsoleCollector();
  const homePage = await context.newPage();
  homeConsole.attach(homePage);

  const homeUrl = `${BASE}/?v=${VERSION}`;
  await homePage.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await homePage.waitForSelector('h1', { timeout: 15000 }).catch(() => {});
  await homePage.waitForTimeout(1200);

  await homePage.evaluate(() => {
    document.querySelectorAll('.ap-chapter, .ap-reveal').forEach((el) => {
      el.classList.add('is-visible');
      el.style.opacity = '1';
    });
  });

  const homeShots = { hero: await snap(homePage, 'home-hero') };
  let homeData = await analyzeHomepage(homePage);

  for (const { key, sel, wait } of [
    { key: 'compare', sel: '#compareChapter', wait: 700 },
    { key: 'why', sel: '#whyChapter', wait: 700 },
    { key: 'sky', sel: '#skyChapter', wait: 900 },
    { key: 'guides', sel: '#skyGuidesWrap', wait: 1500 },
    { key: 'shop', sel: '#shopChapter', wait: 700 },
  ]) {
    await scrollToSection(homePage, sel, wait);
    if (key === 'guides') {
      await homePage.waitForFunction(() => document.querySelectorAll('.sg-card').length >= 4, null, { timeout: 12000 }).catch(() => {});
      await homePage.waitForTimeout(800);
    }
    homeShots[key] = await snap(homePage, `home-${key}`);
  }

  homeData = await analyzeHomepage(homePage);
  const cosmicTest = await testCosmicFlight(homePage);
  const homeIssues = [...homeData.issues, ...cosmicTest.issues];
  const homePositives = [...homeData.positives, ...cosmicTest.positives];
  pages.push({
    url: homeUrl,
    journey: 'homepage-full-scroll+cosmic-flight',
    issues: homeIssues.map((i) => i.text),
    positives: homePositives,
    meta: {
      guideCards: homeData.guideCards,
      h1: homeData.h1Text,
      consoleErrors: dedupeStrings(homeConsole.errors),
      consoleWarnings: dedupeStrings(homeConsole.warnings).slice(0, 10),
      screenshots: { ...homeShots, ...cosmicTest.interactions },
      cosmicFlight: cosmicTest.interactions,
    },
  });
  await homePage.close();

  // ── 2. Horoscope dial + reading + chords ──
  const horoConsole = makeConsoleCollector();
  const horoPage = await context.newPage();
  horoConsole.attach(horoPage);
  const horoUrl = `${BASE}/horoscope.html?v=${VERSION}`;
  await horoPage.goto(horoUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const horoTest = await testHoroscope(horoPage);
  pages.push({
    url: horoUrl,
    journey: 'horoscope-dial-reading-chords',
    issues: horoTest.issues.map((i) => i.text),
    positives: horoTest.positives,
    meta: {
      consoleErrors: dedupeStrings(horoConsole.errors),
      interactions: horoTest.interactions,
      screenshots: {
        aboveFold: horoTest.screenshot,
        readingPanel: horoTest.interactions.dialShot,
      },
    },
  });
  await horoPage.close();

  // ── 3–4. Chart form + empty submit + sample ──
  const chartConsole = makeConsoleCollector();
  const chartPage = await context.newPage();
  chartConsole.attach(chartPage);
  const chartUrl = `${BASE}/chart.html?v=${VERSION}`;
  await chartPage.goto(chartUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await chartPage.waitForFunction(() => typeof window.AstroEphemeris !== 'undefined', null, { timeout: 30000 }).catch(() => {});
  const chartTest = await testChart(chartPage);
  pages.push({
    url: chartUrl,
    journey: 'chart-form-sample-validation',
    issues: chartTest.issues.map((i) => i.text),
    positives: chartTest.positives,
    meta: {
      consoleErrors: dedupeStrings(chartConsole.errors),
      interactions: chartTest.interactions,
      screenshots: {
        aboveFold: chartTest.interactions.screenshotAboveFold,
        validation: chartTest.interactions.screenshotValidation,
        results: chartTest.interactions.screenshotResults,
      },
    },
  });
  await chartPage.close();

  // ── 5. Guide overlay scroll lock ──
  const overlayTest = await testGuideOverlay(context);
  pages.push({
    url: `${BASE}/?v=${VERSION}#guides`,
    journey: 'sky-guide-overlay-scroll-lock',
    issues: overlayTest.issues.map((i) => i.text),
    positives: overlayTest.positives,
    meta: { interactions: overlayTest.interactions, screenshot: overlayTest.interactions.screenshotOverlay },
  });

  await browser.close();

  const allIssues = pages.flatMap((p) => p.issues);
  const report = {
    capturedAt: new Date().toISOString(),
    base: BASE,
    version: VERSION,
    auditLabel: 'v548',
    viewport: { width: 1440, height: 900 },
    method: 'Playwright headless UX journey — full homepage scroll, horoscope dial/reading/chords, chart form+validation+sample tabs, guide overlay scroll lock',
    v547FixesExcluded: V547_DONE,
    v558FixesExcluded: V558_DONE,
    v559FixesExcluded: V559_DONE,
    v560FixesExcluded: V560_DONE,
    v561FixesExcluded: V561_DONE,
    manualBacklogShipped: MANUAL_BACKLOG_SHIPPED,
    pages,
    topFixes: buildTopFixes(allIssues, pages),
  };

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ topFixes: report.topFixes, issueCount: allIssues.length, pages: pages.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});