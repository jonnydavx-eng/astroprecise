/**
 * AstroPrecise email subscribe worker.
 * Accepts POST { email } (FormData or JSON), dedupes in KV, notifies owner.
 * CORS-enabled for static-site form posts (including no-cors fire-and-forget).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      if (!env.EXPORT_TOKEN || token !== env.EXPORT_TOKEN) {
        return new Response('Unauthorized', { status: 401, headers: base });
      }
      const list = await env.SUBSCRIBERS.list();
      const rows = ['email,subscribed_at,source,tags'];
      for (const k of list.keys) {
        if (!k.name.startsWith('sub:')) continue;
        const raw = await env.SUBSCRIBERS.get(k.name);
        if (!raw) continue;
        try {
          const r = JSON.parse(raw);
          rows.push([
            JSON.stringify(r.email || ''),
            JSON.stringify(r.at ? new Date(r.at).toISOString() : ''),
            JSON.stringify(r.source || ''),
            JSON.stringify(r.tags || ''),
          ].join(','));
        } catch (e) { /* skip */ }
      }
      return new Response(rows.join('\n'), {
        headers: {
          ...base,
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="ap-subscribers.csv"',
        },
      });
    }

    if (request.method !== 'POST' || (url.pathname !== '/' && url.pathname !== '/subscribe')) {
      return new Response('Not found', { status: 404, headers: base });
    }

    const email = (await parseEmail(request)).toLowerCase();
    if (!EMAIL_RE.test(email)) {
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
        tags = (fd.get('tags') || '').toString();
      }
    } catch (e) { /* optional */ }

    const key = 'sub:' + email;
    const existing = await env.SUBSCRIBERS.get(key);
    const record = {
      email,
      at: Date.now(),
      source: referer || null,
      tags: tags || null,
    };

    if (!existing) {
      await env.SUBSCRIBERS.put(key, JSON.stringify(record));
      ctx.waitUntil(notifyOwner(env, email, record));
    }

    return new Response(JSON.stringify({ ok: true, duplicate: !!existing }), {
      status: 200,
      headers: { ...base, 'Content-Type': 'application/json' },
    });
  },
};