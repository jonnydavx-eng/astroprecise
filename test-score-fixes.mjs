// test-score-fixes.mjs — step 10e score fixes, checked in a real browser against
// the repo's own website/ folder (served locally, service workers blocked, no
// network beyond localhost). Needs Chrome (CHROME_PATH or a system Chrome);
// skips locally without one, fails in CI (CI=true) without one.
// Text sizes are computed CSS font sizes, so they do not depend on which fonts
// the machine has; the pages load their own woff2 files from website/fonts.
import { chromium } from 'playwright-core'
import { existsSync, readFileSync, statSync } from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const SITE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'website')
const CHROME =
  process.env.CHROME_PATH ||
  [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].find(existsSync)
if (!CHROME) {
  if (process.env.CI) {
    console.error('score fixes: no Chrome found (set CHROME_PATH)')
    process.exit(1)
  }
  console.log('score fixes: SKIP (no Chrome; set CHROME_PATH)')
  process.exit(0)
}
let fails = 0
const ok = (cond, msg, got) => {
  if (cond) console.log('  ok', msg)
  else {
    fails++
    console.error(
      '  FAIL',
      msg,
      got === undefined ? '' : '— got ' + JSON.stringify(got).slice(0, 400),
    )
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
}
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p.endsWith('/')) p += 'index.html'
  const f = path.join(SITE, path.normalize(p))
  if (!f.startsWith(SITE) || !existsSync(f) || !statSync(f).isFile()) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(f)] || 'application/octet-stream',
    'cache-control': 'no-store',
  })
  res.end(readFileSync(f))
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const BASE = `http://127.0.0.1:${server.address().port}`

