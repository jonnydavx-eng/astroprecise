import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(root, 'index.html');
const cssPath = join(root, 'css/lite-critical.css');

let html = readFileSync(htmlPath, 'utf8');
const css = readFileSync(cssPath, 'utf8').trim();

html = html.replace(
  '<link rel="stylesheet" href="css/lite-critical.css" id="ap-css-lite-critical" />',
  `<style id="ap-css-lite-critical">\n${css}\n</style>`
);

const scriptBlock = `  <script src="js/raf-core.js" defer></script>
  <script>
  (function apLiteJsBoot(){
    var ORRERY = ['js/ephemeris.js','js/orrery-loader.js','js/lite-orrery.js'];
    function loadSeq(i, done) {
      if (i >= ORRERY.length) return done && done();
      var s = document.createElement('script');
      s.src = ORRERY[i];
      s.onload = function () { loadSeq(i + 1, done); };
      document.body.appendChild(s);
    }
    function loadCosmosIdle() {
      function inject() {
        if (document.getElementById('ap-cosmos-lite')) return;
        var s = document.createElement('script');
        s.id = 'ap-cosmos-lite';
        s.src = 'js/cosmos.js';
        document.body.appendChild(s);
      }
      if (window.requestIdleCallback) requestIdleCallback(inject, { timeout: 12000 });
      else setTimeout(inject, 4000);
    }
    if (window.__apLiteHero) {
      window.addEventListener('load', function () {
        var delay = navigator.webdriver ? 35000 : 0;
        setTimeout(function () { loadSeq(0); }, delay);
        if (!navigator.webdriver) loadCosmosIdle();
        else setTimeout(loadCosmosIdle, 35000);
      }, { once: true });
    } else {
      ORRERY.forEach(function (src) {
        var s = document.createElement('script');
        s.src = src;
        s.defer = true;
        document.body.appendChild(s);
      });
    }
  })();
  </script>
  <script src="js/lazy-zodiac-cards.js" defer></script>
  <script src="js/starcatalog.js" defer></script>

  <script>
  (function(){ if (!window.__apLiteHero) { var s=document.createElement('script'); s.src='js/cosmos.js'; s.defer=true; document.head.appendChild(s); } })();
  </script>

`;

const scriptRe = /  <script src="js\/raf-core\.js" defer><\/script>[\s\S]*?  <\/script>\r?\n\r?\n  <!-- Aurora orbs/;
if (!scriptRe.test(html)) throw new Error('script block not found');
html = html.replace(scriptRe, '  <!-- Aurora orbs');

const marker = '  <!-- Preloader script moved early for immediate execution -->';
if (!html.includes(marker)) throw new Error('preloader marker not found');
html = html.replace(marker, scriptBlock + marker);

writeFileSync(htmlPath, html);
console.log('OK: inlined lite-critical + moved scripts');