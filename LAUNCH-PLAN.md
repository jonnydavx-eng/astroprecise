# AstroPrecise — The "Over the Line" Master Plan

_2026-06-13. The single launch playbook. Ties together the existing docs — `LAUNCH.md` (web push), `MONETIZATION.md` / `GTM-LADDER.md` / `GROWTH.md` (money + market), `LEGAL-LAUNCH.md` (web legal), `LINK-IN-BIO.md` / `CONTENT-PLAN.md` (social) — and adds the **app-store, iOS, payments-mechanics and app-legal research** they were missing. Web facts verified Oct 2025–Jun 2026. **Not legal/tax advice.**_

---

## TL;DR — the six decisions

1. **Web is launch-ready.** One `git push origin main` deploys it (credentials are now stored). Do this first; everything else layers on top.
2. **Google Play: yes, via a TWA** (wrap the PWA with **PWABuilder** — no Mac/Android Studio needed). **Two hard prerequisites:** a **custom domain** (the `github.io` subpath *cannot* host the required `assetlinks.json` at the origin root → the app would show an address bar / risk rejection), and the **12-testers-for-14-days** closed test that all new personal Play accounts must pass.
3. **iOS: do NOT launch on the App Store blind.** You have no Mac/iPhone to test on, and astrology + web-wrapper apps are heavily scrutinised (Apple tightened the "fortune-telling design-spam" rule on 2026-06-09). **Ship the iOS PWA ("Add to Home Screen") now — free, works today** — and revisit the App Store later, with budget for cloud testing.
4. **Payments: keep every purchase OUTSIDE the app.** Digital reading → **Lemon Squeezy** (merchant-of-record, remits VAT). Physical merch → **Etsy + Gelato** (Etsy remits VAT). Tips → **Ko-fi**. Selling only via external web links means **zero mandatory Play/Apple in-app billing** (no 15–30% cut) and stays GitHub-Pages-ToS-compliant.
5. **Legal: the web side is done.** App stores add a few items (Data Safety form, age rating, disclaimers). **No user accounts = exempt from the account-deletion mandate.** ICO (£52/yr) only when the email list/fulfilment switches on. Trademark "AstroPrecise" in the first weeks.
6. **Social infrastructure is now built** (this session): a dormant-by-default `AP_SOCIAL` config + footer social row + a `links.html` link-in-bio page. Paste handles → it goes live. Schedule posts with **Postiz**; content is already specced in `CONTENT-PLAN.md` / `GROWTH.md`.

---

## Part 1 — Web launch (ready today)

Per `LAUNCH.md`: zero backend, push to deploy. The one upgrade to do **before** the Play Store work:

- **Buy a custom domain** (~£8–12/yr, e.g. `astroprecise.app`). Point GitHub Pages at it (Settings → Pages → Custom domain; add DNS; free HTTPS). Serve the app at the domain **root**. Then update `og:url` / canonical / `sitemap.xml` / `manifest start_url`+`scope`.
  - **Why now:** it's a prerequisite for the Play Store TWA (asset-links must live at the origin root, which you don't control on `jonnydavx-eng.github.io`). Doing it first avoids rebuilding the app package later.
- Flip **Pages → GitHub Actions** (the deploy workflow exists) to retire the manual gh-pages mirror.
- Submit `sitemap.xml` to Google Search Console.

---

## Part 2 — Google Play Store (the PWA → TWA path)

**Tool: PWABuilder** (web UI, cloud build — no Android Studio/JDK on your Windows PC). Outputs a signed `.aab` + keystore + `assetlinks.json` template. (Bubblewrap is the CLI alternative but needs a local Android toolchain.)

**Hard prerequisites (accept these up front):**
- **Custom domain** (Part 1) — without it the TWA shows a browser URL bar and risks a "just a webview" rejection. Asset Links verify an *origin*, never a subpath.
- **Closed testing: ≥12 testers opted-in for 14 consecutive days** before you can apply for production. (Was 20; cut to 12 on 2024-12-11.) Recruit 15–25 (buffer for drop-offs); testers need real Android devices + Google accounts. **Org** accounts are exempt — but a sole-trader personal account is not.

