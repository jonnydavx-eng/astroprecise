/**
 * 390-pass NOW — ap-v869 Pluto-as-mesh check.
 * Home + compatibility only. Playwright Chromium, 390x844, isMobile+touch, ?nosw=1.
 * Local only. Does not bump sw.js / pins / shipping CSS unless a real CSS fail exists.
 */
import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || 'C:\\Users\\jonny\\OneDrive\\astroprecise\\launch-output\\phone-pass-2026-08-14-v869';
mkdirSync(OUT, { recursive: true });

const COUPLES = '#a=1990-06-15&at=14:22&az=Europe/London&ac=London&an=A&b=1985-12-03&bt=08:40&bz=America/New_York&bc=New%20York&bn=B';

const PAGES = [
  { id: 'home', path: '/index.html?nosw=1', wait: '#orr, .ap-model-stage, body' },
  { id: 'compatibility', path: '/compatibility.html?nosw=1' + COUPLES, wait: 'body' },
];

const STAGE_SELECTORS = [
  '.ap-model-stage',
  '#orr',
  'void-orrery',
  '.hero-solar-stage',
  '.ap-live-stage',
  'canvas',
];

async function launchBrowser() {
  try {
    return await chromium.launch({
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
  } catch (error) {
    if (!/Executable doesn't exist/i.test(String(error))) throw error;
    return chromium.launch({
      channel: 'chrome',
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
  }
}

const browser = await launchBrowser();
const results = [];

for (const spec of PAGES) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`page: ${e.message || e}`));
  const url = BASE + spec.path;
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    status = resp ? resp.status() : 0;
    await page.waitForSelector(spec.wait, { timeout: 12_000 }).catch(() => {});
    await page.waitForFunction(() => {
      const orr = document.getElementById('orr');
      return !!(orr && (orr._ready === true || orr.getAttribute('data-engine') === 'webgl'));
    }, { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2200);
  } catch (e) {
    errors.push(`goto: ${e.message}`);
  }

  const measure = await page.evaluate(({ STAGE_SELECTORS }) => {
    const stages = [];
    for (const sel of STAGE_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        stages.push({
          sel,
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          w: Math.round(r.width),
          h: Math.round(r.height),
          display: getComputedStyle(el).display,
          vis: getComputedStyle(el).visibility,
        });
      });
    }
    const primaryStage = stages.find((s) =>
      (s.sel === '.ap-model-stage' || s.sel === '#orr') &&
      s.h > 0 && s.display !== 'none'
    ) || stages.find((s) => s.tag === 'canvas' && s.h > 0) || null;

    const overflowers = [];
    const vw = window.innerWidth;
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 && getComputedStyle(el).display !== 'none') {
        overflowers.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice) ? String(el.className).slice(0, 80) : '',
          id: el.id || '',
          w: Math.round(r.width),
        });
      }
    });
    overflowers.sort((a, b) => b.w - a.w);

    const orr = document.getElementById('orr');
    const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas, canvas');
    let webgl = null;
    if (canvas) {
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        webgl = {
          ok: !!(gl && !gl.isContextLost()),
          lost: !!(gl && gl.isContextLost()),
          vendor: gl ? (gl.getParameter(gl.VENDOR) || '') : '',
          renderer: gl ? (gl.getParameter(gl.RENDERER) || '') : '',
        };
      } catch (e) {
        webgl = { error: String(e.message || e) };
      }
    }

    const O = window.Orrery3D;
    const planets = (O && typeof O.getPlanets === 'function') ? O.getPlanets() : [];
    const plutoPlanet = planets.find((p) => p.id === 'pluto') || null;
    const extra = (O && typeof O.getExtraBodies === 'function') ? O.getExtraBodies() : null;
    const bodyIds = planets.map((p) => p.id);

    let sceneHits = [];
    let sceneWalked = false;
    try {
      const root = (orr && orr._engine) || O || null;
      const scene = root && (root.scene || root._scene);
      if (scene && typeof scene.traverse === 'function') {
        sceneWalked = true;
        scene.traverse((o) => {
          const n = (o.name || '') + '';
          const bid = (o.userData && o.userData.b && o.userData.b.id) || '';
          const uid = (o.userData && o.userData.id) || '';
          if (/pluto/i.test(n) || /pluto/i.test(bid) || /pluto/i.test(uid)) {
            const radius = o.geometry && o.geometry.parameters ? o.geometry.parameters.radius : null;
            sceneHits.push({
              name: n,
              type: o.type,
              vis: o.visible,
              id: bid || uid || '',
              kids: o.children ? o.children.length : 0,
              radius,
              pos: o.position ? [Number(o.position.x.toFixed(3)), Number(o.position.y.toFixed(3)), Number(o.position.z.toFixed(3))] : null,
            });
          }
        });
      }
    } catch (e) {
      sceneHits = { error: String(e.message || e) };
    }

    const domLabels = [];
    document.querySelectorAll('body *').forEach((el) => {
      const raw = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('data-body') || el.id)) || '';
      const t = (el.childNodes && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3)
        ? (el.textContent || '').replace(/\s+/g, ' ').trim()
        : '';
      const hit = /pluto/i.test(raw) || /^pluto$/i.test(t) || (el.id && /pluto/i.test(el.id));
      if (!hit) return;
      const r = el.getBoundingClientRect();
      domLabels.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        cls: String(el.className || '').slice(0, 80),
        text: (t || raw).slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
      });
    });

    return {
      title: document.title,
      url: location.href,
      scrollW: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      stages,
      primaryStage,
      overflowers: overflowers.slice(0, 12),
      orrEngine: orr ? orr.getAttribute('data-engine') : null,
      orrReady: !!(orr && orr._ready === true),
      canvas: canvas ? (() => {
        const r = canvas.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), cw: canvas.width, ch: canvas.height };
      })() : null,
      webgl,
      bodyIds,
      pluto: {
        inGetPlanets: !!plutoPlanet,
        planet: plutoPlanet ? {
          id: plutoPlanet.id,
          name: plutoPlanet.name,
          size: plutoPlanet.size,
          R: plutoPlanet.R,
          lon: plutoPlanet.lon,
          tex: plutoPlanet.tex,
        } : null,
        extraBodies: extra,
        extraHasPluto: Array.isArray(extra) && extra.indexOf('pluto') !== -1,
        sceneWalked,
        sceneHits,
        domLabels: domLabels.slice(0, 12),
      },
    };
  }, { STAGE_SELECTORS });

  await page.screenshot({ path: join(OUT, `${spec.id}.png`), fullPage: false }).catch((e) => errors.push(`shot: ${e.message}`));
  await page.screenshot({ path: join(OUT, `${spec.id}-full.png`), fullPage: true }).catch((e) => errors.push(`fullshot: ${e.message}`));

  results.push({
    id: spec.id,
    path: spec.path,
    status,
    errors: errors.slice(0, 8),
    ...measure,
  });
  await context.close();
  const stg = measure && measure.primaryStage;
  const p = measure && measure.pluto;
  console.log(
    `measured ${spec.id} status=${status} scrollW=${measure && measure.scrollW}` +
    ` stage=${stg ? (stg.w + 'x' + stg.h) : 'none'}` +
    ` orr=${measure && measure.orrEngine} ready=${measure && measure.orrReady}` +
    ` canvas=${measure && measure.canvas ? (measure.canvas.w + 'x' + measure.canvas.h + '@' + measure.canvas.cw + 'x' + measure.canvas.ch) : 'none'}` +
    ` webgl=${measure && measure.webgl && measure.webgl.ok}` +
    ` plutoPlanet=${!!(p && p.inGetPlanets)} lon=${p && p.planet ? p.planet.lon : 'n/a'}` +
    ` extraHasPluto=${p && p.extraHasPluto} sceneHits=${p && Array.isArray(p.sceneHits) ? p.sceneHits.length : 'err'}` +
    ` overflow=${measure && measure.overflowers ? measure.overflowers.length : '?'}`
  );
}

await browser.close();
const outFile = join(OUT, 'measure.json');
writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log('WROTE', outFile);
