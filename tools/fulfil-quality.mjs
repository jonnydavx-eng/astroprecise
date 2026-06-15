/**
 * Paid-product quality gate — AstroPrecise fulfilment.
 *
 * Every customer deliverable must pass these checks before email/PDF send:
 *   • VSOP87/ELP2000 chart (same engines as astroprecise.app)
 *   • Arcminute-precision longitudes in output tables
 *   • No DRAFT/SAMPLE watermark on paid orders
 *   • Product-specific files only (reading / poster / bundle)
 *   • Embedded ap-paid-meta for audit trail
 *
 *   node tools/fulfil-quality.mjs --product deep-reading --dir ./_audit-out --final
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { isPaidOrder } from './fulfil-shared.mjs';

export { isPaidOrder };

export const PAID_STANDARDS = {
  engine: 'VSOP87/ELP2000',
  houseSystem: 'placidus',
  longitudePrecision: 'arcminute',
  proseSource: 'interpretations.js (site corpus)',
  art: 'engraved gold-on-void, element-tinted wheel, starfield — matches chart-render palette',
  minReadingPages: 8,
  posterFormat: 'A3 print-ready',
  readingFormat: 'A4 print-ready',
};

/** Which output filename prefixes each SKU must produce. */
export const PAID_DELIVERABLES = {
  'deep-reading': ['reading-'],
  'natal-poster-pdf': ['poster-'],
  'reading-poster-bundle': ['reading-', 'poster-'],
  'gift-reading-redeem': ['reading-'],
  'two-skies-map': ['couples-', 'twoskies-'],
  'year-ahead': ['year-ahead-'],
  'solar-return': ['solar-return-'],
};

const FORBIDDEN_WM = ['DRAFT', 'SAMPLE', 'class="watermark"'];

export function validateBirthData(order = {}) {
  const missing = [];
  for (const k of ['y', 'mo', 'd', 'h', 'mi', 'lat', 'lon']) {
    if (!Number.isFinite(order[k])) missing.push(k);
  }
  if (!order.name && !order.chart_name) missing.push('name');
  if (!order.place && !order.birth_place) missing.push('place');
  return { ok: missing.length === 0, missing };
}

export function validatePaidOutputs({ product, outDir, final = false }) {
  const errors = [];
  const warnings = [];
  const prefixes = PAID_DELIVERABLES[product];
  if (!prefixes) {
    return { ok: false, errors: [`Unknown product for quality gate: ${product}`], warnings, files: [] };
  }

  let files = [];
  try {
    files = readdirSync(outDir).filter((f) => f.endsWith('.html'));
  } catch {
    return { ok: false, errors: [`Output dir missing: ${outDir}`], warnings, files: [] };
  }

  const matched = files.filter((f) => prefixes.some((p) => f.startsWith(p)));
  for (const p of prefixes) {
    if (!matched.some((f) => f.startsWith(p))) {
      errors.push(`Missing deliverable matching ${p}* for ${product}`);
    }
  }

  for (const f of matched) {
    const html = readFileSync(join(outDir, f), 'utf8');
    if (final) {
      for (const bad of FORBIDDEN_WM) {
        if (html.includes(bad)) errors.push(`${f}: forbidden watermark marker "${bad}" in paid output`);
      }
      if (!html.includes('ap-paid-meta')) {
        errors.push(`${f}: missing ap-paid-meta audit block (paid deliverable)`);
      }
      if (!html.includes('VSOP87')) {
        warnings.push(`${f}: no VSOP87 accuracy footer — add engine attribution`);
      }
      if (!html.includes('°') || !html.includes('′')) {
        warnings.push(`${f}: longitudes may lack arcminute precision (° ′)`);
      }
    }
    if (product === 'deep-reading' && f.startsWith('reading-')) {
      const pages = (html.match(/class="page"/g) || []).length;
      if (pages < PAID_STANDARDS.minReadingPages) {
        errors.push(`${f}: reading has ${pages} pages; need ≥ ${PAID_STANDARDS.minReadingPages}`);
      }
    }
    if (product === 'natal-poster-pdf' && f.startsWith('poster-')) {
      if (!html.includes('viewBox') && !html.includes('<svg')) {
        errors.push(`${f}: poster missing SVG natal wheel`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings, files: matched };
}

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const k = t.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) a[k] = true;
      else { a[k] = n; i++; }
    }
  }
  return a;
}

if (process.argv[1] && process.argv[1].includes('fulfil-quality')) {
  const A = parseArgs(process.argv.slice(2));
  if (!A.product || !A.dir) {
    console.error('Usage: fulfil-quality.mjs --product SKU --dir outDir [--final]');
    process.exit(1);
  }
  const r = validatePaidOutputs({ product: A.product, outDir: A.dir, final: !!A.final });
  for (const w of r.warnings) console.warn('WARN:', w);
  for (const e of r.errors) console.error('FAIL:', e);
  if (r.ok) console.log(`PASS: ${A.product} — ${r.files.join(', ')}`);
  process.exit(r.ok ? 0 : 1);
}