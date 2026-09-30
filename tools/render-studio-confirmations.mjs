#!/usr/bin/env node
/**
 * Render deterministic, content-authenticated confirmations for Studio self orders.
 *
 * The seller contract configuration is deliberately external to the repository:
 * it contains owner-approved identity, geographic address, tax wording, prices
 * and the immutable terms attachment. Historical versions must be retained so
 * a later price or address change cannot rewrite an existing buyer's contract.
 */
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DURABLE_CONFIRMATION_VERSION,
  GIFT_CONSENT_HASHES,
  GIFT_CONSENT_RECORDS,
  ROOT,
  STUDIO_SKUS,
  canonicalEmail,
  canonicalizeStudioOrder,
  cleanDisplayText,
  parseArgs,
  sha256,
} from './fulfil-shared.mjs';
import {
  assertSecureExternalFile,
  assertSecurePrivateRoot,
  resolveContainedPath,
  writeNewFileSync,
} from './fulfil-security.mjs';

export const SELLER_CONTRACT_CONFIG_SCHEMA = 'astroprecise-seller-contract-config-v902';
export const DURABLE_CONFIRMATION_SCHEMA = 'astroprecise-studio-buyer-confirmation-v902';

const CANCELLATION_SUMMARY = 'You may cancel this distance service contract during the 14 days after the day the contract was formed. If you expressly requested early work and cancel after work begins, a lawful proportionate amount may be due; the right ends after full performance only where the legal conditions are met.';
const STATUTORY_RIGHTS_SUMMARY = 'Personalisation does not remove your statutory rights. Faulty, misdescribed or carelessly supplied services or digital files remain subject to applicable correction, repeat-performance, price-reduction, refund and other remedies.';
export const APPROVED_PRODUCTION_CLOCK = 'Five working days after complete inputs plus an express early-start request, or after the 14-day cancellation period expires.';
const V902_PRODUCTS = Object.freeze({
  'natal-sky-print-pack': Object.freeze({ name: 'Natal Sky Print Pack', totalMinor: 1800 }),
  'personal-sky-keepsake': Object.freeze({ name: 'Personal Sky Keepsake', totalMinor: 2900 }),
  'whole-sky-edition': Object.freeze({ name: 'Whole Sky Edition', totalMinor: 3900 }),
});

function exactKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  const missing = allowed.filter((key) => !(key in value));
  if (unexpected.length || missing.length) {
    throw new Error(`${label} keys are invalid${unexpected.length ? `; unsupported: ${unexpected.sort().join(', ')}` : ''}${missing.length ? `; missing: ${missing.sort().join(', ')}` : ''}`);
  }
}

function canonicalIso(value, label) {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis) || new Date(millis).toISOString() !== value) throw new Error(`${label} must be a canonical UTC ISO timestamp`);
  return value;
}

function safeFile(value, label, extension) {
  const file = cleanDisplayText(value, { label, max: 128 });
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(file) || file === '.' || file === '..' || !file.toLowerCase().endsWith(extension)) {
    throw new Error(`${label} must be a safe ${extension} filename`);
  }
  return file;
}

function nonPlaceholder(value, { label, max }) {
  const text = cleanDisplayText(value, { label, max });
  if (/\b(?:tbd|todo|placeholder|unknown|not yet|insert|example)\b/i.test(text)) throw new Error(`${label} is still a placeholder`);
  return text;
}

