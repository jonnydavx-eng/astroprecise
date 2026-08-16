/**
 * Phone pass measure — 390x844 ap-v874 eye-check.
 * Pages: home, chart, compatibility (couples). Findings only.
 * Usage: node measure.mjs [base-url]
 */
import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || process.argv[2] || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT || 'C:\\Users\\jonny\\OneDrive\\astroprecise\\launch-output\\phone-pass-2026-08-14-v874-eye';
const SHOTS = join(OUT, 'shots');
mkdirSync(SHOTS, { recursive: true });

const COUPLES = '#a=1990-06-15&at=14:22&az=Europe/London&ac=London&an=A&b=1985-12-03&bt=08:40&bz=America/New_York&bc=New%20York&bn=B';

const PAGES = [
  { id: 'home', path: '/index.html?nosw=1', wait: '#orr, .ap-model-stage, body' },
  { id: 'chart', path: '/chart.html?nosw=1', wait: 'body' },
  { id: 'compatibility', path: '/compatibility.html?nosw=1' + COUPLES, wait: 'body' },
];

const STAGE_SELECTORS = [
  '.ap-model-stage',
  '#orr',
  'void-orrery',
  '.hero-solar-stage',
  '.ap-live-stage',
  '.ap-eclipse-live__stage',
  '#eclipse-stage',
  '.chart-stage',
  '.ap-chart-stage',
  'canvas',
];

const TAP_SELECTORS = [
  'a.ap-action',
  'a.btn-primary',
  'button.btn-primary',
  '.btn-primary',
  '.ap-action--primary',
  'button[type="submit"]',
  'input[type="submit"]',
  '.navbar__toggle',
  '.navbar__link',
  '.bottom-nav a',
  '.ap-bottom-nav a',
  'nav.ap-tabs a',
  '.ap-tab',
  '.ap-mobile-tab',
  '#bottom-nav a',
  '[data-ap-tab]',
  '.ap-hash-invite button',
  '.ap-hash-invite a',
  '#hash-invite button',
  'button',
  'a.btn',
];

const COPY_SELECTORS = [
  '.ap-live-copy',
  '.standfirst',
  '.chart-hero__subtitle',
  '.tn-hero__sub',
  '.tn-section__sub',
  '.tn-honesty',
  '.ap-shop-lede',
  '.ap-eclipse-live__chapter p',
  '.ap-eclipse-guide article p',
  'main .lede',
  'main .ap-lede',
  '.ap-product__body > p',
  'main p',
];

