#target illustrator
#targetengine "astroprecise_gift_v901"
/*
 * AstroPrecise Birthday Orbit v901
 *
 * Illustrator is the finishing room only: it adds framing, typography and
 * outlined brand seals around authentic, precomputed Aurora Vale fixture
 * rasters. It never redraws or distorts chart geometry.
 */

var PROJECT = "C:/Users/jonny/dev/astroprecise";
var BRAND_KIT = "C:/Users/jonny/Adobe-Close-Dump/brand-marks-outlined/FINAL-v900-20260823";
var INPUT_ROOT = PROJECT + "/output/shop-studio-v901/cover-inputs";
var OUT_ROOT = Folder("C:/Users/jonny/Adobe-Close-Dump/shop-gift-v901");

var INPUTS = {
  chart: File(INPUT_ROOT + "/aurora-vale-chart-square-2160.png"),
  reading: File(INPUT_ROOT + "/aurora-vale-reading-cover.png"),
  observatory: File(INPUT_ROOT + "/aurora-vale-observatory-still.png"),
  manifest: File(INPUT_ROOT + "/manifest.json"),
  logo: File(BRAND_KIT + "/logo-mark-outlined.ai"),
  seal: File(BRAND_KIT + "/chart-outlined.ai")
};

function pad2(value) { return value < 10 ? "0" + value : String(value); }
function stamp(now) {
  return now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + "-" +
    pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
}

var OUT_DIR = Folder(OUT_ROOT.fsName + "/v901-" + stamp(new Date()));

function rgb(hex) {
  var value = hex.replace("#", "");
  var color = new RGBColor();
  color.red = parseInt(value.substring(0, 2), 16);
  color.green = parseInt(value.substring(2, 4), 16);
  color.blue = parseInt(value.substring(4, 6), 16);
  return color;
}

/* Midnight Meridian v901. No orange, copper or gold. */
var C = {
  voidInk: rgb("#040812"),
  deep: rgb("#0A1424"),
  raised: rgb("#101D30"),
  paper: rgb("#EEF4FA"),
  silver: rgb("#93A8BF"),
  ion: rgb("#8BA9FF"),
  violet: rgb("#A897FF"),
  mint: rgb("#6FD0B3"),
  cyan: rgb("#79C7F2"),
  rose: rgb("#FF9CB7")
};

function ensureFolder(folder) {
  if (!folder.exists && !folder.create()) throw new Error("Could not create folder: " + folder.fsName);
}

function assertInputs() {
  var key;
  for (key in INPUTS) {
    if (!INPUTS[key].exists || INPUTS[key].length <= 0) {
      throw new Error("Required gift input missing: " + INPUTS[key].fsName);
    }
  }
}

function fontByNames(names) {
  var i;
  for (i = 0; i < names.length; i++) {
    try { return app.textFonts.getByName(names[i]); } catch (error) {}
  }
  return app.textFonts[0];
}

var FONT_DISPLAY = fontByNames(["SchibstedGrotesk-Bold", "AcuminConcept-Bold", "Arial-BoldMT", "ArialMT"]);
var FONT_BODY = fontByNames(["SchibstedGrotesk-Regular", "AcuminConcept-Regular", "ArialMT"]);
var FONT_DATA = fontByNames(["IBMPlexMono-Medium", "SourceCodeRoman-Medium", "CourierNewPSMT", "ArialMT"]);

function rect(doc, x, top, width, height, fill, stroke, strokeWidth, radius) {
  var item = radius ?
    doc.pathItems.roundedRectangle(top, x, width, height, radius, radius) :
    doc.pathItems.rectangle(top, x, width, height);
  item.filled = Boolean(fill);
  if (fill) item.fillColor = fill;
  item.stroked = Boolean(stroke);
  if (stroke) {
    item.strokeColor = stroke;
    item.strokeWidth = strokeWidth || 1;
  }
  return item;
}

