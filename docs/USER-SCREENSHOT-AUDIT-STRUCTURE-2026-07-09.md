# User screenshot audit → structure overhaul (2026-07-09)

## Sources (Downloads)
| File | Page | Findings |
|------|------|----------|
| 161725 / 161738 | Home | Form **covered** planet; model nearly invisible; nav OK (Explore first) |
| 16183 | Explore | Model excellent; sticky email bisects stage vs engine strip; nav lag (old bar) |
| 161827 | Daily | Explore nav OK; email sticky cuts sign grid; long page; tools strip present |
| 14:xx | Gen3 Davit | Out of scope (different product) |

## Fixes shipped (ap-v672)
1. Hero: orrery center-upper; compact translucent cast dock at bottom above deck
2. Sticky email disabled on home/explore/chart/daily/instrument
3. Home body: force silver text + glass flow cards (kill black voids)
4. Flow list: Explore as step 00
5. Mobile: hide standfirst on hero for more model

## Verify
Hard-refresh :8790 — planet should dominate first viewport; form under it not on top of it.
