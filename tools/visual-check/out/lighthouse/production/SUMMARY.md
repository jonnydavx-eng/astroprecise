# Production Lighthouse Summary
- **Profile:** production
- **Base:** http://localhost:8790
- **Captured:** 2026-06-23T10:28:48.789Z
- **CI threshold:** performance ≥ 85 (informational)
> Production URLs (index uses ?lite=1 shipped shell). HeadlessChrome may still trigger defer-page-css audit-path. Compare with audit-lighthouse.mjs for shortcut delta.
| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|------|-------------|---------------|----------------|-----|-----|-----|
| chart | 96 | 100 | 100 | 100 | 2.6 s | 0 |
| horoscope | 96 | 100 | 100 | 100 | 2.7 s | 0 |
| aries | 98 | 100 | 100 | 100 | 2.4 s | 0.003 |
| leo | 98 | 100 | 100 | 100 | 2.4 s | 0.003 |
| compatibility | 97 | 100 | 100 | 100 | 2.5 s | 0 |
| ephemeris | 97 | 100 | 100 | 100 | 2.6 s | 0 |
| shop | 93 | 100 | 100 | 100 | 3.0 s | 0 |
| transits | 95 | 100 | 100 | 100 | 2.5 s | 0.001 |
| lifepath | 97 | 100 | 100 | 100 | 2.4 s | 0.02 |
| index | 100 | 100 | 100 | 100 | 1.5 s | 0 |

All pages passed CI thresholds.
