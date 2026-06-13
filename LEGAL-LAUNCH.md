# AstroPrecise — Legal & Compliance Launch Pack

_2026-06-13. The compliance companion to `MONETIZATION.md` (routes), `GROWTH.md` (pricing/GTM) and `LAUNCH.md` (technical push). UK-based operator selling internationally. **Not legal advice** — it's an ordered checklist of what to set up and where the real risk sits; two items (trademark filing, any future paid-advice framing) are worth a solicitor's eye._

## TL;DR — AstroPrecise is the most launch-ready of the portfolio

The hard legal work is already done in code. Privacy policy, terms (with the "entertainment only / not professional advice" disclaimer), the EU/UK digital-goods refund waiver, and a fully ASA/FTC-compliant affiliate disclosure all exist. What remains is **owner admin**, not building: fill five placeholders, register with the ICO *when* you start collecting data, and file the trademark. Nothing below blocks the free-tool launch — it gates the *money*, not the *push*.

---

## 1. Fill the five placeholders (blocks taking any money, not the free launch)

| Where | Placeholder | Recommended value |
|---|---|---|
| `website/privacy.html` "Who we are" | `[OWNER / BUSINESS NAME]` | Your sole-trader or Ltd name (see §2) |
| `website/privacy.html` contact | `[CONTACT EMAIL]` | A dedicated address (e.g. `hello@astroprecise.app`) — better than personal Gmail on a commercial site |
| `website/terms.html` IP clause | `[OWNER / BUSINESS NAME]` | same as above |
| `website/terms.html` refunds + contact | `[CONTACT EMAIL]` | same as above |
| `website/terms.html` governing law | `[JURISDICTION]` | **England & Wales** (default for a UK operator) |

> ⚠ Editing `privacy.html`/`terms.html` are cached-asset changes — **bump `V` in `sw.js`** and re-deploy (per repo CLAUDE.md). `shop.html` already hardcodes `jonnydavx@gmail.com` as the suggestions contact; align it to the dedicated address at the same time if you set one up.

## 2. Business entity & payment account

- **Sole trader** is fine to launch (register for Self Assessment with HMRC; report the income). Simplest, can incorporate later.
- **Ltd** (~£12 at Companies House) earns its keep once revenue is real or you want the liability shield — not required day one.
- A payment account (**Gumroad / Ko-fi / Stripe**) needs identity + a bank account before products can go live.

## 3. ICO data-protection registration — **launch-gated, not needed yet**

Today the site receives **zero** personal data (everything computes in-browser — the privacy policy's "we never receive it" is accurate). So **no ICO fee is due yet.**

**The trigger:** the moment you switch on the **email list** (`newsletterUrl`) *or* start **manual order fulfilment** (the `GROWTH.md` model: post-purchase form collects birth data → you email a PDF), you become a **data controller** and must:

1. **Register with the ICO** and pay the data-protection fee — **£52/yr (£47 by Direct Debit)** at your scale (Tier 1, micro). Failing to register risks a fine up to £4,000 *on top* of the fee. ([ICO self-assessment](https://ico.org.uk/for-organisations/data-protection-fee/))
2. **Update `privacy.html`** to describe that processing — name the email provider, state retention, and the erasure route. Ready-to-paste section below.
3. Keep the provider's standard **Data Processing Agreement** on file (Buttondown/Kit/MailerLite all provide one).

<details>
<summary>Ready-to-paste privacy section — add only when the list/fulfilment goes live</summary>

```html
<h2>Information you give us directly</h2>
<p>If you join our email list or buy a personalised product, we receive the details you
  submit — your email address, and for a personalised reading the birth data you provide
  (date, time, place). We use this only to deliver what you asked for: the newsletter you
  subscribed to, or the reading you purchased. Email is handled by
  <span class="placeholder">[EMAIL PROVIDER — e.g. Buttondown]</span> on our behalf; payment
  by <span class="placeholder">[PAYMENT PROVIDER — e.g. Gumroad]</span>. We keep order
  records as long as needed for tax and support, and delete fulfilment data once your
  order is complete and any refund window has passed. To unsubscribe use the link in any
  email; to access or erase your data, contact us.</p>
```
</details>

## 4. Trademark — register **"AstroPrecise"** (this is the real protection)

"AstroPrecise" is a coined, distinctive mark — **registrable** (unlike "Back In Time" or "The Bigger Picture" elsewhere in the portfolio, which are descriptive). The brand is better protected by trademark than by copyright.

- **Do a free clearance search** first on the [UKIPO database](https://www.gov.uk/search-for-trademark).
- **File at the UKIPO** — ~£170 for the first class, +£50 per extra class. Relevant classes:
  - **Class 9** — downloadable software / the Android app / the ephemeris package.
  - **Class 45** — astrology & horoscope services (the core offering).
  - **Class 41** — online educational/entertainment content (optional, if you publish content broadly).
- Use **™** now; switch to **®** only once registered. A trademark attorney is worth a one-off consult purely for class selection.
- **US/international** (USPTO, or Madrid Protocol) only when you have real traction there — not day one.

## 5. Copyright — mostly automatic; one optional step

- **Automatic in the UK** on creation. Your protectable assets: the `interpretations.js` reading text, the generated chart artwork/posters, the site design, and the ephemeris code. Mark with `© [Name] 2026`. The terms already assert this ownership.
- **Optional:** register the key works (the Deep Reading text, the poster art) with the **US Copyright Office** (~$45–65) *if* you sell meaningfully into the US — it unlocks statutory damages, which makes US enforcement actually possible.
- **AI-content note:** astronomy here is computed, not AI-generated, so the AI-copyright gap barely applies. The only watch-item is any **AI-generated marketing art** (e.g. the OG banner) — those images may not be copyrightable, and EU users should see AI-generated promo imagery labelled. Minor; not a launch blocker.

## 6. Affiliate activation (disclosure already compliant)

The `shop.html` links are currently **bare Amazon/Etsy search URLs with no tag** — disclosed but not yet earning. To monetise:

- **Amazon Associates UK** — sign up, then append your tag to the product links (move from search URLs to specific product ASINs where possible; commissions are typically ~1–3% on most categories).
- **Etsy** — via the **Awin** affiliate network (Etsy's program runs through Awin).
- Set `affiliateTag` in the `AP_MON` block once approved.
- **No disclosure work needed** — the banner, `rel="sponsored"`, per-card badges and footer line already satisfy ASA + FTC. Keep the "we only recommend what we'd use / core tools stay free" wording; it's exactly right.

## 7. Tax / VAT

- **Use a merchant-of-record** (Gumroad / Lemon Squeezy) for digital products — they collect and remit **EU & UK VAT** for you. This is the single biggest reason to prefer them over raw Stripe for the Deep Reading and posters.
- Report the income via **HMRC Self Assessment**. UK VAT registration only bites above the ~£90k threshold.
- **Ko-fi tips** are gifts/donations, not sales — no VAT concern.

## 8. The host decision (also a compliance fork)

- **Stay on GitHub Pages (Phase 1 — recommended now):** Pages ToS forbids *selling on-site* but **permits tips/crowdfunding links and link-outs** to hosted storefronts. Everything currently wired (Ko-fi tips, Gumroad link-out products, affiliate) is compliant. Ship this.
- **Migrate to Cloudflare Pages / Netlify (Phase 2):** required before on-site checkout or the £4.99 subscription. That migration is the gate to recurring revenue — but only worth it once one organic product converts.

---

## Ordered launch sequence

**Pre-launch (free tool — do now):**
1. `git push origin main gh-pages` → free site live (per `LAUNCH.md`). No legal blocker — it collects no data.
2. Submit sitemap to Search Console; start SEO/social funnel.

**Before taking any money:**
3. Pick entity (sole trader to start) + set up a dedicated contact email.
4. Fill the five placeholders (§1) → bump `sw.js` `V` → redeploy.
5. Create Gumroad + Ko-fi accounts; build the Deep Reading + poster products; paste URLs into `AP_MON`.
6. Sign up Amazon Associates UK + Etsy/Awin; set `affiliateTag`; tag the shop links.

**The day the email list / paid fulfilment switches on:**
7. **Register with the ICO (£52/yr)** and paste the §3 privacy section (naming providers).

**Brand protection (anytime in first weeks):**
8. UKIPO clearance search + file "AstroPrecise" (classes 9 + 45, optionally 41).

**Phase 2 (once a product converts):**
9. Migrate host → on-site checkout + £4.99 subscription; optional US copyright registration if US sales are real.

---

_Sources: [ICO data-protection fee](https://ico.org.uk/for-organisations/data-protection-fee/) · [UKIPO trademarks](https://www.gov.uk/how-to-register-a-trade-mark) · [GitHub Pages ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) · CMA/ASA influencer & affiliate disclosure guidance, 2025–26._
