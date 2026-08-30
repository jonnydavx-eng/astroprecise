# 🧠 Second Brain

A living personal knowledge wiki, tended by [Claude Code](https://claude.com/claude-code).

You drop sources into `raw/`. Claude reads them, distils the durable ideas, links
them to what you already know, and files them as clean, cross-linked notes in
`wiki/`. The more you feed it, the more connected — and useful — it gets.

The notes are plain Markdown and open directly as an **Obsidian vault** (graph
view, backlinks, search). Obsidian is optional; the value is the linked Markdown.

## Quick start

1. **Install Claude Code** and open this folder:
   ```bash
   claude
   ```
2. **(Optional) Install [Obsidian](https://obsidian.md)** and "Open folder as
   vault" → point it at this directory for the graph view.
3. **Drop a source** — an article, a transcript, a PDF, your own notes — into
   `raw/`.
4. **Tell Claude:** `ingest raw/that-file.md`
5. **Ask anything, forever:** `what do I know about <topic>?`

Claude follows the rules in [`CLAUDE.md`](./CLAUDE.md) every time, so ingestion
stays consistent as the vault grows.

## Layout

| Path | What it is |
|---|---|
| `CLAUDE.md` | The operating instructions Claude follows when ingesting and querying. |
| `raw/` | Where **you** drop sources. Read-only to Claude. |
| `wiki/` | Where **Claude** writes atomic, linked notes. |
| `wiki/index.md` | The Map of Content — the front door to everything. |
| `wiki/_template.md` | The shape every note follows. |

## A worked example is included

This vault lives **inside the AstroPrecise repo** (`astroprecise/second-brain/`)
so it can accumulate knowledge about its own subject — astrology — and get
smarter over time.

It ships pre-seeded with two ingested sources so you can see the pattern:

**1. Astrology + the project itself** (the useful seed):
- Source: [`raw/2026-06-22-astroprecise-overview.md`](./raw/2026-06-22-astroprecise-overview.md)
- Notes: [`astroprecise`](./wiki/astroprecise.md), [`birth-chart`](./wiki/birth-chart.md),
  [`zodiac-sign`](./wiki/zodiac-sign.md), [`element-and-modality`](./wiki/element-and-modality.md),
  [`the-planets`](./wiki/the-planets.md), [`astrological-houses`](./wiki/astrological-houses.md),
  [`aspects`](./wiki/aspects.md), [`ascendant`](./wiki/ascendant.md),
  [`birth-chart-calculator`](./wiki/birth-chart-calculator.md)

**2. The "second brain" idea itself** (the meta example):
- Source: [`raw/2026-06-22-karpathy-second-brain.md`](./raw/2026-06-22-karpathy-second-brain.md)
- Notes: [`second-brain`](./wiki/second-brain.md), [`atomic-notes`](./wiki/atomic-notes.md),
  [`compounding-knowledge`](./wiki/compounding-knowledge.md)

Start by opening [`wiki/index.md`](./wiki/index.md) — the map of everything.
To grow it, drop a new source in `raw/` and tell Claude `ingest raw/<file>`.
