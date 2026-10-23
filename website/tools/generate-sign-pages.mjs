#!/usr/bin/env node
/**
 * Generates the 12 per-sign landing pages (aries.html … pisces.html).
 * Run from repo root:  node website/tools/generate-sign-pages.mjs
 * Output: website/<sign>.html   (--out <dir> writes elsewhere, e.g. to diff)
 * Paper & Night light shell: body.ap-next + css/ap-next.css + css/sign-next.css.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CONSTELLATIONS } from './constellations.mjs';

const OUT_ARG = process.argv.indexOf('--out');
const OUT_DIR = OUT_ARG > -1 && process.argv[OUT_ARG + 1]
  ? process.argv[OUT_ARG + 1]
  : join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://astroprecise.app';
// Release pin: read from js/ap-asset-v.js so the ?v= pins never drift from the release.
const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSET_V = readFileSync(join(SITE_DIR, 'js', 'ap-asset-v.js'), 'utf8').match(/AP_ASSET_V\s*=\s*'(\d+)'/)[1];

const SIGNS = [
  {
    key: 'aries', name: 'Aries', glyph: '♈', dates: 'March 21 – April 19',
    element: 'Fire', modality: 'Cardinal', ruler: 'Mars', symbol: 'The Ram',
    polarity: 'Masculine / Yang', bodyPart: 'The head and face', tarot: 'The Emperor', keyword: 'I am',
    intro: `Aries is the first sign of the zodiac — the spark that begins the wheel. Ruled by Mars, the planet of drive and courage, Aries energy is direct, fast-moving, and unafraid of beginnings. Where others hesitate, Aries has already started. This is the sign of the pioneer: instinctive, competitive, and most alive at the moment of ignition.`,
    strengths: ['Courageous and decisive', 'Honest to the point of bluntness', 'Natural leadership instinct', 'Boundless initiating energy'],
    challenges: ['Impatience with slow processes', 'Acting before thinking', 'Difficulty finishing what was started', 'A temper that flares fast (and fades fast)'],
    love: `In love, Aries pursues. Attraction is immediate or it is nothing — this sign does not slowly warm to people. Aries partners are passionate, loyal once committed, and refreshingly free of games. The challenge is sustaining interest after the chase: an Aries needs a partner who remains a little bit unconquered.`,
    career: `Aries thrives wherever speed and nerve are rewarded: entrepreneurship, emergency medicine, sales, athletics, the military. Routine is this sign's slow poison. The ideal Aries role has a scoreboard, a deadline, and room to act without committee approval.`,
    friendship: `As a friend, Aries is the one who turns a quiet evening into an adventure and shows up first when there is trouble. This sign is fiercely protective and allergic to passive-aggression — say what you mean and an Aries will respect you for it. They lead the group, plan the trip, and start the dare, but the deepest loyalty they offer is simple: they will always have your back in a fight.`,
    shadow: `The Aries shadow is the self that must win — even when there is nothing real to win. Unexamined, the drive curdles into aggression, the impatience into selfishness, and the courage into recklessness that leaves others to clean up. The growth edge is learning that not every disagreement is a battle, that patience is a form of strength, and that the bravest act is sometimes to wait.`,
    growth: `The inner path for Aries is from impulse to intention — channelling raw fire into a purpose larger than the next conquest. This sign grows by finishing what it starts, by letting others move at their own speed, and by discovering that real courage includes the courage to be vulnerable. When Aries learns to lead for the group rather than the glory, the pioneer becomes the protector.`,
    matches: ['Leo', 'Sagittarius', 'Gemini'],
  },
  {
    key: 'taurus', name: 'Taurus', glyph: '♉', dates: 'April 20 – May 20',
    element: 'Earth', modality: 'Fixed', ruler: 'Venus', symbol: 'The Bull',
    polarity: 'Feminine / Yin', bodyPart: 'The neck and throat', tarot: 'The Hierophant', keyword: 'I have',
    intro: `Taurus is the zodiac's anchor — the sign that turns ideas into things you can touch. Ruled by Venus, Taurus moves slowly and deliberately, building comfort, beauty, and security that lasts. This is the most sensory sign of the twelve: food, music, touch, and the physical world are not distractions from life but its very substance.`,
    strengths: ['Unshakeable reliability', 'Patience that outlasts any obstacle', 'A natural eye for beauty and quality', 'Calm under pressure'],
    challenges: ['Stubbornness mistaken for principle', 'Resistance to necessary change', 'Possessiveness with people and things', 'Comfort that hardens into inertia'],
    love: `Taurus loves the way it does everything: slowly, thoroughly, and for keeps. This sign needs physical affection and demonstrated loyalty, not grand speeches. Once secure, a Taurus partner is the most steadfast in the zodiac — but betray that trust and the door closes without drama, permanently.`,
    career: `Taurus excels where persistence compounds: finance, agriculture, architecture, culinary arts, craftsmanship of every kind. This sign builds wealth the slow way and keeps it. The ideal role offers tangible results, fair pay, and freedom from constant reorganisation.`,
    friendship: `A Taurus friend is the dependable one — the person who remembers your birthday, hosts the good dinners, and is still there a decade later. This sign offers comfort in the most literal sense: a warm home, real food, and a presence that asks nothing of you but your company. Slow to let people in, a Taurus who calls you a friend means it for life, and will quietly carry you through the hard seasons without ever making it a performance.`,
    shadow: `The Taurus shadow is the grip that will not loosen — clinging to possessions, routines, grudges, and people long after they have stopped serving. Comfort becomes a cage; stubbornness hardens into refusal; the love of security turns into a fear of any change at all. The growth edge is learning that not everything worth keeping can be held, and that some doors only open if you are willing to put something down.`,
    growth: `The inner path for Taurus is from having to being — discovering that the security it craves was never in the bank balance or the possessions but in its own steadiness. This sign grows by loosening its grip, welcoming the change it instinctively resists, and trusting that abundance flows rather than accumulates. When Taurus learns that it can rebuild whatever it loses, the fear that drives the hoarding finally quiets.`,
    matches: ['Virgo', 'Capricorn', 'Cancer'],
  },
  {
    key: 'gemini', name: 'Gemini', glyph: '♊', dates: 'May 21 – June 20',
    element: 'Air', modality: 'Mutable', ruler: 'Mercury', symbol: 'The Twins',
    polarity: 'Masculine / Yang', bodyPart: 'The hands, arms and lungs', tarot: 'The Lovers', keyword: 'I think',
    intro: `Gemini is the zodiac's messenger — quick, curious, and permanently in motion between two points. Ruled by Mercury, this sign lives through language, connection, and the exchange of ideas. A Gemini mind runs several threads at once and is bored by anything that runs only one. Variety is not a preference; it is oxygen.`,
    strengths: ['Wit and verbal brilliance', 'Adaptability in any room', 'Genuine curiosity about everyone', 'Learning at extraordinary speed'],
    challenges: ['Scattered attention and unfinished projects', 'Restlessness mistaken for inconsistency', 'Talking around feelings instead of through them', 'A low boredom threshold'],
    love: `Gemini falls in love with minds first. Conversation is this sign's true intimacy — a partner who cannot keep up verbally will not keep a Gemini long. What Gemini offers is lightness, humour, and perpetual novelty; what it must learn is that depth requires staying when the conversation gets difficult.`,
    career: `Gemini belongs in the flow of information: journalism, teaching, marketing, translation, broadcasting, tech. Two careers at once is not unusual — it may be necessary. The ideal Gemini role changes weekly and involves talking to people who know things.`,
    friendship: `A Gemini friend is the most entertaining person in your contacts — the one who sends the funny link at midnight, knows a little about everything, and can talk to anyone at the party. This sign collects people generously and connects them to each other, acting as the social switchboard of any group. The work for a Gemini friendship is depth: staying present through the unglamorous parts, not just the sparkling ones, and remembering that some friends need your attention more than your wit.`,
    shadow: `The Gemini shadow lives in the gap between the two twins — the part that talks instead of feels, scatters instead of commits, and uses cleverness to avoid the things it does not want to face. Restlessness becomes flightiness; charm becomes a mask; the famous duality splits into a self that says one thing and does another. The growth edge is integration: letting the two voices become one honest one.`,
    growth: `The inner path for Gemini is from information to wisdom — learning that knowing a little about everything is not the same as understanding anything deeply. This sign grows by finishing what it starts, by sitting with a single subject long enough for it to take root, and by turning its restless attention inward to hear what it actually feels. When Gemini stops fleeing into the next distraction, the scattered brilliance becomes real insight.`,
    matches: ['Libra', 'Aquarius', 'Aries'],
  },
  {
    key: 'cancer', name: 'Cancer', glyph: '♋', dates: 'June 21 – July 22',
    element: 'Water', modality: 'Cardinal', ruler: 'The Moon', symbol: 'The Crab',
    polarity: 'Feminine / Yin', bodyPart: 'The chest and stomach', tarot: 'The Chariot', keyword: 'I feel',
    intro: `Cancer is the zodiac's keeper of the inner world — ruled by the Moon, the fastest-moving and most changeable body in the sky. This sign feels everything first and reasons about it later. Beneath the famous protective shell lives the most loyal heart in the zodiac, one that never forgets a kindness and never quite forgets a wound either.`,
    strengths: ['Profound emotional intelligence', 'Fierce loyalty to chosen people', 'An instinct for what others need', 'Tenacity that outlasts the confident'],
    challenges: ['Retreating into the shell instead of speaking', 'Moods that colour everything', 'Holding onto the past too tightly', 'Indirectness when hurt'],
    love: `Cancer loves by caring for people — feeding them, remembering things, building a home around them. This sign needs emotional safety before anything else can happen, and tests for it carefully. A secure Cancer is the warmest partner in the zodiac; an insecure one disappears sideways, like its symbol.`,
    career: `Cancer excels where care and intuition matter: medicine, psychology, hospitality, teaching, food, real estate, family business. This sign manages people well because it actually notices them. The ideal role offers emotional meaning and a team that feels like kin.`,
    friendship: `A Cancer friend is the one who makes you soup when you are sick and remembers the anniversary of your hard days. This sign builds friendship like a home — slowly, and meant to last — and folds the people it loves into a chosen family. A Cancer notices the small shift in your voice before you have said anything is wrong. In return it asks only to be needed, and to be reassured, now and then, that it has not been forgotten.`,
    shadow: `The Cancer shadow lives in the shell — the part that withdraws instead of speaks, sulks instead of asks, and uses care as a quiet form of control. Old wounds are rehearsed until they calcify; moods become weather everyone else must navigate; the past is clutched so tightly there is no room for the present. The growth edge is direct vulnerability: saying the need out loud rather than testing whether others can guess it.`,
    growth: `The inner path for Cancer is from self-protection to self-trust — learning that the shell was built for a younger, more fragile self and can now be opened by choice. This sign grows by feeling its emotions without being ruled by them, by releasing a past it cannot change, and by mothering itself as tenderly as it mothers everyone else. When Cancer feels safe from the inside, the retreating crab finally stops needing to hide.`,
    matches: ['Scorpio', 'Pisces', 'Taurus'],
  },
  {
    key: 'leo', name: 'Leo', glyph: '♌', dates: 'July 23 – August 22',
    element: 'Fire', modality: 'Fixed', ruler: 'The Sun', symbol: 'The Lion',
    polarity: 'Masculine / Yang', bodyPart: 'The heart and spine', tarot: 'Strength', keyword: 'I will',
    intro: `Leo is ruled by the Sun itself — the only sign governed by the centre of the solar system, and it shows. Leo energy is radiant, generous, and impossible to ignore. This is the sign of the performer and the sovereign: born knowing that life is a stage, and that the correct response to existence is to shine.`,
    strengths: ['Warmth that fills a room', 'Generosity without calculation', 'Courage in the spotlight', 'Loyalty that is genuinely royal'],
    challenges: ['A need for recognition that can run the show', 'Pride that resists apology', 'Drama where calm would serve', 'Difficulty sharing the stage'],
    love: `Leo loves grandly. Romance, for this sign, should involve actual romance — gestures, celebration, devotion declared out loud. In return Leo offers sunshine: fierce protection, big-hearted generosity, and a partner who makes ordinary life feel like an occasion. The lion only asks to be adored — and to never be ignored.`,
    career: `Leo flourishes wherever excellence is visible: entertainment, leadership, design, education, brand-building, anywhere with an audience. This sign does its finest work when given credit, autonomy, and an applause line. Management suits Leo — its natural style is generous command.`,
    friendship: `A Leo friend is the warmest, most generous person in your circle — the one who throws you the party, champions you loudly to anyone who will listen, and makes you feel like the most interesting person in the room. This sign is intensely loyal and takes real pride in its friends' wins. The only thing a Leo cannot forgive is being taken for granted: give the lion genuine appreciation and it will give you the sun in return.`,
    shadow: `The Leo shadow is the ego that mistakes attention for love — the part that performs instead of connects, dominates the stage instead of sharing it, and lets pride harden into an inability to ever say sorry. When the applause fades, an unexamined Leo can feel as though it has disappeared. The growth edge is learning that worth is not granted by an audience, and that the most royal act is to lift others into the light.`,
    growth: `The inner path for Leo is from being seen to being whole — discovering a sense of self that does not depend on the room's approval. This sign grows by giving credit away, by tolerating the discomfort of not being centre stage, and by learning to apologise without feeling diminished. When Leo shines to warm others rather than to be watched, the performer becomes the genuine leader it was always meant to be.`,
    matches: ['Aries', 'Sagittarius', 'Libra'],
  },
  {
    key: 'virgo', name: 'Virgo', glyph: '♍', dates: 'August 23 – September 22',
    element: 'Earth', modality: 'Mutable', ruler: 'Mercury', symbol: 'The Maiden',
    polarity: 'Feminine / Yin', bodyPart: 'The digestive system', tarot: 'The Hermit', keyword: 'I analyse',
    intro: `Virgo is the zodiac's craftsman — the sign that sees how things could be better, and then quietly makes them so. Ruled by Mercury in its analytical mode, Virgo perceives detail invisible to every other sign. Its devotion is practical: love expressed as help, care expressed as competence, idealism expressed as the patient repair of an imperfect world.`,
    strengths: ['Precision and discernment', 'Service without need for applause', 'Reliability in the details others miss', 'A mind that genuinely improves things'],
    challenges: ['Criticism — of self most of all', 'Perfectionism that delays completion', 'Worry as a background hum', 'Difficulty accepting help'],
    love: `Virgo shows love through acts: the errand done, the problem solved, the cup of tea at the exact right moment. Grand declarations embarrass this sign; consistent care is its native tongue. A Virgo partner notices everything — which means they noticed you completely, and chose you anyway. That is the compliment.`,
    career: `Virgo excels where precision is survival: medicine, editing, analysis, research, quality engineering, nutrition. This sign is the one who actually reads the documentation. The ideal Virgo role rewards craft over theatre and provides problems genuinely worth solving.`,
    friendship: `A Virgo friend is the one who actually helps — who drives you to the appointment, proofreads the email, and remembers the practical detail you forgot. This sign shows up with competence rather than fanfare, and its quiet attention means it knows you better than the louder friends do. A Virgo can be sparing with praise but its loyalty is shown in a thousand small, useful acts. Earn its trust and you have a friend who will quietly hold your life together.`,
    shadow: `The Virgo shadow is the inner critic that never rests — the voice that finds the flaw in everything, including the self, and mistakes relentless judgment for high standards. Service becomes self-erasure; worry becomes a way of life; the pursuit of perfect becomes the enemy of done. The growth edge is self-compassion: learning that a thing can be good enough, that help can be received, and that the world does not need fixing to be worthy of love.`,
    growth: `The inner path for Virgo is from perfection to wholeness — accepting that the cracks are where the meaning lives, and that being of service does not require being flawless. This sign grows by quieting the critic, by letting others care for it, and by trusting that its worth was never contingent on getting everything right. When Virgo offers itself the same patient kindness it offers the world, the anxious helper finds peace.`,
    matches: ['Taurus', 'Capricorn', 'Scorpio'],
  },
  {
    key: 'libra', name: 'Libra', glyph: '♎', dates: 'September 23 – October 22',
    element: 'Air', modality: 'Cardinal', ruler: 'Venus', symbol: 'The Scales',
    polarity: 'Masculine / Yang', bodyPart: 'The kidneys and lower back', tarot: 'Justice', keyword: 'I balance',
    intro: `Libra is the only sign of the zodiac symbolised by an object — the scales — because its work is weighing. Ruled by Venus, Libra seeks harmony, beauty, and fairness with the persistence other signs reserve for ambition. This is the sign of the diplomat and the aesthete: convinced, correctly, that how things are done matters as much as what is done.`,
    strengths: ['Genuine fairness of mind', 'Charm that opens every door', 'An unteachable eye for beauty', 'Making others feel considered'],
    challenges: ['Indecision dressed as deliberation', 'Keeping the peace at personal cost', 'Dependence on partnership for direction', 'Avoiding necessary conflict'],
    love: `Libra is the zodiac's partner — this sign genuinely prefers life in twos, and brings to relationships a rare attention to balance: your needs weighed against mine, again and again, honestly. Romance with a Libra is elegant and considerate. The work is teaching them that disagreement is not the end of harmony but part of it.`,
    career: `Libra excels where judgment and grace combine: law, diplomacy, design, curation, HR, client relations. This sign negotiates better than it commands and beautifies whatever it manages. The ideal Libra role involves balancing competing interests — and an office that isn't ugly.`,
    friendship: `A Libra friend is the diplomat of the group — the one who smooths the tension, makes everyone feel included, and somehow always knows the nicest place to meet. This sign is genuinely interested in fairness and will weigh your side of any argument with real care. Charming and easy company, a Libra is at its best one-to-one, where its attention is undivided. The growth, in friendship, is honesty: telling you the hard truth rather than the pleasant one.`,
    shadow: `The Libra shadow is the self that vanishes into other people — agreeing to keep the peace, deferring every decision, and mistaking the avoidance of conflict for harmony. Resentment quietly accumulates beneath the pleasantness; the endless weighing becomes paralysis; the need to be liked overrides the need to be true. The growth edge is the courage to disagree out loud, and to discover that a relationship survives honesty better than it survives suppression.`,
    growth: `The inner path for Libra is from accommodation to authenticity — learning that real harmony is built on truth rather than the absence of friction. This sign grows by finding its own centre of gravity, by making decisions without an external tie-breaker, and by trusting that the people worth keeping will stay through disagreement. When Libra balances its own scales first, the peacemaker stops disappearing into the peace.`,
    matches: ['Gemini', 'Aquarius', 'Leo'],
  },
  {
    key: 'scorpio', name: 'Scorpio', glyph: '♏', dates: 'October 23 – November 21',
    element: 'Water', modality: 'Fixed', ruler: 'Pluto & Mars', symbol: 'The Scorpion',
    polarity: 'Feminine / Yin', bodyPart: 'The reproductive system', tarot: 'Death', keyword: 'I desire',
    intro: `Scorpio is the zodiac's depth — the sign that refuses the surface of anything. Ruled by Pluto, planet of transformation, Scorpio is drawn to what is hidden: motives, mysteries, the truth under the polite version. This is the most intense sign of the twelve, possessed of a will that does not bend and an instinct for the real that cannot be deceived.`,
    strengths: ['Penetrating perception', 'Loyalty unto death', 'Willpower that regenerates from ruin', 'Fearlessness about the dark'],
    challenges: ['Suspicion as a default setting', 'The long memory of the wounded', 'Control disguised as protection', 'All-or-nothing in everything'],
    love: `Scorpio loves totally or not at all — there is no casual setting on this instrument. Intimacy for this sign means the removal of every mask, and it offers the same: to be loved by a Scorpio is to be seen completely. Trust builds slowly and shatters once. What it asks is everything; what it gives is everything.`,
    career: `Scorpio excels where depth and nerve are required: psychology, surgery, investigation, finance, crisis management, research. This sign does its best work underground — on problems others find too dark, too complex, or too dangerous. Power suits Scorpio; it should be earned honestly.`,
    friendship: `A Scorpio friend has no interest in the shallow end. This sign keeps a small circle and guards it absolutely — once you are in, a Scorpio will defend you, keep your darkest secret, and tell you the truth no one else will. It sees through pretence instantly, so honesty is not optional. The intensity can be a lot, but a Scorpio friendship is one of the most genuine bonds in the zodiac: total, unflinching, and built to survive the worst.`,
    shadow: `The Scorpio shadow is the wound that becomes a weapon — the suspicion that poisons trust, the long memory that becomes vengeance, and the need for control disguised as protection. Pain held too long curdles into the very darkness this sign was meant to transform. The growth edge is forgiveness: learning to release rather than retaliate, and to let intimacy mean surrender rather than surveillance.`,
    growth: `The inner path for Scorpio is death and rebirth, again and again — the willingness to let an old self die so a truer one can emerge. This sign grows by trusting before it has proof, by loosening its grip on control, and by transforming its pain into wisdom rather than weaponry. When Scorpio turns its formidable power toward healing instead of armouring, the scorpion becomes the eagle, and finally the phoenix.`,
    matches: ['Cancer', 'Pisces', 'Virgo'],
  },
  {
    key: 'sagittarius', name: 'Sagittarius', glyph: '♐', dates: 'November 22 – December 21',
    element: 'Fire', modality: 'Mutable', ruler: 'Jupiter', symbol: 'The Archer',
    polarity: 'Masculine / Yang', bodyPart: 'The hips and thighs', tarot: 'Temperance', keyword: 'I seek',
    intro: `Sagittarius is the zodiac's arrow aimed at the horizon — ruled by Jupiter, the largest planet, and built to the same scale. This is the sign of the explorer and the philosopher: hungry for distance, meaning, and the next thing it doesn't yet understand. Sagittarian honesty is famous, its optimism contagious, and its suitcase always half-packed.`,
    strengths: ['Optimism with evidence or without', 'Honesty (whether requested or not)', 'A genuine philosophical mind', 'Courage to leap before the net appears'],
    challenges: ['Tactlessness in the name of truth', 'Commitment-shyness — to plans, places, people', 'Promising more than a calendar can hold', 'Restlessness that mistakes motion for progress'],
    love: `Sagittarius needs a co-adventurer, not a keeper. This sign loves with enthusiasm and humour and absolute candour — and bolts at the first scent of a cage. The partner who keeps a Sagittarius is the one who never tries to: shared freedom, shared journeys, and a home that feels like a base camp, not a terminus.`,
    career: `Sagittarius thrives at scale and at distance: travel, academia, publishing, law, international anything, outdoor work. Small rooms and small thinking suffocate this sign. The ideal role involves the big picture, frequent novelty, and a horizon that keeps receding.`,
    friendship: `A Sagittarius friend is the one who texts "let's just go" and means it. This sign brings adventure, big laughter, and a refreshing honesty — it will tell you what it really thinks, then take you somewhere you have never been. Generous and endlessly optimistic, a Sagittarius lifts the whole group's mood. It values its freedom, so it won't smother you, but the friend who matches its appetite for the new and the true earns a companion for every journey ahead.`,
    shadow: `The Sagittarius shadow is the runner — the part that calls flight freedom, leaves before things get real, and uses "honesty" as licence for tactlessness. Big promises outpace any calendar; the next horizon becomes an excuse to abandon the present one; the search for meaning never lands anywhere long enough to find it. The growth edge is commitment: discovering that depth is its own kind of adventure, and that staying can take more courage than leaving.`,
    growth: `The inner path for Sagittarius is from seeking to finding — learning that the meaning it chases across continents was always available in the willingness to stay and go deep. This sign grows by keeping its word, by turning restless motion into a real direction, and by tempering its blunt truths with kindness. When Sagittarius plants its arrow rather than forever drawing the bow, the wanderer becomes the wise teacher.`,
    matches: ['Aries', 'Leo', 'Aquarius'],
  },
  {
    key: 'capricorn', name: 'Capricorn', glyph: '♑', dates: 'December 22 – January 19',
    element: 'Earth', modality: 'Cardinal', ruler: 'Saturn', symbol: 'The Sea-Goat',
    polarity: 'Feminine / Yin', bodyPart: 'The bones, knees and joints', tarot: 'The Devil', keyword: 'I use',
    intro: `Capricorn is the zodiac's mountain climber — ruled by Saturn, the planet of time, discipline, and earned things. This sign plays the long game by instinct: while others sprint and stall, Capricorn ascends at a pace it can sustain for decades. Beneath the dry wit and the serious surface is the most quietly determined sign of the twelve.`,
    strengths: ['Discipline that needs no audience', 'Ambition with a realistic map', 'Dry, surprising humour', 'Responsibility carried without complaint'],
    challenges: ['Work as the answer to every question', 'Pessimism worn as realism', 'Difficulty resting without guilt', 'Withholding feelings to stay in control'],
    love: `Capricorn courts the way it builds: slowly, seriously, with intent to last. This sign distrusts fireworks and trusts demonstrated character — show up on time, keep your word, and mean it. Beneath the reserve is deep loyalty and an unexpectedly tender heart that only fully appears once the foundation is proven safe.`,
    career: `Capricorn is the zodiac's executive: management, finance, government, engineering, any field with a ladder worth climbing. Authority sits naturally on this sign because it does the work first. The ideal Capricorn role has clear advancement, real responsibility, and results that compound.`,
    friendship: `A Capricorn friend is the one you can actually rely on — the person who turns up when they said they would, gives advice worth following, and never disappears when things get hard. This sign is slow to befriend and dryly funny once it does, offering loyalty measured in decades rather than declarations. A Capricorn won't flatter you, but it will quietly help you build the life you want, because to a Capricorn that is what love looks like.`,
    shadow: `The Capricorn shadow is the taskmaster within — the part that equates worth with output, treats rest as failure, and armours its tender heart behind achievement and control. Ambition hardens into coldness; realism curdles into pessimism; the climb becomes the only thing, and the summit never feels like enough. The growth edge is permission: to feel, to rest, and to believe that one is valuable for existing, not only for producing.`,
    growth: `The inner path for Capricorn is from achievement to meaning — discovering that the mountain it has been climbing was never the point, and that a life is measured in more than what is built. This sign grows by letting people see its softness, by resting without guilt, and by loosening the grip of control enough to enjoy the view. When Capricorn climbs toward joy rather than away from inadequacy, the elder it is becoming finds peace.`,
    matches: ['Taurus', 'Virgo', 'Scorpio'],
  },
  {
    key: 'aquarius', name: 'Aquarius', glyph: '♒', dates: 'January 20 – February 18',
    element: 'Air', modality: 'Fixed', ruler: 'Uranus & Saturn', symbol: 'The Water-Bearer',
    polarity: 'Masculine / Yang', bodyPart: 'The ankles and circulation', tarot: 'The Star', keyword: 'I know',
    intro: `Aquarius is the zodiac's lightning rod — ruled by Uranus, planet of revolution and the unexpected. This sign thinks in systems and futures, loves humanity at scale, and guards its individuality like a founding principle. The Aquarian paradox: the most communal sign of the zodiac is also the most stubbornly, proudly unlike anyone else.`,
    strengths: ['Original thinking, genuinely original', 'Loyalty to friends and to principles', 'Vision that arrives a decade early', 'Calm detachment in any storm'],
    challenges: ['Detachment that reads as coldness', 'Contrarianism for its own sake', 'Living in the future at the expense of the present', 'Intellectualising feelings instead of feeling them'],
    love: `Aquarius must be befriended before it can be loved — this sign's deepest romances begin as conversations between equals. It offers a partner total acceptance of their strangeness and expects the same. Possessiveness kills it instantly. Freedom, ideas, and a shared cause keep an Aquarian heart for life.`,
    career: `Aquarius belongs at the frontier: science, technology, social innovation, aviation, activism, anything that did not exist twenty years ago. This sign improves systems by refusing to accept them. The ideal role offers intellectual freedom, a mission, and colleagues who can keep up.`,
    friendship: `Aquarius may be the truest friend of the zodiac — friendship is its native element, and it gathers an eclectic tribe that crosses every conventional boundary. This sign accepts your weirdness completely and expects you to accept its own. A Aquarius will champion your causes, brainstorm your wildest ideas, and stay loyal for life, though it needs plenty of space and is more comfortable discussing ideas than emotions. Give it freedom and it will give you a friend who genuinely sees you.`,
    shadow: `The Aquarius shadow is the head that has fled the heart — the detachment that reads as coldness, the contrarianism that argues for its own sake, and the love of humanity in the abstract while the actual person in the room goes unseen. Living in the future becomes a way to avoid the feelings of the present. The growth edge is presence: letting people close enough to be felt, not just understood, and admitting that it, too, has needs.`,
    growth: `The inner path for Aquarius is from detachment to connection — learning that its visionary mind reaches further when it is rooted in the heart. This sign grows by feeling its feelings rather than analysing them, by being present with individuals and not only causes, and by letting its famous independence soften into genuine intimacy. When Aquarius brings its gifts down from the future into the now, the rebel becomes the healer of the collective.`,
    matches: ['Gemini', 'Libra', 'Sagittarius'],
  },
  {
    key: 'pisces', name: 'Pisces', glyph: '♓', dates: 'February 19 – March 20',
    element: 'Water', modality: 'Mutable', ruler: 'Neptune & Jupiter', symbol: 'The Fishes',
    polarity: 'Feminine / Yin', bodyPart: 'The feet and lymphatic system', tarot: 'The Moon', keyword: 'I believe',
    intro: `Pisces is the zodiac's last sign — and carries something of all eleven before it. Ruled by Neptune, planet of dreams and dissolution, Pisces lives with thin boundaries between self and world, real and imagined, this life and something larger. This is the sign of the mystic and the artist: the most compassionate of the twelve, and the most easily lost.`,
    strengths: ['Compassion without conditions', 'Imagination as a natural element', 'Intuition bordering on telepathy', 'Adaptability to any current'],
    challenges: ['Escapism when reality presses', 'Boundaries — locating, then defending them', 'Absorbing every mood in the room', 'Martyrdom mistaken for love'],
    love: `Pisces loves the way the sea loves the shore — totally, surrounding, without conditions. This sign offers a kind of acceptance most people have never experienced, and asks for tenderness in return. The danger is dissolution: a Pisces in love can forget where they end and the beloved begins. The right partner holds the boundary kindly.`,
    career: `Pisces flourishes where imagination and empathy are the actual job: arts, music, film, healing professions, spiritual care, marine work. Rigid structures drain this sign; flow states sustain it. The ideal Piscean role serves something larger than profit and leaves room to dream.`,
    friendship: `A Pisces friend is the one who truly understands — who feels what you feel before you have explained it, and holds your secrets with infinite gentleness. This sign offers a soft place to land and a sympathy so complete it can feel like being healed. The care for a Pisces friendship runs both ways: this sign gives until it is empty, so the kindest thing you can do is notice when it needs holding too, and remind it where it ends and you begin.`,
    shadow: `The Pisces shadow is the tide that pulls under — escapism when reality presses, martyrdom mistaken for love, and boundaries so thin the self dissolves into everyone else's needs. The dreaming becomes avoidance; the compassion becomes self-erasure; the longing for something larger becomes a flight from the life actually here. The growth edge is incarnation: staying present in the body and the day, and learning that one cannot pour from an empty vessel.`,
    growth: `The inner path for Pisces is from dissolution to devotion — learning to channel its oceanic sensitivity into creation and service rather than escape. This sign grows by building gentle boundaries, by grounding its dreams in daily practice, and by tending its own spirit as faithfully as it tends others'. When Pisces stops fleeing the world and brings its compassion fully into it, the dreamer becomes the artist and the mystic the world needs.`,
    matches: ['Cancer', 'Scorpio', 'Taurus'],
  },
];


/* ─────────────────────────────────────────────────────────────────────────
   Layered-sign astronomy data (factual). Ecliptic-longitude bands are exact
   by definition — the tropical zodiac divides the 360° ecliptic into twelve
   fixed 30° arcs measured from the March-equinox point (0° Aries). Tropical
   Sun-ingress dates drift ~1 day year-to-year, so they are given as "around".
   ───────────────────────────────────────────────────────────────────────── */

