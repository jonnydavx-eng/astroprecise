/**
 * Astro Precise — outreach playbook + ready-to-send copy (emails, X posts).
 * Owner toolkit: open outreach.html or run `node tools/export-outreach.mjs`.
 * Pairs with EMAIL-FUNNEL.md; prices match AP_MON (ap-v116).
 */
(function (root) {
  'use strict';

  var SITE = 'https://astroprecise.app';
  var LINKS = SITE + '/links.html';

  function fill(str, vars) {
    if (!str) return '';
    vars = vars || {};
    return str.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return vars[key] != null ? String(vars[key]) : '{{' + key + '}}';
    });
  }

  root.AP_OUTREACH = {
    version: 'ap-v308', // Mission Control campaign + social pack
    updated: '2026-06-16',
    siteUrl: SITE,
    linksUrl: LINKS,

    // ── X (Twitter) traffic research — distilled from 2026 algorithm + astro niche ──
    xTraffic: {
      summary:
        'X rewards conversation velocity in the first 30 minutes. For Astro Precise, the winning loop is: '
        + 'reply-heavy mornings on big astrology accounts → profile click → links.html → free chart or email. '
        + 'Post 3–5 originals/day; spend 30+ minutes/day on substantive replies. Never link checkout from X — bio only.',
      algorithm: {
        velocityWindowMin: 30,
        priorities: [
          'Replies and back-and-forth threads outweigh raw likes',
          'Positive, constructive tone (rage-bait gets throttled)',
          'Native video ≈10× text-only reach — screen-record chart casts',
          'Short threads (3–6 posts) with proof/screenshots beat mega-threads',
          'X Premium / verified accounts get For You feed priority',
        ],
      },
      cadence: {
        originalPostsPerDay: '3–5',
        repliesPerDay: '20–30',
        bestTimesUk: ['07:00–09:00', '12:00', '15:00–16:00', '19:00–21:00'],
        weeklyProofPost: 'One analytics or chart-cast screenshot per week',
      },
      contentMix: {
        entertain: 0.4,
        educate: 0.3,
        inspirational: 0.2,
        sell: 0.1,
      },
      profile: {
        handle: '@astroprecise',
        displayName: 'Astro Precise ✦ Mission Control',
        bio:
          'Mission Control for your sky ✦\n'
          + 'Real ephemeris · computed in your browser\n'
          + 'Birth data never uploaded · free chart ↓\n'
          + LINKS,
        pinnedPost:
          'Mission Control for your sky.\n\n'
          + 'VSOP87 ephemeris. Computed in your browser. Birth data never uploaded.\n'
          + 'Free chart · Deep Reading £12 · posters from £6\n\n'
          + 'Start here → ' + LINKS,
        bannerHint: 'marketing/social/banner-x-1500x500.jpg',
        avatarHint: 'marketing/social/avatar-400.jpg',
      },
      funnel: [
        'X post or reply → profile → links.html (never raw Gumroad)',
        'links.html → chart.html (cast) or email signup',
        'Email welcome sequence → transits/compat tools → Deep Reading when live',
      ],
      accountsToEngage: [
        { handle: '@chaninicholas', why: 'Premium astrology audience; transit-focused replies' },
        { handle: '@costarastrology', why: 'Large Gen Z base; contrast on accuracy + privacy' },
        { handle: '@astro_poets', why: 'Literary tone; synastry + Moon threads' },
        { handle: '@TheAstroTwins', why: 'Daily horoscope crowd; "real sky today" angle' },
        { handle: '@NASA', why: 'Space weather / eclipse threads — factual hook' },
        { handle: '@r/astrology', why: 'Cross-post insights; accuracy-first positioning' },
      ],
      replyRules: [
        'Reply within 30 minutes of their post when possible',
        'Add an insight, mini-example, or specific follow-up question — never "great post 🔥"',
        'End with soft curiosity, not a link (link lives in bio)',
        'Quote-tweet sparingly — native replies rank higher',
      ],
      hashtags: 'Use 0–2 max on X (unlike IG). Prefer none; let copy carry discovery.',
    },

    // ── Ready-to-paste emails (MailerLite / Kit automations) ──
    emails: {
      signupCopy: {
        headline: 'Your sky, as a wallpaper. Free.',
        subheadline:
          'Cast your free birth chart, save it as a phone or desktop wallpaper, '
          + 'and get your monthly cosmic weather — what the planets are doing to YOUR chart.',
        button: 'Send me my sky',
        microcopy:
          'Only your email is ever sent. Your birth details never leave your device. Unsubscribe anytime.',
      },
      welcome: [
        {
          id: 'welcome-1',
          delay: 'instant',
          tag: 'tag_chart',
          subject: 'Your sky is ready ✨',
          body:
            'Hey —\n\n'
            + 'Welcome. You just cast your chart — that wheel is yours, computed entirely in your '
            + 'own browser. Nothing about your birth moment ever touched a server.\n\n'
            + 'Here\'s the thing most people don\'t realise: that chart is a wallpaper waiting to '
            + 'happen. On the chart page, tap "Save image" — you\'ll get a clean, print-ready '
            + 'version of your sky for your phone, desktop, or to print.\n\n'
            + 'OPEN MY CHART → {{siteUrl}}/chart.html\n\n'
            + 'Every time you unlock your phone, let it remind you: you were born under a specific '
            + 'sky, and no one else has ever had yours.\n\n'
            + 'This list is for your monthly cosmic weather — what the planets are doing to YOUR '
            + 'chart, in plain language. First one lands soon.\n\n'
            + 'Reply and tell me your Sun sign — I read everything.\n\n'
            + '— Astro Precise',
        },
        {
          id: 'welcome-2',
          delay: 'day 2',
          subject: 'Sun, Moon, Rising — the three-minute version',
          body:
            'Quick lesson, because most "what\'s your sign?" talk only ever means your Sun.\n\n'
            + 'Your chart has three load-bearing points:\n\n'
            + '☉ SUN — your core, your purpose, the thing you\'re here to become.\n'
            + '☽ MOON — your inner world. How you feel, what soothes you.\n'
            + '↑ RISING — how you come across in the first five minutes.\n\n'
            + 'Two people with the same Sun can feel completely different once you know their Moon '
            + 'and Rising. That\'s why a real chart beats a horoscope column.\n\n'
            + 'SEE MY BIG THREE → {{siteUrl}}/chart.html\n\n'
            + '— Astro Precise',
        },
        {
          id: 'welcome-3',
          delay: 'day 5',
          subject: 'Three free tools you haven\'t tried yet 🔭',
          body:
            'Everything below is free, runs in your browser, and uses real astronomy (VSOP87/ELP2000).\n\n'
            + '1. YOUR HOROSCOPE — live sky, not a recycled column.\n'
            + '   {{siteUrl}}/horoscope.html\n\n'
            + '2. COMPATIBILITY — two charts, real synastry, shareable private link.\n'
            + '   {{siteUrl}}/compatibility.html\n\n'
            + '3. TRANSITS — what the sky is doing to YOUR chart right now.\n'
            + '   {{siteUrl}}/transits.html\n\n'
            + 'Take one for a spin and hit reply with what surprised you.\n\n'
            + '— Astro Precise',
        },
        {
          id: 'welcome-4',
          delay: 'day 7',
          subject: 'When you want the whole story, not just the highlights 🌙',
          body:
            'The free chart gives you the map. Sometimes you want someone to actually read it.\n\n'
            + 'That\'s the Deep Reading: a written interpretation of YOUR chart — Sun, Moon, Rising, '
            + 'dominant element and mode, tightest aspects, and what your transits are asking of you. '
            + 'A one-time PDF, yours to keep — {{deepReadingPrice}} when the shop is open.\n\n'
            + 'ABOUT THE DEEP READING → {{siteUrl}}/chart.html#deep-reading\n\n'
            + '(If it\'s not open for purchase yet, you\'ll see an honest note — we never run a fake checkout.)\n\n'
            + '— Astro Precise',
        },
        {
          id: 'welcome-5',
          delay: 'day 10',
          subject: 'Why I built this (and a small ask)',
          body:
            'Last email in the welcome series — so let me tell you why Astro Precise exists.\n\n'
            + 'Most astrology apps want your birth data on their servers and a subscription on your card. '
            + 'I wanted the opposite: a real chart, computed in your browser. No account. No subscription. '
            + 'Your birth moment never leaves your device.\n\n'
            + 'The small ask: reply and tell me one thing your chart got right about you. Real person here. '
            + 'I read every reply.\n\n'
            + 'From now on: monthly cosmic weather — one email, the sky\'s main moves. Unsubscribe anytime.\n\n'
            + '— Astro Precise\n\n'
            + 'P.S. Your wallpaper is one tap away on the chart page.',
        },
      ],
      horoscopeSubscribe: [
        {
          id: 'horoscope-daily-welcome',
          delay: 'instant',
          tag: 'tag_horoscope_daily',
          subject: 'Your daily sky note — starting tomorrow ☀️',
          body:
            'You\'re on the daily list.\n\n'
            + 'Each morning: a short note on what the live sky is doing — plain language, no jargon. '
            + 'Computed from real planetary positions, not a recycled column.\n\n'
            + 'Preview anytime (free, no account): {{siteUrl}}/horoscope.html\n\n'
            + 'Only your email was sent. Birth data stays in your browser.\n\n'
            + '— Astro Precise',
        },
        {
          id: 'horoscope-monthly-welcome',
          delay: 'instant',
          tag: 'tag_horoscope_monthly',
          subject: 'Your monthly outlook — first note soon 🌙',
          body:
            'You\'re on the monthly list.\n\n'
            + 'Once a month: a longer outlook for your sign — major transits, themes, dates to watch. '
            + 'Same honest astronomy as the free horoscope page.\n\n'
            + 'Read this month\'s preview: {{siteUrl}}/horoscope.html\n\n'
            + '— Astro Precise',
        },
      ],
      monthly: [
        {
          id: 'cosmic-weather-monthly',
          cadence: 'monthly',
          subject: '{{monthName}} cosmic weather — what the sky is stirring',
          body:
            'Hi —\n\n'
            + 'Here\'s {{monthName}} in one pass:\n\n'
            + '{{transitHighlight}}\n\n'
            + '(Pull this from the live transits page — keep it specific, never generic filler.)\n\n'
            + 'See it on your chart, free: {{siteUrl}}/transits.html\n\n'
            + 'Want the map reread in depth? The Deep Reading is {{deepReadingPrice}}, one-time: '
            + '{{siteUrl}}/chart.html#deep-reading\n\n'
            + '— Astro Precise',
        },
      ],
      reEngagement: [
        {
          id: 'reengage-90d',
          trigger: 'no open 90 days',
          subject: 'Still want your cosmic weather?',
          body:
            'Haven\'t heard from you in a while — totally fine.\n\n'
            + 'If you still want the occasional note on what the sky is doing (and one free tool nudge), '
            + 'click any link below and you\'ll stay on the list. Otherwise we\'ll stop emailing — no hard feelings.\n\n'
            + 'Cast your chart again: {{siteUrl}}/chart.html\n'
            + 'Today\'s transits: {{siteUrl}}/transits.html\n\n'
            + '— Astro Precise',
        },
      ],
      postPurchase: [
        {
          id: 'purchase-1',
          delay: 'instant',
          subject: 'It\'s yours — order confirmed 🌌',
          body:
            'Thank you — genuinely.\n\n'
            + 'Your order is confirmed. Digital PDFs arrive within 24 hours; physical pieces ship when printed.\n\n'
            + 'This was made for your chart and no one else\'s.\n\n'
            + '— Astro Precise',
        },
        {
          id: 'purchase-2',
          delay: 'day 3',
          subject: 'Getting the most from your reading',
          body:
            'A few ways to use what you bought:\n\n'
            + '→ Read once straight through, then again a week later.\n'
            + '→ Cross-check with live transits: {{siteUrl}}/transits.html\n\n'
            + 'Questions? Reply — I\'ll answer.\n\n'
            + '— Astro Precise',
        },
        {
          id: 'purchase-3',
          delay: 'day 14',
          subject: 'How\'s it landing? (+ something for a friend)',
          body:
            'Two weeks in — how\'s the reading sitting with you?\n\n'
            + 'Reply with a line of feedback if you have 20 seconds.\n\n'
            + 'Know someone curious about their chart? Send them {{linksUrl}} — the chart tool is free.\n\n'
            + '— Astro Precise',
        },
        {
          id: 'purchase-4',
          delay: 'day 30',
          subject: 'Your sky has moved — here\'s what\'s stirring',
          body:
            '{{transitHighlight}}\n\n'
            + 'See it live: {{siteUrl}}/transits.html\n\n'
            + 'When you\'re ready for another personalised piece — reading, poster, gift — it\'s one-time, no subscription.\n\n'
            + '— Astro Precise',
        },
      ],
      automation: {
        trigger: 'form submit → welcome-1 instant',
        spacing: 'instant · day 2 · day 5 · day 7 · day 10',
        tags: {
          tag_chart: 'chart page signup',
          tag_footer: 'footer signup',
          tag_popup: 'exit intent',
          tag_bio: 'link-in-bio landing',
          tag_horoscope_daily: 'horoscope daily',
          tag_horoscope_monthly: 'horoscope monthly',
          tag_waitlist: 'cosmic weather premium waitlist',
        },
        purchaseBranch: 'buyer email → stop welcome → start postPurchase',
      },
    },

    // ── Ready-to-post X copy (placeholders: {{linksUrl}}, {{todayTransit}}) ──
    xPosts: {
      rules: [
        'Bio link only — ' + LINKS,
        'Screen recordings > text for chart demos',
        'Ask a question in the last line to farm replies',
        'No checkout links in posts until AP_MON URLs are live',
      ],
      singles: [
        { id: 'x-01', day: 1, text: 'If the only sign you know is your Sun, you\'ve read one line of a whole book.\n\nCast the rest free (no account, in your browser) → {{linksUrl}}' },
        { id: 'x-02', day: 2, text: 'A horoscope that reads one sign and ignores the actual sky is a fortune cookie.\n\nToday\'s sky vs your sign — free → {{linksUrl}}' },
        { id: 'x-03', day: 3, text: 'Astrology you can trust shouldn\'t need your birth time on someone\'s server.\n\nWe compute in-browser. Nothing uploaded. → {{linksUrl}}' },
        { id: 'x-04', day: 4, text: 'Your chart isn\'t your sign. It\'s your sky — and it has never repeated.\n\nSee yours → {{linksUrl}}' },
        { id: 'x-05', day: 5, text: 'The 3am-feelings sign isn\'t your Sun. It\'s your Moon.\n\nWhat\'s yours? → {{linksUrl}}' },
        { id: 'x-06', day: 6, text: 'Mercury never moves backward. The retrograde dates are still real.\n\nCheck the actual sky instead of the meme → {{linksUrl}}/transits.html' },
        { id: 'x-07', day: 7, text: '"I don\'t act like my sign" — because your sign is 1 of 10+ placements.\n\nFull chart, 30 seconds → {{linksUrl}}' },
        { id: 'x-08', day: 8, text: 'Wrong birth time by 2 hours = wrong Rising = wrong houses.\n\nDo you know your birth time to the minute?' },
        { id: 'x-09', day: 9, text: 'Compatibility isn\'t "are our Suns compatible."\n\nIt\'s two full charts overlaid. Run synastry free → {{linksUrl}}/compatibility.html' },
        { id: 'x-10', day: 10, text: 'Make your lock screen the exact sky you were born under.\n\nCast → Save image → done. Free → {{linksUrl}}' },
        { id: 'x-11', day: 11, text: 'Monthly cosmic weather for YOUR chart — one email, no birth data uploaded.\n\n{{linksUrl}}' },
        { id: 'x-12', day: 12, text: 'Free chart = the map. Deep Reading = someone reading it for you ({{deepReadingPrice}} when live).\n\nBe first in line → {{linksUrl}}' },
        { id: 'x-13', day: 13, text: 'POV: you cast your actual chart and can\'t un-see it.\n\nMoon explains the feelings. Rising explains first impressions.\n\n→ {{linksUrl}}' },
        { id: 'x-14', day: 14, text: 'Sun = who you are. Moon = how you feel. Rising = how you seem.\n\nBig Three, free → {{linksUrl}}' },
      ],
      threads: [
        {
          id: 'thread-big-three',
          title: 'Big Three in 4 posts',
          posts: [
            'Most "what\'s your sign?" talk stops at the Sun. Here\'s the other two thirds most people skip 🧵',
            '☉ SUN — core drive. The "what you\'re becoming."\n☽ MOON — inner weather. The "how you feel at 2am."\n↑ RISING — first impression. The "vibe before you speak."',
            'Same Sun, different Moon/Rising = two people who share a birthday sign but live in different inner worlds. That\'s why columns feel vague.',
            'All three are on your chart in ~30 seconds. No account. Computed in your browser.\n\n{{linksUrl}}',
          ],
        },
        {
          id: 'thread-privacy',
          title: 'Privacy angle',
          posts: [
            'I keep seeing astrology apps that want your birth time + email + payment details on day one.\n\nWe went the other way.',
            'Astro Precise computes your chart entirely in-browser (VSOP87 ephemeris). Birth date, time, place never leave your device.',
            'No account. No subscription wall on the chart. If you want more later — a reading, a poster — it\'s one-time.',
            'Try it: {{linksUrl}}\n\nWhat would make you trust an astrology app?',
          ],
        },
      ],
      missionControlSingles: [
        { id: 'mc-x-01', day: 1, text: 'FLIGHT READINESS: knowing only your Sun sign is like launching with one telemetry channel.\n\nMoon = inner weather. Rising = first impression.\n\nAll three free → {{linksUrl}}' },
        { id: 'mc-x-02', day: 2, text: 'PRECESSION ALERT: your magazine zodiac dates are ~2,000 years out of sync with the actual sky.\n\nReal positions at your birth minute → {{linksUrl}}/chart.html' },
        { id: 'mc-x-03', day: 3, text: 'LIVE TELEMETRY: a horoscope that ignores where the Moon actually is today is a fortune cookie.\n\nToday\'s real sky → {{linksUrl}}/horoscope.html' },
        { id: 'mc-x-04', day: 4, text: 'ZENITH STAR LOCK: one real named star was directly overhead at your birth place and minute.\n\nFind yours (free) → {{linksUrl}}/ephemeris.html' },
        { id: 'mc-x-05', day: 5, text: 'TELEMETRY NOTE: the 3am-feelings channel is your Moon — not your Sun.\n\nWhat\'s yours? → {{linksUrl}}' },
        { id: 'mc-x-06', day: 6, text: 'MERCURY STATUS: it never moves backward — but the station dates are real.\n\nVerify live → {{linksUrl}}/transits.html' },
        { id: 'mc-x-07', day: 7, text: 'GO/NO-GO on birth time: Rising shifts every ~2 hours. Wrong time = wrong houses.\n\nDo you have your certificate?' },
        { id: 'mc-x-08', day: 8, text: 'SATURN INGRESS: ~29-year orbit. The vibe is everyone\'s; the house it lands in is yours.\n\nCheck your chart → {{linksUrl}}/transits.html' },
        { id: 'mc-x-09', day: 9, text: 'SYNASTRY OVERLAY: "are our Suns compatible" is a party trick.\n\nTwo full charts → {{linksUrl}}/compatibility.html' },
        { id: 'mc-x-10', day: 10, text: 'T-MINUS to your birth minute: that planetary configuration never repeated.\n\nWind the orrery → {{linksUrl}}' },
        { id: 'mc-x-11', day: 11, text: 'GROUND STATION: your birth data never leaves your device. Local compute only.\n\nNo account. No upload. → {{linksUrl}}' },
        { id: 'mc-x-12', day: 12, text: 'Monthly cosmic weather for YOUR chart — one email. Only your address is ever sent.\n\n{{linksUrl}}' },
        { id: 'mc-x-13', day: 13, text: 'POV: Mission Control just downloaded your full chart.\n\nMoon = 3am spiral. Rising = the misread. → {{linksUrl}}' },
        { id: 'mc-x-14', day: 14, text: 'Mission Control for your sky.\n\n✦ Real ephemeris\n✦ In-browser compute\n✦ Free chart · £12 reading · posters from £6\n\n{{linksUrl}}' },
      ],
      replyTemplates: [
        { id: 'reply-transit', template: 'Worth checking the actual station dates — Mercury\'s status changes on a schedule, not a vibe. I use live ephemeris for this.' },
        { id: 'reply-moon', template: 'The Moon piece is huge — phase at birth + natal Moon sign explain a lot of the "why am I like this at night" stuff. Do you know your Moon sign?' },
        { id: 'reply-rising', template: 'If you only have a date (no birth time), Rising/houses are the first thing that\'s uncertain. Even a rough time window helps — did they ever try narrowing it?' },
        { id: 'reply-compat', template: 'Sun-sign memes are fun but synastry is overlaying both full charts — aspects between Venus/Mars/Moon usually tell the real story.' },
        { id: 'reply-question', template: 'Curious — did you find that more true for relationships or career stuff? I\'ve seen the same transit hit different houses completely differently.' },
      ],
    },

    // ── Helpers ──
    vars: function () {
      var M = root.AP_MON || {};
      return {
        siteUrl: SITE,
        linksUrl: LINKS,
        deepReadingPrice: M.deepReadingPrice || '£12',
        posterPrice: '£6',
        bundlePrice: '£16',
        monthName: new Date().toLocaleString('en-GB', { month: 'long' }),
        transitHighlight: '{{transitHighlight}}',
      };
    },

    format: function (text, extra) {
      var v = Object.assign({}, this.vars(), extra || {});
      return fill(text, v);
    },

    getEmail: function (id) {
      var all = []
        .concat(this.emails.welcome)
        .concat(this.emails.horoscopeSubscribe)
        .concat(this.emails.monthly)
        .concat(this.emails.reEngagement)
        .concat(this.emails.postPurchase);
      var hit = all.filter(function (e) { return e.id === id; })[0];
      if (!hit) return null;
      return {
        id: hit.id,
        subject: this.format(hit.subject),
        body: this.format(hit.body),
        delay: hit.delay,
        tag: hit.tag,
      };
    },

    getXPost: function (id) {
      var s = this.xPosts.singles.filter(function (p) { return p.id === id; })[0];
      if (s) return { id: s.id, text: this.format(s.text) };
      var t = this.xPosts.threads.filter(function (th) { return th.id === id; })[0];
      if (t) {
        return {
          id: t.id,
          title: t.title,
          posts: t.posts.map(function (p) { return this.format(p); }.bind(this)),
        };
      }
      return null;
    },

    exportAllEmails: function () {
      var self = this;
      var sections = ['welcome', 'horoscopeSubscribe', 'monthly', 'reEngagement', 'postPurchase'];
      var out = [];
      sections.forEach(function (sec) {
        (self.emails[sec] || []).forEach(function (e) {
          out.push({
            section: sec,
            id: e.id,
            subject: self.format(e.subject),
            body: self.format(e.body),
            delay: e.delay,
            tag: e.tag,
          });
        });
      });
      return out;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);