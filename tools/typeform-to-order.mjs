/**
 * Map Typeform webhook / export JSON → fulfilment order shape.
 *
 *   node tools/typeform-to-order.mjs --in response.json
 *   node tools/typeform-to-order.mjs --in response.json --out order.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { parseArgs, parseDob, parseBirthTime, geocodePlace, loadEngines } from './fulfil-shared.mjs';

function answerMap(answers = []) {
  const m = {};
  for (const a of answers) {
    const ref = a.field?.ref || a.field?.id;
    if (!ref) continue;
    if (a.type === 'text' || a.type === 'short_text' || a.type === 'long_text') m[ref] = a.text;
    else if (a.type === 'email') m[ref] = a.email;
    else if (a.type === 'phone_number') m[ref] = a.phone_number;
    else if (a.type === 'date') m[ref] = a.date;
    else if (a.type === 'choices') m[ref] = a.choice?.label || a.choices?.labels?.join(', ');
    else if (a.text != null) m[ref] = a.text;
    else if (a.email != null) m[ref] = a.email;
    else if (a.date != null) m[ref] = a.date;
  }
  return m;
}

function natalFromFields(f, hidden = {}) {
  const dob = parseDob(f.dob || f.p1_dob);
  const bt = parseBirthTime(f.birth_time || f.p1_birth_time);
  const order = {
    name: f.chart_name || f.p1_chart_name || hidden.buyer_name || 'Chart',
    dob: f.dob || f.p1_dob,
    date: dob?.date,
    time: bt.label,
    birth_time: f.birth_time || f.p1_birth_time,
    place: f.birth_place || f.p1_birth_place,
    y: dob?.y,
    mo: dob?.mo,
    d: dob?.d,
    h: bt.h,
    mi: bt.mi,
    email: hidden.email,
    buyer_name: hidden.buyer_name,
    orderId: hidden.order_id,
    product: hidden.product_sku,
    voucher_code: hidden.voucher_code,
    gift_message: f.gift_message,
    shipping_name: f.shipping_name,
    shipping_address: f.shipping_address,
    shipping_phone: f.shipping_phone,
  };
  return order;
}

export function typeformToOrder(payload) {
  const fr = payload.form_response || payload;
  const hidden = fr.hidden || {};
  const answers = answerMap(fr.answers || []);
  const template = fr.definition?._meta?.template || payload._template;
  const sku = hidden.product_sku || payload.product_sku || payload.product;

  if (template === 'couples' || answers.p2_chart_name) {
    const p1d = parseDob(answers.p1_dob);
    const p2d = parseDob(answers.p2_dob);
    const p1t = parseBirthTime(answers.p1_birth_time);
    const p2t = parseBirthTime(answers.p2_birth_time);
    return {
      template: 'couples',
      product: sku,
      orderId: hidden.order_id,
      email: hidden.email,
      buyer_name: hidden.buyer_name,
      gift_message: answers.gift_message,
      p1: {
        name: answers.p1_chart_name,
        dob: answers.p1_dob,
        date: p1d?.date,
        time: p1t.label,
        place: answers.p1_birth_place,
        y: p1d?.y, mo: p1d?.mo, d: p1d?.d,
        h: p1t.h, mi: p1t.mi,
      },
      p2: {
        name: answers.p2_chart_name,
        dob: answers.p2_dob,
        date: p2d?.date,
        time: p2t.label,
        place: answers.p2_birth_place,
        y: p2d?.y, mo: p2d?.mo, d: p2d?.d,
        h: p2t.h, mi: p2t.mi,
      },
    };
  }

  if (template === 'gift-purchase' || answers.recipient_email) {
    return {
      template: 'gift-purchase',
      product: sku,
      orderId: hidden.order_id,
      email: hidden.email,
      buyer_name: hidden.buyer_name,
      recipient_name: answers.recipient_name,
      recipient_email: answers.recipient_email,
      gift_message: answers.gift_message,
      delivery_date: answers.delivery_date,
    };
  }

  const order = natalFromFields(answers, hidden);
  order.template = template || (answers.shipping_address ? 'pod-natal' : 'natal-single');
  return order;
}

/** Resolve lat/lon on natal orders (and couples legs). */
export function resolveCoordinates(order) {
  const { E } = loadEngines();
  const fix = (o) => {
    if (!o || (o.lat != null && o.lon != null)) return o;
    const geo = geocodePlace(o.place, E.CITIES);
    if (geo) return { ...o, lat: geo.lat, lon: geo.lon, tz: geo.tz };
    return o;
  };
  if (order.p1) return { ...order, p1: fix(order.p1), p2: fix(order.p2) };
  return fix(order);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('typeform-to-order.mjs')) {
  const A = parseArgs(process.argv.slice(2));
  if (!A.in) {
    console.error('Usage: node typeform-to-order.mjs --in response.json [--out order.json]');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(A.in, 'utf8'));
  const order = resolveCoordinates(typeformToOrder(raw));
  const out = JSON.stringify(order, null, 2);
  if (A.out) writeFileSync(A.out, out, 'utf8');
  else console.log(out);
}