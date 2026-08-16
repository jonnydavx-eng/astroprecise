/**
 * v867 measure-only: natal A/B letter sprite CSS sizes on compatibility.html
 * 390x844 phone. Does not touch website/.
 */
import { chromium } from '../../tools/visual-check/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.env.AP_BASE || 'http://127.0.0.1:8790').replace(/\/+$/, '');
const OUT = process.env.AP_PHONE_OUT
  || 'C:\\Users\\jonny\\OneDrive\\astroprecise\\launch-output\\phone-pass-2026-08-14-v867';
mkdirSync(OUT, { recursive: true });

const HASH = '#a=1990-06-15&at=14:22&az=Europe/London&ac=London&an=A&b=1985-12-03&bt=08:40&bz=America/New_York&bc=New%20York&bn=B';
const URL = `${BASE}/compatibility.html?nosw=1${HASH}`;

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

let status = 0;
const resp = await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
status = resp ? resp.status() : 0;
await page.waitForSelector('body', { timeout: 12_000 }).catch(() => {});
await page.waitForFunction(() => {
  const orr = document.getElementById('orr');
  return !!(orr && (orr._ready === true || orr.getAttribute('data-engine')));
}, { timeout: 25_000 }).catch(() => {});
await page.waitForFunction(() => {
  const O = window.Orrery3D;
  if (!O || typeof O.getNatalClocks !== 'function') return false;
  const c = O.getNatalClocks();
  return !!(c && c.a && c.b && Number.isFinite(c.a.jd) && Number.isFinite(c.b.jd));
}, { timeout: 20_000 }).catch(() => {});
await page.waitForTimeout(2200);

const measure = await page.evaluate(async () => {
  const orr = document.getElementById('orr');
  const O = window.Orrery3D;
  const stage = document.querySelector('.ap-model-stage');
  const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas');
  const stageR = stage ? stage.getBoundingClientRect() : null;
  const canvasR = canvas ? canvas.getBoundingClientRect() : null;

  const spec = (() => {
    try { return O && typeof O.getNatalClocks === 'function' ? O.getNatalClocks() : null; }
    catch (e) { return { error: String(e) }; }
  })();

  let portrait = null;
  try { portrait = O && typeof O.isPortraitMode === 'function' ? O.isPortraitMode() : null; } catch (e) {}
  let camRadius = null;
  try { camRadius = O && typeof O.getCamRadius === 'function' ? O.getCamRadius() : null; } catch (e) {}
  let scaleLevel = null;
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
  const groups = uniq(natalGroups);

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
        // brass A #D8B46A vs ember B #FF6428
        if (avg.r > avg.g + 30 && avg.g < 160) who = 'b';
        else if (avg.r > 160 && avg.g > 120 && avg.b < 160) who = 'a';
      }
      return { w, h, lit, avg, who };
    } catch (e) {
      return { error: String(e.message || e) };
    }
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
    let corners = null;
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
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      const minY = Math.min(...ys), maxY = Math.max(...ys);
      corners = {
        w: maxX - minX,
        h: maxY - minY,
        left: minX,
        top: minY,
        right: maxX,
        bottom: maxY,
      };
      const ndc = pos.clone().project(camera);
      css = {
        fromScale: { w: cssW, h: cssH },
        fromCorners: { w: corners.w, h: corners.h },
        center: {
          x: (ndc.x * 0.5 + 0.5) * rect.width + rect.left,
          y: (-ndc.y * 0.5 + 0.5) * rect.height + rect.top,
        },
        dist,
        fov: camera.fov,
      };
    }

    let dataUrl = null;
    try {
      if (img && img.toDataURL) dataUrl = img.toDataURL('image/png');
    } catch (e) {}

    letterSprites.push({
      parent: parentName,
      visible: s.visible,
      worldScale: { x: sx, y: sy, z: s.scale.z },
      worldPos: { x: pos.x, y: pos.y, z: pos.z },
      tex,
      css,
      corners,
      dataUrl,
    });
  }

  // Also estimate from known 3.15 world height if no sprite hook worked
  let estimated = null;
  if (camRadius != null && rect) {
    const fov = (scaleLevel >= 2) ? 44 : 36;
    const worldH = 2 * Math.tan((fov * Math.PI / 180) / 2) * camRadius;
    const h = (3.15 / worldH) * rect.height;
    estimated = { fovAssumed: fov, camRadius, spriteWorldH: 3.15, cssH: h, cssW: h };
  }

  return {
    title: document.title,
    url: location.href,
    orrReady: !!(orr && orr._ready === true),
    engine: orr ? orr.getAttribute('data-engine') : null,
    webgl: !!(canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'))),
    portrait,
    camRadius,
    scaleLevel,
    spec,
    stage: stageR ? { w: Math.round(stageR.width), h: Math.round(stageR.height), top: Math.round(stageR.top), left: Math.round(stageR.left) } : null,
    canvas: canvasR ? { w: Math.round(canvasR.width), h: Math.round(canvasR.height), cw: canvas.width, ch: canvas.height } : null,
    inner: { w: window.innerWidth, h: window.innerHeight },
    spriteHook: { sprites: spr.length, cameras: cams.length, natalGroups: groups.length },
    letterSprites: letterSprites.map((s) => {
      const copy = { ...s };
      return copy;
    }),
    estimated,
    aDate: (document.getElementById('person1-date') || {}).value || '',
    bDate: (document.getElementById('person2-date') || {}).value || '',
    aTime: (document.getElementById('person1-time') || {}).value || '',
    bTime: (document.getElementById('person2-time') || {}).value || '',
  };
});

