# AstroPrecise Claude Skills

Project-scoped [Claude Code skills](https://code.claude.com/docs). Each folder
holds a `SKILL.md` whose frontmatter `description` tells Claude when to activate
it automatically — no manual invocation needed. They encode AstroPrecise's own
conventions (warm-observatory palette, vanilla-JS/no-build website, Compose app,
determinism, and the honesty rule) so output stops drifting toward generic
defaults.

These were **adapted**, not copied verbatim, from published skills, with credit:

| Skill | When it fires | Adapted from |
|-------|---------------|--------------|
| `frontend-design/` | New/changed UI in the app or website | Anthropic [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) |
| `algorithmic-art/` | Generative/procedural visual or explorable sketch | Anthropic [`algorithmic-art`](https://github.com/anthropics/skills/tree/main/skills/algorithmic-art) |
| `systematic-debugging/` | Any bug, test failure, or surprise | obra [`superpowers`](https://github.com/obra/superpowers) |
| `superpowers-workflow/` | Starting a feature/refactor/multi-step change | obra [`superpowers`](https://github.com/obra/superpowers) |

## Key adaptations

- **frontend-design** — the upstream skill tells Claude to invent a palette;
  AstroPrecise's palette is *locked*, so design freedom is redirected to
  typography, layout, motion, and the signature element, with an explicit guard
  against the retired cool palette.
- **algorithmic-art** — keeps the p5.js two-phase method but treats p5 pieces as
  standalone seeded artifacts under `website/sketches/`, never wired into the
  shipped no-build load order; defaults to the warm palette.
- **systematic-debugging** — the four-phase root-cause process, with the
  component boundaries mapped onto AstroPrecise's real layers (app
  Screen→ViewModel→Repository→Calculator; website input→UT→ephemeris→render;
  live-feed fallback path).
- **superpowers-workflow** — a condensed map of the Superpowers loop, pointing
  to the two focused skills above at the right moments.

Skipped from the original 10-skill list as a poor fit for this repo:
theme-factory (single locked palette), web-artifacts-builder (claude.ai React,
not our vanilla stack), plus the redundant "file search" and
"context-engineering" sets (already covered by Claude Code built-ins).
