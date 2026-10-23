// Whole Sky: the Observatory still is a real 4800 x 3600 render, whatever the window.
// Renders the real engine in headless Chrome (SwiftShader) through the same tool the
// order step uses (tools/observatory-still.mjs) and checks the PNG's IHDR, the engine's
// drawing buffer, that the live view is restored, and that an impossible size fails
// loudly. Skips (exit 0) only when no Chrome/Edge can be launched here.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pngSize } from './tools/fulfil-shared.mjs'
import { startServer, AURORA } from './tools/make-studio-samples.mjs'
import {
  launchStillBrowser,
  renderObservatoryStill,
  STILL_FILE,
  STILL_WIDTH,
  STILL_HEIGHT,
} from './tools/observatory-still.mjs'

let bad = 0
const ok = (label, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond || !detail ? '' : `  (${detail})`}`)
  if (!cond) bad++
}

let browser
try {
  browser = await launchStillBrowser()
} catch (e) {
  console.log(`SKIP  no Chrome/Edge to render with here: ${String(e.message).split('\n')[0]}`)
  process.exit(0)
}
const server = await startServer()
const origin = `http://127.0.0.1:${server.address().port}`
const detail = {
  jd: Date.UTC(AURORA.y, AURORA.mo - 1, AURORA.d, AURORA.h, AURORA.mi, 1) / 86400000 + 2440587.5,
  birthDate: '1990-06-14',
  birthTime: '03:42',
  timeKnown: true,
  timeAccuracy: 'exact',
  place: AURORA.place,
  timezone: 'Europe/London',
}
try {
  ok(
    'file name carries the fixed size',
    STILL_FILE === '06-observatory-birth-hour-schematic-4800x3600.png',
  )
  // Two window sizes: the still must not depend on the viewport.
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const still = await renderObservatoryStill(browser, origin, detail, { viewport })
    const ihdr = pngSize(still.png)
    ok(
      `${viewport.width}x${viewport.height} window: PNG IHDR is 4800x3600`,
      ihdr && ihdr.width === STILL_WIDTH && ihdr.height === STILL_HEIGHT,
      JSON.stringify(ihdr),
    )
    ok(
      `${viewport.width}x${viewport.height} window: drawing buffer was 4800x3600`,
      still.drawingBuffer === '4800x3600',
      still.drawingBuffer,
    )
    ok(
      `${viewport.width}x${viewport.height} window: live canvas restored`,
      still.liveCanvas.w > 0 && still.liveCanvas.w < STILL_WIDTH,
      JSON.stringify(still.liveCanvas),
    )
    ok(
      `${viewport.width}x${viewport.height} window: no page errors`,
      still.pageErrors.length === 0,
      still.pageErrors.join(' | '),
    )
    console.log(
      `      render ${still.renderMs} ms, ${still.png.length} bytes, ${still.gl && still.gl.renderer}`,
    )
  }
  // Fail loudly: a size beyond the GPU limit must throw, never come back smaller.
  let err = ''
  try {
    await renderObservatoryStill(browser, origin, detail, { width: 48000, height: 36000 })
  } catch (e) {
    err = String(e.message)
  }
  ok(
    'an impossible 48000x36000 request fails loudly',
    /exceeds this GPU|not 48000x36000/.test(err),
    err || 'no error',
  )
  err = ''
  try {
    await renderObservatoryStill(browser, origin, detail, { width: 4800.5, height: 3600 })
  } catch (e) {
    err = String(e.message)
  }
  ok('a non-integer size is refused', /two positive integers/.test(err), err || 'no error')
} finally {
  await browser.close()
  server.close()
}

// The order CLI writes the 06 PNG for a whole-sky order and refuses other products.
const tmp = mkdtempSync(join(tmpdir(), 'ap-still-test-'))
try {
  const order = {
    orderId: 'FICTIONAL-WHOLE-SKY-STILL',
    product: 'whole-sky-edition',
    purchaseIntent: 'self',
    sampleMode: 'fictional',
    name: 'Aurora Vale',
    time: '03:42',
    place: AURORA.place,
    y: 1990,
    mo: 6,
    d: 14,
    h: 2,
    mi: 42,
    lat: AURORA.lat,
    lon: AURORA.lon,
    tz: 'Europe/London',
  }
  writeFileSync(join(tmp, 'order.json'), JSON.stringify(order))
  const run = spawnSync(
    process.execPath,
    ['tools/observatory-still.mjs', '--in', join(tmp, 'order.json'), '--dir', join(tmp, 'out')],
    {
      encoding: 'utf8',
      timeout: 240_000,
    },
  )
  const size = run.status === 0 ? pngSize(readFileSync(join(tmp, 'out', STILL_FILE))) : null
  ok(
    'CLI writes 06-observatory-birth-hour-schematic-4800x3600.png at 4800x3600',
    size && size.width === 4800 && size.height === 3600,
    `${run.stdout}${run.stderr}`,
  )
  writeFileSync(
    join(tmp, 'pack.json'),
    JSON.stringify({ ...order, product: 'natal-sky-print-pack' }),
  )
  const wrong = spawnSync(
    process.execPath,
    ['tools/observatory-still.mjs', '--in', join(tmp, 'pack.json'), '--dir', join(tmp, 'out2')],
    { encoding: 'utf8', timeout: 60_000 },
  )
  ok(
    'CLI refuses a non-Whole-Sky order',
    wrong.status !== 0 && /whole-sky-edition orders only/.test(wrong.stderr),
    wrong.stderr,
  )
  writeFileSync(
    join(tmp, 'unknown.json'),
    JSON.stringify({ ...order, time: 'unknown', h: undefined, mi: undefined }),
  )
  const unknown = spawnSync(
    process.execPath,
    ['tools/observatory-still.mjs', '--in', join(tmp, 'unknown.json'), '--dir', join(tmp, 'out3')],
    { encoding: 'utf8', timeout: 60_000 },
  )
  ok(
    'CLI refuses an order with no recorded birth time',
    unknown.status !== 0 && /recorded birth time/.test(unknown.stderr),
    unknown.stderr,
  )
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

if (bad) {
  console.log(`\n${bad} Observatory still size check(s) failed`)
  process.exit(1)
}
console.log('\nall Observatory still size checks passed')
