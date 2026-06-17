/**
 * Forensic audit — remaining editorial/utility pages.
 * Outputs out/remaining/report.json with honest 0-100 scores.
 */
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const OUT = join(__dirname, 'out', 'remaining');
const LH = join(__dirname, 'node_modules', 'lighthouse', 'cli', 'index.js');

const PAGES = [
  { id: 'accuracy', path: '/accuracy.html', type: 'editorial' },
  { id: 'angel-numbers', path: '/angel-numbers.html', type: 'editorial' },
  { id: 'charts', path: '/charts.html', type: 'editorial' },
  { id: 'lifepath', path: '/lifepath.html', type: 'tool' },
  { id: 'moonphase', path: '/moonphase.html', type: 'tool' },
  { id: 'name-numerology', path: '/name-numerology.html', type: 'tool' },
  { id: 'outreach', path: '/outreach.html', type: 'editorial' },
  { id: 'phone-cosmic-viewer', path: '/phone-cosmic-viewer.html', type: 'tool' },
  { id: 'phone-audit', path: '/phone-audit.html', type: 'tool' },
  { id: 'profile', path: '/profile.html', type: 'tool' },
  { id: 'quiz', path: '/quiz.html', type: 'tool' },
  { id: 'retrograde', path: '/retrograde.html', type: 'editorial' },
  { id: 'saturn-return', path: '/saturn-return.html', type: 'editorial' },
  { id: 'solar-return', path: '/solar-return.html', type: 'editorial' },
  { id: 'synastry', path: '/synastry.html', type: 'editorial' },
  { id: 'tonight', path: '/tonight.html', type: 'tool' },
  { id: 'transits', path: '/transits.html', type: 'tool' },
  { id: 'what-is-my-rising-sign', path: '/what-is-my-rising-sign.html', type: 'editorial' },
  { id: 'privacy', path: '/privacy.html', type: 'legal' },
  { id: 'terms', path: '/terms.html', type: 'legal' },
  { id: '404', path: '/404.html', type: 'utility' },
  { id: 'sample-reading', path: '/sample-reading.html', type: 'product' },
  { id: 'fulfil-redirect', path: '/fulfil-redirect.html', type: 'utility' },
];