// Plain one-line meanings, beginner-first (Layer 2 definitions).
const ELEMENT_DEF = {
  Fire:  'the element of drive and spark — fire signs move on instinct, warmth and action.',
  Earth: 'the element of the tangible — earth signs are grounded, practical and built to last.',
  Air:   'the element of the mind — air signs live in ideas, language and connection.',
  Water: 'the element of feeling — water signs move through emotion, intuition and depth.',
};

const MODALITY_DEF = {
  Cardinal: 'the initiating mode — cardinal signs start things and set the season in motion.',
  Fixed:    'the sustaining mode — fixed signs hold steady, deepen and see things through.',
  Mutable:  'the adapting mode — mutable signs flex, blend and prepare the way for change.',
};

// Primary seal slug for the ruling planet (modern ruler first for the engraved
// seal; the fact line still names the full traditional/modern pairing).
const RULER_SEAL = {
  aries: 'mars', taurus: 'venus', gemini: 'mercury', cancer: 'moon',
  leo: 'sun', virgo: 'mercury', libra: 'venus', scorpio: 'pluto',
  sagittarius: 'jupiter', capricorn: 'saturn', aquarius: 'uranus', pisces: 'neptune',
};

/* HERO ANCHOR — each sign's ruling planet as a real ENGINE STILL (img/engine/<id>.webp,
   our own photoreal 3D render, honest). This is the star of the hero, replacing the
   old painterly zodiac-card JPG. `still` = the engine webp id; `label` = how the body
   is named in the alt/caption (matches the sign's ruler wording).
   NOTE Scorpio: Pluto used to be a bare generated disc, which is why Scorpio was
   anchored on MARS. As of v869 the engine renders a real Pluto from the NASA New
   Horizons map and img/engine/pluto.webp is a genuine engine portrait, so that
   reason is gone — Scorpio stays on Mars purely as an editorial call (its traditional
   ruler; the sign data already reads "Pluto & Mars"). Switching the anchor to Pluto
   is now a content decision, not a graphics limitation. The engraved seal stays Pluto. */