export function canonicalSellerContractConfig(input = {}) {
  exactKeys(input, [
    'schema', 'configVersion', 'approvedAt', 'legalOperatorName', 'tradingName',
    'geographicAddressLines', 'directEmail', 'website', 'tax', 'depositPercent',
    'productionWorkingDays', 'productionClock', 'products', 'terms',
  ], 'Seller contract configuration');
  if (input.schema !== SELLER_CONTRACT_CONFIG_SCHEMA) throw new Error('Seller contract configuration schema is invalid');
  const configVersion = nonPlaceholder(input.configVersion, { label: 'configVersion', max: 96 });
  const approvedAt = canonicalIso(input.approvedAt, 'approvedAt');
  if (Date.parse(approvedAt) > Date.now() + 5 * 60_000) throw new Error('approvedAt cannot be in the future');
  const legalOperatorName = nonPlaceholder(input.legalOperatorName, { label: 'legalOperatorName', max: 120 });
  const tradingName = cleanDisplayText(input.tradingName, { label: 'tradingName', max: 80 });
  if (tradingName !== 'AstroPrecise') throw new Error('tradingName must be AstroPrecise');
  if (!Array.isArray(input.geographicAddressLines) || input.geographicAddressLines.length < 2 || input.geographicAddressLines.length > 6) {
    throw new Error('geographicAddressLines must contain 2-6 public address lines');
  }
  const geographicAddressLines = input.geographicAddressLines.map((line, index) =>
    nonPlaceholder(line, { label: `geographicAddressLines[${index}]`, max: 120 }));
  if (geographicAddressLines.join(', ').length < 12) throw new Error('geographicAddressLines is implausibly short');
  const directEmail = canonicalEmail(input.directEmail, 'directEmail');
  const website = cleanDisplayText(input.website, { label: 'website', max: 120 });
  if (website !== 'https://astroprecise.app') throw new Error('website must be the canonical HTTPS AstroPrecise origin');

  exactKeys(input.tax, ['pricesIncludeAllRequiredTax', 'statement'], 'Seller tax configuration');
  if (input.tax.pricesIncludeAllRequiredTax !== true) throw new Error('prices must be confirmed as inclusive of every required tax before launch');
  const tax = {
    pricesIncludeAllRequiredTax: true,
    statement: nonPlaceholder(input.tax.statement, { label: 'tax.statement', max: 240 }),
  };

  const depositPercent = Number(input.depositPercent);
  if (!Number.isInteger(depositPercent) || depositPercent !== 50) throw new Error('depositPercent must match the approved 50% Studio checkout flow');
  const productionWorkingDays = Number(input.productionWorkingDays);
  if (productionWorkingDays !== 5) throw new Error('productionWorkingDays must match the approved five-working-day Studio offer');
  const productionClock = nonPlaceholder(input.productionClock, { label: 'productionClock', max: 240 });
  if (productionClock !== APPROVED_PRODUCTION_CLOCK) throw new Error('productionClock does not match the approved v902 Studio offer');

  if (!Array.isArray(input.products) || input.products.length !== STUDIO_SKUS.length) throw new Error('Seller contract configuration must snapshot exactly the three Studio products');
  const products = input.products.map((product, index) => {
    exactKeys(product, ['sku', 'name', 'currency', 'totalMinor'], `products[${index}]`);
    const sku = cleanDisplayText(product.sku, { label: `products[${index}].sku`, max: 64 });
    if (!STUDIO_SKUS.includes(sku)) throw new Error(`products[${index}].sku is not approved`);
    const name = nonPlaceholder(product.name, { label: `products[${index}].name`, max: 100 });
    if (product.currency !== 'GBP') throw new Error(`products[${index}].currency must be GBP`);
    if (!Number.isInteger(product.totalMinor) || product.totalMinor <= 0 || product.totalMinor > 1_000_000) throw new Error(`products[${index}].totalMinor is invalid`);
    const approvedProduct = V902_PRODUCTS[sku];
    if (!approvedProduct || name !== approvedProduct.name || product.totalMinor !== approvedProduct.totalMinor) {
      throw new Error(`products[${index}] does not match the approved v902 name and total`);
    }
    return { sku, name, currency: 'GBP', totalMinor: product.totalMinor };
  }).sort((a, b) => a.sku.localeCompare(b.sku));
  if (new Set(products.map(({ sku }) => sku)).size !== STUDIO_SKUS.length) throw new Error('Seller contract configuration product SKUs must be unique');

  exactKeys(input.terms, ['version', 'file', 'sha256'], 'Seller terms configuration');
  const terms = {
    version: nonPlaceholder(input.terms.version, { label: 'terms.version', max: 96 }),
    file: safeFile(input.terms.file, 'terms.file', '.pdf'),
    sha256: String(input.terms.sha256 || '').toLowerCase(),
  };
  if (!/^[a-f0-9]{64}$/.test(terms.sha256)) throw new Error('terms.sha256 must be a SHA-256 digest');

  return {
    schema: SELLER_CONTRACT_CONFIG_SCHEMA,
    configVersion,
    approvedAt,
    legalOperatorName,
    tradingName,
    geographicAddressLines,
    directEmail,
    website,
    tax,
    depositPercent,
    productionWorkingDays,
    productionClock,
    products,
    terms,
  };
}

