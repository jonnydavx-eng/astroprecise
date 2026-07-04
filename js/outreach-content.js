(function(a){"use strict";var s="https://astroprecise.app",r=s+"/links.html";function l(t,n){return t?(n=n||{},t.replace(/\{\{(\w+)\}\}/g,function(e,o){return n[o]!=null?String(n[o]):"{{"+o+"}}"})):""}a.AP_OUTREACH={version:"ap-v308",updated:"2026-06-16",siteUrl:s,linksUrl:r,xTraffic:{summary:"X rewards conversation velocity in the first 30 minutes. For Astro Precise, the winning loop is: reply-heavy mornings on big astrology accounts \u2192 profile click \u2192 links.html \u2192 free chart or email. Post 3\u20135 originals/day; spend 30+ minutes/day on substantive replies. Never link checkout from X \u2014 bio only.",algorithm:{velocityWindowMin:30,priorities:["Replies and back-and-forth threads outweigh raw likes","Positive, constructive tone (rage-bait gets throttled)","Native video \u224810\xD7 text-only reach \u2014 screen-record chart casts","Short threads (3\u20136 posts) with proof/screenshots beat mega-threads","X Premium / verified accounts get For You feed priority"]},cadence:{originalPostsPerDay:"3\u20135",repliesPerDay:"20\u201330",bestTimesUk:["07:00\u201309:00","12:00","15:00\u201316:00","19:00\u201321:00"],weeklyProofPost:"One analytics or chart-cast screenshot per week"},contentMix:{entertain:.4,educate:.3,inspirational:.2,sell:.1},profile:{handle:"@astroprecise",displayName:"Astro Precise \u2726 Mission Control",bio:`Mission Control for your sky \u2726
Real ephemeris \xB7 computed in your browser
Birth data never uploaded \xB7 free chart \u2193
`+r,pinnedPost:`Mission Control for your sky.

VSOP87 ephemeris. Computed in your browser. Birth data never uploaded.
Free chart \xB7 Deep Reading \xA312 \xB7 posters from \xA36

Start here \u2192 `+r,bannerHint:"marketing/social/banner-x-1500x500.jpg",avatarHint:"marketing/social/avatar-400.jpg"},funnel:["X post or reply \u2192 profile \u2192 links.html (never raw Gumroad)","links.html \u2192 chart.html (cast) or email signup","Email welcome sequence \u2192 transits/compat tools \u2192 Deep Reading when live"],accountsToEngage:[{handle:"@chaninicholas",why:"Premium astrology audience; transit-focused replies"},{handle:"@costarastrology",why:"Large Gen Z base; contrast on accuracy + privacy"},{handle:"@astro_poets",why:"Literary tone; synastry + Moon threads"},{handle:"@TheAstroTwins",why:'Daily horoscope crowd; "real sky today" angle'},{handle:"@NASA",why:"Space weather / eclipse threads \u2014 factual hook"},{handle:"@r/astrology",why:"Cross-post insights; accuracy-first positioning"}],replyRules:["Reply within 30 minutes of their post when possible",'Add an insight, mini-example, or specific follow-up question \u2014 never "great post \u{1F525}"',"End with soft curiosity, not a link (link lives in bio)","Quote-tweet sparingly \u2014 native replies rank higher"],hashtags:"Use 0\u20132 max on X (unlike IG). Prefer none; let copy carry discovery."},emails:{signupCopy:{headline:"Your sky, as a wallpaper. Free.",subheadline:"Cast your free birth chart, save it as a phone or desktop wallpaper, and get your monthly cosmic weather \u2014 what the planets are doing to YOUR chart.",button:"Send me my sky",microcopy:"Only your email is ever sent. Your birth details never leave your device. Unsubscribe anytime."},welcome:[{id:"welcome-1",delay:"instant",tag:"tag_chart",subject:"Your sky is ready \u2728",body:`Hey \u2014

Welcome. You just cast your chart \u2014 that wheel is yours, computed entirely in your own browser. Nothing about your birth moment ever touched a server.

Here's the thing most people don't realise: that chart is a wallpaper waiting to happen. On the chart page, tap "Save image" \u2014 you'll get a clean, print-ready version of your sky for your phone, desktop, or to print.

OPEN MY CHART \u2192 {{siteUrl}}/chart.html

Every time you unlock your phone, let it remind you: you were born under a specific sky, and no one else has ever had yours.

This list is for your monthly cosmic weather \u2014 what the planets are doing to YOUR chart, in plain language. First one lands soon.

Reply and tell me your Sun sign \u2014 I read everything.

\u2014 Astro Precise`},{id:"welcome-2",delay:"day 2",subject:"Sun, Moon, Rising \u2014 the three-minute version",body:`Quick lesson, because most "what's your sign?" talk only ever means your Sun.

Your chart has three load-bearing points:

\u2609 SUN \u2014 your core, your purpose, the thing you're here to become.
\u263D MOON \u2014 your inner world. How you feel, what soothes you.
\u2191 RISING \u2014 how you come across in the first five minutes.

Two people with the same Sun can feel completely different once you know their Moon and Rising. That's why a real chart beats a horoscope column.

SEE MY BIG THREE \u2192 {{siteUrl}}/chart.html

\u2014 Astro Precise`},{id:"welcome-3",delay:"day 5",subject:"Three free tools you haven't tried yet \u{1F52D}",body:`Everything below is free, runs in your browser, and uses real astronomy (VSOP87/ELP2000).

1. YOUR HOROSCOPE \u2014 live sky, not a recycled column.
   {{siteUrl}}/horoscope.html

2. COMPATIBILITY \u2014 two charts, real synastry, shareable private link.
   {{siteUrl}}/compatibility.html

3. TRANSITS \u2014 what the sky is doing to YOUR chart right now.
   {{siteUrl}}/transits.html

Take one for a spin and hit reply with what surprised you.

\u2014 Astro Precise`},{id:"welcome-4",delay:"day 7",subject:"When you want the whole story, not just the highlights \u{1F319}",body:`The free chart gives you the map. Sometimes you want someone to actually read it.

That's the Deep Reading: a written interpretation of YOUR chart \u2014 Sun, Moon, Rising, dominant element and mode, tightest aspects, and what your transits are asking of you. A one-time PDF, yours to keep \u2014 {{deepReadingPrice}} when the shop is open.

ABOUT THE DEEP READING \u2192 {{siteUrl}}/chart.html#deep-reading

(If it's not open for purchase yet, you'll see an honest note \u2014 we never run a fake checkout.)

\u2014 Astro Precise`},{id:"welcome-5",delay:"day 10",subject:"Why I built this (and a small ask)",body:`Last email in the welcome series \u2014 so let me tell you why Astro Precise exists.

Most astrology apps want your birth data on their servers and a subscription on your card. I wanted the opposite: a real chart, computed in your browser. No account. No subscription. Your birth moment never leaves your device.

The small ask: reply and tell me one thing your chart got right about you. Real person here. I read every reply.

From now on: monthly cosmic weather \u2014 one email, the sky's main moves. Unsubscribe anytime.

\u2014 Astro Precise

P.S. Your wallpaper is one tap away on the chart page.`}],horoscopeSubscribe:[{id:"horoscope-daily-welcome",delay:"instant",tag:"tag_horoscope_daily",subject:"Your daily sky note \u2014 starting tomorrow \u2600\uFE0F",body:`You're on the daily list.

Each morning: a short note on what the live sky is doing \u2014 plain language, no jargon. Computed from real planetary positions, not a recycled column.

Preview anytime (free, no account): {{siteUrl}}/horoscope.html

Only your email was sent. Birth data stays in your browser.

\u2014 Astro Precise`},{id:"horoscope-monthly-welcome",delay:"instant",tag:"tag_horoscope_monthly",subject:"Your monthly outlook \u2014 first note soon \u{1F319}",body:`You're on the monthly list.

Once a month: a longer outlook for your sign \u2014 major transits, themes, dates to watch. Same honest astronomy as the free horoscope page.

Read this month's preview: {{siteUrl}}/horoscope.html

\u2014 Astro Precise`}],monthly:[{id:"cosmic-weather-monthly",cadence:"monthly",subject:"{{monthName}} cosmic weather \u2014 what the sky is stirring",body:`Hi \u2014

Here's {{monthName}} in one pass:

{{transitHighlight}}

(Pull this from the live transits page \u2014 keep it specific, never generic filler.)

See it on your chart, free: {{siteUrl}}/transits.html

Want the map reread in depth? The Deep Reading is {{deepReadingPrice}}, one-time: {{siteUrl}}/chart.html#deep-reading

\u2014 Astro Precise`}],reEngagement:[{id:"reengage-90d",trigger:"no open 90 days",subject:"Still want your cosmic weather?",body:`Haven't heard from you in a while \u2014 totally fine.

If you still want the occasional note on what the sky is doing (and one free tool nudge), click any link below and you'll stay on the list. Otherwise we'll stop emailing \u2014 no hard feelings.

Cast your chart again: {{siteUrl}}/chart.html
Today's transits: {{siteUrl}}/transits.html

\u2014 Astro Precise`}],postPurchase:[{id:"purchase-1",delay:"instant",subject:"It's yours \u2014 order confirmed \u{1F30C}",body:`Thank you \u2014 genuinely.

Your order is confirmed. Digital PDFs arrive within 24 hours; physical pieces ship when printed.

This was made for your chart and no one else's.

\u2014 Astro Precise`},{id:"purchase-2",delay:"day 3",subject:"Getting the most from your reading",body:`A few ways to use what you bought:

\u2192 Read once straight through, then again a week later.
\u2192 Cross-check with live transits: {{siteUrl}}/transits.html

Questions? Reply \u2014 I'll answer.

\u2014 Astro Precise`},{id:"purchase-3",delay:"day 14",subject:"How's it landing? (+ something for a friend)",body:`Two weeks in \u2014 how's the reading sitting with you?

Reply with a line of feedback if you have 20 seconds.

Know someone curious about their chart? Send them {{linksUrl}} \u2014 the chart tool is free.

\u2014 Astro Precise`},{id:"purchase-4",delay:"day 30",subject:"Your sky has moved \u2014 here's what's stirring",body:`{{transitHighlight}}

See it live: {{siteUrl}}/transits.html

When you're ready for another personalised piece \u2014 reading, poster, gift \u2014 it's one-time, no subscription.

\u2014 Astro Precise`}],automation:{trigger:"form submit \u2192 welcome-1 instant",spacing:"instant \xB7 day 2 \xB7 day 5 \xB7 day 7 \xB7 day 10",tags:{tag_chart:"chart page signup",tag_footer:"footer signup",tag_popup:"exit intent",tag_bio:"link-in-bio landing",tag_horoscope_daily:"horoscope daily",tag_horoscope_monthly:"horoscope monthly",tag_waitlist:"cosmic weather premium waitlist"},purchaseBranch:"buyer email \u2192 stop welcome \u2192 start postPurchase"}},xPosts:{rules:["Bio link only \u2014 "+r,"Screen recordings > text for chart demos","Ask a question in the last line to farm replies","No checkout links in posts until AP_MON URLs are live"],singles:[{id:"x-01",day:1,text:`If the only sign you know is your Sun, you've read one line of a whole book.

Cast the rest free (no account, in your browser) \u2192 {{linksUrl}}`},{id:"x-02",day:2,text:`A horoscope that reads one sign and ignores the actual sky is a fortune cookie.

Today's sky vs your sign \u2014 free \u2192 {{linksUrl}}`},{id:"x-03",day:3,text:`Astrology you can trust shouldn't need your birth time on someone's server.

We compute in-browser. Nothing uploaded. \u2192 {{linksUrl}}`},{id:"x-04",day:4,text:`Your chart isn't your sign. It's your sky \u2014 and it has never repeated.

See yours \u2192 {{linksUrl}}`},{id:"x-05",day:5,text:`The 3am-feelings sign isn't your Sun. It's your Moon.

What's yours? \u2192 {{linksUrl}}`},{id:"x-06",day:6,text:`Mercury never moves backward. The retrograde dates are still real.

Check the actual sky instead of the meme \u2192 {{linksUrl}}/transits.html`},{id:"x-07",day:7,text:`"I don't act like my sign" \u2014 because your sign is 1 of 10+ placements.

Full chart, 30 seconds \u2192 {{linksUrl}}`},{id:"x-08",day:8,text:`Wrong birth time by 2 hours = wrong Rising = wrong houses.

Do you know your birth time to the minute?`},{id:"x-09",day:9,text:`Compatibility isn't "are our Suns compatible."

It's two full charts overlaid. Run synastry free \u2192 {{linksUrl}}/compatibility.html`},{id:"x-10",day:10,text:`Make your lock screen the exact sky you were born under.

Cast \u2192 Save image \u2192 done. Free \u2192 {{linksUrl}}`},{id:"x-11",day:11,text:`Monthly cosmic weather for YOUR chart \u2014 one email, no birth data uploaded.

{{linksUrl}}`},{id:"x-12",day:12,text:`Free chart = the map. Deep Reading = someone reading it for you ({{deepReadingPrice}} when live).

Be first in line \u2192 {{linksUrl}}`},{id:"x-13",day:13,text:`POV: you cast your actual chart and can't un-see it.

Moon explains the feelings. Rising explains first impressions.

\u2192 {{linksUrl}}`},{id:"x-14",day:14,text:`Sun = who you are. Moon = how you feel. Rising = how you seem.

Big Three, free \u2192 {{linksUrl}}`}],threads:[{id:"thread-big-three",title:"Big Three in 4 posts",posts:[`Most "what's your sign?" talk stops at the Sun. Here's the other two thirds most people skip \u{1F9F5}`,`\u2609 SUN \u2014 core drive. The "what you're becoming."
\u263D MOON \u2014 inner weather. The "how you feel at 2am."
\u2191 RISING \u2014 first impression. The "vibe before you speak."`,"Same Sun, different Moon/Rising = two people who share a birthday sign but live in different inner worlds. That's why columns feel vague.",`All three are on your chart in ~30 seconds. No account. Computed in your browser.

{{linksUrl}}`]},{id:"thread-privacy",title:"Privacy angle",posts:[`I keep seeing astrology apps that want your birth time + email + payment details on day one.

We went the other way.`,"Astro Precise computes your chart entirely in-browser (VSOP87 ephemeris). Birth date, time, place never leave your device.","No account. No subscription wall on the chart. If you want more later \u2014 a reading, a poster \u2014 it's one-time.",`Try it: {{linksUrl}}

What would make you trust an astrology app?`]}],missionControlSingles:[{id:"mc-x-01",day:1,text:`FLIGHT READINESS: knowing only your Sun sign is like launching with one telemetry channel.

Moon = inner weather. Rising = first impression.

All three free \u2192 {{linksUrl}}`},{id:"mc-x-02",day:2,text:`PRECESSION ALERT: your magazine zodiac dates are ~2,000 years out of sync with the actual sky.

Real positions at your birth minute \u2192 {{linksUrl}}/chart.html`},{id:"mc-x-03",day:3,text:`LIVE TELEMETRY: a horoscope that ignores where the Moon actually is today is a fortune cookie.

Today's real sky \u2192 {{linksUrl}}/horoscope.html`},{id:"mc-x-04",day:4,text:`ZENITH STAR LOCK: one real named star was directly overhead at your birth place and minute.

Find yours (free) \u2192 {{linksUrl}}/ephemeris.html`},{id:"mc-x-05",day:5,text:`TELEMETRY NOTE: the 3am-feelings channel is your Moon \u2014 not your Sun.

What's yours? \u2192 {{linksUrl}}`},{id:"mc-x-06",day:6,text:`MERCURY STATUS: it never moves backward \u2014 but the station dates are real.

Verify live \u2192 {{linksUrl}}/transits.html`},{id:"mc-x-07",day:7,text:`GO/NO-GO on birth time: Rising shifts every ~2 hours. Wrong time = wrong houses.

Do you have your certificate?`},{id:"mc-x-08",day:8,text:`SATURN INGRESS: ~29-year orbit. The vibe is everyone's; the house it lands in is yours.

Check your chart \u2192 {{linksUrl}}/transits.html`},{id:"mc-x-09",day:9,text:`SYNASTRY OVERLAY: "are our Suns compatible" is a party trick.

Two full charts \u2192 {{linksUrl}}/compatibility.html`},{id:"mc-x-10",day:10,text:`T-MINUS to your birth minute: that planetary configuration never repeated.

Wind the orrery \u2192 {{linksUrl}}`},{id:"mc-x-11",day:11,text:`GROUND STATION: your birth data never leaves your device. Local compute only.

No account. No upload. \u2192 {{linksUrl}}`},{id:"mc-x-12",day:12,text:`Monthly cosmic weather for YOUR chart \u2014 one email. Only your address is ever sent.

{{linksUrl}}`},{id:"mc-x-13",day:13,text:`POV: Mission Control just downloaded your full chart.

Moon = 3am spiral. Rising = the misread. \u2192 {{linksUrl}}`},{id:"mc-x-14",day:14,text:`Mission Control for your sky.

\u2726 Real ephemeris
\u2726 In-browser compute
\u2726 Free chart \xB7 \xA312 reading \xB7 posters from \xA36

{{linksUrl}}`}],replyTemplates:[{id:"reply-transit",template:"Worth checking the actual station dates \u2014 Mercury's status changes on a schedule, not a vibe. I use live ephemeris for this."},{id:"reply-moon",template:'The Moon piece is huge \u2014 phase at birth + natal Moon sign explain a lot of the "why am I like this at night" stuff. Do you know your Moon sign?'},{id:"reply-rising",template:"If you only have a date (no birth time), Rising/houses are the first thing that's uncertain. Even a rough time window helps \u2014 did they ever try narrowing it?"},{id:"reply-compat",template:"Sun-sign memes are fun but synastry is overlaying both full charts \u2014 aspects between Venus/Mars/Moon usually tell the real story."},{id:"reply-question",template:"Curious \u2014 did you find that more true for relationships or career stuff? I've seen the same transit hit different houses completely differently."}]},vars:function(){var t=a.AP_MON||{};return{siteUrl:s,linksUrl:r,deepReadingPrice:t.deepReadingPrice||"\xA312",posterPrice:"\xA36",bundlePrice:"\xA316",monthName:new Date().toLocaleString("en-GB",{month:"long"}),transitHighlight:"{{transitHighlight}}"}},format:function(t,n){var e=Object.assign({},this.vars(),n||{});return l(t,e)},getEmail:function(t){var n=[].concat(this.emails.welcome).concat(this.emails.horoscopeSubscribe).concat(this.emails.monthly).concat(this.emails.reEngagement).concat(this.emails.postPurchase),e=n.filter(function(o){return o.id===t})[0];return e?{id:e.id,subject:this.format(e.subject),body:this.format(e.body),delay:e.delay,tag:e.tag}:null},getXPost:function(t){var n=this.xPosts.singles.filter(function(o){return o.id===t})[0];if(n)return{id:n.id,text:this.format(n.text)};var e=this.xPosts.threads.filter(function(o){return o.id===t})[0];return e?{id:e.id,title:e.title,posts:e.posts.map(function(o){return this.format(o)}.bind(this))}:null},exportAllEmails:function(){var t=this,n=["welcome","horoscopeSubscribe","monthly","reEngagement","postPurchase"],e=[];return n.forEach(function(o){(t.emails[o]||[]).forEach(function(i){e.push({section:o,id:i.id,subject:t.format(i.subject),body:t.format(i.body),delay:i.delay,tag:i.tag})})}),e}}})(typeof window<"u"?window:globalThis);