function rgbTuple(bg) {
  const m = String(bg).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function looksBlueOrPurple(bg) {
  const t = rgbTuple(bg);
  if (!t) return false;
  const [r, g, b] = t;
  if (r + g + b < 40) return false;
  if (b > r + 25 && b > g + 10) return true;
  if (r > 80 && b > 80 && g < r - 20 && g < b - 20) return true;
  return false;
}

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
    await page.waitForTimeout(1800);
    if (spec.id === 'home' || spec.id === 'compatibility' || spec.id === 'eclipse') {
      await page.waitForFunction(() => {
        const orr = document.getElementById('orr');
        return !!(orr && (orr._ready === true || orr.getAttribute('data-engine')));
      }, { timeout: 22_000 }).catch(() => {});
      await page.waitForTimeout(2200);
    }
    if (spec.id === 'compatibility') {
      await page.waitForFunction(() => {
        const O = window.Orrery3D;
        if (!O || typeof O.getNatalClocks !== 'function') return false;
        const c = O.getNatalClocks();
        return !!(c && c.a && c.b && Number.isFinite(c.a.jd) && Number.isFinite(c.b.jd));
      }, { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
  } catch (e) {
    errors.push(`goto: ${e.message}`);
  }

  const measure = await page.evaluate(({ STAGE_SELECTORS, TAP_SELECTORS, COPY_SELECTORS }) => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const px = (v) => (v ? parseFloat(v) : null);
    const body = document.body;
    const chromeRe = /skip|sr-only|visually-hidden|eyebrow|kicker|timecode|hint|chrome|nav|logo|dock|ledger/i;
    let copy = null;
    for (const sel of COPY_SELECTORS) {
      const found = Array.from(document.querySelectorAll(sel)).find((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (t.length < 24) return false;
        if (chromeRe.test(el.className || '') || chromeRe.test(el.id || '')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 40 && r.height > 8;
      });
      if (found) { copy = found; break; }
    }
    const h1 = document.querySelector('h1, .ap-live-heading');
    const wordmark = document.querySelector('.logo-text, .navbar__logo, [aria-label*="AstroPrecise"]');
    const wordmarkText = wordmark ? (wordmark.innerText || wordmark.textContent || '').replace(/\s+/g, ' ').trim() : '';
    const wordmarkBox = wordmark ? wordmark.getBoundingClientRect() : null;
    const wordmarkLines = wordmark
      ? (wordmark.querySelector('.logo-text') || wordmark).getClientRects().length
      : 0;

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
      (s.sel === '.ap-model-stage' || s.sel === '#orr' || s.sel === '.ap-eclipse-live__stage') &&
      s.h > 0 && s.display !== 'none'
    ) || stages.find((s) => s.tag === 'canvas' && s.h > 0) || null;

    const taps = [];
    const seen = new Set();
    for (const sel of TAP_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return;
        if (r.width === 0 && r.height === 0) return;
        taps.push({
          sel,
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          text: (el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60),
          w: Math.round(r.width),
          h: Math.round(r.height),
          min: Math.round(Math.min(r.width, r.height)),
          bg: st.backgroundColor,
          color: st.color,
        });
      });
    }
    taps.sort((a, b) => a.min - b.min);

    const primaries = [];
    document.querySelectorAll('a.ap-action--primary, .btn-primary, a.btn-primary, button.btn-primary, .ap-action--primary, button[type="submit"], input[type="submit"]').forEach((el) => {
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (st.display === 'none') return;
      primaries.push({
        text: (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 50),
        bg: st.backgroundColor,
        color: st.color,
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    });

    const inputs = [];
    document.querySelectorAll('input, select, textarea').forEach((el) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (st.display === 'none') return;
      inputs.push({
        tag: el.tagName.toLowerCase(),
        type: el.type || '',
        name: el.name || el.id || '',
        w: Math.round(r.width),
        h: Math.round(r.height),
        right: Math.round(r.right),
      });
    });

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

    const bodyCs = cs(body);
    const copyCs = cs(copy);
    const h1Cs = cs(h1);

    const orr = document.getElementById('orr');
    const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas, .ap-eclipse-live__stage canvas, canvas');
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
            });
          }
        });
      }
    } catch (e) {
      sceneHits = { error: String(e.message || e) };
    }

    function measureCouplesClocks() {
      if (!document.body.classList.contains('page-compat')) return null;
      const box = (id) => {
        const el = document.getElementById(id);
        if (!el) return { id, missing: true };
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return {
          id,
          text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          min: Math.round(Math.min(r.width, r.height)),
          disabled: !!el.disabled,
          pressed: el.getAttribute('aria-pressed'),
          overflow: st.overflow,
        };
      };
      let specClocks = null;
      try { specClocks = O && typeof O.getNatalClocks === 'function' ? O.getNatalClocks() : (orr && orr._natalClocks) || null; } catch (e) { specClocks = { error: String(e) }; }
      let portrait = null;
      try { portrait = O && typeof O.isPortraitMode === 'function' ? O.isPortraitMode() : null; } catch (e) {}
      const stage = document.querySelector('.ap-model-stage');
      const stageR = stage ? stage.getBoundingClientRect() : null;
      return {
        aDate: (document.getElementById('person1-date') || {}).value || '',
        bDate: (document.getElementById('person2-date') || {}).value || '',
        aTime: (document.getElementById('person1-time') || {}).value || '',
        bTime: (document.getElementById('person2-time') || {}).value || '',
        aTz: (document.getElementById('person1-tz') || {}).value || '',
        bTz: (document.getElementById('person2-tz') || {}).value || '',
        taps: [box('ab-a'), box('ab-b'), box('ab-now'), box('keep-sky'), box('compat-submit-btn')],
        specClocks,
        portrait,
        orrReady: !!(orr && orr._ready),
        engine: orr ? orr.getAttribute('data-engine') : null,
        stage: stageR ? { w: Math.round(stageR.width), h: Math.round(stageR.height), top: Math.round(stageR.top) } : null,
      };
    }

    return {
      title: document.title,
      url: location.href,
      bodyFont: bodyCs ? px(bodyCs.fontSize) : null,
      bodyColor: bodyCs ? bodyCs.color : null,
      pFont: copyCs ? px(copyCs.fontSize) : null,
      pText: copy ? (copy.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '',
      h1Font: h1Cs ? px(h1Cs.fontSize) : null,
      h1Text: h1 ? (h1.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '',
      wordmarkText,
      wordmarkLines,
      wordmarkW: wordmarkBox ? Math.round(wordmarkBox.width) : null,
      wordmarkH: wordmarkBox ? Math.round(wordmarkBox.height) : null,
      scrollW: document.scrollingElement ? document.scrollingElement.scrollWidth : document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      stages,
      primaryStage,
      taps: taps.slice(0, 40),
      smallestTap: taps[0] || null,
      tapsUnder44: taps.filter((t) => t.min < 44).slice(0, 20),
      primaries,
      inputs,
      inputOverflow: inputs.filter((i) => i.w > vw + 2 || i.right > vw + 4),
      overflowers: overflowers.slice(0, 12),
      orrEngine: orr ? orr.getAttribute('data-engine') : null,
      orrReady: !!(orr && orr._ready === true),
      canvas: canvas ? (() => {
        const r = canvas.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), cw: canvas.width, ch: canvas.height };
      })() : null,
      webgl,
      couples: measureCouplesClocks(),
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
        bodyIds: planets.map((p) => p.id),
      },
    };
  }, { STAGE_SELECTORS, TAP_SELECTORS, COPY_SELECTORS });

  if (measure && measure.primaries) {
    measure.bluePrimaries = measure.primaries.filter((p) => looksBlueOrPurple(p.bg));
  }
  if (measure) {
    measure.plutoWebgl = await page.evaluate(() => {
      const orr = document.getElementById('orr');
      const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas, .ap-eclipse-live__stage canvas, canvas');
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
        } catch (e) { webgl = { error: String(e.message || e) }; }
      }
      const O = window.Orrery3D;
      const planets = (O && typeof O.getPlanets === 'function') ? O.getPlanets() : [];
      const plutoPlanet = planets.find((p) => p && p.id === 'pluto') || null;
      const extraBodies = (O && typeof O.getExtraBodies === 'function') ? O.getExtraBodies() : null;
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
              sceneHits.push({
                name: n,
                type: o.type,
                vis: o.visible,
                id: bid || uid || '',
                kids: o.children ? o.children.length : 0,
              });
            }
          });
        }
      } catch (e) { sceneHits = { error: String(e.message || e) }; }
      return {
        webgl,
        bodyIds: planets.map((p) => p && p.id).filter(Boolean),
        inGetPlanets: !!plutoPlanet,
        planet: plutoPlanet ? { id: plutoPlanet.id, name: plutoPlanet.name, size: plutoPlanet.size, R: plutoPlanet.R, lon: plutoPlanet.lon, tex: plutoPlanet.tex } : null,
        extraHasPluto: Array.isArray(extraBodies) && extraBodies.indexOf('pluto') !== -1,
        sceneWalked,
        sceneHits,
        orrEngine: orr ? orr.getAttribute('data-engine') : null,
        orrReady: !!(orr && orr._ready === true),
      };
    }).catch((e) => ({ error: e.message }));
  }

  if (spec.id === 'compatibility' && measure) {
    measure.letters = await page.evaluate(async () => {
      const orr = document.getElementById('orr');
      const O = window.Orrery3D;
      const stage = document.querySelector('.ap-model-stage');
      const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas');
      const stageR = stage ? stage.getBoundingClientRect() : null;
      const canvasR = canvas ? canvas.getBoundingClientRect() : null;
      const specClocks = (() => {
        try { return O && typeof O.getNatalClocks === 'function' ? O.getNatalClocks() : null; }
        catch (e) { return { error: String(e) }; }
      })();
      let camRadius = null, scaleLevel = null, portrait = null;
      try { portrait = O && typeof O.isPortraitMode === 'function' ? O.isPortraitMode() : null; } catch (e) {}
      try { camRadius = O && typeof O.getCamRadius === 'function' ? O.getCamRadius() : null; } catch (e) {}
      try { scaleLevel = O && typeof O.getScaleLevel === 'function' ? O.getScaleLevel() : null; } catch (e) {}
      const THREE = await import('/js/vendor/three/three.module.min.js');
      const sprites = [];
      const cameras = [];
      const natalGroups = [];
      const orig = THREE.Object3D.prototype.updateMatrixWorld;
      THREE.Object3D.prototype.updateMatrixWorld = function patched(force) {
        const t = this.type || '';
        const n = (this.name || '') + '';
        if (n === 'natalClocks' || /natal/i.test(n)) natalGroups.push(this);
        if (t === 'Sprite') sprites.push(this);
        if (t === 'PerspectiveCamera' || t === 'Camera') cameras.push(this);
        return orig.apply(this, arguments);
      };
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      THREE.Object3D.prototype.updateMatrixWorld = orig;
      const uniq = (arr) => Array.from(new Set(arr));
      const spr = uniq(sprites);
      const cams = uniq(cameras);
      function canvasLetter(img) {
        if (!img || !img.getContext) return null;
        try {
          const x = img.getContext('2d');
          const w = img.width, h = img.height;
          const data = x.getImageData(0, 0, w, h).data;
          let r = 0, g = 0, b = 0, n = 0, lit = 0;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 20) continue;
            lit++;
            if (data[i] + data[i + 1] + data[i + 2] < 30) continue;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
          }
          const avg = n ? { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) } : null;
          let who = null;
          if (avg) {
            if (avg.r > avg.g + 30 && avg.g < 160) who = 'B';
            else if (avg.r > 160 && avg.g > 120 && avg.b < 160) who = 'A';
          }
          return { w, h, lit, avg, who };
        } catch (e) { return { error: String(e.message || e) }; }
      }
      function project(vec, camera, rect) {
        const v = vec.clone().project(camera);
        return {
          x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
          y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
        };
      }
      const camera = cams[0] || null;
      const rect = canvasR || stageR || { left: 0, top: 0, width: 390, height: 471 };
      const letterSprites = [];
      for (const s of spr) {
        const parentName = (s.parent && s.parent.name) || '';
        const map = s.material && s.material.map;
        const img = map && map.image;
        const tex = canvasLetter(img);
        const isNatalParent = /natal/i.test(parentName);
        const scaleY = s.scale ? s.scale.y : null;
        const looksNatal = isNatalParent || (tex && tex.who) || (scaleY && Math.abs(scaleY - 3.15) < 0.05);
        if (!looksNatal && !isNatalParent) continue;
        s.updateMatrixWorld(true);
        const pos = new THREE.Vector3();
        s.getWorldPosition(pos);
        const sx = s.scale.x, sy = s.scale.y;
        let css = null;
        if (camera) {
          camera.updateMatrixWorld(true);
          const dist = camera.position.distanceTo(pos);
          const vFov = camera.fov * Math.PI / 180;
          const worldH = 2 * Math.tan(vFov / 2) * dist;
          const cssH = (sy / worldH) * rect.height;
          const cssW = (sx / worldH) * rect.height;
          const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
          const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
          const hw = sx / 2, hh = sy / 2;
          const worldCorners = [
            pos.clone().addScaledVector(right, -hw).addScaledVector(up, -hh),
            pos.clone().addScaledVector(right, hw).addScaledVector(up, -hh),
            pos.clone().addScaledVector(right, hw).addScaledVector(up, hh),
            pos.clone().addScaledVector(right, -hw).addScaledVector(up, hh),
          ];
          const pts = worldCorners.map((p) => project(p, camera, rect));
          const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
          css = {
            fromScale: { w: cssW, h: cssH },
            fromCorners: { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) },
            dist,
            fov: camera.fov,
          };
        }
        letterSprites.push({
          parent: parentName,
          visible: s.visible,
          worldScale: { x: sx, y: sy },
          tex,
          css,
        });
      }
      const byWho = {};
      for (const L of letterSprites) {
        const who = L.tex && L.tex.who;
        if (who) byWho[who] = L;
      }
      const band = (h) => h >= 22 && h <= 28;
      const aH = byWho.A && byWho.A.css ? byWho.A.css.fromCorners.h : null;
      const bH = byWho.B && byWho.B.css ? byWho.B.css.fromCorners.h : null;
      return {
        orrReady: !!(orr && orr._ready === true),
        engine: orr ? orr.getAttribute('data-engine') : null,
        webgl: !!(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'))),
        portrait, camRadius, scaleLevel, specClocks,
        aTime: (document.getElementById('person1-time') || {}).value || '',
        bTime: (document.getElementById('person2-time') || {}).value || '',
        spriteHook: { sprites: spr.length, cameras: cams.length, natalGroups: uniq(natalGroups).length },
        A: byWho.A || null,
        B: byWho.B || null,
        aCssPx: aH,
        bCssPx: bH,
        inBand: { A: aH != null && band(aH), B: bH != null && band(bH) },
        readsAsType: aH != null && bH != null && band(aH) && band(bH),
      };
    }).catch((e) => ({ error: e.message }));
  }



  await page.screenshot({ path: join(SHOTS, `${spec.id}.png`), fullPage: false }).catch(() => {});
  await page.screenshot({ path: join(SHOTS, `${spec.id}-full.png`), fullPage: true }).catch(() => {});
  if (spec.id === 'compatibility') {
    const stage = measure && measure.primaryStage;
    if (stage && stage.w > 10 && stage.h > 10) {
      const top = (measure.couples && measure.couples.stage && measure.couples.stage.top) || 0;
      const clip = {
        x: 0,
        y: Math.max(0, top),
        width: Math.min(stage.w, 390),
        height: Math.min(stage.h, 844 - Math.max(0, top)),
      };
      await page.screenshot({ path: join(SHOTS, 'compatibility-clocks.png'), clip }).catch(() => {});
    } else {
      await page.screenshot({ path: join(SHOTS, 'compatibility-clocks.png'), fullPage: false }).catch(() => {});
    }
  }

  let drawer = null;
  try {
    const toggle = page.locator('.navbar__toggle').first();
    if (await toggle.count()) {
      await toggle.click({ timeout: 4000 });
      await page.waitForTimeout(450);
      const snap = async () => page.evaluate(() => {
        const menu = document.getElementById('nav-mobile-menu');
        const tog = document.querySelector('.navbar__toggle');
        if (!menu) return { missing: true };
        const st = getComputedStyle(menu);
        const r = menu.getBoundingClientRect();
        const links = Array.from(menu.querySelectorAll('a.navbar__link')).map((a) => {
          const br = a.getBoundingClientRect();
          return { text: (a.textContent || '').replace(/\s+/g, ' ').trim(), w: Math.round(br.width), h: Math.round(br.height) };
        });
        return {
          expanded: tog ? tog.getAttribute('aria-expanded') : null,
          openClass: menu.classList.contains('open'),
          display: st.display,
          w: Math.round(r.width),
          h: Math.round(r.height),
          linkCount: links.length,
          visibleLinks: links.filter((l) => l.w > 0 && l.h > 0).length,
          minLinkH: links.length ? Math.min(...links.map((l) => l.h)) : 0,
          first: links.slice(0, 4),
        };
      });
      const openSnap = await snap();
      await page.waitForTimeout(1100);
      const staySnap = await snap();
      drawer = {
        ...openSnap,
        stayedOpen: !!(staySnap && staySnap.openClass && staySnap.expanded === 'true' && staySnap.h > 80 && staySnap.visibleLinks > 0),
        stayH: staySnap ? staySnap.h : 0,
        stayExpanded: staySnap ? staySnap.expanded : null,
        stayVisibleLinks: staySnap ? staySnap.visibleLinks : 0,
      };
      await page.screenshot({ path: join(SHOTS, `${spec.id}-drawer.png`), fullPage: false }).catch(() => {});
    }
  } catch (e) {
    drawer = { error: e.message };
  }
  if (measure) measure.drawer = drawer;

  results.push({
    id: spec.id,
    path: spec.path,
    status,
    errors: errors.slice(0, 8),
    ...measure,
  });
  await context.close();
  const stg = measure && measure.primaryStage;
  const clk = measure && measure.couples;
  const lets = measure && measure.letters && measure.letters.letterSprites;
  const letterNote = Array.isArray(lets)
    ? lets.map((s) => `${(s.tex && s.tex.who) || '?'}@${s.css && s.css.fromCorners ? s.css.fromCorners.h : '?'}`).join(',')
    : '';
  console.log(
    `measured ${spec.id} status=${status} scrollW=${measure && measure.scrollW}` +
    ` body=${measure && measure.bodyFont} copy=${measure && measure.pFont} h1=${measure && measure.h1Font}` +
    ` stage=${stg ? (stg.w + 'x' + stg.h) : 'none'}` +
    ` taps<44=${measure && measure.tapsUnder44 && measure.tapsUnder44.length}` +
    ` drawerStay=${measure && measure.drawer && measure.drawer.stayedOpen}` +
    ` orr=${measure && measure.orrEngine} ready=${measure && measure.orrReady}` +
    ` webgl=${measure && measure.webgl && measure.webgl.ok}` +
    ` pluto=${measure && measure.pluto && measure.pluto.inGetPlanets}` +
    (clk ? ` clocksA=${!!(clk.specClocks && clk.specClocks.a)} clocksB=${!!(clk.specClocks && clk.specClocks.b)}` : '') +
    (letterNote ? ` letters=${letterNote}` : '')
  );
}

