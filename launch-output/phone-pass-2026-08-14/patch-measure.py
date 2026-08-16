from pathlib import Path
p = Path(r"C:\Users\jonny\OneDrive\astroprecise\launch-output\phone-pass-2026-08-14\measure.mjs")
t = p.read_text(encoding="utf-8")
old = """  await page.screenshot({ path: join(SHOTS, `${spec.id}.png`), fullPage: false }).catch(() => {});
  await page.screenshot({ path: join(SHOTS, `${spec.id}-full.png`), fullPage: true }).catch(() => {});

  results.push({
    id: spec.id,
    path: spec.path,
    status,
    errors: errors.slice(0, 8),
    ...measure,
  });
"""
new = """  await page.screenshot({ path: join(SHOTS, `${spec.id}.png`), fullPage: false }).catch(() => {});
  await page.screenshot({ path: join(SHOTS, `${spec.id}-full.png`), fullPage: true }).catch(() => {});

  let drawer = null;
  try {
    const toggle = page.locator('.navbar__toggle').first();
    if (await toggle.count()) {
      await toggle.click({ timeout: 4000 });
      await page.waitForTimeout(450);
      drawer = await page.evaluate(() => {
        const menu = document.getElementById('nav-mobile-menu');
        const tog = document.querySelector('.navbar__toggle');
        if (!menu) return { missing: true };
        const st = getComputedStyle(menu);
        const r = menu.getBoundingClientRect();
        const links = Array.from(menu.querySelectorAll('a.navbar__link')).map((a) => {
          const br = a.getBoundingClientRect();
          return { text: (a.textContent || '').replace(/\\s+/g, ' ').trim(), w: Math.round(br.width), h: Math.round(br.height) };
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
"""
if old not in t:
    raise SystemExit("measure marker missing")
p.write_text(t.replace(old, new, 1), encoding="utf-8")
print("measure.mjs patched")
