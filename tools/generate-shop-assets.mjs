#!/usr/bin/env node
/** Build the three authentic raster inputs consumed by the Illustrator cover kit. */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import {
  PDFBool, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFOperator, PDFOperatorNames, PDFString,
  StandardFonts, endMarkedContent, rgb,
} from 'pdf-lib';
import { ROOT, sha256 } from './fulfil-shared.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const ORDER = {
  orderId: 'FICTIONAL-SHOP-SAMPLE-901', product: 'whole-sky-edition', email: 'sample@example.test',
  sampleMode: 'fictional',
  purchaseIntent: 'self',
  name: 'Aurora Vale', place: 'Whitby, England',
  buyerDeclaration: {
    typedName: 'Aurora Vale',
    confirmedAdult: true,
    confirmedChartSubject: true,
    confirmedPersonalDataEntry: true,
  },
  y: 1990, mo: 6, d: 14, h: 3, mi: 42,
  lat: 54.486, lon: -0.613, tz: 'Europe/London', timeAccuracy: 'exact', house: 'placidus',
};
const COVER_WIDTH = 1280;
const COVER_HEIGHT = 720;
const SAMPLE_DIR = join(ROOT, 'website', 'downloads', 'studio');
const COVER_DIR = join(ROOT, 'website', 'img', 'shop', 'v901');
const OBSERVATORY_MASTER = join(COVER_DIR, 'whole-sky-edition-1920.webp');
const COOL = Object.freeze({
  void: '#040812', raised: '#0B1424', panel: '#101D30', paper: '#EEF4FA',
  silver: '#93A8BF', silverBright: '#C9D6E3', ion: '#8BA9FF', violet: '#A897FF', mint: '#6FD0B3',
});

function svgCoverBase({ index, eyebrow, title, title2, line1, line2, note, accent = COOL.ion }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_WIDTH}" height="${COVER_HEIGHT}" viewBox="0 0 ${COVER_WIDTH} ${COVER_HEIGHT}">
    <defs>
      <radialGradient id="field" cx="78%" cy="46%" r="70%"><stop offset="0" stop-color="#172B49"/><stop offset=".48" stop-color="${COOL.raised}"/><stop offset="1" stop-color="${COOL.void}"/></radialGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}" stop-opacity=".2"/><stop offset="1" stop-color="${COOL.violet}" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#field)"/>
    <path d="M 510 0 L 880 0 L 520 720 L 180 720 Z" fill="url(#beam)" opacity=".42"/>
    <path d="M 0 504 C 250 438 420 558 650 490 S 1040 410 1280 468" fill="none" stroke="${COOL.ion}" stroke-opacity=".08" stroke-width="2"/>
    <path d="M 0 544 C 260 478 428 594 664 528 S 1040 454 1280 504" fill="none" stroke="${COOL.violet}" stroke-opacity=".08"/>
    <rect x="34" y="34" width="1212" height="652" rx="18" fill="none" stroke="${COOL.silver}" stroke-opacity=".58" stroke-width="2"/>
    <rect x="48" y="48" width="1184" height="624" rx="12" fill="none" stroke="${COOL.ion}" stroke-opacity=".18"/>
    <circle cx="86" cy="88" r="20" fill="none" stroke="${COOL.silverBright}" stroke-opacity=".72"/>
    <circle cx="86" cy="88" r="6" fill="${COOL.ion}"/><path d="M 86 58 V 70 M 86 106 V 118 M 56 88 H 68 M 104 88 H 116" stroke="${COOL.ion}" stroke-width="2"/>
    <text x="124" y="84" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="4" fill="${COOL.paper}">ASTROPRECISE STUDIO</text>
    <text x="124" y="108" font-family="Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="2" fill="${COOL.silver}">V902 / MIDNIGHT MERIDIAN</text>
    <text x="70" y="176" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2.5" fill="${accent}">${eyebrow}</text>
    <text x="70" y="246" font-family="Georgia, serif" font-size="58" font-weight="700" fill="${COOL.paper}">${title}</text>
    ${title2 ? `<text x="70" y="306" font-family="Georgia, serif" font-size="58" font-weight="700" fill="${COOL.paper}">${title2}</text>` : ''}
    <text x="72" y="382" font-family="Arial, sans-serif" font-size="22" fill="${COOL.silverBright}">${line1}</text>
    <text x="72" y="420" font-family="Arial, sans-serif" font-size="22" fill="${COOL.silverBright}">${line2}</text>
    <rect x="70" y="464" width="430" height="92" rx="16" fill="#07101E" fill-opacity=".84" stroke="${accent}" stroke-opacity=".42"/>
    <text x="92" y="496" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="2.2" fill="${accent}">AUTHENTIC FICTIONAL FIXTURE</text>
    <text x="92" y="530" font-family="Arial, sans-serif" font-size="16" fill="${COOL.paper}">${note}</text>
    <text x="70" y="646" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="${COOL.silver}">${index}</text>
  </svg>`);
}

function svgCoverOverlay(panels) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
    ${panels.map((panel) => `<rect x="${panel.x}" y="${panel.y}" width="${panel.width}" height="${panel.height}" rx="${panel.radius || 14}" fill="none" stroke="${panel.stroke || COOL.silver}" stroke-opacity="${panel.opacity || .72}" stroke-width="2"/>`).join('')}
    <rect x="1082" y="60" width="128" height="38" rx="6" fill="${COOL.ion}"/>
    <text x="1146" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#07101E">SAMPLE</text>
    <rect x="786" y="622" width="424" height="36" rx="8" fill="#07101E" fill-opacity=".94" stroke="${COOL.silver}" stroke-opacity=".34"/>
    <text x="1192" y="645" text-anchor="end" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1.6" fill="${COOL.silverBright}">DIGITAL FILES ONLY / NO PHYSICAL ITEM</text>
  </svg>`);
}