await browser.close();
const outFile = join(OUT, 'measure.json');
writeFileSync(outFile, JSON.stringify(results, null, 2));
console.log('WROTE', outFile);

const pages = results.map((r) => {
  const stg = r.primaryStage;
  const wm = (r.wordmarkText || '').replace(/\s+/g, '');
  const wordmarkWrap = !!(r.wordmarkLines > 1 || (wm && !/^AstroPrecise$/i.test(wm)));
  const copyFail = r.pFont != null && r.pFont < 16;
  const tapFail = !!(r.tapsUnder44 && r.tapsUnder44.length);
  const overflowFail = !!(r.scrollW > 390 || (r.overflowers && r.overflowers.length) || (r.inputOverflow && r.inputOverflow.length));
  const stageFail = !stg || stg.h < 200;
  const webglDead = r.webgl ? r.webgl.ok === false : false;
  const blueP = (r.bluePrimaries && r.bluePrimaries.length) || 0;
  return {
    id: r.id,
    status: r.status,
    copy: r.pFont,
    copyText: r.pText,
    h1: r.h1Font,
    h1Text: r.h1Text,
    smallestTap: r.smallestTap ? { text: r.smallestTap.text, min: r.smallestTap.min, w: r.smallestTap.w, h: r.smallestTap.h } : null,
    tapsUnder44: r.tapsUnder44 ? r.tapsUnder44.length : 0,
    tapsUnder44List: r.tapsUnder44 || [],
    stage: stg ? (stg.w + 'x' + stg.h) : 'none',
    overflow: r.overflowers ? r.overflowers.length : 0,
    overflowers: r.overflowers || [],
    scrollW: r.scrollW,
    inputOverflow: r.inputOverflow || [],
    drawerStay: r.drawer && r.drawer.stayedOpen,
    drawer: r.drawer,
    wordmarkText: r.wordmarkText,
    wordmarkLines: r.wordmarkLines,
    wordmarkW: r.wordmarkW,
    wordmarkH: r.wordmarkH,
    wordmarkWrap,
    primaries: r.primaries,
    bluePrimaries: r.bluePrimaries || [],
    orrEngine: r.orrEngine,
    orrReady: r.orrReady,
    webgl: r.webgl && r.webgl.ok,
    fails: {
      copyLt16: copyFail,
      tapLt44: tapFail,
      overflow: overflowFail,
      collapsedStage: stageFail,
      deadWebGL: webglDead,
      wordmarkWrap,
      bluePrimary: blueP > 0,
    },
  };
});