const RULER_STILL = {
  aries:      { still: 'mars',    label: 'Mars',     rel: 'ruler of Aries' },
  taurus:     { still: 'venus',   label: 'Venus',    rel: 'ruler of Taurus' },
  gemini:     { still: 'mercury', label: 'Mercury',  rel: 'ruler of Gemini' },
  cancer:     { still: 'moon',    label: 'the Moon', rel: 'ruler of Cancer' },
  leo:        { still: 'sun',     label: 'the Sun',  rel: 'ruler of Leo' },
  virgo:      { still: 'mercury', label: 'Mercury',  rel: 'ruler of Virgo' },
  libra:      { still: 'venus',   label: 'Venus',    rel: 'ruler of Libra' },
  scorpio:    { still: 'mars',    label: 'Mars',     rel: "Scorpio's traditional ruler" },
  sagittarius:{ still: 'jupiter', label: 'Jupiter',  rel: 'ruler of Sagittarius' },
  capricorn:  { still: 'saturn',  label: 'Saturn',   rel: 'ruler of Capricorn' },
  aquarius:   { still: 'uranus',  label: 'Uranus',   rel: 'ruler of Aquarius' },
  pisces:     { still: 'neptune', label: 'Neptune',  rel: 'ruler of Pisces' },
};

// Plain one-line meaning of the ruling planet — what it governs (Layer 2).
const RULER_DEF = {
  aries: 'Mars, the planet of drive, courage and raw initiative.',
  taurus: 'Venus, the planet of beauty, pleasure and what we value.',
  gemini: 'Mercury, the planet of thought, language and exchange.',
  cancer: 'the Moon, ruler of emotion, memory and the inner tides.',
  leo: 'the Sun, the centre of the chart — vitality, self and the will to shine.',
  virgo: 'Mercury, the planet of analysis, craft and useful detail.',
  libra: 'Venus, the planet of harmony, relationship and taste.',
  scorpio: 'Pluto, planet of depth and transformation, with classical Mars for its will.',
  sagittarius: 'Jupiter, the planet of expansion, meaning and the wide horizon.',
  capricorn: 'Saturn, the planet of time, discipline and earned achievement.',
  aquarius: 'Uranus, planet of invention and the unexpected, with classical Saturn for its structure.',
  pisces: 'Neptune, planet of dreams and dissolution, with classical Jupiter for its faith.',
};

