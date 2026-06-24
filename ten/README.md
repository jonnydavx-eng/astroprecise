# Ten

**Open it, write for ten minutes, close it.**

Ten is a deliberately tiny app for *thinking on paper* — an unstructured, audienceless place to empty your mind for a few minutes a day. It is not a journaling system. There are no prompts, tags, folders, or feeds. The whole design goal is to **get out of your way** so you'll actually do it.

> You can't think clearly about what you can't see — so put your mind where your eyes can reach it, ten minutes a day.

## The core loop

1. **Begin** → a blank page and a quiet countdown.
2. **Write** (type or handwrite). Stall for ~20s and you get one gentle nudge: *"Stuck? Just write that you're stuck."*
3. **Time** → a soft chime, then one choice: **Keep or Clear.** Clearing is a feature — the value was in the act, not the artifact.
4. A single **streak** number ticks up. That's the only gamification.

## What's deliberately left out

No accounts. No social feed. No AI rewriting your thoughts. No rich text, no insights dashboard. Every feature is a reason to hesitate before writing, and hesitation is the enemy.

## The Quiet Review

Opt-in, computed entirely on-device from entries you *chose to keep*: the words that keep recurring across days — your mind showing you its loops. The bridge from "empty the mind" to "know the mind."

## Privacy

Everything stays on this device. No account, no servers, **zero network calls.** Entries live in `localStorage`. Export to JSON or erase everything from Settings at any time.

The only honest caveat is the **daily reminder**: with no backend there's no true push, so Ten schedules a local notification for the next time while it can run. The Settings copy says exactly this — it works best installed to your home screen.

## Run it

It's a static PWA — no build step.

```bash
cd ten
python3 -m http.server 8791   # then open http://localhost:8791
```

Or open `index.html` directly (the service worker only registers over http/https).

## Files

| File | Purpose |
|---|---|
| `index.html` | App shell: home, write, and three modal sheets |
| `css/ten.css` | Warm "paper" light theme + warm-dark night theme |
| `js/ten.js` | Everything: storage, day/streak math, timer, chime, ink canvas, word analysis. Framework-free so the core ports to the Android app. |
| `sw.js` | Offline cache (bump `V` when assets change) |
| `manifest.webmanifest` | Installable PWA metadata |
| `icons/` | App icon + maskable variant |

## Porting to Android (next)

The platform-independent core is small and intentional:

- **Streak / day math** — `dayKey`, `markSessionComplete`, `streakIsCurrent`
- **Entry model** — `{ id, day, ts, mode, text|ink }`
- **Word analysis** — `recurringWords` + stopword set

These map directly to Kotlin (DataStore/Room for storage, a `CountDownTimer` for the session, Compose for the UI). The web app is the reference implementation.