const SHIFT_INIT = `window.__cls=0;window.__shifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries()){if(!e.hadRecentInput){window.__cls+=e.value;window.__shifts.push({v:+e.value.toFixed(4),src:(e.sources||[]).map(s=>s.node&&s.node.className?String(s.node.className).slice(0,40):String(s.node&&s.node.nodeName))})}}}).observe({type:'layout-shift',buffered:true});`

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
})
async function openPage(file, { width = 390, height = 844, delay = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    serviceWorkers: 'block',
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  })
  await ctx.addInitScript(SHIFT_INIT)
  await ctx.route('**/*', async (route) => {
    const u = route.request().url()
    if (!u.startsWith(BASE)) return route.abort()
    if (delay && u.includes(delay)) await new Promise((r) => setTimeout(r, 1200))
    return route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/${file}`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  return { ctx, page }
}

// Every visible text node's computed font size (SVG text included).
const SMALL_TEXT = (root) => {
  const scope = root ? document.querySelector(root) : document.body
  if (!scope) return { total: -1, small: [] }
  const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let n,
    total = 0
  const small = []
  while ((n = w.nextNode())) {
    const t = n.textContent.trim()
    if (!t) continue
    const e = n.parentElement
    const cs = getComputedStyle(e)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const r = e.getBoundingClientRect()
    if (!r.width || !r.height) continue
    if (e.closest('[hidden],noscript,script,style')) continue
    total++
    const fs = parseFloat(cs.fontSize)
    if (fs < 12)
      small.push(
        `${e.tagName.toLowerCase()}.${String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).split(' ')[0]} ${fs}px "${t.slice(0, 24)}"`,
      )
  }
  return { total, small }
}

try {
  // 1. Observatory: no layout shift at 390 when first paint happens before the
  //    shell script or the page script runs (what Lighthouse saw: CLS 0.174).
  for (const delay of ['ap-next.js', 'ap-observatory-v834.js', null]) {
    for (const width of [390, 360]) {
      const { ctx, page } = await openPage('observatory.html', { width, delay })
      await page.waitForTimeout(800)
      const cls = await page.evaluate(() => window.__cls)
      const shifts = await page.evaluate(() => window.__shifts)
      ok(
        cls < 0.02,
        `observatory ${width}px CLS ${cls.toFixed(4)} < 0.02 (slow ${delay || 'nothing'})`,
        shifts,
      )
      await ctx.close()
    }
  }

  // 2. Text size: nothing under 12px on the homepage, sky events, Saturn return, Moment and the footer.
  for (const width of [360, 390]) {
    for (const file of [
      'index.html',
      'sky-events.html',
      'horoscope.html',
      'observatory.html',
      'saturn-return.html',
      'moment.html',
    ]) {
      const { ctx, page } = await openPage(file, { width })
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(400)
      // Step 10f added Saturn return and Moment to the whole-page check.
      if (['index.html', 'sky-events.html', 'saturn-return.html', 'moment.html'].includes(file)) {
        const r = await page.evaluate(SMALL_TEXT, null)
        ok(
          r.total > 20 && r.small.length === 0,
          `${file} ${width}px: no text under 12px (${r.total} text nodes)`,
          r.small,
        )
      }
      const f = await page.evaluate(SMALL_TEXT, '.ap-next-footer')
      ok(
        f.total > 3 && f.small.length === 0,
        `${file} ${width}px: footer text is 12px or larger (${f.total} nodes)`,
        f.small,
      )
      const tabs = await page.evaluate(SMALL_TEXT, '.ap-next-tabs')
      ok(
        tabs.small.length === 0,
        `${file} ${width}px: bottom tab labels are 12px or larger`,
        tabs.small,
      )
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      ok(over <= 0, `${file} ${width}px: no horizontal overflow`, over)
      await ctx.close()
    }
  }

  // 2b. Step 10f: Saturn return and Moment stay at 12px or larger once a result is shown.
  for (const width of [360, 390]) {
    {
      const { ctx, page } = await openPage('saturn-return.html', { width })
      await page.fill('#sat-date', '1990-03-14')
      await page.click('#sat-submit')
      await page.waitForTimeout(2000)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(300)
      const r = await page.evaluate(SMALL_TEXT, null)
      const shown = await page.evaluate(() => !!document.querySelector('.sat-card__n'))
      ok(
        shown && r.small.length === 0,
        `saturn-return.html ${width}px (result shown): no text under 12px (${r.total} text nodes)`,
        r.small,
      )
      await ctx.close()
    }
    {
      const { ctx, page } = await openPage('moment.html', { width })
      await page.fill('#mom-date', '1990-03-14')
      await page.fill('#mom-place', 'London')
      await page.waitForTimeout(1200)
      const opt = await page.$('#mom-place-list [role=option], #mom-place-list li')
      if (opt) await opt.click()
      await page.click('#mom-freeze')
      await page.waitForTimeout(2500)
      const r = await page.evaluate(SMALL_TEXT, null)
      const shown = await page.evaluate(() => !!document.querySelector('.mom-fact__k'))
      ok(
        !!opt && shown && r.small.length === 0,
        `moment.html ${width}px (moment frozen): no text under 12px (${r.total} text nodes)`,
        r.small,
      )
      await ctx.close()
    }
  }

  // 3. Daily horoscope: "12:00 UT" at most once per page render, with no sign
  //    open and with a sign open and every details panel expanded.
  {
    const { ctx, page } = await openPage('horoscope.html')
    const count = () =>
      page.evaluate(() => (document.body.innerText.match(/12:00\s*UT/gi) || []).length)
    const closed = await count()
    ok(closed <= 1, `horoscope (no sign open): "12:00 UT" appears ${closed} time(s)`, closed)
    await page.click('.sign-card[data-sign="leo"]')
    await page.waitForTimeout(1200)
    await page.evaluate(() =>
      document.querySelectorAll('details').forEach((d) => {
        d.open = true
      }),
    )
    await page.waitForTimeout(300)
    const open = await count()
    const love = await page.evaluate(() => document.body.innerText)
    ok(
      open <= 1,
      `horoscope (Leo open, details expanded): "12:00 UT" appears ${open} time(s)`,
      open,
    )
    ok(
      !/lead with sincerity over spectacle|body-mind balance/.test(love),
      'horoscope page shows the new people and pace sentences',
    )
    await ctx.close()
  }

  // 4. Copy tidy: old phrases and US dates are gone; reader pages use plain words.
  const BLOCKED = [
    /big purchases or signatures/i,
    /tend to crack/i,
    /The great reckoning/i,
    /computed only · feed down/i,
  ]
  const US_DATE =
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.? \d{1,2}(st|nd|rd|th)?,? \d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/
  for (const file of ['transits.html', 'retrograde.html', 'saturn-return.html']) {
    const { ctx, page } = await openPage(file)
    const text = await page.evaluate(() => document.body.innerText)
    const src = readFileSync(path.join(SITE, file), 'utf8')
    for (const re of BLOCKED) ok(!re.test(text) && !re.test(src), `${file}: no "${re.source}"`)
    if (file === 'transits.html')
      ok(
        !US_DATE.test(text) && !US_DATE.test(src.replace(/<script[\s\S]*?<\/script>/g, '')),
        'transits.html: dates are UK style (day month year)',
        (text.match(US_DATE) || src.match(US_DATE) || [])[0],
      )
    await ctx.close()
  }
  ok(
    !/big purchases or signatures/.test(readFileSync(path.join(SITE, 'js/retrograde.js'), 'utf8')),
    'retrograde.js: purchase/signature warning softened',
  )
  for (const file of ['aries.html', 'scorpio.html', 'moonphase.html', 'why.html']) {
    const { ctx, page } = await openPage(file)
    const text = await page.evaluate(
      () =>
        document.body.innerText +
        ' ' +
        (document.querySelector('meta[name=description]')?.content || ''),
    )
    const m = text.match(/VSOP87|ELP2000|J2000/)
    ok(!m, `${file}: no VSOP87 / ELP2000 / J2000 shorthand in reader text`, m && m[0])
    await ctx.close()
  }

  // 6. Pause button: its accessible name contains its visible text, in every state.
  {
    const { ctx, page } = await openPage('index.html')
    const state = () =>
      page.evaluate(() => {
        const b = document.getElementById('demo-pause')
        return { text: b.innerText.trim(), label: b.getAttribute('aria-label') || '' }
      })
    const check = (s, when) =>
      ok(
        s.text && s.label.toLowerCase().includes(s.text.toLowerCase()),
        `pause button (${when}): aria-label "${s.label}" contains visible text "${s.text}"`,
        s,
      )
    const s0 = await state()
    check(s0, 'start')
    ok(/^Pause/.test(s0.text), 'pause button starts as Pause', s0)
    await page.click('#demo-pause')
    const s1 = await state()
    check(s1, 'after one press')
    ok(/^Play/.test(s1.text), 'pressing it shows Play', s1)
    await page.click('#demo-pause')
    const s2 = await state()
    check(s2, 'after two presses')
    ok(/^Pause/.test(s2.text), 'pressing again shows Pause', s2)
    await ctx.close()
  }
} finally {
  await browser.close()
  server.close()
}
if (fails) {
  console.error(`\n${fails} score-fix check(s) failed`)
  process.exit(1)
}
console.log('\nscore fixes: all checks passed')