// Exact 30° ecliptic-longitude band per sign (tropical, by definition).
const LONGITUDE_BAND = {
  aries: '0°–30°', taurus: '30°–60°', gemini: '60°–90°', cancer: '90°–120°',
  leo: '120°–150°', virgo: '150°–180°', libra: '180°–210°', scorpio: '210°–240°',
  sagittarius: '240°–270°', capricorn: '270°–300°', aquarius: '300°–330°', pisces: '330°–360°',
};

// Softened, honesty-compliant date band ("around 21 Mar – 19 Apr").
function approxDateBand(datesText) {
  const MON = { January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun', July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec' };
  return datesText
    .replace(/([A-Z][a-z]+) (\d+)/g, (_, mon, day) => `${day} ${MON[mon] || mon}`)
    .replace(/\s*–\s*/, ' – ');
}

/* Brand glyphs (hand-built SVG, currentColor) from the Paper & Night pack.
   Only the symbols a page uses are inlined, so there is no extra request. */
const GLYPH_SPRITE = readFileSync(join(SITE_DIR, '..', 'tools', 'brand-src', 'ap-glyphs-sprite.svg'), 'utf8');
function glyphSymbol(id) {
  const m = GLYPH_SPRITE.match(new RegExp(`<symbol id="g-${id}"[\\s\\S]*?</symbol>`));
  if (!m) throw new Error(`glyph g-${id} missing from tools/brand-src/ap-glyphs-sprite.svg`);
  return m[0];
}
const glyph = (id, cls = 'sign-glyph') => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#g-${id}"/></svg>`;

