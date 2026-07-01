/**
 * Expert homepage audit — dimensional scoring for AstroPrecise award homepage.
 * Output: out/expert-audit-v521.json
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "out");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.AP_PREVIEW || "http://localhost:8790";
const VERSION = process.env.AP_VERSION || "ap-v533";

const WEIGHTS = {
  visualClarity: 15,
  a11y: 15,
  structure: 12,
  navUx: 10,
  contentHierarchy: 12,
  guides: 10,
  mobile: 12,
  performance: 8,
  trustCredibility: 6,
};

function scoreDim(key, checks) {
  const rules = {
    visualClarity: () => {
      let s = 85;
      if (checks.backdrop === 0) s += 3;
      if (checks.contrast.every((c) => parseFloat(c.opacity) >= 0.9)) s += 2;
      if (checks.heroH1Opacity === "1") s += 2;
      if (checks.deptEyebrowCount === 0) s += 3;
      if (checks.deptListDekClear) s += 2;
      if (checks.liveDateline) s += 2;
      if (checks.editionDescClear) s += 1;
      return Math.min(100, s);
    },
    a11y: () => {
      let s = checks.axe.violations === 0 ? 86 : Math.max(50, 86 - checks.axe.violations * 8);
      if (checks.skipLink) s += 3;
      if (checks.mainLandmark) s += 3;
      if (checks.ariaLiveCount >= 2) s += 3;
      if (checks.sgOverlayDialog) s += 3;
      if (checks.focusVisibleHooks >= 4) s += 2;
      return Math.min(100, s);
    },
    structure: () => {
      let s = 78;
      if (checks.chapters.count >= 10) s += 7;
      else if (checks.chapters.count >= 8) s += 4;
      if (checks.plateInSkyChapter) s += 3;
      if (checks.chapterIds.includes("methodChapter")) s += 2;
      if (checks.chapterIds.includes("readingChapter")) s += 2;
      if (checks.chapterIds.includes("qaChapter")) s += 2;
      if (checks.chapterIds.includes("shopChapter")) s += 2;
      if (checks.chapters.count >= 11) s += 2;
      if (checks.trustIsSection) s += 2;
      return Math.min(100, s);
    },
    navUx: () => {
      let s = 78;
      if (checks.floatNav.hiddenOnHero) s += 2;
      if (checks.floatNav.scrollSpy) s += 8;
      if (checks.floatNav.activeLink) s += 4;
      if (!checks.floatNav.badgeOverlap) s += 4;
      if (checks.floatNav.linkCount >= 9) s += 4;
      return Math.min(100, s);
    },
    contentHierarchy: () => {
      let s = 72;
      const unified = checks.chapterHeadCount;
      if (unified >= 10) s += 16;
      else if (unified >= 9) s += 14;
      else if (unified >= 7) s += 8;
      if (checks.deptHeadingCount === 0) s += 6;
      if (checks.inkFadedBodyInMain === 0) s += 4;
      if (checks.trustChapterHead) s += 2;
      return Math.min(100, s);
    },
    guides: () => {
      let s = 80;
      if (checks.guideCards >= 10) s += 6;
      if (checks.guideCards >= 8) s += 2;
      if (checks.sgFeaturedBadge) s += 4;
      if (checks.sgFilterContrast) s += 2;
      if (checks.sgStickyFilter) s += 2;
      if (checks.sgOverlayDialog) s += 2;
      if (checks.sgRelatedStrip) s += 2;
      return Math.min(100, s);
    },
    mobile: () => {
      let s = 76;
      if (!checks.mobile.heroOverflow) s += 4;
      if (checks.mobile.heroIllustrationVisible) s += 6;
      if (checks.mobile.deptBadgeWrap) s += 2;
      if (checks.mobile.floatNavVisible) s += 6;
      if (checks.mobile.navActiveIndicator) s += 2;
      if (checks.mobile.orreryWrapVisible) s += 2;
      if (checks.mobile.sgFilterReady) s += 2;
      return Math.min(100, s);
    },
    performance: () => {
      let s = 80;
      if (checks.perf.load < 400) s += 4;
      if (checks.perf.load < 200) s += 2;
      if (checks.consoleErrors.length === 0) s += 2;
      if (checks.lazySkyGuides) s += 2;
      if (checks.prefetchGuides) s += 2;
      if (checks.deferredEphemeris) s += 2;
      if (checks.headPrefetchGuides) s += 2;
      if (checks.deferredZodiac) s += 2;
      if (checks.perf.load < 100) s += 2;
      return Math.min(100, s);
    },
    trustCredibility: () => {
      let s = 78;
      if (checks.trustStrip) s += 2;
      if (checks.qaChapter) s += 4;
      if (checks.methodTrust) s += 4;
      if (checks.shopTrust) s += 4;
      if (checks.chapterIds.includes("trustChapter")) s += 2;
      if (checks.floatNav.trustLink) s += 2;
      if (checks.liveDateline) s += 2;
      if (checks.trustItemsCount >= 3) s += 2;
      return Math.min(100, s);
    },
  };
  return rules[key]();
}

function totalScore(scores) {
  let sum = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) {
    sum += (scores[k] / 100) * w;
  }
  return Math.round(sum);
}

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/index.html?v=529`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.setItem("ap_intro_complete", "1");
  document.querySelectorAll(".ap-reveal").forEach((el) => {
    el.classList.add("is-visible");
    el.style.opacity = "1";
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);

const checks = await page.evaluate(() => {
  const chapters = [...document.querySelectorAll(".ap-flow .ap-chapter, .ap-flow > .ap-chapter")];
  const allChapters = [...document.querySelectorAll("main .ap-chapter, main.ap-flow .ap-chapter, .ap-flow .ap-chapter")];
  const chapterEls = [...document.querySelectorAll(".ap-chapter[id]")];
  const plateInSky = !!document.querySelector("#skyChapter .sky-tonight-plate, #skyChapter .plate");
  const skyChapter = document.getElementById("skyChapter");
  const plateInSkyChapter = skyChapter && skyChapter.querySelector(".plate, .sky-tonight-plate");

  const sel = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { color: cs.color, opacity: cs.opacity, fontSize: cs.fontSize };
  };

  const hero = document.querySelector("h1.display");
  const heroCs = hero ? getComputedStyle(hero) : null;

  const floatNav = document.getElementById("apFloatNav");
  const heroChapter = document.getElementById("heroChapter");
  const heroRect = heroChapter?.getBoundingClientRect();
  const navHidden = floatNav ? getComputedStyle(floatNav).display === "none" || floatNav.hidden : true;

  const padEnd = document.querySelector(".ap-award-511--nav-visible .page-wrap, body.ap-award-511--nav-visible .page-wrap");
  const pageWrap = document.querySelector(".page-wrap");
  const paddingEnd = pageWrap ? parseFloat(getComputedStyle(pageWrap).paddingInlineEnd) : 0;

  const inkFaded = [...document.querySelectorAll("main p")].filter((p) => {
    const c = getComputedStyle(p).color;
    return p.closest(".ap-chapter") && (p.style.color?.includes("ink-faded") || c.includes("faded"));
  });

  return {
    chapters: {
      count: chapterEls.length,
      ids: chapterEls.map((c) => c.id || "anon"),
      h1: document.querySelectorAll("h1").length,
      h2: document.querySelectorAll("h2").length,
    },
    chapterIds: chapterEls.map((c) => c.id).filter(Boolean),
    chapterHeadCount: document.querySelectorAll(".ap-chapter-head").length,
    deptHeadingCount: document.querySelectorAll(".dept-heading").length,
    deptEyebrowCount: document.querySelectorAll(".dept-eyebrow").length,
    plateInSkyChapter: !!plateInSkyChapter,
    floatNav: {
      hiddenOnHero: navHidden,
      linkCount: floatNav ? floatNav.querySelectorAll("a").length : 0,
      scrollSpy: !!floatNav?.querySelector(".is-active"),
      activeLink: floatNav?.querySelector(".is-active")?.textContent?.trim() || null,
      badgeOverlap: paddingEnd < 80 && !document.body.classList.contains("ap-award-511--nav-visible"),
      trustLink: !!floatNav?.querySelector('[data-ap-jump="trustChapter"]'),
    },
    deferredEphemeris: [...document.querySelectorAll('script[src*="ephemeris.js"]')].every((s) => s.defer),
    deferredZodiac: [...document.querySelectorAll('script[src*="ap-zodiac-constants"]')].every((s) => s.defer),
    trustIsSection: document.getElementById("trustChapter")?.tagName === "SECTION",
    liveDateline: (() => {
      const sun = document.getElementById("dateline-sun");
      return !!(sun && /^Sun in [A-Za-z]+/.test((sun.textContent || "").trim()));
    })(),
    editionDescClear: (() => {
      const el = document.querySelector(".edition-desc");
      if (!el) return false;
      return parseFloat(getComputedStyle(el).opacity) >= 0.94;
    })(),
    trustItemsCount: document.querySelectorAll(".trust-item").length,
    headPrefetchGuides: !!document.querySelector('head link[rel="prefetch"][href*="sky_guides"]'),
    deptListDekClear: (() => {
      const dek = document.querySelector(".dept-list-dek");
      if (!dek) return false;
      return parseFloat(getComputedStyle(dek).opacity) >= 0.9;
    })(),
    skipLink: !!document.querySelector('a.skip-link[href="#main-content"]'),
    mainLandmark: !!document.getElementById("main-content"),
    ariaLiveCount: document.querySelectorAll("[aria-live]").length,
    sgOverlayDialog: !!document.querySelector('#sgOverlay[role="dialog"]'),
    trustChapterHead: !!document.querySelector("#trustChapter .ap-chapter-head"),
    focusVisibleHooks: document.querySelectorAll(
      ".skip-link, .lite-vp-btn, .sg-card, .ap-float-nav__link, .sg-overlay-close"
    ).length,
    sgRelatedStrip: !!document.querySelector(".sg-related-strip"),
    backdrop: [...document.querySelectorAll("*")].filter((el) => getComputedStyle(el).backdropFilter !== "none").length,
    guideCards: document.querySelectorAll(".sg-card").length,
    trustStrip: !!document.querySelector(".ap-chapter--trust"),
    qaChapter: !!document.getElementById("qaChapter"),
    methodTrust: !!document.querySelector(".ap-mini-trust"),
    shopTrust: !!document.querySelector(".ap-shop-trust"),
    sgFeaturedBadge: !!document.querySelector(".sg-featured-badge"),
    sgFilterContrast: (() => {
      const chip = document.querySelector(".sg-filter-chip");
      if (!chip) return false;
      const cs = getComputedStyle(chip);
      return parseFloat(cs.opacity) >= 0.9;
    })(),
    lazySkyGuides: ![...document.querySelectorAll("script[src*='sky-guides']")].length,
    prefetchGuides: !!document.querySelector('link[rel="prefetch"][href*="sky_guides"]'),
    sgStickyFilter: (() => {
      const slot = document.querySelector(".sg-filter-slot");
      return slot ? getComputedStyle(slot).position === "sticky" : false;
    })(),
    inkFadedBodyInMain: [...document.querySelectorAll("main p[style*='ink-faded']")].length,
    contrast: [
      sel("h1.display"),
      sel(".standfirst"),
      sel(".sg-card-dek"),
      sel(".ap-chapter-lead"),
      sel(".method-step p"),
      sel(".qa-a"),
      sel(".edition-desc"),
    ].filter(Boolean),
    heroH1Opacity: heroCs?.opacity || "0",
    consoleErrors: [],
    perf: performance.timing ? {
      dcl: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      load: performance.timing.loadEventEnd - performance.timing.navigationStart,
      resources: performance.getEntriesByType("resource").length,
    } : { dcl: 0, load: 0, resources: 0 },
    mobile: { heroOverflow: false, heroIllustrationVisible: false, deptBadgeWrap: null },
  };
});

// Scroll to instruments to trigger nav + scroll-spy + rail padding
await page.evaluate(() => {
  document.getElementById("instrumentsChapter")?.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(500);

const railCheck = await page.evaluate(() => {
  const pageWrap = document.querySelector(".page-wrap");
  const paddingEnd = pageWrap ? parseFloat(getComputedStyle(pageWrap).paddingInlineEnd) : 0;
  return {
    paddingEnd,
    navVisible: document.body.classList.contains("ap-award-511--nav-visible"),
    badgeOverlap: paddingEnd < 80 && !document.body.classList.contains("ap-award-511--nav-visible"),
  };
});
checks.floatNav.badgeOverlap = railCheck.badgeOverlap;
checks.floatNav.paddingEnd = railCheck.paddingEnd;
checks.floatNav.navVisible = railCheck.navVisible;

// Scroll to guides — lazy-load sky-guides.js and wait for cards
await page.evaluate(() => {
  document.getElementById("skyGuidesWrap")?.scrollIntoView({ block: "start" });
});
await page.waitForFunction(() => document.querySelectorAll(".sg-card").length >= 8, null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(600);
checks.guideCards = await page.evaluate(() => document.querySelectorAll(".sg-card").length);
checks.sgFeaturedBadge = await page.evaluate(() => !!document.querySelector(".sg-featured-badge"));
checks.sgFilterContrast = await page.evaluate(() => {
  const chip = document.querySelector(".sg-filter-chip");
  if (!chip) return false;
  return parseFloat(getComputedStyle(chip).opacity) >= 0.9;
});
checks.sgStickyFilter = await page.evaluate(() => {
  const slot = document.querySelector(".sg-filter-slot");
  return slot ? getComputedStyle(slot).position === "sticky" : false;
});
checks.prefetchGuides = await page.evaluate(() =>
  !!document.querySelector('link[rel="prefetch"][href*="sky_guides"]')
);

// Open a guide reader to verify overlay + related strip markup
await page.evaluate(() => {
  const card = document.querySelector(".sg-card[data-sg-open]");
  if (card) card.click();
});
await page.waitForTimeout(400);
checks.sgOverlayDialog = await page.evaluate(() =>
  !!document.querySelector('#sgOverlay[role="dialog"]') && !document.getElementById("sgOverlay")?.hidden
);
checks.sgRelatedStrip = await page.evaluate(() => !!document.querySelector(".sg-related-strip"));
await page.evaluate(() => document.getElementById("sgOverlayClose")?.click());
await page.waitForTimeout(200);

const scrollSpy = await page.evaluate(() => {
  const floatNav = document.getElementById("apFloatNav");
  const active = floatNav?.querySelector(".is-active");
  return {
    scrollSpy: !!active,
    activeLink: active?.textContent?.trim() || null,
    ariaCurrent: active?.getAttribute("aria-current") || null,
  };
});
checks.floatNav.scrollSpy = scrollSpy.scrollSpy;
checks.floatNav.activeLink = scrollSpy.activeLink;
checks.floatNav.ariaCurrent = scrollSpy.ariaCurrent;
checks.consoleErrors = errors;

const axe = await new AxeBuilder({ page }).analyze();
checks.axe = { violations: axe.violations.length, ids: axe.violations.map((v) => v.id) };

// Mobile viewport
const mobile = await context.newPage();
mobile.on("pageerror", (e) => errors.push(String(e)));
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/index.html?v=529`, { waitUntil: "networkidle" });
await mobile.evaluate(() => localStorage.setItem("ap_intro_complete", "1"));
await mobile.reload({ waitUntil: "networkidle" });
await mobile.waitForTimeout(500);

await mobile.evaluate(() => {
  document.getElementById("heroChapter")?.scrollIntoView({ block: "start" });
});
await mobile.waitForTimeout(600);

await mobile.evaluate(() => {
  document.getElementById("skyGuidesWrap")?.scrollIntoView({ block: "start" });
});
await mobile.waitForFunction(() => document.querySelectorAll(".sg-filter-chip").length >= 3, null, { timeout: 12000 }).catch(() => {});
await mobile.waitForTimeout(300);

checks.mobile = await mobile.evaluate(() => {
  const heroIll = document.querySelector(".hero-illustration");
  const illCs = heroIll ? getComputedStyle(heroIll) : null;
  const badge = document.querySelector(".dept-badge");
  const badgeCs = badge ? getComputedStyle(badge) : null;
  const floatNav = document.getElementById("apFloatNav");
  const navCs = floatNav ? getComputedStyle(floatNav) : null;
  return {
    heroOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    floatNav: navCs?.display || "none",
    floatNavVisible: !!(floatNav && navCs && navCs.display !== "none" && !floatNav.hidden),
    heroGridCols: getComputedStyle(document.querySelector(".hero-grid") || document.body).gridTemplateColumns,
    heroIllustrationVisible: illCs ? illCs.display !== "none" : false,
    deptBadgeWrap: badgeCs ? `${badgeCs.gridColumn} ${badgeCs.gridRow}` : null,
    navActiveIndicator: !!document.querySelector(".ap-float-nav__link.is-active"),
    orreryWrapVisible: (() => {
      const wrap = document.getElementById("apAwardOrreryWrap");
      if (!wrap || wrap.hidden) return false;
      const cs = getComputedStyle(wrap);
      return cs.display !== "none" && wrap.offsetWidth > 0;
    })(),
    sgFilterReady: document.querySelectorAll(".sg-filter-chip").length >= 3,
  };
});

const scores = {};
for (const key of Object.keys(WEIGHTS)) scores[key] = scoreDim(key, checks);
scores.total = totalScore(scores);

const report = {
  version: VERSION,
  capturedAt: new Date().toISOString(),
  checks,
  scores,
  weights: WEIGHTS,
  issues: [],
};

const outPath = join(OUT, `expert-audit-${VERSION.replace("ap-", "")}.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ scores, outPath, checks: { chapters: checks.chapters, floatNav: checks.floatNav, chapterHeadCount: checks.chapterHeadCount, deptHeadingCount: checks.deptHeadingCount } }, null, 2));

await browser.close();