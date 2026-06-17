# Search engine setup — owner checklist

Do these in order. ~90 minutes total.

## Google Search Console (P0)
1. Open https://search.google.com/search-console/welcome
2. Add **Domain property**: `astroprecise.app`
3. Verify via **DNS TXT** at your registrar (record shown in GSC)
4. Sitemaps → submit `https://astroprecise.app/sitemap.xml`
5. URL Inspection → Request indexing for:
   - https://astroprecise.app/chart.html
   - https://astroprecise.app/what-is-my-rising-sign.html
   - https://astroprecise.app/compatibility.html
   - https://astroprecise.app/horoscope.html
   - https://astroprecise.app/

## Bing Webmaster Tools (P0 — also powers DuckDuckGo + Ecosia)
1. Open https://www.bing.com/webmasters
2. Add site `https://astroprecise.app/`
3. Verify (DNS or import from GSC)
4. Submit sitemap: `https://astroprecise.app/sitemap.xml`
5. Check IndexNow report after next deploy

## IndexNow (already automated)
- Key file: `https://astroprecise.app/a7f3c9e2b1d84f6a9c0e5b8d7f2a1c4e.txt`
- Manual ping: `node tools/ping-indexnow.mjs`

## Brave Search (P1)
- Submit URLs: https://search.brave.com/submit-url
- https://astroprecise.app
- https://astroprecise.app/chart.html
- https://astroprecise.app/what-is-my-rising-sign.html
- https://astroprecise.app/compatibility.html
- https://astroprecise.app/horoscope.html

## Yandex Webmaster (P2)
- https://webmaster.yandex.com/ → add site + sitemap

## DuckDuckGo / Ecosia
- No separate portal — covered by Bing + backlinks
