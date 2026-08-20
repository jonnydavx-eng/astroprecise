#target photoshop
/*
 * Honest OG plate from a real engine still.
 * Source: website/img/engine/earth.webp
 * Output: website/img/editorial/sitting-earth-og-v891.jpg  (1200 x 630)
 * Type only. No Firefly. No invented planets.
 */
app.bringToFront();
app.displayDialogs = DialogModes.NO;

var root = File($.fileName).parent.parent.parent;
var srcFile = File(root.fsName + "/website/img/engine/earth.webp");
var outFile = File(root.fsName + "/website/img/editorial/sitting-earth-og-v891.jpg");

if (!srcFile.exists) {
  throw new Error("Missing engine still: " + srcFile.fsName);
}

var voidColor = new SolidColor();
voidColor.rgb.red = 5;
voidColor.rgb.green = 8;
voidColor.rgb.blue = 15;

var paperColor = new SolidColor();
paperColor.rgb.red = 230;
paperColor.rgb.green = 236;
paperColor.rgb.blue = 242;

var copperColor = new SolidColor();
copperColor.rgb.red = 184;
copperColor.rgb.green = 107;
copperColor.rgb.blue = 74;

var silverColor = new SolidColor();
silverColor.rgb.red = 143;
silverColor.rgb.green = 163;
silverColor.rgb.blue = 184;

app.foregroundColor = voidColor;
app.backgroundColor = voidColor;

var plate = app.documents.add(1200, 630, 72, "sitting-earth-og-v891", NewDocumentMode.RGB, DocumentFill.BACKGROUNDCOLOR);
plate.bitsPerChannel = BitsPerChannelType.EIGHT;

var earthDoc = app.open(srcFile);
earthDoc.selection.selectAll();
earthDoc.selection.copy();
earthDoc.close(SaveOptions.DONOTSAVECHANGES);
app.activeDocument = plate;
plate.paste();

var earth = plate.activeLayer;
earth.name = "engine-earth-still";
var b = earth.bounds;
var ew = b[2].as("px") - b[0].as("px");
var eh = b[3].as("px") - b[1].as("px");
var targetH = 560;
var scale = (targetH / eh) * 100;
earth.resize(scale, scale, AnchorPosition.MIDDLECENTER);
earth.translate(280, 0);

function addType(name, text, sizePt, color, x, y, italic) {
  var layer = plate.artLayers.add();
  layer.kind = LayerKind.TEXT;
  layer.name = name;
  var ti = layer.textItem;
  ti.kind = TextType.POINTTEXT;
  ti.contents = text;
  ti.font = italic ? "Cinzel-Regular" : "Cinzel-Regular";
  try {
    ti.font = italic ? "Georgia-Italic" : "Georgia";
  } catch (e1) {}
  ti.size = sizePt;
  ti.color = color;
  ti.antiAliasMethod = AntiAlias.SHARP;
  ti.position = [x, y];
  return layer;
}

addType("kicker", "THE NIGHT YOU WERE BORN", 14, copperColor, 72, 118);
addType("headline", "Sit with the real sky.", 42, paperColor, 72, 188);
addType("sub1", "Chart, seven chapters, a keepable still.", 18, silverColor, 72, 248);
addType("sub2", "Computed on this device.", 18, silverColor, 72, 280);
addType("mark", "ASTROPRECISE", 13, copperColor, 72, 560);
addType("honest", "ENGINE STILL  -  NOT A LIVE FEED", 10, silverColor, 72, 590);

var jpg = new JPEGSaveOptions();
jpg.quality = 10;
jpg.embedColorProfile = true;
jpg.formatOptions = FormatOptions.STANDARDBASELINE;
outFile.parent.create();
plate.saveAs(outFile, jpg, true);
plate.close(SaveOptions.DONOTSAVECHANGES);