async function imageLayer(path, { width, height, fit = 'contain', position = 'centre', brightness = 1, saturation = 1 }) {
  return sharp(path)
    .resize(width, height, { fit, position, background: COOL.raised })
    .modulate({ brightness, saturation })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function verifyObservatoryMaster(candidate, masterPath) {
  const width = 480;
  const height = 231;
  const [candidateRaw, masterRaw] = await Promise.all([
    sharp(candidate).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
    sharp(masterPath).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
  ]);
  if (candidateRaw.length !== masterRaw.length) throw new Error('Observatory master comparison dimensions differ');
  let absolute = 0;
  let materiallyDifferent = 0;
  for (let index = 0; index < candidateRaw.length; index += 1) {
    const delta = Math.abs(candidateRaw[index] - masterRaw[index]);
    absolute += delta;
    if (delta > 18) materiallyDifferent += 1;
  }
  const meanAbsoluteError = absolute / candidateRaw.length;
  const materialRatio = materiallyDifferent / candidateRaw.length;
  if (meanAbsoluteError > 2 || materialRatio > 0.012) {
    throw new Error(
      `Fresh Observatory proof diverges from the reviewed release master `
      + `(MAE ${meanAbsoluteError.toFixed(3)}, material ${(materialRatio * 100).toFixed(3)}%). `
      + 'Review the new engine capture and replace the master only in a separate, visually approved release change.',
    );
  }
  return { meanAbsoluteError, materialRatio };
}

async function renderWebCover(output, base, layers, panels) {
  const composites = [];
  for (const layer of layers) composites.push({ input: await imageLayer(layer.path, layer), left: layer.left, top: layer.top });
  composites.push({ input: svgCoverOverlay(panels), left: 0, top: 0 });
  await sharp(base)
    .composite(composites)
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(output);
  const meta = await sharp(output).metadata();
  if (meta.format !== 'webp' || meta.width !== COVER_WIDTH || meta.height !== COVER_HEIGHT) {
    throw new Error(`${output} is not an exact ${COVER_WIDTH}x${COVER_HEIGHT} WebP`);
  }
}

function pdfColour(hex) {
  const value = hex.replace('#', '');
  return rgb(Number.parseInt(value.slice(0, 2), 16) / 255, Number.parseInt(value.slice(2, 4), 16) / 255, Number.parseInt(value.slice(4, 6), 16) / 255);
}

function fitImage(page, image, { x, y, width, height }) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  page.drawImage(image, { x: x + (width - drawWidth) / 2, y: y + (height - drawHeight) / 2, width: drawWidth, height: drawHeight });
}

