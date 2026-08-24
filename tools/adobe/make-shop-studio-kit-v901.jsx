#target illustrator
#targetengine "astroprecise_shop_v901"
/* AstroPrecise Studio v901 — authentic-raster marketplace cover production. */

var PROJECT = "C:/Users/jonny/dev/astroprecise";
var BRAND_KIT = "C:/Users/jonny/Adobe-Close-Dump/brand-marks-outlined/FINAL-v900-20260823";
var INPUT_ROOT = PROJECT + "/output/shop-studio-v901/cover-inputs";
var OUT_ROOT = Folder("C:/Users/jonny/Adobe-Close-Dump/shop-studio-covers");
var INPUTS = {
  chart: File(INPUT_ROOT + "/aurora-vale-chart-square-2160.png"),
  reading: File(INPUT_ROOT + "/aurora-vale-reading-cover.png"),
  observatory: File(INPUT_ROOT + "/aurora-vale-observatory-still.png"),
  manifest: File(INPUT_ROOT + "/manifest.json"),
  logo: File(BRAND_KIT + "/logo-mark-outlined.ai"),
  seal: File(BRAND_KIT + "/chart-outlined.ai")
};

function pad2(v) { return v < 10 ? "0" + v : String(v); }
function stamp(now) {
  return now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + "-" +
    pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
}
var OUT_DIR = Folder(OUT_ROOT.fsName + "/v901-" + stamp(new Date()));

function rgb(hex) {
  var v = hex.replace("#", "");
  var c = new RGBColor();
  c.red = parseInt(v.substring(0, 2), 16);
  c.green = parseInt(v.substring(2, 4), 16);
  c.blue = parseInt(v.substring(4, 6), 16);
  return c;
}

var C = {
  voidInk: rgb("#040812"), raised: rgb("#101D30"), paper: rgb("#EEF4FA"),
  silver: rgb("#93A8BF"), silverBright: rgb("#C9D6E3"), ion: rgb("#8BA9FF"),
  violet: rgb("#A897FF"), mint: rgb("#6FD0B3")
};

function ensureFolder(folder) {
  if (!folder.exists && !folder.create()) throw new Error("Could not create folder: " + folder.fsName);
}

function assertInputs() {
  var key;
  for (key in INPUTS) {
    if (!INPUTS[key].exists || INPUTS[key].length <= 0) throw new Error("Required cover input missing: " + INPUTS[key].fsName);
  }
}

function fontByNames(names) {
  var i;
  for (i = 0; i < names.length; i++) {
    try { return app.textFonts.getByName(names[i]); } catch (e) {}
  }
  return app.textFonts[0];
}
var FONT_DISPLAY = fontByNames(["SchibstedGrotesk-Bold", "AcuminConcept-Bold", "Arial-BoldMT", "ArialMT"]);
var FONT_BODY = fontByNames(["SchibstedGrotesk-Regular", "AcuminConcept-Regular", "ArialMT"]);
var FONT_DATA = fontByNames(["IBMPlexMono-Medium", "SourceCodeRoman-Medium", "CourierNewPSMT", "ArialMT"]);

function rect(doc, x, top, w, h, fill, stroke, strokeWidth, radius) {
  var p = radius ? doc.pathItems.roundedRectangle(top, x, w, h, radius, radius) : doc.pathItems.rectangle(top, x, w, h);
  p.filled = Boolean(fill);
  if (fill) p.fillColor = fill;
  p.stroked = Boolean(stroke);
  if (stroke) { p.strokeColor = stroke; p.strokeWidth = strokeWidth || 1; }
  return p;
}

function pointText(doc, value, x, y, size, color, font, tracking) {
  var t = doc.textFrames.pointText([x, y]);
  t.contents = value;
  var a = t.textRange.characterAttributes;
  a.size = size;
  a.fillColor = color;
  a.textFont = font || FONT_BODY;
  if (tracking != null) a.tracking = tracking;
  return t;
}