/* LAYER 2 — Precise astronomy: fact cards, beginner-readable, using element
   icons and brand planet glyphs, plus the exact ecliptic band. */
function astronomySection(s) {
  const rulerSlug = RULER_SEAL[s.key];
  const band = LONGITUDE_BAND[s.key];
  const dateBand = approxDateBand(s.dates);
  const elementKey = s.element.toLowerCase();
  const still = RULER_STILL[s.key];
  return `
    <section class="sign-section wrap" aria-labelledby="astronomy-heading">
      <h2 id="astronomy-heading">The astronomy of ${s.name}</h2>
      <p class="sign-sub">The factual layer: where ${s.name} sits on the ecliptic.</p>
      <details class="sign-more">
        <summary>Element, ruler, ecliptic band</summary>
        <div class="sign-astro">
          <div class="sign-astro__card">
            <span class="sign-astro__mark" aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-${elementKey}"/></svg></span>
            <div>
              <span class="sign-label">Element</span>
              <span class="sign-astro__value">${s.element}</span>
              <p>${ELEMENT_DEF[s.element]}</p>
            </div>
          </div>
          <div class="sign-astro__card">
            <span class="sign-astro__mark" aria-hidden="true"><svg class="eng-i" aria-hidden="true"><use href="#ei-modality"/></svg></span>
            <div>
              <span class="sign-label">Modality</span>
              <span class="sign-astro__value">${s.modality}</span>
              <p>${MODALITY_DEF[s.modality]}</p>
            </div>
          </div>
          <div class="sign-astro__card sign-astro__card--ruler">
            <figure class="sign-planet">
              <img src="img/engine/studio/${still.still}.webp" alt="${still.label}, ${still.rel}, rendered by the AstroPrecise engine" width="96" height="96" loading="lazy" decoding="async" />
            </figure>
            <div>
              <span class="sign-label">Ruling planet ${glyph(rulerSlug, 'sign-glyph sign-glyph--inline')}</span>
              <span class="sign-astro__value">${s.ruler}</span>
              <p>${RULER_DEF[s.key]}</p>
              <p class="sign-caption">${still.label} · our engine render</p>
            </div>
          </div>
          <div class="sign-astro__card">
            <span class="sign-astro__mark" aria-hidden="true">${glyph(s.key)}</span>
            <div>
              <span class="sign-label">Position on the ecliptic</span>
              <span class="sign-astro__value">${band} longitude</span>
              <p>${s.name} is the ${band} band of the zodiac circle. The Sun crosses it around ${dateBand} each year. The exact day shifts by about a day from year to year, which is why the dates are approximate.</p>
            </div>
          </div>
        </div>
      </details>
    </section>`;
}

