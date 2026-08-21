#target photoshop
/*
 * Sitting plate set ap-v893.
 * Real engine stills only. Type only. No Firefly. No invented planets.
 */
app.bringToFront();
app.displayDialogs = DialogModes.NO;

var root = File($.fileName).parent.parent.parent;
var earthFile = File(root.fsName + "/website/img/engine/earth.webp");
var moonFile = File(root.fsName + "/website/img/engine/moon.webp");
var pairFile = File(root.fsName + "/website/img/engine/earth-moon.webp");
if (!earthFile.exists) throw new Error("Missing " + earthFile.fsName);

function C(r, g, b) {
  var c = new SolidColor();
  c.rgb.red = r; c.rgb.green = g; c.rgb.blue = b;
  return c;
}
var VOID = C(5, 8, 15);
var PAPER = C(230, 236, 242);
var COPPER = C(184, 107, 74);
var SILVER = C(143, 163, 184);

app.foregroundColor = VOID;
app.backgroundColor = VOID;

function addType(doc, name, text, sizePt, color, x, y) {
  var layer = doc.artLayers.add();
  layer.kind = LayerKind.TEXT;
  layer.name = name;
  var ti = layer.textItem;
  ti.kind = TextType.POINTTEXT;
  ti.contents = text;
  try { ti.font = "Georgia"; } catch (e1) { ti.font = "TimesNewRomanPSMT"; }
  ti.size = sizePt;
  ti.color = color;
  ti.antiAliasMethod = AntiAlias.SHARP;
  ti.position = [x, y];
  return layer;
}

function placeStill(doc, file, targetH, dx) {
  if (!file.exists) return null;
  var src = app.open(file);
  src.selection.selectAll();
  src.selection.copy();
  src.close(SaveOptions.DONOTSAVECHANGES);
  app.activeDocument = doc;
  doc.paste();
  var layer = doc.activeLayer;
  layer.name = "engine-still";
  var b = layer.bounds;
  var eh = b[3].as("px") - b[1].as("px");
  layer.resize((targetH / eh) * 100, (targetH / eh) * 100, AnchorPosition.MIDDLECENTER);
  layer.translate(dx, 0);
  return layer;
}

function veilLeft(doc, widthPx, opacity) {
  var layer = doc.artLayers.add();
  layer.name = "type-veil";
  var h = doc.height.as("px");
  doc.selection.select([[0, 0], [widthPx, 0], [widthPx, h], [0, h]]);
  doc.selection.fill(VOID);
  doc.selection.deselect();
  layer.opacity = opacity;
  return layer;
}

function hairlineFrame(doc) {
  var w = doc.width.as("px");
  var h = doc.height.as("px");
  var inset = 22;
  doc.selection.select([
    [inset, inset], [w - inset, inset], [w - inset, h - inset], [inset, h - inset]
  ]);
  doc.selection.stroke(COPPER, 1, StrokeLocation.INSIDE, ColorBlendMode.NORMAL, 80, false);
  doc.selection.deselect();
  var tick = 18;
  var pts = [
    [[inset, inset], [inset + tick, inset], [inset + tick, inset + 1], [inset, inset + 1]],
    [[inset, inset], [inset + 1, inset], [inset + 1, inset + tick], [inset, inset + tick]],
    [[w - inset - tick, inset], [w - inset, inset], [w - inset, inset + 1], [w - inset - tick, inset + 1]],
    [[w - inset - 1, inset], [w - inset, inset], [w - inset, inset + tick], [w - inset - 1, inset + tick]],
    [[inset, h - inset - 1], [inset + tick, h - inset - 1], [inset + tick, h - inset], [inset, h - inset]],
    [[inset, h - inset - tick], [inset + 1, h - inset - tick], [inset + 1, h - inset], [inset, h - inset]],
    [[w - inset - tick, h - inset - 1], [w - inset, h - inset - 1], [w - inset, h - inset], [w - inset - tick, h - inset]],
    [[w - inset - 1, h - inset - tick], [w - inset, h - inset - tick], [w - inset, h - inset], [w - inset - 1, h - inset]]
  ];
  var i;
  for (i = 0; i < pts.length; i++) {
    doc.selection.select(pts[i]);
    doc.selection.fill(COPPER);
    doc.selection.deselect();
  }
}

function saveJpg(doc, dest) {
  var jpg = new JPEGSaveOptions();
  jpg.quality = 11;
  jpg.embedColorProfile = true;
  jpg.formatOptions = FormatOptions.STANDARDBASELINE;
  dest.parent.create();
  doc.saveAs(dest, jpg, true);
}

function makeOg(name, still, headline, sub1, sub2, kicker) {
  var doc = app.documents.add(1200, 630, 72, name, NewDocumentMode.RGB, DocumentFill.BACKGROUNDCOLOR);
  doc.bitsPerChannel = BitsPerChannelType.EIGHT;
  placeStill(doc, still, 560, 320);
  veilLeft(doc, 520, 38);
  hairlineFrame(doc);
  addType(doc, "kicker", kicker, 13, COPPER, 72, 108);
  addType(doc, "headline", headline, 46, PAPER, 72, 186);
  addType(doc, "sub1", sub1, 17, SILVER, 72, 248);
  addType(doc, "sub2", sub2, 17, SILVER, 72, 278);
  addType(doc, "mark", "ASTROPRECISE", 12, COPPER, 72, 548);
  addType(doc, "honest", "ENGINE STILL  -  NOT A LIVE FEED", 10, SILVER, 72, 578);
  return doc;
}

var home = makeOg(
  "sitting-home-og-v893",
  earthFile,
  "Sit with the real sky.",
  "Chart, seven chapters, a keepable still.",
  "Computed on this device.",
  "THE NIGHT YOU WERE BORN"
);
saveJpg(home, File(root.fsName + "/website/img/editorial/sitting-home-og-v893.jpg"));
saveJpg(home, File(root.fsName + "/website/img/editorial/sitting-earth-og-v891.jpg"));
saveJpg(home, File(root.fsName + "/website/img/og-banner-silver.jpg"));
home.close(SaveOptions.DONOTSAVECHANGES);

var chart = makeOg(
  "sitting-chart-og-v893",
  moonFile.exists ? moonFile : earthFile,
  "Your minute.",
  "A natal chart from the hour you arrived.",
  "Nothing leaves this device except the town name.",
  "FREE BIRTH CHART"
);
saveJpg(chart, File(root.fsName + "/website/img/editorial/sitting-chart-og-v893.jpg"));
chart.close(SaveOptions.DONOTSAVECHANGES);

var keep = makeOg(
  "sitting-keep-og-v893",
  pairFile.exists ? pairFile : earthFile,
  "Keep this sky.",
  "One card of that minute. Optional.",
  "The live sky stays free.",
  "SITTING  -  KEEP"
);
saveJpg(keep, File(root.fsName + "/website/img/editorial/sitting-keep-og-v893.jpg"));
keep.close(SaveOptions.DONOTSAVECHANGES);
