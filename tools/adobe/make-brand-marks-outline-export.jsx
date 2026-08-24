#target illustrator
/*
 * AstroPrecise v900 — Illustrator production export.
 *
 * Opens the canonical Midnight Meridian SVG marks read-only, converts any
 * live type to outlines, and writes review-ready AI, SVG and PDF copies to a
 * separate local folder. Source files are never overwritten.
 * These are static QA/print masters, not drop-in web replacements: Illustrator
 * does not preserve the animated logo's CSS or browser accessibility contract.
 */
#targetengine "session";

var PROJECT = "C:/Users/jonny/dev/astroprecise";
var EXPORT_MODE = (typeof arguments !== "undefined" && arguments.length)
  ? String(arguments[0])
  : "full";
var VALID_MODES = {
  "full": true,
  "variants": true,
  "one-colour": true
};
if (!VALID_MODES[EXPORT_MODE]) {
  throw new Error(
    "Unsupported export mode '" + EXPORT_MODE +
    "'. Expected full, variants, or one-colour."
  );
}
var OUT_ROOT = Folder("C:/Users/jonny/Adobe-Close-Dump/brand-marks-outlined");

function pad2(value) {
  return value < 10 ? "0" + value : String(value);
}

function runStamp(now) {
  return now.getFullYear() + pad2(now.getMonth() + 1) + pad2(now.getDate()) + "-" +
    pad2(now.getHours()) + pad2(now.getMinutes()) + pad2(now.getSeconds());
}

var OUT_DIR = Folder(OUT_ROOT.fsName + "/v900-" + runStamp(new Date()));
// The animated browser logo is deliberately excluded. Illustrator 30.7 drops
// its CSS transforms during static import, while these four sources round-trip
// as faithful print/collateral masters.
var SOURCE_FILES = [
  File(PROJECT + "/website/img/logo-mark.svg"),
  File(PROJECT + "/website/favicon.svg"),
  File(PROJECT + "/website/assets/images/seals/instruments/chart.svg"),
  File(PROJECT + "/website/assets/images/seals/instruments/lifepath.svg")
];

function ensureFolder(folder) {
  if (!folder.exists && !folder.create()) {
    throw new Error("Could not create output folder: " + folder.fsName);
  }
}

function writeReport(message) {
  var report = File(OUT_DIR.fsName + "/EXPORT-REPORT.txt");
  report.encoding = "UTF-8";
  report.lineFeed = "Windows";
  if (!report.open("w")) {
    throw new Error("Could not write export report: " + report.fsName);
  }
  report.writeln(message);
  report.close();
}

function assertRequiredSources() {
  var required = [];
  var i;
  if (EXPORT_MODE === "full") {
    for (i = 0; i < SOURCE_FILES.length; i++) required.push(SOURCE_FILES[i]);
  } else if (EXPORT_MODE === "variants") {
    required.push(File(PROJECT + "/website/img/logo-mark.svg"));
    required.push(File(PROJECT + "/website/favicon.svg"));
  } else {
    required.push(File(PROJECT + "/website/img/logo-mark.svg"));
  }

  for (i = 0; i < required.length; i++) {
    if (!required[i].exists) {
      throw new Error("Required Illustrator source is missing: " + required[i].fsName);
    }
  }
}

function outlineTextInDoc(doc) {
  var outlined = 0;
  var i;
  for (i = doc.textFrames.length - 1; i >= 0; i--) {
    doc.textFrames[i].createOutline();
    outlined++;
  }
  return outlined;
}

function exportSvg(doc, destFile) {
  var opt = new ExportOptionsSVG();
  opt.embedRasterImages = true;
  opt.fontSubsetting = SVGFontSubsetting.GLYPHSUSED;
  opt.fontType = SVGFontType.OUTLINEFONT;
  opt.coordinatePrecision = 3;
  opt.cssProperties = SVGCSSPropertyLocation.PRESENTATIONATTRIBUTES;
  opt.documentEncoding = SVGDocumentEncoding.UTF8;
  opt.DTD = SVGDTDVersion.SVG1_1;
  opt.preserveEditability = false;
  doc.exportFile(destFile, ExportType.SVG, opt);
}

function saveAi(doc, destFile) {
  var opt = new IllustratorSaveOptions();
  opt.compressed = true;
  opt.pdfCompatible = true;
  doc.saveAs(destFile, opt);
}

function savePdf(doc, destFile) {
  var opt = new PDFSaveOptions();
  opt.preserveEditability = false;
  opt.compatibility = PDFCompatibility.ACROBAT7;
  doc.saveAs(destFile, opt);
}

function assertArtworkFitsArtboard(doc, stem) {
  if (!doc.pageItems.length) {
    throw new Error("No visible artwork found for " + stem);
  }

  var artboard = doc.artboards[doc.artboards.getActiveArtboardIndex()].artboardRect;
  var visible = doc.visibleBounds;
  var tolerance = 0.75;
  var i;
  for (i = 0; i < 4; i++) {
    if (isNaN(Number(artboard[i])) || isNaN(Number(visible[i]))) {
      throw new Error("Invalid Illustrator bounds for " + stem);
    }
  }
  if (visible[2] <= visible[0] || visible[1] <= visible[3]) {
    throw new Error("Degenerate visible bounds for " + stem);
  }
  if (
    visible[0] < artboard[0] - tolerance ||
    visible[1] > artboard[1] + tolerance ||
    visible[2] > artboard[2] + tolerance ||
    visible[3] < artboard[3] - tolerance
  ) {
    throw new Error(
      "Artwork escapes its artboard for " + stem +
      " (visible " + visible.join(", ") +
      "; artboard " + artboard.join(", ") + ")"
    );
  }
}

