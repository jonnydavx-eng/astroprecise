# Phone pass findings — sky-card 390×844 — 2026-08-14 (PT)

THIS IS NOT PR 18.
PR 18 (gift moment / cursor/sky-card-keep-path-7fca) is NOT in the local tree.
There is no gift.html.
website/sky-card.html is the older "real sky news — sky card" page.
Title: "The real sky news — sky card | Astro Precise" (two words, space).
Tip left at ap-v874. No bump. No push. No commit. No shipping file edited.

Served from reused http://127.0.0.1:8790 (website/).
Playwright 390×844, isMobile+touch, dpr 2, ?nosw=1.
Shots: launch-output/phone-pass-2026-08-14-skycard/shots/

## Identity — old news card, not a gift page

Looks like the old news / sky-card maker, not a gift moment.
- H1: "The sky when you arrived."
- Eyebrow: THE SKY CARD · FREE · 1200×630
- Form: YOUR MINUTE / DATE OF BIRTH / TIME (UTC) / PLACE (TEXT ON THE CARD ONLY)
- Actions: DRAW MY CARD + DOWNLOAD PNG
- Canvas card: THE SKY WHEN I ARRIVED / 14 March 1994 / MANCHESTER · 09:12 UTC / Sun Moon Venus + wheel
- Footer: WHAT'S YOURS? CAST THE FULL CHART FREE · THE 12 AUG ECLIPSE · © MMXXVI ASTRO PRECISE
- No gift copy, no gift.html, no keep-path, no site chrome/nav

## Copy

17px (pass ≥16). Lede: "One image: your date, your Sun, Moon and Venus placed from the clock time read as UTC — we do not round — and the wheel of that minute…"
Body default 16px. Cream ink on near-black.

## H1

32px (clamp 32 / 6vw / 44 — 6vw at 390 is 23.4 so floor 32).
Text: "The sky when you arrived."
Visually wraps to two lines at 390. One H1 only.

## Taps — 4 under 44

| target | size | min |
| CAST THE FULL CHART FREE (footer) | 159×11 | 11 |
| ← THE OBSERVATORY | 139×13 | 13 |
| THE 12 AUG ECLIPSE (footer) | 338×29 | 29 |
| DRAW MY CARD | 161×42 | 42 |
| DOWNLOAD PNG | 163×44 | 44 ok |

Footer links are 8.5px mono. Primary pill is 2px short of 44.
Place input 308×43 (not counted as a tap target in the list). Date 147×45, time 147×46.

## Stage

#cv 2D card canvas: 346×183 CSS (intrinsic 1200×630). Not a 3D orrery.
space-ambience also paints a full-viewport canvas 390×844 behind the page.
No #orr / .ap-model-stage. orr=null, webgl=false, canvas2d=ok.
183px is below the usual 200px orrery-stage floor — expected for this 16:9 card, not a collapsed 3D stage.

## Overflow

scrollW 390. overflowers 0. inputOverflow []. No horizontal overflow.
Page is taller than 844 (vertical scroll only). Card preview sits below the fold; viewport shot clips the wheel.

## Drawer

Missing. No .navbar, no .navbar__toggle, no #nav-mobile-menu, no bottom-nav.
This page has no site chrome. Back link is a 13px-tall text link, not a hamburger.

## Wordmark

No navbar / .logo-text wordmark at all (wordmarkPresent=false).
- Document title: "Astro Precise" — two words, space. Does not say AstroPrecise.
- Visible footer: "© MMXXVI ASTRO PRECISE" — two words, space. Footer block 346×54, one line (small mono, wraps as a block not a brand wrap).
- Painted on the card: "ASTROPRECISE.APP" — one word, no space, gold .APP. That is canvas text, not the site wordmark.
Does not wrap as a two-line logo. The two-word form is the title + footer brand, not a wrapping AstroPrecise lockup.

## Blue primaries

None. DRAW MY CARD is cream rgb(242,236,223) on black. DOWNLOAD PNG is transparent / cream outline. Accent is gold #d8b46a. No blue/purple CTAs.

## Verdict

FINDINGS only — old local news card, not PR 18 gift.
Fails vs phone-pass thresholds: tapLt44 (4), collapsedStage if you apply the 200px orrery rule (183px 2D card).
Copy 17, no horizontal overflow, no blue primaries, no drawer to stay open.
sw.js still ap-v874. Shipping files not touched by this pass.