function line(doc, x1, y1, x2, y2, color, width) {
  var item = doc.pathItems.add();
  item.setEntirePath([[x1, y1], [x2, y2]]);
  item.filled = false;
  item.stroked = true;
  item.strokeColor = color;
  item.strokeWidth = width || 1;
  return item;
}

function pointText(doc, value, x, y, size, color, font, tracking) {
  var text = doc.textFrames.pointText([x, y]);
  text.contents = value;
  var attributes = text.textRange.characterAttributes;
  attributes.size = size;
  attributes.fillColor = color;
  attributes.textFont = font || FONT_BODY;
  if (tracking != null) attributes.tracking = tracking;
  return text;
}

function placeFit(doc, file, x, top, width, height) {
  var item = doc.placedItems.add();
  item.file = file;
  var originalRatio = item.width / item.height;
  var scale = Math.min(width / item.width, height / item.height);
  item.width = item.width * scale;
  item.height = item.height * scale;
  item.left = x + (width - item.width) / 2;
  item.top = top - (height - item.height) / 2;
  var placedRatio = item.width / item.height;
  if (Math.abs(originalRatio - placedRatio) > 0.001) {
    throw new Error("Authentic raster aspect ratio changed: " + file.fsName);
  }
  item.embed();
  return item;
}

function panel(doc, file, x, top, width, height, strokeColor) {
  rect(doc, x, top, width, height, C.raised, strokeColor || C.silver, 1, 10);
  return placeFit(doc, file, x + 8, top - 8, width - 16, height - 16);
}

function chip(doc, value, x, top, width, fill, textColor) {
  rect(doc, x, top, width, 34, fill, null, 0, 5);
  pointText(doc, value, x + 16, top - 22, 11, textColor, FONT_DATA, 95);
}

function addCommon(doc, indexLabel) {
  rect(doc, 0, 720, 1280, 720, C.voidInk, null, 0, 0);
  rect(doc, 24, 696, 1232, 672, C.deep, C.silver, 1, 14).opacity = 92;
  rect(doc, 42, 678, 1196, 636, null, C.ion, 1, 10).opacity = 35;
  placeFit(doc, INPUTS.logo, 68, 654, 44, 44);
  pointText(doc, "ASTROPRECISE", 126, 634, 17, C.paper, FONT_DATA, 145);
  pointText(doc, "BIRTHDAY ORBIT EDITION - V901", 126, 610, 10, C.silver, FONT_DATA, 76);
  chip(doc, "FICTIONAL SAMPLE", 1041, 662, 162, C.ion, C.voidInk);
  pointText(doc, indexLabel, 68, 76, 11, C.silver, FONT_DATA, 75);
  pointText(doc, "DIGITAL COMMISSION - NO PHYSICAL ITEM", 806, 76, 11, C.silver, FONT_DATA, 50);
}

function addGiftSeal(doc, x, top) {
  rect(doc, x, top, 104, 104, C.raised, C.violet, 1, 52);
  placeFit(doc, INPUTS.seal, x + 16, top - 16, 72, 72);
}

function addTitle(doc, eyebrow, title1, title2, sub1, sub2) {
  pointText(doc, eyebrow, 70, 548, 12, C.cyan, FONT_DATA, 115);
  pointText(doc, title1, 70, 486, 46, C.paper, FONT_DISPLAY, -15);
  if (title2) pointText(doc, title2, 70, 433, 46, C.paper, FONT_DISPLAY, -15);
  pointText(doc, sub1, 72, 358, 19, C.silver, FONT_BODY, 0);
  if (sub2) pointText(doc, sub2, 72, 327, 19, C.silver, FONT_BODY, 0);
}