function wrapPdf(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(page, text, { x, y, width, font, size, colour, lineHeight = size * 1.35 }) {
  const lines = wrapPdf(text, font, size, width);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, font, size, color: colour }));
  return y - lines.length * lineHeight;
}

function beginArtifact(page) {
  page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [PDFName.of('Artifact')]));
}

function beginSemantic(page, tags, role, alt = null) {
  const mcid = tags.length;
  page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
    PDFName.of(role),
    page.doc.context.obj({ MCID: PDFNumber.of(mcid) }),
  ]));
  tags.push({ role, alt });
}

function tagged(page, tags, role, draw, alt = null) {
  beginSemantic(page, tags, role, alt);
  const result = draw();
  page.pushOperators(endMarkedContent());
  return result;
}

function artifact(page, draw) {
  beginArtifact(page);
  const result = draw();
  page.pushOperators(endMarkedContent());
  return result;
}

function attachSemanticTags(pdf, pages, tagsByPage) {
  const structTreeRoot = pdf.context.obj({ Type: PDFName.of('StructTreeRoot') });
  const structTreeRootRef = pdf.context.register(structTreeRoot);
  const documentElement = pdf.context.obj({ Type: PDFName.of('StructElem'), S: PDFName.of('Document'), P: structTreeRootRef });
  const documentElementRef = pdf.context.register(documentElement);
  const elements = [];
  const parentNums = [];
  pages.forEach((page, index) => {
    const pageElements = tagsByPage.get(page).map((tag, mcid) => {
      const element = pdf.context.obj({
        Type: PDFName.of('StructElem'),
        S: PDFName.of(tag.role),
        P: documentElementRef,
        Pg: page.ref,
        K: PDFNumber.of(mcid),
        ...(tag.alt ? { Alt: PDFString.of(tag.alt) } : {}),
      });
      const elementRef = pdf.context.register(element);
      elements.push(elementRef);
      return elementRef;
    });
    parentNums.push(PDFNumber.of(index), pdf.context.obj(pageElements));
    page.node.set(PDFName.of('StructParents'), PDFNumber.of(index));
  });
  const parentTreeRef = pdf.context.register(pdf.context.obj({ Nums: pdf.context.obj(parentNums) }));
  structTreeRoot.set(PDFName.of('K'), pdf.context.obj([documentElementRef]));
  structTreeRoot.set(PDFName.of('ParentTree'), parentTreeRef);
  structTreeRoot.set(PDFName.of('ParentTreeNextKey'), PDFNumber.of(pages.length));
  documentElement.set(PDFName.of('K'), pdf.context.obj(elements));
  pdf.catalog.set(PDFName.of('StructTreeRoot'), structTreeRootRef);
  pdf.catalog.set(PDFName.of('MarkInfo'), pdf.context.obj({ Marked: PDFBool.True }));
  pdf.catalog.set(PDFName.of('Lang'), PDFString.of('en-GB'));
  pdf.catalog.set(PDFName.of('ViewerPreferences'), pdf.context.obj({ DisplayDocTitle: PDFBool.True }));
}