/* LAYER 3 — What this sign means in YOUR chart: Sun / Moon / Rising, plainly. */
function inYourChartSection(s) {
  const an = /^[AEIOU]/.test(s.name) ? 'an' : 'a';
  return `
    <section class="sign-section sign-section--band" aria-labelledby="inchart-heading">
      <div class="wrap">
        <h2 id="inchart-heading">${s.name} in your chart</h2>
        <p class="sign-sub">Most people meet ${s.name} as a “star sign”. In a real birth chart it can appear in three very different places, and each one means something distinct.</p>
        <div class="sign-inchart">
          <div class="sign-inchart__row">
            <span class="sign-inchart__mark">${glyph('sun')}</span>
            <div>
              <h3>Sun in ${s.name}</h3>
              <p>Your core self: the “${s.name} side” people mean when they ask your sign. It shapes your basic character and what makes you feel most yourself.</p>
            </div>
          </div>
          <div class="sign-inchart__row">
            <span class="sign-inchart__mark">${glyph('moon')}</span>
            <div>
              <h3>Moon in ${s.name}</h3>
              <p>Your inner, emotional world: how you feel, comfort yourself and respond in private. Two people with ${an} ${s.name} Moon share an emotional language, whatever their Sun sign.</p>
            </div>
          </div>
          <div class="sign-inchart__row">
            <span class="sign-inchart__mark">${glyph(s.key)}</span>
            <div>
              <h3>Rising (Ascendant) in ${s.name}</h3>
              <p>How you meet the world: your outward style and first impression. Your Rising is set by the exact time and place you were born, so it needs your birth time to know.</p>
            </div>
          </div>
        </div>
        <p class="sign-inchart__cta"><a class="button" href="chart.html">Cast your chart</a></p>
      </div>
    </section>`;
}

function matchList(s) {
  const m = s.matches;
  if (m.length <= 1) return m[0] || '';
  return `${m.slice(0, -1).join(', ')} and ${m[m.length - 1]}`;
}

/* Love / career / friendship / shadow / growth — one section, stacked copy. */
function inLifeSection(s) {
  return `
    <section class="sign-section wrap" aria-labelledby="inlife-heading">
      <h2 id="inlife-heading">In life</h2>
      <div class="sign-prose">
        <h3>Love</h3>
        <p>${s.love}</p>
        <p class="sign-compat">Traditionally a good match with ${matchList(s)}. See <a href="compatibility.html">two-chart compatibility</a>: Sun signs alone are not the whole story.</p>
        <details class="sign-more">
          <summary>Career, friendship, shadow, growth</summary>
          <h3>Career</h3>
          <p>${s.career}</p>
          <h3>Friendship</h3>
          <p>${s.friendship}</p>
          <h3>Shadow</h3>
          <p>${s.shadow}</p>
          <h3>Growth</h3>
          <p>${s.growth}</p>
        </details>
      </div>
    </section>`;
}

/* One closer: Events + Shop. In-your-chart already covers Sun vs whole chart. */
function eventsStudioBridge() {
  return `
    <section class="sign-section wrap sign-bridge" aria-label="Events and Shop">
      <div class="actions">
        <a href="sky-events.html" class="button-secondary">What’s in the sky</a>
        <a href="shop.html" class="button-secondary">Open the Shop</a>
      </div>
    </section>`;
}

