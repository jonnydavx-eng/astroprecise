/**
 * Art theme data for Node fulfilment — reads website/data/art-themes.json
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = join(ROOT, 'website', 'data', 'art-themes.json');

let _cache = null;

export function loadArtThemes() {
  if (_cache) return _cache;
  const raw = readFileSync(JSON_PATH, 'utf8');
  _cache = JSON.parse(raw);
  const map = {};
  (_cache.themes || []).forEach(t => { map[t.id] = t; });
  _cache._map = map;
  return _cache;
}

export function themeById(id) {
  const data = loadArtThemes();
  return data._map[id] || data._map[data.defaultTheme] || null;
}

export function themePalette(themeOrId) {
  const theme = typeof themeOrId === 'string' ? themeById(themeOrId) : themeOrId;
  if (!theme || !theme.palette) return null;
  return {
    void: theme.palette.void,
    plate: theme.palette.plate,
    mid: theme.palette.mid,
    gold: theme.palette.gold,
    goldLight: theme.palette.goldLight,
    parchment: theme.palette.parchment,
    silver: theme.palette.silver,
    accent: theme.palette.accent,
  };
}

export function resolveOrderTheme(order) {
  const data = loadArtThemes();
  const id = order.artTheme || order.art_theme || order.theme || data.defaultTheme;
  return themeById(id) || themeById(data.defaultTheme);
}