function addDedication(doc, x, top, width, toName, fromName) {
  rect(doc, x, top, width, 126, C.raised, C.violet, 1, 9);
  pointText(doc, "A BIRTHDAY SKY FOR", x + 20, top - 25, 10, C.violet, FONT_DATA, 105);
  pointText(doc, toName, x + 20, top - 59, 25, C.paper, FONT_DISPLAY, -5);
  line(doc, x + 20, top - 77, x + width - 20, top - 77, C.silver, 0.7).opacity = 55;
  pointText(doc, "WITH LOVE FROM " + fromName, x + 20, top - 99, 10, C.mint, FONT_DATA, 70);
}

function makeGiftKeepsake(doc) {
  addCommon(doc, "01 / GIFT PERSONAL SKY KEEPSAKE");
  addTitle(doc, "PERSONALISED BIRTHDAY READING", "A sky story", "for Aurora", "A chart-derived keepsake", "made for one exact birth moment");
  panel(doc, INPUTS.chart, 724, 612, 430, 430, C.ion);
  panel(doc, INPUTS.reading, 606, 298, 190, 228, C.violet);
  addDedication(doc, 70, 274, 430, "AURORA", "SAM");
  addGiftSeal(doc, 932, 166);
  pointText(doc, "COMPUTED CHART", 822, 148, 10, C.ion, FONT_DATA, 100);
  pointText(doc, "DESIGNED READING", 822, 126, 10, C.violet, FONT_DATA, 100);
}

function makeGiftWhole(doc) {
  addCommon(doc, "02 / GIFT WHOLE SKY EDITION");
  addTitle(doc, "THE COMPLETE BIRTHDAY EDITION", "Birthday Orbit", "Whole Sky", "Reading, print pack and", "a SCHEMATIC 3D still");
  panel(doc, INPUTS.chart, 648, 608, 250, 250, C.ion);
  panel(doc, INPUTS.reading, 924, 608, 184, 250, C.violet);
  panel(doc, INPUTS.observatory, 648, 330, 460, 208, C.mint);
  chip(doc, "SCHEMATIC 3D STILL", 786, 142, 204, C.mint, C.voidInk);
  addDedication(doc, 70, 272, 430, "AURORA", "SAM");
}

function makeBirthdayDetail(doc) {
  addCommon(doc, "03 / BIRTHDAY ORBIT DETAIL");
  pointText(doc, "ONE REAL COMPUTATION - THREE GIFT-READY FORMATS", 70, 548, 12, C.cyan, FONT_DATA, 105);
  pointText(doc, "Made personal.", 70, 489, 43, C.paper, FONT_DISPLAY, -15);
  pointText(doc, "Made to keep.", 70, 439, 43, C.paper, FONT_DISPLAY, -15);
  addDedication(doc, 70, 374, 410, "AURORA", "SAM");
  panel(doc, INPUTS.chart, 550, 610, 270, 270, C.ion);
  panel(doc, INPUTS.reading, 846, 610, 188, 270, C.violet);
  panel(doc, INPUTS.observatory, 550, 308, 484, 198, C.mint);
  addGiftSeal(doc, 1062, 242);
  chip(doc, "SCHEMATIC 3D", 570, 126, 158, C.mint, C.voidInk);
  chip(doc, "CHART-DERIVED", 744, 126, 158, C.ion, C.voidInk);
  chip(doc, "DIGITAL GIFT", 918, 126, 142, C.violet, C.voidInk);
}

function outlineText(doc) {
  var count = doc.textFrames.length;
  var i;
  for (i = doc.textFrames.length - 1; i >= 0; i--) doc.textFrames[i].createOutline();
  return count;
}

function assertArtwork(doc, stem) {
  if (!doc.pageItems.length) throw new Error("No artwork in " + stem);
  var art = doc.artboards[0].artboardRect;
  var visible = doc.visibleBounds;
  var tolerance = 1;
  if (visible[0] < art[0] - tolerance || visible[1] > art[1] + tolerance ||
      visible[2] > art[2] + tolerance || visible[3] < art[3] - tolerance) {
    throw new Error("Artwork escapes 1280x720 artboard for " + stem + ": " + visible.join(","));
  }
}

