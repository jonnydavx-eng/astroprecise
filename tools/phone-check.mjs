/**
 * Phone check: loads the built site (dist/) at 390×844 and 412×915 like a phone,
 * and fails on sideways overflow, console or page errors, broken local files,
 * or a slow largest paint (LCP) under simulated mobile conditions.
 *
 * Pages: home, chart → story (fictional 14 Jun 1990 03:42, Heywood; fails if those
 * details appear in any outside request), shop, observatory (3D must wait for
 * "Enter the sky", then load) and contact. Screenshots at 0, 5 and 10 seconds plus a
 * reduced-motion shot go to the output folder (default phone-check-out/).
 *
 * Run: npm run build && npm run test:phone
 * Env: CHROME_PATH (default /usr/bin/google-chrome), PHONE_CHECK_OUT, PHONE_CHECK_PORT,
 *      PHONE_CHECK_LCP_MS (default 2500), PHONE_CHECK_QUICK=1 (skips the 5 s / 10 s shots).
 */
import { chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = process.env.PHONE_CHECK_OUT || join(ROOT, 'phone-check-out')
const PORT = Number(process.env.PHONE_CHECK_PORT || 8797)
const BASE = `http://127.0.0.1:${PORT}`
const LCP_LIMIT = Number(process.env.PHONE_CHECK_LCP_MS || 2500)
const QUICK = process.env.PHONE_CHECK_QUICK === '1'
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(existsSync)
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 412, height: 915 }]
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'chart', path: '/chart.html', flow: 'story' },
  { name: 'shop', path: '/shop.html' },
  { name: 'observatory', path: '/observatory.html', flow: 'enter-sky' },
  { name: 'contact', path: '/contact.html' },
]
// Lighthouse-style mobile: 4× slower CPU, 150 ms round trip, 1.6 Mbps down / 750 kbps up.
const NETWORK = { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 }

if (!existsSync(join(ROOT, 'dist', 'index.html'))) { console.error('phone-check: dist/ is missing. Run npm run build first.'); process.exit(2) }
if (!CHROME) { console.error('phone-check: no Chrome found. Set CHROME_PATH.'); process.exit(2) }
mkdirSync(OUT, { recursive: true })

const server = spawn(process.execPath, [join(ROOT, 'tools', 'serve-dist.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] })
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => { if (String(d).includes('served')) resolve() })
  server.on('exit', (code) => reject(new Error('server exited ' + code)))
  setTimeout(() => reject(new Error('server did not start')), 10000)
})

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
const results = []
const problems = []

async function newPage(vp, extra = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'en-GB', timezoneId: 'Europe/London', ...extra })
  // Keep the check offline and deterministic: outside requests get an empty reply.
  // Every outside URL is recorded so the chart flow can prove no birth data leaves the page.
  const outbound = []
  await ctx.route((url) => !url.href.startsWith(BASE), (route) => { outbound.push(route.request().url() + ' ' + (route.request().postData() || '')); return route.fulfill({ status: 204, body: '' }) })
  await ctx.addInitScript(() => {
    window.__apLcp = 0
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__apLcp = e.startTime }).observe({ type: "largest-contentful-paint", buffered: true }) } catch { /* LCP not supported */ }
  })
  const page = await ctx.newPage()
  const errors = []
  const missing = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  page.on('response', (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) missing.push(r.status() + ' ' + r.url().slice(BASE.length)) })
  return { ctx, page, errors, missing, outbound }
}

async function throttle(page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', NETWORK)
  return cdp
}

const overflow = (page) => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - window.innerWidth)

