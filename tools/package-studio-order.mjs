#!/usr/bin/env node
/** Assemble generic-filename customer folders, ZIPs, and SHA-256 manifests. */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, join, resolve } from 'path';
import JSZip from 'jszip';
import { parseArgs, sha256 } from './fulfil-shared.mjs';

const CREDITS_SOURCE = new URL('../website/data/third-party-credits.json', import.meta.url);

const BASE = [
  'natal-sky-home-print-a3.pdf',
  'natal-sky-home-print-a4.pdf',
];
const READING = [
  'personal-sky-keepsake-screen.pdf',
  'personal-sky-keepsake-print.pdf',
  ...BASE,
];
const PRINT_PACK = [
  ...BASE,
  '01-natal-print-4960x7016.png',
  '02-natal-square-2160x2160.png',
  '03-natal-story-2160x3840.png',
  '04-phone-wallpaper-1080x1920.png',
  '05-big-three-1080x1080.png',
];
const BY_SKU = {
  'natal-sky-print-pack': PRINT_PACK,
  'personal-sky-keepsake': READING,
  'whole-sky-edition': [...new Set([...READING, ...PRINT_PACK, '06-observatory-birth-hour-schematic-4800x3600.png'])],
};
const GIFT_FILES = [
  'birthday-gift-jacket-a4.pdf',
  'birthday-reveal-1080x1920.png',
  'birthday-moon-plate-2160x2160.png',
];

const README = `ASTROPRECISE STUDIO · DELIVERY NOTES

Thank you for commissioning this digital edition.

The chart positions are computed from the recorded birth data supplied with the order. Astrological passages are traditional symbolic interpretations for reflection and entertainment; they are not scientific personality findings, predictions, or professional advice.

The A3 plate is an RGB home-print file. It has no commercial-press bleed, TrimBox or CMYK OutputIntent and is not sold as a press-ready file. Use “fit to printable area” unless your printer supports borderless A3. The A4 plate is an ink-light, scaled convenience copy.

The Whole Sky Observatory image is labelled SCHEMATIC. It uses computed body positions in an authored, compressed whole-system view; it is not a photograph, live feed or true-scale scientific image.

For a calculation/production error or an order question, use the private Gumroad order conversation. Do not send birth details through the public contact form.
`;

const SELF_LICENCE = `ASTROPRECISE STUDIO · PERSONAL-USE LICENCE

The original purchaser may download, store backup copies, display privately, and self-print the supplied files for personal, non-commercial use.

You may not resell, sublicense, publish, upload for public download, redistribute, mint as a token, use in advertising, or otherwise exploit the files commercially. A commercial or public-display licence requires separate written permission.

This licence does not limit statutory consumer rights. AstroPrecise retains copyright in the design, written corpus, software output and brand elements. Any third-party astronomical imagery or font material remains credited under its own terms.
`;

const GIFT_RECIPIENT_ONLY_LICENCE = `ASTROPRECISE STUDIO · GIFT PERSONAL-USE LICENCE

The intended adult gift recipient is the personal-use licensee and may download, store backup copies, display privately, and self-print the supplied files for personal, non-commercial use. The buyer is not authorised to receive, download, keep or redistribute these personalised files.

The recipient may not resell, sublicense, publish, upload for public download, redistribute, mint as a token, use in advertising, or otherwise exploit the files commercially. A commercial or public-display licence requires separate written permission.

This licence does not limit statutory consumer rights. AstroPrecise retains copyright in the design, written corpus, software output and brand elements. Any third-party astronomical imagery or font material remains credited under its own terms.
`;

const GIFT_AUTHORISED_BUYER_COPY_LICENCE = `ASTROPRECISE STUDIO · GIFT PERSONAL-USE LICENCE

The intended adult gift recipient is the personal-use licensee and may download, store backup copies, display privately, and self-print the supplied files for personal, non-commercial use. Because the recipient separately authorised a buyer copy, the buyer may keep one private copy and privately transfer or print it for that recipient as part of the gift. That permission does not transfer the licence or expose the recipient's birth inputs.

Neither person may resell, sublicense, publish, upload for public download, redistribute, mint as a token, use in advertising, or otherwise exploit the files commercially. A commercial or public-display licence requires separate written permission.

This licence does not limit statutory consumer rights. AstroPrecise retains copyright in the design, written corpus, software output and brand elements. Any third-party astronomical imagery or font material remains credited under its own terms.
`;

const PRINT_GUIDE = `ASTROPRECISE STUDIO · HOME-PRINT GUIDE

1. A3 PDF: RGB home-print plate, 297 × 420 mm. No bleed or commercial CMYK profile is claimed.
2. A4 PDF: ink-light, scaled convenience copy for common home printers.
3. Choose actual size only when the printer can image the full page; otherwise choose fit to printable area.
4. For best dark output, use heavyweight matte stock and the printer's high-quality setting. The ink-light A4 plate and reading edition are supplied for more economical printing.
5. The SHA-256 manifest verifies that the delivered bytes have not changed. It does not verify a birth record, astrological validity, scientific validity, or uniqueness.
`;

