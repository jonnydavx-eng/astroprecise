#!/usr/bin/env node
/**
 * Generate the deterministic gift layer for an already-consented Studio order.
 * The artwork is calculated from the canonical UTC chart. It is not a lunar
 * photograph, AI image, live feed, voucher, or recipient-intake mechanism.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import sharp from 'sharp';
import {
  PDFBool, PDFDocument, PDFName, PDFNumber, PDFOperator, PDFOperatorNames, PDFString,
  StandardFonts, endMarkedContent, rgb,
} from 'pdf-lib';
import {
  STUDIO_PALETTE, canonicalizeStudioOrder, esc, isPaidOrder, loadEngines,
  norm, parseArgs, sd, sha256,
} from './fulfil-shared.mjs';

const PNGS = [
  ['birthday-reveal-1080x1920.png', 1080, 1920],
  ['birthday-moon-plate-2160x2160.png', 2160, 2160],
];
const PDF_NAME = 'birthday-gift-jacket-a4.pdf';
const CONTROL_NAME = 'gift-asset-control.json';

function round(value, places = 6) {
  return Number(Number(value).toFixed(places));
}

function inputBinding(order, final) {
  const inputHash = String(process.env.AP_STUDIO_INPUT_HASH || '').toLowerCase();
  const provenanceRef = String(process.env.AP_STUDIO_PROVENANCE_REF || '');
  if (!/^[a-f0-9]{64}$/.test(inputHash)) throw new Error('AP_STUDIO_INPUT_HASH is required');
  if (!/^AP-[A-F0-9]{16}$/.test(provenanceRef)) throw new Error('AP_STUDIO_PROVENANCE_REF is required');
  return {
    inputHash,
    orderRefHash: sha256(String(order.orderId || '')).slice(0, 16),
    product: order.product,
    mode: final ? 'final' : 'proof',
    provenanceRef,
  };
}

function wrap(text, limit, maxLines = Math.max(1, Math.ceil(Array.from(String(text || '')).length / limit))) {
  let remaining = Array.from(String(text || '').replace(/\s+/g, ' ').trim());
  if (remaining.length > limit * maxLines) throw new Error(`Text exceeds ${maxLines} lines of ${limit} characters`);
  const lines = [];
  while (remaining.length) {
    const linesLeft = maxLines - lines.length;
    if (linesLeft <= 0) throw new Error('Text layout exceeded its reserved lines');
    if (remaining.length <= limit) { lines.push(remaining.join('').trim()); break; }
    const minimumCut = Math.max(1, remaining.length - limit * (linesLeft - 1));
    const targetCut = Math.max(minimumCut, Math.min(limit, Math.ceil(remaining.length / linesLeft)));
    const candidates = [];
    for (let index = minimumCut; index <= limit; index++) if (/\s/.test(remaining[index] || '')) candidates.push(index);
    const cut = candidates.length
      ? candidates.sort((a, b) => Math.abs(a - targetCut) - Math.abs(b - targetCut))[0]
      : targetCut;
    lines.push(remaining.slice(0, cut).join('').trim());
    remaining = remaining.slice(cut);
    while (remaining[0] && /\s/.test(remaining[0])) remaining.shift();
  }
  return lines.filter(Boolean);
}

function splitDisplayName(text, limit = 28) {
  const value = String(text || '').trim();
  return wrap(value, limit, Math.ceil(Array.from(value).length / limit));
}

function fitFontSize(lines, { max, min, width, widthFactor = 1 }) {
  const longest = Math.max(1, ...lines.map((line) => Array.from(String(line)).length));
  const size = Math.max(min, Math.min(max, width / (longest * widthFactor)));
  if (longest * size * widthFactor > width + .01) throw new Error('Text layout exceeds its measured horizontal boundary');
  return size;
}

function textLines(lines, { x, y, lineHeight, size, fill = STUDIO_PALETTE.paper, anchor = 'start', family = 'Georgia, serif', weight = '400', spacing = 0 } = {}) {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${fill}">${esc(line)}</text>`).join('');
}

function starField(width, height, inputHash, count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const digest = sha256(`${inputHash}:${i}`);
    const x = Number.parseInt(digest.slice(0, 8), 16) % width;
    const y = Number.parseInt(digest.slice(8, 16), 16) % Math.floor(height * 0.88);
    const radius = 0.7 + (Number.parseInt(digest.slice(16, 18), 16) % 20) / 10;
    const opacity = 0.18 + (Number.parseInt(digest.slice(18, 20), 16) % 46) / 100;
    const colour = i % 7 === 0 ? STUDIO_PALETTE.violet : i % 5 === 0 ? STUDIO_PALETTE.cyan : STUDIO_PALETTE.silver;
    stars.push(`<circle cx="${x}" cy="${y}" r="${radius.toFixed(1)}" fill="${colour}" fill-opacity="${opacity.toFixed(2)}"/>`);
  }
  return stars.join('');
}

function moonLitPath(cx, cy, radius, elongation) {
  const waxing = elongation <= 180;
  const phaseAngle = waxing ? elongation : 360 - elongation;
  const cosPhase = Math.cos(phaseAngle * Math.PI / 180);
  const steps = 120;
  const terminator = [];
  const limb = [];
  for (let step = 0; step <= steps; step++) {
    const y = -radius + (2 * radius * step / steps);
    const half = Math.sqrt(Math.max(0, radius * radius - y * y));
    const x = waxing ? cx + cosPhase * half : cx - cosPhase * half;
    terminator.push(`${x.toFixed(2)},${(cy + y).toFixed(2)}`);
  }
  for (let step = steps; step >= 0; step--) {
    const y = -radius + (2 * radius * step / steps);
    const half = Math.sqrt(Math.max(0, radius * radius - y * y));
    const x = waxing ? cx + half : cx - half;
    limb.push(`${x.toFixed(2)},${(cy + y).toFixed(2)}`);
  }
  return `M ${terminator[0]} L ${terminator.slice(1).join(' L ')} L ${limb.join(' L ')} Z`;
}

function deterministicMoonRelief(cx, cy, radius, inputHash, count = 28) {
  const marks = [];
  for (let index = 0; index < count; index++) {
    const digest = sha256(`moon-relief:${inputHash}:${index}`);
    const angle = Number.parseInt(digest.slice(0, 8), 16) / 0xFFFFFFFF * Math.PI * 2;
    const radial = Math.sqrt(Number.parseInt(digest.slice(8, 16), 16) / 0xFFFFFFFF) * radius * .76;
    const x = cx + Math.cos(angle) * radial;
    const y = cy + Math.sin(angle) * radial;
    const size = radius * (.022 + Number.parseInt(digest.slice(16, 20), 16) / 0xFFFF * .062);
    const flatten = .56 + Number.parseInt(digest.slice(20, 24), 16) / 0xFFFF * .35;
    const rotation = Number.parseInt(digest.slice(24, 28), 16) / 0xFFFF * 180;
    const opacity = .11 + Number.parseInt(digest.slice(28, 30), 16) / 0xFF * .13;
    marks.push(`<g transform="rotate(${rotation.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})" opacity="${opacity.toFixed(3)}">
      <ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${size.toFixed(2)}" ry="${(size * flatten).toFixed(2)}" fill="#52677D" stroke="#EEF4FA" stroke-width="${Math.max(1, radius * .006).toFixed(2)}"/>
      <path d="M ${(x - size * .7).toFixed(2)} ${(y - size * .12).toFixed(2)} Q ${x.toFixed(2)} ${(y - size * .72).toFixed(2)} ${(x + size * .7).toFixed(2)} ${(y - size * .08).toFixed(2)}" fill="none" stroke="#FFFFFF" stroke-width="${Math.max(.8, radius * .004).toFixed(2)}"/>
    </g>`);
  }
  return marks.join('');
}

function moonGraphic(cx, cy, radius, moon, inputHash) {
  const phasePath = moonLitPath(cx, cy, radius, moon.elongation);
  return `<g>
    <defs><clipPath id="moonPhaseClip"><path d="${phasePath}"/></clipPath></defs>
    <circle cx="${cx}" cy="${cy}" r="${radius * 1.12}" fill="none" stroke="${STUDIO_PALETTE.violet}" stroke-opacity=".28" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#07101E" stroke="${STUDIO_PALETTE.silver}" stroke-opacity=".7" stroke-width="3" filter="url(#moonDepth)"/>
    <path d="${phasePath}" fill="url(#moonLight)"/>
    <g clip-path="url(#moonPhaseClip)">${deterministicMoonRelief(cx, cy, radius, inputHash)}</g>
    <path d="${phasePath}" fill="none" stroke="#EEF4FA" stroke-opacity=".28" stroke-width="${Math.max(1.5, radius * .008).toFixed(2)}"/>
    <circle cx="${cx}" cy="${cy}" r="${radius * .965}" fill="none" stroke="#FFFFFF" stroke-opacity=".12" stroke-width="${Math.max(1, radius * .006).toFixed(2)}"/>
  </g>`;
}

function provenanceStrip(width, height, provenanceRef) {
  const bits = [...`A57A901E${provenanceRef.slice(3)}`]
    .flatMap((hex) => Number.parseInt(hex, 16).toString(2).padStart(4, '0').split(''));
  return bits.map((bit, index) => `<rect x="${16 + index * 8}" y="${height - 28}" width="8" height="8" fill="${bit === '1' ? STUDIO_PALETTE.ion : '#27415C'}"/>`).join('');
}

function proofLayer(width, height, mark) {
  if (!mark) return '';
  const size = Math.round(Math.min(width, height) * .105);
  return `<g>
    <g transform="translate(${width / 2} ${height / 2}) rotate(-22)">
      <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="${size}" font-weight="700" letter-spacing="${Math.round(size * .08)}" fill="${STUDIO_PALETTE.paper}" fill-opacity=".2" stroke="${STUDIO_PALETTE.void}" stroke-opacity=".55" stroke-width="3">${esc(mark)}</text>
    </g>
    <rect x="0" y="${height - 12}" width="${width}" height="12" fill="${STUDIO_PALETTE.ion}"/>
  </g>`;
}

function baseDefs() {
  return `<defs>
    <radialGradient id="back" cx="50%" cy="16%" r="92%"><stop offset="0" stop-color="#14223A"/><stop offset=".56" stop-color="${STUDIO_PALETTE.raised}"/><stop offset="1" stop-color="${STUDIO_PALETTE.void}"/></radialGradient>
    <radialGradient id="moonLight" cx="31%" cy="25%" r="82%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".38" stop-color="${STUDIO_PALETTE.paper}"/><stop offset=".72" stop-color="#C9D6E3"/><stop offset="1" stop-color="#879DB4"/></radialGradient>
    <linearGradient id="orbit" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${STUDIO_PALETTE.ion}"/><stop offset=".52" stop-color="${STUDIO_PALETTE.violet}"/><stop offset="1" stop-color="${STUDIO_PALETTE.mint}"/></linearGradient>
    <filter id="moonDepth" x="-24%" y="-24%" width="148%" height="148%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000814" flood-opacity=".74"/></filter>
  </defs>`;
}

function occasionTitle(occasion) {
  if (occasion !== 'birthday') throw new Error('Birthday Orbit Edition supports only birthday gift orders');
  return 'YOUR BIRTHDAY, WRITTEN IN THE SKY';
}

function revealSvg(order, moon, binding, mark) {
  const width = 1080;
  const height = 1920;
  const message = wrap(order.giftMessage ? `“${order.giftMessage}”` : 'A personalised sky moment, chosen for you.', 34, 8);
  const recipientLines = splitDisplayName(order.recipientDisplayName.toUpperCase());
  const recipientSize = fitFontSize(recipientLines, { max: 64, min: 24, width: 860, widthFactor: 1.18 });
  const recipientSpacing = Math.max(...recipientLines.map((line) => Array.from(line).length)) > 20 ? 0 : 2;
  const messageSize = fitFontSize(message, { max: 34, min: 20, width: 840 });
  const giverLines = wrap(`FROM ${order.giverDisplayName.toUpperCase()}`, 42, 3);
  const giverSize = fitFontSize(giverLines, { max: 20, min: 12, width: 790 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${baseDefs()}<rect width="${width}" height="${height}" fill="url(#back)"/>${starField(width, height, binding.inputHash, 86)}
    <rect x="56" y="56" width="${width - 112}" height="${height - 112}" rx="34" fill="none" stroke="${STUDIO_PALETTE.silver}" stroke-opacity=".32"/>
    <text x="540" y="128" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="8" fill="${STUDIO_PALETTE.ion}">ASTROPRECISE STUDIO</text>
    ${textLines([occasionTitle(order.occasion)], { x: 540, y: 230, lineHeight: 54, size: 34, fill: STUDIO_PALETTE.paper, anchor: 'middle', family: 'Arial, sans-serif', weight: '700', spacing: 3 })}
    ${textLines(recipientLines, { x: 540, y: 330, lineHeight: recipientSize * 1.16, size: recipientSize, fill: STUDIO_PALETTE.paper, anchor: 'middle', family: 'Georgia, serif', weight: '700', spacing: recipientSpacing })}
    <ellipse cx="540" cy="855" rx="360" ry="360" fill="none" stroke="url(#orbit)" stroke-width="2" stroke-opacity=".7"/>
    <circle cx="900" cy="855" r="9" fill="${STUDIO_PALETTE.mint}"/><circle cx="180" cy="855" r="7" fill="${STUDIO_PALETTE.violet}"/>
    ${moonGraphic(540, 855, 265, moon, binding.inputHash)}
    <text x="540" y="1180" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="5" fill="${STUDIO_PALETTE.ion}">MOON IN ${moon.sign.toUpperCase()}</text>
    <text x="540" y="1230" text-anchor="middle" font-family="Georgia, serif" font-size="29" fill="${STUDIO_PALETTE.paper}">${moon.motion} · ${moon.illuminationPercent.toFixed(2)}% illuminated</text>
    ${textLines(message, { x: 540, y: 1360, lineHeight: messageSize * 1.38, size: messageSize, fill: '#D7E2ED', anchor: 'middle', family: 'Georgia, serif' })}
    ${textLines(giverLines, { x: 540, y: 1620 + Math.max(0, message.length - 6) * 16, lineHeight: giverSize * 1.35, size: giverSize, fill: STUDIO_PALETTE.mint, anchor: 'middle', family: 'Arial, sans-serif', weight: '700', spacing: Math.min(4, giverSize * .18) })}
    <text x="540" y="1760" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" letter-spacing="2" fill="${STUDIO_PALETTE.silver}">COMPUTED FROM THE RECORDED BIRTH MOMENT · NOT A PHOTOGRAPH</text>
    <text x="1030" y="1826" text-anchor="end" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="${STUDIO_PALETTE.ion}">AP REF ${binding.provenanceRef}</text>
    ${provenanceStrip(width, height, binding.provenanceRef)}${proofLayer(width, height, mark)}
  </svg>`;
}

function moonPlateSvg(order, moon, binding, mark) {
  const width = 2160;
  const height = 2160;
  const date = `${String(order.d).padStart(2, '0')} · ${String(order.mo).padStart(2, '0')} · ${order.y}`;
  const recipientLines = splitDisplayName(order.recipientDisplayName, 40);
  const recipientSize = fitFontSize(recipientLines, { max: 68, min: 26, width: 1640, widthFactor: 1.18 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${baseDefs()}<rect width="${width}" height="${height}" fill="url(#back)"/>${starField(width, height, binding.inputHash, 144)}
    <rect x="72" y="72" width="2016" height="2016" rx="46" fill="none" stroke="${STUDIO_PALETTE.silver}" stroke-opacity=".3" stroke-width="2"/>
    <text x="1080" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="11" fill="${STUDIO_PALETTE.ion}">ASTROPRECISE · BIRTHDAY MOON PLATE</text>
    ${textLines(recipientLines, { x: 1080, y: 245, lineHeight: recipientSize * 1.12, size: recipientSize, fill: STUDIO_PALETTE.paper, anchor: 'middle', family: 'Georgia, serif', weight: '700', spacing: Math.min(3, recipientSize * .05) })}
    <text x="1080" y="${315 + Math.max(0, recipientLines.length - 1) * recipientSize * 1.12}" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" letter-spacing="7" fill="${STUDIO_PALETTE.silver}">${date}</text>
    <circle cx="1080" cy="1025" r="630" fill="none" stroke="url(#orbit)" stroke-width="3" stroke-opacity=".7"/>
    <circle cx="450" cy="1025" r="10" fill="${STUDIO_PALETTE.violet}"/><circle cx="1710" cy="1025" r="12" fill="${STUDIO_PALETTE.mint}"/>
    ${moonGraphic(1080, 1025, 500, moon, binding.inputHash)}
    <text x="1080" y="1650" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="10" fill="${STUDIO_PALETTE.ion}">MOON IN ${moon.sign.toUpperCase()}</text>
    <text x="1080" y="1725" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="${STUDIO_PALETTE.paper}">${moon.motion} · ${moon.illuminationPercent.toFixed(2)}% ILLUMINATED</text>
    <text x="1080" y="1795" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" letter-spacing="4" fill="${STUDIO_PALETTE.silver}">SUN–MOON ELONGATION ${moon.elongation.toFixed(2)}°</text>
    <text x="1080" y="1900" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" letter-spacing="3" fill="${STUDIO_PALETTE.mint}">COMPUTED AT ${esc(moon.utcLabel)} · SCHEMATIC · NOT A PHOTOGRAPH</text>
    <text x="2085" y="2050" text-anchor="end" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="3" fill="${STUDIO_PALETTE.ion}">AP REF ${binding.provenanceRef}</text>
    ${provenanceStrip(width, height, binding.provenanceRef)}${proofLayer(width, height, mark)}
  </svg>`;
}

function jacketSvg(order, moon, binding, mark) {
  const width = 1240;
  const height = 1754;
  const message = wrap(order.giftMessage ? `“${order.giftMessage}”` : 'A personalised sky moment, chosen for you.', 45, 6);
  const title = occasionTitle(order.occasion);
  const recipientLines = splitDisplayName(order.recipientDisplayName);
  const recipientSize = fitFontSize(recipientLines, { max: 66, min: 26, width: 940, widthFactor: 1.18 });
  const recipientSpacing = Math.max(...recipientLines.map((line) => Array.from(line).length)) > 20 ? 0 : 2;
  const messageSize = fitFontSize(message, { max: 31, min: 18, width: 960 });
  const giverLines = wrap(`WITH LOVE FROM ${order.giverDisplayName.toUpperCase()}`, 48, 2);
  const giverSize = fitFontSize(giverLines, { max: 20, min: 14, width: 900 });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2480" height="3508" viewBox="0 0 ${width} ${height}">
    ${baseDefs()}<rect width="${width}" height="${height}" fill="url(#back)"/>${starField(width, height, binding.inputHash, 82)}
    <rect x="62" y="62" width="1116" height="1630" rx="28" fill="none" stroke="${STUDIO_PALETTE.silver}" stroke-opacity=".34" stroke-width="2"/>
    <text x="620" y="142" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="700" letter-spacing="9" fill="${STUDIO_PALETTE.ion}">ASTROPRECISE STUDIO</text>
    <text x="620" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="700" letter-spacing="5" fill="${STUDIO_PALETTE.silver}">BIRTHDAY ORBIT EDITION</text>
    <text x="620" y="274" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="3" fill="${STUDIO_PALETTE.violet}">${esc(title)}</text>
    ${textLines(recipientLines, { x: 620, y: 340, lineHeight: recipientSize * 1.16, size: recipientSize, fill: STUDIO_PALETTE.paper, anchor: 'middle', family: 'Georgia, serif', weight: '700', spacing: recipientSpacing })}
    <ellipse cx="620" cy="845" rx="390" ry="390" fill="none" stroke="url(#orbit)" stroke-width="2" stroke-opacity=".72"/>
    <circle cx="1010" cy="845" r="9" fill="${STUDIO_PALETTE.mint}"/><circle cx="230" cy="845" r="8" fill="${STUDIO_PALETTE.violet}"/>
    ${moonGraphic(620, 845, 275, moon, binding.inputHash)}
    <text x="620" y="1185" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="700" letter-spacing="6" fill="${STUDIO_PALETTE.ion}">A COMPUTED MOON MOMENT · ${moon.sign.toUpperCase()}</text>
    ${textLines(message, { x: 620, y: 1300, lineHeight: messageSize * 1.4, size: messageSize, fill: '#D7E2ED', anchor: 'middle', family: 'Georgia, serif' })}
    ${textLines(giverLines, { x: 620, y: 1510 + Math.max(0, message.length - 4) * 16, lineHeight: giverSize * 1.35, size: giverSize, fill: STUDIO_PALETTE.mint, anchor: 'middle', family: 'Arial, sans-serif', weight: '700', spacing: Math.min(4, giverSize * .18) })}
    <text x="620" y="1612" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" letter-spacing="2" fill="${STUDIO_PALETTE.silver}">COMPUTED FROM THE RECORDED BIRTH MOMENT · NOT A PHOTOGRAPH</text>
    <text x="1138" y="1660" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="2" fill="${STUDIO_PALETTE.ion}">AP REF ${binding.provenanceRef}</text>
    ${proofLayer(width, height, mark)}
  </svg>`;
}

function pngInfo(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length, sha256: sha256(bytes) };
}

function updateRasterManifest(out, binding, artifacts) {
  const path = join(out, 'raster-manifest.json');
  let manifest = { schema: 'astroprecise-studio-raster-v901', binding, artifacts: [] };
  if (existsSync(path)) {
    manifest = JSON.parse(readFileSync(path, 'utf8'));
    if (manifest.schema !== 'astroprecise-studio-raster-v901' || JSON.stringify(manifest.binding) !== JSON.stringify(binding)) {
      throw new Error('Raster manifest binding does not match this gift order');
    }
  }
  const byFile = new Map((manifest.artifacts || []).map((entry) => [entry.file, entry]));
  for (const artifact of artifacts) byFile.set(artifact.file, artifact);
  manifest.artifacts = [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
}

async function makePdf(path, imageBytes, order, binding, mark) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('AstroPrecise Birthday Orbit Edition Gift Jacket');
  pdf.setAuthor('AstroPrecise Studio');
  pdf.setSubject('Personalised computed birthday-sky gift jacket');
  pdf.setKeywords(['AstroPrecise', 'birthday gift', 'computed moon', 'personalised artwork']);
  const fixedDate = new Date(order.generatedAt || order.utc.instant);
  pdf.setCreationDate(fixedDate);
  pdf.setModificationDate(fixedDate);
  const page = pdf.addPage([595.28, 841.89]);
  const image = await pdf.embedPng(imageBytes);
  page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
    PDFName.of('Figure'), pdf.context.obj({ MCID: PDFNumber.of(0) }),
  ]));
  page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pdfSafe = (value) => Array.from(String(value || '')).map((character) => {
    try { font.encodeText(character); return character; } catch { return '?'; }
  }).join('');
  const identity = `AstroPrecise Birthday Orbit Edition | For ${pdfSafe(order.recipientDisplayName)}${mark ? ` | ${mark}` : ''}`;
  const provenance = `AP REF ${binding.provenanceRef} | COMPUTED, NOT A PHOTOGRAPH`;
  const identitySize = Math.min(6.2, 545 / font.widthOfTextAtSize(identity, 1));
  page.drawRectangle({ x: 18, y: 3, width: 559, height: 25, color: rgb(4 / 255, 8 / 255, 18 / 255), opacity: .96 });
  page.drawText(identity, { x: 24, y: 17, size: identitySize, font, color: rgb(238 / 255, 244 / 255, 250 / 255) });
  page.drawText(provenance, { x: 24, y: 7, size: 5.8, font, color: rgb(139 / 255, 169 / 255, 255 / 255) });
  page.pushOperators(endMarkedContent());
  const structTreeRoot = pdf.context.obj({ Type: PDFName.of('StructTreeRoot') });
  const structTreeRootRef = pdf.context.register(structTreeRoot);
  const documentElement = pdf.context.obj({ Type: PDFName.of('StructElem'), S: PDFName.of('Document'), P: structTreeRootRef });
  const documentElementRef = pdf.context.register(documentElement);
  const alt = `AstroPrecise Birthday Orbit Edition gift jacket for ${pdfSafe(order.recipientDisplayName)}. ${mark || 'Customer final'}. Computed moon artwork, birthday dedication and private digital delivery reference ${binding.provenanceRef}.`;
  const figureElement = pdf.context.obj({
    Type: PDFName.of('StructElem'), S: PDFName.of('Figure'), P: documentElementRef,
    Pg: page.ref, K: PDFNumber.of(0), Alt: PDFString.of(alt),
  });
  const figureElementRef = pdf.context.register(figureElement);
  const parentTree = pdf.context.obj({ Nums: pdf.context.obj([PDFNumber.of(0), pdf.context.obj([figureElementRef])]) });
  const parentTreeRef = pdf.context.register(parentTree);
  structTreeRoot.set(PDFName.of('K'), pdf.context.obj([documentElementRef]));
  structTreeRoot.set(PDFName.of('ParentTree'), parentTreeRef);
  structTreeRoot.set(PDFName.of('ParentTreeNextKey'), PDFNumber.of(1));
  documentElement.set(PDFName.of('K'), pdf.context.obj([figureElementRef]));
  page.node.set(PDFName.of('StructParents'), PDFNumber.of(0));
  pdf.catalog.set(PDFName.of('StructTreeRoot'), structTreeRootRef);
  pdf.catalog.set(PDFName.of('MarkInfo'), pdf.context.obj({ Marked: PDFBool.True }));
  pdf.catalog.set(PDFName.of('Lang'), PDFString.of('en-GB'));
  writeFileSync(path, await pdf.save({ useObjectStreams: false, addDefaultPage: false }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) throw new Error('Usage: generate-birthday-gift-assets.mjs --in <private canonical order.json> --out <private directory>');
  const order = canonicalizeStudioOrder(JSON.parse(readFileSync(resolve(args.in), 'utf8')));
  if (order.purchaseIntent !== 'gift') throw new Error('Birthday gift assets require canonical purchaseIntent gift');
  const final = isPaidOrder(order, { checkoutVerified: process.env.AP_CHECKOUT_VERIFIED === '1' });
  const binding = inputBinding(order, final);
  const out = resolve(args.out);
  mkdirSync(out, { recursive: true });
  const fictional = order.sampleMode === 'fictional' || /^FICTIONAL(?:[-_]|$)/i.test(String(order.orderId || ''));
  const mark = final ? '' : (fictional ? 'FICTIONAL SAMPLE' : 'PROOF');
  const { E } = loadEngines();
  const chart = E.calculateNatalChart(order.utc.y, order.utc.mo, order.utc.d, order.utc.h, order.utc.mi, order.lat, order.lon, order.house);
  const sunLongitude = norm(chart.positions.sun.longitude);
  const moonLongitude = norm(chart.positions.moon.longitude);
  const elongation = norm(moonLongitude - sunLongitude);
  const illumination = (1 - Math.cos(elongation * Math.PI / 180)) / 2;
  const moon = {
    sunLongitude: round(sunLongitude),
    moonLongitude: round(moonLongitude),
    elongation: round(elongation),
    illumination: round(illumination, 8),
    illuminationPercent: round(illumination * 100, 2),
    motion: elongation <= 180 ? 'WAXING' : 'WANING',
    sign: sd(moonLongitude).sign,
    utcLabel: `${order.utc.instant.replace('.000Z', 'Z')} UTC`,
  };

  const revealPath = join(out, PNGS[0][0]);
  const moonPath = join(out, PNGS[1][0]);
  await sharp(Buffer.from(revealSvg(order, moon, binding, mark))).png({ compressionLevel: 9, palette: false }).toFile(revealPath);
  await sharp(Buffer.from(moonPlateSvg(order, moon, binding, mark))).png({ compressionLevel: 9, palette: false }).toFile(moonPath);
  const rasterArtifacts = [pngInfo(revealPath), pngInfo(moonPath)].map((entry, index) => ({ file: PNGS[index][0], ...entry }));
  for (const [index, [, width, height]] of PNGS.entries()) {
    if (rasterArtifacts[index].width !== width || rasterArtifacts[index].height !== height) throw new Error(`${rasterArtifacts[index].file} has incorrect dimensions`);
  }
  updateRasterManifest(out, binding, rasterArtifacts);

  const jacketRaster = await sharp(Buffer.from(jacketSvg(order, moon, binding, mark))).png({ compressionLevel: 9, palette: false }).toBuffer();
  const jacketInfo = await sharp(jacketRaster).metadata();
  if (jacketInfo.width !== 2480 || jacketInfo.height !== 3508) throw new Error('Gift jacket source raster must be 2480x3508 (300 ppi A4)');
  const pdfPath = join(out, PDF_NAME);
  await makePdf(pdfPath, jacketRaster, order, binding, mark);
  const pdfBytes = readFileSync(pdfPath);
  const control = {
    schema: 'astroprecise-studio-gift-asset-control-v901',
    binding,
    calculation: {
      engine: 'VSOP87/ELP2000',
      frame: 'geocentric-ecliptic-of-date',
      sunLongitude: moon.sunLongitude,
      moonLongitude: moon.moonLongitude,
      sunMoonElongation: moon.elongation,
      illuminatedFraction: moon.illumination,
      motion: moon.motion.toLowerCase(),
      moonSign: moon.sign,
    },
    labels: ['COMPUTED FROM THE RECORDED BIRTH MOMENT', 'SCHEMATIC', 'NOT A PHOTOGRAPH', `AP REF ${binding.provenanceRef}`],
    artifacts: [
      { file: PDF_NAME, pages: 1, widthPt: 595.28, heightPt: 841.89, sourceWidthPx: 2480, sourceHeightPx: 3508, effectiveDpi: 300, tagged: true, bytes: pdfBytes.length, sha256: sha256(pdfBytes) },
      ...rasterArtifacts,
    ],
  };
  const privateDir = join(out, '_private');
  mkdirSync(privateDir, { recursive: true });
  writeFileSync(join(privateDir, CONTROL_NAME), JSON.stringify(control, null, 2) + '\n');
  console.log(`generated 3 deterministic gift assets · ${moon.motion.toLowerCase()} ${moon.illuminationPercent.toFixed(2)}% · ${moon.sign} · ${binding.provenanceRef}`);
}

main().catch((error) => {
  console.error(`Gift asset generation failed: ${error.message}`);
  process.exit(1);
});
