/**
 * Faceless-shorts sample frames — generation must work offline on the
 * fictional chart only, in a few seconds, with no browser. Checks frame
 * counts, 1080x1920 PNG headers, the fictional label and closing disclaimer,
 * forbidden caption words (no "??", "buy", "checkout"), the licence note, and
 * that the tool refuses order-style input.
 *
 *   npm run test:shorts
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, openSync, readSync, closeSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { W, H, FRAME_LABEL, FORBIDDEN_CAPTION_WORDS, captionProblems } from './tools/sample-shorts.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('  ok', name); };
const TOOL = 'tools/sample-shorts.mjs';
const dir = mkdtempSync(join(tmpdir(), 'ap-sample-shorts-'));

// PNG: 8-byte signature, 4-byte length, "IHDR", then width and height as big-endian u32.
function pngSize(path) {
  const buf = Buffer.alloc(24);
  const fd = openSync(path, 'r');
  readSync(fd, buf, 0, 24, 0);
  closeSync(fd);
  assert.equal(buf.toString('ascii', 12, 16), 'IHDR', `${path}: not a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

try {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, [TOOL, '--out', dir, '--quiet'], { encoding: 'utf8' });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  ok(`generator exits 0 (${secs}s)`, () => assert.equal(run.status, 0, run.stderr || run.stdout));

  const manifest = JSON.parse(readFileSync(join(dir, 'sample-shorts-manifest.json'), 'utf8'));
  ok('three concepts, 4–6 frames each, manifest marked sample and not posted', () => {
    assert.equal(manifest.sample, true); assert.equal(manifest.posted, false);
    assert.equal(manifest.concepts.length, 3);
    for (const c of manifest.concepts) assert.ok(c.frames.length >= 4 && c.frames.length <= 6, `${c.id}: ${c.frames.length} frames`);
  });

  ok(`every frame exists, is ${W}x${H}, and is not an empty file`, () => {
    for (const c of manifest.concepts) for (const f of c.frames) {
      const p = join(dir, f.file);
      assert.ok(existsSync(p), `missing ${f.file}`);
      assert.deepEqual(pngSize(p), { width: W, height: H }, f.file);
      assert.ok(statSync(p).size > 20_000, `${f.file} is only ${statSync(p).size} bytes`);
    }
  });

  ok(`no caption contains ${FORBIDDEN_CAPTION_WORDS.map((w) => JSON.stringify(w)).join(', ')}`, () => {
    for (const c of manifest.concepts) for (const f of c.frames) {
      const bad = captionProblems(`${f.title || ''} ${f.caption}`);
      assert.deepEqual(bad, [], `${f.file}: ${bad.join(', ')}`);
    }
    const story = readFileSync(join(dir, 'storyboard.md'), 'utf8').toLowerCase();
    for (const w of FORBIDDEN_CAPTION_WORDS) assert.ok(!story.includes(w), `storyboard contains ${JSON.stringify(w)}`);
  });

  ok('every frame is labelled fictional; last frame of each short carries the disclaimer', () => {
    for (const c of manifest.concepts) {
      for (const f of c.frames) assert.equal(f.label, FRAME_LABEL, f.file);
      const last = c.frames[c.frames.length - 1];
      assert.equal(last.closing, true, c.id);
      assert.match(last.caption, /reflection and entertainment/, c.id);
      assert.match(last.caption, /fictional/i, c.id);
    }
  });

  ok('storyboard, frames.txt and GIF preview per concept; licence note present', () => {
    const story = readFileSync(join(dir, 'storyboard.md'), 'utf8');
    assert.match(story, /must be licensed/); assert.match(story, /LICENCES\.md/); assert.match(story, /ffmpeg is not installed/i);
    for (const c of manifest.concepts) {
      const list = readFileSync(join(dir, c.framesList), 'utf8');
      assert.equal((list.match(/^file '/gm) || []).length, c.frames.length + 1, `${c.id} frames.txt entries`);
      const gif = readFileSync(join(dir, c.preview));
      assert.equal(gif.toString('ascii', 0, 6), 'GIF89a', `${c.id} preview is not a GIF`);
      assert.ok(gif.length > 5_000, `${c.id} preview is only ${gif.length} bytes`);
    }
  });

  ok('tool refuses order-style input (--in, --final, --name)', () => {
    for (const flags of [['--in', 'tools/order-template.json'], ['--final'], ['--name', 'Real Person']]) {
      const r = spawnSync(process.execPath, [TOOL, '--out', join(dir, 'refused'), ...flags], { encoding: 'utf8' });
      assert.equal(r.status, 2, flags.join(' ')); assert.match(r.stderr, /unsupported argument/);
    }
    assert.ok(!existsSync(join(dir, 'refused')), 'refused run wrote files');
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${pass} passed, 0 failed`);