const stage = measure && measure.stage;
await page.screenshot({ path: join(OUT, 'compatibility.png'), fullPage: false });
if (stage && stage.w > 10 && stage.h > 10) {
  const clip = {
    x: Math.max(0, stage.left),
    y: Math.max(0, stage.top),
    width: Math.min(stage.w, 390 - Math.max(0, stage.left)),
    height: Math.min(stage.h, 844 - Math.max(0, stage.top)),
  };
  await page.screenshot({ path: join(OUT, 'compatibility-clocks.png'), clip });
} else {
  await page.screenshot({ path: join(OUT, 'compatibility-clocks.png'), fullPage: false });
}

// Persist letter texture crops if present
const letters = (measure && measure.letterSprites) || [];
letters.forEach((s, i) => {
  if (!s.dataUrl) return;
  const m = s.dataUrl.match(/^data:image\/png;base64,(.+)$/);
  if (!m) return;
  const who = (s.tex && s.tex.who) || String(i);
  writeFileSync(join(OUT, `letter-${who}.png`), Buffer.from(m[1], 'base64'));
  delete s.dataUrl;
});

const out = {
  status,
  errors: errors.slice(0, 8),
  ...measure,
  letterSprites: letters.map((s) => {
    const { dataUrl, ...rest } = s;
    return rest;
  }),
  shots: {
    compatibility: join(OUT, 'compatibility.png'),
    clocks: join(OUT, 'compatibility-clocks.png'),
  },
};

writeFileSync(join(OUT, 'letter-sizes.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  status,
  orrReady: measure && measure.orrReady,
  engine: measure && measure.engine,
  webgl: measure && measure.webgl,
  stage: measure && measure.stage,
  camRadius: measure && measure.camRadius,
  scaleLevel: measure && measure.scaleLevel,
  portrait: measure && measure.portrait,
  spec: measure && measure.spec,
  spriteHook: measure && measure.spriteHook,
  letters: (measure && measure.letterSprites || []).map((s) => ({
    who: s.tex && s.tex.who,
    vis: s.visible,
    world: s.worldScale,
    cssScale: s.css && s.css.fromScale,
    cssCorners: s.css && s.css.fromCorners,
    tex: s.tex,
  })),
  estimated: measure && measure.estimated,
  errors: errors.slice(0, 4),
}, null, 2));
console.log('WROTE', join(OUT, 'letter-sizes.json'));

await context.close();
await browser.close();
