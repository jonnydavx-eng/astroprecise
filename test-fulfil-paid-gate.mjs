/**
 * Codex review A2: the legacy fulfilment path must fail closed. An order id
 * alone is never "paid", and --final without payment proof must stop the run.
 * Runs offline: no provider, network, generator or payment is touched except a
 * proof-mode generator run with a deliberately unpaid order.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isPaidOrder, paymentEvidenceProblems, resolveFinal } from './tools/fulfil-shared.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('  ok', name); };
const template = JSON.parse(readFileSync(new URL('./tools/order-template.json', import.meta.url), 'utf8'));
const paid = {
  ...template, orderId: 'pi_3Q9xYz', product: 'deep-reading',
  payment: { status: 'paid', provider: 'stripe', reference: 'pi_3Q9xYz', livemode: true, amountMinor: 1800, currency: 'GBP', paidAt: '2026-10-18T12:00:00Z' },
};

ok('any non-empty orderId alone is NOT paid', () => {
  for (const id of ['LS-ORDER-ID-HERE', 'abc123', 'REVIEW-UNPAID-1', ' x ']) assert.equal(isPaidOrder({ orderId: id }), false, id);
});
ok('empty / missing order is not paid', () => {
  assert.equal(isPaidOrder(), false); assert.equal(isPaidOrder({}), false); assert.equal(isPaidOrder(null ?? {}), false);
});
ok('the shipped order template is not paid', () => assert.equal(isPaidOrder(template), false));
ok('a complete live payment record is paid', () => assert.deepEqual(paymentEvidenceProblems(paid), []));
ok('each missing proof field makes it unpaid', () => {
  const muts = [
    (o) => { o.payment.status = 'pending'; }, (o) => { o.payment.provider = 'cash'; },
    (o) => { o.payment.reference = 'other'; }, (o) => { o.payment.livemode = false; },
    (o) => { delete o.payment.livemode; }, (o) => { o.payment.amountMinor = 0; },
    (o) => { o.payment.amountMinor = 18.5; }, (o) => { o.payment.currency = 'gbp'; },
    (o) => { o.payment.paidAt = 'soon'; }, (o) => { o.payment.refunded = true; },
    (o) => { o.payment.disputed = true; }, (o) => { o.payment.revoked = true; },
    (o) => { o.payment.product = 'solar-return'; }, (o) => { o.orderId = 'test-order'; o.payment.reference = 'test-order'; },
    (o) => { delete o.payment; },
  ];
  for (const m of muts) { const o = structuredClone(paid); m(o); assert.equal(isPaidOrder(o), false, m.toString()); }
});
ok('resolveFinal: no --final means proof, even for a paid order', () => assert.equal(resolveFinal(false, paid, () => {}), false));
ok('resolveFinal: --final + unpaid exits 2', () => {
  let code = null; assert.equal(resolveFinal(true, { orderId: 'abc' }, (c) => { code = c; }), false); assert.equal(code, 2);
});
ok('resolveFinal: --final + paid is FINAL', () => assert.equal(resolveFinal(true, paid, () => assert.fail('exit')), true));

const dir = mkdtempSync(join(tmpdir(), 'ap-a2-'));
const unpaidPath = join(dir, 'unpaid.json');
writeFileSync(unpaidPath, JSON.stringify({ ...template, orderId: 'REVIEW-UNPAID-REF' }));
ok('fulfil-order --final with an unpaid order refuses (exit 2) and makes nothing', () => {
  const out = join(dir, 'final'); const r = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', unpaidPath, '--final', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 2, r.stderr); assert.match(r.stderr, /not proven paid/);
  let files = []; try { files = readdirSync(out).filter((f) => !f.startsWith('_order')); } catch {}
  assert.deepEqual(files, []);
});
ok('fulfil-order without --final on an order with an id runs as a proof, not FINAL', () => {
  const out = join(dir, 'proof'); const r = spawnSync(process.execPath, ['tools/fulfil-order.mjs', '--in', unpaidPath, '--out', out], { encoding: 'utf8' });
  assert.doesNotMatch(r.stdout, /paid — FINAL/); assert.match(r.stdout, /\(proof\)/);
});
for (const g of ['generate-reading', 'generate-couples', 'generate-year-ahead', 'generate-solar-return', 'generate-pod-pack', 'generate-gift-voucher']) {
  ok(`${g} --final with an unpaid order refuses`, () => {
    const r = spawnSync(process.execPath, [`tools/${g}.mjs`, '--in', unpaidPath, '--final', '--out', join(dir, g)], { encoding: 'utf8' });
    assert.equal(r.status, 2, `${g}: ${r.status} ${r.stderr.slice(0, 300)}`);
  });
}
console.log(`\n${pass} passed, 0 failed`);
