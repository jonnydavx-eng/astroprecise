# TRAVEL.md — driving AstroPrecise from the road

For working the repo from a phone or a mini PC while away from the desk (passenger
seat, hotel, anywhere you can't babysit an approval prompt). Companion file:
`davit_sat_dashboard.py/TRAVEL.md`.

## What's configured

`.claude/settings.json` (tracked, applies to anyone who opens this repo) sets:

- `defaultMode: acceptEdits` — file edits inside the repo apply without asking.
- An **allow** list covering the whole normal loop: `npm test` / `npm run *` /
  `node` / `npx`, `./gradlew *`, `python -m http.server`, `./launch.sh`,
  read-only shell (`ls cat grep rg find head tail jq diff wc …`), file plumbing
  (`mkdir cp mv touch chmod`), and the full everyday git set — `status diff log
  add commit branch checkout fetch pull push merge rebase stash`.
- GitHub MCP reads plus PR create/update/comment and CI log reads, so a session
  can open a draft PR and chase its own CI without you.

Net effect: a session you kick off from a phone runs the edit → test → commit →
push → PR → watch-CI loop start to finish on its own.

## What still stops and asks

Deliberate. These are the ones you actually want to be awake for:

| Rule | Why |
|---|---|
| `rm -rf …` | Ask. Fine to approve for `node_modules`, not fine blind. |
| `git clean …` | Ask. Deletes untracked work. |
| `npm publish …` | Ask. Outward-facing. |
| Merge a PR / delete a file via GitHub API | Ask. |
| `git push --force`, `-f`, `--mirror` | **Denied outright** — `AGENTS.md` says never force-push, so it's not even an approve-able prompt. |
| `sudo`, `shutdown`, `reboot`, `mkfs`, `dd` | Denied. |
| Reading `secrets/.env.local`, any `.env.local` | Denied. |

If you want one of these to flow while you're away, move it from `ask` to
`allow` before you leave — not mid-journey.

## The other thing that blocks: foreground servers

Permissions aren't the only way a session hangs. These never exit on their own:

- `./launch.sh` / `python -m http.server 8790`
- `npm run serve:dist`
- `./gradlew installDebug` against a connected device

Run them backgrounded, or the turn sits there until it times out. Ask for
"start the preview server in the background" rather than "start the preview
server". Same for anything in `tools/visual-check/` that opens Chrome.

## Ports on this machine

`8790` is this site's preview (per `AGENTS.md`, don't rebind it). `.claude/launch.json`
also reserves `8794` (website), `8795` (OrbitLab), `8796` (dist). Note the paths in
`launch.json` are Windows-absolute (`C:/Users/jonny/…`) — they resolve on the desk
machine only, not on a Linux mini PC or in a cloud session.

## What this does NOT cover

Being straight about the limits, since the point is not being surprised at 70mph:

- **ChatGPT** and **Hermes** are separate applications. Claude Code's permission
  system has no reach into them — nothing here makes them run unattended.
- **Hermes running locally** (Ollama / LM Studio on the mini PC) needs the box
  awake and the model server actually listening. Sleep settings and a reachable
  endpoint are a machine-level job, not a repo-level one. If the mini PC suspends,
  Hermes goes with it.
- These settings apply **per repo**. A session opened somewhere else on the mini PC
  gets none of this. If you want it machine-wide, the same `permissions` block goes
  in `~/.claude/settings.json`.

## Before you go

```bash
git fetch origin main
npm ci            # so a session on the road isn't blocked on a cold install
npm test          # know the gates are green before you leave
```
