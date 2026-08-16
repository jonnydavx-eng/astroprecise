const fs = require('fs');

function mustReplace(s, old, neu, label) {
  if (!s.includes(old)) throw new Error('not found: ' + label);
  return s.replace(old, neu);
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/js/app.js';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(
    s,
    '    if (!isLaunchCorePage()) {\n      renderNav();\n      injectTopProfile();\n      initNavbar();\n    }',
    '    if (!isLaunchCorePage()) {\n      // Nav-model already bound the drawer on pages with data-ap-static-nav.\n      // A second initNavbar() opens then immediately closes on one tap.\n      if (!document.querySelector(\'[data-ap-static-nav-ready]\')) {\n        renderNav();\n        initNavbar();\n      }\n      injectTopProfile();\n    }',
    'app.js nav init'
  );
  fs.writeFileSync(p, s);
  console.log('updated app.js');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/css/ap-home-v835.css';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, '.ap-live-home .ap-orrery-cosmic-flight {\n  min-height: 42px;', '.ap-live-home .ap-orrery-cosmic-flight {\n  min-height: 44px;', 'cosmic-flight');
  s = mustReplace(s, '  .ap-live-home .ap-live-copy { max-width: 42ch; font-size: 15px; }', '  .ap-live-home .ap-live-copy { max-width: 42ch; font-size: 16px; }', 'home copy');
  fs.writeFileSync(p, s);
  console.log('updated ap-home-v835.css');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/css/ap-living-sky-v834.css';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, '  .ap-live-copy { max-width: 38ch; font-size: 15px; }', '  .ap-live-copy { max-width: 38ch; font-size: 16px; }', 'living-sky copy');
  fs.writeFileSync(p, s);
  console.log('updated ap-living-sky-v834.css');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/css/ap-keep-sky.css';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, '  min-height: 42px;', '  min-height: 44px;', 'keep-sky');
  fs.writeFileSync(p, s);
  console.log('updated ap-keep-sky.css');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/css/ap-couples-v858.css';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, '  min-height: 40px;', '  min-height: 44px;', 'ab buttons');
  s = mustReplace(s, '  min-height: 42px;', '  min-height: 44px;', 'couple inputs');
  fs.writeFileSync(p, s);
  console.log('updated ap-couples-v858.css');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/css/ap-eclipse-v835.css';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, '  .ap-eclipse-hero .ap-eclipse-page-shell > p:not(.ap-eclipse-kicker) { font-size: 15px; }', '  .ap-eclipse-hero .ap-eclipse-page-shell > p:not(.ap-eclipse-kicker) { font-size: 16px; }', 'eclipse hero');
  fs.writeFileSync(p, s);
  console.log('updated ap-eclipse-v835.css');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/css/tonight-page.css';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, '      font-size: 0.9rem;', '      font-size: 16px;', 'tonight city');
  fs.writeFileSync(p, s);
  console.log('updated tonight-page.css');
}

{
  const p = 'C:/Users/jonny/OneDrive/astroprecise/website/sw.js';
  let s = fs.readFileSync(p, 'utf8');
  s = mustReplace(s, 'const V = "ap-v858";', 'const V = "ap-v859";', 'sw version');
  fs.writeFileSync(p, s);
  console.log('updated sw.js');
}
