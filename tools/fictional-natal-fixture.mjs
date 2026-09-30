/** Explicit, exact Natal-only proof fixture. Never authorizes final files. */
import { isDeepStrictEqual } from 'node:util';
import { canonicalizeStudioOrder } from './fulfil-shared.mjs';

export const NATAL_FIXTURE_ID = 'natal-sky-print-pack-v1';
export const NATAL_FIXTURE_FILE = 'order-template-natal.json';

const EXPECTED = {
  schema: 'astroprecise-studio-order-v901',
  orderId: 'FICTIONAL-NATAL-PROOF-20260928',
  product: 'natal-sky-print-pack',
  email: 'buyer@example.test',
  sampleMode: 'fictional',
  purchaseIntent: 'self',
  buyerDeclaration: {
    typedName: 'Aurora Vale',
    confirmedAdult: true,
    confirmedChartSubject: true,
    confirmedPersonalDataEntry: true,
  },
  name: 'Aurora Vale',
  place: 'Whitby, England',
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613, tz: 'Europe/London',
  timeAccuracy: 'exact', house: 'placidus',
};

export function assertFictionalFixtureSelection(args) {
  if (!Object.hasOwn(args, 'fictional-fixture')) return null;
  if (args['fictional-fixture'] !== NATAL_FIXTURE_ID) {
    throw new Error('Unknown explicit fictional fixture selector');
  }
  if (args.proof !== true || args.payment !== undefined || args.final !== undefined) {
    throw new Error('Explicit fictional fixture requires --proof and forbids --payment/--final');
  }
  return NATAL_FIXTURE_ID;
}

export function assertExactFictionalNatalFixture(order) {
  // Deep equality rejects changed types, absent fields and additions at every
  // level, including buyerDeclaration. Neither SKU nor sampleMode is authority.
  if (!isDeepStrictEqual(order, EXPECTED)) {
    throw new Error('Exact fictional Natal fixture mismatch');
  }
  return true;
}

export function assertNatalFixtureControlSelection(selection, control) {
  const recorded = control.fictionalFixture;
  if (selection === NATAL_FIXTURE_ID) {
    if (recorded !== selection || control.product !== 'natal-sky-print-pack' || control.mode !== 'proof') {
      throw new Error('Explicit Natal fixture does not match the proof order-control binding');
    }
  } else if (Object.hasOwn(control, 'fictionalFixture')) {
    throw new Error('Fictional fixture order-control requires its explicit proof selector');
  }
}

export function assertNormalizedFictionalNatalFixture(original, privateOrder, control, render) {
  assertExactFictionalNatalFixture(original);
  assertNatalFixtureControlSelection(NATAL_FIXTURE_ID, control);
  const expected = JSON.parse(JSON.stringify(canonicalizeStudioOrder(original)));
  const generatedAt = privateOrder.generatedAt;
  const generatedMs = Date.parse(generatedAt);
  if (typeof generatedAt !== 'string' || !Number.isFinite(generatedMs) ||
      new Date(generatedMs).toISOString() !== generatedAt ||
      generatedAt !== control.generatedAt ||
      !Number.isFinite(Date.parse(render.generatedAt)) || generatedMs > Date.parse(render.generatedAt)) {
    throw new Error('Fictional Natal generation timestamp is not bound to orchestration');
  }
  expected.generatedAt = generatedAt;
  if (!isDeepStrictEqual(privateOrder, expected)) {
    throw new Error('Fictional Natal canonical order differs from the normalized exact fixture');
  }
}
