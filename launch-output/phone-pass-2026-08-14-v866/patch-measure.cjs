const fs = require('fs');
const p = 'C:/Users/jonny/OneDrive/astroprecise/launch-output/phone-pass-2026-08-14-v866/measure.mjs';
let t = fs.readFileSync(p, 'utf8');

const oldWait = "    await page.waitForSelector(spec.wait, { timeout: 12_000 }).catch(() => {});\n    await page.waitForTimeout(1800);";
const newWait = "    await page.waitForSelector(spec.wait, { timeout: 12_000 }).catch(() => {});\n    await page.waitForTimeout(1800);\n    if (spec.id === 'compatibility') {\n      await page.waitForFunction(() => {\n        const orr = document.getElementById('orr');\n        return !!(orr && (orr._ready === true || orr.getAttribute('data-engine')));\n      }, { timeout: 20_000 }).catch(() => {});\n      await page.waitForTimeout(2200);\n    }";
if (!t.includes(oldWait)) throw new Error('wait block not found');
t = t.replace(oldWait, newWait);

const oldCanvas = "      canvas: (() => {\n        const c = document.querySelector('#orr canvas, .ap-model-stage canvas, .ap-eclipse-live__stage canvas, canvas');\n        if (!c) return null;\n        const r = c.getBoundingClientRect();\n        return { w: Math.round(r.width), h: Math.round(r.height), cw: c.width, ch: c.height };\n      })(),\n    };";
const newCanvas = `      canvas: (() => {
        const c = document.querySelector('#orr canvas, .ap-model-stage canvas, .ap-eclipse-live__stage canvas, canvas');
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), cw: c.width, ch: c.height };
      })(),
      couples: measureCouplesClocks(),
    };
    function measureCouplesClocks() {
      if (!document.body.classList.contains('page-compat')) return null;
      const box = (id) => {
        const el = document.getElementById(id);
        if (!el) return { id, missing: true };
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return {
          id,
          text: (el.innerText || '').replace(/\\s+/g, ' ').trim(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          min: Math.round(Math.min(r.width, r.height)),
          top: Math.round(r.top),
          left: Math.round(r.left),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom),
          disabled: !!el.disabled,
          pressed: el.getAttribute('aria-pressed'),
          overflow: st.overflow,
        };
      };
      const orr = document.getElementById('orr');
      const O = window.Orrery3D;
      let specClocks = null;
      try { specClocks = O && typeof O.getNatalClocks === 'function' ? O.getNatalClocks() : (orr && orr._natalClocks) || null; } catch (e) { specClocks = { error: String(e) }; }
      let portrait = null;
      try { portrait = O && typeof O.isPortraitMode === 'function' ? O.isPortraitMode() : null; } catch (e) {}
      const stage = document.querySelector('.ap-model-stage');
      const stageR = stage ? stage.getBoundingClientRect() : null;
      const canvas = document.querySelector('#orr canvas, .ap-model-stage canvas');
      let pixels = null;
      if (canvas) {
        try {
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          if (gl) {
            const w = Math.min(canvas.width, 512);
            const h = Math.min(canvas.height, 512);
            const sx = Math.max(0, Math.floor((canvas.width - w) / 2));
            const sy = Math.max(0, Math.floor((canvas.height - h) / 2));
            const data = new Uint8Array(w * h * 4);
            gl.readPixels(sx, sy, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
            let brass = 0, ember = 0, lit = 0;
            for (let i = 0; i < data.length; i += 16) {
              const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
              if (a < 8 || r + g + b < 20) continue;
              lit++;
              if (r > 150 && g > 110 && g < 210 && b < 140 && r > b + 40 && Math.abs(r - g) < 80) brass++;
              if (r > 180 && g < 140 && b < 90 && r > g + 40) ember++;
            }
            pixels = { sampled: w + 'x' + h, lit, brass, ember };
          }
        } catch (e) { pixels = { error: String(e.message || e) }; }
      }
      let sceneClocks = null;
      try {
        const root = orr && orr._engine;
        const scene = root && (root.scene || root._scene);
        if (scene && scene.traverse) {
          const found = [];
          scene.traverse((o) => {
            const n = (o.name || '') + '';
            if (/natal|clock/i.test(n) || (o.userData && o.userData.natal)) {
              found.push({ name: n, type: o.type, vis: o.visible, kids: o.children ? o.children.length : 0 });
            }
          });
          sceneClocks = found;
        }
      } catch (e) { sceneClocks = { error: String(e.message || e) }; }
      const labels = [];
      document.querySelectorAll('[class*=\"clock\"], [data-clock], .ap-natal-label, .ap-clock-label').forEach((el) => {
        const r = el.getBoundingClientRect();
        labels.push({
          cls: String(el.className || '').slice(0, 80),
          text: (el.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          left: Math.round(r.left),
          clipped: r.height < 2 || r.width < 2,
        });
      });
      return {
        aDate: (document.getElementById('person1-date') || {}).value || '',
        bDate: (document.getElementById('person2-date') || {}).value || '',
        aTz: (document.getElementById('person1-tz') || {}).value || '',
        bTz: (document.getElementById('person2-tz') || {}).value || '',
        abNote: (document.getElementById('ap-ab-note') || {}).textContent || '',
        taps: [box('ab-a'), box('ab-b'), box('ab-now'), box('keep-sky'), box('compat-submit-btn')],
        specClocks,
        portrait,
        orrReady: !!(orr && orr._ready),
        engine: orr ? orr.getAttribute('data-engine') : null,
        stage: stageR ? { w: Math.round(stageR.width), h: Math.round(stageR.height), top: Math.round(stageR.top), overflow: getComputedStyle(stage).overflow } : null,
        pixels,
        sceneClocks,
        domLabels: labels,
      };
    }
`;
if (!t.includes(oldCanvas)) throw new Error('canvas block not found');
t = t.replace(oldCanvas, newCanvas);