function saveAi(doc, file) {
  var options = new IllustratorSaveOptions();
  options.compressed = true;
  options.pdfCompatible = true;
  doc.saveAs(file, options);
}

function savePdf(doc, file) {
  var options = new PDFSaveOptions();
  options.preserveEditability = false;
  options.compatibility = PDFCompatibility.ACROBAT7;
  doc.saveAs(file, options);
}

function exportPng(doc, file) {
  var options = new ExportOptionsPNG24();
  options.artBoardClipping = true;
  options.antiAliasing = true;
  options.transparency = false;
  options.horizontalScale = 100;
  options.verticalScale = 100;
  doc.exportFile(file, ExportType.PNG24, options);
}

function assertFile(file, label) {
  if (!file.exists || file.length <= 0) throw new Error("Missing " + label + ": " + file.fsName);
}

function exportCover(stem, builder) {
  var doc = null;
  try {
    doc = app.documents.add(DocumentColorSpace.RGB, 1280, 720);
    doc.artboards[0].artboardRect = [0, 720, 1280, 0];
    doc.documentInfo.title = "AstroPrecise Birthday Orbit v901 - " + stem;
    doc.documentInfo.author = "AstroPrecise Studio";
    doc.documentInfo.subject = "Fictional Aurora Vale digital gift sample";
    builder(doc);
    assertArtwork(doc, stem);

    var ai = File(OUT_DIR.fsName + "/" + stem + ".ai");
    var pdf = File(OUT_DIR.fsName + "/" + stem + ".pdf");
    var png = File(OUT_DIR.fsName + "/" + stem + ".png");

    saveAi(doc, ai); // Editable AI retains live text and embedded authentic rasters.
    var outlinedCount = outlineText(doc);
    if (outlinedCount <= 0 || doc.textFrames.length !== 0) {
      throw new Error("Outlined export assertion failed for " + stem);
    }
    exportPng(doc, png);
    savePdf(doc, pdf);
    assertFile(ai, "editable AI");
    assertFile(pdf, "outlined PDF");
    assertFile(png, "exact-size PNG");
  } finally {
    /* 2 is aiDoNotSaveChanges; the three explicit exports are already asserted. */
    if (doc) doc.close(2);
  }
}

function writeReport(message) {
  var file = File(OUT_DIR.fsName + "/EXPORT-REPORT.txt");
  file.encoding = "UTF-8";
  file.lineFeed = "Windows";
  if (!file.open("w")) throw new Error("Cannot write report: " + file.fsName);
  file.writeln(message);
  file.close();
}

function main() {
  assertInputs();
  ensureFolder(OUT_ROOT);
  if (OUT_DIR.exists) throw new Error("Refusing to reuse Illustrator output: " + OUT_DIR.fsName);
  ensureFolder(OUT_DIR);

  exportCover("gift-personal-sky-keepsake-cover-1280x720", makeGiftKeepsake);
  exportCover("gift-whole-sky-edition-cover-1280x720", makeGiftWhole);
  exportCover("birthday-orbit-detail-cover-1280x720", makeBirthdayDetail);

  /* Each format is asserted immediately after export in exportCover(). */

  var message = "AstroPrecise Birthday Orbit v901 export complete.\n" +
    "Illustrator: " + app.version + "\n" +
    "Fixture: fictional Aurora Vale\n" +
    "Inputs: authentic chart, corrected reading cover, SCHEMATIC Observatory still\n" +
    "Added in Illustrator: framing, typography, dedication and outlined seals only\n" +
    "Palette: Midnight Meridian v901; no orange, copper or gold\n" +
    "Fonts: " + FONT_DISPLAY.name + ", " + FONT_BODY.name + ", " + FONT_DATA.name + "\n" +
    "Outputs: 3 editable AI, 3 outlined PDF and 3 exact-size PNG\n" +
    "Output: " + OUT_DIR.fsName;
  writeReport(message);
  return message;
}

main();