async function makeWholeSkySample(output, { chartPath, readingPath, observatoryPath }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const display = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const chart = await pdf.embedJpg(await sharp(chartPath).jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer());
  const reading = await pdf.embedJpg(await sharp(readingPath).jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer());
  const observatory = await pdf.embedJpg(await sharp(observatoryPath).jpeg({ quality: 91, chromaSubsampling: '4:4:4' }).toBuffer());
  const pageSize = [595.28, 841.89];
  const pages = [];
  const tagsByPage = new Map();
  const pageBase = (eyebrow, title, pageNumber) => {
    const page = pdf.addPage(pageSize);
    const tags = [];
    pages.push(page); tagsByPage.set(page, tags);
    artifact(page, () => {
      page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: pdfColour(COOL.void) });
      page.drawRectangle({ x: 24, y: 24, width: 547.28, height: 793.89, borderColor: pdfColour(COOL.silver), borderWidth: 1, opacity: .96, borderOpacity: .68 });
      page.drawRectangle({ x: 34, y: 34, width: 527.28, height: 773.89, borderColor: pdfColour(COOL.ion), borderWidth: .55, borderOpacity: .34 });
      page.drawText('ASTROPRECISE STUDIO', { x: 52, y: 780, font: bold, size: 10, color: pdfColour(COOL.paper) });
      page.drawText('WHOLE SKY EDITION / FICTIONAL SAMPLE', { x: 52, y: 763, font: regular, size: 6.8, color: pdfColour(COOL.ion) });
      page.drawRectangle({ x: 434, y: 765, width: 105, height: 27, color: pdfColour(COOL.ion), opacity: .98 });
      page.drawText('FICTIONAL SAMPLE', { x: 446, y: 775, font: bold, size: 7.6, color: pdfColour('#07101E') });
      page.drawText(`WHOLE SKY EDITION - FICTIONAL SAMPLE                                      ${pageNumber} / 4`, { x: 52, y: 50, font: bold, size: 6.7, color: pdfColour(COOL.silver) });
    });
    tagged(page, tags, 'P', () => page.drawText(eyebrow, { x: 52, y: 722, font: bold, size: 8, color: pdfColour(COOL.mint) }));
    tagged(page, tags, 'H1', () => page.drawText(title, { x: 52, y: 682, font: display, size: 26, color: pdfColour(COOL.paper) }));
    tagged(page, tags, 'P', () => page.drawText('Aurora Vale / fictional fixture / self commission', { x: 52, y: 653, font: regular, size: 8.5, color: pdfColour(COOL.silverBright) }));
    return page;
  };

  let page = pageBase('THE COMPLETE DIGITAL STUDIO EDITION', 'A complete personal sky.', 1);
  let tags = tagsByPage.get(page);
  artifact(page, () => page.drawRectangle({ x: 52, y: 361, width: 240, height: 250, color: pdfColour(COOL.panel), borderColor: pdfColour(COOL.ion), borderWidth: .8, borderOpacity: .56 }));
  tagged(page, tags, 'Figure', () => fitImage(page, chart, { x: 62, y: 371, width: 220, height: 230 }), 'Fictional Aurora Vale natal chart print excerpt.');
  artifact(page, () => page.drawRectangle({ x: 310, y: 361, width: 229, height: 250, color: pdfColour(COOL.panel), borderColor: pdfColour(COOL.violet), borderWidth: .8, borderOpacity: .62 }));
  tagged(page, tags, 'Figure', () => fitImage(page, reading, { x: 320, y: 371, width: 209, height: 230 }), 'Fictional Aurora Vale Personal Sky Keepsake reading cover.');
  artifact(page, () => page.drawRectangle({ x: 52, y: 104, width: 487, height: 224, color: pdfColour(COOL.panel), borderColor: pdfColour(COOL.mint), borderWidth: .8, borderOpacity: .62 }));
  tagged(page, tags, 'Figure', () => fitImage(page, observatory, { x: 62, y: 114, width: 467, height: 204 }), 'Fictional schematic Observatory still using computed birth-hour positions.');
  tagged(page, tags, 'H2', () => page.drawText('READING', { x: 66, y: 343, font: bold, size: 7.6, color: pdfColour(COOL.ion) }));
  tagged(page, tags, 'H2', () => page.drawText('PRINT PACK', { x: 325, y: 343, font: bold, size: 7.6, color: pdfColour(COOL.violet) }));
  tagged(page, tags, 'H2', () => page.drawText('SCHEMATIC OBSERVATORY STILL / COMPUTED POSITIONS', { x: 66, y: 86, font: bold, size: 7.2, color: pdfColour(COOL.mint) }));

  page = pageBase('READING AND PRINT EXCERPTS', 'One chart, two ways to keep it.', 2);
  tags = tagsByPage.get(page);
  artifact(page, () => page.drawRectangle({ x: 52, y: 327, width: 216, height: 292, color: pdfColour(COOL.panel), borderColor: pdfColour(COOL.violet), borderWidth: .8, borderOpacity: .62 }));
  tagged(page, tags, 'Figure', () => fitImage(page, reading, { x: 64, y: 339, width: 192, height: 268 }), 'Fictional Personal Sky Keepsake reading excerpt.');
  artifact(page, () => page.drawRectangle({ x: 286, y: 327, width: 253, height: 292, color: pdfColour(COOL.panel), borderColor: pdfColour(COOL.ion), borderWidth: .8, borderOpacity: .62 }));
  tagged(page, tags, 'Figure', () => fitImage(page, chart, { x: 298, y: 339, width: 229, height: 268 }), 'Fictional natal print excerpt from the same computed chart.');
  artifact(page, () => page.drawRectangle({ x: 52, y: 101, width: 487, height: 190, color: pdfColour(COOL.raised), borderColor: pdfColour(COOL.silver), borderWidth: .75, borderOpacity: .48 }));
  tagged(page, tags, 'H2', () => page.drawText('WHAT THESE EXCERPTS PROVE', { x: 72, y: 260, font: bold, size: 8, color: pdfColour(COOL.ion) }));
  let y = tagged(page, tags, 'P', () => drawParagraph(page, 'The 20-page keepsake translates computed chart positions into reflective language for entertainment and personal reflection.', { x: 72, y: 232, width: 447, font: regular, size: 10.5, colour: pdfColour(COOL.paper), lineHeight: 15 }));
  y = tagged(page, tags, 'P', () => drawParagraph(page, 'The A3 and A4 print plates preserve the same chart wheel geometry. Layout finishing does not redraw a degree, house cusp or aspect.', { x: 72, y: y - 13, width: 447, font: regular, size: 10.5, colour: pdfColour(COOL.silverBright), lineHeight: 15 }));
  tagged(page, tags, 'P', () => drawParagraph(page, 'Every preview is visibly marked FICTIONAL SAMPLE and contains no customer data.', { x: 72, y: y - 13, width: 447, font: bold, size: 9.5, colour: pdfColour(COOL.mint), lineHeight: 14 }));

  page = pageBase('SCHEMATIC OBSERVATORY BIRTH-HOUR STILL', 'The authored whole-system view.', 3);
  tags = tagsByPage.get(page);
  artifact(page, () => page.drawRectangle({ x: 52, y: 274, width: 487, height: 365, color: pdfColour(COOL.panel), borderColor: pdfColour(COOL.mint), borderWidth: 1, borderOpacity: .7 }));
  tagged(page, tags, 'Figure', () => fitImage(page, observatory, { x: 62, y: 284, width: 467, height: 345 }), 'Full fictional Observatory still, clearly labelled schematic and not a photograph.');
  artifact(page, () => page.drawRectangle({ x: 52, y: 103, width: 487, height: 134, color: pdfColour(COOL.raised), borderColor: pdfColour(COOL.silver), borderWidth: .75, borderOpacity: .5 }));
  tagged(page, tags, 'H2', () => page.drawText('SCHEMATIC / NOT A PHOTOGRAPH', { x: 72, y: 204, font: bold, size: 10, color: pdfColour(COOL.mint) }));
  tagged(page, tags, 'P', () => drawParagraph(page, 'This still is captured from the real AstroPrecise Observatory engine at the recorded UTC birth moment. Planet positions are computed; distances, visible body sizes and the whole-system camera are compressed for clarity.', { x: 72, y: 178, width: 447, font: regular, size: 10, colour: pdfColour(COOL.paper), lineHeight: 14 }));

  page = pageBase('DELIVERY MAP', 'Everything in one private delivery.', 4);
  tags = tagsByPage.get(page);
  const rows = [
    ['01', 'Personal Sky Keepsake', '20-page screen PDF and an ink-light print edition.'],
    ['02', 'Natal Sky Print Pack', 'A3 and A4 PDFs plus five computed PNG layouts.'],
    ['03', 'Observatory still', 'One 4800 x 3600 SCHEMATIC PNG from the recorded birth hour.'],
    ['04', 'Audited delivery', 'Print guide, personal-use licence, credits and SHA-256 integrity manifest.'],
  ];
  rows.forEach((row, index) => {
    const rowY = 575 - index * 112;
    artifact(page, () => {
      page.drawRectangle({ x: 52, y: rowY, width: 487, height: 86, color: pdfColour(index % 2 ? COOL.raised : COOL.panel), borderColor: pdfColour(index % 2 ? COOL.violet : COOL.ion), borderWidth: .75, borderOpacity: .42 });
      page.drawText(row[0], { x: 72, y: rowY + 50, font: bold, size: 12, color: pdfColour(COOL.ion) });
    });
    tagged(page, tags, 'H2', () => page.drawText(row[1], { x: 118, y: rowY + 52, font: bold, size: 13, color: pdfColour(COOL.paper) }));
    tagged(page, tags, 'P', () => drawParagraph(page, row[2], { x: 118, y: rowY + 29, width: 396, font: regular, size: 8.8, colour: pdfColour(COOL.silverBright), lineHeight: 12 }));
  });
  tagged(page, tags, 'H2', () => page.drawText('PERSONALISED FOR THE CHART SUBJECT / DIGITAL FILES ONLY', { x: 52, y: 102, font: bold, size: 8, color: pdfColour(COOL.mint) }));
  tagged(page, tags, 'P', () => drawParagraph(page, 'This public document is a fictional preview, not a purchased file and not a promise of predictive outcomes.', { x: 52, y: 82, width: 487, font: regular, size: 8.4, colour: pdfColour(COOL.silver), lineHeight: 12 }));

  attachSemanticTags(pdf, pages, tagsByPage);
  pdf.setTitle('Whole Sky Edition - fictional sample');
  pdf.setAuthor('Jonathan Davenport / AstroPrecise');
  pdf.setSubject('Four-page fictional preview of the self-commission Whole Sky Edition.');
  pdf.setCreator('AstroPrecise Studio v902');
  pdf.setProducer('AstroPrecise Studio v902 / pdf-lib');
  pdf.setLanguage('en-GB');
  // Stable release-build metadata; never misrepresent the fictional birth time
  // as the document's creation or modification time.
  const fixedDate = new Date('2026-08-25T00:00:00.000Z');
  pdf.setCreationDate(fixedDate); pdf.setModificationDate(fixedDate);
  const documentId = PDFHexString.of(sha256(`${JSON.stringify(ORDER)}:whole-sky-edition-sample`).slice(0, 32));
  pdf.context.trailerInfo.ID = pdf.context.obj([documentId, documentId]);
  writeFileSync(output, await pdf.save({ useObjectStreams: false, addDefaultPage: false }));
}

