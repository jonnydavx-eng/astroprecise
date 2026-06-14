#!/usr/bin/env node
/**
 * Notify Bing/Yandex/Seznam via IndexNow after a deploy.
 * Key file must be published at https://astroprecise.app/{KEY}.txt
 *
 * Usage: node tools/ping-indexnow.mjs
 * Env:   INDEXNOW_KEY (optional override)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WEBSITE = path.join(ROOT, 'website');
const HOST = 'astroprecise.app';
const DEFAULT_KEY = 'a7f3c9e2b1d84f6a9c0e5b8d7f2a1c4e';

function readUrlsFromSitemap() {
  const xml = fs.readFileSync(path.join(WEBSITE, 'sitemap.xml'), 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function pingIndexNow(key, urlList) {
  const keyLocation = `https://${HOST}/${key}.txt`;
  const body = { host: HOST, key, keyLocation, urlList };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  const detail = res.status === 202 || res.status === 200
    ? 'accepted'
    : await res.text().catch(() => '');

  console.log(`IndexNow ${res.status} ${res.statusText} — ${urlList.length} URLs`);
  if (detail && detail !== 'accepted') console.log(detail);

  if (res.status !== 200 && res.status !== 202) {
    process.exit(1);
  }
}

const key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
const urls = readUrlsFromSitemap();

if (!urls.length) {
  console.error('No URLs found in website/sitemap.xml');
  process.exit(1);
}

await pingIndexNow(key, urls);