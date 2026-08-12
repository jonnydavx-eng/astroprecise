# Account-before-delete — unused versioned shells + stale eclipse page controller

Date: 2026-08-12
Agent: Cursor Grok @ BOOK-T1H4NJ753R
Authority: owner allowlist (this session). No commit. No push.
Live HTML check: `website/*.html` script/link tags. None of the files below are loaded.
Kept on purpose: `js/ap-nav-model.js` (live), `js/ap-nav-model-v832.js`, `js/explore-boot.js`, `js/explore-boot-v832.js`, `css/explore-page.css`, `css/explore-page-v832.css`, `js/ap-gumroad-bridge.js`, `js/shop-commerce.js`, `js/shop-page-boot.js`, `js/deep-reading.js`, `js/ap-observatory-v833.js`.

Rollback for every path: `git checkout -- <path>` from repo root `C:\Users\jonny\OneDrive\astroprecise`.

---

## website/js/ap-eclipse-page.js

- Why unused: file is already STALE-bannered (“not loaded by any HTML; live contact is ap-eclipse-contact-v835.js”). No live HTML `script` tag names `ap-eclipse-page.js`. `eclipse.html` uses CSS class `ap-eclipse-page-shell` only. Sole remaining code reference is `eslint.config.js` (to be removed in the same pass).
- Rollback: `git checkout -- website/js/ap-eclipse-page.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v826.js

- Why unused: no live HTML loads `ap-nav-model-v826.js`. Live pages load unversioned `js/ap-nav-model.js` (index, shop, eclipse, chart, horoscope, contact, privacy, terms, refunds, and others). Older STATUS/handoff notes that pin v826 are historical proofs, not current script tags.
- Rollback: `git checkout -- website/js/ap-nav-model-v826.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v827.js

- Why unused: no live HTML loads `ap-nav-model-v827.js`. Live nav is `js/ap-nav-model.js`. Historical version pins are not live loads.
- Rollback: `git checkout -- website/js/ap-nav-model-v827.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v828.js

- Why unused: no live HTML loads `ap-nav-model-v828.js`. Live nav is `js/ap-nav-model.js`. Historical version pins are not live loads.
- Rollback: `git checkout -- website/js/ap-nav-model-v828.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v829.js

- Why unused: no live HTML loads `ap-nav-model-v829.js`. Live nav is `js/ap-nav-model.js`. Historical version pins are not live loads.
- Rollback: `git checkout -- website/js/ap-nav-model-v829.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v830.js

- Why unused: no live HTML loads `ap-nav-model-v830.js`. AGENT-HANDOFF 2026-08-10 recorded a cache-busted live read of `ap-nav-model-v830.js` at deploy time; that is a historical proof. Current HTML uses `js/ap-nav-model.js`.
- Rollback: `git checkout -- website/js/ap-nav-model-v830.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v833.js

- Why unused: no live HTML loads `ap-nav-model-v833.js`. STATUS.md “Critical live assets” row that names this file is a historical SHA-256 match from the v833 deploy, not a current script tag. Live nav is `js/ap-nav-model.js`. `js/ap-observatory-v833.js` is kept (visual-check may still name it).
- Rollback: `git checkout -- website/js/ap-nav-model-v833.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/ap-nav-model-v834.js

- Why unused: no live HTML loads `ap-nav-model-v834.js`. `tools/_proof-massive-build.mjs` asserts index uses `js/ap-nav-model.js?v=850` and does **not** contain `ap-nav-model-v834`.
- Rollback: `git checkout -- website/js/ap-nav-model-v834.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/explore-boot-v826.js

- Why unused: no live HTML loads `explore-boot-v826.js`. `explore.html` has no explore-boot script tag (fonts only). Visual-check and tests pin unversioned `explore-boot.js` and kept `explore-boot-v832.js`. `test-orrery-adapter.mjs` treats `explore-boot-v` in HTML as retired.
- Rollback: `git checkout -- website/js/explore-boot-v826.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/explore-boot-v827.js

- Why unused: no live HTML loads `explore-boot-v827.js`. Same live/test pins as v826. Historical version pins are not live loads.
- Rollback: `git checkout -- website/js/explore-boot-v827.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/explore-boot-v828.js

- Why unused: no live HTML loads `explore-boot-v828.js`. Same live/test pins as v826. Historical version pins are not live loads.
- Rollback: `git checkout -- website/js/explore-boot-v828.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/explore-boot-v829.js

- Why unused: no live HTML loads `explore-boot-v829.js`. Same live/test pins as v826. Historical version pins are not live loads.
- Rollback: `git checkout -- website/js/explore-boot-v829.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/js/explore-boot-v830.js

- Why unused: no live HTML loads `explore-boot-v830.js`. AGENT-HANDOFF 2026-08-10 recorded a live HTTP 200 for this file at v830 deploy; that is a historical proof. Current HTML does not load it. Kept: `explore-boot.js`, `explore-boot-v832.js`.
- Rollback: `git checkout -- website/js/explore-boot-v830.js`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/css/explore-page-v826.css

- Why unused: no live HTML `link` names `explore-page-v826.css`. Visual-check pins `explore-page.css` and kept `explore-page-v832.css`. `tools/_backup-worldclass-20260709-133359/explore.html` is a backup, not live.
- Rollback: `git checkout -- website/css/explore-page-v826.css`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/css/explore-page-v827.css

- Why unused: no live HTML loads `explore-page-v827.css`. Same live/test pins as v826.
- Rollback: `git checkout -- website/css/explore-page-v827.css`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/css/explore-page-v828.css

- Why unused: no live HTML loads `explore-page-v828.css`. Same live/test pins as v826.
- Rollback: `git checkout -- website/css/explore-page-v828.css`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/css/explore-page-v829.css

- Why unused: no live HTML loads `explore-page-v829.css`. Same live/test pins as v826.
- Rollback: `git checkout -- website/css/explore-page-v829.css`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

## website/css/explore-page-v830.css

- Why unused: no live HTML loads `explore-page-v830.css`. AGENT-HANDOFF 2026-08-10 recorded a live HTTP 200 at v830 deploy; that is a historical proof. Kept: `explore-page.css`, `explore-page-v832.css`.
- Rollback: `git checkout -- website/css/explore-page-v830.css`
- Date: 2026-08-12
- Agent: Cursor Grok @ BOOK-T1H4NJ753R

---

## Follow-on (not a delete)

`eslint.config.js`: remove `'website/js/ap-eclipse-page.js'` from the ES module files list after the file is gone. No other restyle.

## Skips

None. All 18 allowlisted paths existed. No live HTML still loaded any of them.

## Not deleted (explicit keep)

- website/js/ap-nav-model.js
- website/js/ap-nav-model-v832.js
- website/js/explore-boot.js
- website/js/explore-boot-v832.js
- website/css/explore-page.css
- website/css/explore-page-v832.css
- website/js/ap-gumroad-bridge.js
- website/js/shop-commerce.js
- website/js/shop-page-boot.js
- website/js/deep-reading.js
- website/js/ap-observatory-v833.js
