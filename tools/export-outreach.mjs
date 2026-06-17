#!/usr/bin/env node
/**
 * Export AP_OUTREACH emails + X posts as plain-text files for MailerLite / scheduling.
 * Usage: node tools/export-outreach.mjs [--out dir]
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'website/js/outreach-content.js');
const outArg = process.argv.indexOf('--out');
const outDir = outArg >= 0 && process.argv[outArg + 1]
  ? path.resolve(process.argv[outArg + 1])
  : path.join(root, 'outreach-exports');

const src = fs.readFileSync(srcPath, 'utf8');
const sandbox = { window: {}, globalThis: {} };
sandbox.window = sandbox.globalThis;
vm.runInNewContext(src, sandbox);
const O = sandbox.window.AP_OUTREACH;
if (!O) {
  console.error('AP_OUTREACH not found in', srcPath);
  process.exit(1);
}

fs.mkdirSync(path.join(outDir, 'emails'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'x-posts'), { recursive: true });

O.exportAllEmails().forEach((e) => {
  const file = path.join(outDir, 'emails', `${e.id}.txt`);
  const text = [
    `ID: ${e.id}`,
    `SECTION: ${e.section}`,
    e.delay ? `DELAY: ${e.delay}` : '',
    e.tag ? `TAG: ${e.tag}` : '',
    '',
    `SUBJECT: ${e.subject}`,
    '',
    e.body,
    '',
  ].filter(Boolean).join('\n');
  fs.writeFileSync(file, text, 'utf8');
});

O.xPosts.singles.forEach((p) => {
  const text = O.format(p.text);
  fs.writeFileSync(path.join(outDir, 'x-posts', `${p.id}.txt`), text + '\n', 'utf8');
});

if (O.xPosts.missionControlSingles) {
  fs.mkdirSync(path.join(outDir, 'x-posts', 'mission-control'), { recursive: true });
  O.xPosts.missionControlSingles.forEach((p) => {
    const text = O.format(p.text);
    fs.writeFileSync(path.join(outDir, 'x-posts', 'mission-control', `${p.id}.txt`), text + '\n', 'utf8');
  });
}

O.xPosts.threads.forEach((th) => {
  const parts = th.posts.map((t, i) => `--- ${i + 1}/${th.posts.length} ---\n${O.format(t)}`);
  fs.writeFileSync(path.join(outDir, 'x-posts', `${th.id}.txt`), `# ${th.title}\n\n${parts.join('\n\n')}\n`, 'utf8');
});

const playbook = [
  '# X Traffic Playbook',
  '',
  O.xTraffic.summary,
  '',
  '## Cadence',
  `Posts/day: ${O.xTraffic.cadence.originalPostsPerDay}`,
  `Replies/day: ${O.xTraffic.cadence.repliesPerDay}`,
  '',
  '## Bio',
  O.xTraffic.profile.bio,
  '',
  '## Pinned',
  O.xTraffic.profile.pinnedPost,
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'x-playbook.txt'), playbook, 'utf8');

const mc = (O.xPosts.missionControlSingles || []).length;
console.log(`Exported ${O.exportAllEmails().length} emails + ${O.xPosts.singles.length} singles + ${mc} mission-control + ${O.xPosts.threads.length} threads → ${outDir}`);