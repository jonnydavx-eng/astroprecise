# BUILD BRIEF — Codex — AstroPrecise, 2026-08-09

From Claude @ BOOK-T1H4NJ753R. Handing you the build.
Everything here was measured at **08:51 on 2026-08-09** against
`redesign/editorial-front-screen` @ `10ae8e5`, clean tree, 47 commits ahead of main.
Re-measure before you trust any line number — a repo-guard autosnapshot commits every
15 minutes and other agents have been editing these files.

**Branch is on origin as of 09:38** at `eeb3b18` (this brief added two commits after the
measurement above). Pull before you start. `main` and `origin/main` are untouched.

---

## THE JOB

Four defects block deploy. All four are small. Nothing else is asked of you.

The eclipse is **Wednesday 12 August**. Ship freeze **Tue 11 Aug 20:00 UT**, because the
deploy pipeline's own platform failed three times during a GitHub outage on 6 August and
needed manual retriggers. You have time; do not rush past the proofs.

---

## GROUND RULES

Run PROJECT-FIRST before you touch anything:

```powershell
powershell -NoProfile -File "C:\Users\jonny\OneDrive\control-panel\project_first.ps1" -Name "astroprecise" -Agent Codex
```

- Work only on `redesign/editorial-front-screen`. Never commit to `main`.
- **Never push `main`.** A push to `main` deploys astroprecise.app — the workflow's trigger is `branches: [main]` at `.github/workflows/deploy-pages.yml:5`. That is the owner's call and he has not made it.
- **Pushing this feature branch to origin is fine and encouraged.** It cannot trigger a deploy, and it is how the work stops being single-copy on one laptop. I pushed it at 09:38 today; `origin/redesign/editorial-front-screen` = `eeb3b18`. Push again when you have something worth keeping.
- Commit by explicit path. Never `git add -A`.
- A 15-minute repo-guard autosnapshot will commit your work before you do, under the message `autosnapshot ...`. Do not fight it and do not revert it. Verify your content is at HEAD, then record your reasoning with `git commit --allow-empty`.
- Gates must hold, measured at 08:51: `npm run lint` exit 0 (0 errors, 1193 warnings) · `npm test` exit 0 · `npm run check:syntax` 126/126 · `npm run test:launch` all pass.
- Preview: `node website/tools/serve-preview.mjs 8790`.
- Playwright lives in `tools/visual-check/node_modules`. `PLAYWRIGHT_BROWSERS_PATH` points at a drive that left this machine on 2026-07-31, so always pass `executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"`.

**The brand is honesty.** Making a false claim true beats rewording it. If a fix would
require the page to say something you cannot verify, stop and say so.

**Banned from anything a visitor reads:** sextile, orb, midheaven, ephemeris, arcminute.
Their vocabulary is big three, placements, moon sign, rising, birth chart, Saturn return,
retrograde. Point any anti-woo at the industry, never at the reader — the most engaged
segment is sincere believers. Keep precision as a feeling ("to the minute you were born"),
never as a technical noun.

---

## TASK 1 — the site invents a stellium (must fix, highest value)

`website/js/interpretations.js:2792` builds `planetNames` from **every** key in `positions`
that has a `lon`:

```js
const planetNames = Object.keys(positions || {}).filter(p => positions[p] && positions[p].lon != null);
```

`chart-page.js:284-285` writes the chart angles into that same object as `asc` and `mc`.
So angles are counted as planets by the `planets.length >= 3` test at `:2801`, and alias
spellings of one point are counted twice.

Rendered on the site's own sample chart:

> "Moon, Midheaven, MC are all concentrated in Taurus — this is your chart's power centre."

Midheaven and MC are the same point. Two real bodies are being sold as a three-body
stellium. That is a fabricated astrological claim, on the free page that feeds the paid
one, on a product that sells accuracy.

**Do:** filter angles and alias keys out before the count. Decide deliberately whether
angles may ever appear in a stellium — the common convention is that they may be
*mentioned* but do not *count* toward the three. Whatever you choose, one point must
never appear twice.

**Prove:** cast the Frida Kahlo sample and a chart with a genuine 3-planet stellium.
Show the rendered sentence in both. Add a unit test so this cannot come back.

## TASK 2 — the Midheaven is called a planet

`website/js/interpretations.js:2855`:

> "…opposition drives tension into Midheaven as the focal planet…"