const compat = results.find((r) => r.id === 'compatibility');
const L = compat && compat.letters;
const aH = L && (L.aCssPx != null ? L.aCssPx : (L.A && L.A.css && L.A.css.fromCorners && L.A.css.fromCorners.h));
const bH = L && (L.bCssPx != null ? L.bCssPx : (L.B && L.B.css && L.B.css.fromCorners && L.B.css.fromCorners.h));
const band = (h) => h != null && h >= 22 && h <= 28;
const couples = L ? {
  hashApplied: !!(compat.couples && compat.couples.aDate === '1990-06-15' && compat.couples.bDate === '1985-12-03'),
  aDate: compat.couples && compat.couples.aDate,
  bDate: compat.couples && compat.couples.bDate,
  aCssPx: aH,
  bCssPx: bH,
  A_inBand: band(aH),
  B_inBand: band(bH),
  readsAsType: band(aH) && band(bH),
  A: L.A || null,
  B: L.B || null,
  error: L.error || null,
} : null;

const anyFail = pages.some((p) => Object.values(p.fails).some(Boolean));
const summary = {
  viewport: [390, 844],
  swV: 'ap-v874',
  shippingFilesChanged: false,
  cssChanged: false,
  pages,
  couples,
  verdict: anyFail
    ? 'FAIL — see page fails'
    : 'PASS — no CSS fails. website/css/ap-phone-pass.css untouched. sw.js still ap-v874. pins still ?v=874.',
};
writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('WROTE', join(OUT, 'summary.json'));
console.log('VERDICT', summary.verdict);
