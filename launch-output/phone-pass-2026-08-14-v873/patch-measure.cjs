const fs = require('fs');
const p = 'C:/Users/jonny/OneDrive/astroprecise/launch-output/phone-pass-2026-08-14-v873/measure.mjs';
let s = fs.readFileSync(p, 'utf8');
s = s.replaceAll('phone-pass-2026-08-14-v866', 'phone-pass-2026-08-14-v873');
s = s.replace(
  "const PHASE = process.argv[2] === 'after' ? 'after' : 'before';",
  "const PHASE = process.argv[2] === 'before' ? 'before' : 'after';"
);

const waitNeedle = "      await page.waitForTimeout(2200);\n    }\n  } catch (e) {";
const waitExtra = `      await page.waitForTimeout(2200);
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
  } catch (e) {`;
if (!s.includes('Number.isFinite(c.a.jd)')) {
  if (!s.includes(waitNeedle)) {
    console.log('WAIT_NEEDLE_MISSING');
    process.exit(2);
  }
  s = s.replace(waitNeedle, waitExtra);
}

const extraPath = 'C:/Users/jonny/OneDrive/astroprecise/launch-output/phone-pass-2026-08-14-v873/extra-insert.js.txt';
const extra = fs.readFileSync(extraPath, 'utf8');
const needle = "  if (measure && measure.primaries) {\n    measure.bluePrimaries = measure.primaries.filter((p) => looksBlueOrPurple(p.bg));\n  }";
if (!s.includes('measure.plutoWebgl')) {
  if (!s.includes(needle)) {
    console.log('BLUE_NEEDLE_MISSING');
    process.exit(3);
  }
  s = s.replace(needle, needle + '\n' + extra);
}

s = s.replace(
  " + (clk ? ` clocksA=${!!clk.specClocks?.a} clocksB=${!!clk.specClocks?.b} brassPx=${clk.pixels?.brass} emberPx=${clk.pixels?.ember}` : ''));",
  " + (clk ? ` clocksA=${!!clk.specClocks?.a} clocksB=${!!clk.specClocks?.b} brassPx=${clk.pixels?.brass} emberPx=${clk.pixels?.ember}` : '') + (measure?.plutoWebgl ? ` pluto=${!!measure.plutoWebgl.inGetPlanets} webgl=${measure.plutoWebgl.webgl && measure.plutoWebgl.webgl.ok}` : '') + (measure?.letters ? ` lettersA=${Number(measure.letters.aCssPx).toFixed(1)} lettersB=${Number(measure.letters.bCssPx).toFixed(1)} type=${measure.letters.readsAsType}` : ''));"
);

fs.writeFileSync(p, s);
console.log('patched', s.length, {
  out873: s.includes('v873'),
  pluto: s.includes('measure.plutoWebgl'),
  letters: s.includes('measure.letters'),
  natalWait: s.includes('Number.isFinite(c.a.jd)'),
  phaseAfter: s.includes("=== 'before' ? 'before' : 'after'"),
});
