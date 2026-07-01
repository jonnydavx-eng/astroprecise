/**
 * Homepage contract evaluator — reads homepage-contract.json assertions.
 * Usage: node homepage-contract-eval.mjs
 */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "out");
mkdirSync(OUT, { recursive: true });

const contract = JSON.parse(readFileSync(join(__dir, "homepage-contract.json"), "utf8"));
const VERSION = contract.version.replace("ap-v", "");
const BASE = process.env.AP_PREVIEW || `http://localhost:8790/?v=${VERSION}`;
const STORY_ID = contract.storyId || "retrograde-survival";

const results = { ok: true, version: contract.version, checks: [], errors: [] };
const fail = (name, detail) => { results.ok = false; results.checks.push({ name, pass: false, detail }); };
const pass = (name, detail) => results.checks.push({ name, pass: true, detail });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.setItem("ap_intro_complete", "1");
  document.querySelectorAll(".ap-reveal").forEach((el) => {
    el.classList.add("is-visible");
    el.style.opacity = "1";
  });
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);

const chapters = await page.evaluate(() =>
  [...document.querySelectorAll(".ap-chapter")].map((el) => ({
    id: el.id,
    opacity: getComputedStyle(el).opacity,
  }))
);
if (chapters.some((c) => c.opacity !== "1")) fail("chapters opacity 1", JSON.stringify(chapters.filter((c) => c.opacity !== "1")));
else pass("chapters opacity 1", `${chapters.length} sections`);

const blur = await page.evaluate(() =>
  [...document.querySelectorAll("*")].filter((el) => {
    const bf = getComputedStyle(el).backdropFilter;
    return bf && bf !== "none";
  }).length
);
if (blur) fail("no backdrop-filter", String(blur));
else pass("no backdrop-filter", "0 elements");

const h1op = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).opacity);
if (h1op !== "1") fail("hero h1 opacity", h1op);
else pass("hero h1 opacity", h1op);

const navHidden = await page.evaluate(() => {
  const nav = document.getElementById("apFloatNav");
  return nav ? getComputedStyle(nav).display === "none" || nav.hidden : true;
});
if (!navHidden) fail("float nav hidden on hero", "visible");
else pass("float nav hidden on hero", "hidden");

const deptHeadings = await page.evaluate(() => document.querySelectorAll(".dept-heading").length);
if (deptHeadings) fail("zero dept-heading", String(deptHeadings));
else pass("ap-chapter-head unified", "0 dept-heading");

const methodTrust = await page.evaluate(() => !!document.querySelector(".ap-mini-trust"));
const shopTrust = await page.evaluate(() => !!document.querySelector(".ap-shop-trust"));
if (!methodTrust || !shopTrust) fail("trust strips", `method=${methodTrust} shop=${shopTrust}`);
else pass("trust strips", "method + shop");

await page.locator("#skyGuidesWrap").scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelectorAll(".sg-card").length >= 8, null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(600);

const guideCards = await page.locator(".sg-card").count();
if (guideCards < 8) fail("sky guides >=8 cards", String(guideCards));
else pass("sky guides >=8 cards", String(guideCards));

const featured = await page.evaluate(() => !!document.querySelector(".sg-featured-badge"));
if (!featured) fail("featured guide badge", "missing");
else pass("featured guide badge", "present");

const stickyFilter = await page.evaluate(() => getComputedStyle(document.querySelector(".sg-filter-slot")).position === "sticky");
if (!stickyFilter) fail("sticky guide filters", "not sticky");
else pass("sticky guide filters", "sticky");

await page.locator("#apFinderFab").click();
await page.waitForTimeout(200);
const links = await page.locator(".ap-finder__link").count();
const finderOpen = await page.evaluate(() => !document.getElementById("apChartFinder").hidden);
if (!finderOpen || links !== 5) fail("chart finder 5 links", `open=${finderOpen} links=${links}`);
else pass("chart finder 5 links", "open");
await page.keyboard.press("Escape");
await page.waitForTimeout(150);
const finderClosed = await page.evaluate(() => document.getElementById("apChartFinder").hidden);
if (!finderClosed) fail("finder escape closes", "still open");
else pass("finder escape closes", "closed");

await page.locator("#instrumentsChapter").scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const paddingEnd = await page.evaluate(() => {
  const wrap = document.querySelector(".page-wrap");
  return wrap ? parseFloat(getComputedStyle(wrap).paddingInlineEnd) : 0;
});
const navVisible = await page.evaluate(() => document.body.classList.contains("ap-award-511--nav-visible"));
if (navVisible && paddingEnd < 100) fail("float nav rail padding", String(paddingEnd));
else pass("float nav rail padding", `${paddingEnd}px navVisible=${navVisible}`);

const scrollSpy = await page.evaluate(() => {
  const active = document.querySelector(".ap-float-nav__link.is-active");
  return {
    active: !!active,
    aria: active?.getAttribute("aria-current") || null,
  };
});
if (!scrollSpy.active || scrollSpy.aria !== "location") fail("scroll-spy", JSON.stringify(scrollSpy));
else pass("scroll-spy", "is-active + aria-current");

const plateInSky = await page.evaluate(() => !!document.querySelector("#skyChapter .plate, #skyChapter .sky-tonight-plate"));
if (!plateInSky) fail("Plate I in skyChapter", "missing");
else pass("Plate I in skyChapter", "present");

await page.goto(`${BASE.split("?")[0]}?v=${VERSION}#guides?story=${STORY_ID}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const overlayOpen = await page.evaluate(() => !document.getElementById("sgOverlay").hidden);
if (!overlayOpen) {
  await page.locator("#skyGuidesWrap").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll(".sg-card").length >= 8, null, { timeout: 8000 }).catch(() => {});
  await page.evaluate((id) => { location.hash = `guides?story=${id}`; }, STORY_ID);
  await page.waitForTimeout(1500);
}
const overlayOpen2 = await page.evaluate(() => !document.getElementById("sgOverlay").hidden);
if (!overlayOpen2) fail("guide deep link", STORY_ID);
else pass("guide deep link", STORY_ID);

await page.evaluate(() => document.getElementById("sgOverlayClose")?.click());
await page.waitForTimeout(300);

await page.goto(`${BASE.split("?")[0]}?v=${VERSION}#guides?story=not-a-real-guide`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
const invalidHandled = await page.evaluate(() => {
  const toast = document.getElementById("apToast");
  const overlayHidden = document.getElementById("sgOverlay").hidden;
  return overlayHidden || (toast && toast.textContent.length > 0);
});
if (!invalidHandled) fail("invalid guide hash", "no fallback");
else pass("invalid guide hash", "toast or closed overlay");

const axe = await new AxeBuilder({ page }).analyze();
if (axe.violations.length) fail("index axe 0", axe.violations.map((v) => v.id).join(","));
else pass("index axe 0", "clean");

if (consoleErrors.length) fail("no pageerror", consoleErrors.join("; "));
else pass("no pageerror", "clean");

const outPath = join(OUT, `contract-eval-${VERSION}.json`);
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(JSON.stringify({
  ok: results.ok,
  outPath,
  failed: results.checks.filter((c) => !c.pass).map((c) => c.name),
  passed: results.checks.filter((c) => c.pass).length,
}, null, 2));

await browser.close();
process.exit(results.ok ? 0 : 1);