function thirdPartyCreditsText() {
  const credits = JSON.parse(readFileSync(CREDITS_SOURCE, 'utf8'));
  if (credits?.schema !== 'astroprecise-third-party-credits-v1' || !Array.isArray(credits.entries) || credits.entries.length === 0) {
    throw new Error('Third-party credits source is missing or invalid');
  }
  const entries = credits.entries.map((entry) => {
    const lines = [
      entry.work,
      `Creator/source: ${entry.creator}`,
      `Licence: ${entry.licence}${entry.licenceUrl ? ` — ${entry.licenceUrl}` : ''}`,
      `Source: ${entry.source}`,
    ];
    if (entry.note) lines.push(`Note: ${entry.note}`);
    return lines.join('\n');
  });
  return `ASTROPRECISE STUDIO · THIRD-PARTY CREDITS\n\nThese credits and licence notices travel with the delivered files. AstroPrecise does not claim ownership of the credited source material.\n\n${entries.join('\n\n')}\n`;
}

function artifact(path) {
  const bytes = readFileSync(path);
  return { file: basename(path), bytes: bytes.length, sha256: sha256(bytes) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.dir !== 'string' || !args.dir.trim()) {
    throw new Error('--dir requires an explicit nonblank directory path');
  }
  const dir = resolve(args.dir);
  const privateOrderPath = resolve(args.in || '');
  const product = String(args.product || '');
  const mode = String(args.mode || '');
  if (!dir || !args.in || !existsSync(privateOrderPath) || !BY_SKU[product] || !['proof', 'final'].includes(mode) || !/^[a-f0-9]{64}$/i.test(String(args['input-hash'] || ''))) {
    throw new Error('Usage: package-studio-order.mjs --dir <private dir> --in <canonical order.json> --product <launch sku> --mode proof|final --input-hash <sha256>');
  }
  const privateOrder = JSON.parse(readFileSync(privateOrderPath, 'utf8'));
  if (privateOrder.product !== product) throw new Error('Package SKU does not match the canonical private order');
  if (!['self', 'gift'].includes(privateOrder.purchaseIntent)) throw new Error('Canonical private order lacks an approved purchaseIntent');
  if (sha256(JSON.stringify(privateOrder)) !== String(args['input-hash']).toLowerCase()) throw new Error('Package input hash does not bind the canonical private order');
  const giftMode = privateOrder.purchaseIntent === 'gift';
  const giftLicence = privateOrder.recipientDisclosureActive === true
    ? GIFT_AUTHORISED_BUYER_COPY_LICENCE
    : GIFT_RECIPIENT_ONLY_LICENCE;
  const files = [...BY_SKU[product], ...(giftMode ? GIFT_FILES : []), 'README.txt', 'PERSONAL-USE-LICENCE.txt', 'PRINT-GUIDE.txt', 'THIRD-PARTY-CREDITS.txt'];
  writeFileSync(join(dir, 'README.txt'), giftMode ? `${README}\nGIFT DELIVERY\n\nThe three birthday-gift files are personalised for the intended adult recipient, who receives them by default. The buyer receives a private copy only when the recipient's separate authorisation is still valid at dispatch. The Moon plate is a computed schematic, not a photograph.\n` : README);
  writeFileSync(join(dir, 'PERSONAL-USE-LICENCE.txt'), giftMode ? giftLicence : SELF_LICENCE);
  writeFileSync(join(dir, 'PRINT-GUIDE.txt'), PRINT_GUIDE);
  writeFileSync(join(dir, 'THIRD-PARTY-CREDITS.txt'), thirdPartyCreditsText());
  for (const file of files) {
    if (!existsSync(join(dir, file))) throw new Error(`Missing required customer file: ${file}`);
  }
  const customerArtifacts = files.map((file) => artifact(join(dir, file)));
  const customerManifest = {
    schema: 'astroprecise-studio-customer-manifest-v901',
    product,
    mode,
    files: customerArtifacts,
    integrityNote: 'SHA-256 verifies delivered file bytes only; it does not verify a birth record or scientific/astrological validity.',
  };
  const customerManifestPath = join(dir, 'CUSTOMER-MANIFEST.json');
  writeFileSync(customerManifestPath, JSON.stringify(customerManifest, null, 2) + '\n');
  const zip = new JSZip();
  for (const file of [...files, 'CUSTOMER-MANIFEST.json']) zip.file(file, readFileSync(join(dir, file)));
  const zipName = `astroprecise-${product}.zip`;
  const zipBytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'DOS' });
  writeFileSync(join(dir, zipName), zipBytes);
  const completion = {
    schema: 'astroprecise-studio-fulfilment-manifest-v901',
    product,
    mode,
    createdAt: new Date().toISOString(),
    inputHash: args['input-hash'],
    customerManifestHash: sha256(readFileSync(customerManifestPath)),
    artifacts: [...customerArtifacts, artifact(customerManifestPath), artifact(join(dir, zipName))],
  };
  writeFileSync(join(dir, 'fulfilment-manifest.json'), JSON.stringify(completion, null, 2) + '\n');
  console.log(`packaged ${product} · ${files.length} files + manifest · ${zipName}`);
}

main().catch((error) => {
  console.error(`Packaging failed: ${error.message}`);
  process.exit(1);
});
