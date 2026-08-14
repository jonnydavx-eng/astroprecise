import { readFileSync, writeFileSync } from 'fs';
function read(p) { return readFileSync(p, 'utf8'); }
function write(p, s) { writeFileSync(p, s, 'utf8'); console.log('wrote', p); }

{
  let s = read('website/ephemeris.html');
  s = s.replace(/\s*<a href="horoscope\.html" class="sky-tools-row__link">Daily horoscope<\/a>/, '');
  write('website/ephemeris.html', s);
}

{
  let s = read('website/profile.html');
  s = s.replace(/\s*<div class="completeness-step completeness-step--pending" role="listitem" aria-hidden="true"><span class="step-marker" aria-hidden="true"><span class="eng-step-ring"><\/span><\/span><span>Life Path<\/span><\/div>/, '');
  s = s.replace(
    "        { key:'lifepath',   label:'Life Path',   done: !!(profile.history && profile.history.includes('lifepath')) },\n",
    ''
  );
  s = s.replace(
    "      if (!steps.find(s=>s.key==='lifepath').done) {\n        return 'Visit <a href=\"lifepath.html\">Life Path</a> to discover your numerological blueprint.';\n      }\n      if (!steps.find(s=>s.key==='lifepath').done || (profile.charts||[]).length < 2) {\n",
    "      if ((profile.charts||[]).length < 2) {\n"
  );
  s = s.replace("cta:'Explore Life Path', href:'lifepath.html'", "cta:'Open Saturn Return', href:'saturn-return.html'");
  // The Uranus one also used the same string — fix the second remaining if any
  s = s.replace("cta:'Open Saturn Return', href:'saturn-return.html'\n          });\n        }\n        if (age >= 40 && age <= 44) {\n          recs.push({\n            icon:'♅', iconClass:'', urgent:true,\n            title:'Uranus Opposition',\n            body:`Around age 42 Uranus reaches the point opposite where it sat at your birth — the computed midpoint of its roughly 84-year orbit. In the astrological tradition this is read as a time that shakes loose whatever no longer fits.`,\n            cta:'Open Saturn Return', href:'saturn-return.html'",
               "cta:'Open Saturn Return', href:'saturn-return.html'\n          });\n        }\n        if (age >= 40 && age <= 44) {\n          recs.push({\n            icon:'♅', iconClass:'', urgent:true,\n            title:'Uranus Opposition',\n            body:`Around age 42 Uranus reaches the point opposite where it sat at your birth — the computed midpoint of its roughly 84-year orbit. In the astrological tradition this is read as a time that shakes loose whatever no longer fits.`,\n            cta:'View Transits', href:'transits.html'");
  write('website/profile.html', s);
}

{
  let s = read('website/numerology.html');
  s = s.replace(
    '<title>Numerology — Life Path, Name Numbers &amp; Angel Numbers | AstroPrecise</title>',
    '<title>Numerology — number tradition, clearly labelled | AstroPrecise</title>'
  );
  s = s.replace(
    'content="Numerology on AstroPrecise — Life Path numbers, name numerology and angel numbers, clearly labelled for what they are: number tradition for reflection, kept honestly separate from the computed astronomy."',
    'content="Numerology on AstroPrecise is number tradition for reflection, kept honestly separate from the computed astronomy. The live path is the Observatory and Chart."'
  );
  s = s.replace(
    'content="Life Path, name numbers and angel numbers — number tradition for reflection, kept honestly separate from the computed sky."',
    'content="Number tradition for reflection, kept honestly separate from the computed sky."'
  );
  s = s.replace(
    '<noscript><a href="index.html" class="navbar__link">Observatory</a><a href="chart.html" class="navbar__link">Chart</a><a href="horoscope.html" class="navbar__link">Daily</a><a href="eclipse.html" class="navbar__link">Eclipse</a><a href="shop.html" class="navbar__link">Shop</a></noscript>',
    '<noscript><a href="index.html" class="navbar__link">Observatory</a><a href="chart.html" class="navbar__link">Chart</a><a href="sky-events.html" class="navbar__link">Events</a><a href="shop.html" class="navbar__link">Shop</a></noscript>'
  );
  s = s.replace(
    '<a class="ap-number-action ap-number-action--primary" href="#number-paths">Choose a tradition</a>',
    '<a class="ap-number-action ap-number-action--primary" href="chart.html">Cast a birth chart</a>'
  );
  s = s.replace(
    '<p class="ap-number-kicker">Choose a tradition</p>\n        <h2 id="paths-title">Three ways into the pattern.</h2>\n        <p>Each route explains the method before it offers an interpretation.</p>',
    '<p class="ap-number-kicker">Archive rooms</p>\n        <h2 id="paths-title">Number rooms kept off the front path.</h2>\n        <p>These calculators still exist. They are not the live product. The Observatory and Chart are.</p>'
  );
  s = s.replace('<b>Open calculator →</b>', '<b>Archive</b>');
  s = s.replace('<b>Map a name →</b>', '<b>Archive</b>');
  s = s.replace('<b>Explore sequences →</b>', '<b>Archive</b>');
  write('website/numerology.html', s);
}

console.log('batch 2 html done');
