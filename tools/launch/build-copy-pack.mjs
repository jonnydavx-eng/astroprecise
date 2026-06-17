#!/usr/bin/env node
/**
 * Build paste-ready launch copy packs for multi-agent handoff.
 * Output: launch-output/ (directories, spike, social-bios, search-engines, product-hunt)
 * Usage: node tools/launch/build-copy-pack.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'launch-output');

const SITE = 'https://astroprecise.app';
const LINKS = `${SITE}/links.html`;
const CHART = `${SITE}/chart.html`;
const RISING = `${SITE}/what-is-my-rising-sign.html`;
const SHOP = `${SITE}/shop.html`;
const ACCURACY = `${SITE}/accuracy.html`;
const HANDLE = '@astroprecise';

const SHORT_DESC =
  'Free private birth chart calculator. VSOP87/ELP2000 ephemeris (~arcminute). Computed entirely in your browser — birth data never uploaded. Optional one-time Deep Reading PDF and natal posters.';

const LONG_DESC = `${SHORT_DESC}

Live tools: natal chart, daily horoscopes, synastry, transits, rising sign, ephemeris orrery. PWA — install on phone/desktop, works offline. Entertainment only; not professional advice.

Mission Control for your sky.`;

function write(rel, content) {
  const full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trim() + '\n', 'utf8');
  return rel;
}

// --- Directories ---
const directories = [
  { id: 'alternativeto', name: 'AlternativeTo', url: 'https://alternativeto.net/', priority: 'P0', notes: 'Suggest as alternative to Co-Star, Chani, Astro-Seek, Cafe Astrology' },
  { id: 'saashub', name: 'SaaSHub', url: 'https://www.saashub.com/submit/list', priority: 'P0', notes: 'Category: free astrology tools' },
  { id: 'powerfortunes', name: 'Power Fortunes Astrology Directory', url: 'https://www.powerfortunes.com/addurl.php', priority: 'P0', notes: 'Free editorial review' },
  { id: 'indiehackers', name: 'Indie Hackers', url: 'https://www.indiehackers.com/products', priority: 'P1', notes: 'Add product + milestone post' },
  { id: 'devhunt', name: 'DevHunt', url: 'https://devhunt.org/', priority: 'P0', notes: 'GitHub login required' },
  { id: 'uneed', name: 'Uneed', url: 'https://www.uneed.best/submit-a-tool', priority: 'P0', notes: 'Launch spike L+1' },
  { id: 'tinylaunch', name: 'TinyLaunch', url: 'https://www.tinylaunch.com/submit', priority: 'P0', notes: 'Launch spike L+1' },
  { id: 'microlaunch', name: 'MicroLaunch', url: 'https://microlaunch.net/', priority: 'P0', notes: 'Launch spike L+1' },
  { id: 'launchingnext', name: 'Launching Next', url: 'https://www.launchingnext.com/submit/', priority: 'P1', notes: '' },
  { id: 'betalist', name: 'BetaList', url: 'https://betalist.com/submit', priority: 'P1', notes: '1-8 week queue' },
  { id: 'brave', name: 'Brave Search URL submit', url: 'https://search.brave.com/submit-url', priority: 'P1', notes: 'Submit home + chart + rising + compat + horoscope' },
];

for (const d of directories) {
  write(`directories/${d.id}.txt`, `
# ${d.name}
Priority: ${d.priority}
Submit: ${d.url}
${d.notes ? `Notes: ${d.notes}\n` : ''}
--- PASTE: Name ---
AstroPrecise

--- PASTE: URL ---
${SITE}

--- PASTE: Tagline (≤80 chars) ---
Mission Control for your sky — free accurate private birth charts

--- PASTE: Short description ---
${SHORT_DESC}

--- PASTE: Long description ---
${LONG_DESC}

--- PASTE: Category tags ---
astrology, birth chart, horoscope, privacy, PWA, free tool, natal chart calculator

--- Link for users ---
${LINKS}
`);
}

write('directories/00-INDEX.md', directories.map((d) =>
  `| ${d.priority} | [${d.name}](${d.url}) | \`directories/${d.id}.txt\` | ${d.notes} |`
).join('\n').replace(/^/, '| Priority | Site | Copy file | Notes |\n|----------|------|-----------|-------|\n'));

// --- Search engines ---
write('search-engines/CHECKLIST.md', `
# Search engine setup — owner checklist

Do these in order. ~90 minutes total.

## Google Search Console (P0)
1. Open https://search.google.com/search-console/welcome
2. Add **Domain property**: \`astroprecise.app\`
3. Verify via **DNS TXT** at your registrar (record shown in GSC)
4. Sitemaps → submit \`${SITE}/sitemap.xml\`
5. URL Inspection → Request indexing for:
   - ${CHART}
   - ${RISING}
   - ${SITE}/compatibility.html
   - ${SITE}/horoscope.html
   - ${SITE}/

## Bing Webmaster Tools (P0 — also powers DuckDuckGo + Ecosia)
1. Open https://www.bing.com/webmasters
2. Add site \`${SITE}/\`
3. Verify (DNS or import from GSC)
4. Submit sitemap: \`${SITE}/sitemap.xml\`
5. Check IndexNow report after next deploy

## IndexNow (already automated)
- Key file: \`${SITE}/a7f3c9e2b1d84f6a9c0e5b8d7f2a1c4e.txt\`
- Manual ping: \`node tools/ping-indexnow.mjs\`

## Brave Search (P1)
- Submit URLs: https://search.brave.com/submit-url
- ${SITE}
- ${CHART}
- ${RISING}
- ${SITE}/compatibility.html
- ${SITE}/horoscope.html

## Yandex Webmaster (P2)
- https://webmaster.yandex.com/ → add site + sitemap

## DuckDuckGo / Ecosia
- No separate portal — covered by Bing + backlinks
`);

// --- Social bios ---
const platforms = [
  { id: 'x', name: 'X (Twitter)', display: 'AstroPrecise ✦ Mission Control', bio: `Mission Control for your sky ✦\nReal ephemeris · computed in your browser\nBirth data never uploaded\nFree chart ↓`, link: LINKS, banner: 'marketing/social/banner-x-1500x500.jpg', avatar: 'website/img/icon-512.png' },
  { id: 'tiktok', name: 'TikTok', display: 'AstroPrecise', bio: `Mission Control for your sky ✦ Real math. Free chart ↓`, link: LINKS, avatar: 'marketing/social/avatar-400.jpg' },
  { id: 'instagram', name: 'Instagram', display: 'AstroPrecise', bio: `Mission Control for your sky ✦\nGenuinely accurate · private · free birth chart\nVSOP87 ephemeris — every number is real\n↓`, link: LINKS, avatar: 'marketing/social/avatar-400.jpg', highlights: 'FREE CHART · SHOP · PRIVACY · ORRERY' },
  { id: 'pinterest', name: 'Pinterest', display: 'AstroPrecise — Wear Your Sky', bio: `Accurate, private astrology. Free birth charts from real ephemeris math.\nNatal posters made from your exact sky — one of one.\n#WearYourSky`, link: LINKS, boards: 'Natal Chart Wall Art · Birth Chart Education · Cosmic Mission Control' },
  { id: 'youtube', name: 'YouTube', display: 'AstroPrecise', link: LINKS, banner: 'marketing/social/banner-youtube-2560x1440.jpg' },
  { id: 'reddit', name: 'Reddit', display: 'u/astroprecise', bio: `Built AstroPrecise — free, accurate, private birth charts. ${SITE}` },
  { id: 'threads', name: 'Threads', display: '@astroprecise', bio: 'Mirror Instagram bio after IG created' },
  { id: 'bluesky', name: 'Bluesky', display: '@astroprecise.bsky.social', bio: `Mission Control for your sky. VSOP87 ephemeris, computed in-browser, birth data never uploaded. ${LINKS}` },
];

for (const p of platforms) {
  write(`social-bios/${p.id}.txt`, `
Platform: ${p.name}
Handle: ${HANDLE}
${p.display ? `Display name: ${p.display}` : ''}
Website / link: ${p.link || LINKS}
${p.banner ? `Banner: ${p.banner}` : ''}
${p.avatar ? `Avatar: ${p.avatar}` : ''}
${p.highlights ? `Highlights: ${p.highlights}` : ''}
${p.boards ? `Boards: ${p.boards}` : ''}

--- BIO (paste) ---
${p.bio || '(mirror Instagram)'}

--- PINNED POST (X only) ---
I built a birth-chart tool that never uploads your birth data.

VSOP87 astronomy. Free chart. Your sky as wallpaper.

Start here → ${LINKS}
`);
}

write('social-bios/00-ORDER.md', `
# Create accounts in this order
1. X — conversation velocity first
2. TikTok — growth engine
3. Instagram + Threads
4. Pinterest — poster funnel
5. YouTube, Reddit, Bluesky

Bio link everywhere: ${LINKS}

After accounts exist:
- Connect Postiz channels
- Paste URLs into website/js/app.js AP_SOCIAL
- Run: .\\tools\\schedule-free-traffic.ps1
`);

// --- Spike copy (HN, Reddit) ---
write('spike/show-hn-title.txt', 'Show HN: Birth-chart tool computing VSOP87/ELP2000 ephemeris entirely in the browser');

write('spike/show-hn-url.txt', CHART);

write('spike/show-hn-comment.txt', `
I got annoyed that astrology apps treat the math as a black box and upload your exact birth time to a server behind a subscription.

AstroPrecise computes the full natal chart client-side:
- VSOP87 planetary positions + ELP2000 Moon
- Placidus/Whole/Equal/Porphyry houses, aspect orbs
- ~arcminute accuracy for 1800–2200 CE (stated honestly, not "NASA exact")
- 253-star zenith catalogue, light-cone / orrery "Instrument" page

Architecture: static site, vanilla JS, PWA with offline precache. No backend for chart data. Outbound calls are only NOAA SWPC (labelled) + geocoder for typed place name (never the birth timestamp).

I'm not claiming astrology is predictive — entertainment only. The interesting part is verifiable engineering: open DevTools → Network while casting a chart.

Would welcome accuracy feedback vs Swiss Ephemeris or similar.

${CHART}
`);

write('spike/reddit-advancedastrology.txt', `
SUBREDDIT: r/Advancedastrology
FLAIR: Tools + Software
TIMING: Tue–Thu, 14:00–18:00 UTC

TITLE:
I built a browser-only natal calculator (VSOP87, no server upload) — looking for accuracy feedback from working astrologers

BODY:
Positions: VSOP87 + ELP2000, ~arcminute, 1800–2200 CE.
Privacy: birth data never leaves the browser. Free wheel, aspects, houses, transits, synastry.
Paid: one-time £12 Deep Reading PDF (no subscription) — only mentioning because people always ask.

I'm not an astrologer; I want critique on house system defaults, orb choices, and whether interpretations read too modern vs traditional.

Link only if requested — ${CHART}
`);

write('spike/reddit-internetisbeautiful.txt', `
SUBREDDIT: r/InternetIsBeautiful
URL: ${CHART} (link post — not text)

TITLE:
A birth-chart tool that computes the real positions of the planets in your browser — no sign-up, no tracking, nothing leaves your device

BODY (if text required):
Type your birth date/time/place and it computes astronomical positions (VSOP87/ELP2000, ~arcminute) entirely client-side. No account, no email, no analytics. Wheel, aspects, zenith star mode. Free.
`);

write('spike/reddit-sideproject.txt', `
SUBREDDIT: r/SideProject

TITLE:
I built a free birth-chart tool that computes real astronomy in your browser — no account, no tracking, no data ever leaves your device

BODY:
Two things bugged me about astrology apps: black-box math and uploading exact birth time to someone's server behind a subscription.

AstroPrecise computes client-side with VSOP87/ELP2000 (~arcminute, 1800–2200). No backend, no account, no analytics. Vanilla JS static PWA, works offline.

Instrument page: zenith star, birth light-cone, time-travel orrery. Chart is free forever.

Feedback on (1) zero-backend approach (2) anywhere numbers look off.

${CHART}
`);

write('spike/00-SPIKE-CALENDAR.md', `
# Spike week calendar (L0 = Show HN Monday)

| Day | Action | Copy file |
|-----|--------|-----------|
| L0 Mon | Show HN 8–10am US Eastern | spike/show-hn-*.txt |
| L+1 Tue | Directory batch (directories/) | directories/*.txt |
| L+2 Wed | r/InternetIsBeautiful | spike/reddit-internetisbeautiful.txt |
| L+3 Thu | Influencer gift DMs | outreach-exports/emails/ |
| L+4 Fri | r/AskAstrologers comments only | — |
| L+5 Sat | r/webdev + r/Advancedastrology | spike/reddit-advancedastrology.txt |
| L+6 Sun | Reply babysit all threads 48h | — |

Full playbook: LAUNCH-WEEK-PLAYBOOK.md
`);

// --- Product Hunt ---
write('product-hunt/tagline.txt', 'Real astronomy birth charts — computed privately in your browser');

write('product-hunt/description.txt', `
Most astrology apps hide the math and upload your birth time to their servers.

AstroPrecise is the opposite:
• VSOP87 + ELP2000 ephemeris (~arcminute, 1800–2200 CE)
• 100% client-side — birth data never leaves your device
• No account, no subscription on free tools
• PWA — install on iOS/Android/desktop, offline capable

Free chart forever. Optional one-time Deep Reading PDF + shop (external checkout).

Entertainment only — not professional advice. Verify privacy: DevTools → Network while casting.

${CHART}
`);

write('product-hunt/maker-comment.txt', `
Hey Product Hunt — I'm Jonny, solo maker from the UK.

Built this because I wanted arcminute positions I could verify, without handing my birth minute to another app's database.

Would love feedback on accuracy vs desktop ephemeris software, and whether the privacy model matters to you.

Try it: ${CHART}
All free tools: ${LINKS}
`);

write('product-hunt/00-PREP.md', `
# Product Hunt — 30-day prep (launch ~L+22)

Assets needed:
- 5 gallery images 1270×760 (chart, orrery, privacy DevTools, mobile, shop)
- 30s screen record GIF
- Hunter recruited by L-10
- Supporter list (email — only place you may ask for upvotes)

Best day: Tuesday or Wednesday, 12:01am Pacific
`);

// --- Influencer outreach template ---
write('outreach/nano-gift-dm.txt', `
Subject: Free chart reading for your exact birth minute (no upload)

Hi [Name] — I built AstroPrecise: birth charts from real VSOP87 ephemeris in the browser (birth data never leaves the device).

I'd love to gift you:
• The Deep Reading PDF (£12) for your chart
• A natal poster PDF (£6)

If it resonates, share honestly — ${LINKS}
No script required. Screen-record your Rising reaction if you want.

— Jonny, AstroPrecise
`);

// --- Manifest ---
const manifest = {
  generated: new Date().toISOString(),
  site: SITE,
  outputDir: 'launch-output',
  files: {
    directories: directories.length,
    socialBios: platforms.length,
    spike: 6,
  },
  nextSteps: [
    'Jonny: search-engines/CHECKLIST.md',
    'Jonny: social-bios/ in order',
    'Agent: directories/ batch on L+1',
    'Jonny: spike/show-hn on L0 Monday',
    'node tools/launch/lightwork-check.mjs',
  ],
};

write('MANIFEST.json', JSON.stringify(manifest, null, 2));

console.log(`Launch copy pack written to launch-output/`);
console.log(`  ${directories.length} directory submissions`);
console.log(`  ${platforms.length} social bio files`);
console.log(`  spike + PH + search checklist`);
console.log(`\nRun: node tools/launch/lightwork-check.mjs`);