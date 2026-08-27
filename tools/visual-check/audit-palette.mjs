/**
 * Rendered Midnight Meridian palette contract.
 *
 * Source-token checks are useful but cannot see legacy rules that win in the
 * cascade. This audit opens every meaningful public route and inspects actual
 * visible UI colours, including gradients and shadows. Warm hues are allowed
 * only for explicitly physical celestial artwork or semantic warning/error
 * states; interactive controls never inherit that exception.
 */
import { chromium } from './node_modules/playwright/index.mjs';
import { existsSync } from 'node:fs';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const VERSION = process.env.AP_VERSION?.replace(/^ap-v/, '') || '902';
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const ROUTES = [
  '/',
  '/404.html',
  '/accuracy.html',
  '/angel-numbers.html',
  '/aries.html',
  '/taurus.html',
  '/gemini.html',
  '/cancer.html',
  '/leo.html',
  '/virgo.html',
  '/libra.html',
  '/scorpio.html',
  '/sagittarius.html',
  '/capricorn.html',
  '/aquarius.html',
  '/pisces.html',
  '/chart.html',
  '/chart-view.html',
  '/charts.html',
  '/catalogue.html',
  '/compatibility.html',
  '/contact.html',
  '/cosmic-calendar.html',
  '/cosmic-story.html',
  '/deep-reading.html',
  '/deep-time.html',
  '/eclipse.html',
  '/ephemeris.html',
  '/explore.html',
  '/guides.html',
  '/guides/eclipse-field-guide-2026.html',
  '/horoscope.html',
  '/index-classic.html',
  '/index-ephemeris.html',
  '/index-full.html',
  '/index-lite.html',
  '/journey.html',
  '/lifepath.html',
  '/links.html',
  '/moment.html',
  '/moonphase.html',
  '/mysky.html',
  '/name-numerology.html',
  '/natal-plate.html',
  '/numerology.html',
  '/observatory.html',
  '/offline.html',
  '/privacy.html',
  '/profile.html',
  '/quiz.html',
  '/refunds.html',
  '/retrograde.html',
  '/sample-reading.html',
  '/saturn-return.html',
  '/shop.html',
  '/sky-card.html',
  '/sky-events.html',
  '/solar-return.html',
  '/synastry.html',
  '/terms.html',
  '/this-weeks-sky.html',
  '/tonight.html',
  '/transits.html',
  '/verify.html',
  '/what-is-my-rising-sign.html',
  '/why.html',
];

const launch = {
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
};
if (existsSync(WINDOWS_CHROME)) launch.executablePath = WINDOWS_CHROME;

const browser = await chromium.launch(launch);
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
});
await context.addInitScript(() => {
  try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
  try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
});

const failures = [];
const pageErrors = [];

