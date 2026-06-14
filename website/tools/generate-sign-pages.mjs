#!/usr/bin/env node
/**
 * Generates the 12 per-sign landing pages (aries.html … pisces.html).
 * Run from repo root:  node website/tools/generate-sign-pages.mjs
 * Output: website/<sign>.html
 */

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { CONSTELLATIONS } from './constellations.mjs';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = 'https://astroprecise.app';

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

const SIGN_LIST = SIGNS.map(s => ({ key: s.key, name: s.name, glyph: s.glyph }));

function navLinks(activeKey) {
  return `
          <a href="index.html" class="navbar__link">Home</a>
          <a href="chart.html" class="navbar__link">Chart</a>
          <a href="ephemeris.html" class="navbar__link">Instrument</a>
          <a href="horoscope.html" class="navbar__link">Horoscope</a>
          <a href="compatibility.html" class="navbar__link">Compatibility</a>
          <a href="transits.html" class="navbar__link">Transits</a>
          <a href="why.html" class="navbar__link">Why</a>
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
    inLanguage: 'en',
    isAccessibleForFree: true,
    keywords: [
      `${s.name}`, `${s.name} horoscope`, `${s.name} horoscope today`,
      `${s.name} zodiac sign`, `${s.name} dates`, `${s.name} personality`,
      `${s.name} traits`, `${s.name} compatibility`, `${s.name} love`, `${s.name} career`,
      `${s.element} sign`, `${s.modality} sign`,
    ].join(', '),
    publisher: { '@type': 'Organization', name: 'AstroPrecise', url: BASE_URL },
    about: { '@type': 'Thing', name: `${s.name} (astrology)` },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/index.html` },
      { '@type': 'ListItem', position: 2, name: `${s.name}`, item: url },
    ],
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
      {
        '@type': 'Question',
        name: `What are the main ${s.name} personality traits?`,
        acceptedAnswer: { '@type': 'Answer', text: `${s.name} is known for being ${s.strengths.slice(0, 3).map(t => t.toLowerCase()).join(', ')}. Its growth edges include ${s.challenges.slice(0, 2).map(t => t.toLowerCase()).join(' and ')}. As a ${s.modality} ${s.element} sign ruled by ${s.ruler}, ${s.name} carries the keyword "${s.keyword}".` },
      },
      {
        '@type': 'Question',
        name: `Is ${s.name} rare?`,
        acceptedAnswer: { '@type': 'Answer', text: `No zodiac sign is truly rare — every sign covers about a month, so each accounts for roughly one twelfth of birthdays. Small global birth-rate variations by season make some signs marginally more common than others, but ${s.name} is no rarer than any other Sun sign. Your full birth chart, however, is genuinely one of a kind.` },
      },
      {
        '@type': 'Question',
        name: `What is the ${s.name} symbol and ruling body?`,
        acceptedAnswer: { '@type': 'Answer', text: `The symbol of ${s.name} is ${s.symbol} (glyph ${s.glyph}), and it is ruled by ${s.ruler}. Its polarity is ${s.polarity.toLowerCase()}, it is traditionally associated with ${s.bodyPart.toLowerCase()}, and its corresponding tarot card is ${s.tarot}.` },
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
  <link rel="stylesheet" href="css/fonts.css" />
  <link rel="manifest" href="manifest.json" />
  <link rel="icon" type="image/svg+xml" href="img/favicon.svg" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="AstroPrecise" />
  <meta property="og:title" content="${s.name} Horoscope Today | AstroPrecise" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE_URL}/assets/images/zodiac-cards/${s.key}.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${s.name} Horoscope Today | AstroPrecise" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${BASE_URL}/assets/images/zodiac-cards/${s.key}.jpg" />
  <meta name="theme-color" content="#050406" />
  <link rel="stylesheet" href="css/main.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbLd)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
  <style>
    .sign-hero { text-align: center; padding: calc(var(--nav-height,72px) + 2.5rem) var(--space-4) var(--space-10); position: relative; z-index: 1; }
    .sign-hero__inner { display: flex; gap: clamp(1.5rem,4vw,3.5rem); align-items: center; justify-content: center; max-width: 860px; margin: 0 auto; }
    .sign-hero__card-img {
      flex-shrink: 0; width: clamp(150px, 22vw, 230px);
      border-radius: 14px; display: block;
      border: 1px solid rgba(201,162,39,0.38);
      box-shadow: 0 12px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(201,162,39,0.14),
                  0 0 40px rgba(201,162,39,0.12);
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease;
    }
    .sign-hero__card-img:hover { transform: translateY(-6px) rotate(-1deg); box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,162,39,0.3), 0 0 48px rgba(201,162,39,0.22); }
    .sign-hero__content { text-align: center; }
    @media (max-width: 640px) { .sign-hero__inner { flex-direction: column; gap: 1.5rem; } .sign-hero__card-img { width: clamp(130px, 50vw, 190px); } }
    .sign-hero__glyph { font-size: 4.5rem; line-height: 1; display: block; margin-bottom: var(--space-4);
      background: linear-gradient(180deg, #f2dfa7 0%, #c9a227 60%, #8c6a2f 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 18px rgba(196,146,10,0.4)); }
    .sign-hero__constellation { max-width: 280px; margin: 0 auto var(--space-4); }
    .sign-hero__constellation svg { display: block; width: 100%; height: auto; filter: drop-shadow(0 0 14px rgba(201,162,39,0.38)); }
    .sign-hero h1 { font-family: var(--font-display); font-size: clamp(2.4rem, 6vw, 3.6rem); color: var(--color-white); margin-bottom: var(--space-2); }
    .sign-hero__dates { color: var(--color-gold); font-size: var(--text-sm); letter-spacing: 0.14em; text-transform: uppercase; }
    .sign-hero__keyword {
      font-family: var(--font-display); font-style: italic; font-size: 1.05rem;
      color: rgba(239, 227, 192, 0.82); margin: var(--space-3) 0 0; letter-spacing: 0.04em;
    }
    body[data-element="fire"] .sign-hero::before {
      content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(180, 66, 50, 0.08) 0%, transparent 70%);
    }
    body[data-element="earth"] .sign-hero::before {
      content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(14, 92, 58, 0.08) 0%, transparent 70%);
    }
    body[data-element="air"] .sign-hero::before {
      content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(168, 142, 88, 0.07) 0%, transparent 70%);
    }
    body[data-element="water"] .sign-hero::before {
      content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 30%, rgba(74, 122, 138, 0.09) 0%, transparent 70%);
    }
    .sign-hero__inner, .sign-hero h1 { position: relative; z-index: 1; }
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
    .sign-thumb-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
      gap: var(--space-3); max-width: 820px; margin: 0 auto;
    }
    .sign-thumb {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      text-decoration: none; transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
    }
    .sign-thumb img {
      width: 100%; max-width: 92px; aspect-ratio: 2 / 3; object-fit: cover; object-position: center top;
      border-radius: 9px; border: 1px solid rgba(201,162,39,0.28);
      box-shadow: 0 6px 22px rgba(0,0,0,0.5), 0 0 16px rgba(201,162,39,0.06);
      transition: border-color 0.22s, box-shadow 0.22s;
    }
    .sign-thumb:hover { transform: translateY(-4px); }
    .sign-thumb:hover img {
      border-color: rgba(201,162,39,0.55);
      box-shadow: 0 10px 30px rgba(0,0,0,0.58), 0 0 22px rgba(201,162,39,0.14);
    }
    .sign-thumb__label {
      font-size: 0.56rem; letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--color-silver-dim); text-align: center; line-height: 1.3;
    }
    .sign-thumb:hover .sign-thumb__label { color: var(--color-gold-pale); }
    .sign-thumb--current img { border-color: rgba(201,162,39,0.65); box-shadow: 0 0 20px rgba(201,162,39,0.2); }
    .daily-reading__overview { color: var(--color-silver); line-height: 1.85; font-size: 1.05rem; margin-bottom: var(--space-6); font-family: var(--font-display); }
    .daily-reading__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-5); }
    .daily-reading__tile {
      padding: var(--space-4); background: rgba(201,162,39,0.06);
      border: 1px solid rgba(201,162,39,0.18); border-radius: var(--radius-lg);
    }
    .daily-reading__tile-label {
      font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--color-gold); margin-bottom: 6px; display: block;
    }
    .daily-reading__tile-text { font-size: var(--text-sm); color: var(--color-silver); line-height: 1.65; margin: 0; }
    .daily-reading__meta { display: flex; gap: var(--space-6); flex-wrap: wrap; font-size: var(--text-sm); color: var(--color-silver-dim); }
    .daily-reading__meta strong { color: var(--color-gold); font-weight: 600; }
    .daily-reading__note { font-size: 0.62rem; letter-spacing: 0.08em; color: var(--color-silver-dim); margin-top: var(--space-4); text-align: center; }
    .glance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-4); max-width: 760px; margin: 0 auto; }
    .glance-cell { padding: var(--space-4); background: rgba(201,162,39,0.06); border: 1px solid rgba(201,162,39,0.18); border-radius: var(--radius-lg); }
    .glance-cell__label { font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-silver-dim); display: block; margin-bottom: 6px; }
    .glance-cell__value { font-family: var(--font-display); color: var(--color-gold-pale); font-size: var(--text-base); line-height: 1.4; }
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
      <div class="sign-hero__inner">
        <img class="sign-hero__card-img" src="assets/images/zodiac-cards/${s.key}.jpg"
          alt="${s.name} — AstroPrecise engraved zodiac card"
          width="230" height="345" loading="eager" decoding="async" />
        <div class="sign-hero__content">
          <div class="sign-hero__constellation">${CONSTELLATIONS[s.key] || ('<span class="sign-hero__glyph" aria-hidden="true">' + s.glyph + '</span>')}</div>
          <h1 id="page-title">${s.name}</h1>
          <p class="sign-hero__dates">${s.dates}</p>
          <p class="sign-hero__keyword" aria-label="Sign keyword">“${s.keyword}”</p>
          <div class="sign-facts">
            <div class="sign-fact"><span class="sign-fact__label">Element</span><span class="sign-fact__value">${s.element}</span></div>
            <div class="sign-fact"><span class="sign-fact__label">Modality</span><span class="sign-fact__value">${s.modality}</span></div>
            <div class="sign-fact"><span class="sign-fact__label">Ruler</span><span class="sign-fact__value">${s.ruler}</span></div>
            <div class="sign-fact"><span class="sign-fact__label">Symbol</span><span class="sign-fact__value">${s.symbol}</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="today-heading">
      <div class="container">
        <h2 class="section__title" id="today-heading">${s.name} Horoscope Today</h2>
        <p class="section__subtitle" id="today-date" aria-live="polite"></p>
        <p class="section__subtitle" style="font-size:0.78rem;opacity:0.75;margin-top:var(--space-2);">Computed from live planetary positions — same VSOP87 engine as the orrery</p>
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

    <section class="section section--alt" aria-labelledby="friendship-heading">
      <div class="container">
        <h2 class="section__title" id="friendship-heading">${s.name} as a Friend</h2>
        <p class="prose-block">${s.friendship}</p>
      </div>
    </section>

    <section class="section" aria-labelledby="shadow-heading">
      <div class="container">
        <h2 class="section__title" id="shadow-heading">The ${s.name} Shadow Side</h2>
        <p class="prose-block">${s.shadow}</p>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="growth-heading">
      <div class="container">
        <h2 class="section__title" id="growth-heading">${s.name} Growth &amp; the Inner Path</h2>
        <p class="prose-block">${s.growth}</p>
      </div>
    </section>

    <section class="section" aria-labelledby="glance-heading">
      <div class="container">
        <h2 class="section__title" id="glance-heading">${s.name} at a Glance</h2>
        <div class="glance-grid">
          <div class="glance-cell"><span class="glance-cell__label">Symbol</span><span class="glance-cell__value">${s.glyph} &nbsp;${s.symbol}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Dates</span><span class="glance-cell__value">${s.dates}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Element</span><span class="glance-cell__value">${s.element}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Modality</span><span class="glance-cell__value">${s.modality}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Ruling Planet</span><span class="glance-cell__value">${s.ruler}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Polarity</span><span class="glance-cell__value">${s.polarity}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Body Part</span><span class="glance-cell__value">${s.bodyPart}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Tarot</span><span class="glance-cell__value">${s.tarot}</span></div>
          <div class="glance-cell"><span class="glance-cell__label">Keyword</span><span class="glance-cell__value">“${s.keyword}”</span></div>
        </div>
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
        <h2 class="section__title" style="font-size:var(--text-lg);">Explore Every Sign</h2>
        <p class="section__subtitle" style="margin-bottom:var(--space-6);">Tap a card to open that sign's daily reading and full profile</p>
        <div class="sign-thumb-grid" role="list">
          ${SIGNS.map(o => `<a href="${o.key}.html" class="sign-thumb${o.key === s.key ? ' sign-thumb--current' : ''}" role="listitem" aria-label="${o.name} horoscope and guide${o.key === s.key ? ' (current page)' : ''}"><img src="assets/images/zodiac-cards/${o.key}.jpg" alt="" width="92" height="138" loading="lazy" decoding="async" /><span class="sign-thumb__label">${o.glyph} ${o.name}</span></a>`).join('\n          ')}
        </div>
      </div>
    </section>

  </main>

  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer__bottom">
        <p>&copy; 2026 AstroPrecise · All calculations run locally in your browser · No data collected</p>
      </div>
    </div>
  </footer>

  <script src="js/raf-core.js"></script>
  <script src="js/cosmos.js"></script>
  <script src="js/sign-daily.js"></script>
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
        '<p class="daily-reading__overview">' + d.overview + '</p>' +
        '<div class="daily-reading__grid">' +
        '<div class="daily-reading__tile"><span class="daily-reading__tile-label">Love</span><p class="daily-reading__tile-text">' + d.love + '</p></div>' +
        '<div class="daily-reading__tile"><span class="daily-reading__tile-label">Career</span><p class="daily-reading__tile-text">' + d.career + '</p></div>' +
        '<div class="daily-reading__tile"><span class="daily-reading__tile-label">Wellness</span><p class="daily-reading__tile-text">' + d.health + '</p></div>' +
        '</div>' +
        '<div class="daily-reading__meta">' +
        '<span>Lucky Number <strong>' + d.luckyNumber + '</strong></span>' +
        '<span>Lucky Color <strong>' + d.luckyColor + '</strong></span>' +
        '</div>' +
        '<p class="daily-reading__note">Deterministic for this date — refresh tomorrow for a new reading</p>' +
        '</div>';
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