function placeFit(doc, file, x, top, w, h) {
  var item = doc.placedItems.add();
  item.file = file;
  var ratio = Math.min(w / item.width, h / item.height);
  item.width = item.width * ratio;
  item.height = item.height * ratio;
  item.left = x + (w - item.width) / 2;
  item.top = top - (h - item.height) / 2;
  item.embed();
  return item;
}

function panel(doc, file, x, top, w, h) {
  rect(doc, x, top, w, h, C.raised, C.silver, 1, 10);
  return placeFit(doc, file, x + 8, top - 8, w - 16, h - 16);
}

function addCommon(doc, indexLabel) {
  rect(doc, 0, 720, 1280, 720, C.voidInk, null, 0, 0);
  rect(doc, 34, 686, 1212, 652, null, C.silver, 1, 0).opacity = 65;
  placeFit(doc, INPUTS.logo, 66, 654, 44, 44);
  pointText(doc, "ASTROPRECISE STUDIO", 124, 632, 17, C.paper, FONT_DATA, 150);
  pointText(doc, "V901 · MIDNIGHT MERIDIAN", 124, 608, 10, C.silver, FONT_DATA, 90);
  rect(doc, 1084, 660, 126, 36, C.ion, null, 0, 5);
  pointText(doc, "SAMPLE", 1104, 634, 14, C.voidInk, FONT_DATA, 120);
  pointText(doc, indexLabel, 70, 76, 11, C.silver, FONT_DATA, 80);
  pointText(doc, "DIGITAL FILES ONLY · NO PHYSICAL ITEM", 808, 76, 11, C.silverBright, FONT_DATA, 60);
}

function addTitle(doc, eyebrow, title1, title2, sub1, sub2) {
  pointText(doc, eyebrow, 70, 548, 12, C.ion, FONT_DATA, 110);
  pointText(doc, title1, 70, 486, 44, C.paper, FONT_DISPLAY, -15);
  if (title2) pointText(doc, title2, 70, 435, 44, C.paper, FONT_DISPLAY, -15);
  pointText(doc, sub1, 72, 361, 20, C.silverBright, FONT_BODY, 0);
  if (sub2) pointText(doc, sub2, 72, 329, 20, C.silverBright, FONT_BODY, 0);
}

function makePrintPack(doc) {
  addCommon(doc, "01 / NATAL SKY PRINT PACK");
  addTitle(doc, "COMPUTED CHART · HOME PRINT + SCREEN", "Natal Sky", "Print Pack", "A3 + A4 plates", "Five PNG layouts");
  panel(doc, INPUTS.chart, 668, 624, 500, 500);
  placeFit(doc, INPUTS.seal, 76, 260, 78, 78);
  pointText(doc, "Real sample chart", 174, 226, 13, C.mint, FONT_DATA, 40);
  pointText(doc, "No invented wheel geometry", 174, 202, 12, C.silver, FONT_BODY, 0);
}

function makeKeepsake(doc) {
  addCommon(doc, "02 / PERSONAL SKY KEEPSAKE");
  addTitle(doc, "DESIGNED READING · COMPUTED POSITIONS", "Personal Sky", "Keepsake", "20 intentional pages", "Screen + ink-light editions");
  panel(doc, INPUTS.reading, 760, 624, 360, 510);
  panel(doc, INPUTS.chart, 630, 296, 230, 230);
  pointText(doc, "READING", 890, 94, 11, C.ion, FONT_DATA, 100);
}

function makeWhole(doc) {
  addCommon(doc, "03 / WHOLE SKY EDITION");
  addTitle(doc, "THE COMPLETE DIGITAL STUDIO EDITION", "Whole Sky", "Edition", "Reading · print pack", "SCHEMATIC 3D still");
  panel(doc, INPUTS.chart, 648, 620, 246, 246);
  panel(doc, INPUTS.reading, 916, 620, 190, 246);
  panel(doc, INPUTS.observatory, 648, 346, 458, 220);
  rect(doc, 730, 156, 296, 34, C.raised, C.ion, 1, 4);
  pointText(doc, "SCHEMATIC 3D STILL", 760, 133, 12, C.paper, FONT_DATA, 100);
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
  var v = doc.visibleBounds;
  var tolerance = 1;
  if (v[0] < art[0] - tolerance || v[1] > art[1] + tolerance || v[2] > art[2] + tolerance || v[3] < art[3] - tolerance) {
    throw new Error("Artwork escapes 1280x720 artboard for " + stem + ": " + v.join(","));
  }
}

