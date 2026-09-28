/** Source-level presentation regression checks; no browser, PDF or PNG render. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import {
  ROOT, norm, sd, fmt, natalWheelSvg, canonicalizeStudioOrder, loadEngines,
} from './fulfil-shared.mjs';

const chartPage = readFileSync(join(ROOT, 'website/js/chart-page.js'), 'utf8');
const chartRender = readFileSync(join(ROOT, 'website/js/chart-render.js'), 'utf8');
function browserFunction(source, name) {
  const match = source.match(new RegExp(`  function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}`));
  assert.ok(match, `${name} must exist in the real browser source`);
  return runInNewContext(`(${match[0].trim()})`);
}
const fmtDeg = browserFunction(chartPage, 'fmtDeg');
const polar = browserFunction(chartRender, 'polar');
const lonToAngle = browserFunction(chartRender, 'lonToAngle');
const displayDegreeParts = browserFunction(chartRender, 'displayDegreeParts');
const svgDegree = (degree) => {
  const { d, m } = displayDegreeParts(degree);
  return `${d}°${String(m).padStart(2, '0')}′`;
};
const raw = JSON.parse(readFileSync(join(ROOT, 'tools/order-template-natal.json'), 'utf8'));
const order = canonicalizeStudioOrder(raw);
const { E } = loadEngines();
const chart = E.calculateNatalChart(order.utc.y, order.utc.mo, order.utc.d, order.utc.h, order.utc.mi, order.lat, order.lon, order.house);
const pos = Object.fromEntries(Object.entries(chart.positions).map(([body, p]) => [body, { lon: p.longitude }]));
const evidence = { kind: 'source-level geometry and text formatting; not a rendered artifact', fixture: raw.orderId, positions: {}, minimumLabelClearance: {} };
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
}
function textNodes(svg) {
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map((m) => ({ ...attributes(m[1]), text: m[2] }));
}
function discs(svg) {
  return [...svg.matchAll(/<circle\b[^>]*filter="[^"]*"[^>]*\/>/g)].map((m) => attributes(m[0]));
}
function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 0.11, `${label}: ${actual} vs ${expected}`);
}

test('PDF wheel matches the actual browser projection at axes and arbitrary longitudes', () => {
  const size = 720;
  const radius = size / 2 - 8 - size * .085 - size * .11 - size * .05;
  for (const asc of [0, 74.3, 359.9]) {
    const houses = Array.from({ length: 12 }, (_, i) => norm(asc + i * 30));
    for (const offset of [0, 12.3, 90, 180, 270, 359.5]) {
      const lon = norm(asc + offset);
      const svg = natalWheelSvg({ size, asc, houses, pos: { sun: { lon } }, bodies: ['sun'] });
      const [marker] = discs(svg);
      const expected = polar(size / 2, size / 2, radius, lonToAngle(lon, asc));
      close(Number(marker.cx), expected.x, 'x'); close(Number(marker.cy), expected.y, 'y');
    }
  }
});

test('fictional fixture has ASC left and MC above the horizon in both PDF scales', () => {
  for (const size of [720, 720 * .708]) {
    const svg = natalWheelSvg({ size, asc: chart.ascendant, mc: chart.midheaven, houses: chart.houses, pos });
    const labels = textNodes(svg);
    const asc = labels.find((p) => p.text === 'ASC');
    const mc = labels.find((p) => p.text === 'MC');
    assert.ok(Number(asc.x) < size / 2);
    close(Number(asc.y), size / 2, 'ASC baseline');
    assert.ok(Number(mc.y) < size / 2, 'MC must lie above the horizon for this fixture');
  }
});

test('all twelve house numbers are separated from every planet disc and each other', () => {
  for (const size of [720, 720 * .708]) {
    const svg = natalWheelSvg({ size, asc: chart.ascendant, mc: chart.midheaven, houses: chart.houses, pos });
    const houses = textNodes(svg).filter((p) => /^(?:[1-9]|1[0-2])$/.test(p.text));
    assert.equal(houses.length, 12);
    const markers = discs(svg);
    assert.ok(markers.length >= 10);
    let min = Infinity;
    for (const label of houses) {
      // Conservative enclosing radius for a two-digit sans-serif label. Actual
      // font rendering and print readability still need visual acceptance.
      const bound = Number(label['font-size']) * 1.4;
      for (const marker of markers) {
        const clearance = Math.hypot(Number(label.x) - Number(marker.cx), Number(label.y) - Number(marker.cy)) - Number(marker.r) - bound;
        assert.ok(clearance > 0, `house ${label.text} overlaps a planet disc`);
        min = Math.min(min, clearance);
      }
      for (const other of houses) {
        if (other === label) continue;
        assert.ok(Math.hypot(Number(label.x) - Number(other.x), Number(label.y) - Number(other.y)) > bound * 2, `houses ${label.text}/${other.text} overlap`);
      }
    }
    evidence.minimumLabelClearance[size] = min;
  }
});

test('zodiac sector arcs follow the corrected anticlockwise endpoints', () => {
  const svg = natalWheelSvg({ size: 720, asc: chart.ascendant, houses: chart.houses, pos: {}, bodies: [] });
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(paths.length, 12);
  for (const path of paths) {
    const arcs = [...path.matchAll(/A[\d.]+,[\d.]+ 0 ([01]),([01]) /g)];
    assert.equal(arcs.length, 2);
    assert.deepEqual(arcs.map((a) => [a[1], a[2]]), [['0', '0'], ['0', '1']]);
  }
});

test('every actual fictional position agrees across PDF, PNG and SVG display formatters', () => {
  for (const [body, p] of Object.entries(chart.positions)) {
    const png = fmtDeg(p);
    assert.equal(`${png} ${p.sign}`, fmt(p.longitude), body);
    assert.equal(svgDegree(p.degree), png, `${body} SVG`);
    evidence.positions[body] = fmt(p.longitude);
  }
  for (const [name, lon] of [['ASC', chart.ascendant], ['MC', chart.midheaven]]) {
    assert.equal(fmtDeg({ degree: norm(lon) % 30 }), `${sd(lon).d}°${String(sd(lon).m).padStart(2, '0')}′`, name);
  }
  assert.equal(evidence.positions.moon, '27°07′ Aquarius');
  assert.equal(evidence.positions.mercury, '3°13′ Gemini');
  assert.equal(evidence.positions.mars, '9°53′ Aries');
  assert.equal(evidence.positions.neptune, '13°36′ Capricorn');
  assert.equal(evidence.positions.pluto, '15°25′ Scorpio');
});

test('whole-minute display is stable at fractional, exact-minute and sign boundaries', () => {
  for (const [degree, expected] of [
    [0, '0°00′'], [1 / 60, '0°01′'], [.1, '0°06′'], [10.1, '10°06′'],
    [29 + 59.49 / 60, '29°59′'], [29 + 59.5 / 60, '29°59′'], [29.99999999999, '29°59′'],
  ]) {
    assert.equal(fmtDeg({ degree }), expected);
    assert.equal(svgDegree(degree), expected);
    for (let sign = 0; sign < 12; sign++) {
      const value = sd(sign * 30 + degree);
      assert.equal(value.idx, sign);
      assert.equal(`${value.d}°${String(value.m).padStart(2, '0')}′`, expected);
    }
  }
  assert.equal(fmt(30), '0°00′ Taurus');
  assert.equal(fmt(360), '0°00′ Aries');
  assert.equal(fmt(-.001), '29°59′ Pisces');
});

test('write the bounded source-check evidence', () => {
  mkdirSync(join(ROOT, 'output', 'natal-source-checks'), { recursive: true });
  writeFileSync(join(ROOT, 'output/natal-source-checks/presentation-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
});
