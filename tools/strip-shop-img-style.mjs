import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const p = join(dirname(fileURLToPath(import.meta.url)), '..', 'website', 'shop.html');
let t = readFileSync(p, 'utf8');
t = t.replace(/<div class="shop-card__img" style="color:[^"]*;">/g, '<div class="shop-card__img">');
writeFileSync(p, t);
console.log('stripped');