function faqItems(s) {
  return [
    {
      q: `What are the ${s.name} zodiac dates?`,
      a: `${s.name} season runs ${s.dates}. People born in this window have their Sun in ${s.name}.`,
    },
    {
      q: `What element and ruling planet is ${s.name}?`,
      a: `${s.name} is a ${s.element} sign of the ${s.modality} modality, ruled by ${s.ruler}. Its symbol is ${s.symbol}.`,
    },
    {
      q: `Which signs are most compatible with ${s.name}?`,
      a: `${s.name} is traditionally most compatible with ${s.matches.join(', ')}. Full synastry depends on the complete birth charts of both people, not Sun signs alone.`,
    },
    {
      q: `What are the main ${s.name} personality traits?`,
      a: `${s.name} is known for being ${s.strengths.slice(0, 3).map(t => t.toLowerCase()).join(', ')}. Its growth edges include ${s.challenges.slice(0, 2).map(t => t.toLowerCase()).join(' and ')}. As a ${s.modality} ${s.element} sign ruled by ${s.ruler}, ${s.name} carries the keyword “${s.keyword}”.`,
    },
    {
      q: `Is ${s.name} rare?`,
      a: `No zodiac sign is truly rare: every sign covers about a month, so each accounts for roughly one twelfth of birthdays. Small global birth-rate variations by season make some signs marginally more common than others, but ${s.name} is no rarer than any other Sun sign. Your full birth chart, however, is genuinely one of a kind.`,
    },
    {
      q: `What is the ${s.name} symbol and ruling body?`,
      a: `The symbol of ${s.name} is ${s.symbol}, and it is ruled by ${s.ruler}. Its polarity is ${s.polarity.toLowerCase()}, it is traditionally associated with ${s.bodyPart.toLowerCase()}, and its corresponding tarot card is ${s.tarot}.`,
    },
  ];
}

function faqSection(s) {
  return `
        <h3 class="sign-reference__sub" id="faq-heading">Frequently asked</h3>
        <div class="sign-faq">
          ${faqItems(s).map(item => `
          <details>
            <summary>${item.q}</summary>
            <p>${item.a}</p>
          </details>`).join('')}
        </div>`;
}

const ICON_SYMBOLS = `
    <symbol id="ei-fire" viewBox="0 0 24 24"><path d="M12 3.5 20 19H4L12 3.5Z"/></symbol>
    <symbol id="ei-earth" viewBox="0 0 24 24"><path d="M12 20.5 4 5h16L12 20.5ZM6.6 10.2h10.8"/></symbol>
    <symbol id="ei-air" viewBox="0 0 24 24"><path d="M12 3.5 20 19H4L12 3.5ZM6.6 13.8h10.8"/></symbol>
    <symbol id="ei-water" viewBox="0 0 24 24"><path d="M12 20.5 4 5h16L12 20.5Z"/></symbol>
    <symbol id="ei-modality" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></symbol>`;

/* Constellation art uses its own gradient id g-<sign>; rename it so it can never
   collide with the brand glyph symbol #g-<sign> inlined on the same page. */
function constellation(key) {
  return (CONSTELLATIONS[key] || '').replace(new RegExp(`(id="|url\\(#)g-${key}`, 'g'), `$1cg-${key}`);
}

export const PAGE_TITLE = "Sign guide and this week's sky";

