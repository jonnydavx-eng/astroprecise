// test-upcoming-sky-render.mjs — Upcoming sky events rendered in a real browser
// at 360 and 1280 wide, against the repo's own website/ folder (served locally,
// service workers blocked, no network beyond localhost). The clock is pinned to
// 2026-10-23 16:00 UTC (17:00 BST) so the computed list is deterministic.
// Needs Chrome (CHROME_PATH or a system Chrome); skips locally without one,
// fails in CI (CI=true) without one.
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
    console.error('upcoming sky render: no Chrome found (set CHROME_PATH)')
    process.exit(1)
  }
  console.log('upcoming sky render: SKIP (no Chrome; set CHROME_PATH)')
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
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
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
const NOW = new Date('2026-10-23T16:00:00Z')

const SMALL_TEXT = () => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
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
    if (parseFloat(cs.fontSize) < 12)
      small.push(`${e.tagName.toLowerCase()} ${cs.fontSize} "${t.slice(0, 24)}"`)
  }
  return { total, small }
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox'],
})
async function open(file, width) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 600 ? 780 : 900 },
    serviceWorkers: 'block',
    locale: 'en-GB',
    timezoneId: 'America/New_York', // the page must still show UK time
    reducedMotion: 'reduce',
  })
  await ctx.clock.setFixedTime(NOW)
  await ctx.route('**/*', (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()))
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${BASE}/${file}`, { waitUntil: 'load' })
  await page.waitForSelector('#next-up h2', { timeout: 15000 })
  return { ctx, page, errors }
}

try {
  for (const width of [360, 1280]) {
    const { ctx, page, errors } = await open('sky-events.html', width)
    await page.waitForSelector('#upcoming-events .upcoming-row')
    const next = await page.evaluate(() => ({
      title: document.querySelector('#next-up h2').textContent,
      when: document.querySelector('#next-up time').textContent,
      countdown: document.querySelector('#next-up .countdown').textContent,
      eclipse: (document.querySelector('#next-up .next-eclipse') || {}).textContent || '',
      link: (document.querySelector('#next-up a') || {}).getAttribute?.('href'),
    }))
    ok(
      next.title === 'Mercury stations retrograde',
      `${width}px: Next up is the computed Mercury station`,
      next,
    )
    ok(
      /^In about \d+ hours?$/.test(next.countdown),
      `${width}px: countdown shown (rounded for an approximate station)`,
      next.countdown,
    )
    ok(next.when === 'Around Sat 24 Oct (UK)', `${width}px: Next-up date in UK terms`, next.when)
    ok(
      /Annular solar eclipse, Sat 6 Feb, 16:00 GMT/.test(next.eclipse),
      `${width}px: next eclipse named even beyond 90 days`,
      next.eclipse,
    )
    ok(
      next.link === 'retrograde.html',
      `${width}px: Next up links to the retrograde page`,
      next.link,
    )

    const list = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#upcoming-events .upcoming-row')]
      return {
        n: rows.length,
        engine: rows.every((r) => r.dataset.source === 'engine'),
        months: [...document.querySelectorAll('#upcoming-events .upcoming-month')].map(
          (m) => m.textContent,
        ),
        times: rows.map((r) => r.querySelector('time').textContent),
        count: document.getElementById('upcoming-count').textContent,
        links: rows.filter((r) => r.querySelector('a.row-link')).length,
      }
    })
    ok(
      list.n >= 15 && list.engine,
      `${width}px: ${list.n} computed rows, all from the engine`,
      list.n,
    )
    ok(
      list.months.join('|') === 'October 2026|November 2026|December 2026|January 2027',
      `${width}px: grouped by UK month`,
      list.months,
    )
    ok(
      list.times.every((t) => /(GMT|BST)$|\(UK\)$/.test(t)),
      `${width}px: every time is UK time with its zone`,
      list.times,
    )
    ok(
      list.times.includes('Mon 26 Oct, 04:11 GMT'),
      `${width}px: Full Moon shown in GMT after the clocks change`,
      list.times,
    )
    ok(
      /in the next 90 days · times in UK time/.test(list.count),
      `${width}px: 90-day default stated`,
      list.count,
    )
    ok(list.links === list.n, `${width}px: every row links to an existing page`, list.links)

    for (const [type, test] of [
      ['moon', (k) => k === 'moon' || k === 'eclipse'],
      ['station', (k) => k === 'station'],
      ['season', (k) => k === 'season'],
      ['ingress', (k) => k === 'ingress' || k === 'season'],
    ]) {
      await page.click(`[data-upcoming-type="${type}"]`)
      const kinds = await page.$$eval('#upcoming-events .upcoming-row', (rs) =>
        rs.map((r) => r.dataset.kind),
      )
      ok(
        kinds.length > 0 && kinds.every(test),
        `${width}px: "${type}" chip filters the list`,
        kinds,
      )
      ok(
        (await page.getAttribute(`[data-upcoming-type="${type}"]`, 'aria-pressed')) === 'true',
        `${width}px: "${type}" chip pressed`,
      )
    }
    await page.click('[data-upcoming-type="eclipse"]')
    const empty = await page.textContent('#upcoming-events')
    ok(
      /No eclipses in the next 90 days\. The next one is annular solar eclipse/.test(empty),
      `${width}px: eclipse chip explains the next one`,
      empty,
    )
    await page.click('#upcoming-more')
    const yearRows = await page.$$eval('#upcoming-events .upcoming-row', (rs) =>
      rs.map((r) => r.querySelector('h3').textContent),
    )
    ok(
      yearRows.includes('Annular solar eclipse') && yearRows.includes('Total solar eclipse'),
      `${width}px: 12 months shows the 2027 eclipses`,
      yearRows,
    )
    await page.click('[data-upcoming-type="all"]')

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const small = await page.evaluate(SMALL_TEXT)
    ok(
      small.total > 40 && small.small.length === 0,
      `${width}px: sky-events has no text under 12px (${small.total} nodes)`,
      small.small,
    )
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    ok(over <= 0, `${width}px: sky-events has no horizontal overflow`, over)
    const fonts = await page.evaluate(() => [
      getComputedStyle(document.querySelector('#next-up h2')).fontFamily,
      getComputedStyle(document.querySelector('.upcoming-row .row-note')).fontFamily,
      getComputedStyle(document.body).backgroundColor,
    ])
    ok(
      /AP Serif/.test(fonts[0]) && /AP Sans/.test(fonts[1]) && fonts[2] === 'rgb(246, 243, 236)',
      `${width}px: Paper & Night type and paper`,
      fonts,
    )
    if (width === 1280) {
      const nav = await page.$$eval('.ap-next-desktop a', (as) =>
        as.map((a) => [a.textContent, a.getAttribute('aria-current')]),
      )
      ok(
        nav.some(([t, c]) => t === 'Sky events' && c === 'page'),
        '1280px: header nav has Sky events, marked current',
        nav,
      )
    }
    const foot = await page.$$eval('.ap-next-footer a', (as) => as.map((a) => a.textContent))
    ok(foot.includes('Upcoming sky events'), `${width}px: footer links Upcoming sky events`, foot)
    ok(errors.length === 0, `${width}px: no page errors on sky-events`, errors)
    await ctx.close()

    const home = await open('index.html', width)
    const h = await home.page.evaluate(() => ({
      title: document.querySelector('#next-up h2').textContent,
      cd: document.querySelector('#next-up .countdown').textContent,
      more: [...document.querySelectorAll('.home-next-up a')].map((a) => a.getAttribute('href')),
    }))
    ok(
      h.title === 'Mercury stations retrograde' && /^In /.test(h.cd),
      `${width}px: home shows Next up with a countdown`,
      h,
    )
    ok(
      h.more.includes('sky-events.html'),
      `${width}px: home links to the upcoming sky events page`,
      h.more,
    )
    const homeSmall = await home.page.evaluate(SMALL_TEXT)
    ok(homeSmall.small.length === 0, `${width}px: home has no text under 12px`, homeSmall.small)
    const homeOver = await home.page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    ok(homeOver <= 0, `${width}px: home has no horizontal overflow`, homeOver)
    ok(home.errors.length === 0, `${width}px: no page errors on home`, home.errors)
    await home.ctx.close()
  }
} finally {
  await browser.close()
  server.close()
}
if (fails) {
  console.error(`upcoming sky render: ${fails} failure(s)`)
  process.exit(1)
}
console.log('PASS upcoming sky render (360 + 1280, sky-events + home)')