for (const vp of VIEWPORTS) {
  for (const spec of PAGES) {
    const { ctx, page, errors, missing, outbound } = await newPage(vp)
    const local = () => page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name.split('/').pop().split('?')[0]))
    const cdp = await throttle(page)
    const tag = `${spec.name}-${vp.width}`
    await page.goto(BASE + spec.path, { waitUntil: 'load', timeout: 60000 })
    await page.waitForTimeout(1500)
    const lcp = Math.round(await page.evaluate(() => window.__apLcp))
    await page.screenshot({ path: join(OUT, `${tag}-0s.png`) })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
    if (!QUICK) {
      await page.waitForTimeout(3500); await page.screenshot({ path: join(OUT, `${tag}-5s.png`) })
      await page.waitForTimeout(5000); await page.screenshot({ path: join(OUT, `${tag}-10s.png`) })
    }
    const row = { page: spec.name, width: vp.width, lcpMs: lcp, overflowPx: await overflow(page) }
    if (spec.flow === 'enter-sky') {
      // The 3D engine and the star catalogue must wait for the tap, then load cleanly.
      const heavy = /^(void-orrery-adapter|orrery-webgl|three\.module\.min)\.js$|^hyg-bright\.bin$/
      row.heavyBeforeTap = (await local()).filter((n) => heavy.test(n))
      await page.click('#ap-enter-sky')
      await page.waitForFunction(() => performance.getEntriesByType('resource').some((r) => r.name.includes('hyg-bright.bin')), null, { timeout: 30000 })
      await page.waitForTimeout(2000)
      row.heavyAfterTap = (await local()).filter((n) => heavy.test(n))
      row.enteredOverflowPx = await overflow(page)
      await page.screenshot({ path: join(OUT, `observatory-${vp.width}-entered.png`) })
      if (row.heavyBeforeTap.length) problems.push(`${tag}: loaded before the tap: ${row.heavyBeforeTap.join(', ')}`)
      if (row.heavyAfterTap.length < 4) problems.push(`${tag}: after the tap only loaded ${row.heavyAfterTap.join(', ') || 'nothing'}`)
    }
    if (spec.flow === 'story') {
      await page.fill('#birth-date', '1990-06-14')
      await page.fill('#birth-time', '03:42')
      await page.fill('#birth-place', 'Heywood')
      await page.waitForSelector('#place-options button', { timeout: 10000 })
      await page.click('#place-options button >> nth=0')
      await page.click('#calculate-chart')
      await page.waitForSelector('#read-my-sky', { state: 'visible', timeout: 15000 })
      row.resultOverflowPx = await overflow(page)
      await page.screenshot({ path: join(OUT, `chart-result-${vp.width}.png`) })
      await page.locator('#read-my-sky').scrollIntoViewIfNeeded()
      await Promise.all([page.waitForURL(/deep-reading/, { timeout: 15000 }), page.click('#read-my-sky')])
      await page.waitForSelector('#story-content', { state: 'visible', timeout: 15000 })
      row.storyOverflowPx = await overflow(page)
      await page.screenshot({ path: join(OUT, `story-${vp.width}.png`) })
    }
    if (spec.flow === 'story') {
      const leaked = outbound.filter((u) => /1990|03(%3A|:)?42|14\/06|06-14/.test(u))
      if (leaked.length) problems.push(`${tag}: birth details in an outside request: ${leaked[0].slice(0, 120)}`)
    }
    row.errors = [...errors]
    row.missing = [...missing]
    results.push(row)
    const worst = Math.max(row.overflowPx, row.resultOverflowPx || 0, row.storyOverflowPx || 0, row.enteredOverflowPx || 0)
    if (worst > 1) problems.push(`${tag}: ${worst}px sideways overflow`)
    if (row.errors.length) problems.push(`${tag}: ${row.errors.length} console/page errors: ${row.errors[0]}`)
    if (row.missing.length) problems.push(`${tag}: missing files: ${row.missing.slice(0, 3).join(', ')}`)
    if (!(lcp > 0)) problems.push(`${tag}: no LCP recorded`)
    else if (lcp > LCP_LIMIT) problems.push(`${tag}: LCP ${lcp} ms over ${LCP_LIMIT} ms`)
    await ctx.close()
  }
  const { ctx, page, errors } = await newPage(vp, { reducedMotion: 'reduce' })
  await page.goto(BASE + '/', { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: join(OUT, `home-${vp.width}-reduced-motion.png`) })
  if (errors.length) problems.push(`home-${vp.width} reduced motion: ${errors[0]}`)
  await ctx.close()
}

await browser.close()
server.kill()
writeFileSync(join(OUT, 'phone-check.json'), JSON.stringify({ lcpLimitMs: LCP_LIMIT, results, problems }, null, 2))
for (const r of results) console.log(`${r.page.padEnd(12)} ${r.width}  LCP ${String(r.lcpMs).padStart(5)} ms  overflow ${r.overflowPx}px  errors ${r.errors.length}  missing ${r.missing.length}`)
if (problems.length) { console.log('\nphone-check FAILED:\n  ' + problems.join('\n  ')); process.exit(1) }
console.log(`\nphone-check: ${results.length} page loads passed (screenshots in ${OUT})`)