export function sellerContractConfigHash(config) {
  return sha256(`${JSON.stringify(canonicalSellerContractConfig(config), null, 2)}\n`);
}

function choiceRecord({ selected, recordedAt, actor, version, hash, text }) {
  return {
    selected,
    recordedAt: selected ? canonicalIso(recordedAt, 'optional choice recordedAt') : null,
    actor: selected ? actor : null,
    noticeVersion: version,
    noticeHash: hash,
    noticeText: text,
  };
}

export function buyerDurableConfirmationDocument({ order: inputOrder, sellerConfig: inputConfig, issuedAt }) {
  const order = canonicalizeStudioOrder(inputOrder);
  if (order.purchaseIntent !== 'self') throw new Error('v902 buyer durable confirmation supports adult self orders only');
  if (!order.orderId || !order.product || !order.email || !order.contractAt) throw new Error('Durable confirmation requires orderId, product, buyer email and contractAt');
  const config = canonicalSellerContractConfig(inputConfig);
  const product = config.products.find((entry) => entry.sku === order.product);
  if (!product) throw new Error('Seller contract configuration does not contain this product');
  const confirmationIssuedAt = canonicalIso(issuedAt || order.buyerDurableConfirmationSentAt, 'buyer durable confirmation issuedAt');
  if (Date.parse(confirmationIssuedAt) < Date.parse(order.contractAt)) throw new Error('Durable confirmation cannot pre-date contract acceptance');
  if (Date.parse(config.approvedAt) > Date.parse(order.contractAt) || Date.parse(config.approvedAt) > Date.parse(confirmationIssuedAt)) {
    throw new Error('Seller contract configuration must be approved before contract acceptance and confirmation');
  }
  if (order.termsAccepted !== true || order.termsAcceptedActor !== 'buyer' ||
      order.termsVersion !== config.terms.version || order.termsHash !== config.terms.sha256 ||
      Date.parse(order.termsAcceptedAt) > Date.parse(order.contractAt)) {
    throw new Error('Order does not prove buyer acceptance of the exact approved terms before contract acceptance');
  }
  const depositMinor = Math.round(product.totalMinor * config.depositPercent / 100);
  return {
    schema: DURABLE_CONFIRMATION_SCHEMA,
    version: DURABLE_CONFIRMATION_VERSION,
    audience: 'buyer',
    issuedAt: confirmationIssuedAt,
    sellerConfigVersion: config.configVersion,
    sellerConfigHash: sellerContractConfigHash(config),
    seller: {
      legalOperatorName: config.legalOperatorName,
      tradingName: config.tradingName,
      geographicAddressLines: config.geographicAddressLines,
      directEmail: config.directEmail,
      website: config.website,
    },
    contract: {
      orderId: order.orderId,
      acceptedAt: order.contractAt,
      language: 'English',
      purchaseMode: 'self',
      chartSubjectName: order.name,
      buyerEmail: order.email,
      buyerDeclaration: order.buyerDeclaration,
    },
    product: {
      sku: product.sku,
      name: product.name,
      format: 'personalised digital files only',
      physicalItem: false,
    },
    price: {
      currency: product.currency,
      totalMinor: product.totalMinor,
      pricesIncludeAllRequiredTax: true,
      taxStatement: config.tax.statement,
      depositPercent: config.depositPercent,
      depositMinor,
      completionBalanceMinor: product.totalMinor - depositMinor,
    },
    delivery: {
      privateDigitalDelivery: true,
      targetWorkingDays: config.productionWorkingDays,
      productionClock: config.productionClock,
    },
    cancellation: {
      periodDays: 14,
      summary: CANCELLATION_SUMMARY,
      earlyStart: choiceRecord({
        selected: order.earlyStartConsent === true,
        recordedAt: order.earlyStartConsentRecordedAt,
        actor: order.earlyStartConsentActor,
        version: GIFT_CONSENT_RECORDS.earlyStartNoticeVersion,
        hash: GIFT_CONSENT_HASHES.earlyStartNoticeHash,
        text: GIFT_CONSENT_RECORDS.earlyStartNoticeText,
      }),
      earlyDigitalSupply: choiceRecord({
        selected: order.digitalSupplyConsent === true,
        recordedAt: order.digitalSupplyConsentRecordedAt,
        actor: order.digitalSupplyConsentActor,
        version: GIFT_CONSENT_RECORDS.digitalSupplyNoticeVersion,
        hash: GIFT_CONSENT_HASHES.digitalSupplyNoticeHash,
        text: GIFT_CONSENT_RECORDS.digitalSupplyNoticeText,
      }),
      statutoryRights: STATUTORY_RIGHTS_SUMMARY,
    },
    terms: {
      attached: true,
      version: config.terms.version,
      file: config.terms.file,
      sha256: config.terms.sha256,
      acceptance: {
        accepted: true,
        recordedAt: order.termsAcceptedAt,
        actor: order.termsAcceptedActor,
        version: order.termsVersion,
        sha256: order.termsHash,
      },
    },
  };
}

