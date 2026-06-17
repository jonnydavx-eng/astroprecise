/**
 * Lightweight report collector for phone-audit.html (zero Playwright / Lighthouse).
 * Binds 0.0.0.0 so the phone can POST via LAN or Tailscale.
 */
import http from 'http';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'phone');
const PORT = Number(process.env.AP_PHONE_COLLECTOR_PORT || 8791);
const HOST = process.env.AP_PHONE_COLLECTOR_HOST || '0.0.0.0';

let latest = null;

function json(res, code, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    return json(res, 200, { ok: true, port: PORT, hasReport: !!latest });
  }

  if (req.method === 'GET' && req.url === '/report') {
    if (!latest) return json(res, 404, { ok: false, error: 'no report yet' });
    return json(res, 200, latest);
  }

  if (req.method === 'POST' && req.url === '/report') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      latest = body;
      await mkdir(OUT, { recursive: true });
      await writeFile(join(OUT, 'report.json'), JSON.stringify(body, null, 2));
      console.log(`[phone-collector] report saved (${body.pages?.length || 0} pages, ok=${body.ok})`);
      return json(res, 200, { ok: true, saved: true });
    } catch (err) {
      return json(res, 400, { ok: false, error: String(err) });
    }
  }

  res.writeHead(404).end('not found');
});

server.listen(PORT, HOST, () => {
  console.log(`[phone-collector] listening on http://${HOST}:${PORT}`);
  console.log(`[phone-collector] POST /report · GET /report`);
});