function saveAi(doc, file) {
  var opt = new IllustratorSaveOptions();
  opt.compressed = true; opt.pdfCompatible = true;
  doc.saveAs(file, opt);
}

function savePdf(doc, file) {
  var opt = new PDFSaveOptions();
  opt.preserveEditability = false; opt.compatibility = PDFCompatibility.ACROBAT7;
  doc.saveAs(file, opt);
}

function exportPng(doc, file) {
  var opt = new ExportOptionsPNG24();
  opt.artBoardClipping = true; opt.antiAliasing = true; opt.transparency = false;
  opt.horizontalScale = 100; opt.verticalScale = 100;
  doc.exportFile(file, ExportType.PNG24, opt);
}

function assertFile(file, label) {
  if (!file.exists || file.length <= 0) throw new Error("Missing " + label + ": " + file.fsName);
}

function exportCover(stem, builder) {
  var doc = null;
  try {
    doc = app.documents.add(DocumentColorSpace.RGB, 1280, 720);
    doc.artboards[0].artboardRect = [0, 720, 1280, 0];
    builder(doc);
    assertArtwork(doc, stem);
    var ai = File(OUT_DIR.fsName + "/" + stem + ".ai");
    var pdf = File(OUT_DIR.fsName + "/" + stem + ".pdf");
    var png = File(OUT_DIR.fsName + "/" + stem + ".png");
    saveAi(doc, ai); // editable AI retains live text
    outlineText(doc);
    if (doc.textFrames.length !== 0) throw new Error("Live text remains before PDF export: " + stem);
    exportPng(doc, png);
    savePdf(doc, pdf);
    assertFile(ai, "AI"); assertFile(pdf, "PDF"); assertFile(png, "PNG");
  } finally {
    if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
  }
}

function writeReport(message) {
  var file = File(OUT_DIR.fsName + "/EXPORT-REPORT.txt");
  file.encoding = "UTF-8"; file.lineFeed = "Windows";
  if (!file.open("w")) throw new Error("Cannot write report: " + file.fsName);
  file.writeln(message); file.close();
}

function main() {
  var priorInteraction = app.userInteractionLevel;
  try {
    app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
    assertInputs();
    ensureFolder(OUT_ROOT);
    if (OUT_DIR.exists) throw new Error("Refusing to reuse Illustrator output: " + OUT_DIR.fsName);
    ensureFolder(OUT_DIR);
    exportCover("natal-sky-print-pack-cover-1280x720", makePrintPack);
    exportCover("personal-sky-keepsake-cover-1280x720", makeKeepsake);
    exportCover("whole-sky-edition-cover-1280x720", makeWhole);
    var ai = OUT_DIR.getFiles("*.ai").length;
    var pdf = OUT_DIR.getFiles("*.pdf").length;
    var png = OUT_DIR.getFiles("*.png").length;
    if (ai !== 3 || pdf !== 3 || png !== 3) throw new Error("Output inventory mismatch AI=" + ai + " PDF=" + pdf + " PNG=" + png);
    var message = "AstroPrecise Studio v901 cover export complete.\n" +
      "Illustrator: " + app.version + "\n" +
      "Inputs: authentic fictional chart, corrected reading cover, stamped SCHEMATIC Observatory still\n" +
      "Palette: Midnight Meridian v901 (no retired brass/orange)\n" +
      "Fonts: " + FONT_DISPLAY.name + ", " + FONT_BODY.name + ", " + FONT_DATA.name + "\n" +
      "Outputs: 3 editable AI + 3 outlined-font PDF + 3 exact-size PNG\n" +
      "Output: " + OUT_DIR.fsName;
    writeReport(message);
    return message;
  } finally {
    app.userInteractionLevel = priorInteraction;
  }
}

main();