export function buyerDurableConfirmationBytes(options) {
  return Buffer.from(`${JSON.stringify(buyerDurableConfirmationDocument(options), null, 2)}\n`, 'utf8');
}

export function validateBuyerDurableConfirmationBytes({ bytes, order, sellerConfig }) {
  const expected = buyerDurableConfirmationBytes({
    order,
    sellerConfig,
    issuedAt: order.buyerDurableConfirmationSentAt,
  });
  const supplied = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (!supplied.equals(expected)) throw new Error('buyer durable confirmation content does not match the approved deterministic contract record');
  if (sha256(supplied) !== String(order.buyerDurableConfirmationHash || '').toLowerCase()) {
    throw new Error('buyer durable confirmation hash does not match the order record');
  }
  return JSON.parse(expected.toString('utf8'));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args['private-root'] || !args.order || !args['seller-config'] || !args.terms || !args.out) {
    throw new Error('Usage: render-studio-confirmations.mjs --private-root <access-restricted external order directory> --order <contained order.json> --seller-config <approved external config.json> --terms <contained exact terms.pdf> --out <contained new buyer-confirmation.json> [--issued-at <ISO>]');
  }
  const privateRoot = assertSecurePrivateRoot(args['private-root'], {
    repositoryRoot: ROOT,
    label: 'Durable confirmation private root',
  });
  const orderPath = resolveContainedPath(privateRoot, args.order, {
    label: 'Durable confirmation order', mustExist: true, kind: 'file',
  });
  const configPath = assertSecureExternalFile(args['seller-config'], {
    repositoryRoot: ROOT,
    label: 'Approved seller contract configuration',
  });
  const termsPath = resolveContainedPath(privateRoot, args.terms, {
    label: 'Immutable contract terms attachment', mustExist: true, kind: 'file',
  });
  const out = resolveContainedPath(privateRoot, args.out, {
    label: 'Buyer durable confirmation output', mustExist: false,
  });
  resolveContainedPath(privateRoot, dirname(out), {
    label: 'Buyer durable confirmation output directory', mustExist: true, kind: 'directory', allowRoot: true,
  });
  if (!basename(out).toLowerCase().endsWith('.json')) throw new Error('Buyer durable confirmation output must be a .json file');
  const order = JSON.parse(readFileSync(orderPath, 'utf8'));
  const config = canonicalSellerContractConfig(JSON.parse(readFileSync(configPath, 'utf8')));
  if (basename(termsPath) !== config.terms.file || sha256(readFileSync(termsPath)) !== config.terms.sha256) {
    throw new Error('Supplied terms attachment does not match the approved seller contract configuration');
  }
  const issuedAt = args['issued-at'] || order.buyerDurableConfirmationSentAt;
  const bytes = buyerDurableConfirmationBytes({ order, sellerConfig: config, issuedAt });
  writeNewFileSync(out, bytes, { label: 'Buyer durable confirmation', tempDirectory: dirname(out) });
  console.log(JSON.stringify({
    buyerDurableConfirmationSentAt: issuedAt,
    buyerDurableConfirmationVersion: DURABLE_CONFIRMATION_VERSION,
    buyerDurableConfirmationFile: basename(out),
    buyerDurableConfirmationHash: sha256(bytes),
    sellerConfigVersion: config.configVersion,
    sellerConfigHash: sellerContractConfigHash(config),
    termsFile: config.terms.file,
    termsHash: config.terms.sha256,
  }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`Durable confirmation blocked: ${error.message}`);
    process.exitCode = 1;
  }
}
