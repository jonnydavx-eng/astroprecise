/**
 * AstroPrecise email subscribe worker.
 * Accepts POST { email } (FormData or JSON), dedupes in KV, notifies owner.
 * CORS-enabled for static-site form posts (including no-cors fire-and-forget).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254; // RFC 5321 max address length — also bounds regex work
const MAX_FIELD = 512;  // cap attacker-influenced referer/tags before they hit KV
const RL_MAX = 20;      // max accepted POSTs per IP per window (soft abuse dampener)
const RL_TTL = 3600;    // rate-limit window, seconds

function clip(s, n) {
  s = s == null ? '' : String(s);
  return s.length > n ? s.slice(0, n) : s;
}

// Clip + flatten control chars — stored referer/tags must not inject lines into
// the plaintext owner email or break the CSV.
function oneLine(s, n) {
  return clip(s, n).replace(/[\r\n\t]+/g, ' ');
}

// Constant-time compare so the export token can't be recovered via response timing.
function timingSafeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// RFC-4180 CSV field + spreadsheet formula-injection guard (neutralise leading = + - @).
function csvField(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function corsHeaders(origin) {
  const allowed = [
    'https://astroprecise.app',
    'https://www.astroprecise.app',
    'https://jonnydavx-eng.github.io',
    'http://localhost:8790',
    'http://127.0.0.1:8790',
  ];
  const o = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

async function parseEmail(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await request.json().catch(() => ({}));
    return (j.email || '').toString().trim();
  }
  const fd = await request.formData().catch(() => null);
  if (fd) return (fd.get('email') || '').toString().trim();
  const text = await request.text().catch(() => '');
  const m = text.match(/(?:^|&)email=([^&]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).trim() : '';
}

async function notifyOwner(env, email, meta) {
  const to = env.OWNER_EMAIL;
  if (!to || !EMAIL_RE.test(to)) return;
  const from = env.FROM_EMAIL || 'subscribe@astroprecise.app';
  const body = [
    'New AstroPrecise subscriber',
    '',
    'Email: ' + email,
    meta.source ? 'Source: ' + meta.source : '',
    meta.tags ? 'Tags: ' + meta.tags : '',
    meta.referer ? 'Referer: ' + meta.referer : '',
    'Time: ' + new Date().toISOString(),
  ].filter(Boolean).join('\n');

  await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from, name: 'AstroPrecise Subscribe' },
      subject: 'New subscriber: ' + email,
      content: [{ type: 'text/plain', value: body }],
    }),
  }).catch(() => {});
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const base = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: base });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'ap-subscribe' }), {
        headers: { ...base, 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/export') {
      const token = url.searchParams.get('token') || request.headers.get('X-Export-Token');
      if (!env.EXPORT_TOKEN || !timingSafeEqual(token, env.EXPORT_TOKEN)) {
        return new Response('Unauthorized', { status: 401, headers: base });
      }
      const rows = ['email,subscribed_at,source,tags'];
      let cursor;
      do {
        const list = await env.SUBSCRIBERS.list({ cursor }); // paginate — list() caps at 1000/page
        const subs = list.keys.filter((k) => k.name.startsWith('sub:'));
        const raws = await Promise.all(subs.map((k) => env.SUBSCRIBERS.get(k.name)));
        for (const raw of raws) {
          if (!raw) continue;
          try {
            const r = JSON.parse(raw);
            rows.push([
              csvField(r.email || ''),
              csvField(r.at ? new Date(r.at).toISOString() : ''),
              csvField(r.source || ''),
              csvField(r.tags || ''),
            ].join(','));
          } catch (e) { /* skip */ }
        }
        cursor = list.list_complete ? null : list.cursor;
      } while (cursor);
      return new Response(rows.join('\n'), {
        headers: {
          ...base,
          'Content-Type': 'text/csv',
          'Cache-Control': 'no-store',
          'Content-Disposition': 'attachment; filename="ap-subscribers.csv"',
        },
      });
    }

    if (request.method !== 'POST' || (url.pathname !== '/' && url.pathname !== '/subscribe')) {
      return new Response('Not found', { status: 404, headers: base });
    }

    // Soft per-IP rate limit. CORS does not gate non-browser/no-cors clients, so
    // this is the actual abuse dampener against unbounded KV writes + owner-email
    // spam. KV is eventually consistent, so it's a soft cap (fine for dampening).
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rlKey = 'rl:' + ip;
    let rlCount = 0;
    try {
      rlCount = parseInt((await env.SUBSCRIBERS.get(rlKey)) || '0', 10) || 0;
    } catch (e) { /* fail open — availability over strictness */ }
    if (rlCount >= RL_MAX) {
      return new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), {
        status: 429,
        headers: { ...base, 'Content-Type': 'application/json', 'Retry-After': String(RL_TTL) },
      });
    }

    const email = (await parseEmail(request)).toLowerCase();
    if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_email' }), {
        status: 400,
        headers: { ...base, 'Content-Type': 'application/json' },
      });
    }

    const referer = request.headers.get('Referer') || '';
    let tags = '';
    try {
      const ct = request.headers.get('content-type') || '';
      if (ct.includes('multipart') || ct.includes('form')) {
        const fd = await request.clone().formData();
        tags = oneLine((fd.get('tags') || '').toString(), MAX_FIELD);
      }
    } catch (e) { /* optional */ }

    const key = 'sub:' + email;
    let existing = null;
    try {
      existing = await env.SUBSCRIBERS.get(key);
      const record = {
        email,
        at: Date.now(),
        source: referer ? oneLine(referer, MAX_FIELD) : null,
        tags: tags || null,
      };
      if (!existing) {
        await env.SUBSCRIBERS.put(key, JSON.stringify(record));
        ctx.waitUntil(notifyOwner(env, email, record));
      }
      // Count accepted POSTs per IP (best-effort; never blocks the response).
      ctx.waitUntil(
        env.SUBSCRIBERS.put(rlKey, String(rlCount + 1), { expirationTtl: RL_TTL }).catch(() => {}),
      );
    } catch (e) {
      // KV outage — return a clean, CORS-headed error instead of an opaque 500.
      return new Response(JSON.stringify({ ok: false, error: 'store_unavailable' }), {
        status: 503,
        headers: { ...base, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, duplicate: !!existing }), {
      status: 200,
      headers: { ...base, 'Content-Type': 'application/json' },
    });
  },
};