function page(s) {
  const title = `${s.name}: ${PAGE_TITLE} | AstroPrecise`;
  const shareTitle = `${s.name}: ${PAGE_TITLE}`;
  const desc = `The ${s.name} sign guide: element, ruling planet, love, career and compatibility, plus today’s sky for ${s.name}, calculated from real planetary positions.`;
  const url = `${BASE_URL}/${s.key}.html`;
  const elementKey = s.element.toLowerCase();
  const symbols = [s.key, RULER_SEAL[s.key], 'sun', 'moon'].filter((v, i, a) => a.indexOf(v) === i).map(glyphSymbol).join('\n    ');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: shareTitle,
    description: desc,
    url,
    inLanguage: 'en',
    isAccessibleForFree: true,
    keywords: [
      `${s.name}`, `${s.name} horoscope`, `${s.name} zodiac sign`, `${s.name} dates`,
      `${s.name} personality`, `${s.name} traits`, `${s.name} compatibility`,
      `${s.name} love`, `${s.name} career`, `${s.element} sign`, `${s.modality} sign`,
    ].join(', '),
    publisher: { '@type': 'Organization', name: 'AstroPrecise', url: BASE_URL },
    about: { '@type': 'Thing', name: `${s.name} (astrology)` },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Guides & signs', item: `${BASE_URL}/guides.html` },
      { '@type': 'ListItem', position: 2, name: `${s.name}`, item: url },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems(s).map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${desc}" />
  <title>${title}</title>
  <link rel="canonical" href="${url}" />
  <link rel="manifest" href="manifest.json" />
  <link rel="icon" href="favicon.ico" sizes="48x48">
  <link rel="icon" type="image/svg+xml" href="favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16.png">
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="AstroPrecise" />
  <meta property="og:title" content="${shareTitle} | AstroPrecise" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE_URL}/img/og/og-${s.key}.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Sun sign guide: ${s.name}. AstroPrecise card, lettered in Instrument Serif and Inter on paper." />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${shareTitle} | AstroPrecise" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${BASE_URL}/img/og/og-${s.key}.jpg" />
  <meta name="theme-color" content="#F6F3EC" />
  <link rel="preload" href="fonts/instrument-serif-regular.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="stylesheet" href="css/ap-next.css?v=${ASSET_V}" />
  <link rel="stylesheet" href="css/sign-next.css?v=${ASSET_V}" />
  <script src="js/ap-next.js?v=${ASSET_V}" defer></script>
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body class="ap-next ap-sign" data-element="${elementKey}" data-sign="${s.name}">
  <a class="ap-skip" href="#main-content">Skip to content</a>
  <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${ICON_SYMBOLS}
    ${symbols}
  </svg>
  <div data-ap-next-nav><noscript><nav class="ap-noscript-nav" aria-label="Primary"><a href="index.html">AstroPrecise</a> · <a href="chart.html">Birth chart</a> · <a href="explore.html">Explore</a> · <a href="charts.html">Saved</a> · <a href="observatory.html">Observatory</a> · <a href="sky-events.html">Events</a> · <a href="shop.html">Shop</a> · <a href="verify.html">Verify</a></nav></noscript></div>

  <main id="main-content" class="sign-page">
    <nav class="sign-crumb wrap" aria-label="Breadcrumb">
      <ol>
        <li><a href="guides.html">Guides &amp; signs</a></li>
        <li aria-current="page">${s.name}</li>
      </ol>
    </nav>

    <section class="sign-hero wrap" aria-labelledby="page-title">
      <div class="sign-hero__copy">
        <p class="sign-label">Sign guide · ${s.element} · ${s.modality}</p>
        ${glyph(s.key, 'sign-glyph sign-hero__glyph')}
        <h1 id="page-title">${s.name}</h1>
        <p class="sign-hero__dates">${s.dates}</p>
        <p class="sign-hero__keyword" aria-label="Sign keyword">“${s.keyword}”</p>
        <dl class="sign-facts">
          <div><dt>Element</dt><dd>${s.element}</dd></div>
          <div><dt>Modality</dt><dd>${s.modality}</dd></div>
          <div><dt>Ruler</dt><dd>${s.ruler}</dd></div>
          <div><dt>Symbol</dt><dd>${s.symbol}</dd></div>
        </dl>
        <div class="actions">
          <a href="chart.html" class="button">Cast your chart</a>
          <a href="#today-heading" class="button-secondary">Today’s sky for ${s.name}</a>
        </div>
      </div>
      <figure class="sign-hero__art">
        <div class="sign-hero__sky">
          <div class="sign-hero__constellation">${constellation(s.key)}</div>
        </div>
        <figcaption>The ${s.name} star pattern, drawn from real star positions</figcaption>
      </figure>
    </section>

    <section class="sign-section sign-section--band" aria-labelledby="today-heading">
      <div class="wrap">
        <h2 id="today-heading">${s.name} in today’s sky</h2>
        <p class="sign-sub" id="today-date" aria-live="polite"></p>
        <p class="sign-note">Calculated from today’s sky with the same planet model as the 3D Observatory. Not a live feed.</p>
        <div class="today-reading is-loading" id="today-reading" aria-live="polite">
          <div class="card">
            <p>Today’s ${s.name} reading is calculated in your browser from real planetary positions. If this text remains, turn on JavaScript to see it, or read the full ${s.name} guide below.</p>
          </div>
        </div>
        <p class="sign-week"><a class="text-link" href="this-weeks-sky.html">This week’s sky →</a></p>
      </div>
    </section>

    <section class="sign-section wrap" aria-labelledby="about-heading">
      <h2 id="about-heading">About ${s.name}</h2>
      <p class="sign-lede">${s.intro}</p>
    </section>

    ${astronomySection(s)}

    ${inYourChartSection(s)}

    <section class="sign-section wrap" aria-labelledby="traits-heading">
      <h2 id="traits-heading">${s.name} strengths &amp; challenges</h2>
      <div class="sign-traits">
        <div>
          <h3>Strengths</h3>
          <ul class="sign-list sign-list--plus">
            ${s.strengths.map(t => `<li>${t}</li>`).join('\n            ')}
          </ul>
        </div>
        <div>
          <h3>Challenges</h3>
          <ul class="sign-list sign-list--minus">
            ${s.challenges.map(t => `<li>${t}</li>`).join('\n            ')}
          </ul>
        </div>
      </div>
    </section>

    ${inLifeSection(s)}

    <section class="sign-section wrap" aria-labelledby="reference-heading">
      <h2 id="reference-heading">${s.name} reference</h2>
      <details class="sign-more">
        <summary>Dates, ruler, FAQ</summary>
        <h3 class="sign-reference__sub" id="glance-heading">${s.name} at a glance</h3>
        <dl class="sign-glance">
          <div><dt>Symbol</dt><dd>${glyph(s.key, 'sign-glyph sign-glyph--inline')} ${s.symbol}</dd></div>
          <div><dt>Dates</dt><dd>${s.dates}</dd></div>
          <div><dt>Element</dt><dd>${s.element}</dd></div>
          <div><dt>Modality</dt><dd>${s.modality}</dd></div>
          <div><dt>Ruling planet</dt><dd>${s.ruler}</dd></div>
          <div><dt>Polarity</dt><dd>${s.polarity}</dd></div>
          <div><dt>Body part</dt><dd>${s.bodyPart}</dd></div>
          <div><dt>Tarot</dt><dd>${s.tarot}</dd></div>
          <div><dt>Keyword</dt><dd>“${s.keyword}”</dd></div>
        </dl>
        ${faqSection(s)}
      </details>
    </section>

    ${eventsStudioBridge()}

    <section class="sign-section wrap" aria-labelledby="every-sign-heading">
      <h2 id="every-sign-heading" class="sign-h-small">Every sign</h2>
      <p class="sign-sub">Tap a tile to open that sign’s guide and today’s sky.</p>
      <ul class="sign-thumb-grid" aria-label="All zodiac signs">
        ${SIGNS.map(o => `<li><a href="${o.key}.html" class="sign-thumb${o.key === s.key ? ' sign-thumb--current' : ''}"${o.key === s.key ? ' aria-current="page"' : ''}><img src="img/signs/${o.key}.webp" alt="" width="92" height="138" loading="lazy" decoding="async" /><span>${o.name}</span></a></li>`).join('\n        ')}
      </ul>
    </section>
  </main>

  <div data-ap-next-footer><noscript><footer class="ap-noscript-footer"><a href="observatory.html">Observatory</a> · <a href="sky-events.html">Events</a> · <a href="shop.html">Shop</a> · <a href="verify.html">Verify</a> · <a href="privacy.html">Privacy</a> · <a href="terms.html">Terms</a> · <a href="refunds.html">Refunds</a> · <a href="contact.html">Contact</a></footer></noscript></div>

  <script src="js/content-service.js?v=${ASSET_V}"></script>
  <script src="js/sign-daily.js?v=${ASSET_V}"></script>
  <script src="js/ap-zodiac-constants.js?v=${ASSET_V}"></script>
  <script src="js/sign-page-boot.js?v=${ASSET_V}"></script>
</body>
</html>
`;
}

// Things that must never reach a sign page (checked on every generated page).
export const BANNED = [
  ['\u00e2\u20ac', 'mojibake punctuation; keep this generator UTF-8'],
  ['--color-gold', 'leftover gold token'],
  ['--gold-vivid', 'leftover gold token'],
  ['v=901', 'script cache still v=901'],
  ['v=912', 'script cache still v=912'],
  ['Best match:', 'match-chip CTA'],
  ['#C2A05E', 'retired brass on sign page'],
  ['040812', 'legacy dark theme colour'],
  ['zodiac-cards', 'AI zodiac card art'],
  ['VSOP87', 'model shorthand on a reader page; say it in plain words'],
  ['ELP2000', 'model shorthand on a reader page; say it in plain words'],
  ['J2000', 'model shorthand on a reader page; say it in plain words'],
  ['data-celestial-seal', 'legacy engraved seal hook'],
  ['main-lite.css', 'legacy dark stylesheet'],
  ['sign-page.css', 'legacy dark stylesheet'],
  ['celestial-seals.css', 'legacy dark stylesheet'],
  ['<style', 'inline page styles (use css/sign-next.css)'],
  ['lucky number', 'lucky numbers in HTML'],
  ['My Sky', 'My Sky'],
  ['coming soon', 'coming-soon copy'],
  ['Your Sun sign is one placement of many', 'duplicate Sun-sign CTA'],
  ['>Home</a>', 'Home breadcrumb'],
  ['Daily Hub', 'Daily Hub CTA'],
  ['precision instrument wearing', 'old instrument tagline'],
  ['See the Studio', 'Studio CTA'],
];

function writeSignPage(name, html) {
  for (const [needle, why] of BANNED) {
    if (html.toLowerCase().includes(needle.toLowerCase())) {
      throw new Error(`${name}: ${why} (${needle})`);
    }
  }
  writeFileSync(join(OUT_DIR, `${name}.html`), html, 'utf8');
}

export const SIGN_KEYS = SIGNS.map(s => s.key);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const s of SIGNS) {
    const html = page(s);
    writeSignPage(s.key, html);
    console.log(`wrote ${s.key}.html (${(html.length / 1024).toFixed(1)} KB)`);
  }
  console.log('done – 12 sign pages generated');
}
