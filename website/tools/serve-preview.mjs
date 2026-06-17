/**
 * AstroPrecise local preview — gzip + lite shell rewrite for Lighthouse.
 * Usage: node tools/serve-preview.mjs [port]
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.argv[2] || process.env.PORT || '8790', 10);
const HOST = process.env.HOST || '0.0.0.0';

const GZIP_EXT = /\.(html?|css|js|json|svg|txt|xml|mjs)$/i;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function parseQuery(search) {
  const q = {};
  if (!search || search === '?') return q;
  const s = search.startsWith('?') ? search.slice(1) : search;
  for (const part of s.split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return q;
}

function resolveFile(urlPath, query) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  const q = parseQuery(query);
  if (p === '/' || p === '') {
    if (q.full === '1') return 'index-full.html';
    return 'index.html';
  }
  if (p.endsWith('/')) p += 'index.html';
  if (p.startsWith('/')) p = p.slice(1);
  if (p === 'index.html' && q.full === '1') return 'index-full.html';
  if (p === 'index-lite.html') return 'index.html';
  return p;
}

function safePath(rel) {
  const resolved = path.normalize(path.join(ROOT, rel));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const rel = resolveFile(req.url || '/', req.url?.includes('?') ? '?' + (req.url.split('?')[1] || '') : '');
  const filePath = safePath(rel);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const accept = req.headers['accept-encoding'] || '';
    const compressible = GZIP_EXT.test(ext);
    const useBrotli = compressible && accept.includes('br');
    const useGzip = compressible && !useBrotli && accept.includes('gzip');

    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', type);

    const stream = fs.createReadStream(filePath);
    if (!useBrotli && !useGzip) {
      res.writeHead(200);
      stream.pipe(res);
      return;
    }

    if (useBrotli) {
      res.writeHead(200, { 'Content-Encoding': 'br' });
      stream.pipe(zlib.createBrotliCompress({
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 },
      })).pipe(res);
      return;
    }

    res.writeHead(200, { 'Content-Encoding': 'gzip' });
    stream.pipe(zlib.createGzip({ level: 6 })).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`AstroPrecise preview http://${HOST}:${PORT} (br/gzip, lite rewrite)`);
  if (HOST === '0.0.0.0') console.log(`  LAN: http://192.168.30.97:${PORT}`);
});