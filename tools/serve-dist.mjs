/**
 * Minimal static server for the built `dist/` — verifies the production build
 * locally. `npm run serve:dist` -> http://localhost:8796 (PORT overrides).
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = process.env.PORT || 8796
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
}

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    let file = normalize(join(DIST, p))
    if (!file.startsWith(DIST)) { res.writeHead(403).end('forbidden'); return }
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html') } catch {}
    let body
    try { body = await readFile(file) }
    catch { res.writeHead(404, TYPES['.html']); body = await readFile(join(DIST, '404.html')).catch(() => 'Not found'); res.end(body); return }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' })
    res.end(body)
  } catch (e) { res.writeHead(500).end(String(e)) }
}).listen(PORT, () => console.log(`dist/ served on http://localhost:${PORT}`))
