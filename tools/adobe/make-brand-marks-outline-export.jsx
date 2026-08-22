#target illustrator
/*
 * PREPARED ONLY — do not run until Illustrator is installed and brand source files are confirmed.
 * Outline live type on brand marks and export SVG + PDF copies.
 * Does not overwrite AstroPrecise Photoshop type plates:
 *   make-sitting-og.jsx, make-sitting-set-v893.jsx
 * Edit SOURCE_DIR / files below before running.
 */
#targetengine "session";

var SOURCE_DIR = Folder("C:/Users/jonny/Adobe-Close-Dump/brand-marks-src");
var OUT_DIR = Folder("C:/Users/jonny/Adobe-Close-Dump/brand-marks-outlined");

function ensureFolder(f) {
  if (!f.exists) f.create();
}

function outlineTextInDoc(doc) {
  var i;
  for (i = doc.textFrames.length - 1; i >= 0; i--) {
    try {
      doc.textFrames[i].createOutline();
    } catch (e) {}
  }
}

function exportSvg(doc, destFile) {
  var opt = new ExportOptionsSVG();
  opt.embedRasterImages = true;
  opt.fontSubsetting = SVGFontSubsetting.GLYPHSUSED;
  opt.fontType = SVGFontType.OUTLINEFONT;
  doc.exportFile(destFile, ExportType.SVG, opt);
}

function exportPdf(doc, destFile) {
  var opt = new PDFSaveOptions();
  opt.preserveEditability = false;
  opt.compatibility = PDFCompatibility.ACROBAT7;
  doc.saveAs(destFile, opt);
}

function processFile(file) {
  var doc = app.open(file);
  outlineTextInDoc(doc);
  var stem = file.name.replace(/\.[^\.]+$/, "");
  exportSvg(doc, new File(OUT_DIR.fsName + "/" + stem + "-outlined.svg"));
  exportPdf(doc, new File(OUT_DIR.fsName + "/" + stem + "-outlined.pdf"));
  doc.close(SaveOptions.DONOTSAVECHANGES);
}

function main() {
  if (app.documents.length > 0) {
    // If a mark is already open, only outline+export that document.
    ensureFolder(OUT_DIR);
    var doc = app.activeDocument;
    outlineTextInDoc(doc);
    var stem = doc.name.replace(/\.[^\.]+$/, "");
    exportSvg(doc, new File(OUT_DIR.fsName + "/" + stem + "-outlined.svg"));
    exportPdf(doc, new File(OUT_DIR.fsName + "/" + stem + "-outlined.pdf"));
    return;
  }
  if (!SOURCE_DIR.exists) {
    alert("Prepared script. Create " + SOURCE_DIR.fsName + " with .ai/.eps brand marks, then run again. Nothing was changed.");
    return;
  }
  ensureFolder(OUT_DIR);
  var files = SOURCE_DIR.getFiles(/\.(ai|eps|pdf)$/i);
  if (files.length === 0) {
    alert("No .ai/.eps/.pdf in " + SOURCE_DIR.fsName);
    return;
  }
  var n;
  for (n = 0; n < files.length; n++) processFile(files[n]);
}

main();