function edgePath() {
  const candidates = [process.env.AP_EDGE_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('Microsoft Edge not found; set AP_EDGE_PATH');
  return found;
}

async function main() {
  const root = resolve(ROOT, 'output', 'shop-studio-v901');
  const scratch = mkdtempSync(join(tmpdir(), 'ap-shop-assets-v901-'));
  const proof = join(scratch, 'proof');
  const personal = join(scratch, 'personal-cover');
  const inputs = join(root, 'cover-inputs');
  mkdirSync(proof, { recursive: true });
  mkdirSync(personal, { recursive: true });
  mkdirSync(inputs, { recursive: true });
  try {
  const orderPath = join(proof, 'fictional-order.json');
  writeFileSync(orderPath, JSON.stringify(ORDER, null, 2) + '\n');
  const sampleEnv = {
    ...process.env,
    AP_STUDIO_INPUT_HASH: sha256(JSON.stringify(ORDER)),
    AP_STUDIO_PROVENANCE_REF: 'AP-90A901E90A901E90',
    AP_STUDIO_MODE: 'proof',
    AP_STUDIO_PDF_FIXED_DATE: '2026-08-25T00:00:00.000Z',
  };
  for (const [script, args, timeout] of [
    ['tools/generate-natal-print-pack.mjs', ['--in', orderPath, '--out', proof], 120_000],
    ['tools/capture-observatory-still.mjs', ['--in', orderPath, '--out', proof], 120_000],
    ['tools/generate-reading.mjs', ['--in', orderPath, '--out', proof], 60_000],
    ['tools/render-product-pdfs.mjs', ['--dir', proof], 120_000],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', timeout, env: sampleEnv });
    if (result.status !== 0) throw new Error(`${script}\n${result.stdout}\n${result.stderr}`);
  }
  const personalOrder = { ...ORDER, orderId: 'FICTIONAL-PERSONAL-COVER-901', product: 'personal-sky-keepsake' };
  const personalOrderPath = join(personal, 'fictional-order.json');
  writeFileSync(personalOrderPath, JSON.stringify(personalOrder, null, 2) + '\n');
  const personalSampleEnv = {
    ...sampleEnv,
    AP_STUDIO_INPUT_HASH: sha256(JSON.stringify(personalOrder)),
    AP_STUDIO_PROVENANCE_REF: 'AP-90A901E90A901E91',
  };
  const personalResult = spawnSync(process.execPath, ['tools/generate-reading.mjs', '--in', personalOrderPath, '--out', personal], {
    cwd: ROOT, encoding: 'utf8', timeout: 60_000,
    env: personalSampleEnv,
  });
  if (personalResult.status !== 0) throw new Error(`${personalResult.stdout}\n${personalResult.stderr}`);
  const personalRender = spawnSync(process.execPath, ['tools/render-product-pdfs.mjs', '--dir', personal], {
    cwd: ROOT, encoding: 'utf8', timeout: 120_000,
    env: personalSampleEnv,
  });
  if (personalRender.status !== 0) throw new Error(`${personalRender.stdout}\n${personalRender.stderr}`);
  const readingHtml = readdirSync(personal).find((name) => name.startsWith('reading-') && name.endsWith('.html'));
  if (!readingHtml) throw new Error('Proof reading HTML missing');
  const html = readFileSync(join(personal, readingHtml), 'utf8').replace(/<head>/i, `<head><base href="${pathToFileURL(join(ROOT, 'website') + '/').href}">`);
  const browser = await chromium.launch({ executablePath: edgePath(), headless: true });
  const context = await browser.newContext({ viewport: { width: 900, height: 1300 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    await page.locator('.page.cover').screenshot({ path: join(inputs, 'aurora-vale-reading-cover.png') });
  } finally {
    await context.close();
    await browser.close();
  }
  const chartInput = join(inputs, 'aurora-vale-chart-square-2160.png');
  const readingInput = join(inputs, 'aurora-vale-reading-cover.png');
  const observatorySource = join(proof, '06-observatory-birth-hour-schematic-4800x3600.png');
  const observatoryInput = join(inputs, 'aurora-vale-observatory-still.png');
  copyFileSync(join(proof, '02-natal-square-2160x2160.png'), chartInput);
  mkdirSync(COVER_DIR, { recursive: true });
  const observatoryCandidate = await sharp(observatorySource)
    .resize(1920, 923, { fit: 'cover', position: 'centre' })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
  if (!existsSync(OBSERVATORY_MASTER)) {
    throw new Error('Reviewed Observatory release master is missing; add it only as a separate, visually approved release change');
  }
  const observatoryMatch = await verifyObservatoryMaster(observatoryCandidate, OBSERVATORY_MASTER);
  await sharp(OBSERVATORY_MASTER)
    .resize(1374, 660, { fit: 'fill' })
    .modulate({ brightness: 1.02, saturation: 1.02 })
    .png({ compressionLevel: 9 })
    .toFile(observatoryInput);

  await renderWebCover(
    join(COVER_DIR, 'natal-sky-print-pack.webp'),
    svgCoverBase({
      index: '01 / NATAL SKY PRINT PACK',
      eyebrow: 'COMPUTED CHART / HOME PRINT + SCREEN',
      title: 'Natal Sky', title2: 'Print Pack',
      line1: 'A3 + A4 plates', line2: 'Five purpose-built PNG layouts',
      note: 'Real sample chart. No invented wheel geometry.', accent: COOL.ion,
    }),
    [{ path: chartInput, left: 635, top: 72, width: 570, height: 570, fit: 'contain' }],
    [{ x: 620, y: 58, width: 600, height: 598, stroke: COOL.ion, opacity: .72 }],
  );
  await renderWebCover(
    join(COVER_DIR, 'personal-sky-keepsake.webp'),
    svgCoverBase({
      index: '02 / PERSONAL SKY KEEPSAKE',
      eyebrow: 'DESIGNED READING / COMPUTED POSITIONS',
      title: 'Personal Sky', title2: 'Keepsake',
      line1: '20 intentional pages', line2: 'Screen + ink-light editions',
      note: 'A calm reading, designed from the same chart.', accent: COOL.violet,
    }),
    [
      { path: readingInput, left: 790, top: 82, width: 390, height: 530, fit: 'contain' },
      { path: chartInput, left: 610, top: 398, width: 230, height: 230, fit: 'contain' },
    ],
    [
      { x: 774, y: 66, width: 422, height: 562, stroke: COOL.violet, opacity: .68 },
      { x: 596, y: 384, width: 258, height: 258, stroke: COOL.ion, opacity: .7 },
    ],
  );
  await renderWebCover(
    join(COVER_DIR, 'whole-sky-edition.webp'),
    svgCoverBase({
      index: '03 / WHOLE SKY EDITION',
      eyebrow: 'THE COMPLETE DIGITAL STUDIO EDITION',
      title: 'Whole Sky', title2: 'Edition',
      line1: 'Reading + print pack', line2: 'SCHEMATIC Observatory still',
      note: 'Three linked artefacts from one computed sky.', accent: COOL.mint,
    }),
    [
      { path: chartInput, left: 610, top: 84, width: 270, height: 270, fit: 'contain' },
      { path: readingInput, left: 906, top: 84, width: 238, height: 270, fit: 'contain' },
      { path: observatoryInput, left: 610, top: 402, width: 534, height: 224, fit: 'cover', position: 'centre' },
    ],
    [
      { x: 596, y: 70, width: 298, height: 298, stroke: COOL.ion, opacity: .7 },
      { x: 892, y: 70, width: 266, height: 298, stroke: COOL.violet, opacity: .72 },
      { x: 596, y: 388, width: 562, height: 252, stroke: COOL.mint, opacity: .78 },
    ],
  );

  mkdirSync(SAMPLE_DIR, { recursive: true });
  copyFileSync(join(proof, 'natal-sky-home-print-a3.pdf'), join(SAMPLE_DIR, 'natal-sky-print-pack-sample.pdf'));
  copyFileSync(join(personal, 'personal-sky-keepsake-screen.pdf'), join(SAMPLE_DIR, 'personal-sky-keepsake-sample.pdf'));
  await makeWholeSkySample(join(SAMPLE_DIR, 'whole-sky-edition-sample.pdf'), {
    chartPath: chartInput,
    readingPath: readingInput,
    observatoryPath: observatoryInput,
  });
  const wholeSample = await PDFDocument.load(readFileSync(join(SAMPLE_DIR, 'whole-sky-edition-sample.pdf')));
  if (
    wholeSample.getPageCount() !== 4 ||
    !wholeSample.catalog.has(PDFName.of('StructTreeRoot')) ||
    !wholeSample.catalog.has(PDFName.of('MarkInfo'))
  ) throw new Error('Whole Sky public sample must be a four-page tagged PDF');

  const files = ['aurora-vale-chart-square-2160.png', 'aurora-vale-reading-cover.png', 'aurora-vale-observatory-still.png'];
  const outputs = [
    join(COVER_DIR, 'natal-sky-print-pack.webp'),
    join(COVER_DIR, 'personal-sky-keepsake.webp'),
    join(COVER_DIR, 'whole-sky-edition.webp'),
    join(SAMPLE_DIR, 'natal-sky-print-pack-sample.pdf'),
    join(SAMPLE_DIR, 'personal-sky-keepsake-sample.pdf'),
    join(SAMPLE_DIR, 'whole-sky-edition-sample.pdf'),
  ];
  const manifest = {
    schema: 'astroprecise-shop-cover-inputs-v901',
    fixture: 'fictional Aurora Vale sample',
    generator: 'tools/generate-shop-assets.mjs',
    files: files.map((file) => {
      const bytes = readFileSync(join(inputs, file));
      return { file, bytes: bytes.length, sha256: sha256(bytes) };
    }),
    outputs: outputs.map((file) => {
      const bytes = readFileSync(file);
      return { file: file.slice(ROOT.length + 1).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) };
    }),
    rules: ['Every marketplace cover says SAMPLE', 'The Observatory tile remains visibly SCHEMATIC', 'The Observatory preview is a crop of the exact real-engine still', 'No synthetic chart geometry', 'The launch preview is self-commission only'],
  };
  writeFileSync(join(inputs, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `Studio visuals ready: 3 covers + 3 public sample PDFs · Observatory master MAE `
    + `${observatoryMatch.meanAbsoluteError.toFixed(3)} · ${inputs}`,
  );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Shop asset generation failed: ${error.message}`);
  process.exit(1);
});
