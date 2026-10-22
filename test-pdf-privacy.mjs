// Every PDF we publish must be free of local file links and machine paths
// (for example a file:///C:/Users/<name>/... link left by printing a page
// from disk), and of personal names or emails in metadata. Scans raw bytes and every FlateDecode stream.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

const BAD = [/file:\/\//i, /[A-Z]:[\\/]+Users[\\/]/i, /\/Users\/[^/\s)]+\//, /\/home\/[^/\s)]+\//, /\\Users\\/i, /AppData/i, /OneDrive/i,
  // Same personal-detail guard as test-seller-details.mjs, applied to PDF
  // metadata (Author/Creator) and text streams.
  /Davenport|Jonny Dav|davxplorer|\bjonny@/i, /[A-Za-z0-9._%+-]+@(?:gmail|hotmail|outlook|icloud|yahoo)\./i];
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : walk(p)) : [p];
});
const pdfs = walk('website').filter((p) => p.toLowerCase().endsWith('.pdf'));
let fail = 0;
// PDF strings are often hex UTF-16BE (<FEFF004A…>) or literal UTF-16 with
// NUL bytes; decode both so metadata cannot hide a name.
const decoded = (text) => {
  const hex = [...text.matchAll(/<FEFF((?:[0-9A-Fa-f]{4})+)>/g)].map((m) =>
    m[1].match(/.{4}/g).map((h) => String.fromCharCode(parseInt(h, 16))).join(''));
  return [text, text.replace(/\0/g, ''), ...hex].join('\n');
};
const check = (file, label, raw) => {
  const text = decoded(raw);
  for (const re of BAD) if (re.test(text)) { fail++; console.log(`  FAIL ${file} ${label} matches ${re}`); }
};
for (const f of pdfs) {
  const buf = readFileSync(f);
  check(f, 'raw', buf.toString('latin1'));
  const s = buf.toString('latin1');
  const re = /stream\r?\n/g; let m; let n = 0;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    if (end < 0) break;
    try { check(f, `stream@${start}`, inflateSync(buf.subarray(start, end)).toString('latin1')); n++; } catch { /* not Flate */ }
    re.lastIndex = end;
  }
  console.log(`  ok scanned ${f} (${n} streams)`);
}
if (pdfs.length < 4) { fail++; console.log(`  FAIL expected at least 4 PDFs, found ${pdfs.length}`); }
console.log(fail ? `\n${fail} PDF privacy check(s) failed` : `pdf-privacy: ${pdfs.length} PDFs clean`);
process.exit(fail ? 1 : 0);
