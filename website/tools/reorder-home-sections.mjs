import fs from 'fs';

const path = new URL('../index-full.html', import.meta.url);
let html = fs.readFileSync(path, 'utf8');

const marker = '<!-- ap-below-hero -->';
const mi = html.indexOf(marker);
if (mi < 0) throw new Error('marker missing');

const mainEnd = html.indexOf('</main>', mi);
if (mainEnd < 0) throw new Error('main end missing');

const before = html.slice(0, mi + marker.length);
let chunk = html.slice(mi + marker.length, mainEnd);
const after = html.slice(mainEnd);

function extractSection(source, attr) {
  const re = new RegExp(`<section[^>]*${attr}[^>]*>[\\s\\S]*?</section>`, 'i');
  const m = source.match(re);
  return m ? m[0] : null;
}

chunk = chunk.replace(
  /<!-- sign-picker moved[\s\S]*?data-ap-moved="1">/,
  '<section class="home-sign-picker" id="home-sign-picker" aria-labelledby="home-sign-heading">'
);

const signPicker = extractSection(chunk, 'id="home-sign-picker"');
const features = extractSection(chunk, 'class="features-section"');
const cosmic = extractSection(chunk, 'id="about"');
const how = extractSection(chunk, 'id="how-it-works"');
const tools = extractSection(chunk, 'id="all-tools"');

if (!signPicker || !cosmic || !how || !tools) {
  console.error({ signPicker: !!signPicker, cosmic: !!cosmic, how: !!how, tools: !!tools });
  process.exit(1);
}

let rest = chunk;
for (const sec of [signPicker, features, cosmic, how, tools]) {
  if (sec) rest = rest.replace(sec, '');
}

const reordered = `\n${how}\n\n${tools}\n\n${signPicker}\n\n${cosmic}\n${rest}`;
fs.writeFileSync(path, before + reordered + after);
console.log('OK — removed features-section:', Boolean(features));