# Production Lighthouse Summary
- **Profile:** production
- **Base:** http://localhost:8790
- **Captured:** 2026-06-17T19:03:16.646Z
- **CI threshold:** performance ≥ 85 (enforced)
> Production URLs (index uses ?lite=1 shipped shell). HeadlessChrome may still trigger defer-page-css audit-path. Compare with audit-lighthouse.mjs for shortcut delta.
| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|------|-------------|---------------|----------------|-----|-----|-----|
| chart | 95 | 100 | 100 | 100 | 2.7 s | 0 |
| horoscope | 96 | 100 | 100 | 100 | 2.6 s | 0 |
| aries | 97 | 100 | 100 | 100 | 2.6 s | 0.002 |
| leo | 98 | 100 | 100 | 100 | 2.4 s | 0.003 |
| compatibility | 97 | 100 | 100 | 100 | 2.5 s | 0 |
| ephemeris | 97 | 100 | 100 | 100 | 2.6 s | 0 |
| shop | 90 | 100 | 100 | 100 | 3.6 s | 0 |
| transits | 95 | 100 | 100 | 100 | 2.8 s | 0.007 |
| lifepath | 94 | 100 | 100 | 100 | 3.0 s | 0.021 |
| index | 100 | 100 | 100 | 100 | 1.5 s | 0 |

All pages passed CI thresholds.