function assertOutputFile(file, label) {
  if (!file.exists || file.length <= 0) {
    throw new Error("Illustrator did not create a non-empty " + label + ": " + file.fsName);
  }
}

function exportTriplet(doc, stem) {
  assertArtworkFitsArtboard(doc, stem);
  var svgFile = File(OUT_DIR.fsName + "/" + stem + ".svg");
  var aiFile = File(OUT_DIR.fsName + "/" + stem + ".ai");
  var pdfFile = File(OUT_DIR.fsName + "/" + stem + ".pdf");
  exportSvg(doc, svgFile);
  saveAi(doc, aiFile);
  savePdf(doc, pdfFile);
  assertOutputFile(svgFile, "SVG");
  assertOutputFile(aiFile, "AI");
  assertOutputFile(pdfFile, "PDF");
}

function assertOutputInventory(expectedTriplets) {
  var svgCount = OUT_DIR.getFiles("*.svg").length;
  var aiCount = OUT_DIR.getFiles("*.ai").length;
  var pdfCount = OUT_DIR.getFiles("*.pdf").length;
  if (
    svgCount !== expectedTriplets ||
    aiCount !== expectedTriplets ||
    pdfCount !== expectedTriplets
  ) {
    throw new Error(
      "Illustrator output inventory mismatch: expected " + expectedTriplets +
      " triplets; found SVG=" + svgCount + ", AI=" + aiCount +
      ", PDF=" + pdfCount
    );
  }
}

function rgb(hex) {
  var value = hex.replace("#", "");
  var color = new RGBColor();
  color.red = parseInt(value.substring(0, 2), 16);
  color.green = parseInt(value.substring(2, 4), 16);
  color.blue = parseInt(value.substring(4, 6), 16);
  return color;
}

function addVoidBackground(doc) {
  var bounds = doc.artboards[0].artboardRect;
  var background = doc.pathItems.rectangle(
    bounds[1],
    bounds[0],
    bounds[2] - bounds[0],
    bounds[1] - bounds[3]
  );
  background.stroked = false;
  background.filled = true;
  background.fillColor = rgb("#040812");
  background.zOrder(ZOrderMethod.SENDTOBACK);
}

function makeOneColour(doc) {
  var ink = rgb("#040812");
  var i;
  for (i = doc.groupItems.length - 1; i >= 0; i--) {
    if (doc.groupItems[i].opacity < 100) {
      doc.groupItems[i].remove();
    } else {
      doc.groupItems[i].opacity = 100;
    }
  }
  for (i = 0; i < doc.compoundPathItems.length; i++) {
    doc.compoundPathItems[i].opacity = 100;
  }
  for (i = 0; i < doc.pathItems.length; i++) {
    var item = doc.pathItems[i];
    if (item.filled) item.fillColor = ink;
    if (item.stroked) item.strokeColor = ink;
    item.opacity = 100;
  }
}

function processVariant(file, stem, transform) {
  var doc = null;
  try {
    doc = app.open(file);
    outlineTextInDoc(doc);
    if (doc.textFrames.length !== 0) {
      throw new Error("Live text remains in variant source: " + file.fsName);
    }
    transform(doc);
    exportTriplet(doc, stem);
  } finally {
    if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
  }
}

function processFile(file) {
  if (!file.exists) {
    throw new Error("Required Illustrator source is missing: " + file.fsName);
  }

  var doc = null;
  try {
    doc = app.open(file);
    var outlined = outlineTextInDoc(doc);
    if (doc.textFrames.length !== 0) {
      throw new Error("Live text remains after outlining: " + file.fsName);
    }
    var stem = file.name.replace(/\.[^\.]+$/, "");

    exportTriplet(doc, stem + "-outlined");
    return { skipped: null, outlined: outlined };
  } finally {
    if (doc) doc.close(SaveOptions.DONOTSAVECHANGES);
  }
}

function main() {
  assertRequiredSources();
  ensureFolder(OUT_ROOT);
  if (OUT_DIR.exists) {
    throw new Error("Refusing to reuse an existing Illustrator output folder: " + OUT_DIR.fsName);
  }
  ensureFolder(OUT_DIR);

  var exported = 0;
  var outlined = 0;
  var variants = [];
  var i;
  if (EXPORT_MODE === "full") {
    for (i = 0; i < SOURCE_FILES.length; i++) {
      var result = processFile(SOURCE_FILES[i]);
      exported++;
      outlined += result.outlined;
    }
  }

  if (EXPORT_MODE === "full" || EXPORT_MODE === "variants") {
    processVariant(
      File(PROJECT + "/website/img/logo-mark.svg"),
      "logo-mark-on-dark",
      addVoidBackground
    );
    variants.push("on-dark");
    processVariant(
      File(PROJECT + "/website/favicon.svg"),
      "logo-mark-on-light-tile",
      function () {}
    );
    variants.push("on-light tile");
  }
  if (EXPORT_MODE === "full" || EXPORT_MODE === "variants" || EXPORT_MODE === "one-colour") {
    processVariant(
      File(PROJECT + "/website/img/logo-mark.svg"),
      "logo-mark-one-colour",
      makeOneColour
    );
    variants.push("one-colour");
  }

  assertOutputInventory(exported + variants.length);

  var message = "AstroPrecise v900 Illustrator export complete.\n" +
    "Illustrator: " + app.version + "\n" +
    "Mode: " + EXPORT_MODE + "\n" +
    "Documents: " + exported + "\n" +
    "Variant sets: " + variants.length +
      (variants.length ? " (" + variants.join(", ") + ")" : "") + "\n" +
    "Live text outlined: " + outlined + "\n" +
    "Output: " + OUT_DIR.fsName;
  writeReport(message);
  return message;
}

main();