The Midheaven is an angle, not a planet. Same file, same root cause as Task 1 — check
whether fixing the T-square input set fixes this string too, rather than patching the
words.

**Prove:** render a T-square chart and read the sentence back.

## TASK 3 — the £14 plate contradicts its own caption

`website/img/plate-enhanced.svg` has this baked into an SVG `<text>` node:

> VERIFY THIS PLATE — the sky re-computes live in your browser:
> astroprecise.app/#b=1990-06-14|02:42|0

`natal-plate.html:58` embeds that SVG. Directly beneath it, `natal-plate.html:99` now
says verification happens at `astroprecise.app/verify.html` and needs nothing typed.

So the product artwork still teaches putting a birth date and time into an address bar —
the exact practice two days of work removed from the site. Not a live leak, since it is a
sample, but it is the same claim the page beneath it contradicts.

`website/img/design/plate-enhanced.svg` carries the same string. Fix both.

**Note the trap:** text baked into SVG is invisible to `grep` on the HTML and invisible to
`innerText` in a browser check. Both scanners called this page clean. Only a screenshot
found it. When you re-verify, read `textContent` of SVG nodes or take a picture.

**Prove:** screenshot the plate. Confirm no overflow — the column is 214px and the longest
existing label runs about 144px.

## TASK 4 — a vocabulary edit strengthened an accuracy claim

`website/chart.html:926` now reads:

> "…a full perturbation series for the Sun and Moon, **placing every body** to within a few sixtieths of a degree."

It previously said accuracy was **typically** within a few arcminutes. The rewrite dropped
the hedge and added a universal quantifier. That is a stronger claim than the engine
supports, made accidentally while removing a banned word.

Restore the hedge. Drop "every body".

While you are there: the page says "a few sixtieths of a degree" at `:923` and `:926`, and
the JSON-LD at `:65` says the same, but three other places on the site say "a sixtieth of a
degree". One arcminute versus several. Pick the true one and make them agree.

**Prove:** quote the before and after, and say which figure the engine actually supports.

---

## WHEN THE FOUR ARE DONE

Run all four gates. Then hand back — **do not merge and do not push.**

The owner still owes a decision on two things before anything ships: which branch is the
ship candidate, and whether his home address goes on a public site. Both are in
`HANDOFF-2026-08-09.md` §7.

---

## CONTEXT YOU MAY NEED

`HANDOFF-2026-08-09.md` is the full picture — what is finished, what is deferred, what the
owner owes. Read §3 and §5 before starting; the rest when you need it.

**Already closed, do not redo:** every birth-data URL leak (verified 22 pages, 33 forms,
99 submit attempts with script execution disabled, zero personal data in any URL, request
line or Referer) · legal controller named sitewide · eclipse facts corrected and
independently re-verified · £12 link reaches the real 5,224-word sample · homepage says
checkout is shut · fake discounts deleted · quiet-gate contradiction fixed.

**Eclipse timing is settled, do not re-litigate:** greatest eclipse prints 18:46 BST and
that is correct. 17:47:06 TT − ΔT 69.1 s = 17:45:57 UT = 18:45:57 BST, which rounds to
18:46 with a 3-second error. I earlier claimed it should read 18:45; I was wrong.

**Deferred, not yours unless you have spare time** — full list in `HANDOFF-2026-08-09.md` §5
and §6. The cheap ones: `chart-page.js:1424` and `:1494`; `index-full.html` and
`deep-time.html`, both of which ship because `tools/build.mjs` excludes almost nothing;
`marketing/ECLIPSE-LAUNCH-PACK-2026-08-12.md:267`, which still promises a £19 price rise
that was reported deleted.

---

## THE THING I MOST WANT YOU TO CARRY

Three separate "clean" measurements this week were false, and each was believed until
something else caught it.

A form scanner reported 24/24 green while 11 of the forms had never been typed into.
A vocabulary scan masked `<script>` blocks — which is exactly where the copy is built.
A browser check used `innerText`, which silently skips SVG `<text>` — which is exactly
where Task 3 lives.

None of those were sloppy. Each was a reasonable method applied without asking whether it
could see the defect at all.

So before you report a green: make the defect happen on purpose and confirm your check
goes red. If it cannot fail, it did not pass.

---

Sign your entries **Codex @ BOOK-T1H4NJ753R** in `AGENT-HANDOFF.md`.

Claude @ BOOK-T1H4NJ753R, 2026-08-09 08:51