for (const route of ROUTES) {
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(`${route}: ${error.message || error}`));
  try {
    const separator = route.includes('?') ? '&' : '?';
    const response = await page.goto(`${BASE}${route}${separator}nosw=1&v=${VERSION}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    if (!response?.ok()) {
      failures.push({ route, selector: '<document>', property: 'http', colour: String(response?.status()) });
      await page.close();
      continue;
    }
    await page.evaluate(() => {
      document.querySelectorAll('.ap-reveal').forEach((element) => element.classList.add('ap-revealed'));
      document.documentElement.classList.add('ap-fonts-ready');
    });
    await page.waitForTimeout(500);

    const findings = await page.evaluate(() => {
      const UI_SELECTOR = [
        'a', 'button', 'input', 'select', 'textarea', 'summary',
        '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
        '.btn', '.button', '[class*="cta"]', '[class*="action"]',
      ].join(',');
      const PHYSICAL_SELECTOR = [
        '[data-palette-allow="physical"]',
        'canvas', 'svg', 'svg *',
        '[data-planet]', '[data-body]',
        '.planet', '[class*="planet-"]', '[class*="planet__"]',
        '.sun', '[class*="sun-"]', '[class*="sun__"]',
        '.mars', '[class*="mars-"]', '[class*="mars__"]',
        '.moon-art', '.celestial-seal', '.ap-seal', '.ap-orb', '.orb-art',
      ].join(',');
      const SEMANTIC_SELECTOR = [
        '[data-palette-allow="semantic"]', '[role="alert"]', '[aria-invalid="true"]',
        '.error', '[class*="error-"]', '[class*="error__"]',
        '.warning', '[class*="warning-"]', '[class*="warning__"]',
        '.danger', '[class*="danger-"]', '[class*="danger__"]',
      ].join(',');
      const PROPERTIES = [
        'color', 'backgroundColor', 'backgroundImage',
        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'outlineColor', 'textDecorationColor', 'boxShadow', 'textShadow', 'fill', 'stroke',
      ];

      function rgbToHsl(red, green, blue) {
        const r = red / 255;
        const g = green / 255;
        const b = blue / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        let hue = 0;
        if (delta) {
          if (max === r) hue = 60 * (((g - b) / delta) % 6);
          else if (max === g) hue = 60 * ((b - r) / delta + 2);
          else hue = 60 * ((r - g) / delta + 4);
        }
        if (hue < 0) hue += 360;
        const lightness = (max + min) / 2;
        const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
        return { hue, saturation, lightness };
      }

      function warmColours(value) {
        const colours = [];
        const pattern = /rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/gi;
        for (const match of String(value || '').matchAll(pattern)) {
          const red = Number(match[1]);
          const green = Number(match[2]);
          const blue = Number(match[3]);
          const alpha = match[4]?.endsWith('%') ? Number.parseFloat(match[4]) / 100 : Number(match[4] ?? 1);
          const hsl = rgbToHsl(red, green, blue);
          if (
            alpha >= 0.12 &&
            hsl.hue >= 10 && hsl.hue <= 58 &&
            hsl.saturation >= 0.28 &&
            hsl.lightness >= 0.12 && hsl.lightness <= 0.9
          ) {
            colours.push(`rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha.toFixed(2)})`);
          }
        }
        return [...new Set(colours)];
      }

      function isVisible(element, style) {
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }

      function selectorFor(element) {
        if (element.id) return `#${CSS.escape(element.id)}`;
        const classes = [...element.classList].slice(0, 3).map((name) => `.${CSS.escape(name)}`).join('');
        return `${element.tagName.toLowerCase()}${classes}`;
      }

      function propertyIsPainted(element, style, property) {
        const borderSide = property.match(/^border(Top|Right|Bottom|Left)Color$/)?.[1];
        if (borderSide) {
          return style[`border${borderSide}Style`] !== 'none' && Number.parseFloat(style[`border${borderSide}Width`]) > 0;
        }
        if (property === 'outlineColor') {
          return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
        }
        if (property === 'textDecorationColor') return style.textDecorationLine !== 'none';
        if (property === 'fill' || property === 'stroke') return element instanceof SVGElement;
        return true;
      }

      const issues = [];
      for (const element of document.querySelectorAll('body *')) {
        const style = getComputedStyle(element);
        if (!isVisible(element, style)) continue;
        const isInteractive = element.matches(UI_SELECTOR);
        const physical = element.matches(PHYSICAL_SELECTOR) || Boolean(element.closest(PHYSICAL_SELECTOR));
        const semantic = element.matches(SEMANTIC_SELECTOR) || Boolean(element.closest(SEMANTIC_SELECTOR));
        for (const property of PROPERTIES) {
          if (!propertyIsPainted(element, style, property)) continue;
          const colours = warmColours(style[property]);
          if (!colours.length) continue;
          // Physical and semantic colour are never an excuse for warm CTA/UI chrome.
          if (!isInteractive && (physical || semantic)) continue;
          for (const colour of colours) {
            issues.push({ selector: selectorFor(element), property, colour });
          }
        }
      }
      return [...new Map(issues.map((issue) => [JSON.stringify(issue), issue])).values()].slice(0, 80);
    });
    failures.push(...findings.map((finding) => ({ route, ...finding })));
  } catch (error) {
    failures.push({ route, selector: '<document>', property: 'runtime', colour: String(error.message || error) });
  }
  await page.close();
}

await browser.close();

if (failures.length || pageErrors.length) {
  console.error(`Rendered palette audit failed: ${failures.length} warm UI finding(s), ${pageErrors.length} page error(s).`);
  for (const issue of failures) {
    console.error(` - ${issue.route} ${issue.selector} ${issue.property}: ${issue.colour}`);
  }
  for (const error of pageErrors.slice(0, 30)) console.error(` - runtime ${error}`);
  process.exit(1);
}

console.log(`Rendered Midnight Meridian palette OK (${ROUTES.length} public routes, v${VERSION}).`);
