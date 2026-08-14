import { readFileSync, writeFileSync } from 'fs';
let s = readFileSync('website/profile.html', 'utf8');
s = s.replace(/\r?\n\s*\{ key:'lifepath',   label:'Life Path',   done: !!\(profile\.history && profile\.history\.includes\('lifepath'\)\) \},/, '');
s = s.replace(/\r?\n\s*if \(!steps\.find\(s=>s\.key==='lifepath'\)\.done\) \{\r?\n\s*return 'Visit <a href="lifepath\.html">Life Path<\/a> to discover your numerological blueprint\.';\r?\n\s*\}\r?\n\s*if \(!steps\.find\(s=>s\.key==='lifepath'\)\.done \|\| \(profile\.charts\|\|\[\]\)\.length < 2\) \{/, '\n      if ((profile.charts||[]).length < 2) {');
s = s.replace(/cta:'Explore Life Path', href:'lifepath\.html'/, "cta:'View Transits', href:'transits.html'");
s = s.replace(/\r?\n\s*if \(charts\.length > 0 && !profile\.history\?\.includes\('lifepath'\)\) \{\r?\n\s*recs\.push\(\{[\s\S]*?href:'lifepath\.html'\r?\n\s*\}\);\r?\n\s*\}/, '');
writeFileSync('website/profile.html', s);
const hits = [...s.matchAll(/lifepath/gi)].map(m => m[0] + ' @' + m.index);
console.log(hits.length ? hits.join('\n') : 'no lifepath left');
