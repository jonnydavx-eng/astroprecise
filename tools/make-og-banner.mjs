#!/usr/bin/env node
// make-og-banner.mjs — build the v576 OG image from the REAL orrery engine.
// No AI art, no fake UI: loads the live homepage on the standing preview
// (http://localhost:8790), waits for the photoreal Earth rest frame, captures
// the WebGL canvas via window.Orrery3D.captureFrame, then composites a
// 1200x630 card: Earth right, void left carrying the campaign line and the
// v576 lockup bottom-left.
//
// Output: website/img/og-banner-v576.jpg (JPEG q82, target <300KB)
// Run:    node tools/make-og-banner.mjs   (preview server must be up on :8790)
import { createRequire } from 'module';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, 'visual-check', 'package.json'));
const { chromium } = require('playwright');

const SITE = path.join(__dirname, '..', 'website');
const BASE = 'http://localhost:8790';

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

console.log('loading', BASE, '…');
await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });

// Wait for the WebGL engine + photoreal Earth textures, then let the intro
// settle into the Earth rest frame (~10s as measured on this machine).
await page.waitForFunction(() => window.Orrery3D && window.Orrery3D.isWebGL, null, { timeout: 45000 })
  .catch(() => { throw new Error('Orrery3D (WebGL) never appeared — is the preview up and WebGL available?'); });
await page.evaluate(() => window.Orrery3D.whenEarthReady && window.Orrery3D.whenEarthReady());
await page.waitForTimeout(10000);

// Capture the engine frame at 2x for compositing headroom.
const frameDataUrl = await page.evaluate(() => {
  const c = window.Orrery3D.captureFrame({ scale: 2 });
  return c ? c.toDataURL('image/png') : null;
});
if (!frameDataUrl) throw new Error('captureFrame returned null');
console.log('captured engine frame,', Math.round(frameDataUrl.length / 1024), 'KB dataURL');

// Composite card. Fonts come from the live site so the lockup and line use
// the shipped Cormorant Garamond, not a system fallback.
const markSvg = readFileSync(path.join(SITE, 'img', 'logo-mark.svg'), 'utf8');
const comp = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await comp.setContent(`<!doctype html>
<link rel="stylesheet" href="${BASE}/css/fonts.css">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#0C1016}
  .card{position:relative;width:1200px;height:630px}
  /* Engine frame: Earth on the right, faded into the void on the left */
  .frame{position:absolute;top:50%;right:-160px;transform:translateY(-50%);height:900px;width:900px;
         -webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,0.85) 30%,#000 55%);
         mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,0.85) 30%,#000 55%);}
  .copy{position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;max-width:560px}
  h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;color:#ECE6D8;
     font-size:76px;line-height:1.08;margin:0;letter-spacing:0.01em}
  .rule{width:120px;border:none;border-top:2px solid #C2A05E;opacity:0.7;margin:30px 0 0}
  .sub{font-family:'Cormorant Garamond',Georgia,serif;font-style:italic;font-weight:400;
       color:#BEB298;font-size:27px;margin-top:18px}
  .lockup{position:absolute;left:72px;bottom:44px;display:flex;align-items:center;gap:14px}
  .lockup svg{width:52px;height:52px;filter:drop-shadow(0 0 10px rgba(194,160,94,0.3))}
  .word{font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;line-height:1;letter-spacing:0.12em;
        text-transform:uppercase;color:#ECE6D8;font-weight:500}
  .word i{font-style:italic;font-weight:400;letter-spacing:0.055em;color:#CDAE6A;margin-left:0.26em}
</style>
<div class="card">
  <img class="frame" src="${frameDataUrl}">
  <div class="copy">
    <h1>You&rsquo;re not one&nbsp;of&nbsp;twelve.</h1>
    <hr class="rule">
    <div class="sub">The sky, live &mdash; your chart, exact.</div>
  </div>
  <div class="lockup">${markSvg}<span class="word">Astro<i>Precise</i></span></div>
</div>`);
await comp.evaluate(() => document.fonts.ready);
await comp.waitForTimeout(400);

const out = path.join(SITE, 'img', 'og-banner-v576.jpg');
const jpg = await comp.screenshot({ type: 'jpeg', quality: 82 });
writeFileSync(out, jpg);
console.log('wrote', out, Math.round(jpg.length / 1024), 'KB');
if (jpg.length > 300 * 1024) console.warn('WARNING: over 300KB budget — lower quality and re-run');

await browser.close();