**Steps:**
1. Custom domain live + PWA manifest polished (name, short_name, theme/background color, `display:standalone`, 192+512 icons **plus a separate `purpose:"maskable"` 512 icon**).
2. PWABuilder → point at the custom-domain URL → download the signed AAB; **back up the keystore + password** (lose it = can't ship updates).
3. Create + identity-verify a **Play Console** account ($25 one-time; name/address/phone/ID — no D-U-N-S for personal).
4. Opt into **Google Play App Signing**; take the **production SHA-256** from Play Console → App signing → put it in `assetlinks.json` at `https://yourdomain/.well-known/assetlinks.json`.
5. Listing: icon 512², feature graphic 1024×500, 2–8 screenshots, descriptions, **privacy-policy URL** (reuse the web one), **Data Safety** form, **IARC** content rating, **target API 35** (verify the AAB).
6. Upload to **Closed testing** → 12+ testers, 14 days → apply for production → review (1–7 days) → launch.
7. Sideload the test APK to your own Android to confirm it opens **full-screen, no address bar** (proves asset-links work).

**Timeline:** ~3–5 weeks end-to-end, dominated by the 14-day test + ID verification.

---

## Part 3 — iOS (the honest answer to "is it safe to launch untested?")

**No — do not ship to the Apple App Store without a way to run it on real iOS.** Reasons: (a) Apple rejects "minimum functionality" web-wrappers (Guideline 4.2) and **tightened the fortune-telling "design-spam" rule (4.3b) on 2026-06-09**; (b) you cannot reproduce iOS-only bugs a reviewer or user hits; (c) PWABuilder's iOS packager was **archived Sept 2025**.

**What to do instead — reach iOS users for free, now:**
- **Promote the iOS PWA via Safari "Add to Home Screen."** iOS supports installable PWAs: standalone display, offline, and **web push (since iOS 16.4, for home-screen-installed PWAs)**. Add a small "Install on iPhone" hint (Share → Add to Home Screen). This covers most of the need with zero cost, no Mac, no review.

**When you later want the App Store (post-traction, with budget):**
- Wrap with **Capacitor** → build/sign/submit from the cloud with **Codemagic** (automatic signing, no Mac). Apple Developer **$99/yr**.
- **Test on a real iPhone from Windows via BrowserStack Live (~$39/mo)** — including a TestFlight build. **Do not submit something you've never run.**
- Pass review by leading with the **real on-device chart computation** (defeats 4.2) and framing as entertainment + a 9+/4+ rating (manages 4.3b). Consider **Play-first** to build a track record.

---

## Part 4 — Payments architecture

**Principle: nothing is sold *on* the GitHub Pages domain and nothing digital is sold *inside* the app.** Every purchase is an outbound link to a third-party storefront. This is simultaneously GitHub-ToS-safe **and** avoids mandatory app-store in-app-billing.

| Need | Provider | Fee | VAT | Why |
|---|---|---|---|---|
| **Digital — Deep Reading PDF (£12)** | **Lemon Squeezy** | ~5% + $0.50 | ✅ Merchant-of-record, **remits UK/EU VAT** | Lowest all-in full-MoR; GBP payout. (Gumroad = simpler fallback at 10%+$0.50.) |
| **Physical POD — posters/tees/mugs** | **Etsy storefront + Gelato fulfilment** | ~11% (Etsy) + product cost | ✅ Etsy remits VAT on physical (≤£135/≤€150) | Built-in discovery, £0 fixed, UK/EU-local printing. Migrate to Shopify+Gelato only at volume. |
| **Tips** | **Ko-fi** | 0% on tips | n/a (gifts) | Instant, Pages-permitted. |
| **On-site Stripe checkout** | _Phase 2_ | 1.5%+£0.20 | ❌ you handle VAT (Stripe ≠ MoR) | Only after migrating host (Cloudflare Pages/Netlify) **and** VAT-registered. |

**What forces in-app billing (avoid):** selling a digital download/unlock, a subscription, or gated features **inside** the app. **Exempt:** physical goods (POD) and purchases made on the external web. So: outbound "View readings →" / "Shop your sky →" buttons only — never an in-app paywall.

All of this is already wired through the single **`AP_MON`** config in `app.js` — go live by pasting URLs (`deepReadingUrl`, `posterUrl`, `tipUrl`, `emailUrl`, …).

---

## Part 5 — Legal (web done; app-store additions)

**Already handled (web):** privacy policy + terms (entertainment-only + not-professional-advice disclaimer + refund waiver), affiliate disclosure, the dormant-monetization honesty pattern. **Owner admin remaining** (per `LEGAL-LAUNCH.md`): fill 5 placeholders, sole-trader + payment account, **ICO £52/yr when the email list/fulfilment goes live**, **UKIPO trademark "AstroPrecise"** (classes 9 + 45, opt 41; ~£170+£50/class), VAT handled by the merchants-of-record above.

**App-store additions:**
- **Google Play Data Safety:** with no email list = "**no data collected / no data shared**, encrypted in transit." Turning the newsletter on flips Email → *Collected (optional, developer communications)*.
- **Apple Privacy Nutrition Label:** "**Data Not Collected**" until the newsletter; then Email only, *not used to track* (no ATT prompt).
- **Age rating:** astrology is general-audience — expect **PEGI 3 / "Rated for 3+" (Play)** and **9+ or 4+ (Apple)** (Co-Star is 4+, CHANI 9+). Answer **"simulated gambling = No."** Do **not** flag "made for kids"; min age **13+**.
- **Apple 4.3(b) fortune-telling design-spam = the real approval risk.** Mitigate: lead the review notes with "computes full natal/transit charts on-device with a real ephemeris engine — not a content feed or web clipping"; have a screen-recording ready for appeal.
- **Account-deletion mandate: EXEMPT** (no accounts) — state it in review notes.
- **Disclaimers in-app + listing + terms:** "entertainment purposes only" **and** "not medical/financial/legal advice."
- **Privacy-policy URL** required in both consoles (and accessible in-app for Apple).

---

## Part 6 — Social & growth (infrastructure built this session)

**Built now (dormant-by-default — honesty rule, no dead links):**
- **`AP_SOCIAL`** config in `app.js` (handles for TikTok/Instagram/Pinterest/Reddit/YouTube/X/Threads) + a **footer "Follow" row** that appears per handle once set.
- **`links.html`** — an on-site **link-in-bio** page (your social funnel front door; free tools always live, paid/email/social appear when configured). Use this as your bio link instead of Linktree.
- Existing share-card generators (light-cone, zenith star, daily sky) are the repostable assets.

**To switch on:** create the accounts → paste profile URLs into `AP_SOCIAL` and product URLs into `AP_MON` → bump `sw.js` `V` → deploy. The funnel logic, bios, and content calendar are in `LINK-IN-BIO.md`, `GROWTH.md`, `CONTENT-PLAN.md`.

**Scheduling "fire to feeds":** use **Postiz** (connect TikTok/IG/Pinterest/X/etc. once accounts exist) to schedule the daily "today's sky" posts + share cards. Channels must be connected with your credentials — that's an owner step.

**Channel priority** (from `GROWTH.md`): TikTok/Reels (#AstroTok) → Pinterest (the poster is native there) → Reddit r/astrology (lead with *accuracy*) → SEO (12 sign pages already built) → email list (the long-term asset).

---

## Part 7 — Costs to get over the line

| Item | Cost | When |
|---|---|---|
| Web hosting + TLS (GitHub Pages) | **£0** | now |
| Custom domain | **~£10/yr** | before Play Store |
| Google Play Console | **$25 (~£20) once** | Play launch |
| Apple Developer Program | **$99/yr** | only if/when iOS App Store |
| BrowserStack (real-iPhone testing) | **~$39/mo** | only during iOS testing |
| ICO data-protection fee | **£52/yr** | when email list / fulfilment goes live |
| UKIPO trademark | **~£170 + £50/extra class** | first weeks |
| Storefronts (Lemon Squeezy / Etsy / Ko-fi) | **£0 fixed** (per-sale fees) | when selling |
| **Minimum to be live on web + Play** | **≈ £30 first year** (£10 domain + £20 Play) | — |

---

## Part 8 — The master sequence

**Phase 0 — Web live (this week):** `git push origin main`; buy domain + point Pages at it; flip Pages→Actions; submit sitemap. _Free tool live; collect emails._
**Phase 1 — Switch on money + social (week 1–2):** fill the 5 legal placeholders; create Ko-fi + Lemon Squeezy + Etsy/Gelato → paste into `AP_MON`; create social accounts → paste into `AP_SOCIAL`; publish `links.html` as the bio link; start daily content via Postiz.
**Phase 2 — Google Play (week 2–6):** PWABuilder TWA on the custom domain; Play Console + ID; closed test (12/14 days); Data Safety + rating; production. _When the email list switches on → register ICO._
**Phase 3 — Brand + compound (first weeks/months):** UKIPO trademark; SEO + Pinterest flywheel; first organic sales; iOS **PWA** push.
**Phase 4 — Scale (post-traction):** migrate host for on-site Stripe + subscription (only after a product converts); iOS **App Store** via Capacitor + Codemagic + BrowserStack; B2B engine licensing.

**Sequencing rule (from `GROWTH.md`):** free tool → audience → first organic sale → automate → *then* amplify. Don't pay for ads or build iOS before one organic product converts.

---

## Part 9 — What only you (Jonny) can do
- Run `git push` (creds now stored) and the GitHub Pages settings.
- Buy the domain; create Play Console / (later) Apple accounts with your ID.
- Create the Ko-fi / Lemon Squeezy / Etsy / email accounts (need your identity + bank) and the social accounts; paste the URLs/handles into `AP_MON` / `AP_SOCIAL`.
- Recruit the 12+ Play testers.
- File the ICO registration and the UKIPO trademark.
- Connect channels in Postiz.

_Sources for the new app-store/iOS/payments/legal research are inline in this session's research and in the per-area findings; key external references: Google Play Console help (12-tester rule, Data Safety, target API 35), Android Digital Asset Links docs, PWABuilder docs, Apple App Review Guidelines (4.2 / 4.3b, June 2026 update), Lemon Squeezy / Gumroad / Etsy / Ko-fi fee + VAT pages, ICO data-protection-fee, UKIPO trademarks._
