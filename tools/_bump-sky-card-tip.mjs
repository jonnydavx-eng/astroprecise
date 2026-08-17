import { readFileSync, writeFileSync } from 'fs';
const p = 'website/sky-card.html';
let c = readFileSync(p, 'utf8');
c = c.replace(/\?v=880/g, '?v=888');
c = c.replace("window.AP_ASSET_V='880'", "window.AP_ASSET_V='888'");
writeFileSync(p, c);
console.log('sky-card tip -> 888');