const oldShot = "  await page.screenshot({ path: join(SHOTS, `${spec.id}.png`), fullPage: false }).catch(() => {});\n  await page.screenshot({ path: join(SHOTS, `${spec.id}-full.png`), fullPage: true }).catch(() => {});";
const newShot = "  await page.screenshot({ path: join(SHOTS, `${spec.id}.png`), fullPage: false }).catch(() => {});\n  await page.screenshot({ path: join(SHOTS, `${spec.id}-full.png`), fullPage: true }).catch(() => {});\n  if (spec.id === 'compatibility') {\n    await page.screenshot({ path: join(SHOTS, 'compatibility-clocks.png'), fullPage: false }).catch(() => {});\n  }";
if (!t.includes(oldShot)) throw new Error('shot block not found');
t = t.replace(oldShot, newShot);

const oldLog = "  console.log(`measured ${spec.id} status=${status} scrollW=${measure?.scrollW} body=${measure?.bodyFont} copy=${measure?.pFont} h1=${measure?.h1Font} stage=${stg ? (stg.w + 'x' + stg.h) : 'none'} taps<44=${measure?.tapsUnder44?.length} drawerStay=${measure?.drawer?.stayedOpen} orr=${measure?.orrEngine}`);";
const newLog = "  const clk = measure?.couples;\n  console.log(`measured ${spec.id} status=${status} scrollW=${measure?.scrollW} body=${measure?.bodyFont} copy=${measure?.pFont} h1=${measure?.h1Font} stage=${stg ? (stg.w + 'x' + stg.h) : 'none'} taps<44=${measure?.tapsUnder44?.length} drawerStay=${measure?.drawer?.stayedOpen} orr=${measure?.orrEngine}` + (clk ? ` clocksA=${!!clk.specClocks?.a} clocksB=${!!clk.specClocks?.b} brassPx=${clk.pixels?.brass} emberPx=${clk.pixels?.ember}` : ''));";
if (!t.includes(oldLog)) throw new Error('log block not found');
t = t.replace(oldLog, newLog);

fs.writeFileSync(p, t);
console.log('patched ok', t.length);
