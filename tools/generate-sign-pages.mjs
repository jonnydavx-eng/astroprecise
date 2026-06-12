#!/usr/bin/env node
/**
 * Generates the 12 per-sign landing pages (aries.html … pisces.html).
 * Run from repo root:  node website/tools/generate-sign-pages.mjs
 * Output: website/<sign>.html
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://jonnydavx-eng.github.io/astroprecise';

const SIGNS = [
  {
    key: 'aries', name: 'Aries', glyph: '♈', dates: 'March 21 – April 19',
    element: 'Fire', modality: 'Cardinal', ruler: 'Mars', symbol: 'The Ram',
    intro: `Aries is the first sign of the zodiac — the spark that begins the wheel. Ruled by Mars, the planet of drive and courage, Aries energy is direct, fast-moving, and unafraid of beginnings. Where others hesitate, Aries has already started. This is the sign of the pioneer: instinctive, competitive, and most alive at the moment of ignition.`,
    strengths: ['Courageous and decisive', 'Honest to the point of bluntness', 'Natural leadership instinct', 'Boundless initiating energy'],
    challenges: ['Impatience with slow processes', 'Acting before thinking', 'Difficulty finishing what was started', 'A temper that flares fast (and fades fast)'],
    love: `In love, Aries pursues. Attraction is immediate or it is nothing — this sign does not slowly warm to people. Aries partners are passionate, loyal once committed, and refreshingly free of games. The challenge is sustaining interest after the chase: an Aries needs a partner who remains a little bit unconquered.`,
    career: `Aries thrives wherever speed and nerve are rewarded: entrepreneurship, emergency medicine, sales, athletics, the military. Routine is this sign's slow poison. The ideal Aries role has a scoreboard, a deadline, and room to act without committee approval.`,
    matches: ['Leo', 'Sagittarius', 'Gemini'],
  },
  {
    key: 'taurus', name: 'Taurus', glyph: '♉', dates: 'April 20 – May 20',
    element: 'Earth', modality: 'Fixed', ruler: 'Venus', symbol: 'The Bull',
    intro: `Taurus is the zodiac's anchor — the sign that turns ideas into things you can touch. Ruled by Venus, Taurus moves slowly and deliberately, building comfort, beauty, and security that lasts. This is the most sensory sign of the twelve: food, music, touch, and the physical world are not distractions from life but its very substance.`,
    strengths: ['Unshakeable reliability', 'Patience that outlasts any obstacle', 'A natural eye for beauty and quality', 'Calm under pressure'],
    challenges: ['Stubbornness mistaken for principle', 'Resistance to necessary change', 'Possessiveness with people and things', 'Comfort that hardens into inertia'],
    love: `Taurus loves the way it does everything: slowly, thoroughly, and for keeps. This sign needs physical affection and demonstrated loyalty, not grand speeches. Once secure, a Taurus partner is the most steadfast in the zodiac — but betray that trust and the door closes without drama, permanently.`,
    career: `Taurus excels where persistence compounds: finance, agriculture, architecture, culinary arts, craftsmanship of every kind. This sign builds wealth the slow way and keeps it. The ideal role offers tangible results, fair pay, and freedom from constant reorganisation.`,
    matches: ['Virgo', 'Capricorn', 'Cancer'],
  },
  {
    key: 'gemini', name: 'Gemini', glyph: '♊', dates: 'May 21 – June 20',
    element: 'Air', modality: 'Mutable', ruler: 'Mercury', symbol: 'The Twins',
    intro: `Gemini is the zodiac's messenger — quick, curious, and permanently in motion between two points. Ruled by Mercury, this sign lives through language, connection, and the exchange of ideas. A Gemini mind runs several threads at once and is bored by anything that runs only one. Variety is not a preference; it is oxygen.`,
    strengths: ['Wit and verbal brilliance', 'Adaptability in any room', 'Genuine curiosity about everyone', 'Learning at extraordinary speed'],
    challenges: ['Scattered attention and unfinished projects', 'Restlessness mistaken for inconsistency', 'Talking around feelings instead of through them', 'A low boredom threshold'],
    love: `Gemini falls in love with minds first. Conversation is this sign's true intimacy — a partner who cannot keep up verbally will not keep a Gemini long. What Gemini offers is lightness, humour, and perpetual novelty; what it must learn is that depth requires staying when the conversation gets difficult.`,
    career: `Gemini belongs in the flow of information: journalism, teaching, marketing, translation, broadcasting, tech. Two careers at once is not unusual — it may be necessary. The ideal Gemini role changes weekly and involves talking to people who know things.`,
    matches: ['Libra', 'Aquarius', 'Aries'],
  },
  {
    key: 'cancer', name: 'Cancer', glyph: '♋', dates: 'June 21 – July 22',
    element: 'Water', modality: 'Cardinal', ruler: 'The Moon', symbol: 'The Crab',
    intro: `Cancer is the zodiac's keeper of the inner world — ruled by the Moon, the fastest-moving and most changeable body in the sky. This sign feels everything first and reasons about it later. Beneath the famous protective shell lives the most loyal heart in the zodiac, one that never forgets a kindness and never quite forgets a wound either.`,
    strengths: ['Profound emotional intelligence', 'Fierce loyalty to chosen people', 'An instinct for what others need', 'Tenacity that outlasts the confident'],
    challenges: ['Retreating into the shell instead of speaking', 'Moods that colour everything', 'Holding onto the past too tightly', 'Indirectness when hurt'],
    love: `Cancer loves by caring for people — feeding them, remembering things, building a home around them. This sign needs emotional safety before anything else can happen, and tests for it carefully. A secure Cancer is the warmest partner in the zodiac; an insecure one disappears sideways, like its symbol.`,
    career: `Cancer excels where care and intuition matter: medicine, psychology, hospitality, teaching, food, real estate, family business. This sign manages people well because it actually notices them. The ideal role offers emotional meaning and a team that feels like kin.`,
    matches: ['Scorpio', 'Pisces', 'Taurus'],
  },
  {
    key: 'leo', name: 'Leo', glyph: '♌', dates: 'July 23 – August 22',
    element: 'Fire', modality: 'Fixed', ruler: 'The Sun', symbol: 'The Lion',
    intro: `Leo is ruled by the Sun itself — the only sign governed by the centre of the solar system, and it shows. Leo energy is radiant, generous, and impossible to ignore. This is the sign of the performer and the sovereign: born knowing that life is a stage, and that the correct response to existence is to shine.`,
    strengths: ['Warmth that fills a room', 'Generosity without calculation', 'Courage in the spotlight', 'Loyalty that is genuinely royal'],
    challenges: ['A need for recognition that can run the show', 'Pride that resists apology', 'Drama where calm would serve', 'Difficulty sharing the stage'],
    love: `Leo loves grandly. Romance, for this sign, should involve actual romance — gestures, celebration, devotion declared out loud. In return Leo offers sunshine: fierce protection, big-hearted generosity, and a partner who makes ordinary life feel like an occasion. The lion only asks to be adored — and to never be ignored.`,
    career: `Leo flourishes wherever excellence is visible: entertainment, leadership, design, education, brand-building, anywhere with an audience. This sign does its finest work when given credit, autonomy, and an applause line. Management suits Leo — its natural style is generous command.`,
    matches: ['Aries', 'Sagittarius', 'Libra'],
  },
  {
    key: 'virgo', name: 'Virgo', glyph: '♍', dates: 'August 23 – September 22',
    element: 'Earth', modality: 'Mutable', ruler: 'Mercury', symbol: 'The Maiden',
    intro: `Virgo is the zodiac's craftsman — the sign that sees how things could be better, and then quietly makes them so. Ruled by Mercury in its analytical mode, Virgo perceives detail invisible to every other sign. Its devotion is practical: love expressed as help, care expressed as competence, idealism expressed as the patient repair of an imperfect world.`,
    strengths: ['Precision and discernment', 'Service without need for applause', 'Reliability in the details others miss', 'A mind that genuinely improves things'],
    challenges: ['Criticism — of self most of all', 'Perfectionism that delays completion', 'Worry as a background hum', 'Difficulty accepting help'],
    love: `Virgo shows love through acts: the errand done, the problem solved, the cup of tea at the exact right moment. Grand declarations embarrass this sign; consistent care is its native tongue. A Virgo partner notices everything — which means they noticed you completely, and chose you anyway. That is the compliment.`,
    career: `Virgo excels where precision is survival: medicine, editing, analysis, research, quality engineering, nutrition. This sign is the one who actually reads the documentation. The ideal Virgo role rewards craft over theatre and provides problems genuinely worth solving.`,
    matches: ['Taurus', 'Capricorn', 'Scorpio'],
  },
  {
    key: 'libra', name: 'Libra', glyph: '♎', dates: 'September 23 – October 22',
    element: 'Air', modality: 'Cardinal', ruler: 'Venus', symbol: 'The Scales',
    intro: `Libra is the only sign of the zodiac symbolised by an object — the scales — because its work is weighing. Ruled by Venus, Libra seeks harmony, beauty, and fairness with the persistence other signs reserve for ambition. This is the sign of the diplomat and the aesthete: convinced, correctly, that how things are done matters as much as what is done.`,
    strengths: ['Genuine fairness of mind', 'Charm that opens every door', 'An unteachable eye for beauty', 'Making others feel considered'],
    challenges: ['Indecision dressed as deliberation', 'Keeping the peace at personal cost', 'Dependence on partnership for direction', 'Avoiding necessary conflict'],
    love: `Libra is the zodiac's partner — this sign genuinely prefers life in twos, and brings to relationships a rare attention to balance: your needs weighed against mine, again and again, honestly. Romance with a Libra is elegant and considerate. The work is teaching them that disagreement is not the end of harmony but part of it.`,
    career: `Libra excels where judgment and grace combine: law, diplomacy, design, curation, HR, client relations. This sign negotiates better than it commands and beautifies whatever it manages. The ideal Libra role involves balancing competing interests — and an office that isn't ugly.`,
    matches: ['Gemini', 'Aquarius', 'Leo'],
  },
  {
    key: 'scorpio', name: 'Scorpio', glyph: '♏', dates: 'October 23 – November 21',
    element: 'Water', modality: 'Fixed', ruler: 'Pluto & Mars', symbol: 'The Scorpion',
    intro: `Scorpio is the zodiac's depth — the sign that refuses the surface of anything. Ruled by Pluto, planet of transformation, Scorpio is drawn to what is hidden: motives, mysteries, the truth under the polite version. This is the most intense sign of the twelve, possessed of a will that does not bend and an instinct for the real that cannot be deceived.`,
    strengths: ['Penetrating perception', 'Loyalty unto death', 'Willpower that regenerates from ruin', 'Fearlessness about the dark'],
    challenges: ['Suspicion as a default setting', 'The long memory of the wounded', 'Control disguised as protection', 'All-or-nothing in everything'],
    love: `Scorpio loves totally or not at all — there is no casual setting on this instrument. Intimacy for this sign means the removal of every mask, and it offers the same: to be loved by a Scorpio is to be seen completely. Trust builds slowly and shatters once. What it asks is everything; what it gives is everything.`,
    career: `Scorpio excels where depth and nerve are required: psychology, surgery, investigation, finance, crisis management, research. This sign does its best work underground — on problems others find too dark, too complex, or too dangerous. Power suits Scorpio; it should be earned honestly.`,
    matches: ['Cancer', 'Pisces', 'Virgo'],
  },
  {
    key: 'sagittarius', name: 'Sagittarius', glyph: '♐', dates: 'November 22 – December 21',
    element: 'Fire', modality: 'Mutable', ruler: 'Jupiter', symbol: 'The Archer',
    intro: `Sagittarius is the zodiac's arrow aimed at the horizon — ruled by Jupiter, the largest planet, and built to the same scale. This is the sign of the explorer and the philosopher: hungry for distance, meaning, and the next thing it doesn't yet understand. Sagittarian honesty is famous, its optimism contagious, and its suitcase always half-packed.`,
    strengths: ['Optimism with evidence or without', 'Honesty (whether requested or not)', 'A genuine philosophical mind', 'Courage to leap before the net appears'],
    challenges: ['Tactlessness in the name of truth', 'Commitment-shyness — to plans, places, people', 'Promising more than a calendar can hold', 'Restlessness that mistakes motion for progress'],
    love: `Sagittarius needs a co-adventurer, not a keeper. This sign loves with enthusiasm and humour and absolute candour — and bolts at the first scent of a cage. The partner who keeps a Sagittarius is the one who never tries to: shared freedom, shared journeys, and a home that feels like a base camp, not a terminus.`,
    career: `Sagittarius thrives at scale and at distance: travel, academia, publishing, law, international anything, outdoor work. Small rooms and small thinking suffocate this sign. The ideal role involves the big picture, frequent novelty, and a horizon that keeps receding.`,
    matches: ['Aries', 'Leo', 'Aquarius'],
  },
  {
    key: 'capricorn', name: 'Capricorn', glyph: '♑', dates: 'December 22 – January 19',
    element: 'Earth', modality: 'Cardinal', ruler: 'Saturn', symbol: 'The Sea-Goat',
    intro: `Capricorn is the zodiac's mountain climber — ruled by Saturn, the planet of time, discipline, and earned things. This sign plays the long game by instinct: while others sprint and stall, Capricorn ascends at a pace it can sustain for decades. Beneath the dry wit and the serious surface is the most quietly determined sign of the twelve.`,
    strengths: ['Discipline that needs no audience', 'Ambition with a realistic map', 'Dry, surprising humour', 'Responsibility carried without complaint'],
    challenges: ['Work as the answer to every question', 'Pessimism worn as realism', 'Difficulty resting without guilt', 'Withholding feelings to stay in control'],
    love: `Capricorn courts the way it builds: slowly, seriously, with intent to last. This sign distrusts fireworks and trusts demonstrated character — show up on time, keep your word, and mean it. Beneath the reserve is deep loyalty and an unexpectedly tender heart that only fully appears once the foundation is proven safe.`,
    career: `Capricorn is the zodiac's executive: management, finance, government, engineering, any field with a ladder worth climbing. Authority sits naturally on this sign because it does the work first. The ideal Capricorn role has clear advancement, real responsibility, and results that compound.`,
    matches: ['Taurus', 'Virgo', 'Scorpio'],
  },
  {
    key: 'aquarius', name: 'Aquarius', glyph: '♒', dates: 'January 20 – February 18',
    element: 'Air', modality: 'Fixed', ruler: 'Uranus & Saturn', symbol: 'The Water-Bearer',
    intro: `Aquarius is the zodiac's lightning rod — ruled by Uranus, planet of revolution and the unexpected. This sign thinks in systems and futures, loves humanity at scale, and guards its individuality like a founding principle. The Aquarian paradox: the most communal sign of the zodiac is also the most stubbornly, proudly unlike anyone else.`,
    strengths: ['Original thinking, genuinely original', 'Loyalty to friends and to principles', 'Vision that arrives a decade early', 'Calm detachment in any storm'],
    challenges: ['Detachment that reads as coldness', 'Contrarianism for its own sake', 'Living in the future at the expense of the present', 'Intellectualising feelings instead of feeling them'],
    love: `Aquarius must be befriended before it can be loved — this sign's deepest romances begin as conversations between equals. It offers a partner total acceptance of their strangeness and expects the same. Possessiveness kills it instantly. Freedom, ideas, and a shared cause keep an Aquarian heart for life.`,
    career: `Aquarius belongs at the frontier: science, technology, social innovation, aviation, activism, anything that did not exist twenty years ago. This sign improves systems by refusing to accept them. The ideal role offers intellectual freedom, a mission, and colleagues who can keep up.`,
    matches: ['Gemini', 'Libra', 'Sagittarius'],
  },
  {
    key: 'pisces', name: 'Pisces', glyph: '♓', dates: 'February 19 – March 20',
    element: 'Water', modality: 'Mutable', ruler: 'Neptune & Jupiter', symbol: 'The Fishes',
    intro: `Pisces is the zodiac's last sign — and carries something of all eleven before it. Ruled by Neptune, planet of dreams and dissolution, Pisces lives with thin boundaries between self and world, real and imagined, this life and something larger. This is the sign of the mystic and the artist: the most compassionate of the twelve, and the most easily lost.`,
    strengths: ['Compassion without conditions', 'Imagination as a natural element', 'Intuition bordering on telepathy', 'Adaptability to any current'],
    challenges: ['Escapism when reality presses', 'Boundaries — locating, then defending them', 'Absorbing every mood in the room', 'Martyrdom mistaken for love'],
    love: `Pisces loves the way the sea loves the shore — totally, surrounding, without conditions. This sign offers a kind of acceptance most people have never experienced, and asks for tenderness in return. The danger is dissolution: a Pisces in love can forget where they end and the beloved begins. The right partner holds the boundary kindly.`,
    career: `Pisces flourishes where imagination and empathy are the actual job: arts, music, film, healing professions, spiritual care, marine work. Rigid structures drain this sign; flow states sustain it. The ideal Piscean role serves something larger than profit and leaves room to dream.`,
    matches: ['Cancer', 'Scorpio', 'Taurus'],
  },
];

const SIGN_LIST = SIGNS.map(s => ({ key: s.key, name: s.name, glyph: s.glyph }));

function navLinks(activeKey) {
  return `
          <a href="index.html" class="navbar__link">Home</a>
          <a href="chart.html" class="navbar__link">Chart</a>
          <a href="ephemeris.html" class="navbar__link">Instrument</a>
          <a href="horoscope.html" class="navbar__link">Horoscope</a>
          <a href="compatibility.html" class="navbar__link">Compatibility</a>
          <a href="transits.html" class="navbar__link">Transits</a>
          <a href="profile.html" class="navbar__link">Profile</a>`;
}

function page(s) {
  const others = SIGN_LIST.filter(o => o.key !== s.key);
  const title = `${s.name} Horoscope Today — Daily Reading & Sign Guide | AstroPrecise`;
  const desc = `Free ${s.name} horoscope for today, calculated from real planetary positions. Plus the complete ${s.name} guide: element, ruling planet, love, career, and compatibility.`;
  const url = `${BASE_URL}/${s.key}.html`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${s.name} Horoscope Today`,
    description: desc,
    url,
    publisher: { '@type': 'Organization', name: 'AstroPrecise', url: BASE_URL },
    about: { '@type': 'Thing', name: `${s.name} (astrology)` },
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What are the ${s.name} zodiac dates?`,
        acceptedAnswer: { '@type': 'Answer', text: `${s.name} season runs ${s.dates}. People born in this window have their Sun in ${s.name}.` },
      },
      {
        '@type': 'Question',
        name: `What element and ruling planet is ${s.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `${s.name} is a ${s.element} sign of the ${s.modality} modality, ruled by ${s.ruler}. Its symbol is ${s.symbol}.` },
      },
      {
        '@type': 'Question',
        name: `Which signs are most compatible with ${s.name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `${s.name} is traditionally most compatible with ${s.matches.join(', ')}. Full synastry depends on the complete birth charts of both people, not Sun signs alone.` },
      },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${desc}" />
  <title>${title}</title>
  <link rel="canonical" href="${url}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <link rel="manifest" href="manifest.json" />
  <link rel="icon" type="image/svg+xml" href="img/favicon.svg" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="AstroPrecise" />
  <meta property="og:title" content="${s.name} Horoscope Today | AstroPrecise" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE_URL}/img/og-banner.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${s.name} Horoscope Today | AstroPrecise" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${BASE_URL}/img/og-banner.png" />
  <meta name="theme-color" content="#090b16" />
  <link rel="stylesheet" href="css/main.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
  <style>
    .sign-hero { text-align: center; padding: var(--space-16) var(--space-4) var(--space-10); position: relative; z-index: 1; }
    .sign-hero__glyph { font-size: 4.5rem; line-height: 1; display: block; margin-bottom: var(--space-4);
      background: linear-gradient(180deg, #f2dfa7 0%, #c4920a 60%, #8c6a2f 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 18px rgba(196,146,10,0.4)); }
    .sign-hero h1 { font-family: var(--font-display); font-size: clamp(2.4rem, 6vw, 3.6rem); color: var(--color-white); margin-bottom: var(--space-2); }
    .sign-hero__dates { color: var(--color-gold); font-size: var(--text-sm); letter-spacing: 0.14em; text-transform: uppercase; }
    .sign-facts { display: flex; justify-content: center; gap: var(--space-6); flex-wrap: wrap; margin-top: var(--space-6); }
    .sign-fact { text-align: center; }
    .sign-fact__label { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-silver-dim); display: block; margin-bottom: 4px; }
    .sign-fact__value { font-family: var(--font-display); color: var(--color-gold-pale); font-size: var(--text-base); }
    .today-reading { max-width: 760px; margin: 0 auto; }
    .trait-cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); max-width: 760px; margin: 0 auto; }
    @media (max-width: 640px) { .trait-cols { grid-template-columns: 1fr; } }
    .trait-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
    .trait-list li { font-size: var(--text-sm); color: var(--color-silver); line-height: 1.6; padding-left: var(--space-5); position: relative; }
    .trait-list li::before { position: absolute; left: 0; }
    .trait-list--plus li::before { content: '✦'; color: var(--color-gold); }
    .trait-list--minus li::before { content: '◆'; color: var(--crimson-light, #b04a52); }
    .prose-block { max-width: 760px; margin: 0 auto; color: var(--color-silver); line-height: 1.85; font-size: var(--text-base); }
    .match-chips { display: flex; gap: var(--space-3); flex-wrap: wrap; justify-content: center; margin-top: var(--space-5); }
    .other-signs { display: flex; flex-wrap: wrap; gap: var(--space-2); justify-content: center; }
    .other-signs a { font-size: var(--text-xs); letter-spacing: 0.08em; padding: 6px 14px; border: 1px solid var(--color-border); border-radius: 999px;
      color: var(--color-silver-dim); text-decoration: none; transition: border-color .2s, color .2s; }
    .other-signs a:hover { border-color: var(--color-gold); color: var(--color-gold-pale); }
  </style>
</head>
<body data-element="${s.element.toLowerCase()}">
  <canvas id="starfield-canvas" class="starfield-canvas" aria-hidden="true" style="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0.5;"></canvas>

  <header class="site-header" role="banner">
    <nav class="navbar" aria-label="Main navigation">
      <div class="navbar__inner">
        <a href="index.html" class="navbar__logo" aria-label="AstroPrecise home">
          <div class="navbar__logo-icon" aria-hidden="true"><img src="img/logo.svg" alt="" width="32" height="32" /></div>
          <span class="logo-text">AstroPrecise</span>
        </a>
        <div class="navbar__nav">${navLinks(s.key)}
        </div>
        <button class="navbar__toggle" id="nav-toggle" aria-controls="nav-mobile-menu" aria-expanded="false" aria-label="Toggle navigation menu">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="navbar__mobile-menu" id="nav-mobile-menu" role="dialog" aria-label="Mobile navigation">${navLinks(s.key)}
      </div>
    </nav>
  </header>

  <main id="main-content">

    <section class="sign-hero" aria-labelledby="page-title">
      <span class="sign-hero__glyph" aria-hidden="true">${s.glyph}</span>
      <h1 id="page-title">${s.name}</h1>
      <p class="sign-hero__dates">${s.dates}</p>
      <div class="sign-facts">
        <div class="sign-fact"><span class="sign-fact__label">Element</span><span class="sign-fact__value">${s.element}</span></div>
        <div class="sign-fact"><span class="sign-fact__label">Modality</span><span class="sign-fact__value">${s.modality}</span></div>
        <div class="sign-fact"><span class="sign-fact__label">Ruler</span><span class="sign-fact__value">${s.ruler}</span></div>
        <div class="sign-fact"><span class="sign-fact__label">Symbol</span><span class="sign-fact__value">${s.symbol}</span></div>
      </div>
    </section>

    <section class="section" aria-labelledby="today-heading">
      <div class="container">
        <h2 class="section__title" id="today-heading">${s.name} Horoscope Today</h2>
        <p class="section__subtitle" id="today-date" aria-live="polite"></p>
        <div class="today-reading" id="today-reading" aria-live="polite">
          <div class="card" style="padding:var(--space-8);">
            <p style="color:var(--color-silver);line-height:1.85;">
              Today's ${s.name} reading is calculated in your browser from real planetary positions.
              If this text remains, enable JavaScript to see your personalised daily guidance —
              or read the complete ${s.name} profile below.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="about-heading">
      <div class="container">
        <h2 class="section__title" id="about-heading">About ${s.name}</h2>
        <p class="prose-block">${s.intro}</p>
      </div>
    </section>

    <section class="section" aria-labelledby="traits-heading">
      <div class="container">
        <h2 class="section__title" id="traits-heading">${s.name} Strengths &amp; Challenges</h2>
        <div class="trait-cols">
          <div>
            <h3 style="font-family:var(--font-display);color:var(--color-gold-pale);margin-bottom:var(--space-4);">Strengths</h3>
            <ul class="trait-list trait-list--plus">
              ${s.strengths.map(t => `<li>${t}</li>`).join('\n              ')}
            </ul>
          </div>
          <div>
            <h3 style="font-family:var(--font-display);color:var(--color-gold-pale);margin-bottom:var(--space-4);">Challenges</h3>
            <ul class="trait-list trait-list--minus">
              ${s.challenges.map(t => `<li>${t}</li>`).join('\n              ')}
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="love-heading">
      <div class="container">
        <h2 class="section__title" id="love-heading">${s.name} in Love</h2>
        <p class="prose-block">${s.love}</p>
        <div class="match-chips">
          ${s.matches.map(m => `<a class="btn btn--outline btn--sm" href="compatibility.html">Best match: ${m} →</a>`).join('\n          ')}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="career-heading">
      <div class="container">
        <h2 class="section__title" id="career-heading">${s.name} Career &amp; Purpose</h2>
        <p class="prose-block">${s.career}</p>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="cta-heading">
      <div class="container" style="text-align:center;">
        <h2 class="section__title" id="cta-heading">Your Sun sign is one of dozens of placements</h2>
        <p class="section__subtitle">Your Moon, Rising, and every planet shape who you are. Calculate your complete birth chart — free, private, in your browser.</p>
        <a href="chart.html" class="btn btn--primary btn--lg" style="margin-top:var(--space-4);">✦ &nbsp;Calculate My Birth Chart</a>
      </div>
    </section>

    <section class="section" aria-label="Other zodiac signs">
      <div class="container">
        <h2 class="section__title" style="font-size:var(--text-lg);">All Zodiac Signs</h2>
        <div class="other-signs">
          ${others.map(o => `<a href="${o.key}.html">${o.glyph} ${o.name}</a>`).join('\n          ')}
        </div>
      </div>
    </section>

  </main>

  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p>&copy; 2025 AstroPrecise · All calculations run locally in your browser · No data collected</p>
      </div>
    </div>
  </footer>

  <script src="js/cosmos.js"></script>
  <script src="js/interpretations.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/app.js"></script>
  <script src="js/effects.js"></script>
  <script>
  (function() {
    'use strict';
    var dateEl = document.getElementById('today-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    function render() {
      if (!window.Interpretations || typeof Interpretations.getDailyHoroscope !== 'function') {
        setTimeout(render, 200); return;
      }
      var d = Interpretations.getDailyHoroscope('${s.name}', new Date());
      var el = document.getElementById('today-reading');
      if (!el || !d) return;
      el.innerHTML =
        '<div class="card" style="padding:var(--space-8);">' +
        '<p style="color:var(--color-silver);line-height:1.85;font-size:1.05rem;margin-bottom:var(--space-6);">' + d.overview + '</p>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--space-4);margin-bottom:var(--space-5);">' +
        '<div style="padding:var(--space-4);background:rgba(42,74,148,0.08);border:1px solid rgba(91,127,199,0.2);border-radius:var(--radius-lg);">' +
        '<p style="font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-primary-light);margin-bottom:6px;">♥ Love</p>' +
        '<p style="font-size:var(--text-sm);color:var(--color-silver);line-height:1.65;">' + d.love + '</p></div>' +
        '<div style="padding:var(--space-4);background:rgba(42,74,148,0.08);border:1px solid rgba(91,127,199,0.2);border-radius:var(--radius-lg);">' +
        '<p style="font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-primary-light);margin-bottom:6px;">⬡ Career</p>' +
        '<p style="font-size:var(--text-sm);color:var(--color-silver);line-height:1.65;">' + d.career + '</p></div>' +
        '<div style="padding:var(--space-4);background:rgba(42,74,148,0.08);border:1px solid rgba(91,127,199,0.2);border-radius:var(--radius-lg);">' +
        '<p style="font-size:0.6rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--color-primary-light);margin-bottom:6px;">✦ Wellness</p>' +
        '<p style="font-size:var(--text-sm);color:var(--color-silver);line-height:1.65;">' + d.health + '</p></div>' +
        '</div>' +
        '<div style="display:flex;gap:var(--space-6);flex-wrap:wrap;font-size:var(--text-sm);color:var(--color-silver-dim);">' +
        '<span>Lucky Number <strong style="color:var(--color-gold);">' + d.luckyNumber + '</strong></span>' +
        '<span>Lucky Color <strong style="color:var(--color-gold);">' + d.luckyColor + '</strong></span>' +
        '</div></div>';
    }
    render();
  })();
  </script>
</body>
</html>
`;
}

for (const s of SIGNS) {
  const html = page(s);
  writeFileSync(join(OUT_DIR, `${s.key}.html`), html);
  console.log(`wrote ${s.key}.html (${(html.length / 1024).toFixed(1)} KB)`);
}
console.log('done — 12 sign pages generated');