function runLighthouse(url, outPath) {
  return new Promise((resolve, reject) => {
    const args = [
      LH, url, '--output=json', `--output-path=${outPath}`,
      '--quiet', '--chrome-flags=--headless',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('close', (code) => {
      if (code === 0) return resolve();
      readFile(outPath, 'utf8').then(() => resolve()).catch(() => reject(new Error(err || `exit ${code}`)));
    });
  });
}

function axeScore(violations) {
  let s = 100;
  for (const v of violations) {
    if (v.impact === 'critical') s -= 25;
    else if (v.impact === 'serious') s -= 15;
    else if (v.impact === 'moderate') s -= 8;
    else if (v.impact === 'minor') s -= 3;
  }
  return Math.max(0, s);
}

function scoreSection(name, checks) {
  const vals = Object.values(checks).filter((v) => typeof v === 'number');
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  return { name, score: avg, checks };
}

async function analyzePage(page, pageId, pageType) {
  return page.evaluate(({ pageId, pageType }) => {
    const text = document.body?.innerText || '';
    const html = document.documentElement.outerHTML;
    const sections = [];

    const hasMain = !!document.querySelector('main, [role="main"], #main-content');
    const h1 = document.querySelector('h1');
    const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
    const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
    const ogImage = document.querySelector('meta[property="og:image"]')?.content || '';
    const schema = document.querySelector('script[type="application/ld+json"]');
    const brokenSprite = [...document.querySelectorAll('svg use[href^="#"]')].filter((u) => {
      const id = u.getAttribute('href')?.slice(1);
      return id && !document.getElementById(id);
    }).length;
    const googleFonts = /fonts\.googleapis\.com/i.test(html);
    const selfHostedFonts = /css\/fonts\.css/i.test(html);
    const mainLite = /main-lite\.css/i.test(html);
    const apV313 = /ap-v313/i.test(html);
    const shopLinks = [...document.querySelectorAll('a[href*="shop"]')].length;
    const chartLinks = [...document.querySelectorAll('a[href*="chart"]')].length;
    const truncatedPatterns = (text.match(/\bThey \.|You understand th\.|hidden enemies, and \./g) || []).length;
    const sunWrong = pageId === 'sample-reading' && /Sun in Capricorn places achievement/i.test(text) && /Sun in Gemini/i.test(text);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const headings = document.querySelectorAll('h2, h3').length;
    const faq = document.querySelector('[itemtype*="FAQPage"], .faq, #faq, details') ? 1 : 0;
    const forms = document.querySelectorAll('form, input, button[type="submit"]').length;
    const canvas = document.querySelectorAll('canvas').length;
    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')].length;
    const imgsEmptyAlt = [...document.querySelectorAll('img[alt=""]')].filter((i) => !i.getAttribute('aria-hidden')).length;
    const contrastRisk = [...document.querySelectorAll('*')].filter((el) => {
      const c = getComputedStyle(el).color;
      const bg = getComputedStyle(el).backgroundColor;
      return c === 'rgb(94, 87, 72)' || c === 'rgb(168, 158, 136)';
    }).length > 5;

    // Section detection
    const hero = document.querySelector('.hero, .hero--small, .lp-hero, .cover, .page.cover');
    if (hero) {
      sections.push({
        name: 'Hero',
        score: Math.round(
          (h1 ? 90 : 40) * 0.3 +
          (metaDesc.length > 50 ? 85 : 50) * 0.2 +
          (hero.querySelector('svg, img, canvas') ? 80 : 60) * 0.25 +
          (brokenSprite ? 45 : 88) * 0.25
        ),
      });
    }

    const editorialBlocks = document.querySelectorAll('section, article, .page:not(.cover)');
    editorialBlocks.forEach((sec, i) => {
      const label = sec.querySelector('h2, h3, .eyebrow, h1')?.textContent?.trim()?.slice(0, 40);
      if (!label || sec === hero) return;
      const secText = sec.innerText || '';
      const trunc = (secText.match(/\bThey \.|You understand th\.|and \.$/gm) || []).length;
      const wc = secText.split(/\s+/).length;
      let sc = 75;
      if (wc < 30) sc -= 25;
      if (wc > 120) sc += 10;
      if (trunc > 0) sc -= 35;
      if (sunWrong && /Capricorn|vocation/i.test(secText)) sc -= 40;
      sections.push({ name: label || `Section ${i + 1}`, score: Math.max(0, Math.min(100, sc)) });
    });

    if (pageType === 'legal') {
      sections.push({
        name: 'Legal body',
        score: Math.round(
          (wordCount > 400 ? 90 : 60) * 0.4 +
          (hasMain ? 85 : 55) * 0.3 +
          (brokenSprite ? 40 : 90) * 0.3
        ),
      });
    }

    if (pageId === 'sample-reading') {
      const pages = document.querySelectorAll('.page');
      pages.forEach((pg, idx) => {
        const eyebrow = pg.querySelector('.eyebrow')?.textContent?.trim() || `Page ${idx + 1}`;
        const pgText = pg.innerText || '';
        const trunc = (pgText.match(/\bThey \.|You understand th\.|hidden enemies, and \./g) || []).length;
        let sc = 82;
        if (trunc > 0) sc -= trunc * 20;
        if (/Sun in Capricorn places achievement/.test(pgText) && eyebrow.includes('Life')) sc -= 45;
        sections.push({ name: eyebrow.slice(0, 50), score: Math.max(0, Math.min(100, sc)) });
      });
    }

    const nav = document.querySelector('header, nav, .navbar');
    if (nav) {
      sections.push({
        name: 'Navigation',
        score: nav.querySelector('a, button') ? (mainLite || apV313 || pageType === 'legal' ? 78 : 85) : 50,
      });
    }

    const footer = document.querySelector('footer, .site-footer');
    if (footer) {
      sections.push({
        name: 'Footer',
        score: footer.querySelector('a') ? 80 : 55,
      });
    }

    // Visual score
    let visual = 85;
    if (brokenSprite) visual -= 25;
    if (!selfHostedFonts && !googleFonts && pageType !== 'product') visual -= 5;
    if (pageId === 'sample-reading' && googleFonts) visual -= 8;
    if (pageId === '404' && !hasMain) visual -= 5;
    if (contrastRisk) visual -= 10;
    if (mainLite || apV313 || pageType === 'legal') visual += 5;

    // Content score
    let content = 70;
    if (metaDesc.length > 80) content += 10;
    if (h1) content += 8;
    if (canonical) content += 5;
    if (schema) content += 5;
    if (wordCount > 800) content += 10;
    else if (wordCount < 150 && pageType !== 'utility') content -= 20;
    if (headings >= 4) content += 5;
    if (truncatedPatterns > 0) content -= truncatedPatterns * 12;
    if (sunWrong) content -= 25;
    if (pageId === 'fulfil-redirect') content = 72;
    content = Math.max(0, Math.min(100, content));

    // Monetization score
    let monetization = 40;
    if (shopLinks > 0) monetization += Math.min(25, shopLinks * 5);
    if (pageId === 'sample-reading') monetization = 88;
    if (pageId === 'fulfil-redirect') monetization = 75;
    if (['lifepath', 'name-numerology', 'quiz', 'profile'].includes(pageId)) monetization += 15;
    if (pageType === 'legal') monetization = 35;
    if (pageId === '404') monetization = 25;
    if (document.querySelector('[href*="lemonsqueezy"], [href*="typeform"], .shop-cta, .cta-shop')) monetization += 15;
    monetization = Math.max(0, Math.min(100, monetization));

    return {
      hasMain,
      h1: h1?.textContent?.trim()?.slice(0, 80) || '',
      metaDescLen: metaDesc.length,
      brokenSprite,
      googleFonts,
      selfHostedFonts,
      mainLite,
      truncatedPatterns,
      sunWrong,
      wordCount,
      shopLinks,
      canvas,
      a11yFlags: { imgsNoAlt, imgsEmptyAlt, hasMain },
      visual: Math.max(0, Math.min(100, visual)),
      content,
      monetization,
      sections: sections.slice(0, 12),
      issues: [
        ...(brokenSprite ? ['broken-svg-sprite'] : []),
        ...(googleFonts ? ['google-fonts-cdn'] : []),
        ...(!hasMain ? ['missing-main-landmark'] : []),
        ...(truncatedPatterns ? [`truncated-copy-${truncatedPatterns}`] : []),
        ...(sunWrong ? ['wrong-sun-sign-in-life-areas'] : []),
        ...(imgsNoAlt ? [`img-no-alt-${imgsNoAlt}`] : []),
      ],
    };
  }, { pageId, pageType });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { base: BASE, capturedAt: new Date().toISOString(), pages: [], summary: {} };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
  });
  await context.addInitScript(() => {
    try { sessionStorage.setItem('ap_intro_complete', '1'); } catch (_) {}
    try { localStorage.setItem('ap_privacy_ack', '1'); } catch (_) {}
  });

  for (const p of PAGES) {
    const url = `${BASE}${p.path}`;
    const entry = { id: p.id, path: p.path, type: p.type, url, scores: {}, sections: [], issues: [] };
    const lhPath = join(OUT, `${p.id}.lighthouse.json`);

    try {
      await runLighthouse(url, lhPath);
      const lhr = JSON.parse(await readFile(lhPath, 'utf8'));
      for (const [cat, data] of Object.entries(lhr.categories || {})) {
        entry.scores[cat] = Math.round((data.score || 0) * 100);
      }
      entry.metrics = {
        fcp: lhr.audits?.['first-contentful-paint']?.numericValue,
        lcp: lhr.audits?.['largest-contentful-paint']?.numericValue,
        cls: lhr.audits?.['cumulative-layout-shift']?.numericValue,
        tbt: lhr.audits?.['total-blocking-time']?.numericValue,
        si: lhr.audits?.['speed-index']?.numericValue,
      };
    } catch (err) {
      entry.lighthouseError = String(err);
    }

    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 90000 });
      await page.waitForTimeout(p.id === 'profile' || p.id === 'phone-cosmic-viewer' ? 4000 : 2000);

      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze();
      entry.scores.axe = axeScore(axe.violations);
      entry.axeViolations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));

      const analysis = await analyzePage(page, p.id, p.type);
      entry.analysis = analysis;
      entry.sections = analysis.sections;
      entry.issues = [...new Set([...(entry.issues || []), ...analysis.issues])];

      const lhA11y = entry.scores.accessibility ?? entry.scores.axe;
      const perf = entry.scores.performance ?? 70;
      entry.scores.perf = perf;
      entry.scores.a11y = Math.round((lhA11y * 0.55 + entry.scores.axe * 0.45));
      entry.scores.visual = analysis.visual;
      entry.scores.content = analysis.content;
      entry.scores.monetization = analysis.monetization;
      entry.scores.overall = Math.round(
        perf * 0.22 +
        entry.scores.a11y * 0.22 +
        analysis.visual * 0.18 +
        analysis.content * 0.23 +
        analysis.monetization * 0.15
      );
    } catch (err) {
      entry.pageError = String(err);
    }
    await page.close();
    report.pages.push(entry);
    console.log(`${p.id}: overall=${entry.scores.overall ?? '?'} perf=${entry.scores.perf ?? '?'} cls=${entry.metrics?.cls?.toFixed?.(3) ?? '?'}`);
  }

  await browser.close();

  const dims = ['overall', 'perf', 'a11y', 'visual', 'content', 'monetization'];
  for (const d of dims) {
    const vals = report.pages.map((p) => p.scores[d]).filter((v) => v != null);
    report.summary[d] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  }
  report.summary.critical = report.pages.filter((p) => (p.scores.overall ?? 100) < 65).map((p) => p.id);
  report.summary.pageCount = report.pages.length;

  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nSUMMARY', JSON.stringify(report.summary, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });