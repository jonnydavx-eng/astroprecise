# AstroPrecise — Email Funnel
# ============================
# Lead capture, welcome sequence, post-purchase sequence, automation.
# Re-themed for astrology. Honesty + privacy first (see PRIVACY note at the end).
#
# How this wires to the site: the chart page already ships a dormant email-capture
# form bound to `window.AP_MON.emailUrl` in `website/js/app.js`. When `emailUrl` is
# empty the form saves intent to localStorage only (nothing leaves the device).
# The moment you paste a real hosted-newsletter form-action into `emailUrl`, the
# same form POSTs the address there (provider-agnostic, no-cors fire-and-forget).
# Setting up the sequences below is what makes that endpoint worth turning on.

---

## 1. EMAIL TOOL CHOICE

You only ever send ONE field — the email address the visitor typed. No birth data,
no names required. So pick the simplest free tier with a plain HTML form-action that
accepts a `POST` with an `email` field (that is exactly what the dormant form sends).

| Tool | Free tier | Why for AstroPrecise |
|---|---|---|
| **MailerLite** (recommended) | 1,000 subscribers / 12,000 emails / mo | Cleanest automation builder on the free tier, native "deliver a file" on signup (perfect for the chart-wallpaper lead magnet), embeddable form gives a `POST` action that drops straight into `AP_MON.emailUrl`. |
| **ConvertKit / Kit** | 10,000 subscribers (sending limited) | Creator-focused, excellent tagging + visual automations; "Incentive email" delivers the lead magnet. Slightly more setup. |
| **Buttondown** | 100 subscribers free | Markdown-native, privacy-friendly, dead-simple `embed-subscribe` endpoint — good if you want the absolute minimum and don't mind upgrading early. |

**Decision:** Start on **MailerLite** for the free 1,000-sub automation builder and
file-on-signup delivery. If you outgrow tagging logic, ConvertKit is the upgrade path.
Either way the site code does not change — only the `emailUrl` string.

### Wiring it (one line of config)
In `website/js/app.js`, the `AP_MON` block:
```js
emailUrl: 'https://assets.mailerlite.com/jsonp/<account>/forms/<form>/subscribe',
```
(Use the form's raw POST action — MailerLite "embedded form" → "HTML" gives it.
ConvertKit: `https://app.kit.com/forms/<id>/subscriptions`. Buttondown:
`https://buttondown.email/api/emails/embed-subscribe/<user>`.)
Empty `''` = DORMANT (localStorage only). A real `https://…` URL = LIVE.
**Do not** add hidden birth-data fields — the form sends `email` and nothing else.

---

## 2. FORM PLACEMENT

The chart page's capture form is the spine; mirror its offer everywhere else.

1. **Chart page (primary)** — already built. It reveals beneath a freshly-cast chart
   (`#email-capture`, unhidden by `initEmailCapture`). This is the highest-intent
   moment: the visitor is staring at their own sky. The offer here is "save this as a
   wallpaper + get your monthly cosmic weather."
2. **Footer (site-wide)** — slim inline form: "Your sky, in your inbox." Mirrors the
   chart-page copy so the lead magnet is reachable from every page.
3. **Exit-intent popup (desktop) / scroll-50% (mobile)** — single field + the
   wallpaper hook. Fire once per visitor (set a localStorage flag, same pattern as
   `ap_privacy_ack`), never on the first 10 seconds, never over a cast chart.
4. **Link-in-bio** — a hosted MailerLite/ConvertKit landing page is the destination
   for every social CTA (see CONTENT-PLAN.md). Same headline, same lead magnet.

### Signup form copy
```
HEADLINE: Your sky, as a wallpaper. Free.
SUBHEADLINE: Cast your free birth chart, save it as a phone or desktop wallpaper,
             and get your monthly cosmic weather — what the planets are doing to
             YOUR chart. Drop your email below.
BUTTON: Send me my sky
MICROCOPY: Only your email is ever sent. Your birth details never leave your
           device. Unsubscribe anytime.
```

### The lead magnet — already buildable, no design work
The site already renders a print-ready, resolution-independent share image of any
chart via `paintShareImage(chart, format)` in `website/js/chart-page.js`
(`'square'`, `'story'`, `'print'` outputs; one-tap export via `exportShareImage`).
**The lead magnet IS the visitor's own chart wallpaper** — generated in-browser from
the chart they just cast. This is on-brand ("wear your sky"), genuinely personal, and
fulfils instantly with zero fulfilment cost. Two honest ways to frame the email:

- **Primary (true today):** "Your wallpaper is already on your screen — tap Save on
  the chart page anytime. This list is for your monthly cosmic weather." (The export
  button is live, so the magnet is real the moment they cast a chart.)
- **Optional bundle (only if you actually make it):** a small "Reading the Sky"
  starter pack (Sun/Moon/Rising explainer PDF + a few generic cosmic wallpapers).
  Deliver via MailerLite file-on-signup. Do NOT promise this until the file exists —
  honesty rule.

---

## 3. WELCOME SEQUENCE (5 emails over ~10 days)

Re-themed for astrology. Sign every email "— AstroPrecise". Plain text, one idea each,
one link each. Every tool link goes to the relevant **free** page on the site.

### Email 1 — Instant (on signup)
SUBJECT: Your sky is ready ✨
```
Hey —

Welcome. You just cast your chart — that wheel is yours, computed entirely in your
own browser. Nothing about your birth moment ever touched a server.

Here's the thing most people don't realise: that chart is a wallpaper waiting to
happen. On the chart page, tap "Save image" — you'll get a clean, print-ready
version of your sky for your phone, desktop, or to print.

[OPEN MY CHART → /chart.html]

Every time you unlock your phone, let it remind you: you were born under a specific
sky, and no one else has ever had yours.

This list is for your monthly cosmic weather — what the planets are doing to YOUR
chart, in plain language. First one lands soon.

Reply and tell me your Sun sign — I read everything.

— AstroPrecise
```

### Email 2 — Day 2
SUBJECT: Sun, Moon, Rising — the three-minute version
```
Quick lesson, because most "what's your sign?" talk only ever means your Sun.

Your chart has three load-bearing points:

☉ SUN — your core, your purpose, the thing you're here to become. This is the sign
everyone knows. It's the "what."

☽ MOON — your inner world. How you feel, what soothes you, what you needed as a
child and still need now. The "how you process."

↑ RISING (Ascendant) — the mask at the door. How you come across, the vibe people
get in the first five minutes, the lens you meet the world through. The "how you
show up."

Two people with the same Sun can feel completely different once you know their Moon
and Rising. That's why a real chart beats a horoscope column.

Yours are all on your chart — Sun, Moon, and Rising are the first three rows.

[SEE MY BIG THREE → /chart.html]

Tomorrow's not coming for a few days. Sit with these.

— AstroPrecise
```

### Email 3 — Day 5
SUBJECT: Three free tools you haven't tried yet 🔭
```
Quick one — everything below is free, runs in your browser, and computes from real
astronomy (VSOP87/ELP2000, the same models used for actual ephemerides).

1. YOUR HOROSCOPE, done properly. Not a generic column — it reads the live sky
   against your sign and the current planet weather.
   [DAILY HOROSCOPE → /horoscope.html]

2. COMPATIBILITY (synastry). Cast two charts, see how they actually interact —
   element balance, the standout aspects, the friction points. Share the result
   with a private link (the link carries the charts, not your server).
   [CHECK COMPATIBILITY → /compatibility.html]

3. TRANSITS. What the sky is doing to YOUR chart right now, and what's coming.
   This is the one people get hooked on.
   [SEE MY TRANSITS → /transits.html]

Take one for a spin and hit reply with what surprised you.

— AstroPrecise
```

### Email 4 — Day 7
SUBJECT: When you want the whole story, not just the highlights 🌙
```
The free chart gives you the map. Sometimes you want someone to actually read it.

That's what a Deep Reading is: a written, personalised interpretation of YOUR
chart — Sun, Moon, Rising, the dominant element and mode, the tightest aspects, and
what your current transits are asking of you. Written for your sky, not a sign in
general. A one-time thing, yours to keep.

[ABOUT THE DEEP READING → /chart.html#deep-reading]

It's the same chart you already cast — just fully interpreted, in depth, in words.

(If it's not open for purchase yet when you click, you'll see an honest note and a
way to be first in line. We never run a fake checkout.)

— AstroPrecise
```
> NOTE: This email's CTA mirrors the on-site Deep Reading teaser, which is wired to
> `AP_MON.deepReadingUrl`. While that URL is empty the on-site button gracefully
> falls back to email capture instead of a broken checkout — so the email copy is
> honest either way. When you set `deepReadingUrl` to a real hosted product page
> (Gumroad / Ko-fi Shop / Lemon Squeezy), point this email's link at the same URL.

### Email 5 — Day 10
SUBJECT: Why I built this (and a small ask)
```
Last email in the welcome series — so let me tell you why AstroPrecise exists.

Most astrology apps want your birth data on their servers, your email for an
account, and a subscription on your card. I wanted the opposite: a real chart,
computed from real astronomy, entirely in your browser. No account. No subscription.
Your birth moment never leaves your device. Ever.

Everything stays one-time and honest: cast your chart free, and if you ever want
more — a Deep Reading, or one day your sky printed on something you can wear or
hang — it's a single purchase, made personally for your chart. Never a membership.

The small ask: reply and tell me one thing your chart got right about you. The eerie
ones, the "how did it know" moments — those are why I keep building this. Real
person here. I read every reply.

And from now on you'll get the monthly cosmic weather: one email, the sky's main
moves, what they touch in a chart like yours. Unsubscribe anytime — but I think
you'll stay.

— AstroPrecise

P.S. Your wallpaper is one tap away on the chart page, whenever you want a fresh one.
```

---

## 4. POST-PURCHASE SEQUENCE (4 emails)

Triggered when someone buys a Deep Reading or, later, a personalised physical product
(natal poster, sky tee). NO subscription is ever sold — every product is a one-time,
personalised-per-chart purchase, so this sequence is about delivery, delight, and an
honest invitation back — never an upsell to a plan.

### Post-Purchase 1 — Instant
SUBJECT: It's yours — order confirmed 🌌
```
Thank you — genuinely.

Your order is confirmed. Here's what happens next:

• DIGITAL (Deep Reading): delivered to this inbox / your account on the store within
  [X hours]. It's written specifically for your chart — keep it forever.
• PHYSICAL (poster / tee): printed to order for your exact sky, then shipped.
  You'll get a tracking note when it's on the way.

This was made for your chart and no one else's. That's the whole point.

— AstroPrecise
```

### Post-Purchase 2 — Day 3
SUBJECT: Getting the most from your reading
```
A few ways to actually use what you bought:

→ Read it once straight through, then again a week later. Different lines land at
  different times — that's normal.
→ Cross-reference it with your live transits (free, anytime): /transits.html — the
  reading explains your map; transits show today's weather over it.
→ For physical orders: a quick styling/hanging note below. [styling tips]

Questions about anything in your reading? Reply — I'll answer.

— AstroPrecise
```

### Post-Purchase 3 — Day 14
SUBJECT: How's it landing? (+ something for a friend)
```
Two weeks in — how's the reading sitting with you? Or, if it's a poster/tee:
how does it look on the wall / does it fit right?

If you've got 20 seconds, reply with a line of feedback — it shapes what I build
next. And if you'd snap a photo of your poster/tee in the wild, I'd love to see it.

Everyone has someone whose chart they're curious about. If you want to send them
down the rabbit hole, here's a friend code for [15% off] their first Deep Reading
or personalised piece: [CODE]. One-time, same as everything here.

— AstroPrecise
```

### Post-Purchase 4 — Day 30
SUBJECT: Your sky has moved — here's what's stirring
```
A month on, the sky has shifted — and so has what it's doing to your chart.

[ONE genuine, current transit note — e.g. "the Moon is back in your Sun sign this
week" or "Mercury just stationed direct." Pull from what the site computes; keep it
true, not generic.]

See it live, free, anytime: /transits.html

When you're ready for another personalised piece — a reading for a big year ahead,
or your sky as a poster for a new chapter — it's here, one-time, made for your chart.
No subscription, no pressure. Just your sky, whenever you want more of it.

— AstroPrecise
```

---

## 5. AUTOMATION & TAGGING

```
TRIGGER: visitor submits the email form (chart page / footer / popup / link-in-bio)
  → add to "AstroPrecise — Subscribers"
  → start WELCOME SEQUENCE (Email 1 instant)
  → tag with source: tag_chart | tag_footer | tag_popup | tag_bio

SPACING: Email 1 instant · 2 (day 2) · 3 (day 5) · 4 (day 7) · 5 (day 10)

ENGAGEMENT TAGGING (set in the automation, optional but useful):
  → clicks a free-tool link (horoscope/compatibility/transits) → tag "engaged"
  → clicks the Deep Reading link → tag "warm-deep-reading"

PURCHASE BRANCH:
  → if a buyer email matches a subscriber BEFORE Email 5 finishes:
      stop the welcome sequence, start POST-PURCHASE SEQUENCE
  → tag "customer", remove from "warm-deep-reading"

AFTER WELCOME (non-buyers):
  → move to "Monthly Cosmic Weather" — ONE broadcast per month:
      the sky's main moves + what they touch in a typical chart + a free-tool nudge
      + (only when truly live) a one-time product mention. Never a subscription pitch.

LIST HYGIENE:
  → no opens in 90 days → one re-engagement broadcast ("still want your cosmic
     weather?") → if no click, suppress. Keeps deliverability clean and the list honest.
```

**Cadence rule:** one monthly newsletter is the floor and the ceiling unless there's
something genuinely new (a product going live, a major transit). Quality over volume —
matches the site's "no clutter, no fake urgency" ethos. There is NO weekly-drop or
"membership" mechanic to feed (those belonged to the old fixed-design/subscription
model and are dropped).

---

## 6. PRIVACY NOTE (non-negotiable — CLAUDE.md honesty/privacy rules)

- **Only the email address ever leaves the device.** The on-site form sends a single
  `email` field. Birth date, time, place, names, and the computed chart are **never**
  transmitted — they live only in the visitor's browser (localStorage `ap_charts`
  via `AstroProfile`, `ap_email_intent` for dormant intent). Do not add hidden
  birth-data fields to any form, ever.
- **Dormant means dormant.** While `AP_MON.emailUrl` is empty, the form stores intent
  in localStorage only and tells the user plainly that nothing was sent. Don't write
  welcome-sequence copy that implies emails are flowing before the endpoint is live.
- **No fake fulfilment.** The lead magnet (chart wallpaper) is real and instant — it's
  generated in-browser by `paintShareImage`. Don't promise a PDF/pack that doesn't
  exist yet. The Deep Reading email must stay honest while `deepReadingUrl` is empty
  (the on-site CTA already falls back to capture, never a broken checkout).
- **Every email has a working unsubscribe** (the provider handles this) and says so.
- **No analytics pixels** beyond what the email provider includes for opens/clicks;
  the site itself adds none. Keep the funnel consistent with the site's no-tracking
  promise — say "we count opens to know what's useful" if you ever surface stats.
