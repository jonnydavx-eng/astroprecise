/**
 * AstroPrecise — Astrological Interpretations
 * Deterministic text generation for planets, signs, houses, and aspects.
 */

'use strict';

const _planetInSign = {
  sun: {
    aries: "The Sun in Aries forges an identity built on courage, initiative, and the thrill of being first. These individuals experience themselves most fully when breaking new ground, leading others, or meeting a challenge head-on. Their life purpose centers on developing authentic selfhood through bold, direct action rather than compromise. The ego is vigorous and competitive, demanding continual proof of its own vitality.",
    taurus: "The Sun in Taurus builds identity through steadiness, sensory pleasure, and the patient accumulation of what endures. These individuals know themselves best when they are productive, surrounded by beauty, and grounded in physical comfort. Their life purpose involves demonstrating that true strength lies in persistence and the cultivation of lasting value. The ego is serene under ordinary conditions but immovable when its security is threatened.",
    gemini: "The Sun in Gemini expresses identity through curiosity, wit, and the constant exchange of ideas. These individuals discover who they are in the act of communicating — gathering information, making connections, and adapting to whatever context they inhabit. Their life purpose involves serving as a bridge between people and perspectives, translating complexity into accessible insight. The ego is versatile and youthful, though it must eventually reconcile its many facets into a coherent self.",
    cancer: "The Sun in Cancer anchors identity in family, memory, and the emotional bonds that give life meaning. These individuals experience their truest self through nurturing others and tending to the spaces — physical and emotional — that feel like home. Their life purpose is tied to cultivating belonging and carrying forward the wisdom of the past. The ego is sensitive and protective, constructing elaborate inner worlds as a refuge against a sometimes harsh outer landscape.",
    leo: "The Sun in Leo burns with the need to shine, create, and be recognized for the unique radiance it brings to the world. These individuals are most themselves when they occupy center stage — not merely for applause, but to share genuine warmth and inspiration with others. Their life purpose involves mastering the art of joyful self-expression and generous leadership. The ego is proud and magnanimous, flourishing when admired but withering under indifference.",
    virgo: "The Sun in Virgo builds identity through discernment, usefulness, and the relentless refinement of craft. These individuals know themselves through the quality of their work and their capacity to analyze, improve, and serve with precision. Their life purpose involves understanding the difference between the ideal and the real, and closing that gap with skill and humility. The ego is modest in presentation but quietly exacting in its standards, measuring worth through contribution rather than recognition.",
    libra: "The Sun in Libra seeks identity through relationship, aesthetic harmony, and the cultivation of fairness. These individuals discover who they are in the mirror of partnership, and their sense of self is intimately shaped by the quality of their connections. Their life purpose involves learning to balance the needs of the self with those of others without losing either in the process. The ego is charming and socially graceful, though it must guard against indecisiveness and the tendency to define itself entirely through others' approval.",
    scorpio: "The Sun in Scorpio forges identity in the crucible of depth, transformation, and unflinching confrontation with what is hidden. These individuals experience themselves most fully when they are engaged with matters of power, intimacy, or psychological truth. Their life purpose involves repeated cycles of destruction and renewal — stripping away the inauthentic to reveal what is indestructible at the core. The ego is intense and penetrating, compelling others to take them seriously even when they prefer to operate in shadow.",
    sagittarius: "The Sun in Sagittarius expands identity through adventure, philosophy, and the pursuit of greater meaning. These individuals know themselves best when they are moving — physically across the globe or intellectually across vast conceptual landscapes. Their life purpose centers on seeking and transmitting truth, whether through teaching, travel, or the lived example of a spirited, examined life. The ego is buoyant and freedom-loving, occasionally mistaking restlessness for wisdom.",
    capricorn: "The Sun in Capricorn constructs identity through ambition, discipline, and the long, deliberate ascent toward mastery. These individuals understand themselves through their achievements and the respect they earn within the structures they inhabit. Their life purpose involves building something enduring — a legacy, an institution, a body of expertise — that outlasts the self. The ego is controlled and pragmatic, armored against vulnerability and driven by an inner authority that demands continuous proof of competence.",
    aquarius: "The Sun in Aquarius crystallizes identity around ideals, originality, and a sense of belonging to humanity's future rather than its past. These individuals know themselves through their principles, their rebellion against convention, and their capacity to envision what society could become. Their life purpose involves contributing to collective progress by championing the unconventional and refusing comfortable orthodoxies. The ego is paradoxically detached — genuinely caring about humanity in the abstract while sometimes remaining emotionally elusive in the particular.",
    pisces: "The Sun in Pisces dissolves the boundaries of the self in order to merge with something larger — art, spirituality, compassion, or the oceanic depths of the unconscious. These individuals are most truly themselves when surrendering to creative flow or empathic connection, even as this makes stable self-definition elusive. Their life purpose involves learning to translate mystical sensitivity into earthly service without losing themselves in the process. The ego is permeable and imaginative, oscillating between transcendent beauty and the confusion of having no firm edges.",
  },
  moon: {
    aries: "The Moon in Aries reacts to life with immediacy and instinctive fire — emotions arrive fast, burn bright, and dissipate quickly. These individuals feel safe when they are moving, competing, or taking independent action; dependency triggers discomfort or outright aggression. Their emotional comfort comes from the freedom to act on impulse and from relationships that honor their need for autonomy. Nurturing others often takes the form of energizing encouragement rather than soft, sustained holding.",
    taurus: "The Moon in Taurus finds emotional security in physical constancy — reliable routines, sensory pleasure, and the reassuring presence of beauty and abundance. These individuals calm themselves through touch, food, nature, and the company of people who won't suddenly change the rules. Emotional disruptions are processed slowly and thoroughly; the inner landscape is fertile and patient but resistant to being rushed or destabilized. Their nurturing instinct expresses itself through practical provision — feeding, sheltering, and offering steady, undemonstrative loyalty.",
    gemini: "The Moon in Gemini processes feelings by talking about them, analyzing them, and weaving them into narrative. These individuals are emotionally comfortable in environments rich with conversation and intellectual stimulation; silence and emotional heaviness feel suffocating. Their moods shift with mercurial speed, and they instinctively reach for language as a way to manage what might otherwise feel overwhelming. Nurturing others means staying curious and engaged, offering wit and information in place of brooding empathy.",
    cancer: "The Moon in Cancer occupies its home sign, intensifying every lunar quality — emotional sensitivity, nurturing instinct, and the gravitational pull of memory. These individuals feel safest in intimate domestic spaces filled with trusted people; the outer world's unpredictability is kept at bay by thick emotional walls. Their moods rise and fall with the tides of those around them, and they absorb others' feelings almost involuntarily. They nurture with total devotion and expect the same depth of attachment in return.",
    leo: "The Moon in Leo requires warmth, admiration, and the reassurance that they are seen and cherished to feel emotionally secure. These individuals soothe themselves through creative expression, playful performance, and the company of people who make them feel special. Their emotional reactions tend toward the dramatic — feelings are worn openly and with theatrical flair. Nurturing others looks like generous celebration of those they love, though they need recognition for this generosity to sustain it.",
    virgo: "The Moon in Virgo processes emotions through analysis and problem-solving, finding comfort in order, competence, and purposeful work. These individuals feel most settled when they have a clear sense of what needs to be done and the ability to do it well; disorder and inefficiency generate anxiety. Their inner world can be self-critical and prone to worry, as the lunar impulse to feel is filtered through Virgo's relentless discernment. They nurture through acts of precise service — noticing details, anticipating needs, and quietly fixing what is broken.",
    libra: "The Moon in Libra seeks emotional equilibrium through harmony, aesthetic pleasure, and the feeling of being in a balanced, fair relationship. These individuals are soothed by beauty, refined surroundings, and the sense that those around them are at peace; conflict and ugliness feel genuinely destabilizing. Their emotions are attuned to others, and they instinctively adjust their inner weather to match the relational climate. Nurturing takes the form of mediation, consideration, and the creation of environments where everyone feels comfortable.",
    scorpio: "The Moon in Scorpio experiences emotion with volcanic intensity — feelings are total, private, and slow to extinguish once ignited. These individuals feel safest only after they have tested a relationship's capacity to survive crisis and betrayal; superficiality is emotionally intolerable. Their inner world is rich with psychological complexity and an almost forensic need to understand what lies beneath the surface. They nurture through fierce protectiveness and an unflinching willingness to accompany those they love into the darkest places.",
    sagittarius: "The Moon in Sagittarius finds emotional safety in freedom, optimism, and the sense that the horizon is always open. These individuals soothe themselves through travel, learning, outdoor activity, and philosophical inquiry — anything that expands rather than contracts their world. Emotional confinement, obligation, and excessive neediness trigger a reflexive push toward escape. Their nurturing style is enthusiastic and inspirational, offering adventure and perspective rather than containment and sympathy.",
    capricorn: "The Moon in Capricorn instinctively manages emotions through control, practicality, and a deep-seated belief that self-sufficiency is the only reliable safety. These individuals find comfort in structure, achievement, and the quiet dignity of handling difficulties without losing composure. Vulnerability feels exposing and risky; feelings are processed internally over long periods before being acknowledged outwardly. Their nurturing is expressed through provision, responsibility, and a steady, if somewhat formal, reliability that others can set their clocks by.",
    aquarius: "The Moon in Aquarius processes feelings through intellectual detachment and a preference for emotional concepts over raw emotional experience. These individuals feel most settled when they are part of a community aligned around shared ideals, and most unsettled when their freedom or uniqueness is constrained. The emotional world is wide rather than deep here — genuine care for collective humanity coexists with difficulty in surrendering to personal intimacy. Nurturing others means respecting their individuality absolutely and treating them as intellectual equals.",
    pisces: "The Moon in Pisces experiences emotion as an oceanic, boundaryless field in which the self and others are barely distinguishable. These individuals are soothed by music, solitude, spiritual practice, and any experience that allows them to dissolve out of ordinary reality for a while. Their sensitivity is extraordinary and largely involuntary; they absorb the emotional atmosphere of a room the way a sponge absorbs water. Their nurturing is compassionate to the point of self-sacrifice, and learning to protect their own emotional reserves is a lifelong undertaking.",
  },
  mercury: {
    aries: "Mercury in Aries thinks quickly, speaks bluntly, and arrives at conclusions before others have finished reading the question. This is a mind that leads with assertion rather than deliberation, preferring the momentum of a decisive idea to the caution of a perfectly qualified one. Communication is direct, sometimes combative, and always animated by competitive energy. Learning happens best through action and immediate challenge rather than patient, sequential study.",
    taurus: "Mercury in Taurus thinks slowly, deliberately, and in deeply sensory terms — ideas are turned over like stones in the hand until their texture and weight are fully known. This placement produces a mind resistant to being rushed or changing course once a position has been adopted. Communication is measured, practical, and grounded in concrete evidence; abstract speculation without tangible application holds little appeal. Learning proceeds through repetition and hands-on engagement, building knowledge as solidly as a wall laid brick by careful brick.",
    gemini: "Mercury in Gemini occupies its home sign and expresses the full range of its native gifts: rapid-fire association, linguistic dexterity, and an insatiable appetite for information across every domain. This mind moves at speed, making leaps of connection that others can barely follow, and it is at its best in environments that reward agility over depth. Communication is witty, multi-layered, and sometimes deliberately ambiguous — the playfulness of language is a pleasure in itself. The challenge is sustaining attention long enough to develop genuine mastery rather than perpetual fluency.",
    cancer: "Mercury in Cancer thinks in images, memories, and emotional associations rather than logical propositions. This is an intuitive, receptive mind that retains what it learns by connecting it to personal experience, and it communicates with empathy and attunement to the emotional subtext of every exchange. Ideas and moods are closely entangled; a negative environment can genuinely impair cognitive function, while a supportive one unlocks remarkable perceptiveness. Learning works best when the material has personal meaning or is embedded in narrative and relationship.",
    leo: "Mercury in Leo thinks dramatically and speaks with authority, gravitating toward the grand narrative rather than the careful footnote. This mind enjoys performing its ideas — teaching, persuading, entertaining — and communication is naturally theatrical, warm, and designed to make an impression. There is creative originality here, a willingness to express perspectives boldly and stake a claim rather than hedge indefinitely. The shadow side is a difficulty entertaining the possibility of being wrong, since ideas become personal statements rather than provisional hypotheses.",
    virgo: "Mercury in Virgo occupies its exaltation and second home sign, producing a mind of extraordinary analytical precision and practical intelligence. Every detail is noticed, catalogued, and assessed for quality; the thinking is exacting, methodical, and genuinely committed to accuracy over comfort. Communication tends toward the specific and the qualified — vague generalities are intellectually offensive, and imprecision in others triggers genuine frustration. This placement yields masterful editors, diagnosticians, and craftspeople of language, provided the self-critical faculty doesn't collapse into paralytic perfectionism.",
    libra: "Mercury in Libra thinks in terms of balance, comparison, and the weighing of perspectives — it is the mind of the diplomat and the aesthetician, seeking the fairest formulation and the most harmonious phrasing. This placement produces elegant, persuasive communication that carefully acknowledges multiple sides before arriving at a considered judgment. The shadow is chronic indecision, as the mind keeps finding new considerations that reopen what appeared to be settled. Learning works best in dialogue and debate, where other minds provide the friction needed to reach a conclusion.",
    scorpio: "Mercury in Scorpio probes, investigates, and refuses to accept surface explanations for anything. This is a mind drawn to secrets, depths, and the psychological truth beneath the socially acceptable story — and it communicates with precision designed to pierce rather than charm. Silences are used strategically; words are chosen for their power and retained as leverage. Learning is driven by obsessive curiosity about forbidden or hidden subjects, and the intellectual style tends toward the penetrating analysis rather than the broad survey.",
    sagittarius: "Mercury in Sagittarius thinks in panoramas rather than close-ups, leaping from insight to principle to universal truth with the enthusiasm of a philosopher on horseback. This mind loves ideas for their scope and their implications, and communicates with contagious conviction and a gifted ability to synthesize disparate material into a coherent worldview. The weakness is a tendency toward overstatement, intellectual overreach, and impatience with the fine print that every grand theory must eventually survive. Learning accelerates through travel, foreign languages, and cross-cultural exposure.",
    capricorn: "Mercury in Capricorn thinks pragmatically, systematically, and with an eye fixed always on what is measurable and achievable. This is a disciplined, authoritative mind that builds arguments the way an engineer builds structures — load-bearing, economical, and designed to last. Communication is formal, carefully considered, and shorn of decoration; words are used to convey information, not to perform. Learning is approached as a long-term investment, and expertise accumulated over time earns genuine respect from this placement.",
    aquarius: "Mercury in Aquarius thinks originally, contrarily, and always a few steps ahead of the consensus. This is a mind that is most alive when it is overturning assumptions, formulating unconventional theories, or finding the logical flaw in what everyone else takes for granted. Communication is brilliant but sometimes deliberately abstract, more concerned with the architecture of an idea than with making it emotionally accessible. Learning is driven by intellectual freedom and the pleasure of independent inquiry; groupthink and received authority are actively resisted.",
    pisces: "Mercury in Pisces thinks in symbols, dreams, and intuitive impressions that arrive whole rather than assembled step by step. This is a poetic, imaginative mind that communicates through metaphor and image, often conveying emotional truth more clearly than literal fact. The boundary between inner vision and outer information is porous, which can produce remarkable creative synthesis or unreliable attention to concrete detail. Learning works best when rooted in meaning and atmosphere; rote memorization of data without narrative context is genuinely difficult for this placement.",
  },
  venus: {
    aries: "Venus in Aries loves with immediacy and boldness — attraction announces itself as urgent demand, and the pursuit of a desired object is followed with athletic, almost combative enthusiasm. In love, these individuals are passionate and spontaneous, but they require a partner willing to be chased rather than one who collapses into instant availability. Beauty is experienced as something vital and charged; aesthetics tend toward the striking and the primary rather than the subtle and complex. The challenge is sustaining desire through the slow work of intimacy once the thrill of conquest has passed.",
    taurus: "Venus in Taurus occupies one of its home signs and expresses its full sensory richness: these individuals love through touch, loyalty, and the patient, unhurried cultivation of lasting pleasure. They are attracted to quality, beauty, and the comfort of enduring presence; their aesthetic sensibility is refined and classically grounded, drawn to the voluptuous and the material. In relationships, they offer tremendous stability and physical attentiveness, but possessiveness and resistance to change can become real obstacles. Their values are earthy and concrete — they know what they want and they know its worth.",
    gemini: "Venus in Gemini is charmed by wit, intelligence, and the electric current of stimulating conversation. These individuals fall for minds first, and the beloved must be a source of perpetual novelty and mental engagement to hold their interest over time. Their love style is playful, flirtatious, and light on ceremony; they express affection through clever communication and a gift for making partners feel intellectually delightful. Their aesthetic sensibility is eclectic and curious, drawn to the interesting over the classically beautiful.",
    cancer: "Venus in Cancer loves with tender devotion and deep emotional investment, seeking relationships that feel like home. These individuals are attracted to nurturing dynamics, nostalgic beauty, and partners who offer genuine emotional safety and reciprocal vulnerability. Their love language is attentiveness and care — anticipating needs, creating comfort, and building a shared private world of accumulated meaning. They are loyal to a fault and can struggle to release relationships that have long since stopped serving them.",
    leo: "Venus in Leo loves grandly, generously, and with a flair for romance that demands to be noticed. These individuals are attracted to warmth, confidence, and partners who appreciate being adored and who adore in return with equal enthusiasm. Their aesthetic is bold, theatrical, and opulent — they gravitate toward beauty that commands attention and signals distinction. In relationships they give lavishly, but they require equally lavish appreciation in return; feeling taken for granted is the one thing Venus in Leo genuinely cannot endure.",
    virgo: "Venus in Virgo expresses love through practical service, careful attention to detail, and a quietly devoted helpfulness that can easily go unnoticed precisely because it is so consistent. These individuals are attracted to intelligence, competence, and a certain clean aesthetic order; they love by doing the difficult, unglamorous things that keep a life running well. Their sensibility is refined and restrained rather than showy — they appreciate craftsmanship, precision, and the subtle beauty of things that work exactly as they should. The challenge is allowing themselves to receive care as gracefully as they give it.",
    libra: "Venus in Libra occupies its second home sign and expresses love as an art form — refined, balanced, and exquisitely attuned to the give and take of genuine partnership. These individuals are attracted to beauty, elegance, and the harmonious interplay of complementary temperaments; they have an instinctive understanding of what makes a relationship function with grace. Their aesthetic sensibility is impeccably developed, drawn to classical beauty and the satisfaction of perfect proportion. The shadow is a tendency to avoid necessary conflict in order to preserve surface harmony, letting resentment accumulate beneath a placid exterior.",
    scorpio: "Venus in Scorpio loves with consuming intensity — these individuals seek total merger, absolute fidelity, and the kind of transformative intimacy that permanently alters both parties. They are attracted to depth, power, and a certain dangerous magnetism; the safely pleasant holds no allure compared to the genuinely complex. Their aesthetic tends toward the dark, the mysterious, and the erotically charged. In love they are fiercely loyal and equally fierce in their jealousy, and they approach relationships as investigations into the absolute truth of another person.",
    sagittarius: "Venus in Sagittarius loves freely, adventurously, and with a philosophical view of relationships as journeys of mutual expansion. These individuals are attracted to partners who are intellectually or culturally unlike them, offering access to new worlds of experience or belief. Their love style is enthusiastic and straightforward — they express affection through shared adventure, laughter, and honest exchange rather than romantic subtlety. Their aesthetic is drawn to the exotic, the expansive, and the culturally rich; beauty is found in the broad and the far-flung rather than the intimate and local.",
    capricorn: "Venus in Capricorn loves with long-term seriousness, valuing commitment, shared ambition, and the quiet satisfaction of building a life of substance together. These individuals are attracted to competence, maturity, and partners who represent genuine social or professional standing; they are unlikely to invest emotionally where they see no durable future. Their love language is reliability and provision rather than effusive sentiment; they show devotion by doing what needs to be done year after year without complaint. Their aesthetic is classic, restrained, and quality-conscious — they prefer the enduring to the fashionable.",
    aquarius: "Venus in Aquarius loves with intellectual detachment and a fierce commitment to individual freedom within relationship. These individuals are attracted to the unusual, the intellectually stimulating, and the genuinely unconventional; they form bonds over shared ideals and the excitement of mental sparring. Emotional possessiveness and conventional romantic expectations feel suffocating to this placement; they love best in relationships structured around friendship, equality, and mutual respect for autonomy. Their aesthetic is original, sometimes eccentric, drawn to the avant-garde and the conceptually daring.",
    pisces: "Venus in Pisces loves with boundless compassion, romantic idealism, and a mystical longing for union that transcends the ordinary limitations of selfhood. These individuals are attracted to sensitivity, creativity, and a certain ethereal quality that suggests spiritual depth; they seek in love what others seek in religion. Their aesthetic is dreamy and otherworldly, drawn to beauty that evokes the numinous rather than the merely pleasing. The challenge is that idealization can prevent them from seeing partners clearly, and the dissolution of self in love can make discernment about suitability genuinely difficult.",
  },
  mars: {
    aries: "Mars in Aries occupies its home sign and expresses its full primal power: raw initiative, athletic courage, and a drive that requires no external justification and tolerates no significant delay. These individuals act from instinct and compete by reflex, bringing a physical vitality and decisive energy to every arena. Sexually, the approach is direct, urgent, and uncomplicated by excessive sentiment — desire announces itself and expects immediate response. Anger erupts quickly and completely, but burns out with equal speed, leaving no residual grudge.",
    taurus: "Mars in Taurus applies its drive with deliberate, unrelenting patience — this is not a sprinter's energy but the irresistible force of something that simply will not stop. These individuals pursue goals methodically and without drama, sustaining effort long after others have abandoned the field in frustration. Sexually, they are sensual, enduring, and intensely physical, drawn to pleasure that unfolds slowly and saturates the body completely. Anger is slow to ignite but genuinely dangerous once it reaches critical mass, emerging as cold, implacable stubbornness or a sudden explosion of accumulated pressure.",
    gemini: "Mars in Gemini drives through words, ideas, and the strategic deployment of information. These individuals pursue their goals through communication — persuasion, negotiation, and the clever manipulation of narrative — and their energy is most effective in intellectually demanding environments. Their physical style is quick and light rather than powerful, and they typically excel in activities requiring coordination and mental agility over raw strength. Sexually, mental arousal precedes physical; conversation and wit are genuine foreplay. Anger is expressed verbally — sharply, skillfully, and sometimes with a precision that leaves lasting marks.",
    cancer: "Mars in Cancer drives through emotional motivation and protective instinct rather than straightforward ambition. These individuals are most effectively energized when acting in defense of those they love or in pursuit of goals that feel personally meaningful at a deep level; abstract objectives leave them unmoved. Their approach to conflict is indirect — they maneuver, retreat, and circle back rather than charging ahead, and they can be surprisingly tenacious once their emotional security is at stake. Sexually, they need emotional safety and genuine connection before physical drive can fully express itself.",
    leo: "Mars in Leo pursues its objectives with dramatic flair, creative passion, and the unshakeable confidence of someone who believes they were born to win. These individuals are energized by recognition and competition, and they bring a theatrical commitment to everything they do. Their leadership style is bold and inspiring, and they fight most fiercely for matters of personal pride and creative vision. Sexually, they are generous, performative, and ardent, bringing a romantic extravagance to physical expression. Anger is grand and declarative — a spectacle of offended dignity rather than cold hostility.",
    virgo: "Mars in Virgo channels its drive into precision, craft, and a relentless commitment to doing things correctly. These individuals apply energy in measured, efficient increments, directing effort toward the elimination of flaws and the improvement of systems. They compete through competence rather than aggression, and their most powerful form of assertiveness is an exacting, uncompromising standard. Sexually, they are attentive and technique-conscious, taking genuine pleasure in mastering the art of giving pleasure. Frustration is expressed as sharp, itemized criticism rather than explosive rage.",
    libra: "Mars in Libra pursues its goals through charm, negotiation, and the strategic alignment of competing interests. These individuals find direct confrontation aesthetically disagreeable and prefer to achieve their objectives through persuasion and social intelligence. This placement filters Martian directness through Libran indirection — the result is a subtle and effective ability to get what is wanted while appearing eminently reasonable. Sexually, they are romantic and partner-focused, most aroused when the relational dynamic feels balanced and mutually pleasurable. Anger emerges as passive resistance and the elegant withdrawal of cooperation.",
    scorpio: "Mars in Scorpio pursues its objectives with strategic intensity, psychological depth, and a patience that can wait years for the right moment. These individuals are driven by desire in its fullest sense — not merely physical appetite but the hunger for power, control, and transformative experience. Their energy is focused and relentless, directed below the surface rather than announced in advance. Sexually, they bring total intensity and an almost research-quality curiosity about the depths of erotic experience. Anger is cold, strategic, and expressed through actions rather than words — this placement does not forget.",
    sagittarius: "Mars in Sagittarius pursues its goals with optimistic, bounding energy and an enthusiasm that treats every obstacle as a new adventure. These individuals are driven by the call of the horizon — they need space, movement, and the sense that their efforts are expanding their world in some meaningful direction. Their approach is direct and honest, sometimes to the point of tactlessness, and they lose energy quickly when confined or required to deal with tedious logistics. Sexually, they are adventurous and freedom-loving, treating physical experience as another form of exploration. Anger is explosive and quickly articulated, then just as quickly released.",
    capricorn: "Mars in Capricorn occupies its exaltation, expressing its drive through long-term strategy, disciplined effort, and an ambition that builds steadily toward enduring achievement. These individuals apply their energy with executive precision — resources are allocated, steps are sequenced, and nothing is wasted on emotional volatility. The pursuit of status and mastery is deeply motivating, and they sustain effort through years of unrewarded work on the basis of knowing where they are going. Sexually, they are controlled and deliberate, with enduring physical stamina. Anger is expressed through withdrawal and the cold, efficient removal of support.",
    aquarius: "Mars in Aquarius drives toward collective goals and the disruption of systems that limit human freedom. These individuals are energized by rebellion, innovation, and the prospect of doing something unprecedented; conventional channels of competition hold little appeal. Their energy is intellectual and erratic — they can be brilliantly forceful in the service of a cause, then strangely disengaged when required to sustain routine effort. Sexually, they are experimental and emotionally detached, approaching physical experience with the curiosity of a researcher. Anger is expressed as sudden, sharp departure and the principled refusal to participate.",
    pisces: "Mars in Pisces pursues its goals through fluid, indirect, and creatively responsive movement rather than linear advance. These individuals apply energy intuitively, following the current of feeling and inspiration rather than a fixed plan, and they are most effective when working in service of something larger than personal ambition. Their drive dissolves easily under conditions of psychic or emotional overwhelm, and they need periodic retreat to restore the reserves that will power their next effort. Sexually, they are imaginative, empathic, and capable of profound erotic and spiritual intimacy. Anger tends to leak out indirectly through passivity, withdrawal, or sudden, unexplained evasion.",
  },
  jupiter: {
    aries: "Jupiter in Aries expands through bold initiative, entrepreneurial risk-taking, and the enthusiastic embrace of new beginnings. These individuals find their greatest luck and growth when they act first, lead courageously, and trust the generative power of their own instincts. Philosophy is lived rather than studied — this Jupiter believes in the body's wisdom and the righteousness of decisive action. The shadow is a tendency toward overconfidence and the abandonment of good ideas the moment they require patient development.",
    taurus: "Jupiter in Taurus expands through abundance, sensory pleasure, and the patient, steady accumulation of material and natural wealth. These individuals attract good fortune through reliability, craftsmanship, and a genuine appreciation for the richness of earthly life. Their philosophical outlook tends toward pragmatic generosity — the belief that prosperity shared is prosperity multiplied. The shadow is a tendency toward excess in consumption and a reluctance to take the financial risks that larger opportunity requires.",
    gemini: "Jupiter in Gemini expands through learning, communication, and the joyful accumulation of ideas across every conceivable domain. These individuals find luck in information, travel, teaching, and the unexpected connections between disparate fields. Their philosophy is pluralistic and curious — they believe that more perspectives are always better than fewer. The shadow is a tendency toward intellectual diffusion, accumulating knowledge without integrating it into anything that could constitute genuine wisdom.",
    cancer: "Jupiter in Cancer occupies its exaltation, expanding through the deep wells of emotional generosity, familial loyalty, and the creation of safe, nurturing spaces for community. These individuals attract abundance through acts of care and through trusting their emotional intuitions about when and how to grow. Their philosophy is rooted in belonging, ancestry, and the sacred importance of sustaining the networks of mutual support that make human life bearable. The shadow is over-protectiveness and a tendency to expand the boundaries of home until they exclude necessary challenge.",
    leo: "Jupiter in Leo expands through creative expression, generous leadership, and the radiant sharing of gifts with an appreciative audience. These individuals find luck in performance, teaching, and the demonstration of authentic passion; their magnanimity attracts loyal supporters and fortunate opportunities. Philosophy here tends toward the celebration of individual greatness and the belief that joy is a legitimate spiritual path. The shadow is extravagance, self-aggrandizement, and the conflation of personal desire with universal principle.",
    virgo: "Jupiter in Virgo expands through mastery of craft, dedicated service, and the steady improvement of systems that allow complex things to work well. These individuals find luck in the details — the small, overlooked improvements that compound into transformative efficiency over time. Their philosophy is practical and quietly idealistic, believing that meaningful contribution is the most reliable path to personal and collective flourishing. The shadow is a tendency to shrink opportunities through excessive qualification and to lose the forest of abundance in the trees of imperfection.",
    libra: "Jupiter in Libra expands through partnership, legal and social justice, and the cultivation of relationships that generate genuine mutual benefit. These individuals attract good fortune through fairness, diplomacy, and a genuine talent for creating agreements that satisfy competing interests. Their philosophy centers on the belief that beauty, balance, and equity are not luxuries but moral necessities. The shadow is indecision about which opportunities to pursue and a tendency to over-rely on partnership while neglecting independent initiative.",
    scorpio: "Jupiter in Scorpio expands through psychological depth, transformative crisis, and the courageous investigation of what others refuse to examine. These individuals find luck in inheritance, investment, shared resources, and any domain requiring penetrating analysis and sustained commitment. Their philosophy is that genuine growth requires the death of something — an illusion, a limitation, a comfortable lie — before the new can be born. The shadow is obsession, the refusal to release what has served its purpose, and a tendency to experience intensity as its own reward.",
    sagittarius: "Jupiter in Sagittarius occupies its home sign and expresses its expansive nature without restriction: a philosophy of radical optimism, an appetite for wisdom across cultures and traditions, and a genuine faith that the universe bends toward abundance. These individuals find luck through travel, teaching, publication, and the generous sharing of their vision. Their philosophical conviction is genuinely inspiring and can expand the horizons of everyone they encounter. The shadow is dogmatism, over-extension, and the grandiose assumption that enthusiasm constitutes a plan.",
    capricorn: "Jupiter in Capricorn is considered in detriment, and the expansive Jovian impulse is here filtered through Saturnine discipline — the result is patient, structured, long-term growth rather than dramatic windfall. These individuals find luck through persistent effort, institutional credibility, and the eventual recognition of carefully built expertise. Their philosophy is that abundance is earned rather than given, and that the most reliable prosperity is that which rests on solid foundations. The shadow is excessive caution, the refusal of legitimate risk, and the joyless conflation of worth with output.",
    aquarius: "Jupiter in Aquarius expands through innovation, humanitarian vision, and the development of networks and technologies that serve collective liberation. These individuals find luck in alignment with progressive movements, in unconventional approaches to old problems, and in communities gathered around shared ideals. Their philosophy is egalitarian and forward-looking, believing that the greatest individual flourishing happens in a context of genuine communal freedom. The shadow is a tendency toward ideological rigidity, mistaking rebellion for wisdom and unconventionality for depth.",
    pisces: "Jupiter in Pisces occupies one of its traditional home signs and expands through spiritual practice, artistic creation, compassionate service, and the dissolution of boundaries that keep the ego small. These individuals attract abundance through trust, surrender, and a mystical openness to the generosity of the universe. Their philosophy is essentially devotional — they believe that meaning is found in the space where the individual self opens outward into something infinite. The shadow is escapism, the avoidance of practical reality, and a tendency to dissipate resources and energy without sufficient direction.",
  },
  saturn: {
    aries: "Saturn in Aries encounters its karmic lessons in the domain of self-assertion, initiative, and the development of authentic courage. These individuals are learning to act without excessive self-doubt or external permission, and they may encounter early experiences that undermine their confidence precisely so they must rebuild it on more solid ground. The discipline demanded is the discipline of decisive action: learning that initiative taken in spite of fear is the only kind that counts. Mastery comes through doing, failing, and doing again until the fear of beginning no longer governs the will.",
    taurus: "Saturn in Taurus confronts its lessons in the domains of material security, self-worth, and the relationship between effort and abundance. These individuals often experience early financial instability or a deep sense of not deserving prosperity, and they are called to build genuine security through sustained discipline and a more examined relationship with value. The structure demanded is patient, incremental material development — learning that abundance is a long-term construction, not a condition granted to the lucky. Over time, this placement can produce extraordinary financial acumen and an unshakeable sense of earned worth.",
    gemini: "Saturn in Gemini confronts its lessons in the domains of communication, learning, and the capacity for coherent, sustained thought. These individuals may have experienced early difficulties with language — speech impediments, learning differences, or environments where their ideas were dismissed — and they are called to develop genuine intellectual discipline and communicative precision. The structure demanded is rigorous: the willingness to say less until more is truly understood. Mastery produces a thinker and communicator of exceptional clarity and authority, having earned through difficulty what others take for granted.",
    cancer: "Saturn in Cancer, traditionally considered in detriment, confronts its lessons in the territory of emotional safety, home, and the capacity for vulnerability. These individuals often experienced early environments that required emotional self-reliance prematurely, and they are learning to distinguish genuine security — which must be built from within — from the defensive self-sufficiency that merely mimics it. The structure demanded is the slow construction of emotional trust: learning to receive nurturance as well as provide it, and to build family bonds that endure across the ordinary disappointments of intimate life. This placement can produce extraordinary emotional depth and the capacity to offer others a bedrock support forged by necessity.",
    leo: "Saturn in Leo confronts its lessons in the domains of self-expression, creativity, and the use of personal authority. These individuals may have been discouraged from self-display or have experienced their creative impulses as pretentious or unwelcome, and they are learning to inhabit their own stage with genuine dignity rather than either false modesty or anxious performance. The structure demanded is the discipline of authentic expression: developing work of genuine merit rather than seeking validation as a shortcut to confidence. Mastery produces a creative and leadership presence of lasting substance, built on the integrity of consistent effort rather than the luck of natural charm.",
    virgo: "Saturn in Virgo confronts its lessons in the domains of work, health, and the relationship between perfectionism and genuine excellence. These individuals are learning to apply discriminating standards without collapsing into self-reproach, and they often carry a deep background anxiety about adequacy and competence that the work of this lifetime is designed to transform. The structure demanded is methodical, patient improvement — mastery achieved through iteration rather than inspiration. When this placement is well integrated, it produces individuals of genuine technical mastery and an uncompromising dedication to the quality of their contribution.",
    libra: "Saturn in Libra occupies its exaltation, suggesting that the Saturnine principles of structure and discipline are particularly well expressed through the Libran themes of justice, partnership, and formal commitment. These individuals are learning to build relationships of genuine equity and to honor contractual obligations as the basis of civilized life. The lessons may involve the painful discovery of what a partnership without proper foundation costs, or the delayed reward of one built with care and mutual respect. Mastery in this placement produces an extraordinarily mature capacity for fair, enduring, deeply committed relationship.",
    scorpio: "Saturn in Scorpio confronts its lessons in the domains of shared resources, psychological power, and the capacity to surrender control. These individuals often encounter experiences of loss, betrayal, or forced transformation that challenge their fundamental sense of safety and their ability to trust anyone with genuine access to their inner life. The structure demanded is the disciplined willingness to go through rather than around the transformative crises that this placement reliably delivers. Over time, mastery yields a psychological resilience and a depth of self-knowledge that very few people achieve without having been broken open first.",
    sagittarius: "Saturn in Sagittarius confronts its lessons in the domains of belief, meaning, and the structures through which we organize our understanding of the world. These individuals often struggle with dogmatism in themselves or encounter rigid belief systems in their environment that they must either inhabit or dismantle, and they are learning to hold philosophical conviction without surrendering intellectual honesty. The structure demanded is the discipline of examined belief: earning the right to one's worldview through genuine encounter with evidence and alternative perspectives. Mastery produces a philosopher or teacher of genuine authority, whose wisdom is grounded in hard-won experience rather than inherited assumption.",
    capricorn: "Saturn in Capricorn occupies its home sign and expresses its full authority: the capacity for long-term planning, executive discipline, and the patient construction of lasting achievement. These individuals understand at a bone-deep level that the world rewards those who show up, work consistently, and subordinate momentary comfort to enduring purpose. The lessons here are about ambition itself — learning to distinguish authentic vocation from the compulsive need to prove worth through accomplishment. When well integrated, this placement produces individuals of extraordinary professional accomplishment and genuine institutional authority, having earned their position through decades of sustained effort.",
    aquarius: "Saturn in Aquarius confronts its lessons in the domains of community, social responsibility, and the tension between the individual's need for freedom and the collective's need for structure. These individuals are learning to build institutions and alliances that can actually deliver on the ideals they profess, rather than merely critiquing existing structures from a comfortable distance. The discipline demanded is the patience to work within systems long enough to change them from the inside. Mastery yields a social architect of genuine effectiveness — someone whose idealism is validated by the practical structures they leave behind.",
    pisces: "Saturn in Pisces confronts its lessons in the domains of spirituality, compassion, artistic surrender, and the management of the boundary between the self and the boundless. These individuals may experience early confusion between genuine spiritual calling and escapism, or between compassionate service and martyrdom, and they are learning to give form and structure to what is essentially formless. The discipline demanded is the willingness to submit the imagination and the intuitive life to the long work of craft — to translate vision into something that can be shared and that endures. Mastery produces artists, spiritual leaders, and healers of exceptional depth, whose gifts have been refined by the friction of committed practice.",
  },
  uranus: {
    aries: "Uranus in Aries (approximately 1927-1935 and 2010-2018) marks a generation called to revolutionize the concept of individual identity and to disrupt the social structures that constrain personal freedom and pioneer initiative. At the collective level, this transit correlates with technological breakthroughs in communication, transportation, and warfare that fundamentally alter what a single individual or small group can accomplish. In the natal chart, the house position reveals the specific arena where this individual most powerfully embodies their generation's disruption of convention and where their sudden, original impulses most forcefully challenge established norms.",
    taurus: "Uranus in Taurus (approximately 1934-1942 and 2018-2026) marks a generation called to overturn existing systems of value, material security, and humanity's relationship to the earth and its resources. At the collective level, this transit correlates with radical disruptions to financial systems, agricultural practice, and the definition of wealth itself. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's capacity to discover radically new forms of stability, and where the lightning of sudden change most reliably strikes the domains they consider most permanent.",
    gemini: "Uranus in Gemini (approximately 1942-1949 and 2025-2033) marks a generation experiencing revolutionary disruption in the realms of communication, information technology, and the very structure of how knowledge is transmitted and organized. At the collective level, this transit correlates with the invention and rapid spread of communication technologies that rewire the social nervous system. In the natal chart, the house position shows where this individual most powerfully embodies their generation's gift for innovative thinking and where unexpected bursts of insight or radical new information most transform their world.",
    cancer: "Uranus in Cancer (approximately 1949-1956) marks a generation called to revolutionize the concepts of home, family, and emotional security in ways that permanently alter the social fabric. At the collective level, this transit correlated with the postwar disruption of traditional domestic arrangements and the emergence of new, often unsettled forms of family structure. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's challenge to conventional belonging, and where sudden emotional upheaval or liberation from ancestral patterns most profoundly reshapes their sense of home.",
    leo: "Uranus in Leo (approximately 1956-1962) marks a generation called to revolutionize creative expression, personal authority, and the concept of the hero or celebrity as a social force. At the collective level, this transit correlated with the rock-and-roll revolution, the explosion of youth culture, and a radical redefinition of what charismatic leadership looks like. In the natal chart, the house position reveals where this individual most powerfully channels their generation's genius for dramatic innovation and where the impulse toward original self-expression most forcefully disrupts conventional expectations.",
    virgo: "Uranus in Virgo (approximately 1962-1968) marks a generation called to revolutionize the domains of work, health, and the systems that organize the practical functioning of daily life. At the collective level, this transit correlated with the early computerization of labor, the emergence of alternative medicine, and radical critiques of industrial agriculture and environmental management. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's gift for systemic innovation and where sudden, radical improvements to existing processes most characteristically manifest.",
    libra: "Uranus in Libra (approximately 1968-1975) marks a generation called to revolutionize the institutions of partnership, marriage, and social justice, fundamentally disrupting conventional frameworks of relationship and equality. At the collective level, this transit correlated with the rise of second-wave feminism, the normalization of divorce, and sweeping changes to civil rights and international cooperation. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's disruption of conventional relational norms and where the sudden reformulation of agreements and alliances most profoundly alters their life.",
    scorpio: "Uranus in Scorpio (approximately 1975-1981) marks a generation called to revolutionize the domains of death, shared resources, sexuality, and the hidden structures of power that govern collective life. At the collective level, this transit correlated with sexual liberation movements, the AIDS crisis's disruption of erotic complacency, and radical changes to the global financial system. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's capacity to blow open what has been sealed and where sudden, taboo-breaking revelations most characteristically transform their experience.",
    sagittarius: "Uranus in Sagittarius (approximately 1981-1988) marks a generation called to revolutionize philosophy, religion, higher education, and humanity's relationship to cultural diversity and cross-civilizational exchange. At the collective level, this transit correlated with the global spread of information across borders, the disruption of religious consensus, and the early conditions of globalization. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's genius for expanding beyond inherited worldviews and where sudden, liberating encounters with radically different ways of knowing most transform their perspective.",
    capricorn: "Uranus in Capricorn (approximately 1988-1996) marks a generation called to revolutionize the institutions, hierarchies, and power structures that govern public life. At the collective level, this transit correlated with the fall of the Soviet Union, the rise of digital economies, and sweeping transformations of corporate and governmental structure. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's capacity to rebuild authority on radically different foundations and where sudden disruption to established power most characteristically reshapes their professional and public world.",
    aquarius: "Uranus in Aquarius (approximately 1996-2003) marks a generation born into the full force of the digital revolution and called to reimagine community, technology, and collective belonging at a fundamental level. At the collective level, this transit correlated with the explosive growth of the internet and the emergence of networked social structures that operate outside traditional institutional frameworks. In the natal chart, the house position reveals where this individual most powerfully embodies their generation's visionary capacity for systemic reinvention and where their native genius for the unconventional most forcefully upends existing social forms.",
    pisces: "Uranus in Pisces (approximately 1919-1927 and 2003-2011) marks a generation called to revolutionize the spiritual life, the nature of art and illusion, and the boundaries between the individual psyche and the collective unconscious. At the collective level, this transit correlated with the rise of cinema and mass media illusion, and in its more recent pass, with the dissolution of clear boundaries between the real and the virtual through social media and augmented experience. In the natal chart, the house position reveals where this individual most powerfully channels their generation's capacity to dissolve old spiritual forms and where sudden mystical or disillusioning experiences most characteristically open new dimensions of consciousness.",
  },
  neptune: {
    aries: "Neptune in Aries (approximately 1861-1875) brought a collective idealization of the pioneering individual, heroic conquest, and the romantic notion that the world could be remade by the force of individual will. At the generational level, this placement infused the cultural imagination with mythologies of national destiny and frontier heroism that obscured the violent realities of colonization and warfare. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of boundaries through inspired action and where idealism about courage and independence may obscure complexity.",
    taurus: "Neptune in Taurus (approximately 1875-1889) brought a collective idealization of material beauty, earthly paradise, and the spiritual dimension of sensory pleasure and natural abundance. At the generational level, this transit infused culture with aesthetic idealism and a romantic vision of nature that shaped the Arts and Crafts movement and symbolist art. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of material certainty and where idealistic confusion about value, ownership, and the nature of lasting wealth most characteristically manifests.",
    gemini: "Neptune in Gemini (approximately 1889-1902) brought a collective idealization of information, communication, and the magical possibility of connecting minds across distance. At the generational level, this transit coincided with the rise of mass media, the telephone, and the early cinema — technologies that began to blur the boundary between the actual and the represented world. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of clear communication and where poetic or imaginative thinking most characteristically dissolves conventional boundaries of meaning.",
    cancer: "Neptune in Cancer (approximately 1902-1916) brought a collective idealization of home, motherland, and the protective bonds of family and national belonging. At the generational level, this transit coincided with the catastrophic dissolution of stable home-life in World War I and the emergence of powerful mythologies of nationhood that proved catastrophically prone to illusion and manipulation. In a natal chart, the house position reveals where this individual most powerfully experiences the longing for oceanic belonging and where idealization of family or homeland most characteristically gives way to disillusionment.",
    leo: "Neptune in Leo (approximately 1916-1929) brought a collective idealization of charismatic leadership, artistic spectacle, and the glamorous self as a source of transcendent inspiration. At the generational level, this transit coincided with Hollywood's birth and the rise of celebrity culture, as well as the dangerous messianic currents that would fuel both the Jazz Age's exuberance and the authoritarian movements to come. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of ego-boundaries through creative surrender and where romantic idealization of personal power most characteristically produces illusion.",
    virgo: "Neptune in Virgo (approximately 1929-1943) brought a collective idealization of service, health, and the vision of a rationally perfected society that could systematically eliminate suffering through correct organization. At the generational level, this transit coincided with the Great Depression's desperate search for systemic solutions and the rise of totalitarian ideologies premised on the scientific management of human populations. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of ordinary practical boundaries and where idealism about purity, efficiency, or health most characteristically slides into confused perfectionism.",
    libra: "Neptune in Libra (approximately 1943-1957) brought a collective idealization of peace, beauty, and the possibility of perfect relational harmony following the devastation of World War II. At the generational level, this transit coincided with the founding of international institutions designed to make war impossible and the postwar aesthetic idealization of domesticity and gracious living. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of relational boundaries and where idealization of partnership most characteristically produces confusion between authentic connection and romantic projection.",
    scorpio: "Neptune in Scorpio (approximately 1957-1970) brought a collective idealization of psychological depth, sexual liberation, and the transformative power of dissolution — whether through drugs, eroticism, or mystical experience. At the generational level, this transit coincided with the psychedelic revolution, the sexual revolution, and a widespread cultural fascination with death, taboo, and the unconscious. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of psychological defenses and where the longing for transcendence through intensity most characteristically blurs the boundary between depth and self-destruction.",
    sagittarius: "Neptune in Sagittarius (approximately 1970-1984) brought a collective idealization of spiritual freedom, cultural diversity, and the vision of a world united by universal wisdom beyond the limits of any single religious tradition. At the generational level, this transit coincided with the New Age movement, the globalization of spiritual practice, and a widespread longing for meaning that existing institutions could no longer supply. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of inherited belief systems and where the search for transcendent meaning most characteristically oscillates between genuine vision and pleasant but directionless spiritual wandering.",
    capricorn: "Neptune in Capricorn (approximately 1984-1998) brought a collective idealization of institutional success, material achievement, and the vision of a world made spiritually meaningful through economic efficiency and technological progress. At the generational level, this transit coincided with the deregulation era's faith in markets as quasi-mystical self-organizing systems, and the slow dissolution of the traditional boundaries between corporate and public life. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of conventional authority and where idealization of worldly achievement most characteristically gives way to the discovery that success alone cannot answer the soul's deepest questions.",
    aquarius: "Neptune in Aquarius (approximately 1998-2012) brought a collective idealization of technological utopia, networked humanity, and the vision of universal digital consciousness dissolving the boundaries between individuals and cultures. At the generational level, this transit coincided with the internet's transformation into a second reality and the widespread belief that information would liberate humanity from the distortions of power and hierarchy. In a natal chart, the house position reveals where this individual most powerfully experiences the dissolution of social boundaries and where idealism about collective progress most characteristically produces both genuine inspiration and the confusion of shared dreams with shared reality.",
    pisces: "Neptune in Pisces (approximately 1847-1862 and 2012-2026) returns to its home sign, intensifying the dissolution of every kind of boundary — national, psychological, spiritual, and ecological. At the generational level, this transit correlates with the acceleration of climate disruption, the blurring of information and fiction through digital media, and a deepening collective longing for spiritual reconnection. In a natal chart, the house position reveals where this individual most powerfully embodies their generation's experience of oceanic dissolution and where the longing for transcendence most characteristically expresses itself as either profound spiritual sensitivity or a pervasive difficulty distinguishing truth from illusion.",
  },
  pluto: {
    aries: "Pluto in Aries (approximately 1822-1853) brought the transformative power of raw individual will to bear on the collective, correlating with revolutionary upheaval, nationalist movements, and the violent dismantling of the established political and social order across the Western world. At the generational level, this placement infused culture with a Promethean conviction that the old world could and must be destroyed so that something entirely new could be born from the ashes. In a natal chart, the house position reveals where this individual most powerfully encounters the Plutonic imperative to destroy what is false in themselves and where the regenerative force of radical self-transformation most characteristically operates.",
    taurus: "Pluto in Taurus (approximately 1853-1884) brought transformative intensity to the domains of material resources, land, labor, and the fundamental structures of economic life. At the generational level, this transit correlated with the Industrial Revolution's most convulsive phase — the total transformation of humanity's relationship to the earth, to work, and to the ownership of productive capacity. In a natal chart, the house position reveals where this individual most powerfully encounters the necessity of deep, irrevocable change in their relationship to material security and where the compulsive pursuit of permanent stability most characteristically encounters the regenerative force of inevitable loss.",
    gemini: "Pluto in Gemini (approximately 1884-1914) brought transformative intensity to communication, information, and the structures of collective thought. At the generational level, this transit correlated with the revolution in mass media, the birth of modern psychology, and the philosophical deconstruction of certainty that preceded and in some ways precipitated the catastrophe of World War I. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need to uncover hidden truth and where the intensity of obsessive thinking or the power of transformative language most characteristically reshapes their relationship to knowledge.",
    cancer: "Pluto in Cancer (approximately 1914-1939) brought transformative intensity to the domains of home, family, nation, and the emotional bonds that constitute collective identity. At the generational level, this transit correlated with the forced dissolution of empires, the trauma of mass displacement, and the dangerous intensification of tribal and nationalist feeling that produced the twentieth century's most catastrophic violence. In a natal chart, the house position reveals where this individual most powerfully encounters the transformative destruction and regeneration of their most intimate bonds and where the compulsive need for emotional security most characteristically becomes the catalyst for its own undoing.",
    leo: "Pluto in Leo (approximately 1939-1957) brought transformative intensity to the domains of individual self-expression, leadership, and the exercise of personal power. At the generational level, this transit correlated with the concentration of political power in charismatic leaders — both the catastrophic totalitarian variety and the post-war emergence of celebrity as a form of cultural power — and the eventual dissolution of monarchic and imperial models that had structured human hierarchy for millennia. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need for recognition and where the regeneration of authentic creative authority most characteristically emerges from the destruction of ego-bound expressions of personal power.",
    virgo: "Pluto in Virgo (approximately 1957-1972) brought transformative intensity to the domains of work, health, the environment, and the systems through which daily life is organized and sustained. At the generational level, this transit correlated with the emergence of the environmental movement, the green revolution's transformation of agriculture, and the early computerization of labor that would ultimately transform the structure of work beyond recognition. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need for perfect function and where the regeneration of health and meaningful service most characteristically emerges from the radical dismantling of what merely appears to work.",
    libra: "Pluto in Libra (approximately 1972-1984) brought transformative intensity to the domains of partnership, marriage, justice, and the structures through which cultures organize the relationship between the individual and the social contract. At the generational level, this transit correlated with the normalization of divorce, sweeping changes in gender relations, and the deconstruction of conventional frameworks of fairness and equality. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need for perfect relational balance and where the regeneration of genuine partnership most characteristically emerges from the complete destruction of relationships that were never honestly structured.",
    scorpio: "Pluto in Scorpio (approximately 1984-1995) returns to its home sign, intensifying every Plutonic theme: power, death, sexuality, transformation, and the ruthless dismantling of whatever stands between the collective and its psychological truth. At the generational level, this transit correlated with the AIDS crisis's confrontation with death, the exposure of long-hidden institutional abuses, and the emergence of genetic engineering as a technology for transforming life at its most fundamental level. In a natal chart, the house position reveals where this individual most powerfully embodies their generation's capacity for radical psychological transformation and where the compulsive confrontation with hidden power most characteristically becomes the condition for genuine rebirth.",
    sagittarius: "Pluto in Sagittarius (approximately 1995-2008) brought transformative intensity to the domains of belief, religion, higher education, and the cultural frameworks through which humanity has organized its search for meaning. At the generational level, this transit correlated with the religious extremism and culture wars of the early twenty-first century, the globalization that disrupted traditional meaning-making systems, and the internet's radical democratization of information access. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need to find and defend absolute truth and where the regeneration of genuine philosophical wisdom most characteristically emerges from the destruction of beliefs inherited rather than earned.",
    capricorn: "Pluto in Capricorn (approximately 2008-2024) brought transformative intensity to the domains of political authority, institutional structure, corporate power, and the systems of governance through which collective life is organized. At the generational level, this transit correlated with the global financial crisis, the rise of populist movements challenging existing hierarchies of power, and a sweeping renegotiation of the relationship between individual citizens and the institutions that govern them. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need for control and authority and where the regeneration of genuine institutional integrity most characteristically emerges from the exposure and collapse of what was corrupt.",
    aquarius: "Pluto in Aquarius (approximately 2024-2044) brings transformative intensity to the domains of technology, collective organization, social equality, and the definition of what it means to be human in a world shaped by artificial intelligence and networked consciousness. At the generational level, this transit is expected to correlate with radical disruptions to existing social structures, the possible regeneration of democratic institutions, and profound questions about the boundary between human and machine intelligence. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive need for collective freedom and where the regeneration of authentic community most characteristically emerges from the destruction of social forms that have outlived their usefulness.",
    pisces: "Pluto in Pisces (approximately 1798-1823 and 2044-2068) brings transformative intensity to the domains of spirituality, the unconscious, compassion, and the boundaries between the self and the oceanic expanse of collective psychic life. In its historical pass, this transit correlated with the Romantic movement's assault on Enlightenment rationality and the emergence of powerful new mystical and artistic currents from the depths of the collective unconscious. In a natal chart, the house position reveals where this individual most powerfully encounters the compulsive dissolution of ego-boundaries and where the regeneration of genuine spiritual life most characteristically emerges from the complete dismantling of what had merely served as a substitute for true transcendence.",
  },
  chiron: {
    aries: "Chiron in Aries carries the wound of identity — a deep, often pre-verbal injury to the sense of the right to exist boldly, assert one's will, and take up space in the world without apology or excessive justification. These individuals may have encountered experiences that taught them their instincts were dangerous, their anger was unacceptable, or their very existence was an imposition on others. The healing path involves the courageous practice of direct self-assertion without abandoning the self in shame: learning that the body's desires and the will's instincts are not enemies but allies in the construction of an authentic life.",
    taurus: "Chiron in Taurus carries the wound of worth — a deep injury to the sense of being fundamentally deserving of pleasure, comfort, and material security simply by virtue of existing. These individuals may have experienced early material deprivation or received messages that their physical needs were excessive or burdensome, generating a chronic background anxiety about whether there will be enough and whether they merit what there is. The healing path involves the slow, patient cultivation of genuine self-value — learning to inhabit the body's pleasures without guilt and to build material security without the compulsive terror that it will be arbitrarily removed.",
    gemini: "Chiron in Gemini carries the wound of voice — an injury to the capacity for coherent self-expression, whether through speech, writing, or the simple act of being listened to and understood. These individuals may have experienced early environments where their ideas were dismissed, their speech was mocked, or the act of thinking out loud felt dangerous. The healing path involves the patient reclamation of communicative confidence: learning to trust the validity of their own perspective and to offer it to the world without the anticipatory shame of being misunderstood or dismissed.",
    cancer: "Chiron in Cancer carries the wound of belonging — a deep injury to the sense of having a secure emotional home, either in the literal family or in the broader sense of a reliably nurturing world. These individuals often carry early experiences of emotional abandonment, family instability, or a pervasive sense of being fundamentally unwelcome in the spaces that were supposed to protect them. The healing path involves learning to provide for themselves the emotional safety that was not reliably available in childhood, and ultimately becoming a source of genuine nurturing for others without losing the self in the process.",
    leo: "Chiron in Leo carries the wound of worth through visibility — an injury to the sense that one's creative expression, personal gifts, and authentic self-display are welcome, valuable, and deserving of genuine recognition. These individuals may have experienced early environments where pride was punished, creative efforts were dismissed, or the bright light of their personality was systematically dimmed. The healing path involves the courageous practice of creative self-exposure: learning to offer the self without the guarantee of applause, finding the intrinsic worth of authentic expression rather than depending on external validation to confirm it.",
    virgo: "Chiron in Virgo carries the wound of imperfection — a deep injury to the sense of being acceptable in an imperfect state, a wound that expresses itself as relentless self-criticism, hypochondriac anxiety, or a pervasive sense of being fundamentally flawed in ways that disqualify one from the rewards of ordinary life. These individuals often learned early that love was conditional on performance, that errors were unforgivable, and that the gap between the actual and the ideal was a source of shame rather than information. The healing path involves learning to engage the discriminating mind as a servant of growth rather than an instrument of self-punishment.",
    libra: "Chiron in Libra carries the wound of relationship — an injury to the capacity for genuine, equal, mutually respectful partnership, often originating in early experiences of relational injustice, chronic conflict, or the sense that one's needs and preferences were perpetually subordinated to others. These individuals may oscillate between excessive accommodation and sudden withdrawal, never quite finding the relational ground where the self and the other can coexist without one constantly eclipsing the other. The healing path involves learning to negotiate genuine equality in close relationships, finding the courage to hold their own position without sacrificing the connection they deeply need.",
    scorpio: "Chiron in Scorpio carries the wound of betrayal — a deep injury to the capacity for trust, vulnerability, and the willingness to share power and intimate truth with another person. These individuals often carry early experiences of profound violation, abandonment, or the discovery that those entrusted with their deepest secrets used them as weapons. The healing path involves the gradual, courageous rebuilding of the capacity for genuine intimacy: learning to distinguish safe containers from unsafe ones, and ultimately becoming a guide for others in navigating the dangerous territory of psychological depth and transformative trust.",
    sagittarius: "Chiron in Sagittarius carries the wound of meaning — an injury to the sense of being held and oriented by a coherent, trustworthy philosophical or spiritual framework. These individuals may have experienced early exposure to belief systems that proved hollow, hypocritical, or actively harmful, leaving them with either a compulsive searching for the truth that will finally settle the restlessness or a defensive cynicism about the very possibility of meaningful belief. The healing path involves building a personal philosophy grounded in lived experience rather than inherited authority, and becoming a teacher and guide for others who are seeking the courage to trust their own inner wisdom.",
    capricorn: "Chiron in Capricorn carries the wound of authority — a deep injury to the sense of being competent, worthy of respect, and capable of achieving legitimate standing in the world without having to deny essential aspects of the self. These individuals often carry early experiences of institutional rejection, parental criticism of their ambitions, or the painful discovery that the systems of authority they trusted were indifferent or hostile to their authentic development. The healing path involves building genuine competence and authority through patient, self-directed effort rather than external validation, and eventually offering others the kind of structuring support that they themselves lacked.",
    aquarius: "Chiron in Aquarius carries the wound of belonging — specifically, the wound of being different in ways that proved genuinely isolating. These individuals often experienced early environments where their originality, their values, or their vision of how life could be made them feel fundamentally alien to those around them. The healing path involves learning to inhabit their uniqueness without the constant undertow of shame, finding communities that can genuinely appreciate what they offer, and ultimately using their experience of radical difference as a resource in serving others who feel marginal to the social mainstream.",
    pisces: "Chiron in Pisces carries the wound of dissolution — an injury to the capacity for healthy boundaries between the self and the world that often manifests as chronic victimhood, addiction to transcendence, or a pervasive sense of being overwhelmed by a reality for which the self has no adequate container. These individuals often experienced early environments that made the development of a stable ego feel dangerous, whether through trauma, excessive demand for self-sacrifice, or immersion in chaotic psychic environments. The healing path involves learning to be both fully open to the beauty and suffering of the world and firmly grounded in the self — developing the spiritual maturity to serve as a vessel for compassion without losing the thread back to one's own center.",
  },
};


window.Interpretations = (() => {

  // ── Daily Horoscope Content ───────────────────────────────────────────────
  const DAILY_OVERVIEWS = {
    Aries: [
      "The fiery Aries energy is amplified today as Mars, your ruling planet, forms a dynamic trine with the Moon. Your natural leadership qualities shine brilliantly, and colleagues or friends look to you for direction. Channel this potent drive into projects that require courage and initiative. Avoid impulsive decisions after 6 PM when Mercury's square may cloud judgment.",
      "Today brings a surge of vitality and creative fire to your chart. The Sun's current position highlights your natural talent for blazing trails where others fear to tread. A long-standing professional challenge finds its resolution through your characteristic boldness. Trust your instincts in financial matters — your gut feeling is sharper than any spreadsheet.",
      "Venus moves into a harmonious position relative to your natal Sun, softening your edges and making you exceptionally magnetic. Relationships that have felt strained recently begin to ease, and new connections form quickly and easily. Use this favorable influence to have conversations you've been postponing. Your directness, tempered with genuine warmth today, lands beautifully.",
    ],
    Taurus: [
      "Venus, your ruling planet, casts a luminous light across your house of values and resources today. Financial matters that have been unclear suddenly resolve with elegant simplicity. Your patient approach — often misread as stubbornness — proves itself wise yet again. Indulge your senses this evening; beauty and pleasure are not luxuries but necessities for your soul.",
      "The Taurus Moon amplifies your natural receptivity to the physical world. You notice subtle things others miss: the quality of light, the nuance in a tone of voice, the potential in an overlooked opportunity. Trust these perceptions. A creative project benefits enormously from your steady, committed attention. Someone close needs your grounding presence.",
      "Saturn's current transit through your chart is building lasting structures in your life, even when progress feels slow. Today, a tangible result of months of quiet effort becomes visible. Security — financial, emotional, physical — is the theme this week, and you handle it with characteristic thoroughness. Rest when you need to; endurance requires renewal.",
    ],
    Gemini: [
      "Mercury, your ruling planet, is in its element today — fast-moving, witty, and connecting the dots between disparate ideas with lightning speed. A communication breakthrough arrives, possibly through an unexpected message or conversation. Your ability to see multiple perspectives simultaneously turns a complex situation into a solvable puzzle. Write down your best ideas before noon.",
      "The Gemini duality is your greatest asset today as you navigate a situation requiring both analytical thinking and social grace. The information you've been gathering crystallizes into a coherent picture. Share your perspective freely — your insights spark valuable discussion. Socially, this is one of your most charming days of the month.",
      "Curiosity leads you somewhere extraordinary today. A chance conversation, an article you stumble across, or a podcast you half-listen to contains a piece of information that shifts your thinking significantly. Follow every thread. Your mind is a precision instrument right now, capable of processing complexity with unusual ease and delight.",
    ],
    Cancer: [
      "The Moon, your ruling luminary, is in a powerful position today, heightening your already formidable intuitive abilities. Trust what you feel in your body about a situation — your instincts are delivering accurate information. Home and family matters take precedence, and a nourishing domestic experience renews your emotional reserves. Protect your energy from draining interactions.",
      "Emotional currents run deep today, and your sensitivity is a gift rather than a burden. You perceive what's unsaid in conversations, what's hidden beneath the surface of situations, and what someone truly needs beyond what they're asking for. This empathic clarity lets you offer exactly the right support. Your own needs deserve the same compassionate attention.",
      "Cancer energy at its highest expression is fierce protection combined with unconditional nurturing, and you embody this today. A family or home situation that has needed your steady love and clear boundaries finds resolution. New moon energy supports planting seeds of intention around security and belonging. What home means to you is evolving — allow the new definition to form.",
    ],
    Leo: [
      "The Sun illuminates your natural magnetism today, and every room you enter feels your warmth before you say a word. Creative endeavors are especially blessed — pour yourself into an artistic or expressive project with zero restraint. Recognition that you've been quietly hoping for may arrive through an unexpected channel. Generosity towards others magnifies your own good fortune.",
      "Your Leo fire burns clean and bright today, giving you both the confidence to take center stage and the warmth to bring others along for the journey. Leadership opportunities arise, and you handle them with the rare combination of authority and grace that makes people genuinely want to follow. Let yourself be fully seen — the world benefits from your full brightness.",
      "Creative inspiration flows in abundance today, and your challenge is channeling it rather than containing it. A performance, presentation, or creative debut goes exceptionally well — audiences respond to your authentic self-expression with enthusiasm. Romance is activated; single Leos attract admirers effortlessly. Couples experience a revival of playful, joyful connection.",
    ],
    Virgo: [
      "Mercury's analytical power combines with your inherent discernment today, making you exceptionally skilled at solving problems that have baffled others. Your attention to detail catches something critical that would otherwise be missed. Health matters benefit from practical adjustments you make this week — small, consistent changes compound into significant improvements. Imperfection is not failure; it's information.",
      "Your service orientation is your superpower today, but remember to direct some of that careful attention toward yourself. The precision you bring to your work produces results that surprise even your high standards. A technical or analytical challenge that seemed intractable yields to your systematic approach. Celebrate this quietly — your modesty is genuine, not performance.",
      "Virgo's earth energy grounds you beautifully today amid circumstances that might unsettle others. Your practical wisdom is sought and valued. A health or wellness protocol you've been researching finally becomes clear — trust the detailed analysis you've done. Relationships benefit from your capacity for helpful, specific support rather than vague reassurance.",
    ],
    Libra: [
      "Venus graces your sign with exceptional social and aesthetic gifts today. Beauty in all its forms — art, relationship, justice, symmetry — calls to you with unusual insistence. A negotiation or mediation you've been handling with characteristic diplomatic skill reaches a fair resolution. Your ability to see every side of an issue makes you invaluable right now.",
      "The Libra quest for balance takes on added dimension today as a decision you've been weighing clarifies. Both options have genuine merit — your task is choosing the one that aligns with your deepest values rather than merely pleasing others. Relationship harmony is your natural gift; extend that same gracious consideration to your relationship with yourself.",
      "Your social world is unusually rich today, with stimulating encounters and meaningful connections. An introduction made now could develop into a significant professional partnership or friendship over the coming months. Creative collaboration is particularly fruitful — your ability to blend your vision with another's produces something neither could achieve alone. Beauty is an important need, not a vanity.",
    ],
    Scorpio: [
      "Pluto, your modern ruler, is orchestrating a deep transformation in your chart right now — and today a layer of that shift becomes conscious. You understand something about yourself or a situation with startling clarity. Your legendary investigative instincts solve a mystery that's been occupying your attention. Intimacy — emotional, intellectual, physical — is what you crave and what nourishes you most deeply.",
      "Scorpio intensity is at full power today, giving you access to perceptions and insights that bypass the ordinary thinking mind entirely. You know things you cannot explain how you know. Trust this. A financial or resource matter benefits from your strategic thinking — you see moves ahead that others don't. Power dynamics in relationships shift in your favor.",
      "The regenerative power of Scorpio energy is yours to wield today. Something that seemed lost or ending reveals itself as a transformation in progress. Your capacity for emotional depth and your refusal to accept surface-level answers lead you to the kind of truth that changes everything. Vulnerability that you offer to a trusted person is received with the respect it deserves.",
    ],
    Sagittarius: [
      "Jupiter's expansive energy lifts your natural optimism to exceptional heights today, and your vision for the future seems both vivid and attainable. Travel, study, philosophy, or any pursuit that broadens your horizons is especially blessed. Share your enthusiasm freely — your belief in possibility is genuinely contagious and inspires those around you to aim higher.",
      "The archer's arrow finds its mark today with satisfying precision. A goal you set months ago achieves a significant milestone. Your instinct to always reach for a larger truth, a wider perspective, a more adventurous path leads you toward exactly the right opportunity right now. Someone you meet on a journey — literal or intellectual — opens an important door.",
      "Sagittarian freedom-loving energy peaks today, making confinement of any kind particularly irksome. Choose environments and conversations that stimulate your endless curiosity. A philosophical question that's been tickling your mind all week suddenly resolves itself into an insight worth recording. Teaching, publishing, or sharing your worldview reaches an enthusiastic audience.",
    ],
    Capricorn: [
      "Saturn's disciplined energy aligns perfectly with your ambitious nature today, and your long-term projects receive tangible, visible progress. Authority figures and institutions respond to your competence with respect and recognition. Your mastery of patience and strategy pays dividends that others, who took shortcuts, cannot access. Legacy — what you're building that will last — motivates every choice.",
      "The Capricorn mountain-climber is at a particularly advantageous elevation today. The view is excellent, the path ahead is clear, and you have the stamina for the distance remaining. A professional achievement that validates years of dedicated work arrives, perhaps quietly, in an ordinary moment. Let yourself feel the satisfaction — you've earned it.",
      "Your practical wisdom is a stabilizing force for everyone around you today. Financial matters that require careful, strategic thinking respond excellently to your thoroughness. Relationships deepen through your demonstrated reliability — consistency in action is your language of love. Allow yourself to receive the appreciation that others extend genuinely to you.",
    ],
    Aquarius: [
      "Uranus, your ruling planet, sparks sudden innovative insights today that could genuinely change your direction in remarkable ways. Your naturally unconventional thinking produces a breakthrough that more conventional minds missed entirely. Community, friendship, and collective vision align beautifully — a group effort produces results that exceed what any individual could achieve. The future you're imagining is closer than it appears.",
      "Aquarian originality is your greatest asset today, and the world needs exactly the particular shade of your unusual perspective. A humanitarian or community-focused project gains momentum through your involvement. Technology, science, or social innovation is a productive arena. Don't dilute your vision to make it more palatable — its edge is what makes it valuable.",
      "Your capacity for objective analysis cuts through emotional fog today, helping you and others see a complicated situation clearly. Friendships take on special depth — an existing friend reveals a side of themselves that surprises and delights you, while a new connection forms with startling speed over shared values. Freedom and belonging are not opposites; today you experience both simultaneously.",
    ],
    Pisces: [
      "Neptune, your ruling planet, deepens your already profound intuition today to near-mystical levels. Creative, spiritual, and compassionate endeavors flourish under this influence. Trust the images and impressions that arise in your quieter moments — they contain important information. A dream or daydream this week carries a message worth decoding. Your sensitivity is not a weakness but a form of genius.",
      "The Pisces ocean of emotion and imagination is magnificently productive today. Creative work that emerges from your inner world resonates with others at a level beyond ordinary communication. Healing — offering it or receiving it — is the central theme. Your instinctive understanding of suffering and your refusal to abandon compassion even when it costs you is your greatest spiritual achievement.",
      "Spiritual themes are prominent today as Jupiter in your chart opens doors to wisdom and meaning that you've been seeking. A meditation, artistic experience, or conversation with someone who truly sees you delivers a moment of genuine transcendence. Service to others comes naturally and fills rather than depletes you when done from genuine love rather than guilt.",
    ],
  };

  const WEEKLY_THEMES = {
    Aries:       "This week accelerates your professional trajectory. Mars forms supportive angles with Jupiter, widening your sphere of influence. A bold move mid-week pays dividends by Friday.",
    Taurus:      "Financial clarity arrives this week as Venus stations direct. A long-term investment decision becomes obvious. Weekend brings deeply pleasurable domestic experiences.",
    Gemini:      "Communications are your superpower this week. Presentations, negotiations, and creative pitches all go exceptionally well. A short trip or intellectual adventure reinvigorates your perspective.",
    Cancer:      "Family and home matters are highlighted with healing energy this week. A long-standing emotional pattern releases its grip, creating space for new joy. Trust your instincts in all decisions.",
    Leo:         "Your creativity and charisma are at a quarterly peak. A romantic or artistic opportunity arrives that deserves your full, enthusiastic engagement. Visibility works powerfully in your favor.",
    Virgo:       "A practical project you've been working on methodically reaches a satisfying completion. Your attention to detail is recognized and rewarded. Health improvements from consistent habits become clearly visible.",
    Libra:       "Relationship harmony deepens this week through honest, graceful communication. A partnership — personal or professional — reaches a new level of understanding and cooperation. Your aesthetic gifts are in demand.",
    Scorpio:     "Powerful transformational energy continues this week. Resources — financial, emotional, personal power — are the focus. Strategic patience now positions you excellently for next month's opportunities.",
    Sagittarius: "Expansion is the theme — new horizons, bigger thinking, international or cross-cultural connections. A teacher, course, or philosophical framework unlocks important personal growth. Adventure beckons.",
    Capricorn:   "Professional recognition arrives, potentially through an unexpected channel. Your reputation has been building quietly and now speaks for itself. A leadership responsibility feels heavy but ultimately suits you perfectly.",
    Aquarius:    "Community and collaboration produce breakthroughs this week. Your innovative ideas find receptive audiences. Technology or social systems thinking solves a problem you've been wrestling with.",
    Pisces:      "Intuition and creativity flow at peak intensity this week. Artistic work, healing modalities, and spiritual practice all yield extraordinary results. Boundaries protect your energy for what matters most.",
  };

  // ── Planet in Sign Interpretations ───────────────────────────────────────
  const PLANET_IN_SIGN = {
    Sun: {
      Aries: "The Sun in Aries infuses your core identity with bold, pioneering energy. You are fundamentally a trailblazer — someone who initiates rather than waits. Your self-expression is direct, enthusiastic, and refreshingly authentic. The Aries life lesson is to develop patience alongside courage, and to consider impact alongside intention.",
      Taurus: "The Sun in Taurus grounds your identity in the physical world and the realm of the senses. Security, beauty, and sustained value are the pillars of your self-expression. Your reliability is legendary among those who know you well. The Taurus growth edge involves releasing attachment to comfort when growth requires movement.",
      Gemini: "The Sun in Gemini makes you fundamentally a communicator, a connector, and a perpetual student of life's infinite variety. Your identity is expressed through language, learning, and the dynamic exchange of ideas. The world is more interesting because of your insatiable curiosity. The Gemini path involves choosing depth alongside breadth.",
      Cancer: "The Sun in Cancer makes home, family, and emotional safety the foundation of your identity. Your nurturing instinct is a defining quality — you create belonging wherever you go. Deep feelings are not a complication but a vital intelligence. The Cancer growth path involves offering yourself the same fierce protection you give others.",
      Leo: "The Sun rules Leo, and here your life-force shines at full brilliant wattage. Self-expression, creativity, and the desire to contribute something meaningful are central to who you are. Your generosity and warmth are genuine. The Leo path involves discovering that your worth is not contingent on performance or applause.",
      Virgo: "The Sun in Virgo makes discernment, service, and the pursuit of excellence central to your identity. You express yourself through usefulness — through solving, improving, healing, and refining. Your critical eye sees what others miss. The Virgo path involves extending the grace you offer others to yourself.",
      Libra: "The Sun in Libra makes relationship, harmony, and justice the central theater of your self-discovery. You see yourself most clearly in the mirror of relationship. Beauty and balance are genuine needs, not superficialities. The Libra path involves making clear decisions without waiting for universal agreement.",
      Scorpio: "The Sun in Scorpio places transformation, depth, and authentic power at the center of your identity. You are drawn to what is hidden, what is real beneath the surface, what endures. Intensity is your natural register. The Scorpio path involves learning that vulnerability shared with worthy people is a form of power, not its surrender.",
      Sagittarius: "The Sun in Sagittarius makes the search for meaning, wisdom, and ever-expanding horizons your defining drive. Freedom — to explore, to question, to believe according to your own inquiry — is not negotiable. Your optimism is a genuine spiritual gift. The Sagittarius path involves commitment to the journey without endlessly postponing arrival.",
      Capricorn: "The Sun in Capricorn places achievement, integrity, and long-term vision at the core of your identity. You understand that lasting things are built slowly and that real authority comes from demonstrated mastery, not proclamation. The Capricorn path involves allowing yourself to feel proud and joyful, not only productive.",
      Aquarius: "The Sun in Aquarius makes original thinking, humanitarian values, and the vision of a better future central to who you are. You are fundamentally a reformer — someone who sees what could be and works systematically toward it. The Aquarius path involves honoring personal emotions alongside universal ideals.",
      Pisces: "The Sun in Pisces places compassion, imagination, and spiritual sensitivity at the center of your being. You inhabit multiple worlds simultaneously and move through life with a porousness that allows profound empathy. Your creative and intuitive gifts are extraordinary. The Pisces path involves developing discernment to match your depth.",
    },

    Moon: {
      Aries: "Your Moon in Aries means your emotional needs are met through action, independence, and the opportunity to lead. You need to feel that you are moving forward. Emotional security comes from your own courage.",
      Taurus: "Your Moon in Taurus creates a deep need for stability, sensory pleasure, and emotional consistency. You feel most secure when your material world is ordered and beautiful.",
      Gemini: "Moon in Gemini means your emotional life is expressed through communication and understood through analysis. You need mental stimulation to feel secure and process feelings through conversation.",
      Cancer: "The Moon rules Cancer — here it is at full power, making your emotional world rich, complex, and deeply attuned to others. You feel everything, and this empathy is your greatest gift.",
      Leo: "Moon in Leo means you need to feel special, seen, and celebrated. Your emotional well-being depends on creative expression and the experience of bringing joy and warmth to others.",
      Virgo: "Moon in Virgo means you find emotional comfort through being useful, creating order, and caring for the health and functioning of those you love.",
      Libra: "Moon in Libra means harmony and partnership are essential to your emotional well-being. Discord feels genuinely distressing. You process feelings best through honest, calm conversation.",
      Scorpio: "Moon in Scorpio gives you emotional depth that few can match. You feel with extraordinary intensity and need relationships of profound trust and authenticity.",
      Sagittarius: "Moon in Sagittarius means freedom and philosophical understanding are emotional needs, not luxuries. Feeling trapped or intellectually stifled provokes genuine distress.",
      Capricorn: "Moon in Capricorn means you find emotional security through achievement, responsibility, and demonstrated competence. You may struggle to ask for comfort; receiving is as important as giving.",
      Aquarius: "Moon in Aquarius means you process emotions somewhat intellectually and need friends who accept your unconventional feeling-style. Community and shared ideals nourish you.",
      Pisces: "Moon in Pisces gives you one of the most empathic, intuitive emotional natures in the zodiac. You absorb feelings from your environment and need regular time in solitude to replenish.",
    },
  };

  // ── House Interpretations ─────────────────────────────────────────────────
  const HOUSE_MEANINGS = [
    { number: 1,  name: 'First House',   keyword: 'Identity & Appearance',    meaning: 'The First House governs your outer personality, physical appearance, and the mask you present to the world. Planets here are prominently visible in your life expression.' },
    { number: 2,  name: 'Second House',  keyword: 'Resources & Values',       meaning: 'The Second House rules your personal finances, possessions, and the values that guide your material choices. It shows how you earn and what you truly value beyond money.' },
    { number: 3,  name: 'Third House',   keyword: 'Communication & Mind',      meaning: 'The Third House governs how you think, speak, and process immediate experiences. It rules siblings, local travel, and the exchange of information in your daily life.' },
    { number: 4,  name: 'Fourth House',  keyword: 'Home & Roots',             meaning: 'The Fourth House represents your home, family of origin, ancestral patterns, and the private emotional foundation that supports your outer life.' },
    { number: 5,  name: 'Fifth House',   keyword: 'Creativity & Romance',     meaning: 'The Fifth House is the house of joy — creative expression, romance, children, play, and all forms of pleasurable self-expression. It shows how you love and create.' },
    { number: 6,  name: 'Sixth House',   keyword: 'Health & Service',         meaning: 'The Sixth House governs your daily routines, health practices, work environment, and attitude toward service. It shows how you maintain your body and contribute to ordinary life.' },
    { number: 7,  name: 'Seventh House', keyword: 'Partnership & Others',     meaning: 'The Seventh House is the primary house of partnership — marriage, committed relationships, and significant one-on-one connections. It also shows what qualities you project onto others.' },
    { number: 8,  name: 'Eighth House',  keyword: 'Transformation & Depth',   meaning: 'The Eighth House governs shared resources, sexuality, death, and profound transformation. It rules what is hidden beneath the surface — power, inheritance, and the process of deep change.' },
    { number: 9,  name: 'Ninth House',   keyword: 'Philosophy & Expansion',   meaning: 'The Ninth House rules higher education, philosophy, long-distance travel, and spiritual seeking. It represents your quest for meaning and the belief systems that shape your worldview.' },
    { number: 10, name: 'Tenth House',   keyword: 'Career & Public Life',     meaning: 'The Tenth House is the highest point of the chart, governing career, public reputation, authority, and your contribution to society. It shows the mountain you are climbing.' },
    { number: 11, name: 'Eleventh House',keyword: 'Community & Vision',       meaning: 'The Eleventh House governs friendships, social groups, collective ideals, and your vision for the future. It shows your relationship to community and your hopes and dreams.' },
    { number: 12, name: 'Twelfth House', keyword: 'Soul & Hidden Depths',     meaning: 'The Twelfth House rules the unconscious, spiritual retreat, hidden enemies, and undoing. It is the house of what is hidden from the self, and contains both your greatest vulnerabilities and your deepest spiritual gifts.' },
  ];

  // ── Aspect Interpretations ────────────────────────────────────────────────
  const ASPECT_MEANINGS = {
    Conjunction: {
      'Sun-Moon': 'A New Moon natally — your conscious will and instinctive emotional nature are deeply fused, creating powerful focus and consistency. You are what you feel, and you feel what you are.',
      'Sun-Venus': 'Your identity is deeply intertwined with beauty, love, and aesthetic experience. You are charming, relationship-oriented, and naturally artistic.',
      'Sun-Mars': 'Vitality, drive, and ambition are concentrated in your core identity. You are energetic, competitive (with yourself most of all), and direct in your pursuit of goals.',
      'Sun-Jupiter': 'An aspect of natural luck, expansion, and philosophical depth. You tend to attract opportunity and maintain an optimism that becomes self-fulfilling.',
      'Sun-Saturn': 'Your identity is shaped by responsibility, discipline, and a serious relationship to achievement. Growth feels earned — and that makes it more meaningful.',
      'Moon-Venus': 'Emotional and aesthetic harmony characterize this placement. You have refined emotional intelligence, genuine warmth, and a talent for creating beauty in your personal environment.',
      'Moon-Mars': 'Emotional intensity and reactive instincts combine. You feel deeply and react quickly. Learning to pause between stimulus and response is a lifelong — and very rewarding — practice.',
      'Venus-Mars': 'The principle of attraction meets the principle of desire. Your romantic and sexual nature is powerful, magnetic, and creative. Passion is central to your aliveness.',
      default: 'These two planetary principles operate with unusual intensity and fusion in your chart, blending their qualities into a single concentrated expression.'
    },
    Trine: {
      default: 'This harmonious trine (120°) indicates that these two planetary energies flow together naturally and supportively. The gifts this aspect offers can become so comfortable they\'re taken for granted — consciously engaging them unlocks their extraordinary potential.'
    },
    Sextile: {
      default: 'This sextile (60°) represents an opportunity aspect — these planetary forces can work well together when actively engaged. Unlike trines, sextiles require some conscious effort to activate but reward that effort generously.'
    },
    Square: {
      default: 'This square (90°) creates productive tension between these planetary forces. The friction generates energy, motivation, and ultimately, mastery — once the conflict is worked through consciously. Many of history\'s greatest achievers have chart full of squares.'
    },
    Opposition: {
      default: 'This opposition (180°) represents a polarity requiring integration. You may experience this as an inner tug-of-war, or project one pole onto other people. The path forward is holding both energies simultaneously rather than alternating between them.'
    },
  };

  // ── Retrograde Periods ────────────────────────────────────────────────────
  const RETROGRADE_SCHEDULE = [
    { planet: 'Mercury', start: '2025-03-15', end: '2025-04-07',  sign: 'Aries',    effect: 'Communication breakdowns, travel delays, and technology glitches are most likely. Review, revise, and revisit — but hold off on signing contracts or launching new projects.' },
    { planet: 'Mercury', start: '2025-07-18', end: '2025-08-11',  sign: 'Leo',      effect: 'Creative projects and communications need careful review. Creative blocks clear when you revisit earlier abandoned ideas.' },
    { planet: 'Mercury', start: '2025-11-09', end: '2025-11-29',  sign: 'Scorpio',  effect: 'Deep truths surface. Hidden information comes to light. Important revelations arrive through dreams and subtle channels.' },
    { planet: 'Venus',   start: '2025-03-01', end: '2025-04-12',  sign: 'Aries',    effect: 'Relationships and finances enter a reassessment period. Past loves and financial issues resurface for final resolution.' },
    { planet: 'Mars',    start: '2024-12-06', end: '2025-02-23',  sign: 'Cancer/Leo', effect: 'Energy levels and motivation fluctuate. Anger and frustration may internalize. Physical activity needs adjustment to avoid injury.' },
    { planet: 'Jupiter', start: '2025-11-11', end: '2026-03-11',  sign: 'Gemini',   effect: 'Expansion turns inward. Philosophy, higher learning, and spiritual growth are rewarded. External opportunities may slow.' },
    { planet: 'Saturn',  start: '2025-07-13', end: '2025-11-28',  sign: 'Aries',    effect: 'Responsibilities and limitations feel more pressing. Karma comes due. Patient, disciplined work on foundations is most productive.' },
  ];

  // ── Upcoming Eclipses ─────────────────────────────────────────────────────
  const ECLIPSE_SCHEDULE = [
    { type: 'Solar',  date: '2025-03-29', sign: 'Aries',   degree: '9°',  saros: 149, meaning: 'New beginnings in areas ruled by Aries — initiative, identity, courage. A powerful seed-planting eclipse that activates long-term goals set around this degree.' },
    { type: 'Lunar',  date: '2025-04-13', sign: 'Libra',   degree: '23°', saros: 132, meaning: 'Relationship patterns come to a culmination point. Partnerships — personal and professional — are highlighted for completion or renewal.' },
    { type: 'Solar',  date: '2025-09-21', sign: 'Virgo',   degree: '29°', saros: 143, meaning: 'A critical degree eclipse activating healing, service, and practical matters. What needs to be released before the next chapter can begin?' },
    { type: 'Lunar',  date: '2025-10-07', sign: 'Aries',   degree: '14°', saros: 118, meaning: 'Emotional culmination around independence, courage, and self-assertion. What have you outgrown? What boldness is ready to emerge?' },
    { type: 'Solar',  date: '2026-02-17', sign: 'Aquarius',degree: '28°', saros: 130, meaning: 'Community, innovation, and social vision receive fresh activation. Revolutionary ideas whose time has finally come find fertile ground.' },
  ];

  // ── Public Methods ────────────────────────────────────────────────────────

  function getDailyHoroscope(sign, date) {
    const Eph    = window.Ephemeris;
    const day    = date ? new Date(date) : new Date();
    const epochDay = Math.floor(day.getTime() / 86400000);
    const signObj  = Eph ? Eph.ZODIAC_SIGNS.find(s => s.name === sign) : { name: sign };

    const overviews = DAILY_OVERVIEWS[sign] || DAILY_OVERVIEWS.Aries;
    const idx       = Math.abs((signObj ? ZODIAC_SIGNS_ORDER.indexOf(sign) : 0) * 31 + epochDay) % overviews.length;

    // Generate lucky number and color
    const seed      = epochDay + (signObj ? ZODIAC_SIGNS_ORDER.indexOf(sign) + 1 : 1);
    const luckyNum  = (seed % 9) + 1;
    const colors    = ['Amethyst Purple', 'Celestial Gold', 'Midnight Blue', 'Emerald Green', 'Ruby Red', 'Pearl White', 'Sapphire', 'Rose Gold', 'Obsidian Black', 'Copper', 'Lavender', 'Turquoise'];
    const luckyColor= colors[seed % colors.length];

    const loveTexts = [
      "Venus smiles on your relationships today. Open your heart to both giving and receiving affection. A meaningful conversation deepens an existing bond.",
      "Romantic energy is electric today. Single? A chance meeting could be significant. Partnered? Plan something special and spontaneous.",
      "Emotional honesty in your closest relationship creates unexpected closeness. What you've been afraid to say is exactly what's needed.",
    ];
    const careerTexts = [
      "Your professional instincts are sharp today. Trust your read of the situation and act decisively on the opportunity in front of you.",
      "Collaboration is highly favored. A team effort produces results that surpass what you could achieve individually. Delegate with confidence.",
      "A long-term career move you've been considering becomes clearer. The timing aligns — preparation meets opportunity right now.",
    ];
    const healthTexts = [
      "Movement and vitality are highlighted. Honor your body's signals — both its energy and its need for rest. A new wellness habit takes root today.",
      "Mental clarity follows physical activity today. A walk, swim, or yoga session unlocks insights that no amount of desk-thinking could produce.",
      "Sleep quality significantly affects your energy this week. Protect your evening routine; what you do before bed shapes tomorrow's performance.",
    ];

    return {
      sign,
      date:       day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      overview:   overviews[idx % overviews.length],
      love:       loveTexts[seed % loveTexts.length],
      career:     careerTexts[(seed + 1) % careerTexts.length],
      health:     healthTexts[(seed + 2) % healthTexts.length],
      weekly:     WEEKLY_THEMES[sign] || '',
      luckyNumber: luckyNum,
      luckyColor,
    };
  }

  const ZODIAC_SIGNS_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  function getPlanetInterpretation(planet, sign) {
    return (PLANET_IN_SIGN[planet] && PLANET_IN_SIGN[planet][sign])
      || `${planet} in ${sign} blends ${planet}'s core principle with ${sign}'s qualities, creating a unique expression that colors this area of your chart.`;
  }

  function getHouseMeaning(number) {
    return HOUSE_MEANINGS.find(h => h.number === number) || HOUSE_MEANINGS[0];
  }

  function getAspectMeaning(aspectType, p1, p2) {
    const key   = `${p1}-${p2}`;
    const group = ASPECT_MEANINGS[aspectType];
    if (!group) return 'This planetary relationship adds texture and meaning to your chart.';
    return group[key] || group[`${p2}-${p1}`] || group.default;
  }

  function getRetrogradePeriods() { return RETROGRADE_SCHEDULE; }
  function getEclipseSchedule()   { return ECLIPSE_SCHEDULE; }

  function getBestMatches(sign) {
    const Eph  = window.Ephemeris;
    if (!Eph) return [];

    return ZODIAC_SIGNS_ORDER
      .filter(s => s !== sign)
      .map(s => ({ sign: s, ...Eph.getCompatibilityScore(sign, s) }))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 3);
  }

  // ── analyzeChart ─────────────────────────────────────────────────────────
  function analyzeChart(chart) {
    if (!chart || !chart.positions) return { personality:'', love:'', career:'', challenges:'', lifePurpose:'', keyPlacements:[] };
    const E = window.AstroEphemeris;
    const signOf = lon => E ? E.signName(lon) : '?';

    const sun  = signOf(chart.positions.Sun?.lon  || 0);
    const moon = signOf(chart.positions.Moon?.lon || 0);
    const asc  = chart.risingSign || signOf(chart.asc || 0);
    const mc   = signOf(chart.positions.MC?.lon || chart.mc || 0);
    const venus= signOf(chart.positions.Venus?.lon || 0);
    const saturn=signOf(chart.positions.Saturn?.lon|| 0);
    const node = signOf(chart.positions.NNode?.lon || 0);

    const personality = `With your Sun in ${sun}, Moon in ${moon}, and ${asc} Rising, you embody a unique fusion of ${sun} vitality, ${moon} emotional instincts, and ${asc} outward presentation. Your core identity is shaped by ${sun} themes — ${getPlanetInterpretation('Sun', sun)?.slice(0,120)||'personal power and self-expression'}. ` +
      `Emotionally, your ${moon} Moon gives you a ${moon === 'Cancer' || moon === 'Pisces' || moon === 'Scorpio' ? 'deep, intuitive' : moon === 'Aries' || moon === 'Leo' || moon === 'Sagittarius' ? 'fiery, spontaneous' : 'thoughtful, measured'} inner world. ` +
      `Others experience you first through your ${asc} Ascendant — ${moon === asc ? 'your inner and outer selves are notably aligned' : 'which can sometimes feel at odds with your deeper ${sun} Sun nature, creating the interesting complexity that makes you so compelling'}.`;

    const love = `Venus in ${venus} describes how you love and what you find beautiful. ${getPlanetInterpretation('Venus', venus)?.slice(0,200)||'You seek harmony and connection in relationships'}. ` +
      `Your ${asc} Rising shapes your approach to partnership — you attract partners who complement your ${asc} energy. ${chart.planetHouses?.Venus ? `Venus occupies your ${ordinal(chart.planetHouses.Venus)} house, emphasizing ${getHouseMeaning(chart.planetHouses.Venus)?.slice(0,80)||'relationship themes'}` : ''}.`;

    const career = `Your Midheaven in ${mc} points to public recognition through ${mc} themes. ${getPlanetInterpretation('Sun', mc)?.slice(0,120)||'leadership and self-expression'}. ` +
      `Saturn in ${saturn} describes your relationship with discipline, authority, and long-term achievement: ${getPlanetInterpretation('Saturn', saturn)?.slice(0,150)||'structured growth over time'}. ` +
      `The chart ruler (${chart.chartRuler || '?'}) adds its distinctive flavor to how you pursue your calling.`;

    const challenges = `Saturn in ${saturn} marks your primary growth edge — areas where resistance becomes wisdom. ${getPlanetInterpretation('Saturn', saturn)?.slice(0,160)||'Discipline and structure are your teachers'}. ` +
      `${chart.aspects?.filter(a => a.aspect === 'square' || a.aspect === 'opposition').slice(0,2).map(a => `The ${a.aspect} between your ${a.planet1} and ${a.planet2} (${a.orb.toFixed(1)}° orb) creates productive tension that demands integration.`).join(' ')||'Your chart shows a balance of challenge and support.'}`;

    const lifePurpose = `Your North Node in ${node} points toward your soul's evolutionary direction — moving toward ${node} qualities that may feel unfamiliar but deeply fulfilling. ` +
      `With your Sun in ${sun} and rising ${asc}, your purpose is expressed through ${sun} themes channeled through a ${asc} lens. ` +
      `The combination of your nodal axis and solar purpose suggests a life path centered on ${['authenticity','service','connection','transformation','wisdom','creativity'][Math.floor((chart.asc||0)/60) % 6]}.`;

    const keyPlacements = [
      `Sun in ${sun} (${ordinal(chart.planetHouses?.Sun||1)} house) — core identity and life force`,
      `Moon in ${moon} (${ordinal(chart.planetHouses?.Moon||1)} house) — emotional foundation`,
      `${asc} Rising — outward personality and life approach`,
      `Venus in ${venus} — love nature and aesthetic values`,
      `MC in ${mc} — career direction and public role`,
    ];

    return { personality, love, career, challenges, lifePurpose, keyPlacements };
  }

  function ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10]||s[v]||s[0]);
  }

  // ── calculateCompatibility ────────────────────────────────────────────────
  function calculateCompatibility(chart1, chart2) {
    if (!chart1 || !chart2) return { overall:50, love:50, communication:50, values:50, longTerm:50, passion:50, synastryAspects:[], overview:'' };
    const E = window.AstroEphemeris;
    const signOf = lon => E ? E.signName(lon) : '?';

    // Element compatibility matrix
    const elemCompat = {fire:{fire:80,air:85,earth:55,water:60}, earth:{earth:80,water:85,fire:55,air:60},
                        air:{air:80,fire:85,water:55,earth:60},  water:{water:80,earth:85,air:55,fire:60}};
    const elemOf = sign => ({Aries:'fire',Leo:'fire',Sagittarius:'fire',Taurus:'earth',Virgo:'earth',Capricorn:'earth',
                              Gemini:'air',Libra:'air',Aquarius:'air',Cancer:'water',Scorpio:'water',Pisces:'water'})[sign]||'fire';

    const sun1=signOf(chart1.positions?.Sun?.lon||0), sun2=signOf(chart2.positions?.Sun?.lon||0);
    const moon1=signOf(chart1.positions?.Moon?.lon||0), moon2=signOf(chart2.positions?.Moon?.lon||0);
    const venus1=signOf(chart1.positions?.Venus?.lon||0), venus2=signOf(chart2.positions?.Venus?.lon||0);
    const mars1=signOf(chart1.positions?.Mars?.lon||0), mars2=signOf(chart2.positions?.Mars?.lon||0);

    const base = elemCompat[elemOf(sun1)]?.[elemOf(sun2)] || 65;
    const moonScore  = elemCompat[elemOf(moon1)]?.[elemOf(moon2)] || 65;
    const venusScore = elemCompat[elemOf(venus1)]?.[elemOf(venus2)] || 65;
    const passionScore = (elemCompat[elemOf(venus1)]?.[elemOf(mars2)] || 65 +
                          elemCompat[elemOf(venus2)]?.[elemOf(mars1)] || 65) / 2;

    // Synastry aspects (simplified: major aspects between key planets)
    const synastryAspects = [];
    const p1list = ['Sun','Moon','Venus','Mars','Jupiter','Saturn'];
    const p2list = ['Sun','Moon','Venus','Mars','Jupiter','Saturn'];
    for (const p1 of p1list) {
      for (const p2 of p2list) {
        if (!chart1.positions?.[p1] || !chart2.positions?.[p2]) continue;
        const diff = Math.abs(((chart1.positions[p1].lon - chart2.positions[p2].lon) % 360 + 360) % 360);
        const norm = diff > 180 ? 360 - diff : diff;
        for (const {name, angle, orb} of (E?.ASPECT_DEFS||[])) {
          if (Math.abs(norm - angle) <= orb) {
            synastryAspects.push({
              p1, p2, aspect: name, orb: Math.abs(norm-angle).toFixed(1),
              interpretation: getAspectMeaning ? getAspectMeaning(`${p1}${p2}`, name)||`${p1}-${p2} ${name}: a ${name==='trine'||name==='sextile'?'harmonious':'dynamic'} connection in your composite energy.` : `${p1} ${name} ${p2}`
            });
            break;
          }
        }
      }
    }

    const jitter = (seed, range) => Math.floor(((Math.sin(seed)*0.5+0.5)) * range) - range/2;
    const seed = (sun1.charCodeAt(0)||65) * 7 + (sun2.charCodeAt(0)||65) * 13;
    const overall = Math.min(97, Math.max(20, Math.round((base + moonScore + venusScore) / 3 + jitter(seed, 10))));

    return {
      overall,
      love:          Math.min(97, Math.max(20, Math.round(venusScore + jitter(seed+1, 15)))),
      communication: Math.min(97, Math.max(20, Math.round(base + jitter(seed+2, 20)))),
      values:        Math.min(97, Math.max(20, Math.round(moonScore + jitter(seed+3, 15)))),
      longTerm:      Math.min(97, Math.max(20, Math.round((base+moonScore)/2 + jitter(seed+4, 10)))),
      passion:       Math.min(97, Math.max(20, Math.round(passionScore + jitter(seed+5, 20)))),
      synastryAspects,
      overview: `${sun1} Sun and ${sun2} Sun create a ${overall>=70?'naturally harmonious':'complex but growth-oriented'} dynamic. Your elemental natures ${elemOf(sun1)===elemOf(sun2)?'share the same element, creating natural understanding':'come from different elements, offering complementary strengths'}. The Moon in ${moon1} and Moon in ${moon2} ${elemOf(moon1)===elemOf(moon2)?'speak the same emotional language':'must learn each other\'s emotional dialects — a rewarding journey'}.`
    };
  }

  // ── getTransitAspects ─────────────────────────────────────────────────────
  function getTransitAspects(natalChart, transitPositions) {
    if (!natalChart || !transitPositions) return [];
    const E = window.AstroEphemeris;
    const aspects = [];
    const transitPlanets = ['Jupiter','Saturn','Uranus','Neptune','Pluto','Sun','Moon','Mercury','Venus','Mars'];
    const natalPlanets   = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','ASC','MC'];

    const TRANSIT_INTERPS = {
      'Jupiter_Sun_trine':    'Jupiter trine natal Sun: A period of exceptional luck, confidence, and expansion. Opportunities flow naturally toward you. Growth, recognition, and abundance are themes. Say yes to what aligns with your authentic path.',
      'Jupiter_Sun_conjunction': 'Jupiter conjunct natal Sun: A landmark year of growth and positive energy. Your confidence expands, opportunities multiply, and life rewards bold moves. Health and vitality are strong.',
      'Saturn_Sun_square':    'Saturn square natal Sun: A challenging test of your identity and will. Obstacles reveal where you need to strengthen. This friction, while uncomfortable, builds lasting character and capability.',
      'Saturn_Sun_conjunction':'Saturn conjunct natal Sun: A significant life restructuring period. Responsibilities increase, but so does your capacity for them. What you build now lasts. Seriousness and discipline yield long-term reward.',
      'Pluto_Sun_conjunction':'Pluto conjunct natal Sun: A profound transformation of identity. Old structures of self fall away to reveal deeper authenticity. This is one of the most powerful transits in astrology — regenerative and intense.',
      'Uranus_Sun_opposition':'Uranus opposition natal Sun: Unexpected disruptions to your life direction push you toward authentic freedom. Resistance intensifies the disruption; flexibility and openness ease the transition.',
      'Neptune_Sun_trine':    'Neptune trine natal Sun: Spiritual sensitivity, creative inspiration, and compassion are heightened. Your intuition is especially reliable. Artistic or healing work thrives under this gentle, ethereal influence.',
      'Jupiter_Moon_trine':   'Jupiter trine natal Moon: Emotional contentment, domestic harmony, and nurturing connections are highlighted. Family matters go smoothly. Your emotional generosity is both genuine and magnetic right now.',
      'Saturn_Moon_square':   'Saturn square natal Moon: Emotional responsibilities feel heavy. Old emotional patterns surface for examination. The work of this transit builds emotional maturity and authentic self-sufficiency.',
      'Pluto_Moon_conjunction':'Pluto conjunct natal Moon: Deep emotional transformation. Old wounds and unconscious patterns surface with intensity. The process is challenging but results in profound emotional depth and resilience.',
    };

    for (const tp of transitPlanets) {
      if (!transitPositions[tp]) continue;
      for (const np of natalPlanets) {
        if (!natalChart.positions?.[np]) continue;
        const diff = Math.abs(((transitPositions[tp].lon - natalChart.positions[np].lon) % 360 + 360) % 360);
        const norm = diff > 180 ? 360-diff : diff;
        for (const {name, angle, orb} of (E?.ASPECT_DEFS || [])) {
          const actualOrb = Math.abs(norm - angle);
          if (actualOrb <= orb) {
            const key = `${tp}_${np}_${name}`;
            const interp = TRANSIT_INTERPS[key] || `Transiting ${tp} forms a ${name} to your natal ${np} (${actualOrb.toFixed(1)}° orb). This ${name==='trine'||name==='sextile'?'harmonious':'dynamic'} transit activates ${np} themes in your chart, bringing ${name==='conjunction'?'intensification':name==='trine'?'ease and flow':name==='square'?'productive tension':'transformative energy'} to this area of life.`;
            aspects.push({
              transitPlanet: tp, natalPlanet: np, aspect: name,
              orb: actualOrb, strength: actualOrb < 2 ? 'major' : 'minor',
              interpretation: interp,
            });
            break;
          }
        }
      }
    }
    return aspects.sort((a,b) => a.orb - b.orb);
  }

  return {
    getDailyHoroscope,
    getPlanetInterpretation,
    getHouseMeaning,
    getAspectMeaning,
    getRetrogradePeriods,
    getEclipseSchedule,
    getBestMatches,
    analyzeChart,
    calculateCompatibility,
    getTransitAspects,
    ZODIAC_SIGNS_ORDER,
  };
})();

// Expose under both names
window.AstroInterpretations = window.Interpretations;




// ═══════════════════════════════════════════════════════════════════════════
// PART B — Extended Interpretations Module
// ═══════════════════════════════════════════════════════════════════════════

// ── SECTION 1: Aspect Interpretations (80 entries) ───────────────────────
const ASPECTS = {
  'SunMoon_conjunction': "The conjunction of Sun and Moon creates a unified personality where conscious will and instinctive need are fused — you tend to project a consistent character across all situations. There is great personal power in this alignment, but also a potential blind spot: because your emotional reactions and your ego are so similar, you may struggle to step back and objectively assess your own motivations. New Moons fall near your birthday, giving your intentions extra potency — deliberate goal-setting at those times is especially effective for you.",
  'SunMoon_opposition': "The opposition of Sun and Moon reflects the Full Moon pattern — you live in the awareness of a fundamental polarity between your conscious drive and your emotional needs. Relationships act as mirrors, and you often see your own inner conflict played out in your closest partnerships. The path forward is integration: neither suppressing the emotional Moon nor letting it overwhelm the solar will, but weaving them into a richer whole.",
  'SunMoon_trine': "The trine between Sun and Moon flows harmoniously, giving you an instinctive alignment between your sense of purpose and your emotional reactions. You rarely feel torn between what you want and what you feel, which creates a natural ease and confidence that others find enviable and magnetic. This flow can be taken for granted — consciously developing both the solar will and the lunar intuition separately helps you maximize this natural gift.",
  'SunMoon_square': "The square between Sun and Moon creates a productive tension between your ego drives and your emotional instincts — you often feel you want one thing but need another. This friction is a powerful engine for growth: the very discomfort that drives you to reconcile these inner contradictions builds tremendous psychological depth and resilience. People born under this aspect often become skilled at understanding human nature precisely because they have had to work so hard to understand their own.",
  'SunMoon_sextile': "The sextile between Sun and Moon offers an opportunity for conscious cooperation between your will and your feelings. Unlike the trine, which flows automatically, this sextile rewards active effort — when you consciously align your intentions with your emotional needs, remarkable productivity and fulfillment follow. You have a natural gift for understanding the emotional underpinnings of practical situations.",
  'SunMercury_conjunction': "With the Sun conjunct Mercury, your mind and your identity are deeply intertwined — thinking is not something you do, it is something you are. Communication, analysis, and the exchange of ideas are central to your self-expression and your sense of vitality. The potential challenge is a certain subjectivity in your thinking; because your ego and intellect are fused, it can be difficult to separate what you know from what you are, making you occasionally defensive about your intellectual positions.",
  'SunMercury_opposition': "The Sun opposite Mercury is a rare configuration that creates an awareness of the gap between your conscious self and how you communicate — you may feel that words never quite capture who you really are, or that others interpret your meaning differently than you intend. This tension drives you toward precision and clarity in expression as a lifelong refinement. You are often aware of multiple sides of an argument and can articulate the opposite of your own position with surprising skill.",
  'SunMercury_trine': "The Sun trine Mercury grants you natural fluency in expressing yourself — your words match your intentions with unusual accuracy, and others understand your meaning easily. You have an innate ability to present your ideas with clarity and confidence, making you an effective communicator in any field. Your intellectual curiosity and your sense of self reinforce each other, so learning new things feels like an act of self-discovery rather than mere information gathering.",
  'SunMercury_square': "The Sun square Mercury creates a dynamic tension between how you present yourself and how you think — your communication style may not always reflect your deeper identity, or you may wrestle with saying what you truly mean versus what seems appropriate. This productive friction drives you toward ever-greater precision and authenticity in expression. Many gifted writers and thinkers have this aspect, as the struggle to communicate accurately produces remarkable depth and craft.",
  'SunMercury_sextile': "The Sun sextile Mercury offers a flowing, cooperative relationship between your identity and your intellect that rewards conscious engagement. You have the capacity to express yourself with both heart and mind when you choose to invest in communication. Your thinking tends to be both creative and logical, and you can translate complex inner experiences into language that others can readily grasp.",
  'SunVenus_conjunction': "The Sun conjunct Venus is one of the most aesthetically gifted placements in astrology — beauty, harmony, and relational pleasure are not optional extras but core expressions of who you are. Your charm is genuine and effortless, attracting people and opportunities with a natural magnetism. The potential challenge is a tendency to avoid necessary conflict in the name of harmony, or to tie your self-worth too closely to how others perceive you.",
  'SunVenus_opposition': "The Sun opposite Venus creates a polarity between self-expression and relationship — you may feel a persistent tug between being fully yourself and accommodating what others need or expect. This tension makes you highly aware of relational dynamics and gives you exceptional empathy, but can also produce a pattern of alternating between self-assertion and self-sacrifice. The integration path leads to relationships where you can be both fully yourself and deeply connected.",
  'SunVenus_trine': "The Sun trine Venus is a genuinely lucky aspect that blesses you with natural charm, artistic sensibility, and an ease with people and pleasure. Relationships tend to flow naturally, and you attract good things — aesthetically, socially, and often materially — without great struggle. The growth edge is ensuring that this ease does not become complacency; your gifts are real and grow with conscious cultivation.",
  'SunVenus_square': "The Sun square Venus creates a productive tension between your authentic self-expression and your relational needs — you may find that what you most want to express is not always what makes you most lovable, or that seeking approval conflicts with staying true to yourself. This friction produces exceptional creativity, particularly in art and performance, as you work to synthesize these competing drives. Relationships are growth-inducing precisely because they require you to integrate self and other.",
  'SunVenus_sextile': "The Sun sextile Venus offers a cooperative harmony between your self-expression and your relational instincts that rewards conscious attention. You have the capacity for genuine warmth and aesthetic refinement, and when you invest in relationships and creative work, these areas of life flourish. Your natural grace and sociability are genuine assets in both personal and professional contexts.",
  'SunMars_conjunction': "The Sun conjunct Mars creates a person of exceptional drive, energy, and assertiveness — your will and your capacity to act are fused into a single powerful force. You are someone who makes things happen, who initiates, who meets obstacles with direct confrontation rather than evasion. The growth challenge is learning to channel this concentrated energy with patience and strategic thinking, rather than burning through situations with force that sometimes creates unnecessary resistance.",
  'SunMars_opposition': "The Sun opposite Mars creates a dynamic tension between your sense of self and your drive to act — you may experience this as an inner conflict between who you are and what you want, or project it outward as a pattern of attracting adversarial people who catalyze your growth through opposition. This aspect produces remarkable resilience and competitive edge when its energy is channeled constructively. Learning to work with rather than against others transforms conflict into collaboration.",
  'SunMars_trine': "The Sun trine Mars gives you natural vitality, physical confidence, and an easy relationship with your own assertiveness. You know what you want and pursue it with healthy directness, rarely second-guessing yourself into inaction. Athletic ability, physical courage, and the capacity for sustained effort characterize this placement. Your energy is a genuine gift — protective, decisive, and generative.",
  'SunMars_square': "The Sun square Mars is one of the most energetic and potentially challenging aspects — your drive and your sense of identity are in productive conflict, generating enormous energy that demands a constructive outlet. You may wrestle with impatience, a tendency toward aggression under pressure, or a pattern of self-sabotage when success feels too close. Athletes, entrepreneurs, and reformers often carry this aspect because the tension it creates fuels extraordinary achievement.",
  'SunMars_sextile': "The Sun sextile Mars offers you a flowing cooperation between your solar identity and your Martian drive that produces steady, confident energy when consciously engaged. You are able to pursue your goals with appropriate assertiveness without the volatility that more tense aspects can create. Physical activity serves as an important channel for your energy and enhances your mental clarity and emotional wellbeing.",
  'SunJupiter_conjunction': "The Sun conjunct Jupiter is classically considered one of the luckiest placements in a birth chart — your sense of self is naturally expansive, optimistic, and oriented toward growth and abundance. Opportunities tend to find you, and your confidence often becomes a self-fulfilling prophecy of success. The growth edge involves avoiding the excesses of over-confidence, over-extension, and the tendency to skip the disciplined preparation that makes expansion sustainable.",
  'SunJupiter_opposition': "The Sun opposite Jupiter creates a polarity between your personal identity and the larger philosophical, social, and expansive forces in your life — you may swing between self-doubt and over-confidence, or find that external opportunities and constraints are frequently testing the edges of your vision. When integrated, this aspect produces extraordinary breadth of perspective and genuine wisdom earned through experience. Others benefit from your hard-won philosophical maturity.",
  'SunJupiter_trine': "The Sun trine Jupiter is an exceptional gift — confidence, generosity, optimism, and an instinct for the right timing combine to attract continuous opportunity and goodwill. Your belief in the fundamental benevolence of life is not naive but prophylactic; it actually influences outcomes in your favor. Consciously developing the discipline to match your expansive vision ensures that this aspect reaches its fullest potential.",
  'SunJupiter_square': "The Sun square Jupiter creates tension between your individual will and the expansive, philosophical impulse to grow beyond your current form — you may alternate between grandiosity and deflation, or find that your reach consistently exceeds your grasp until you learn to marry vision with preparation. This aspect, when mastered, produces people of remarkable scope and ambition who achieve things that seemed impossibly optimistic from the starting line.",
  'SunJupiter_sextile': "The Sun sextile Jupiter offers a cooperative relationship between your solar identity and Jupiter's expansive energy that rewards initiative and optimism. You have natural good fortune that activates when you engage it actively — doors open when you knock, and your faith in the positive tends to prove itself correct. Generosity toward others circles back to you in forms you could not have anticipated.",
  'SunSaturn_conjunction': "The Sun conjunct Saturn is a sobering, serious, and ultimately powerful aspect that places responsibility, discipline, and a demanding relationship with achievement at the very center of your identity. You may have experienced early life circumstances that required maturity before its time, creating a deep, hard-earned wisdom. The gift of this aspect is extraordinary staying power and the ability to build things that last; the growth edge is allowing joy, playfulness, and self-acceptance alongside the relentless drive for mastery.",
  'SunSaturn_opposition': "The Sun opposite Saturn creates a fundamental tension between your sense of self and the Saturnian forces of limitation, responsibility, and authority — you may feel that external structures or authority figures are in conflict with your ability to fully express who you are. This friction, while difficult, forges character of remarkable durability and produces individuals who understand both freedom and limitation from the inside. Integrating personal authority with appropriate structure is the lifelong work.",
  'SunSaturn_trine': "The Sun trine Saturn is a quietly powerful aspect that gives you natural discipline, endurance, and a mature relationship with responsibility that serves you exceptionally well over the long term. You understand intuitively that lasting achievement requires consistent effort, and you rarely pursue shortcuts that undermine long-term integrity. Others trust you implicitly because your reliability is demonstrated, not merely claimed.",
  'SunSaturn_square': "The Sun square Saturn creates one of astrology's most instructive tensions — between your desire for self-expression and the Saturnian demand for structure, limitation, and earned authority. You may feel that the world presents more obstacles than others encounter, but each obstacle, when worked through, builds a specific capability that cannot be acquired any other way. This aspect is found prominently in charts of people who achieve significant things through disciplined, sustained effort.",
  'SunSaturn_sextile': "The Sun sextile Saturn offers a cooperative relationship between your solar vitality and Saturnian discipline that, when consciously engaged, produces reliable, consistent achievement. You are capable of taking your long-term vision seriously without being paralyzed by it, and your work ethic is genuine rather than performed. This aspect supports career longevity and the slow accumulation of authentic authority.",
  'MoonMercury_conjunction': "The Moon conjunct Mercury creates a person whose feelings and thoughts are deeply intertwined — you process emotions through language and ideas, and your best thinking is always colored by feeling. You are naturally expressive, often gifted with words, and possess a remarkable memory for emotional experiences and conversations. The growth edge involves developing the capacity for direct emotional experience prior to interpretation, allowing feelings to be felt fully before they are analyzed.",
  'MoonMercury_opposition': "The Moon opposite Mercury creates a tension between your emotional responses and your rational mind — you may find that your feelings and your thoughts are frequently at odds, or that you intellectualize emotions as a way of managing their intensity. This aspect produces exceptional communication skills precisely because you have had to work hard to bridge the inner gap between feeling and thinking. Writers, therapists, and teachers often carry this placement.",
  'MoonMercury_trine': "The Moon trine Mercury grants you a flowing cooperation between your emotional intelligence and your intellectual capacity — you can think about feelings without losing touch with them, and feel your way through ideas without being swept away by them. This balance makes you an exceptionally effective communicator, particularly in emotionally nuanced situations. Your memory for meaningful conversations and emotional details is exceptional.",
  'MoonMercury_square': "The Moon square Mercury creates productive friction between your emotional nature and your rational mind — you may find yourself torn between what you feel and what you think you should feel, or between honesty and the desire to avoid emotional conflict. This tension, worked with consciously, produces remarkable psychological insight and sophisticated communication. You understand the complexity of human emotional experience from the inside.",
  'MoonMercury_sextile': "The Moon sextile Mercury gives you a natural facility for translating emotional experience into clear, empathic communication that others readily understand. You have an instinctive sense of what people need to hear and how to deliver it with both accuracy and sensitivity. Journaling, counseling, writing, and teaching are all natural expressions of this cooperative aspect.",
  'MoonVenus_conjunction': "The Moon conjunct Venus is one of the most gracious, emotionally warm, and aesthetically sensitive placements possible — your emotional needs and your capacity for love and beauty are harmoniously fused, creating a person of genuine tenderness and refined feeling. You create warmth wherever you go and have a natural instinct for what makes people feel valued and beautiful. The growth edge is ensuring that your instinct for harmony does not suppress necessary conflict or cause you to avoid your own deeper emotional truths.",
  'MoonVenus_opposition': "The Moon opposite Venus creates a polarity between your emotional security needs and your desire for love and beauty — you may feel that full emotional safety and full romantic fulfillment are somehow in tension, or find yourself drawn to relationships that are aesthetically or romantically exciting but emotionally unsettling. This aspect produces deep sensitivity and a sophisticated understanding of the complexities of love when its lessons are integrated.",
  'MoonVenus_trine': "The Moon trine Venus is a beautifully harmonious aspect that creates natural emotional warmth, artistic sensitivity, and an easy capacity for love and pleasure. Your emotional needs and your relational instincts reinforce each other, making you someone people naturally gravitate toward for comfort, beauty, and genuine care. Creative work that expresses your inner world tends to resonate deeply with others.",
  'MoonVenus_square': "The Moon square Venus creates a productive tension between your emotional security needs and your desire for love, beauty, and relational pleasure — you may find that what you need emotionally and what you want romantically are frequently at odds. This tension produces extraordinary depth of feeling and a sophisticated understanding of the difference between genuine intimacy and comfortable familiarity. The integration of emotional security and romantic fulfillment is a central life theme.",
  'MoonVenus_sextile': "The Moon sextile Venus offers a cooperative harmony between your emotional nature and your capacity for love and beauty that rewards conscious attention. You have a genuine warmth and aesthetic sensitivity that enriches your relationships and your creative expression. Domestic beauty, emotional hospitality, and the cultivation of relationships that nourish at both feeling and sensory levels are natural strengths.",
  'MoonMars_conjunction': "The Moon conjunct Mars fuses emotional reactivity with direct action in a placement of considerable intensity — you feel things immediately and respond almost simultaneously, with a passion and directness that can be both impressive and overwhelming. Your protectiveness of those you love is fierce, your anger is honest, and your emotional courage is remarkable. The growth edge is developing the pause between feeling and reaction that allows for more discerning responses.",
  'MoonMars_opposition': "The Moon opposite Mars creates a fundamental tension between your emotional needs and your drive to act — you may experience this as alternating between emotional vulnerability and aggressive self-protection, or attract partners who embody the Mars energy you have difficulty owning. When integrated, this aspect produces emotional courage and the ability to act decisively even when feeling intensely. The capacity to be both sensitive and assertive is its ultimate gift.",
  'MoonMars_trine': "The Moon trine Mars gives you a flowing cooperation between your emotional nature and your drive — you can act on your feelings with appropriate confidence, and your emotional responses tend to be honest and direct without unnecessary aggression. Physical vitality, emotional courage, and the ability to take action from a place of authentic feeling characterize this placement. You rarely experience the paralysis of conflicting emotional and willful impulses.",
  'MoonMars_square': "The Moon square Mars is one of astrology's most intensely emotional aspects — your feelings and your drives are in constant productive friction, generating enormous energy that demands healthy outlets. Anger, passion, protectiveness, and desire are all heightened and can be either constructively channeled or destructively expressed depending on the awareness you bring. This aspect is found in charts of people with remarkable emotional courage and the capacity for intense, genuine passion.",
  'MoonMars_sextile': "The Moon sextile Mars offers a cooperative relationship between your emotional nature and your drive that rewards active engagement. You are capable of acting on your feelings with appropriate confidence and can be both emotionally responsive and practically effective. Physical activity and creative expression both serve as excellent channels for the constructive flow of this sextile's energy.",
  'MoonJupiter_conjunction': "The Moon conjunct Jupiter creates a person of generous emotional warmth, instinctive optimism, and an emotional landscape that is genuinely expansive and inclusive. You feel things on a large scale — your joys are exuberant, your compassion is broad, and your instinct is always to make more room for people rather than less. The growth edge involves developing discernment alongside generosity, and recognizing that emotional over-extension can lead to exhaustion.",
  'MoonJupiter_opposition': "The Moon opposite Jupiter creates a tension between your emotional security needs and the expansive, philosophical, and freedom-oriented impulses in your nature — you may feel that full emotional security and the freedom to grow and explore are in fundamental conflict. This tension, when worked with consciously, produces a remarkable breadth of emotional experience and a philosophical generosity that enriches everyone you know.",
  'MoonJupiter_trine': "The Moon trine Jupiter is an aspect of natural emotional abundance, optimism, and warmth that tends to make life feel fundamentally supportive and generative. Your emotional resilience is exceptional — you tend to find meaning and even gratitude in difficult experiences, which accelerates recovery and deepens wisdom. Generosity flows naturally from this aspect, and it tends to return to you in kind.",
  'MoonJupiter_square': "The Moon square Jupiter creates a productive tension between your emotional nature and your expansive instincts — you may find that your emotional responses are on a large, sometimes overwhelming scale, or that your desire for freedom and growth creates tension with your need for security and belonging. This friction produces extraordinary emotional and philosophical breadth when its energy is channeled into genuine growth rather than avoidance.",
  'MoonJupiter_sextile': "The Moon sextile Jupiter offers a cooperative harmony between your emotional nature and Jupiter's expansive, benevolent energy that rewards conscious engagement. You have a natural emotional generosity and optimism that makes you genuinely pleasant to be around and draws people toward you. Your instinct for the larger meaning in emotional experiences gives you a philosophical equanimity that others find both inspiring and comforting.",
  'MoonSaturn_conjunction': "The Moon conjunct Saturn is a deeply serious aspect that creates a complex, often challenging relationship with your own emotional nature — you may have learned early that feelings were not safe to express, leading to a careful, sometimes guarded emotional style that houses remarkable depth and sensitivity beneath its composed exterior. The gift of this aspect is extraordinary emotional resilience, patience, and a mature capacity for sustained emotional commitment. The work is learning to allow the inner emotional world to be received and expressed.",
  'MoonSaturn_opposition': "The Moon opposite Saturn creates a fundamental tension between your emotional needs and the Saturnian forces of limitation, responsibility, and reserve — you may feel that full emotional expression conflicts with the controlled, competent self you need to present to the world. This tension, when worked through, produces individuals of remarkable emotional maturity and the capacity for deeply committed, responsible relationships. The integration of feeling and structure is the defining developmental work.",
  'MoonSaturn_trine': "The Moon trine Saturn gives you a naturally mature, disciplined, and reliable emotional nature — you can feel your feelings without being overwhelmed by them, and you approach emotional commitments with the seriousness and follow-through that makes your relationships deeply trustworthy. Your emotional stability is a genuine resource for others, and you have a remarkable capacity for patience in both practical and relational matters.",
  'MoonSaturn_square': "The Moon square Saturn creates one of astrology's most instructive emotional challenges — the friction between your need for emotional warmth and belonging and the Saturnian tendency toward reserve, withholding, and self-sufficiency. This tension, when worked through, produces exceptional emotional discipline, practical wisdom, and the capacity for deep commitment. The integration of warmth and structure, vulnerability and competence, is the central emotional task.",
  'MoonSaturn_sextile': "The Moon sextile Saturn offers a cooperative relationship between your emotional nature and Saturnian discipline that, when engaged consciously, produces emotional reliability, practical wisdom, and the capacity for sustained commitment. You are able to take your feelings seriously without being at their mercy, and your emotional maturity tends to be genuine rather than performed. Responsibilities are honored without resentment when you remember to also honor your own emotional needs.",
  'MercuryVenus_conjunction': "Mercury conjunct Venus creates one of the most charming and aesthetically refined communication styles in the zodiac — your words carry beauty, your thinking is imbued with a relational awareness, and your aesthetic sense shapes both your intellectual interests and your manner of expression. You are naturally gifted at writing, poetry, diplomacy, and any field that requires the marriage of precision and beauty. The potential challenge is a tendency to prioritize pleasing language over unpleasant truths.",
  'MercuryVenus_opposition': "Mercury opposite Venus creates a tension between precise, analytical communication and the desire for harmonious, beautiful expression — you may feel that saying the truthful thing and saying the tactful thing are frequently at odds. This tension produces exceptional communicative sophistication and a deep awareness of the relational implications of language. Your capacity for diplomatic honesty, when developed, is a rare and valuable gift.",
  'MercuryVenus_trine': "Mercury trine Venus gives you a naturally elegant and harmonious communication style — your words carry both precision and beauty, and you instinctively know how to express difficult things in ways that preserve the relationship while conveying the truth. Aesthetic intelligence is a genuine strength, and your taste — in art, language, music, design — is both cultivated and authentic.",
  'MercuryVenus_square': "Mercury square Venus creates productive friction between your analytical mind and your desire for beauty, harmony, and relational ease — you may find that honest thinking leads you to conclusions that threaten comfortable relational patterns, or that your aesthetic standards conflict with what is most practically useful. This tension, when integrated, produces a sophisticated awareness of the relationship between truth and beauty.",
  'MercuryVenus_sextile': "Mercury sextile Venus offers a cooperative harmony between your intellect and your aesthetic and relational sensibilities that rewards conscious cultivation. You have the capacity for communication that is both precise and beautiful, both honest and tactful. Writing, speaking, design, and any field that requires the marriage of intelligence and aesthetic awareness is naturally accessible to you.",
  'MercuryMars_conjunction': "Mercury conjunct Mars creates a mind of exceptional sharpness, speed, and directness — your thinking is fast, your communication is bold, and you instinctively go for the jugular in intellectual encounters. You are a formidable debater, a decisive thinker, and someone whose words carry the force of conviction. The growth edge is developing the patience to listen as thoroughly as you argue, and to channel the combative energy of this aspect into construction rather than destruction.",
  'MercuryMars_opposition': "Mercury opposite Mars creates a tension between your communicative and intellectual nature and your drive to assert, compete, and act — you may find that your best ideas come when you are engaged in conflict, or that intellectual encounters frequently become more heated than you intend. This aspect produces remarkable mental sharpness and the ability to argue persuasively under pressure. Learning to modulate the Martian force without losing its edge is the key developmental task.",
  'MercuryMars_trine': "Mercury trine Mars gives you a naturally decisive, sharp, and energetic mind — your thinking moves quickly from insight to action, and your communication has a natural confidence and directness that others find both impressive and trustworthy. Competitive intellectual environments suit you well, and you tend to perform at your best when the stakes are high and the challenge is real.",
  'MercuryMars_square': "Mercury square Mars creates productive friction between your intellect and your drive — you may find that your thinking is at its sharpest under pressure, or that the frustration of communication challenges produces precisely the mental energy needed to break through them. This aspect is found in charts of powerful writers, debaters, and strategists who have learned to harness the abrasive energy of this square into cutting intellectual force.",
  'MercuryMars_sextile': "Mercury sextile Mars offers a cooperative relationship between your intellect and your drive that rewards active engagement. You are able to think decisively and communicate with appropriate confidence, moving readily from analysis to action. Competitive mental environments stimulate rather than unsettle you, and your capacity for direct, energetic communication is a genuine professional and personal asset.",
  'VenusMars_conjunction': "Venus conjunct Mars is perhaps the most powerfully romantic and sexually magnetic aspect in astrology — the principles of attraction and desire are fused into a single concentrated force that creates extraordinary passion, creative vitality, and personal magnetism. Your love nature and your desire nature are unified, which means you pursue what attracts you with both grace and intensity. The growth edge is developing the patience to allow relationships to develop at their natural pace rather than consuming them at the speed of your attraction.",
  'VenusMars_opposition': "Venus opposite Mars creates a fundamental polarity between attraction and desire, between receptive love and active pursuit — you may find that the people who most attract you are also those who most challenge or frustrate you, or that your desire and your emotional needs pull in opposite directions. This tension is the engine of extraordinary passion and creative vitality. Integration leads to a love life of both genuine tenderness and real heat.",
  'VenusMars_trine': "Venus trine Mars gives you a naturally harmonious relationship between your capacity for love and your sexual and competitive drives — attraction, desire, and the ability to act on them flow together with unusual grace and effectiveness. Your personal magnetism is genuine and consistent, and your romantic relationships tend to have both warmth and passion without the extremes of either pure sweetness or pure intensity.",
  'VenusMars_square': "Venus square Mars creates one of astrology's most dynamic and creatively charged tensions — your love nature and your desire nature are in productive conflict, generating enormous energy in the realms of romance, creativity, and personal magnetism. Relationships are intensely alive precisely because this friction creates constant movement between attraction and challenge. The integration of beauty and power, love and desire, is a central life theme that produces remarkable depth of experience.",
  'VenusMars_sextile': "Venus sextile Mars offers a cooperative harmony between your capacity for love and your drive and desire that rewards conscious engagement. You have access to both warmth and passion in your relational life, and you are capable of pursuing what you want with both grace and directness. Creative work benefits from this aspect's ability to marry aesthetic sensitivity with focused energy and drive.",
  'VenusJupiter_conjunction': "Venus conjunct Jupiter is one of astrology's most genuinely fortunate aspects — your love of beauty, pleasure, and connection is amplified by Jupiter's expansive generosity, creating a person of extraordinary warmth, aesthetic abundance, and social grace. Love, money, and beauty tend to flow toward you, and your capacity for genuine enjoyment of life is infectious. The growth edge is developing discernment alongside abundance: learning which of life's many pleasures truly nourish versus which merely distract.",
  'VenusJupiter_opposition': "Venus opposite Jupiter creates a tension between your relational and aesthetic needs and the expansive, freedom-oriented impulses of Jupiter — you may find that your desire for committed, beautiful relationships conflicts with your instinct for freedom and larger horizons, or that abundance in one area of life creates scarcity in another. This aspect, when integrated, produces a generous, philosophical approach to love and a genuinely expansive aesthetic sensibility.",
  'VenusJupiter_trine': "Venus trine Jupiter is an aspect of natural abundance, social grace, and genuine good fortune in the realms of love, beauty, and material well-being. Your warmth, generosity, and aesthetic sense tend to attract beautiful experiences and supportive relationships as a natural matter of course. The gift of this aspect deepens when you extend the same expansive generosity to your own inner life and creative expression.",
  'VenusJupiter_square': "Venus square Jupiter creates productive friction between your desire for beauty, love, and pleasure and Jupiter's expansive, sometimes excessive, impulses — you may find that your capacity for enjoyment overshoots appropriate limits, or that romantic and financial opportunities arrive in abundance but require discernment to develop sustainably. This aspect produces people of remarkable generosity and a zest for life's pleasures that, when wisely channeled, becomes a genuine gift to others.",
  'VenusJupiter_sextile': "Venus sextile Jupiter offers a cooperative relationship between your capacity for love and beauty and Jupiter's expansive generosity that rewards conscious cultivation. You have access to genuine good fortune in relational, creative, and material matters when you actively engage with gratitude and generosity. Your natural warmth and aesthetic sensibility create an environment of abundance that others find genuinely nourishing.",
  'MarsSaturn_conjunction': "Mars conjunct Saturn creates one of astrology's most complex and ultimately powerful aspects — the fiery, immediate drive of Mars is harnessed and focused by Saturn's discipline and strategic patience, producing a capacity for sustained, directed action that achieves what purely impulsive effort cannot. The tension between these fundamentally different energies can manifest early as frustration, blocked action, or anger turned inward, but when integrated, produces an iron will and the capacity for disciplined achievement of difficult goals.",
  'MarsSaturn_opposition': "Mars opposite Saturn creates a fundamental tension between the drive to act now and the Saturnian demand for patience, preparation, and strategic delay — you may feel that every impulse to move forward meets resistance, or that the right moment for action always seems just out of reach. This tension, when integrated, produces exceptional strategic intelligence and the capacity for disciplined action that achieves what impulsive energy alone cannot. Patience is not passivity but accumulated power.",
  'MarsSaturn_trine': "Mars trine Saturn gives you a naturally disciplined, strategic, and effective drive — your energy and ambition are channeled through Saturnian structure and patience, producing a capacity for sustained effort that achieves genuine, lasting results. You rarely waste your drive on ill-timed or poorly prepared actions, and your persistence tends to outlast both competitors who are more talented but less disciplined and obstacles that defeat those of lesser endurance.",
  'MarsSaturn_square': "Mars square Saturn is one of astrology's most instructive challenges — the friction between immediate drive and the demand for patience and discipline generates enormous energy that, when properly directed, achieves remarkable things. This aspect is found in the charts of many individuals who have overcome significant obstacles through sheer endurance and the willingness to work with sustained intensity for extended periods. The integration of action and patience, drive and discipline, is the defining developmental work.",
  'MarsSaturn_sextile': "Mars sextile Saturn offers a cooperative relationship between your drive and your capacity for disciplined, strategic action that rewards conscious engagement. You are able to act with both energy and patience, moving when the moment is right rather than either holding back excessively or charging forward recklessly. The marriage of Martian fire and Saturnian structure, when engaged deliberately, produces a remarkable capacity for sustained, effective achievement."
};

// ── SECTION 2: getDailyHoroscope — full sign-specific readings ────────────
function getDailyHoroscope(sign, date) {
  var signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  var signIndex = signs.indexOf(sign);
  if (signIndex === -1) return null;
  var d = date instanceof Date ? date : new Date(date);
  var epochDay = Math.floor(d.getTime() / 86400000);
  var seed = signIndex * 31 + epochDay;

  var allReadings = {
    Aries: {
      overview: [
        "Mars fires up your ambitions today — charge toward your most daring goal with the full confidence of a ram who has never met a wall it could not break through.",
        "Your pioneering spirit is unstoppable right now; be the first to act, the first to speak, the first to take the risk that others are too cautious to attempt.",
        "Impatience is your shadow today, Aries — notice when the urgency you feel is energizing versus when it is simply burning your own resources prematurely.",
        "A new initiative you launch today carries the momentum of genuine conviction; your enthusiasm is not performance but pure Aries fire.",
        "Competition brings out the best in you now — find a worthy challenge and let your natural drive produce a performance that surprises even you.",
        "Your directness cuts through diplomatic fog today, and people appreciate the honest clarity you bring to a situation that needed it desperately.",
        "Physical energy peaks — channel it into something that requires both strength and courage, and you will feel exactly the aliveness your Aries soul craves.",
        "Leadership is thrust upon you today, and you accept it naturally; your decisiveness is exactly what the situation requires.",
        "A solo mission suits you better than group consensus right now — trust your independent judgment and move without waiting for permission.",
        "The courage to begin is your greatest gift today; the first step is always the hardest, and you were born knowing how to take it.",
        "Mars energy makes you magnetic to allies and opportunities that match your bold vision — say yes to the invitation that scares you slightly.",
        "Your fighting spirit is in full form — use it constructively on a problem that needs your ferocity, and resist wasting it on trivial conflicts.",
        "Speed is your advantage today; where others deliberate, you act, and where others hesitate, you have already arrived at the result.",
        "An unexpected challenge arrives and you meet it with characteristic Aries verve — the obstacle is actually the gateway to something more interesting.",
        "Your confidence inspires others to attempt what they previously thought impossible — your belief in possibility is genuinely contagious today.",
        "Anger, if it arises, is best directed into action rather than argument; your Mars energy transforms frustration into impressive productivity.",
        "Independence serves you well today — solitude and self-direction produce results that collaborative environments would dilute.",
        "A burst of creative energy arrives mid-morning; capture your best ideas immediately before the Aries attention moves to the next horizon.",
        "Your enthusiasm is at full wattage — people either match your energy or get out of the way, and both responses serve your purpose.",
        "Trust your first instinct in every significant decision today; your Aries gut is reading the situation faster than your conscious mind can process.",
        "The world rewards boldness today, and you were made for exactly this kind of moment — step forward without flinching.",
        "Your natural leadership shines brightest when you combine your fire with genuine care for those following you.",
        "An adversary reveals themselves to be less formidable than they appeared — your directness resolves in minutes what diplomacy would take weeks.",
        "Tonight invites rest and renewal; even the most relentless Aries must pause to reload before the next magnificent charge."
      ],
      love: [
        "Your passionate pursuit style is irresistible today — someone is watching your boldness with genuine admiration and considering whether to step closer.",
        "Say the direct thing you have been holding back in your relationship; Aries honesty, delivered with warmth, resolves more than tactful evasion ever could.",
        "A spontaneous romantic gesture lands beautifully today — do not overthink it, just do the thing your heart is suggesting.",
        "Single Aries? The person who can match your energy and debate you without backing down is exactly who you need — stay alert.",
        "Your partner needs your full, undivided presence today — put down the phone, turn off the drive, and just be there.",
        "Passion runs high; channel it into romantic connection rather than letting it discharge in irritability or impatience.",
        "A new romantic interest moves at a pace that suits your Aries nature — things are developing faster than you expected.",
        "Love requires you to slow down today — genuine intimacy cannot be rushed, even by a ram moving at full speed.",
        "Your protective instinct for someone you love activates powerfully; they need your strength, not your strategy.",
        "A playful, competitive dynamic in your relationship makes both of you feel alive and genuinely attracted to each other.",
        "Declare your feelings without hedging; Aries who speak their heart directly attract the love they deserve.",
        "Old flames or past situations release their hold today — you are free to pursue what genuinely excites you now.",
        "Your energy makes you magnetic; do not scatter the magnetism across too many options when one person deserves your full fire.",
        "Romance thrives when you take the lead — plan something adventurous that takes your partner out of their comfortable routine.",
        "Your instinct about someone genuine feelings is accurate today — trust what your Aries gut is telling you.",
        "A moment of genuine vulnerability deepens your connection more than any bold move could — let yourself be seen.",
        "Passionate disagreements, resolved with equal passion, make your relationship more alive, not less stable.",
        "Today is excellent for meeting someone new if you allow yourself to be genuinely curious rather than just impressive.",
        "Your directness saves both of you months of confused signals — say what you want and invite the honest response.",
        "Love and competition are not opposites for Aries — the charge of challenge in a relationship keeps your heart fully engaged.",
        "A romantic partnership benefits from fresh energy today; suggest something neither of you has done before.",
        "Your natural confidence draws admirers; be selective about where you direct your considerable romantic attention.",
        "Reconciliation with someone you care about is possible today if you approach it with Aries courage and genuine warmth.",
        "The best love story you can live is one where both people are uncompromisingly themselves — and you set that example."
      ],
      career: [
        "A bold professional move you have been considering is supported by today energy — act now while the momentum is with you.",
        "Your leadership qualities are visible to the right people today; allow yourself to be seen taking initiative on something that matters.",
        "Competitive environments bring out your sharpest professional performance — if the stakes are high, you are at your best.",
        "An opportunity arrives that requires immediate action; your Aries decisiveness is perfectly suited to seizing it.",
        "A colleague hesitation creates an opening for you to step into a role that suits your skills far better.",
        "Your direct communication style cuts through organizational confusion and earns respect from people who are tired of indirection.",
        "Starting a new project or initiative today carries the full force of Aries momentum — the launch energy is exceptional.",
        "Mars gives you the sustained focus needed to complete a challenging task that has been requiring more energy than expected.",
        "Your pioneering instinct leads you to a solution that more conventional thinkers simply could not find — trust your unconventional approach.",
        "A professional challenge is best met head-on today; the longer you circle it, the larger it grows in your imagination.",
        "Your enthusiasm for a new idea is genuine and persuasive — pitch it now, while the energy is at its peak.",
        "The independence to work on your own terms produces your best professional output; structure that constrains your drive creates frustration.",
        "A leadership decision that others have been avoiding falls to you, and you handle it with characteristic Aries clarity.",
        "Your competitive drive produces genuine excellence today — channel it into your craft rather than into interpersonal dynamics.",
        "An unexpected professional opening arrives through your initiative rather than through networking — you create your own opportunities.",
        "The courage to ask for what you deserve — a raise, a promotion, a better assignment — is strongly supported today.",
        "Mars sharpens your strategic thinking; you see the most direct path to a professional goal that others are approaching circuitously.",
        "Physical energy and professional drive are aligned today — a physically active component to your work creates excellent results.",
        "Your reputation for decisive action precedes you into a conversation that opens important professional doors.",
        "A short-term sacrifice for long-term professional gain is the correct Aries move today — you see the larger trajectory clearly.",
        "Team leadership suits you today if you remember that the best leaders bring others forward, not merely lead from the front.",
        "Your professional instincts about timing are particularly accurate now — when your gut says move, trust it completely.",
        "A conflict with a colleague resolves cleanly when you address it directly rather than allowing it to fester and complicate.",
        "The work you put in today builds momentum that carries forward into a week of exceptional professional achievement."
      ],
      health: [
        "Mars rules your body as well as your drive — high-intensity physical activity today releases tension and sharpens your mental clarity.",
        "Your headaches or tension points often signal pent-up energy seeking outlet; movement is your medicine today.",
        "A new fitness challenge excites your competitive Aries nature and produces the kind of results that half-hearted routines never could.",
        "Rest is not your natural mode, but recovery is actually where strength is built — honor a genuine need for stillness today.",
        "Your body signals are louder than usual; a nagging physical complaint deserves proper attention rather than being powered through.",
        "Channel aggressive energy into physical practice rather than stress — your body knows the difference and rewards you accordingly.",
        "Morning movement sets the entire tone of your Aries day; skip it and you carry excess fire all day with nowhere healthy to go.",
        "Your immune system responds powerfully to your emotional state — protect your energy from draining interactions as seriously as you protect your physical health.",
        "Aries rules the head — eye strain, tension headaches, and jaw clenching are all signals that you are pushing too hard without enough recovery.",
        "Physical courage serves you in health matters too; address a health concern you have been avoiding with characteristic Aries directness.",
        "Competitive sports or active games suit your energy perfectly today and produce both physical benefit and genuine joy.",
        "Your recovery speed is impressive when you give your body what it actually needs — sleep, nutrition, movement — without cutting corners.",
        "Impulsivity around food or lifestyle choices can create short-term pleasure at long-term cost; your long-term self deserves the same Aries loyalty as your ambitions.",
        "A physical challenge that seemed daunting reveals itself as manageable when you apply the same bold approach as your professional challenges.",
        "Aries energy burns bright and hot — hydration, electrolytes, and actual rest are the unglamorous foundations of your sustained vitality.",
        "A new health practice that you adopt with full Aries conviction now will be transformative by the time it becomes routine.",
        "Your body is your primary tool and your ally — treat it with the same respect you give to a trusted partner in a bold mission.",
        "Anger or frustration held in the body creates physical tension; vigorous exercise today is the best possible release valve.",
        "Your physical confidence is an asset in health contexts — you approach medical situations with directness that produces better information and better outcomes.",
        "A health goal you set with genuine Aries fire and pursue with consistent effort will show visible results faster than you expect.",
        "Movement in nature reconnects you to the physical world in a way that gym environments cannot fully replicate for your fire-sign energy.",
        "Your pain tolerance is high — be careful not to ignore signals that genuinely warrant attention beneath the Aries tendency to push through.",
        "Competitive health challenges — obstacle courses, athletic events, fitness goals — activate your peak motivation and your most consistent follow-through.",
        "The discipline to maintain health practices even when Mars energy makes you feel invincible is the foundation of long-term Aries vitality."
      ]
    },
    Taurus: {
      overview: [
        "Venus wraps your day in beauty and abundance — slow down enough to actually receive the sensory richness that is your birthright as a Taurus.",
        "Your patience, so often mistaken for stubbornness, proves itself as wisdom today when a situation that rushed others unfolds perfectly in your steady hands.",
        "Financial matters benefit from your thorough, careful approach — your instinct for sustainable value protects you where others make costly short-term choices.",
        "The physical world speaks to you in its richest language today; beauty, texture, taste, and sound all carry messages worth receiving.",
        "Commitment and follow-through are your superpowers, and today a long-running effort produces the tangible result you have been building toward.",
        "Your groundedness is a genuine service to everyone around you — when others panic, your presence restores perspective.",
        "A creative project benefits enormously from your patient, sensory attention — you notice details that transform good work into something extraordinary.",
        "Resistance to change is familiar territory, but today the change before you is genuinely worth your Taurus consideration — look at it with open eyes.",
        "Material security and personal values are your north stars; decisions today that align with both produce excellent long-term outcomes.",
        "Your loyalty to people you love is one of your most beautiful qualities — let it be expressed in a small, concrete act of devotion today.",
        "The garden of your life needs tending today — slow, methodical care of what you have already planted is more productive than planting new seeds.",
        "Your aesthetic instinct is at its sharpest; trust what looks, sounds, or feels beautiful to you over what merely appears impressive.",
        "Taurus earth energy grounds every person and project you touch today — you are the stabilizing force in someone chaotic situation.",
        "A financial decision that seemed complex simplifies into obvious clarity when you apply your practical Taurus wisdom.",
        "Your love of comfort is a genuine intelligence about what sustains rather than what merely stimulates — honor it without apology.",
        "The slow, deliberate approach you bring to building something lasting is its own form of genius, even when others do not recognize it yet.",
        "Venus influence today makes small, beautiful moments feel genuinely sacred — a meal, a view, a piece of music deserves your complete presence.",
        "Your stubbornness today serves you when it is in service of genuine values, and costs you when it is merely defending habit.",
        "Material abundance flows toward you when you align your practical efforts with what genuinely matters to you at the deepest level.",
        "A reliable Taurus truth: the things you build with care and patience outlast everything that was rushed — and today that truth is visible.",
        "Your body is an exquisite instrument for receiving pleasure and beauty — treat it with the same quality of attention you give to valuable possessions.",
        "Security, in its deepest Taurus sense, comes not from accumulation but from the unshakeable knowledge that you can provide for yourself.",
        "Others rely on your steadiness today in ways they may not express but deeply feel — your consistency is a profound form of love.",
        "Tonight, rest in the satisfaction of what you have built — Taurus wisdom knows that genuine rest is productive, not idle."
      ],
      love: [
        "Your love language is physical presence and tangible devotion — a simple, beautiful gesture communicates more than any Taurus speech.",
        "A relationship deepens significantly when you allow your natural sensuality to express itself fully rather than holding it in careful reserve.",
        "Venus, your ruling planet, amplifies your magnetic pull today — someone finds your solidity and warmth completely irresistible.",
        "Slow and steady wins in love for Taurus — the relationship that builds gradually and securely is infinitely more satisfying than passionate intensity without foundation.",
        "Your loyalty is the rarest and most valuable thing you offer in love — make sure the person receiving it genuinely treasures it.",
        "A romantic evening built around sensory pleasure — good food, good music, physical closeness — nourishes you at the cellular level.",
        "Possessiveness and care are close neighbors in your Taurus heart; examine whether what you feel today is love or the fear of loss.",
        "Your partner needs consistency and warmth from you today — offer it without being asked and watch the relationship deepen.",
        "Single Taurus? The person you are looking for is found in ordinary places doing beautiful ordinary things — you will recognize them by their quality.",
        "Love for you requires building something — shared rituals, physical comfort, mutual support for practical goals. Begin one of these today.",
        "Your patience in love is genuinely rare — you see people potential and stay through their development in a way that transforms relationships.",
        "A physical expression of affection lands more meaningfully than any words you could find today — touch, feed, beautify.",
        "Trust issues that have kept your heart protected deserve examination today — the right relationship deserves your full Taurus trust.",
        "Your Venus-ruled charm is at its most potent when you are relaxed and simply enjoying yourself — forced romance is not your natural mode.",
        "A long-standing relationship benefits from a deliberate renewal of physical tenderness that you initiate with characteristic Taurus intention.",
        "Your instinct about a person character is deeply reliable — what your body registers about someone is truer than what their words convey.",
        "Love needs tending like a garden; the small, consistent acts of care that Taurus excels at build the lasting beauty you seek.",
        "You deserve to be loved with the same steadiness and physical warmth that you offer — hold that standard without apology.",
        "A romantic tension resolves when you speak your need directly in your practical Taurus way rather than waiting for the other person to intuit it.",
        "Sensory shared experiences — cooking together, walking outdoors, choosing something beautiful — create the intimacy words alone cannot reach.",
        "Your capacity for deep, committed love is one of the most precious things about you — let it be fully known today.",
        "A new romantic possibility is slower to develop than fire-sign connections but infinitely more worth the patient Taurus investment.",
        "Your comfort with physical affection is one of your most attractive qualities — let it be expressed naturally today.",
        "The love that lasts is built from thousands of ordinary moments of loyalty and care, and you are building yours beautifully."
      ],
      career: [
        "Your methodical approach to a long-term project produces results today that validate every hour of Taurus patience invested.",
        "Financial instincts are sharp — a practical decision made today protects your resources and builds toward the security you are always thoughtfully constructing.",
        "Your professional reliability is your greatest career asset; people hire and promote Taurus because they know the work will actually be done.",
        "A creative or aesthetic challenge in your work is resolved by your Venus-ruled eye for quality — trust your taste completely.",
        "Slow and thorough beats fast and careless in your professional domain today — resist any pressure to cut corners on something that matters.",
        "Your practical wisdom is sought by someone higher up the hierarchy; offer it generously and your value becomes undeniable.",
        "A financial negotiation benefits from your Taurus steadiness — you are not in a hurry, which is itself a form of negotiating power.",
        "Your attention to craft and quality produces work that speaks for itself without requiring you to promote it aggressively.",
        "Building long-term professional relationships through consistent, dependable performance is your natural career strategy — and it works.",
        "A project that requires patient, sustained effort over weeks or months is where your Taurus nature produces its most impressive professional results.",
        "Your aesthetic sense is a genuine professional asset in any field — quality and beauty are values, not luxuries, and your clients or colleagues know it.",
        "A practical problem resists abstract thinking but yields beautifully to your Taurus hands-on, materials-focused approach.",
        "Professional stability you have built through steady effort becomes visible today as security that more erratic colleagues envy.",
        "Your resistance to change at work should be examined today — some of your colleagues suggestions would genuinely improve your process.",
        "A slow, careful, thorough approach to a financial matter saves you from a mistake that speed would have caused.",
        "Your professional word is your bond — when you commit to something, it happens, and this builds a reputation that opens significant doors.",
        "Creative work reaches a new level of quality today when you bring your full sensory attention to the materials and process.",
        "A raise or recognition for long-standing contribution is appropriately requested today — Taurus who ask for fair compensation receive it.",
        "Your professional environment benefits from the physical comfort and aesthetic quality you bring — your space reflects your values.",
        "The financial foundation you are methodically building will look obvious in retrospect — keep laying each careful stone.",
        "Practical expertise speaks louder than theoretical brilliance in today professional context, and you have it in abundance.",
        "Your patience in waiting for the right professional opportunity is rewarded — the position or project that is worth your Taurus commitment is closer than it seems.",
        "A colleague flakiness contrasts sharply with your dependability today, making your professional value completely clear to the people who matter.",
        "Your persistence on a challenging professional task produces a breakthrough that validates the Taurus commitment to seeing things through."
      ],
      health: [
        "Your body is your temple in the most literal Taurus sense — nourish it with food of genuine quality and prepare it with loving attention.",
        "A slow, consistent approach to fitness produces transformative results over time — you are built for the long game, not the dramatic gesture.",
        "Venus rules your throat and voice; singing, vocal practices, or simply speaking your truth serves your physical well-being.",
        "Taurus rules the neck and throat — tension in these areas today is a message about where you are holding unexpressed feelings.",
        "Physical comfort is not indulgence for Taurus — it is a genuine need that, when honored, produces the stability from which you give your best.",
        "A walk in nature with deliberate sensory attention — really seeing, smelling, feeling the environment — restores you completely.",
        "Your relationship with food is one of life greatest pleasures — today, let it be an act of conscious self-nourishment rather than routine.",
        "Rest, for Taurus, is genuinely restorative rather than lazy — your body rebuilds more efficiently during deep rest than through continuous activity.",
        "An earth-based physical practice — gardening, hiking, working with clay or stone — aligns your body with your element in a deeply satisfying way.",
        "Your physical endurance is exceptional; pace yourself appropriately and you can sustain effort that depletes signs of lesser earthy patience.",
        "Taurus stubbornness can work against health when you resist needed change in diet, movement, or habit — the evidence is available if you look honestly.",
        "Your senses are your health instruments; when food tastes off, when your body feels heavy, or when something smells wrong, listen to these signals.",
        "A consistent sleep routine produces dramatic improvements in your Taurus energy levels — protect your evening in order to own your morning.",
        "The pace of your physical practice should match the pace of your life — Taurus thrives on rhythm, not on bursts of frantic activity.",
        "Material comfort and physical safety are genuine health needs; addressing practical security concerns relieves the somatic tension they create.",
        "A massage, sauna, or deeply comfortable bath is not luxury for Taurus — it is medicine that your Venus-ruled body genuinely requires.",
        "Your relationship with pleasure and food deserves conscious attention — the difference between nourishment and numbing matters for your long-term health.",
        "Building new health habits requires the same patient Taurus consistency you apply to financial goals — start small, start today, and stay.",
        "Your body responds beautifully to beauty itself — flowers, art, music, and pleasant environments are genuine wellness practices for you.",
        "Taurus health thrives on regularity; disrupted routines create genuine physical discomfort that improves quickly when rhythm is restored.",
        "A physical practice you genuinely enjoy is worth ten times the value of one you merely tolerate — make pleasure a health requirement.",
        "Your earth-sign body benefits from physical contact with actual earth — bare feet on grass, hands in soil, sitting against a tree.",
        "Financial stress manifests in your body with particular intensity — addressing practical security concerns is as important as any physical health practice.",
        "The Taurus gift of embodied presence — actually inhabiting your physical senses — is itself a profound wellness practice when practiced deliberately."
      ]
    },
    Gemini: {
      overview: [
        "Mercury ignites your mind today and every conversation crackles with the electric intelligence that makes you one of the zodiac most fascinating people — follow every thread of curiosity without apology.",
        "Your ability to hold multiple perspectives simultaneously is your greatest intellectual gift, and today it helps you see a solution that single-minded thinkers simply cannot access.",
        "A burst of information arrives through an unexpected channel — a chance encounter, a book you pick up, a link someone sends — and it contains exactly what you needed to know.",
        "Gemini duality serves you beautifully today: the ability to be serious when required and playful when invited keeps every interaction alive and surprising.",
        "Your social intelligence is at its peak — you read the room instantly and adjust your communication style with effortless adaptability.",
        "Mercury's sharp influence makes your writing and speaking more precise and persuasive than usual; tackle communications that matter while this gift is active.",
        "Curiosity is your compass today — wherever it points, genuine discovery waits. Do not let practicality suppress the instinct to explore.",
        "A conversation you have today plants seeds that will grow into something significant; your words carry more lasting influence than you realize.",
        "Multitasking is your natural mode, and today the many threads you are managing weave together into a coherent and impressive whole.",
        "Your wit and intelligence are fully operational; a witty observation you make today becomes the story someone tells for years.",
        "New information revises your previous position — Gemini intellectual honesty makes this revision a pleasure rather than an embarrassment.",
        "The Gemini gift for synthesis lets you combine ideas from completely different domains into something original and genuinely useful.",
        "Your mind moves faster than most can follow today; slow it down enough to let others catch up, and the collaboration becomes extraordinary.",
        "A short trip, local adventure, or change of scenery refreshes your Gemini nervous system and sparks a fresh wave of creative thinking.",
        "You have been gathering information for weeks; today the synthesis happens and you understand what you have been circling around.",
        "Your communicative gifts are a genuine service today — someone needs exactly the articulate clarity you can bring to a confusing situation.",
        "Gemini restlessness is best honored with variety rather than suppressed with discipline — let today be pleasantly unpredictable.",
        "A sibling, neighbor, or close acquaintance brings unexpectedly meaningful news or an offer worth serious Gemini consideration.",
        "Your natural charm makes difficult conversations land with surprising ease today — people receive your honesty because your delivery is genuinely skillful.",
        "An intellectual debate sharpens your thinking and leaves you energized rather than depleted — seek out the sparring partner who challenges you properly.",
        "Your adaptability, which sometimes feels like inconsistency, is today revealed as the sophisticated cognitive flexibility it truly is.",
        "The connections between seemingly unrelated ideas flash with sudden brilliance — write down what arrives before the Gemini attention moves on.",
        "Social engagements exceed your expectations today; a casual encounter turns into one of the more interesting conversations you have had recently.",
        "Tonight's mental rest is as important as the day's mental activity — give your remarkable mind the quiet it needs to integrate what it has gathered."
      ],
      love: [
        "Intellectual attraction is your primary romantic currency — someone who can match your mental agility and keep you guessing is far more compelling than conventional beauty alone.",
        "A playful, witty exchange today has genuine romantic potential beneath its light surface — follow the banter wherever it leads.",
        "Your partner needs your full mental presence today, not just physical proximity — real conversation, genuine curiosity, active listening.",
        "Single Gemini: the person who can surprise you intellectually is the one worth pursuing — do not settle for predictability when your mind requires stimulation.",
        "Variety and novelty keep your romantic life alive; suggest something genuinely new that neither of you has tried before.",
        "A message you send today carries more emotional weight than you intend — make sure your words match your actual feeling.",
        "Your communicative gifts make you an exceptional partner when you use them for emotional honesty rather than just clever deflection.",
        "A romantic tension is best resolved through direct, honest conversation — your Gemini facility with language is made for exactly this.",
        "Love for you must include genuine mental friendship; the partner who is also your most interesting conversationalist is the keeper.",
        "Your flirtatious nature is charming rather than problematic when it is paired with genuine presence and real commitment to the person who matters.",
        "An old connection resurfaces today — whether it belongs in your present or your past will be clarified by your honest Gemini instincts.",
        "Romantic spontaneity suits you; an unplanned adventure with someone you care about creates memories more vivid than any elaborate plan.",
        "Your nervous energy today benefits from a partner whose calm gives you something steady to orbit around.",
        "Love letters, voice messages, poems, and playful texts are your natural romantic language — use them generously and watch them land.",
        "A misunderstanding in a relationship resolves quickly when your Gemini precision is brought to bear on exactly what was meant.",
        "The romantic connection that makes you think as well as feel is the one your Gemini nature truly needs to sustain depth over time.",
        "Your curiosity about a person is one of your most attractive qualities — genuine interest reads as the rare gift it actually is.",
        "A commitment feels lighter when framed as a shared adventure rather than a constraint; your Gemini creativity finds the language for this.",
        "Two minds meeting on the same idea at the same moment creates a spark that physical attraction alone cannot replicate.",
        "Your capacity for romantic reinvention keeps long-term relationships perpetually interesting — suggest a fresh dynamic today.",
        "The love that serves your Gemini nature best is spacious enough for your independence and intimate enough for genuine depth.",
        "A romantic rival appears less threatening when you trust the genuine connection you have already built — your partner values your mind.",
        "Honesty about your emotional complexity is more attractive than performed simplicity — show the full range of your Gemini feeling.",
        "Tonight, put the phone away and practice the art of complete presence with someone who deserves your undivided attention."
      ],
      career: [
        "Your ideas are extraordinarily marketable today — pitch the concept you have been developing before the Mercury-fueled clarity fades.",
        "Communications, negotiations, and presentations are your professional superpowers; today they operate at the top of their considerable range.",
        "A professional problem that has stumped others resolves instantly when your pattern-recognition instinct spots the connection no one else noticed.",
        "Networking is not work for a Gemini — it is pleasure — and today's social interactions plant seeds that grow into genuine professional opportunities.",
        "Your versatility is a competitive advantage in a professional landscape that rewards specialists; your breadth becomes a specific kind of depth.",
        "Writing, editing, research, or any language-based professional work produces exceptional results today — the Mercury influence is fully active.",
        "A short trip or local meeting introduces you to someone whose professional world intersects with yours in unexpectedly productive ways.",
        "Your ability to translate complex ideas into accessible language makes you invaluable in any team or organizational context today.",
        "Multi-project management is your natural mode; what exhausts others energizes you, and today you demonstrate this comprehensively.",
        "A colleague or client reveals information that shifts your professional strategy; your Gemini adaptability incorporates the new intelligence instantly.",
        "Teaching, training, or mentoring others activates your best professional qualities — your enthusiasm for knowledge is genuinely contagious.",
        "A professional deadline that seemed impossible is met with typical Gemini resourcefulness and a speed that leaves colleagues impressed.",
        "Your social intelligence reads the room in a meeting and adjusts your presentation in real-time to maximize its impact.",
        "The ability to speak both the language of strategy and the language of execution makes you an unusually complete professional asset.",
        "A technology or communication tool you explore today significantly improves your professional efficiency — your Gemini love of new tools serves you.",
        "Your quick mind spots an error or opportunity in a situation that others have been handling with less speed and more assumption.",
        "Professional confidence today comes from genuine knowledge — your preparation is more thorough than you realize, and it shows.",
        "A side project or secondary interest unexpectedly generates significant professional momentum — Gemini breadth often creates surprising depth.",
        "Your facility with language turns a difficult professional message into something clear, honest, and well-received — a true craft.",
        "Intellectual boredom in your professional life is a signal worth heeding today; the restlessness is pointing at an unexplored opportunity.",
        "Your professional reputation for quick, reliable communication is an asset that compounds over time — maintain it with today's correspondence.",
        "A brainstorming session you participate in today produces the best idea in the room — and it came from the unexpected Gemini angle.",
        "Collaboration with someone whose skills complement your breadth with their depth produces professional results neither could achieve alone.",
        "Your professional curiosity about an adjacent industry or role contains the seed of your next significant career development — explore it."
      ],
      health: [
        "Gemini rules the nervous system and the lungs — deep, conscious breathing today calms the mental chatter that can exhaust your quick-moving sign.",
        "Your mind and your body need rest from the same high-frequency activity; both require genuine stillness, not just a change of stimulation.",
        "Physical restlessness is a health signal today — movement that involves your mind as well as your body is the most satisfying medicine.",
        "Gemini energy can scatter across too many inputs simultaneously; choose deliberately what you let into your nervous system today.",
        "A short walk with a purposeful destination satisfies both the Gemini need for movement and the need for mental engagement.",
        "Breathing exercises, meditation, or even a genuine moment of silence between tasks resets your nervous system more effectively than you expect.",
        "Your lungs benefit from fresh air and conscious expansion — take your mental work outdoors when possible today.",
        "The tension you carry in your shoulders and neck today is mental tension wearing a physical costume — address the source.",
        "Variety in your physical practice keeps your Gemini nature engaged; the same routine every day kills the motivation that novelty sustains.",
        "Your sleep is deeply affected by the quality of your mental wind-down — screens and stimulating content right before bed undermine the rest you need.",
        "A health conversation with a practitioner today produces genuinely useful information; your ability to ask precise questions gets you better answers.",
        "Gemini anxiety often lives in the respiratory system — sighing, shallow breathing, and chest tightness are all cues to slow down and breathe deeply.",
        "Learning something new about health or wellness today appeals to your Gemini love of information and produces genuine behavioral change.",
        "Social connection is medicine for Gemini; isolation creates a kind of nervous system stagnation that good conversation immediately resolves.",
        "Two different health approaches considered simultaneously is perfectly natural for Gemini — integrate them with your characteristic synthesis.",
        "Your hands and arms are Gemini-ruled; pay attention to tension, repetitive strain, or fatigue in these areas today.",
        "Mental health and physical health are more directly linked for Gemini than almost any other sign — honor both with equal seriousness.",
        "A digital detox for even two hours today produces a mental clarity that your busy Gemini mind forgets is possible.",
        "Gemini thrives on change — varying your route, your meal, your schedule today brings a small but genuine physiological refreshment.",
        "Your health responds positively to information — understanding why a practice works increases your Gemini compliance and enthusiasm.",
        "Rest does not have to mean stillness for Gemini; reading, gentle music, or a light podcast can provide the recuperative mental shift you need.",
        "Nervous system regulation is your most important health practice — whatever calms the mind calms the body for your Mercury-ruled sign.",
        "A playful physical activity — dancing, games, something that makes you laugh — is more therapeutic for Gemini than disciplined exercise today.",
        "Your health intuition is sharper than usual — a subtle body signal you receive today deserves attention rather than being rationalized away."
      ]
    },
    Cancer: {
      overview: [
        "The Moon, your ruling luminary, moves through a powerful position today, amplifying your already exceptional intuition to a degree that makes every instinct worth following.",
        "Home and family call to your deepest nature today — a domestic matter that needs your nurturing attention is the most productive use of your considerable emotional intelligence.",
        "Your sensitivity, which can feel like a burden in harsh environments, is today revealed as the rare gift it is — you perceive what others simply cannot.",
        "A situation from the past resurfaces for final healing; your Cancer capacity for emotional depth handles it with more grace than you fear.",
        "The protective shell you sometimes retreat into is a wisdom mechanism, not a weakness — use it deliberately today to manage your energy.",
        "Your memory for emotional detail is extraordinary, and today it helps you understand a current situation through the lens of genuine experience.",
        "Nurturing energy flows naturally from you today and is received with gratitude — someone in your world needed exactly what you have to offer.",
        "Financial instincts are reliable today; your Cancer feel for security makes practical decisions that protect long-term stability.",
        "Your emotional courage — the willingness to feel fully what is actually present — is more powerful than the armor others wear.",
        "A creative or domestic project that expresses your inner world receives appreciative recognition from someone whose opinion genuinely matters.",
        "Boundaries you set today from a place of genuine self-knowledge rather than fear are received more graciously than you anticipated.",
        "Your natural empathy creates connections today that conventional social strategies simply cannot produce — authenticity is your greatest charm.",
        "The Moon's influence makes your intuitive radar exceptionally accurate; what you sense about a person or situation right now is true.",
        "Home improvements, domestic rituals, or acts of nesting bring you a deep satisfaction that more externally impressive achievements cannot match.",
        "Cancer season sharpens your awareness of what truly nourishes you versus what merely soothes; choose nourishment today.",
        "Your emotional intelligence reads subtext that others miss; the conversation beneath the conversation is the one that actually matters.",
        "A long-standing family pattern releases its grip as you apply your Cancer depth to understanding it rather than simply feeling it.",
        "Trust the wave of feeling that moves through you today — it is information, not drama, and it is pointing you toward something true.",
        "Your capacity for genuine care makes you someone people return to again and again; today you are the stability someone desperately needs.",
        "The inner life is as real and important as the outer one for Cancer — time given to introspection today is genuinely productive.",
        "Security, in your deepest sense, comes not from control but from the unshakeable knowledge that you can feel your feelings and survive them.",
        "A creative expression that comes directly from your emotional experience produces something that moves people in ways more calculated work cannot.",
        "Your protective instincts for those you love are at their most powerful — trust them, and speak up when something does not feel right.",
        "Tonight, tend to your own emotional needs with the same attentiveness you give others — your inner world deserves your own devoted care."
      ],
      love: [
        "Your emotional depth is your most attractive quality — someone today is moved by the genuine care they feel emanating from you.",
        "A relationship deepens when you allow your vulnerability to be seen rather than protected; Cancer courage is emotional courage.",
        "Your instinct about what your partner needs today is accurate — act on it without waiting for them to articulate the need explicitly.",
        "Single Cancer? The security to be found is not in another person but in your own emotional wholeness — from there, you attract your equal.",
        "Love for you is expressed through acts of care, nourishment, and protection — let these natural expressions flow freely today.",
        "A past relationship memory arises not to pull you backward but to clarify what you now know you genuinely need.",
        "Your capacity for emotional loyalty is extraordinary; make sure the person receiving it understands and honors what they have.",
        "Domestic intimacy — cooking together, sharing space peacefully, the quiet language of comfortable home-sharing — is your deepest love expression.",
        "A conversation about feelings that you have been avoiding is possible today with a tenderness and safety that makes it genuinely productive.",
        "Your romantic intuition is essentially prophetic right now — trust completely what you feel about where a connection is heading.",
        "Love needs safety to bloom for Cancer; creating that safety, first within yourself, is the gift you give every relationship you enter.",
        "A small, deeply personal gesture of love today communicates more than grand romantic performances could ever convey.",
        "Your empathy allows you to love people as they actually are rather than as you need them to be — this is rarer than you know.",
        "The relationship that nourishes your Cancer soul is one where you can feel both fully yourself and genuinely held.",
        "Romance blooms in homey settings today — a shared meal, a comfortable evening in, the simple pleasure of domestic companionship.",
        "Your protectiveness of those you love is beautiful; ensure it expresses as care rather than control, as shelter rather than confinement.",
        "An emotional honesty you offer today lands with unexpected grace — your timing and tenderness make difficult truths receivable.",
        "Single Cancer: the love you seek is found when you stop editing yourself for palatability and simply show who you actually are.",
        "Your emotional memory honors the full history of a relationship — both its difficulties and its genuine beauty — with equal dignity.",
        "Love and home are deeply linked for Cancer; the partner you feel most at home with is the one your soul is seeking.",
        "A moment of genuine emotional intimacy today — not performance, just presence — creates a bond that practical compatibility alone never builds.",
        "Your capacity to hold space for another person's emotions without trying to fix them is one of your rarest and most valuable gifts.",
        "Romantic tension eases when you approach it with curiosity rather than anxiety — what does this difficulty want to show both of you?",
        "Tonight, let yourself be loved and nurtured in return — the Cancer who knows how to receive care is as rare as one who knows how to give it."
      ],
      career: [
        "Your emotional intelligence is a powerful professional tool — reading the room accurately today helps you navigate a complex situation with unusual skill.",
        "Careers that allow you to nurture, protect, or care for others align with your deepest Cancer nature and produce your most sustained motivation.",
        "Your tenacity — the crab's grip — means that when you commit to a professional goal, you simply do not let go until it is achieved.",
        "A professional relationship benefits from the personal warmth you bring; people work harder for someone they feel genuinely cares about them.",
        "Your intuition about a business or financial decision is accurate today; trust the feeling that persists beneath the analytical assessment.",
        "Domestic or home-based professional work is especially productive today — your environment directly affects your Cancer output quality.",
        "A management or leadership role suits your Cancer nature when it allows you to protect and develop your team alongside achieving results.",
        "Your memory for professional details and relationship history is an asset that builds trust and reliability over the long term.",
        "A creative project drawing on personal or emotional material produces work of genuine depth that resonates with audiences in lasting ways.",
        "Your professional sensitivity to organizational mood allows you to navigate political landscapes that more oblivious colleagues stumble through.",
        "Financial security is a genuine professional motivator for Cancer — a practical step toward stability feels more energizing than abstract achievement.",
        "The ability to make clients, customers, or colleagues feel genuinely seen and cared for is a competitive professional advantage today.",
        "A professional challenge feels more manageable when approached with the same emotional courage you bring to personal difficulties.",
        "Your protective instincts extend to professional projects — you defend your work's integrity with a quiet fierceness that earns respect.",
        "History and context matter to Cancer decision-making; your ability to learn from professional past experience protects you from repeating errors.",
        "Work that has a meaningful human impact satisfies Cancer's need for purpose far more than status or financial reward alone.",
        "A professional conversation requires your emotional intelligence today — what is actually being communicated runs deeper than the stated agenda.",
        "Your professional home base — your workspace, your team, your organizational culture — needs attention today to function as the sanctuary you require.",
        "Long-term professional relationships, built on genuine mutual care and respect, are Cancer's greatest career asset — invest in them.",
        "Your intuitive grasp of what customers, clients, or audiences actually need (versus what they ask for) is an exceptional professional gift.",
        "A professional challenge that feels personal is personal for Cancer — honor that reality rather than pretending to professional detachment you do not feel.",
        "Your tenacity on a project that has required patience finally produces visible results — the crab's grip has served you well.",
        "Creative work produced from genuine emotional experience rather than calculated market positioning carries the Cancer authenticity that sets it apart.",
        "The professional care you give others returns to you today in recognition, support, and opportunities you did not have to manufacture."
      ],
      health: [
        "Cancer rules the stomach and digestive system — emotional stress manifests physically in these areas, making emotional health directly physical health for your sign.",
        "Your body is exquisitely sensitive to your emotional environment; toxic relationships and stressful situations create genuine physical symptoms that self-care alone cannot resolve.",
        "Nourishing food prepared with love and attention is Cancer medicine in its most literal form — eat with presence and gratitude today.",
        "The Moon's cycle affects your energy and emotional landscape more than most signs; tracking it gives you predictive insight into your own rhythms.",
        "Water is deeply healing for your water sign — swimming, baths, being near the ocean or a lake — resets your system profoundly.",
        "Your digestive system is your emotional barometer; what upsets your stomach is often pointing at what is upsetting your soul.",
        "Emotional eating is a Cancer pattern worth examining — when you reach for comfort food, what comfort are you actually seeking?",
        "Rest and retreat are not laziness for Cancer but essential recovery — honor the need to withdraw and rebuild your emotional reserves.",
        "Your immune system responds strongly to your emotional state; loving relationships and a sense of safety are foundational health practices.",
        "A gentle, intuitive approach to wellness suits you better than harsh, disciplined regimes — listen to what your body actually wants.",
        "The home environment you live in directly affects your health — make it beautiful, peaceful, and genuinely supportive of your wellbeing.",
        "Ancestral healing and emotional pattern work are health practices for Cancer in the deepest sense — what lives in your body often came through your family.",
        "Your capacity for deep feeling is a health asset when emotions move freely; they become a health liability when they are suppressed and stored.",
        "Water-based movement — swimming, water aerobics, even a long bath — brings your Cancer body a specific kind of ease that land-based exercise cannot provide.",
        "Your sleep is deeply connected to your emotional processing — disturbed sleep often signals unresolved feelings that need conscious attention.",
        "Nurturing yourself with the same care you give others is not selfish but necessary — your own emotional tank needs regular refilling.",
        "The social environments you inhabit affect your physical health directly; choose company that leaves you feeling nourished, not depleted.",
        "A health issue that has persisted has an emotional component that needs acknowledgment alongside whatever physical treatment you are pursuing.",
        "Breathing deeply into your belly — Cancer's zone of feeling — releases stored emotional tension with genuine physiological effect.",
        "Your sensitivity to food quality is not hypochondria but accuracy — your Cancer body genuinely notices and responds to what you put in it.",
        "Creative expression as health practice is powerful for Cancer; making something beautiful releases emotional material that has no other easy exit.",
        "The boundary between your feelings and others' feelings needs attention for health; you absorb emotional states that are not yours to carry.",
        "Movement practices that feel nurturing rather than punishing suit your Cancer nature — yoga, gentle swimming, walking in nature.",
        "Your emotional courage in examining what lives in the body is the foundation of the deepest Cancer health — feel it to heal it."
      ]
    },
    Leo: {
      overview: [
        "The Sun, your ruling luminary, shines its full warmth through you today — you are not just receiving light, you are generating it, and every person you encounter feels the difference.",
        "Creative energy surges with a magnificence that demands expression — do not contain what wants to radiate; let your authentic self-expression be today's primary act.",
        "Recognition arrives through an unexpected channel, acknowledging something you put genuine heart into — receive it with the gracious Leo warmth that makes appreciation feel like abundance.",
        "Your leadership is needed today not because you seek the throne but because your natural authority and genuine care create a following that trusts you completely.",
        "A performance, presentation, or creative debut is beautifully supported — your courage to be seen fully activates something magnificent in the audience.",
        "Leo generosity at its highest is love that does not seek reciprocation — practice this today and watch the world respond with unexpected abundance.",
        "Your pride, rightly understood, is not vanity but dignity — the refusal to accept less than what your genuine gifts deserve.",
        "A creative project receives the full Leo treatment today — your warmth, your vision, your refusal to do anything halfway transforms it into something remarkable.",
        "The child's capacity for wonder and play that lives at the heart of Leo energy is your greatest renewable resource — let it run free today.",
        "Someone you have believed in and supported is ready to shine; your Leo generosity takes as much joy in their success as your own.",
        "Your dramatic instincts serve you well today — the ability to make ordinary moments feel significant is a genuine and rare gift.",
        "Romantic energy is heightened; your warmth and genuine delight in people makes you irresistible to anyone paying attention.",
        "Physical vitality is high — your Leo body thrives when you use it boldly, move with confidence, and occupy your full space in the world.",
        "A challenge to your authority or creative vision is best met with dignified confidence rather than reactive defense — true Leo power is secure.",
        "Your heart is the compass that never misleads — when you act from genuine love rather than from the need for approval, everything flows.",
        "The world becomes richer when you share your gifts without calculating the return; Leo abundance is generated by generous output.",
        "A creative collaboration offers a chance to lead from the heart rather than from the ego, producing work that eclipses what solo effort could achieve.",
        "Your loyalty to those you love is one of your most royal qualities — demonstrate it today in a way that lets them know they are seen and cherished.",
        "Solar energy supports big moves and bold declarations; this is not a day for hedging, qualifying, or dimming your light for others' comfort.",
        "Your courage to be genuinely visible — not just impressive but truly seen — is what makes the deepest connections possible.",
        "A creative breakthrough arrives when you stop trying to produce something impressive and simply create something true.",
        "The admiration you receive today is not flattery but accurate perception — you have been genuinely excellent, and that is being recognized.",
        "Your playfulness and warmth transform a difficult situation into one that people will remember as fun — a rare alchemy that is entirely yours.",
        "Tonight, rest in the quiet satisfaction of being fully yourself today — the best Leo performance is always an authentic one."
      ],
      love: [
        "Your romantic warmth today is so genuine and radiant that it is simply impossible to ignore — someone is noticing, and they are responding.",
        "Love, for Leo, is a creative act — bring the full artistry of your nature to a romantic gesture today and create something memorable.",
        "Your partner needs your heartfelt appreciation expressed in the Leo style — not hedged, not measured, but warm and whole and specific.",
        "Single Leo? The person who is impressed by your full fire rather than intimidated by it is the one who deserves your magnificent heart.",
        "Romance thrives when you lead with genuine warmth rather than performance — your authentic self is more attractive than any curated version.",
        "A playful, dramatic romantic gesture lands perfectly today; Leo romance at its best is joyful, generous, and a little theatrical.",
        "Your heart is large and your capacity for love is extraordinary — make sure the person receiving it is truly worthy of this rare gift.",
        "Jealousy, if it arises, is a message about your own unmet needs rather than about the other person — listen to it honestly.",
        "Love that allows you to be fully yourself — large-hearted, expressive, creative — is the only love your Leo nature can truly sustain.",
        "A long-term relationship is renewed today by your Leo ability to inject fresh warmth and genuine celebration into the ordinary.",
        "Your generosity in love is legendary among those who know you well — today it creates a moment of genuine emotional richness.",
        "Physical affection, eye contact, and the full attention of your solar presence are today's most powerful romantic tools.",
        "Single Leo: you attract through joy and authentic self-expression, not through pursuit — let your light shine and the right person will walk toward it.",
        "A declaration of love that comes from genuine feeling rather than the desire to be impressive lands with the force of something true.",
        "Your romantic instincts tell you something important about a situation today — the feeling in your chest is a message, not merely a reaction.",
        "Creative dates and experiences that allow both of you to be playful and expressive create the kind of joy your Leo nature requires.",
        "The love you give freely and without condition is the foundation of every deep connection in your life — give it today without calculation.",
        "Conflict in love is resolved when you remember that your partner's needs are as real as your own need to be seen and appreciated.",
        "Your capacity for loyalty, once fully committed, is as steadfast as any earth sign's — let that depth of devotion be felt today.",
        "A moment of genuine vulnerability — the Leo beneath the crown — creates more intimacy than any confident display could produce.",
        "Romance needs sunlight and celebration to flourish — create an occasion out of an ordinary day and watch love rise to meet it.",
        "Your warmth toward a person who is struggling is one of the most powerfully healing things you can offer — be the sun for someone today.",
        "Love and creative expression are the same thing for Leo at the deepest level; when both are flowing, your whole being shines.",
        "Tonight, receive the love offered to you with the same grace that you give it — you are as worthy of devotion as you are capable of it."
      ],
      career: [
        "Your natural leadership is at its most effective today — not because you command but because you inspire, and inspiration creates better results than authority alone.",
        "A creative professional opportunity is exactly what your Leo nature was designed for; bring your full heart to it and the outcome will exceed expectations.",
        "Recognition for past work arrives, and you receive it with the gracious warmth that makes your appreciation feel like a gift to the giver.",
        "Your ability to command attention in a professional context is extraordinary today — every room you present in responds to your confidence and warmth.",
        "A creative vision that seemed too ambitious is actually perfectly achievable; your Leo confidence in its worth is the most important ingredient.",
        "Your professional generosity — sharing credit, building up your team, celebrating others' contributions — creates loyalty that becomes your greatest asset.",
        "Leading from the front suits your Leo nature, but the most magnetic leadership today involves bringing others forward with you.",
        "A performance or presentation opportunity is yours to own completely — preparation has been thorough, and your natural charisma handles the rest.",
        "Your professional reputation for quality, warmth, and genuine engagement precedes you into a conversation that opens important doors.",
        "Creative work produced from genuine passion rather than calculated positioning carries the Leo authenticity that makes it stand apart.",
        "A challenge to your professional authority is met with the quiet, secure confidence of someone who knows their own worth — and wins.",
        "Your ability to make people feel genuinely valued in a professional context creates productive environments that ordinary management cannot build.",
        "Bold professional action is supported today — the Leo who hesitates at the threshold of a significant opportunity wastes their most powerful alignment.",
        "Your professional instinct about a project's creative direction is correct; stand by it with the dignified confidence of genuine expertise.",
        "Teaching, mentoring, or developing others activates Leo's finest professional qualities — your belief in people's potential is transformative.",
        "A professional collaboration where your creative vision leads and your partner's skills support produces work that neither could achieve alone.",
        "Financial decisions made today with genuine Leo confidence in your own value are better than those made from anxiety or under-estimation.",
        "Your natural charisma and warmth make difficult professional conversations more productive — people respond to being seen with generosity.",
        "A long-term professional goal receives confirmation today that the path you have chosen is genuinely the right one for your Leo gifts.",
        "The courage to present your most ambitious professional idea, rather than the safe version, is rewarded today with genuine engagement.",
        "Your professional playfulness — the ability to make serious work enjoyable — is a leadership quality that produces exceptional team results.",
        "Creative risk-taking in your professional domain produces the breakthrough that cautious incremental steps could never reach.",
        "A public or visible professional role suits you extraordinarily well; the audience you develop trusts and values your authentic Leo presence.",
        "Your work, done with full Leo heart and genuine craft, speaks for itself today in ways that require no additional promotion."
      ],
      health: [
        "Leo rules the heart and the back — physical and emotional heart health are inseparable for your sign, and both deserve conscious attention today.",
        "Your vitality is highest when you are expressing yourself creatively and living with genuine purpose; stagnation makes your Leo body physically heavy.",
        "Cardiovascular activity that feels joyful rather than disciplined — dancing, an exhilarating sport, something that makes your heart sing — is your best medicine.",
        "Pride, Leo's shadow, sometimes prevents you from asking for health help you actually need — humility in this area is genuine strength.",
        "Your physical presence and bearing are expressions of your inner confidence; when you feel low, your Leo body instinctively hunches — notice and correct.",
        "Sunlight is genuinely medicine for Leo — get outside for genuine sun exposure today and feel the direct effect on your mood and energy.",
        "The back and spine, Leo's physical domain, carry the weight of your responsibilities; stretching, yoga, or bodywork releases accumulated tension.",
        "Rest is a royal necessity, not a concession to weakness — your Leo body performs best when recovery is taken as seriously as activity.",
        "Heart health is Leo's lifelong priority; what keeps your heart open — love, creativity, genuine purpose — is as important as any exercise regime.",
        "Your energy output is generous and often exceeds your input; today, focus on replenishing what you have given rather than giving more.",
        "Dramatic emotional experiences affect your physical heart directly for Leo; process feelings consciously to protect your cardiovascular health.",
        "Exercise that involves performance, audience, or competition activates your Leo motivation far more than solitary disciplined training.",
        "Your body communicates loudly and theatrically — pay attention to physical symptoms that are asking for something you have been too proud to seek.",
        "Joy is a physiological state for Leo, not just an emotional one — prioritize activities that generate genuine delight for their direct health benefit.",
        "The intersection of creativity and physical movement — dance, martial arts, expressive movement — is your most satisfying and effective health practice.",
        "Lower back pain is Leo's most common physical complaint, usually signaling that you are carrying burdens not meant for one person — ask for support.",
        "Your physical confidence, when genuine rather than performed, creates the kind of bodily ease that prevents tension-based health issues.",
        "Social connection is health for Leo — isolation degrades your physical as well as your emotional wellbeing with unusual speed.",
        "Your warmth generates warmth in return; surround yourself with people who match your energy positively and watch your physical vitality rise.",
        "Bold physical challenges that suit your Leo courage — a personal best, a physical adventure, an impressive goal — bring out your best health motivation.",
        "Heart-opening practices — yoga postures that expand the chest, breathing exercises, emotional work — are physically therapeutic for your sign.",
        "Your physical health follows your emotional health for Leo more directly than for any other sign; address both dimensions with equal seriousness.",
        "A health goal pursued with the full Leo commitment — publicly stated, emotionally invested in, creatively approached — is a health goal achieved.",
        "Tonight, rest in genuine satisfaction rather than pushing through fatigue to accomplish more — the recuperated Leo is worth ten times the exhausted one."
      ]
    },
    Virgo: {
      overview: [
        "Mercury's analytical precision aligns beautifully with your Virgo instincts today — a complex problem that has been resisting easy solution yields to your systematic, thorough approach.",
        "Your attention to detail catches something critically important that everyone else overlooked; this is not pedantry but genuine intelligence operating at its finest.",
        "A health or wellness matter that has needed your practical attention resolves today when you bring the same methodical Virgo care you give to professional challenges.",
        "Imperfection is information, not failure — this Virgo reframe transforms a setback into an extraordinarily productive diagnostic session.",
        "Service is your deepest expression of love, and today your capacity to be genuinely useful to someone who needs you creates real meaning.",
        "Your discernment about what is truly valuable versus what merely appears impressive protects you from a decision that would have cost more than it delivered.",
        "The craft of doing something well — your Virgo birthright — produces results today that speak for themselves without any self-promotion required.",
        "A organizational challenge responds beautifully to your systems-thinking; what was chaotic becomes clarified under your methodical Virgo hands.",
        "Your modesty sometimes prevents you from claiming credit for genuinely exceptional work — today, someone else does it for you, accurately.",
        "Mercury's influence sharpens your writing, analysis, and communication to their finest edge today — use this clarity for what matters most.",
        "A long-term health practice you have been maintaining with characteristic Virgo consistency begins to show the clear, measurable results that justify every effort.",
        "Your practical wisdom cuts through abstract theorizing today and arrives at a working solution while others are still constructing frameworks.",
        "The Virgo gift for improvement — seeing not just what is but what could be — transforms a mediocre situation into an excellent one.",
        "Discrimination, in its highest Virgo sense, is the intelligence that recognizes genuine quality — apply it to your choices today without apology.",
        "A colleague or friend brings a problem to you because they know your Virgo precision will find the solution that has eluded everyone else.",
        "Your humility about your own knowledge makes you a better thinker — the willingness to say you do not know something opens the door to actually learning.",
        "Earth energy grounds every ambitious idea in the practical reality of what is actually achievable — your Virgo groundedness is a genuine service today.",
        "A process improvement you have been developing quietly for weeks is ready for implementation; the efficiency gains will be immediately visible.",
        "Your body is an exceptionally sensitive instrument for Virgo — subtle signals that others would dismiss deserve your precise, respectful attention.",
        "The difference between good enough and genuinely excellent matters deeply to your Virgo soul, and today that discernment produces something truly fine.",
        "Your natural inclination toward service is fulfilled today in a way that also serves your own growth — the best helping is always mutual.",
        "Criticism you offer, when delivered with genuine care and specific precision, is received as the gift it is rather than the judgment it is not.",
        "A practical project benefits from the Virgo ability to sustain focused attention past the point where others have declared it finished.",
        "Tonight, release the self-criticism that any Virgo carries — the standard you hold yourself to is genuinely admirable, and you have met it today."
      ],
      love: [
        "Your love language is practical devotion — the thousand small acts of care, efficiency, and thoughtfulness that Virgo performs without fanfare are the most loving things imaginable.",
        "A relationship deepens when you allow your genuine warmth to express itself rather than keeping it buried beneath your characteristic practical reserve.",
        "Your discernment in love is an asset, not a flaw — high standards protect you from relationships that would ultimately fall beneath your Virgo need for quality.",
        "Single Virgo? Someone who appreciates your depth, your practicality, and your genuine care is looking — and they see right through the modest exterior to the remarkable person within.",
        "Acts of service that you perform quietly and without acknowledgment are the truest Virgo love letter; your partner feels them even when they do not name them.",
        "A relationship conversation benefits from your Virgo precision — saying exactly what you mean, specifically and honestly, resolves in minutes what vagueness prolongs for weeks.",
        "Your critical mind, applied lovingly to understanding your partner rather than judging them, produces an intimacy that analytical distance never builds.",
        "The Virgo tendency to improve people who did not ask to be improved is love's shadow side — practice acceptance alongside your natural instinct to help.",
        "Love requires a different kind of attention than analysis, and your Virgo capacity for sustained, devoted focus is actually perfectly suited to it.",
        "A romantic perfectionism that prevents you from engaging with a genuinely good but imperfect person deserves gentle examination today.",
        "Your loyalty once given is essentially unwavering — make sure the commitment you honor is one that honors you in return.",
        "Physical affection, offered and received with the same careful attention you bring to everything else, is more nourishing for Virgo than it might outwardly appear.",
        "The partner who appreciates your help, honors your intelligence, and does not exploit your service orientation is the one your soul is seeking.",
        "A small, specifically chosen gesture of love today — one that shows you were paying attention — means more than grand romantic performance.",
        "Your emotional health and your romantic health are deeply linked — the self-care practices you maintain directly affect your capacity for intimacy.",
        "Single Virgo: the person you are looking for is also looking for someone reliable, intelligent, and genuinely devoted — you match that description precisely.",
        "Love benefits from your Virgo tendency to improve situations — applied to relationship quality rather than to the other person, this gift flourishes.",
        "An honest conversation about what is and is not working in a relationship is possible today with the gentle precision that makes Virgo honesty safe rather than painful.",
        "Your Virgo nature thrives in love that is practical as well as emotional — shared goals, mutual helpfulness, and tangible acts of partnership are your love life.",
        "A moment of genuine emotional openness today, unguarded by your usual analytical observation, creates a depth of connection that surprises you both.",
        "Your instinct to be useful in love is genuine and beautiful — receive the same devotion in return and trust that you deserve it.",
        "The Virgo who has learned to love themselves with the same care they give others has achieved something genuinely magnificent.",
        "Romantic criticism, even loving and specific, deserves careful timing — today, appreciation lands better than improvement and creates the same openness.",
        "Tonight, rest in the simple goodness of a love that is reliable, specific, and genuinely devoted — your Virgo nature has built exactly this."
      ],
      career: [
        "Your methodical approach to a professional challenge produces results today that make the value of Virgo precision completely undeniable.",
        "A quality improvement you have been carefully developing is ready to be implemented; the efficiency and excellence it produces will be immediately visible.",
        "Your analytical abilities solve a complex professional problem that has been frustrating colleagues with less systematic thinking.",
        "Attention to detail saves an important project from an error that would have been expensive, embarrassing, or both — your Virgo vigilance proves its worth.",
        "A health or wellness industry context, or any role involving service and systematic care, brings out your absolute professional best today.",
        "Your professional reliability and thoroughness have built a reputation that now speaks before you enter the room — let it work for you today.",
        "A technical skill you have developed with characteristic Virgo patience is precisely what a professional opportunity requires right now.",
        "The ability to see both the forest and every individual tree in a project makes you invaluable in roles that require both strategic and tactical thinking.",
        "Your practical wisdom about what is actually achievable (versus what sounds impressive in theory) saves a project from its own ambition.",
        "Honest, specific, constructively delivered professional feedback you give today improves work quality in ways that vaguer encouragement never could.",
        "Your systems-thinking produces a workflow improvement that has immediate, measurable positive effects on your team's output.",
        "The craft mentality — doing something with genuine excellence rather than adequate sufficiency — is your professional signature and your competitive edge.",
        "A professional challenge requiring sustained, careful attention is exactly the kind of work where your Virgo nature outperforms every other approach.",
        "Your health and your professional performance are linked more directly than for most signs — the practical wellness practices you maintain produce superior output.",
        "Criticism accepted gracefully and applied immediately is the Virgo path to rapid professional development — you do this better than anyone.",
        "A research, analysis, writing, or organizational project is where your Virgo gifts shine most brilliantly today — work in your element.",
        "Your professional modesty sometimes undersells your genuine contributions; accurate self-assessment (not inflation, not deflation) serves you better.",
        "The patience to do preliminary work thoroughly before moving to visible outcomes is a professional quality that produces sustainable excellence.",
        "A colleague's imprecise work creates an opportunity for your Virgo standards to demonstrate their genuine value — handle it with grace.",
        "Service-oriented professional values — genuine helpfulness, honest communication, practical reliability — build the kind of professional reputation that lasts.",
        "Your capacity for improvement is a professional superpower when applied to your own skills and processes rather than to other people's performance.",
        "A project completed with full Virgo care — thoroughly, precisely, with genuine attention to quality — is something you can take genuine pride in.",
        "Practical professional wisdom about timing, process, and resource allocation today prevents a costly mistake that enthusiasm alone would have made.",
        "Your professional instinct for what is genuinely valuable versus what is merely fashionable saves an important decision from the tyranny of trend."
      ],
      health: [
        "Virgo rules the digestive system and the intestines — the body's capacity to analyze and sort what nourishes from what should be eliminated mirrors your mental nature precisely.",
        "Your health practices benefit from the same Virgo precision you bring to professional work — specific, measurable, consistent, and genuinely evidence-based.",
        "Stress for Virgo often manifests in the digestive tract before it surfaces in conscious awareness; treat stomach discomfort as a message rather than an inconvenience.",
        "The perfectionism that serves you in craft becomes a health liability when directed at your body — appropriate standards, not impossible ones.",
        "Mercury rules your sign and your nervous system; brain-body practices — breathwork, mindfulness, gentle movement — are your most effective health tools.",
        "A health protocol you have researched carefully and implemented with Virgo consistency is beginning to produce exactly the measurable results you expected.",
        "Your body responds well to clean, whole, minimally processed food — your Virgo discernment applies here with genuine physiological benefit.",
        "The self-criticism that is your most challenging psychological pattern has a direct somatic cost; practices that quiet it are practices that heal.",
        "Virgo health thrives on routine — the body's intelligence responds to predictable rhythms with unusual efficiency.",
        "Your nervous system is finely tuned and easily overstimulated; deliberate environmental management — quiet, order, simplicity — is genuine health practice.",
        "A chronic health concern that you have been researching yields new information today that finally makes the path forward clear.",
        "Service to others nourishes your Virgo soul and, consequently, your physical health — purposeful helping is a genuine wellness practice.",
        "Your attention to small physical details catches a health signal early that less observant people would miss entirely — trust this vigilance.",
        "The gap between what you know you should do for your health and what you actually do is narrowed today by practical Virgo self-honesty.",
        "Gut health is Virgo's primary physical domain — the gut-brain connection means that microbiome care is also mental health care for your sign.",
        "Your tendency to manage others' health and wellbeing while neglecting your own is a pattern worth examining today with genuine Virgo honesty.",
        "Practical, incremental health improvements compound into significant results over the Virgo time horizon — start the small thing today.",
        "Physical work that involves skill, precision, and craft — cooking, gardening, woodworking, fine motor activities — is therapeutic for your Mercury-ruled body.",
        "Your health analysis is often more accurate than your health implementation — today, close the gap between knowledge and action by a single specific step.",
        "Worry, Virgo's shadow, creates measurable physiological stress — practices that interrupt the worry loop are not luxury but genuine medicine.",
        "Your body is your primary instrument, and Virgo cares for instruments with unmatched attentiveness — apply that care to yourself without apology.",
        "A cleaning, organizing, or simplifying act in your physical environment produces a direct health improvement that the Virgo nervous system can feel.",
        "The discipline of sufficient sleep, consistent exercise, and genuinely nourishing food is Virgo wisdom expressed in its most practical form.",
        "Tonight, apply your analytical gifts to a gentle inventory of what your body needs — and commit to providing it with the same Virgo reliability you give everything else."
      ]
    }
  };

  Object.assign(allReadings, {
    Libra: {
      overview: [
        "Venus graces every encounter today with your natural gift for harmony, beauty, and the kind of diplomatic grace that turns tense situations into collaborative ones.",
        "A decision you have been weighing with characteristic Libra thoroughness finally tips toward clarity — both options have merit, but one aligns better with your deepest values.",
        "Your aesthetic instincts are at their finest today; trust what you find beautiful in art, environment, and human connection — Libra taste is a genuine intelligence.",
        "Balance, your ruling principle, is not stasis but dynamic equilibrium — today you find the point where opposing forces create something more interesting than either alone.",
        "A negotiation or mediation benefits from your extraordinary capacity to hold multiple perspectives simultaneously without collapsing into any single one.",
        "Your social grace today makes genuinely difficult conversations possible; people feel safe being honest with you because your fairness is completely reliable.",
        "Partnership of all kinds — professional, creative, romantic — is activated today with unusual potential; collaborations initiated now have exceptional staying power.",
        "The Libra quest for justice expresses itself practically today as an advocacy for fairness that changes a situation for the better.",
        "Your charm is not performance but genuine warmth toward people — today it opens doors that raw competence alone would have left closed.",
        "Aesthetic creativity is fully activated; any project involving beauty, design, or harmonious composition benefits from your current Libra inspiration.",
        "A long-standing tension between your own needs and others' expectations finds a genuinely satisfying resolution through your capacity for graceful negotiation.",
        "Your sense of justice is reliable — what feels unfair to your Libra instincts usually is, and speaking to it today makes a real difference.",
        "The relationships in your life reflect your own inner balance; a friendship or partnership that feels harmonious today is a mirror of your current wellbeing.",
        "Venus influence brings beauty into ordinary moments — a meal, a conversation, a walk — that your Libra receptivity makes genuinely sacred.",
        "Intellectual partnership stimulates your best thinking; a conversation with an equal today produces insights that solitary reflection never reaches.",
        "Your natural elegance, in behavior as well as in appearance, creates an environment where others feel both inspired and at ease.",
        "Fairness extended to yourself — the same generous consideration you give others — is today's most important and most challenging Libra practice.",
        "A creative project reaches a new level of refinement when you apply your Libra eye for proportion, balance, and aesthetic resonance.",
        "The Libra capacity for seeing beauty in unexpected places transforms an ordinary situation into something you will remember with genuine pleasure.",
        "Partnership decisions made today with your characteristically thorough consideration produce outcomes that prove your deliberation was well worth the time.",
        "Your social intelligence reads the unspoken dynamics in every group and navigates them with a natural grace that seems effortless but is actually refined skill.",
        "A long-awaited balance tips into place today — not perfectly, which would be stasis, but into a satisfying, dynamic harmony.",
        "Your capacity to say difficult things with genuine kindness and impeccable timing is a rare gift; use it today where it is most needed.",
        "Tonight, appreciate the beauty you have woven into your life — the relationships, the aesthetic choices, the acts of care — as genuine creative achievement."
      ],
      love: [
        "Your romantic charm today is so effortlessly graceful that it would seem calculated if it were not so clearly genuine — someone is completely enchanted.",
        "Love, for Libra, is an art form — bring your aesthetic sensibility and your gift for creating beautiful experiences to a relationship today.",
        "Partnership is your deepest need and your greatest gift; a relationship where both people are fully themselves and fully devoted is what your Libra soul is building.",
        "Single Libra? The person you are looking for values beauty, intelligence, and genuine fairness — and they will find you irresistible when you stop trying to please everyone.",
        "A romantic tension is resolved with the kind of graceful honesty that only a Libra can deliver — true, kind, and beautifully timed.",
        "Your natural instinct for balance extends to love — you give and receive with an attentiveness to fairness that makes your partnerships unusually equitable.",
        "Venus-ruled Libra reaches its romantic peak when you are surrounded by beauty — a beautiful environment today makes your heart more open and expressive.",
        "The indecision that sometimes plagues your romantic life is actually a profound respect for the weight of relational choices; honor it while still committing.",
        "Love requires your full presence today — not the diplomatic, managed version, but the genuine Libra who has feelings and needs of their own.",
        "A creative shared experience — art, music, beauty of any kind — creates romantic intimacy for Libra more powerfully than direct emotional conversation.",
        "Your fairness in love is one of your most attractive qualities — you consider your partner's perspective with the same care as your own.",
        "Single Libra: you attract through your radiance, your style, and the way you make people feel seen and valued — lead with that today.",
        "A long-term relationship is renewed today through the Libra gift of attention — noticing what is beautiful about your partner and saying so specifically.",
        "Love and friendship are closely linked for Libra; the romantic partner who is also a genuine intellectual and aesthetic companion is your ideal.",
        "Your romantic instincts about whether a connection has genuine potential are more reliable than your famous overthinking; trust the first feeling.",
        "A moment of genuine partnership — working together, creating together, deciding together — is the Libra love experience in its most authentic form.",
        "The vulnerability to say what you actually need, rather than what seems diplomatically palatable, deepens a relationship more than any graceful gesture.",
        "Your capacity to see your partner's best self — and to reflect that vision back to them — is one of the most loving things a Libra does.",
        "A romantic disagreement is resolved beautifully today by your Libra ability to honor both perspectives without invalidating either.",
        "Love that includes genuine intellectual and aesthetic companionship satisfies the Libra soul at levels that purely emotional connection cannot reach.",
        "Your romantic generosity is remarkable — ensure that it flows both ways, and that you receive the thoughtful appreciation you so readily give.",
        "A shared aesthetic experience — a gallery, a concert, a beautiful meal — creates the kind of romantic memory your Libra soul treasures.",
        "Honest communication about your own needs, delivered with your characteristic grace, is received today far better than you feared.",
        "Tonight, appreciate the beauty of a love that is balanced, honest, and genuinely reciprocal — the Libra romantic ideal made real."
      ],
      career: [
        "Your professional diplomacy today resolves a conflict that raw competence or authority alone could not have touched — your way with people is a genuine strategic asset.",
        "Collaborative professional work is where your Libra nature produces its most impressive results; today a partnership creates something neither party could have achieved alone.",
        "Your aesthetic instincts improve the quality of professional output in any field — design, presentation, communication, or environment.",
        "A negotiation benefits from your Libra capacity to find the genuinely fair solution that satisfies both parties rather than merely ending the dispute.",
        "Your professional reputation for fairness, grace, and reliable quality creates trust that opens doors in ways aggressive self-promotion never could.",
        "A leadership role that requires both vision and consensus-building is where your Libra nature shines most brightly in a professional context.",
        "Your social intelligence reads the professional room and identifies the unspoken concerns that need addressing before a decision can genuinely move forward.",
        "The Libra eye for quality and proportion improves whatever creative or professional project receives your full aesthetic attention today.",
        "Your ability to advocate fairly for your own work — without over-selling or under-valuing — positions you exactly right in a professional conversation.",
        "Partnership-oriented professional structures suit your Libra nature far better than solitary, competitive ones — seek collaboration today.",
        "A professional presentation or pitch benefits from your natural ability to make complex ideas beautiful, accessible, and genuinely persuasive.",
        "Your fairness in distributing credit, responsibility, and recognition in a team context builds the kind of loyalty that makes your professional environments unusually productive.",
        "Aesthetic professional decisions — brand, design, communication style — benefit enormously from your Libra taste and proportion-sense today.",
        "A professional mediation or conflict resolution is handled with the characteristic Libra skill that produces outcomes everyone can genuinely accept.",
        "Your professional charm makes difficult stakeholder conversations surprisingly productive — people respond to being treated with dignity.",
        "The partnership you are building professionally today has the potential to become one of your most significant career relationships.",
        "Your Libra ability to see multiple sides of a professional issue makes your strategic thinking more comprehensive than single-perspective analysis.",
        "A professional creative collaboration reaches its finest result when you trust your aesthetic instincts as fully as your analytical ones.",
        "The deliberation you give to major professional decisions is not slowness but wisdom — the outcome validates the Libra thoroughness.",
        "Your professional reputation for excellence combined with genuine human decency attracts the caliber of opportunity that matches your actual abilities.",
        "A workplace harmony issue that has been creating low-level friction resolves through your Libra instinct for creating genuinely fair conditions.",
        "Partnership decisions made today with Venus on your side have an unusually strong probability of long-term professional success.",
        "Your ability to speak truth with grace transforms a difficult professional feedback session into a genuinely developmental conversation.",
        "The professional work you create with full aesthetic and analytical Libra engagement is something you can look at with genuine, justified pride."
      ],
      health: [
        "Libra rules the kidneys and lower back — relational stress and imbalance carry directly into these physical areas; address both together today.",
        "Your health is directly affected by the quality of your relationships; harmonious connections are literally good for your Libra physiology.",
        "Balance is not just your life principle but your health principle — too much of any single thing, including health discipline, creates its own imbalance.",
        "The lower back tension Libra commonly carries is the body's record of decisions deferred and needs unexpressed — address both.",
        "Beauty in your physical environment is a genuine health practice for Venus-ruled Libra; ugly, chaotic spaces create physiological as well as psychological stress.",
        "Kidney health is Libra's physiological priority; adequate hydration, reduced excess salt and processed food, and sufficient rest support it directly.",
        "Your health decision-making, like all your decisions, benefits from the information of how different choices feel in your body rather than just what seems theoretically optimal.",
        "Exercise with a partner or in a class suits your Libra nature and dramatically improves your consistency — social movement is your best health strategy.",
        "The chronic Libra challenge of indecision creates genuine mental fatigue; decisive small choices today free energy that the body needs.",
        "A health practice that is beautiful as well as effective — yoga, tai chi, dance — holds your Libra attention and motivation with unusual power.",
        "Your nervous system responds to aesthetic quality in its environment — a tidy, beautiful space is genuinely therapeutic for your sign.",
        "The suppression of your own needs in service of others' comfort creates a specific kind of Libra health liability; practice honest expression today.",
        "Sweet foods, which your Venus-ruled nature craves, deserve Libra moderation — indulge with genuine pleasure and appropriate proportion.",
        "Relational conflict, unresolved, carries directly into Libra's physical body; addressing interpersonal imbalances is literally a health practice.",
        "Your body finds ease in balanced, moderate approaches — extreme health regimens, however fashionable, suit your Libra nature poorly.",
        "The social aspects of wellness — group classes, shared meals, walking with friends — are where your Libra health practices reach their best consistency.",
        "Lower back support in your physical environment — good seating, appropriate movement, skilled bodywork — is a priority health investment for your sign.",
        "Your health instinct about what your body needs today is more reliable than any general protocol; listen to it with Libra attentiveness.",
        "A beauty ritual — something that makes you feel genuinely lovely — is not vanity for Libra but a genuine physiological uplift.",
        "Hydration is Libra's simplest and most overlooked health practice; your kidneys and your entire system thank you for consistent, adequate water intake.",
        "Rest in a beautiful environment — your bedroom carefully arranged, genuinely peaceful — produces the quality of sleep your Libra nature requires.",
        "The health conversation with a practitioner who treats you with genuine respect produces far better Libra outcomes than authoritarian directives.",
        "Your health thrives on the same balance you seek everywhere — work and rest, activity and stillness, social engagement and genuine solitude.",
        "Tonight, create a genuinely beautiful, peaceful restorative ritual — Libra's body and soul need beauty the way other signs need pure function."
      ]
    },
    Scorpio: {
      overview: [
        "Pluto, your modern ruler, is orchestrating a deep transformation that surfaces to consciousness today with startling clarity — you understand something you could not previously articulate.",
        "Your investigative instincts are at their sharpest today, cutting through surface appearances to the hidden structures that actually determine outcomes.",
        "Power dynamics that have been invisible or ambiguous become clear today; your Scorpio perception sees exactly who holds influence and exactly how it flows.",
        "Intensity is your natural element, and today's depth of experience — emotional, intellectual, relational — nourishes you in ways that shallow encounters never could.",
        "A transformation that has been proceeding beneath your conscious awareness rises to the surface; what felt like ending was actually becoming.",
        "Your capacity for absolute loyalty and fierce protection is called upon today by someone who genuinely needs the kind of support only a Scorpio provides.",
        "Secrets and hidden information have a way of finding you; something you learn today rearranges your understanding of a significant situation.",
        "The regenerative power of your sign means that what others see as loss you experience as the shedding of what was ready to be released.",
        "Your emotional depth perceives what is actually true in a relationship or situation far beneath the diplomatic surface — trust this perception.",
        "Financial and resource matters benefit from your Scorpio strategic mind; you see moves and possibilities others simply do not.",
        "A long-standing power struggle resolves in your favor today — not through force but through the Scorpio combination of patience and perfect timing.",
        "Your willingness to enter the depths that others fear gives you access to knowledge, healing, and transformation that remains inaccessible to the fearful.",
        "Intimacy — emotional, intellectual, spiritual — is both your greatest need and your greatest offering; a connection deepens today to its true level.",
        "The Scorpio gift for psychological penetration serves a therapeutic purpose today — you help someone see a truth they needed to understand.",
        "Beneath your composed exterior, a powerful current of feeling moves; honor its intelligence today by letting it inform your most important decisions.",
        "Your research instincts turn up a piece of information today that proves to be far more significant than it initially appeared.",
        "The crisis that seemed catastrophic is revealing itself as an initiation; Scorpio wisdom knows the difference and navigates accordingly.",
        "Your strategic patience — the ability to wait for exactly the right moment — is the quality that transforms your considerable power into actual results.",
        "A healing process that has been progressing quietly makes a visible leap forward today; the work you have been doing internally is manifest.",
        "Your perception of what is authentic versus what is performed in others is essentially infallible today — trust it completely.",
        "The depth of your commitment, once given, is one of the most powerful forces in anyone's life; choose today with that awareness.",
        "Shadows that have been requiring your Scorpio attention and integration move into the light today with healing rather than threatening effect.",
        "Your capacity for genuine transformation — to die to one version of yourself and emerge genuinely new — is working on your behalf right now.",
        "Tonight, honor the depth of what you have processed today by giving your formidable inner life the rest and integration it genuinely requires."
      ],
      love: [
        "Your capacity for emotional depth and absolute loyalty creates an intensity of romantic bond that people who have experienced it never forget or fully leave.",
        "Intimacy, for Scorpio, is all or nothing — the surface-level connection that satisfies others leaves you hungrier than you were before.",
        "A romantic truth you have been sensing beneath a relationship's surface becomes visible today; what you do with this knowledge is your most significant choice.",
        "Single Scorpio? The person who can meet your depth, match your intensity, and remain standing in the full force of your genuine self is rare — and worth waiting for.",
        "Your jealousy, when it arises, is a signal about your own deepest needs rather than a verdict about another person — investigate it rather than act on it.",
        "Love for Scorpio requires complete honesty — the relationship that cannot hold your truth cannot hold you.",
        "A romantic transformation is underway; what feels like the end of something is actually the shedding of what was preventing real intimacy.",
        "Your sexual and emotional magnetism today is at its most potent — someone is intensely aware of you in ways you may not realize.",
        "The vulnerability of being truly known — not just liked, not just desired, but genuinely seen in your full complexity — is what your Scorpio soul requires.",
        "A romantic power dynamic that has been unbalanced is corrected today through your characteristic combination of patience and decisive clarity.",
        "Your capacity for deep, transformative love — the kind that changes both people permanently for the better — is what makes your relationships extraordinary.",
        "Trust, once broken with a Scorpio, requires genuine proof of change rather than reassuring words — and you are right to require it.",
        "A romantic connection that begins under Scorpio energy has an intensity and staying power that casual meetings simply do not generate.",
        "Your partner's hidden self — the depth they do not show the world — is accessible to you in a way that creates extraordinary intimacy.",
        "Love requires your Scorpio self-awareness today — knowing which feelings are responses to the present situation and which belong to older wounds.",
        "Single Scorpio: your magnetic intensity draws people toward you constantly; your discernment about who deserves your depth is your most important romantic skill.",
        "A declaration of complete emotional commitment, offered without manipulation or game-playing, creates the kind of bond your soul is seeking.",
        "The transformative potential of deep love — to heal old wounds, to reveal authentic self, to create genuine mutual evolution — is what Scorpio romance at its best delivers.",
        "Your loyalty, once given, is essentially absolute — ensure that the person receiving this immense gift is worthy of it and genuinely appreciates it.",
        "A moment of complete emotional honesty today — unguarded, unmanaged, fully real — creates an intimacy that polished interactions never achieve.",
        "Your romantic instincts about a person true character are more accurate than any investigation; feel what your Scorpio depth perceives.",
        "Love and power are closely related in your experience; the most empowering romantic experience is one where both people are fully free and fully devoted.",
        "A healing of a romantic wound — one that has been affecting your capacity for trust and openness — makes significant progress today.",
        "Tonight, honor the depth of your feeling nature with genuine rest — Scorpio intensity requires recovery time as real as any other expenditure of power."
      ],
      career: [
        "Your strategic mind sees the hidden dynamics of professional situations with a clarity that gives you extraordinary advantage in complex organizational environments.",
        "Research, investigation, analysis, or any work requiring the kind of depth and penetration that most professionals lack is where your Scorpio nature shines today.",
        "A professional power dynamic shifts in your favor today — not through aggression but through the Scorpio combination of patience, perception, and precisely timed action.",
        "Your professional instinct about a colleague or competitor motivations is accurate; use this knowledge strategically rather than reactively.",
        "Financial and resource management is a Scorpio professional strength — your instinct for what is genuinely valuable versus what only appears so is exceptional.",
        "A complex professional challenge that requires uncovering what is hidden, understanding what is unstated, and navigating what is sensitive plays exactly to your strengths.",
        "Your ability to maintain professional composure while perceiving everything with Scorpio intensity gives you significant advantage in high-stakes situations.",
        "Transformation is your professional theme — the ability to take a situation that needs complete rebuilding and remake it into something genuinely superior.",
        "Your professional resilience — the ability to be knocked down and return stronger — is one of your most valuable career assets over the long term.",
        "A professional loyalty you have demonstrated, and the loyalty it creates in return, becomes your most powerful professional resource today.",
        "Your capacity for sustained, intense concentration over extended periods produces professional outcomes that scattered, distracted effort could never achieve.",
        "Investigative, therapeutic, financial, or any depth-requiring professional work activates your absolute best today — work in your natural domain.",
        "A professional adversary reveals more than they intended today; your Scorpio perception catches what was not meant to be shown.",
        "The strategic patience that looks like waiting from the outside is actually the most active phase of your Scorpio professional work — the action is coming.",
        "Your professional transformation — a genuine upgrading of your skills, position, or professional identity — is further along than it appeared from the outside.",
        "Power is professional currency for Scorpio; understanding where it actually lives in your organization is more valuable than any conventional career advice.",
        "Your professional intensity, when directed at your craft rather than at organizational politics, produces work of genuinely extraordinary quality.",
        "A professional secret or hidden information you possess today gives you significant advantage in a situation that turns on exactly this knowledge.",
        "Your professional resilience after a setback demonstrates to everyone paying attention exactly the caliber of person they are dealing with.",
        "The depth of your professional commitment, once given, is essentially transformative — projects and teams that receive your Scorpio investment are permanently changed.",
        "A professional transformation is complete enough to begin the next phase; the building that was cleared is now ready for the new structure.",
        "Your ability to see what is genuinely valuable beneath the surface — in data, in people, in opportunities — is a competitive professional advantage of the highest order.",
        "Professional regeneration after a difficult period is the Scorpio pattern; what looks like defeat from outside is the chrysalis stage of significant development.",
        "Your professional power is most effective when it operates beneath the surface, shaping outcomes through strategic positioning rather than visible force."
      ],
      health: [
        "Scorpio rules the reproductive system and the eliminative organs — the body's capacity for transformation and regeneration mirrors your sign's deepest nature.",
        "Emotional intensity held in the body rather than processed creates the specific Scorpio health liabilities — release practices are essential daily maintenance.",
        "Your body's regenerative capacity is extraordinary when you work with it consciously; recovery from illness or injury can be genuinely faster than expected.",
        "The elimination of what no longer serves — toxic relationships, stagnant habits, suppressed emotions — is as important for Scorpio physical health as nutritional choices.",
        "Sexual health and emotional health are deeply connected for Scorpio; address both together with the same Scorpio honesty you bring to everything important.",
        "Your body holds the history of significant emotional experiences in physical tension patterns; skilled bodywork accesses and releases what years of talking might not.",
        "The psychological depth required to examine your own health honestly — without denial, without drama — is a genuine Scorpio strength.",
        "Detoxification practices of all kinds — physical, emotional, environmental — are exceptionally powerful for your transformative, eliminative sign.",
        "A chronic health pattern may have an emotional or psychological root that deserves the same Scorpio investigative attention as any other deep problem.",
        "Your health intuition, when you trust it rather than intellectualize it away, is essentially diagnostic — listen to what your body is actually saying.",
        "Scorpio health thrives on transformation rather than maintenance — periodic deep cleanses, intensive practices, and genuine renewals suit you better than moderate routine.",
        "The reproductive and eliminative systems are Scorpio's physiological domains; attentive care here has effects throughout your entire system.",
        "Emotional processing through the body — somatic therapy, dance, intense physical exercise — is more effective for Scorpio than purely verbal approaches.",
        "Your willingness to face what is difficult in your health situation, rather than avoiding it, is the quality that produces genuine healing.",
        "Power, control, and their loss are Scorpio health themes — practices that help you feel genuinely empowered in your own body are therapeutic.",
        "The transformation your body is capable of — genuine healing, genuine change — should not be underestimated by your Scorpio intensity or impatience.",
        "Sleep as transformation — the nightly death and rebirth cycle — is especially significant for Scorpio; honor it with ritual and genuine priority.",
        "Hidden health factors, uncovered through thorough investigation, explain a pattern that has been puzzling you; your Scorpio tenacity in finding answers serves you.",
        "Your relationship with your body's shadow aspects — what it cannot do, what it requires, what it fears — deserves the same honest Scorpio attention as its strengths.",
        "Water, the element of your sign, is healing in every form — hydration, immersion, proximity to water bodies — for Scorpio physiology and psychology alike.",
        "The health practice that requires genuine commitment and intensity suits your Scorpio nature far better than gentle, optional approaches.",
        "A regenerative health crisis — illness that forces genuine change — is Scorpio's most direct path to transformation when gentler methods have been resisted.",
        "Your physical resilience is one of your most remarkable qualities; honor it with the intelligent care that keeps it fully operational.",
        "Tonight, give your remarkable body the deep, restorative rest it deserves — Scorpio regeneration requires genuine darkness, stillness, and surrender."
      ]
    },
    Sagittarius: {
      overview: [
        "Jupiter, your ruling planet, expands everything it touches today — your thinking grows larger, your optimism deepens, and the world seems genuinely full of possibility waiting for your exploration.",
        "Your philosophical nature is engaged today by a question, a book, a conversation, or an encounter that opens a new dimension of understanding.",
        "Adventure is not just your preference but your medicine — the restlessness you feel today is directing you toward expansion that your Sagittarius soul genuinely requires.",
        "Your honesty, the most characteristic Sagittarius gift, is needed today in a situation where diplomatic evasion has been making things worse, not better.",
        "A long-distance connection, international opportunity, or cross-cultural encounter carries significant personal and professional potential today.",
        "Your optimism is not naive but prophetic — your belief that things will work out actually participates in making them work out.",
        "The big picture, which is always what interests you most, comes into focus today with unusual clarity; you understand where you are in the larger trajectory.",
        "Your love of freedom is a genuine intelligence about what your Sagittarius nature requires to flourish; honor it in how you structure your time today.",
        "A teaching, philosophical, or wisdom-sharing opportunity allows your Sagittarius generosity to express itself through the sharing of what you have genuinely learned.",
        "Travel — physical, intellectual, or spiritual — is your most reliable path to the renewal that keeps your Sagittarius fire burning bright.",
        "Your enthusiasm is contagious today, and people around you are genuinely lifted by the genuine Sagittarius belief that the next horizon is always better.",
        "The connection between your personal freedom and your genuine purpose is clarifying; you understand what you are building and why it matters.",
        "A philosophical insight arrives that reframes a situation you have been approaching from an unnecessarily limited perspective.",
        "Your arrow-like aim — the Sagittarius ability to identify the essential target and move directly toward it — is at its most accurate today.",
        "Generosity of spirit, one of your most beautiful qualities, expresses itself today in a way that creates genuine positive change in someone's life.",
        "The higher mind that governs your sign is active and expansive — study, lecture, deep conversation, and philosophical inquiry are all exceptionally productive.",
        "Your restlessness today is creative, not merely impatient — it is pointing at growth that has not yet found its form.",
        "A belief you have held without examination is tested today, and either confirmed with new depth or joyfully released for something truer.",
        "Your gift for synthesis — connecting disparate ideas, cultures, and disciplines into larger understanding — produces a genuine breakthrough today.",
        "The Sagittarius capacity for genuine hope — not wishful thinking but active belief in what is possible — is one of the world's most needed resources.",
        "An opportunity that requires courage, optimism, and the willingness to go further than others are comfortable going arrives today.",
        "Your philosophical framework for understanding your own life clarifies, and with it comes a renewed sense of purpose and direction.",
        "The wisdom you have accumulated through genuine experience is ready to be shared; your Sagittarius generosity in offering it creates real impact.",
        "Tonight, let your mind roam freely in the vast territory it loves — the big questions, the wide horizons, the inexhaustible adventure of genuine inquiry."
      ],
      love: [
        "Your romantic nature requires freedom and genuine adventure; the partner who tries to contain your Sagittarius fire eventually loses it entirely.",
        "Love, for Sagittarius, must include intellectual and philosophical companionship — the relationship where you can discuss ideas as deeply as you share feelings is your ideal.",
        "Your honesty in love, even when it delivers uncomfortable truths, is ultimately more loving than the diplomatic evasions that leave people in comfortable illusions.",
        "Single Sagittarius? The person worth your freedom is one who expands your world rather than contracts it — hold that standard firmly.",
        "A romantic encounter with someone from a different culture, background, or belief system carries genuine potential for the kind of growth your Sagittarius soul craves.",
        "Your optimism about love — the genuine belief that the best is possible — is not a delusion but one of the qualities that makes you extraordinarily attractive.",
        "Love needs space and adventure to flourish for Sagittarius; plan something genuinely expansive with your partner today.",
        "Your directness about what you want and need in a relationship, delivered with genuine warmth, is more attractive than any calculation or game.",
        "A philosophical conversation with someone you are attracted to is more genuinely intimate for Sagittarius than conventional romantic gestures.",
        "Your capacity for genuine joy and enthusiasm makes you one of the most genuinely fun people to love; let this quality express itself freely today.",
        "The relationship that calls out your full Sagittarius nature — your philosophy, your adventurousness, your generosity, your honesty — is the one worth your commitment.",
        "Love and freedom are not opposites for Sagittarius when both partners are genuinely secure; the expansive relationship is possible and you are right to require it.",
        "A long-distance romantic connection or a partner from a foreign culture activates your Sagittarius nature in ways that more conventional partnerships rarely can.",
        "Your romantic restlessness today is a message about growth, not about the wrong partner — explore what needs expanding rather than what needs replacing.",
        "The Sagittarius commitment, when fully given, is fierce and devoted; be sure you are offering it to someone who can receive and reciprocate its full force.",
        "Single Sagittarius: your adventurousness and philosophical depth are your most genuinely attractive qualities — lead with your authenticity, not your charm.",
        "A romantic philosophical difference that seemed like an obstacle reveals itself as the source of the most interesting conversations you will ever have.",
        "Your optimism about a relationship that others might write off is based on genuine Sagittarian insight — you see potential that is real.",
        "Love declarations made with full Sagittarius fire and genuine conviction are received as the powerful gifts they are.",
        "The partner who grows alongside you — who welcomes your constant evolution rather than needing you to stay the same — is your genuine match.",
        "Your honesty about your own limitations and needs in love is the act of genuine vulnerability that creates the deepest romantic trust.",
        "A shared adventure today — any genuine novelty and exploration undertaken together — creates romantic memory and deepens connection.",
        "Your generous Sagittarius love is one of the most expansive gifts one person can offer another — make sure it is flowing both toward others and back to yourself.",
        "Tonight, appreciate the adventure of love itself — with all its expansiveness, its uncertainty, and its extraordinary capacity for genuine discovery."
      ],
      career: [
        "Jupiter's expansive influence today makes this an excellent time for professional bold moves — your optimism is not misplaced but accurately reading genuine opportunity.",
        "A professional opportunity with an international, educational, or philosophical dimension is exactly the kind that activates your Sagittarius professional genius.",
        "Your ability to see the big picture when others are lost in details makes you an invaluable strategic presence in any professional context today.",
        "Teaching, publishing, coaching, or any role that allows you to share knowledge and expand others' perspectives is where your Sagittarius gifts shine brightest.",
        "Your professional honesty — the willingness to say what is actually true rather than what people want to hear — saves a project from a costly delusion.",
        "An adventurous professional move that seems risky is actually well-timed today; your Sagittarius instinct for favorable odds is reading the situation correctly.",
        "Professional networks that span cultures, geographies, and disciplines are your greatest career asset — invest in them today with genuine curiosity and generosity.",
        "Your enthusiasm for a professional idea is infectious and productive; let it inspire your team without overwhelming their capacity for careful implementation.",
        "A long-term professional vision clarifies today, and the path to realizing it — while genuinely ambitious — becomes clearer and more navigable.",
        "Your Sagittarius resilience in the face of professional setbacks is extraordinary — you simply refuse to accept that the story is over when it has merely changed.",
        "A cross-cultural or international professional collaboration offers exactly the kind of expansive experience your Sagittarius nature requires for full professional engagement.",
        "Your philosophical framework for understanding professional success — what it means, why it matters — guides you toward the work that genuinely fulfills you.",
        "The honest professional feedback you give is valuable precisely because you are one of the few people who says what is actually true with genuine goodwill.",
        "Professional exploration — following a thread of professional curiosity wherever it leads — produces a breakthrough today that planned effort could not have reached.",
        "Your ability to synthesize information from multiple domains into a larger, more accurate picture is an extraordinary professional intelligence.",
        "A professional philosophy that guides your choices produces better long-term outcomes than tactical maneuvering without underlying principle.",
        "Your natural optimism about professional possibilities makes you a genuine asset in any planning, visioning, or strategy context.",
        "The professional fire of genuine interest — rather than the obligation of mere competence — is visible in everything you produce today.",
        "A publication, course, or educational platform is the right professional vehicle for the Sagittarius who has something genuine to teach.",
        "Your professional adventures, even the ones that did not produce the intended result, have built the specific wisdom that now makes you genuinely exceptional.",
        "The expansive professional vision you carry — the ambitious, large-scale version of what you are building — deserves to be taken completely seriously today.",
        "Your professional generosity in sharing what you know, making introductions, and opening doors for others creates a network of reciprocal support.",
        "A professional belief that has been holding you back — a limiting assumption about what is possible — is released today with liberating effect.",
        "The Sagittarius professional journey is always ultimately toward greater wisdom, broader understanding, and deeper purpose — you are exactly on track."
      ],
      health: [
        "Sagittarius rules the hips, thighs, and liver — physical expansion and philosophical excess both manifest in these areas for your sign.",
        "Your health thrives on movement and exploration; the same restlessness that makes stillness uncomfortable also makes sedentary living genuinely dangerous for your Sagittarian physiology.",
        "Outdoor movement — hiking, running in nature, cycling, equestrian activities — is the Sagittarius health practice that most completely satisfies your sign's deepest nature.",
        "Your natural optimism is a genuine health asset — the tendency to believe in recovery and wholeness actually participates in producing them.",
        "The liver, your sign's organ of excess, benefits from conscious moderation of alcohol, rich food, and the other pleasures your Sagittarius nature craves in abundance.",
        "Hip and thigh health is Sagittarius's primary physical priority; stretching, mobility work, and activities that maintain your legendary freedom of movement deserve consistent attention.",
        "Your love of adventure extends to health exploration — trying new wellness practices, unfamiliar foods, different movement systems keeps your Sagittarius nature genuinely engaged.",
        "The philosophical dimension of health — understanding why practices work, connecting physical wellness to larger meaning — is what maintains Sagittarius health motivation long-term.",
        "Excess is your most characteristic health challenge; Jupiter's generosity means that good things become too much of a good thing more easily for you than for other signs.",
        "Travel, even brief expeditions to new environments, is genuinely health-restorative for Sagittarius in ways that more conventional self-care cannot replicate.",
        "Your resilience after illness or injury is extraordinary — the Sagittarian refusal to accept a diminished life creates remarkable recovery speed.",
        "A health routine that includes genuine adventure and variety maintains your Sagittarius compliance far better than rigid, repetitive protocols.",
        "Physical freedom — the ability to move expansively in your body and your environment — is a fundamental health need, not a preference, for your sign.",
        "Your health benefits from the same honesty you bring to everything important — clear-eyed assessment of what is working and what requires change.",
        "The connection between your philosophical wellbeing — your sense of meaning and purpose — and your physical health is unusually direct for Sagittarius.",
        "Competitive sports, especially those involving movement and outdoor environments, are Sagittarius's most satisfying and effective health motivators.",
        "Your body responds to genuine philosophical optimism about its capacity for health and vitality — this is not wishful thinking but an actual physiological mechanism.",
        "Rest for Sagittarius needs to include mental exploration — reading, listening, learning — as well as physical stillness to feel genuinely restorative.",
        "The excess that your Jupiter-ruled nature gravitates toward — whether food, alcohol, activity, or even health obsession — requires the same Sagittarian honesty to address.",
        "An active, expansive lifestyle is your most effective health insurance; the Sagittarius who moves freely, explores regularly, and lives with genuine purpose is the healthiest version of your sign.",
        "Your health improves when your life feels genuinely meaningful and free; the somatic effects of philosophical fulfillment are real for your sign.",
        "A health practice with a philosophical or spiritual dimension — martial arts, yoga, tai chi — satisfies multiple Sagittarius needs simultaneously.",
        "Your natural athleticism, when engaged with genuine Sagittarius enthusiasm, produces physical results that reluctant exercisers cannot achieve.",
        "Tonight, let your body move freely and rest deeply — the Sagittarius animal that runs all day sleeps magnificently, and tomorrow's adventure begins in tonight's rest."
      ]
    },
    Capricorn: {
      overview: [
        "Saturn, your ruling planet, rewards sustained effort today with the kind of tangible, measurable progress that your Capricorn soul finds more satisfying than any fleeting recognition.",
        "The structures you have been building with patient, methodical Capricorn effort are more complete than they appear from the inside; significant achievement is closer than you think.",
        "Your natural authority — earned through demonstrated competence rather than claimed through title — is fully visible today to the people whose opinion actually matters.",
        "A long-term goal receives confirmation today that the strategy you have chosen is genuinely correct; Capricorn patience is vindicated by this evidence.",
        "Discipline is not restriction for your Capricorn nature but the form through which your greatest freedom expresses itself — the freedom of genuine mastery.",
        "Professional recognition arrives through an unexpected channel today, acknowledging work that you invested in with full Capricorn seriousness.",
        "Your practical wisdom about what is achievable, sustainable, and genuinely valuable guides a decision today that will prove itself correct over the long term.",
        "The Capricorn understanding that the summit is reached one careful step at a time is wisdom that produces results where others' impatience creates failures.",
        "A responsibility that falls to you today is not a burden but a demonstration of exactly the kind of trust your Capricorn reliability has earned.",
        "Your long-term thinking produces a decision today that seems overly cautious to others but will prove itself wise when the full arc of events becomes visible.",
        "Financial discipline that you have maintained with characteristic Capricorn steadiness begins to produce the compound results that patient effort earns.",
        "Your composure in a situation that would destabilize others is not emotional suppression but genuine groundedness that serves everyone around you.",
        "The mountain that your ambition is climbing comes into clearer view today; you see more of the path ahead and recognize how much ground you have already covered.",
        "Your Capricorn sense of time — the ability to think in decades rather than days — is one of the most genuinely rare and valuable forms of intelligence.",
        "A mentor figure or respected authority offers recognition or guidance today that represents a significant professional or personal milestone.",
        "The work ethic that others observe in you with admiration is not performance but simply who you are; Capricorn discipline is an identity, not a strategy.",
        "A practical achievement that required months of sustained effort is complete today; receive the satisfaction it deserves without immediately beginning the next task.",
        "Your Capricorn gravitas — the weight and authority of someone who means what they say and does what they commit to — creates extraordinary professional trust.",
        "A family legacy or ancestral pattern that has shaped your sense of responsibility is examined with new clarity today, allowing you to choose what to carry forward.",
        "The patience required for genuine mastery — years of consistent practice, deliberate improvement, and honest self-assessment — is precisely what your Capricorn nature does best.",
        "An ambitious goal that once seemed impossibly distant is now close enough to see in clear detail; your patient, systematic approach has brought you here.",
        "Your practical intelligence about power, structure, and long-term outcomes is an extraordinary professional and personal asset — use it fully today.",
        "A moment of genuine accomplishment deserves Capricorn acknowledgment rather than immediate redirection to the next challenge — pause and receive it.",
        "Tonight, rest in the deep satisfaction of work done with integrity and genuine skill — the Capricorn who has given their best has nothing to apologize for."
      ],
      love: [
        "Your love, once genuinely given, is one of the most reliable and deeply devoted forces in any person's life — the Capricorn commitment is an extraordinary gift.",
        "Romance for Capricorn has a seriousness and intentionality that lighter signs may misread; what looks like restraint is actually the respect of genuine consideration.",
        "A relationship built on mutual respect, shared values, and long-term commitment is what your Capricorn soul requires — and is worth being patient for.",
        "Single Capricorn? The person worth your serious consideration is one whose character, values, and long-term orientation match your own Capricorn substance.",
        "Your practical love language — reliability, provision, the steady presence that is always there — is one of the most profoundly loving things a person can offer.",
        "A romantic relationship that is also a genuine partnership — where both people work toward shared goals and honor each other's ambitions — is the Capricorn ideal.",
        "Your emotional depth, so carefully protected by your composed exterior, is accessible today to someone who has proven genuinely trustworthy.",
        "The patience you bring to love — the willingness to build slowly and solidly rather than burning bright and brief — is the foundation of lasting romantic structures.",
        "A long-term romantic commitment deepens today through the accumulation of small, reliable, genuinely devoted acts that are your most authentic love expression.",
        "Your Capricorn integrity in relationships — saying what you mean, keeping commitments, showing up consistently — creates the trust that makes genuine intimacy possible.",
        "The vulnerability beneath your Capricorn composure is real and deep; sharing it with someone who has earned it creates bonds of extraordinary strength.",
        "Romance that includes practical partnership — building something together, supporting each other's ambitions, sharing long-term vision — nourishes your Capricorn soul.",
        "Your standard for romantic partnership is high because your Capricorn understanding of love's weight is genuine; do not lower it.",
        "A relationship that has been developing with characteristic Capricorn patience reaches a new level of depth and commitment today.",
        "Your emotional loyalty, once established, weathers difficulties that would end relationships built on less serious foundations.",
        "Single Capricorn: you are more romantically attractive when you allow your genuine warmth and dry humor to surface alongside your impressive competence.",
        "A romantic situation that requires practical problem-solving — logistics, shared decisions, tangible commitments — is handled with characteristic Capricorn excellence.",
        "The love that grows slowly, deepens with time, and strengthens through shared challenges is the love your Capricorn nature is perfectly built for.",
        "Your Capricorn wisdom about what makes love last — consistency, respect, genuine partnership — is more accurate than the romantic idealism of signs that burn out quickly.",
        "A moment of unguarded emotional honesty today, rare and therefore precious from a Capricorn, creates an intimacy that years of reliable presence has prepared.",
        "Your capacity to be a stable, trustworthy presence in a partner's life is one of the most genuinely loving things in the full spectrum of human relating.",
        "The Capricorn who learns to receive love as readily as they give it has achieved something that many of your sign find genuinely challenging — practice today.",
        "Romantic depth accumulates for Capricorn over time the way professional accomplishment does — slowly, undeniably, and with compound interest.",
        "Tonight, appreciate the quiet stability of a love that is reliable, genuine, and built to last — the Capricorn romantic achievement is more remarkable than you allow yourself to believe."
      ],
      career: [
        "Your professional discipline and long-term strategic thinking produce results today that validate every Capricorn hour of unglamorous, consistent effort.",
        "A career milestone is reached today — not through luck or timing but through the sustained, serious effort that is your professional signature.",
        "Your natural authority commands respect in any professional context because it is based on demonstrated competence rather than claimed status.",
        "A long-term professional strategy pays off today in a way that more impatient approaches could never have produced; Capricorn patience is a genuine competitive advantage.",
        "The professional structures you have been building methodically — reputation, expertise, relationships, resources — are far more complete than they appear from the inside.",
        "Your composure in a professional crisis demonstrates exactly the caliber of leadership that organizations in difficulty desperately need.",
        "Financial discipline and long-term resource management are professional skills where your Capricorn nature produces results that others cannot match.",
        "A professional responsibility that intimidates others is exactly the kind of challenge that motivates your Capricorn nature to its finest performance.",
        "Your practical intelligence about organizational power — where it actually lives and how it actually moves — is a professional asset of the first order.",
        "A senior professional mentor or respected authority acknowledges your work today in a way that represents a genuine career milestone.",
        "The slow, careful career ascent that Capricorn takes is not the slow path but the most sustainable and ultimately the highest-reaching path.",
        "Your professional integrity — the refusal to cut corners, misrepresent your work, or sacrifice quality for speed — has built a reputation that now precedes you.",
        "A challenging professional project receives your full Capricorn commitment today; the result will speak for itself without requiring any additional advocacy.",
        "Your long-term professional vision is more accurate than most people's short-term plans; the Capricorn time horizon is a genuine strategic gift.",
        "Professional mastery — genuine, deep expertise in your field — is the Capricorn career goal that produces the most lasting and meaningful success.",
        "Your ability to take on significant professional responsibility and deliver on it completely is the quality that most distinguishes your career.",
        "A practical career decision today — cautious by others' standards, wise by yours — produces excellent long-term outcomes that vindicates your approach.",
        "The professional relationships built on genuine mutual respect and demonstrated reliability are your most durable and valuable career assets.",
        "Your Capricorn ambition, combined with your Capricorn discipline, creates a professional combination that is genuinely rare and exceptionally effective.",
        "A career achievement that required years of patient, systematic effort is complete today; acknowledge it with the full Capricorn satisfaction it deserves.",
        "The gravitas and authority you carry in professional contexts is the result of genuine accomplishment; it is not performance and cannot be faked.",
        "A difficult professional truth you must deliver today is handled with the Capricorn combination of honesty, seriousness, and genuine respect for the recipient.",
        "Your professional legacy — the structures, practices, and standards you build during your career — is a contribution that outlasts any single achievement.",
        "The Capricorn professional at their best embodies the highest standards of craft, integrity, and sustained excellence — today, you are exactly that."
      ],
      health: [
        "Capricorn rules the bones, joints, and knees — the body's structural foundation mirrors your sign's devotion to building things that last.",
        "Your health practices benefit from the same Capricorn discipline you apply to professional goals — consistent, systematic, built for the long term rather than the dramatic result.",
        "Bone and joint health is your primary physiological priority; weight-bearing exercise, calcium-rich nutrition, and appropriate supplementation are your most important long-term health investments.",
        "Your Capricorn tendency to push through physical discomfort without complaint can delay necessary medical attention; listen to your body with the same careful attention you give professional signals.",
        "Knee health deserves specific Capricorn attention — this is where accumulated physical stress often surfaces for your sign, and prevention is always preferable to recovery.",
        "The discipline to maintain health practices even when you feel well is Capricorn wisdom at its most practical; your future self is grateful for your present commitment.",
        "Your stoicism about physical discomfort is admirable and sometimes dangerous — distinguish between the discomfort of genuine effort and the signal of genuine injury.",
        "A long-term health investment — the practice you begin today that will pay compound dividends over decades — is exactly the kind of health thinking your Capricorn nature does best.",
        "Structural support for your physical framework — appropriate exercise, good posture practices, skilled bodywork — is your most important ongoing health maintenance.",
        "The mind-body connection is particularly direct for Capricorn through the skeleton; the burden you carry in your professional and personal responsibilities can settle into your bones.",
        "Your health thrives on the same conditions as your professional life — structure, consistency, and clear metrics for progress that validate continued effort.",
        "Dental and bone health, calcium absorption, and the entire structural system of your body deserve your characteristic Capricorn thoroughness and regular attention.",
        "A health protocol approached with full Capricorn seriousness — researched carefully, implemented consistently, evaluated honestly — produces exactly the long-term results you require.",
        "Rest and recovery, so often postponed by your driven Capricorn nature, are as essential as effort for the structural health of your bones and joints.",
        "The posture you carry through life literally reflects the weight of your responsibilities; bodywork, yoga, or structural alignment practices are genuinely important for your sign.",
        "Your health motivation is strongest when connected to long-term goals — strength for decades, function for a long and active life, legacy built on a sound physical foundation.",
        "Chronic physical conditions that have accumulated gradually deserve the same long-term strategic attention that your Capricorn mind applies to professional challenges.",
        "The cold and dry quality of Saturn-ruled Capricorn means your body benefits from warmth, movement, and nourishing, substantive food especially in winter months.",
        "Professional stress that you carry stoically in your body accumulates in your structural system; regular decompression practices are not luxury but maintenance.",
        "Your health discipline, when applied with the same Capricorn excellence you bring to everything, produces a physical foundation that supports a long, active, productive life.",
        "The ambition that drives your professional achievement also drives genuine health achievement when you apply it to your physical goals with equal seriousness.",
        "A health check-up or medical consultation approached with characteristic Capricorn thoroughness produces the complete information picture your practical nature requires.",
        "Your physical endurance — the ability to sustain effort over time — is one of the Capricorn body's most reliable assets; train and protect it accordingly.",
        "Tonight, give your structural system the rest it has earned — the bones and joints that carry your considerable ambitions through the world deserve genuine recovery."
      ]
    },
    Aquarius: {
      overview: [
        "Uranus, your modern ruler, activates your most innovative and unconventional thinking today — a genuinely original idea arrives that has the potential to change more than just your immediate situation.",
        "Your progressive vision for what is possible — in your own life, your community, your field — is more practically achievable than others' conventional thinking can recognize.",
        "A collective or community matter calls on your Aquarian instinct for systems thinking and your genuine commitment to fairness and human dignity.",
        "The freedom to think independently, to arrive at your own conclusions through your own reasoning, is not just a preference but a fundamental Aquarian requirement.",
        "A friendship or group connection today carries unexpectedly significant personal meaning — your Aquarian nature is nourished by genuine intellectual and ethical community.",
        "Your ability to detach from personal involvement long enough to see a situation clearly is a form of intelligence that produces solutions others cannot find.",
        "A technological, scientific, or innovative dimension of your work or life creates opportunities today that are genuinely ahead of the curve.",
        "Your natural egalitarianism — the genuine belief that every person deserves dignity and consideration — creates environments of unusual fairness and productivity.",
        "An unconventional approach to a problem that has resisted conventional solutions produces a breakthrough today that validates your Aquarian instinct for thinking differently.",
        "Your friendship network is one of your most genuine resources; an unexpected connection within it today produces something practically valuable.",
        "The future orientation of your Aquarian mind means you are often decades ahead of your time — today, someone catches up and recognizes what you already understood.",
        "Humanitarian values that guide your choices produce outcomes that serve both your immediate purposes and larger purposes simultaneously.",
        "Your intellectual independence — the refusal to accept an authority's conclusion without examining its reasoning — protects you from a significant error today.",
        "A community or organizational system you are part of benefits from your Aquarian capacity to see how its structure could be genuinely improved.",
        "Your natural comfort with the unconventional and the experimental opens a path today that more conventional thinkers could not find or follow.",
        "A scientific, technological, or innovative breakthrough in your field of interest catalyzes a new direction in your own thinking.",
        "Your authentic self — genuinely, uncompromisingly individual — is exactly what a situation requires today; do not soften your distinctiveness for anyone's comfort.",
        "The network of like-minded people you have been building, one genuine connection at a time, activates today as a genuine collective resource.",
        "Your Aquarian detachment is a superpower in situations requiring objectivity — you see what is actually happening rather than what everyone else is feeling.",
        "An idea you have been developing in isolation finds a receptive audience today; your timing is precisely right for sharing what has been forming privately.",
        "The humanitarian vision that animates your most important commitments receives confirmation today that it is both necessary and genuinely achievable.",
        "Your natural affinity for the future, the new, and the genuinely progressive creates a professional or creative advantage in contexts that reward innovation.",
        "A moment of genuine human connection — unexpected, authentic, intellectually alive — reminds you why the Aquarian investment in community is the right one.",
        "Tonight, let your remarkable mind roam freely in the territory of possibility — the Aquarian at their best is always already living in the world that is coming."
      ],
      love: [
        "Love, for Aquarius, requires genuine friendship as its foundation — the romantic partner who is also your most interesting intellectual companion is your genuine match.",
        "Your need for freedom and independence in relationships is not a character flaw but an accurate intelligence about what your Aquarian nature requires to remain fully itself.",
        "A romantic connection that surprises you with its genuine originality and intellectual aliveness is worth the Aquarian investment of real attention and openness.",
        "Single Aquarius? The person worth your unconventional heart is one who values your mind as much as your company and your freedom as much as your devotion.",
        "Your natural egalitarianism in relationships — the genuine respect you extend to a partner as a fully autonomous equal — is one of your most romantically attractive qualities.",
        "Love that includes genuine intellectual adventure — shared ideas, unexpected conversations, the discovery of new perspectives together — nourishes your Aquarian soul.",
        "Your emotional expression is more genuine than it is demonstrative; your partner benefits from understanding that Aquarian love often speaks through consistent presence and intellectual engagement.",
        "A friendship that has been developing with mutual intellectual and ethical respect has romantic potential that deserves Aquarian honest examination.",
        "Your Aquarian need for personal space and independent development is honored in a healthy relationship — assert it without apology.",
        "The unconventional relationship structure that suits your Aquarian nature better than conventional models is worth discussing honestly with a partner who deserves the truth.",
        "Love requires your Aquarian emotional presence as well as your intellectual engagement — allow yourself to be moved, touched, and genuinely affected by someone you care for.",
        "A romantic partner's genuine individuality — their distinct perspective, their particular passions, their authentic self — is what keeps your Aquarian interest fully engaged.",
        "Your humanitarian instincts extend to love; you treat romantic partners with the same dignity and consideration you extend to everyone — this is genuinely rare.",
        "A surprise in your romantic life today is exactly the kind of unexpected development that your Uranus-ruled nature finds genuinely enlivening.",
        "The Aquarian capacity for deep friendship is the greatest gift you bring to romantic relationships; the partner who understands this has found something extraordinary.",
        "Single Aquarius: your authentic self — uncompromised, genuinely individual, intellectually alive — is your most genuinely attractive quality; bring it fully to every encounter.",
        "Love for Aquarius grows through shared engagement with ideas, causes, and communities rather than through purely private romantic rituals.",
        "Your emotional boundaries in love are a genuine intelligence about what your Aquarian nature needs to remain whole; honor them while staying genuinely open.",
        "A romantic declaration today that comes from genuine feeling rather than conventional expectation carries the Aquarian authenticity that makes it completely believable.",
        "The relationship that allows both of you to remain fully yourselves — genuinely free, genuinely devoted — is the Aquarian romantic ideal made possible.",
        "Your capacity to love with both warmth and intellectual respect creates romantic bonds of unusual depth and genuine mutual appreciation.",
        "A moment of unexpected emotional openness today creates an intimacy your Aquarian detachment does not usually allow — receive it with genuine gratitude.",
        "Romantic honesty — saying what you actually think and feel rather than what is expected — is the Aquarian love language that creates the deepest trust.",
        "Tonight, appreciate the genuine originality of the love you have built — Aquarian relationships, at their best, are unlike anything else in the zodiac."
      ],
      career: [
        "Your innovative thinking produces a genuinely original professional solution today that more conventional approaches simply could not have generated.",
        "A technological, scientific, or systems-oriented professional challenge is exactly the domain where your Aquarian intelligence operates at its absolute best.",
        "Your progressive professional vision — the genuinely ahead-of-its-time approach you have been advocating — receives the receptive hearing it has deserved.",
        "A humanitarian or socially conscious dimension of professional work activates your deepest Aquarian motivation and produces your most genuinely committed professional effort.",
        "Your professional network — built on genuine intellectual and ethical respect rather than mere transactional usefulness — activates today as a real resource.",
        "The ability to think objectively about problems that emotionally engaged colleagues cannot see clearly is your most distinctive and valuable professional contribution.",
        "An unconventional professional approach that your Aquarian courage allowed you to advocate for despite skepticism produces results that validate the risk.",
        "Your professional commitment to fairness, equal treatment, and the dignity of every person in your workplace creates environments of unusual trust and productivity.",
        "A technological tool, innovative process, or creative system you implement today significantly improves professional outcomes in measurable, verifiable ways.",
        "Your natural affinity for collaborative, team-based professional structures produces better outcomes than the solo achievement model that suits more individualistic signs.",
        "The professional future you are building — genuinely innovative, ethically grounded, ahead of the curve — is closer to realization today than it has ever been.",
        "Your Aquarian detachment from professional politics allows you to make decisions based on actual merit rather than on social and emotional factors that bias others.",
        "A professional community or movement that aligns with your values and your vision creates collaborative energy that amplifies your individual professional impact.",
        "Your comfort with professional experimentation — the willingness to try genuinely new approaches without guarantee of their success — produces innovation that others cannot reach.",
        "A professional connection made today through shared intellectual or ethical interests creates a collaborative partnership of genuine and lasting professional value.",
        "Your Aquarian instinct for where your field is heading — the future rather than the present state of your profession — positions you ahead of developments that will surprise others.",
        "The professional courage to say what you actually think — honestly, respectfully, and based on genuine analysis — is one of your most valuable contributions today.",
        "A systems improvement you have been developing — a better process, a fairer policy, a more efficient structure — is ready for implementation today.",
        "Your professional authenticity — the refusal to perform a version of yourself that fits conventional professional templates — is itself a form of leadership.",
        "A collaborative professional project benefits from your Aquarian ability to integrate many different perspectives into a coherent, innovative whole.",
        "The genuinely original professional work your Aquarian mind is capable of producing is what your career has been building toward — commit fully to it.",
        "Your professional resilience after setbacks comes from the Aquarian knowledge that the future you are building is real, even when the present does not reflect it yet.",
        "A professional recognition or opportunity arrives today that acknowledges the genuine innovation and integrity you have brought to your work.",
        "The Aquarian professional at their best is a genuine pioneer — creating the professional future while others are still managing the professional present."
      ],
      health: [
        "Aquarius rules the ankles, calves, and the circulatory system — keeping blood and energy flowing freely through the body is your primary physiological health theme.",
        "Your health thrives on novelty and experimentation; the same routine every day stultifies your Aquarian nature and gradually undermines motivation and compliance.",
        "Circulatory health — keeping blood and energy moving freely — is your primary physiological priority; regular movement throughout the day is more important than single intense workouts.",
        "A genuinely innovative health approach — something ahead of conventional wisdom that your Aquarian research instincts have led you to — is worth the experimental commitment.",
        "Your ankle and lower leg health deserves specific attention; these are Aquarius's most vulnerable physical areas and benefit from targeted strengthening and mobility work.",
        "The social dimension of wellness — group fitness, community health practices, collective healing approaches — suits your Aquarian nature and dramatically improves consistency.",
        "Your intellectual approach to health — the need to understand the mechanism before accepting the practice — is genuine and should be honored rather than suppressed.",
        "Technology in health — health tracking tools, innovative therapeutic modalities, biohacking approaches — engages your Aquarian curiosity and often produces genuine results.",
        "The humanitarian dimension of health — practices that create collective wellbeing, address systemic health factors — engages your deepest Aquarian motivations.",
        "Your nervous system and circulatory system are Aquarius's physiological domains; electrical, rhythmic practices — breathwork, certain forms of meditation, yoga — are your most effective tools.",
        "Conventional health advice often works less well for genuinely unconventional Aquarian physiology; finding what actually works for your specific system requires the experimentation you naturally enjoy.",
        "Community and friendship are genuine health factors for Aquarius; social isolation creates physiological as well as psychological effects that your sign experiences acutely.",
        "Your Aquarian detachment can create a disconnection from physical body awareness; practices that bring you into genuine somatic presence counteract this tendency effectively.",
        "A health innovation you have been researching — genuinely ahead of mainstream adoption — contains accurate insights worth implementing carefully.",
        "The electrical nervous system that governs your Aquarius body benefits from practices that regulate and balance its activity — grounding, adequate sleep, stress management.",
        "Group exercise, team sports, or community wellness activities are where your Aquarian health motivation reaches its highest and most consistent expression.",
        "Your health responds well to understanding; when you genuinely understand why a practice works, your Aquarian compliance and enthusiasm are both dramatically higher.",
        "Ankle and foot health deserves Aquarian attention — these foundation points carry the weight of your considerable ambition through the world and require ongoing care.",
        "The future-orientation of your Aquarian mind can create a disconnection from present body awareness; practices that anchor you in the now are particularly therapeutic.",
        "Sleep for the hyperactive Aquarian nervous system requires genuine wind-down practices — eliminating screens and stimulating intellectual input in the final hour before sleep.",
        "Your health activism — the genuine interest in systemic changes that improve collective health — is a valuable Aquarian contribution; extend that same concern to your own health decisions.",
        "Circulation is your physiological theme; cold-water practices, movement variety, and avoiding prolonged sitting all support the healthy flow your Aquarian body requires.",
        "Your body's response to genuine community — the physiological warmth of belonging — is measurable and real; invest in relationships that create this response.",
        "Tonight, give your remarkable nervous system the genuine rest it requires — the Aquarian who properly recovers returns tomorrow with the full creative voltage of your extraordinary sign."
      ]
    },
    Pisces: {
      overview: [
        "Neptune, your ruling planet, dissolves the boundaries between the ordinary and the extraordinary today — creative inspiration, spiritual perception, and emotional attunement are all heightened.",
        "Your intuition is essentially prophetic right now; what you sense beneath the surface of situations is accurate, important, and worth following without the need for logical confirmation.",
        "Creative work of any kind flows from a place of genuine inspiration today — allow the Pisces current to carry you rather than trying to control where it is going.",
        "Your empathy and compassion today create genuine healing in someone's life — the quality of presence you offer is itself a form of medicine.",
        "The spiritual dimension of your daily life is more accessible today than usual — moments of genuine transcendence are available in ordinary circumstances.",
        "Your imagination, which has always been your most remarkable faculty, is operating at full Pisces capacity today — honor every image and impulse it delivers.",
        "A dream or waking vision carries information worth recording and reflecting on; your Pisces connection to the unconscious brings things to the surface with unusual clarity.",
        "Boundaries, so often difficult for your permeable Pisces nature, are lovingly maintained today in a way that protects your energy without closing your heart.",
        "A creative or spiritual project receives a breakthrough today that came not from effort but from the Pisces gift of genuine receptivity.",
        "Your sensitivity to atmosphere, to the emotional undercurrents in any environment, is accurate information rather than mere impression — trust it completely.",
        "The Pisces capacity for seeing the sacred in the ordinary transforms an unremarkable day into one you will remember as genuinely meaningful.",
        "Your compassion extends in all directions today — toward others, toward yourself, toward the full complexity of what it means to be human.",
        "Music, art, poetry, or any form of beauty that speaks directly to the soul is your most reliable medicine today — seek it actively.",
        "A healing process — in yourself or in someone you care for — makes significant progress today under the Neptune influence of gentle, loving attention.",
        "Your Pisces permeability, which sometimes makes you vulnerable to others' emotional states, today feels like a gift rather than a burden — you absorb the beauty of the world.",
        "The spiritual practice that nourishes you most deeply — meditation, prayer, creative contemplation, time in nature — is calling today with unusual insistence.",
        "Your natural affinity for the unseen dimensions of experience gives you access to information and insight that purely rational approaches cannot reach.",
        "A connection with someone who shares your depth of feeling and your capacity for genuine empathy creates the kind of soulful resonance your Pisces heart requires.",
        "The confusion or uncertainty you sometimes feel is not weakness but the natural state of a consciousness large enough to hold multiple simultaneous realities.",
        "Your creative vision is complete enough today to begin making it real — the Pisces who takes the inspired step into practical creation discovers that the muse follows.",
        "A spiritual or philosophical insight arrives today that deepens your understanding of your own life in a way that changes the way you see everything else.",
        "Your capacity for genuine forgiveness — of others, of circumstances, of yourself — is at its most accessible today; the release it offers is real.",
        "The dreamer in you and the person who must live in the practical world are reconciled today through a creative solution that honors both.",
        "Tonight, let the boundary between waking and dreaming become the Pisces threshold it is — the portal between the world you inhabit and the world your soul knows."
      ],
      love: [
        "Your romantic soul seeks union that transcends the ordinary — the connection where two people genuinely dissolve into something larger than themselves together.",
        "Love, for Pisces, is a spiritual experience as much as an emotional one; the partner who meets you on this level is the one your soul has been seeking.",
        "Your empathic attunement to your partner's emotional state today creates a depth of understanding that formal communication could never produce.",
        "Single Pisces? The soulmate connection your heart has always believed in is real, and it arrives when you stop looking and simply become who you genuinely are.",
        "Your romantic idealism is not naive but perceptive — the love you sense is possible exists, and you are right to refuse to settle for less than genuine depth.",
        "The boundaries your Pisces heart sometimes struggles to maintain in love are lovingly asserted today — protecting your sensitivity is an act of self-love.",
        "A romantic creative shared experience — music, art, film, poetry — creates the kind of Pisces intimacy that practical activities cannot produce.",
        "Your capacity for unconditional love is extraordinary and real; ensure that it is directed toward people who reciprocate with genuine care rather than exploiting your openness.",
        "A dream-like quality surrounds a romantic encounter today — the boundary between imagination and reality is permeable for Pisces, and both are beautiful.",
        "Your intuition about a person's genuine character beneath their social presentation is accurate; the Pisces perception sees through surfaces with unusual clarity.",
        "Love for Pisces requires a certain beauty of soul in the partner — someone whose inner life is as rich and feeling as your own.",
        "A romantic vulnerability you allow today — showing the full depth of your feeling without protective management — creates an intimacy that composure cannot.",
        "The spiritual dimension of your romantic relationships — the sense that love is sacred, that genuine connection is miraculous — is your most authentic perspective.",
        "Your compassion for a partner's suffering is genuine and healing; offer it today without losing yourself in the process.",
        "Single Pisces: your mystical romantic qualities — the depth of feeling, the intuitive attunement, the capacity for transcendent connection — are extraordinarily rare and genuinely beautiful.",
        "A long-standing romantic wound receives healing today through the Pisces gift of genuine forgiveness — of the other person and of yourself.",
        "Love expressed through creative acts — music made for someone, art created for them, poetry that reaches toward what words barely touch — is your most authentic romantic language.",
        "Your Pisces sensitivity means that love affects you more deeply and more permanently than it does most signs; choose who receives it with the corresponding care.",
        "The romantic confusion you sometimes experience is often Neptune dissolving an outdated version of what you thought you wanted, making room for what you actually need.",
        "A soulful connection with someone who genuinely understands your depth — who is not frightened by your sensitivity but moved by it — is available to you today.",
        "Your capacity for genuine romantic devotion, once focused, is one of the most extraordinary gifts in the human relational experience.",
        "Love for Pisces flows most freely when you trust your intuitive sense of who is genuinely safe to open to; that intuition is reliable today.",
        "A romantic dream you have carried for years is taking practical shape; the Pisces who brings their vision into real life creates something that moves others.",
        "Tonight, rest in the ocean of feeling that is your natural element — the Pisces heart that loves fully, deeply, and without reservation is one of the world's most rare and beautiful things."
      ],
      career: [
        "Your creative vision today operates at the intersection of inspiration and craft — the Pisces who makes their dreams practical creates art and work that genuinely moves people.",
        "A field requiring imagination, empathy, or spiritual sensitivity — healing, creative arts, psychology, spiritual work — is where your Pisces gifts produce their most extraordinary professional results.",
        "Your intuition about a professional opportunity's genuine potential is more reliable than any conventional market analysis; trust the Pisces sensing faculty.",
        "Creative work that flows from genuine inspiration rather than calculated positioning carries the Pisces authenticity that creates deep, lasting professional impact.",
        "A healing or helping professional role calls on your deepest Pisces gifts today — your capacity to genuinely serve others' wellbeing is both your calling and your greatest professional asset.",
        "Your professional imagination sees possibilities that more literal-minded colleagues cannot access — the creative breakthrough today comes from your capacity for genuine vision.",
        "The empathy you bring to understanding what clients, audiences, or colleagues actually need — beneath what they ask for — is an extraordinary professional intelligence.",
        "A professional creative project reaches a level of depth and beauty that surprises even you — Pisces at full creative flow is genuinely remarkable.",
        "Your professional intuition about the direction your field is heading — the sensing of trends before they are visible in data — is a genuinely valuable strategic gift.",
        "The spiritual or philosophical dimension of your work — the larger purpose it serves — is your most important professional motivator and your most reliable source of creative energy.",
        "A professional healing, whether of a relationship, a process, or a team dynamic, is accomplished today through your Pisces gift for compassionate, perceptive intervention.",
        "Your professional charisma is not the confident Leo variety but the magnetic Pisces kind — people are drawn to the depth and genuine care they feel in your presence.",
        "A music, film, writing, healing, or spiritual professional context is where your Pisces nature produces work that has no genuine equivalent from any other place in the zodiac.",
        "Your professional boundaries require the same care as your personal ones; the Pisces who maintains appropriate professional boundaries preserves the energy that makes exceptional work possible.",
        "An artistic or creative professional risk taken today under Neptune's inspiration produces results that more cautious approaches could never have reached.",
        "Your professional empathy — the genuine ability to feel what your audience, clients, or colleagues are experiencing — allows you to serve them at a level most professionals cannot access.",
        "The Pisces professional at their finest creates work that heals, inspires, or genuinely transforms — today, you have exactly that capacity.",
        "A professional creative collaboration with someone who shares your vision and matches your depth produces work that neither could have created alone.",
        "Your spiritual groundedness in professional challenges — the trust that the right path will become clear when you remain open and honest — is validated today.",
        "A professional recognition for genuinely inspired work arrives — not for performance but for the authentic Pisces depth that your best professional work always carries.",
        "The professional confusion that sometimes plagues Pisces resolves today into clarity about what genuinely needs your full creative investment.",
        "Your professional generosity — the willingness to give your full creative and empathic gifts without calculating the return — creates a professional reputation of genuine distinction.",
        "A professional journey that has been developing in the mysterious Pisces way — gradually, organically, without clear linear progression — reveals its coherent shape today.",
        "Tonight, honor the creative and spiritual gifts that make your professional contribution genuinely unique — the Pisces who works from their authentic depth changes the world."
      ],
      health: [
        "Pisces rules the feet and the immune system — both are the body's most permeable boundaries, mirroring your sign's emotional permeability.",
        "Your immune system is directly affected by your emotional and spiritual state — genuine wellbeing, for Pisces, is inseparable from meaningful connection and creative expression.",
        "Foot care and foot health are Pisces's primary physical priority; grounding practices that connect you through your feet to the earth are both health practice and spiritual practice.",
        "Your permeable sensitivity means that toxic environments, relationships, and substances affect your Pisces physiology more intensely than they affect less sensitive signs.",
        "Water is your native element and your most powerful healing medium — swimming, baths, proximity to water bodies — is medicine for your Pisces body and soul.",
        "Sleep for Pisces is not just rest but the nightly journey into the inner world your sign requires for genuine renewal — honor it with appropriate time and ritual.",
        "Your immune system is both your physical and your energetic boundary system; practices that strengthen genuine boundaries — physical and emotional — directly support your health.",
        "The feet that connect your dreamy Pisces nature to the physical earth deserve specific care — regular massage, appropriate footwear, grounding barefoot practices.",
        "A health challenge that has been resisting conventional approaches may respond better to a more holistic, integrative, or spiritually-oriented treatment approach.",
        "Your emotional sensitivity is not a health liability when you have appropriate boundaries and genuine self-care practices — it is a sophisticated biological early-warning system.",
        "Alcohol and substances interact with your Pisces physiology with unusual intensity — the Neptune-ruled constitution is both more susceptible to and more harmed by their effects.",
        "Creative expression as health practice is not metaphorical for Pisces but genuinely physiological — making art, music, or poetry releases emotional material that suppression stores in the body.",
        "Your spiritual practices — meditation, prayer, contemplative time in nature — are among your most powerful health tools, not separate from but integral to your physical wellbeing.",
        "The boundary between your own feelings and others' feelings requires Pisces health attention; absorbing emotional states that are not yours creates a specific kind of energetic depletion.",
        "Healing practices of all kinds — energy work, somatic therapy, acupuncture, expressive arts therapy — resonate with Pisces physiology in particularly effective ways.",
        "Your natural tendency toward self-dissolution — merging with others, losing boundaries — requires conscious counterbalancing through grounding, solitude, and self-definition.",
        "The lymphatic system, the blood, and the immune system — all boundaries and circulatory pathways — are Pisces's physiological domains and deserve attentive care.",
        "A health intuition you have been dismissing as imagination is accurate — your Pisces body knows things your analytical mind has not yet processed.",
        "Rest in beauty — genuinely aesthetically nourishing environments, music, art — is not indulgence for Pisces but a genuine physiological requirement.",
        "Your sleep dreams are carrying health information that deserves your Pisces attention; the recurring images or physical sensations in your dreams are often literal body messages.",
        "The spiritual selfcare of your Pisces nature — time alone, in nature, in beauty, in silence — is as essential as any physical health practice.",
        "Substance sensitivity makes Pisces the sign most benefited by clean, minimal, whole food and most harmed by processed, chemical-laden nutrition.",
        "A gentle, compassionate approach to your own health journey — the Pisces practice of self-love without judgment — is more effective than harsh discipline for your sensitive nature.",
        "Tonight, let yourself dissolve into the healing ocean of genuine rest — the Pisces who surrenders completely to sleep enters the most profound renewal available to any sign."
      ]
    }
  });

  var readings = allReadings[sign];
  if (!readings) {
    // Fall through to IIFE version for any remaining signs
    return (window.Interpretations && window.Interpretations.getDailyHoroscope)
      ? window.Interpretations.getDailyHoroscope(sign, date)
      : null;
  }

  var overview = readings.overview[Math.abs(seed)      % readings.overview.length];
  var love     = readings.love[Math.abs(seed + 7)      % readings.love.length];
  var career   = readings.career[Math.abs(seed + 13)   % readings.career.length];
  var health   = readings.health[Math.abs(seed + 17)   % readings.health.length];

  var luckyColors = {
    Aries:       [{name:'Crimson Red',hex:'#DC143C'},{name:'Flame Orange',hex:'#FF4500'},{name:'Scarlet',hex:'#FF2400'},{name:'Hot Pink',hex:'#FF69B4'},{name:'Bright Red',hex:'#FF0000'},{name:'Tangerine',hex:'#FF8200'},{name:'Coral',hex:'#FF6B6B'},{name:'Ruby',hex:'#9B111E'},{name:'Vermillion',hex:'#E34234'},{name:'Fire Red',hex:'#CE2029'},{name:'Burnt Orange',hex:'#CC5500'},{name:'Magenta',hex:'#FF00FF'}],
    Taurus:      [{name:'Forest Green',hex:'#228B22'},{name:'Sage Green',hex:'#8FBC8F'},{name:'Rose Pink',hex:'#FF66B2'},{name:'Earth Brown',hex:'#8B4513'},{name:'Dusty Rose',hex:'#DCAE96'},{name:'Olive Green',hex:'#808000'},{name:'Terracotta',hex:'#E2725B'},{name:'Moss Green',hex:'#8A9A5B'},{name:'Copper',hex:'#B87333'},{name:'Warm Cream',hex:'#FFFDD0'},{name:'Burnt Sienna',hex:'#E97451'},{name:'Pale Gold',hex:'#EAE0C8'}],
    Gemini:      [{name:'Bright Yellow',hex:'#FFD700'},{name:'Electric Blue',hex:'#7DF9FF'},{name:'Lime Green',hex:'#32CD32'},{name:'Silver',hex:'#C0C0C0'},{name:'Periwinkle',hex:'#CCCCFF'},{name:'Lemon',hex:'#FFF44F'},{name:'Cyan',hex:'#00FFFF'},{name:'Light Orange',hex:'#FFB347'},{name:'Mint',hex:'#98FF98'},{name:'Lavender Blue',hex:'#8C92AC'},{name:'Pale Yellow',hex:'#FFFF99'},{name:'Sky Blue',hex:'#87CEEB'}],
    Cancer:      [{name:'Silver',hex:'#C0C0C0'},{name:'Pearl White',hex:'#F0EAD6'},{name:'Sea Blue',hex:'#006994'},{name:'Moonstone White',hex:'#E8E8E8'},{name:'Soft Teal',hex:'#5F9EA0'},{name:'Cream',hex:'#FFFDD0'},{name:'Pale Blue',hex:'#ADD8E6'},{name:'Seafoam',hex:'#9FE2BF'},{name:'Opal',hex:'#A8C5DA'},{name:'Misty Rose',hex:'#FFE4E1'},{name:'Aqua',hex:'#00FFFF'},{name:'Ice Blue',hex:'#D6E8EE'}],
    Leo:         [{name:'Gold',hex:'#FFD700'},{name:'Royal Orange',hex:'#F97B0E'},{name:'Sunflower Yellow',hex:'#FFDA00'},{name:'Amber',hex:'#FFBF00'},{name:'Bronze',hex:'#CD7F32'},{name:'Bright Gold',hex:'#FCC200'},{name:'Lion Brown',hex:'#C68642'},{name:'Copper Gold',hex:'#CB6D51'},{name:'Marigold',hex:'#EAA221'},{name:'Burnished Gold',hex:'#D4AF37'},{name:'Saffron',hex:'#F4C430'},{name:'Rich Crimson',hex:'#C90016'}],
    Virgo:       [{name:'Navy Blue',hex:'#000080'},{name:'Forest Green',hex:'#228B22'},{name:'Warm Gray',hex:'#808069'},{name:'Earth Tan',hex:'#D2B48C'},{name:'Sage',hex:'#B2AC88'},{name:'Deep Teal',hex:'#008080'},{name:'Wheat',hex:'#F5DEB3'},{name:'Slate Blue',hex:'#6A5ACD'},{name:'Moss',hex:'#8A9A5B'},{name:'Dusty Blue',hex:'#759DBE'},{name:'Khaki',hex:'#C3B091'},{name:'Pine Green',hex:'#01796F'}],
    Libra:       [{name:'Soft Pink',hex:'#FFB6C1'},{name:'Powder Blue',hex:'#B0E0E6'},{name:'Lavender',hex:'#E6E6FA'},{name:'Rose',hex:'#FF007F'},{name:'Baby Blue',hex:'#89CFF0'},{name:'Blush',hex:'#DE5D83'},{name:'Pale Lilac',hex:'#DCD0FF'},{name:'Dusty Rose',hex:'#DCAE96'},{name:'Periwinkle',hex:'#CCCCFF'},{name:'Champagne',hex:'#FAD6A5'},{name:'Soft Coral',hex:'#F88379'},{name:'Mauve',hex:'#E0B0FF'}],
    Scorpio:     [{name:'Deep Burgundy',hex:'#800020'},{name:'Black',hex:'#1C1C1C'},{name:'Dark Red',hex:'#8B0000'},{name:'Maroon',hex:'#800000'},{name:'Midnight Blue',hex:'#191970'},{name:'Obsidian',hex:'#3D3635'},{name:'Deep Plum',hex:'#4B0082'},{name:'Garnet',hex:'#6B1A1A'},{name:'Blood Orange',hex:'#D1340A'},{name:'Dark Forest',hex:'#1B4332'},{name:'Charcoal',hex:'#36454F'},{name:'Crimson',hex:'#DC143C'}],
    Sagittarius: [{name:'Purple',hex:'#800080'},{name:'Royal Blue',hex:'#4169E1'},{name:'Turquoise',hex:'#40E0D0'},{name:'Bright Purple',hex:'#9400D3'},{name:'Cobalt Blue',hex:'#0047AB'},{name:'Violet',hex:'#EE82EE'},{name:'Indigo',hex:'#4B0082'},{name:'Electric Purple',hex:'#BF00FF'},{name:'Cerulean',hex:'#007BA7'},{name:'Magenta',hex:'#FF00FF'},{name:'Deep Sky Blue',hex:'#00BFFF'},{name:'Amethyst',hex:'#9966CC'}],
    Capricorn:   [{name:'Charcoal',hex:'#36454F'},{name:'Dark Brown',hex:'#654321'},{name:'Forest Green',hex:'#228B22'},{name:'Steel Gray',hex:'#71797E'},{name:'Chocolate',hex:'#7B3F00'},{name:'Slate',hex:'#708090'},{name:'Dark Olive',hex:'#556B2F'},{name:'Espresso',hex:'#3C2218'},{name:'Hunter Green',hex:'#355E3B'},{name:'Gunmetal',hex:'#2C3539'},{name:'Sepia',hex:'#704214'},{name:'Moss Green',hex:'#8A9A5B'}],
    Aquarius:    [{name:'Electric Blue',hex:'#7DF9FF'},{name:'Turquoise',hex:'#40E0D0'},{name:'Neon Blue',hex:'#1F51FF'},{name:'Aquamarine',hex:'#7FFFD4'},{name:'Violet',hex:'#EE82EE'},{name:'Cerulean',hex:'#007BA7'},{name:'Teal',hex:'#008080'},{name:'Sky Blue',hex:'#87CEEB'},{name:'Azure',hex:'#F0FFFF'},{name:'Sapphire',hex:'#0F52BA'},{name:'Cyan',hex:'#00FFFF'},{name:'Periwinkle',hex:'#CCCCFF'}],
    Pisces:      [{name:'Sea Green',hex:'#2E8B57'},{name:'Aqua',hex:'#00FFFF'},{name:'Lavender',hex:'#E6E6FA'},{name:'Seafoam',hex:'#9FE2BF'},{name:'Soft Purple',hex:'#9B59B6'},{name:'Pale Blue',hex:'#ADD8E6'},{name:'Mint',hex:'#98FF98'},{name:'Lilac',hex:'#C8A2C8'},{name:'Pearl',hex:'#EAE0C8'},{name:'Turquoise',hex:'#40E0D0'},{name:'Misty Blue',hex:'#B0C4DE'},{name:'Violet',hex:'#EE82EE'}]
  };

  var colorArr = luckyColors[sign] || [{name:'Celestial Gold',hex:'#FFD700'},{name:'Midnight Blue',hex:'#191970'},{name:'Amethyst Purple',hex:'#9B59B6'},{name:'Emerald Green',hex:'#2ECC71'},{name:'Ruby Red',hex:'#9B111E'},{name:'Pearl White',hex:'#FDEBD0'},{name:'Sapphire Blue',hex:'#2980B9'},{name:'Rose Gold',hex:'#B76E79'},{name:'Obsidian Black',hex:'#1C1C1C'},{name:'Copper',hex:'#B87333'},{name:'Lavender',hex:'#E6E6FA'},{name:'Turquoise',hex:'#40E0D0'}];
  var colorIndex = Math.abs((seed * 7)) % colorArr.length;
  var luckyColorData = colorArr[colorIndex];
  var luckyNumber = (Math.abs(seed * 13 + signIndex * 7) % 99) + 1;

  return {
    sign: sign,
    date: d.toLocaleDateString('en-US', {weekday:'long', year:'numeric', month:'long', day:'numeric'}),
    overview: overview,
    love: love,
    career: career,
    health: health,
    luckyNumber: luckyNumber,
    luckyColor: luckyColorData.name,
    luckyColorHex: luckyColorData.hex
  };
}

// ── SECTION 3: analyzeChartDetailed helper ────────────────────────────────
// Standalone wrapper that calls the main analyzeChart but adds ASPECTS lookup
function analyzeChartDetailed(chartData) {
  const result = analyzeChart(chartData);
  if (!chartData || !chartData.aspects) return result;

  const aspectNarratives = [];
  (chartData.aspects || []).forEach(function(asp) {
    const key = `${asp.planet1}${asp.planet2}_${asp.aspect}`;
    const reverseKey = `${asp.planet2}${asp.planet1}_${asp.aspect}`;
    const interp = ASPECTS[key] || ASPECTS[reverseKey];
    if (interp) {
      aspectNarratives.push({ planets: `${asp.planet1}-${asp.planet2}`, aspect: asp.aspect, interpretation: interp });
    }
  });
  result.aspects = aspectNarratives;
  return result;
}
// ── SECTION 4: calculateCompatibility function ────────────────────────────
function calculateCompatibility(chart1, chart2) {
  // Returns: {overall, love, communication, values, longTerm, passion, synastryAspects[], overview}
  // All scores 0-100
  if (!chart1 || !chart2) {
    return { overall:50, love:50, communication:50, values:50, longTerm:50, passion:50, synastryAspects:[], overview:'Insufficient chart data.' };
  }

  const ELEMENT_MAP = {
    Aries:'fire', Leo:'fire', Sagittarius:'fire',
    Taurus:'earth', Virgo:'earth', Capricorn:'earth',
    Gemini:'air', Libra:'air', Aquarius:'air',
    Cancer:'water', Scorpio:'water', Pisces:'water'
  };

  const MODALITY_MAP = {
    Aries:'cardinal', Cancer:'cardinal', Libra:'cardinal', Capricorn:'cardinal',
    Taurus:'fixed', Leo:'fixed', Scorpio:'fixed', Aquarius:'fixed',
    Gemini:'mutable', Virgo:'mutable', Sagittarius:'mutable', Pisces:'mutable'
  };

  // Element compatibility base scores
  const ELEMENT_COMPAT = {
    'fire_air':88, 'air_fire':88,
    'earth_water':87, 'water_earth':87,
    'fire_fire':75, 'earth_earth':78,
    'air_air':74, 'water_water':76,
    'fire_earth':57, 'earth_fire':57,
    'fire_water':52, 'water_fire':52,
    'air_water':58, 'water_air':58,
    'earth_air':62, 'air_earth':62
  };

  function getElementScore(sign1, sign2) {
    const e1 = ELEMENT_MAP[sign1] || 'fire';
    const e2 = ELEMENT_MAP[sign2] || 'fire';
    return ELEMENT_COMPAT[`${e1}_${e2}`] || 65;
  }

  function getModalityBonus(sign1, sign2) {
    const m1 = MODALITY_MAP[sign1];
    const m2 = MODALITY_MAP[sign2];
    if (m1 === m2) return -3;  // same modality can be competitive
    if ((m1 === 'cardinal' && m2 === 'mutable') || (m1 === 'mutable' && m2 === 'cardinal')) return 4;
    if ((m1 === 'fixed' && m2 === 'mutable') || (m1 === 'mutable' && m2 === 'fixed')) return 5;
    return 2;
  }

  const sign1 = chart1.sunSign || 'Aries';
  const sign2 = chart2.sunSign || 'Aries';
  const moon1 = chart1.moonSign || sign1;
  const moon2 = chart2.moonSign || sign2;
  const venus1 = chart1.venusSign || sign1;
  const venus2 = chart2.venusSign || sign2;
  const mars1 = chart1.marsSign || sign1;
  const mars2 = chart2.marsSign || sign2;
  const mercury1 = chart1.mercurySign || sign1;
  const mercury2 = chart2.mercurySign || sign2;
  const rising1 = chart1.rising || sign1;
  const rising2 = chart2.rising || sign2;

  // Sun-Sun compatibility (35% weight)
  const sunScore = getElementScore(sign1, sign2) + getModalityBonus(sign1, sign2);

  // Moon-Moon compatibility (30% weight)
  let moonScore = getElementScore(moon1, moon2);
  if (moon1 === moon2) moonScore += 15;
  else if (ELEMENT_MAP[moon1] === ELEMENT_MAP[moon2]) moonScore += 10;
  else moonScore += getModalityBonus(moon1, moon2);

  // Venus compatibility (20% weight)
  let venusScore = getElementScore(venus1, venus2);
  if (venus1 === venus2) venusScore += 12;
  // Venus-Mars cross-compatibility bonus
  const venusMars12 = getElementScore(venus1, mars2);
  const venusMars21 = getElementScore(venus2, mars1);
  const passionBase = Math.round((venusMars12 + venusMars21) / 2);

  // Communication (Mercury)
  const mercuryScore = getElementScore(mercury1, mercury2) + getModalityBonus(mercury1, mercury2);

  // Rising compatibility
  const risingScore = getElementScore(rising1, rising2);

  // Weighted overall
  const rawOverall = (sunScore * 0.35) + (moonScore * 0.30) + (venusScore * 0.20) + (mercuryScore * 0.15);

  // Deterministic variance based on sign combination
  const seedStr = sign1 + sign2 + moon1 + moon2;
  let hashSeed = 0;
  for (let i = 0; i < seedStr.length; i++) hashSeed = (hashSeed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const variance = ((hashSeed % 11) - 5);

  function clamp(v) { return Math.min(97, Math.max(20, Math.round(v))); }

  const overall      = clamp(rawOverall + variance);
  const love         = clamp((venusScore + getElementScore(venus1, mars2) + getElementScore(venus2, mars1)) / 3 + variance * 0.8);
  const communication= clamp(mercuryScore + getElementScore(sign1, sign2) * 0.3 + variance);
  const values       = clamp((moonScore + getElementScore(sign1, sign2)) / 2 + variance * 0.5);
  const longTerm     = clamp((sunScore * 0.4 + moonScore * 0.4 + risingScore * 0.2) + variance * 0.7);
  const passion      = clamp(passionBase + venusScore * 0.3 + variance * 1.2);

  // Synastry aspects
  const synastryAspects = [];
  const ASPECT_DEFS = [
    {name:'conjunction', angle:0, orb:8},
    {name:'sextile', angle:60, orb:4},
    {name:'square', angle:90, orb:6},
    {name:'trine', angle:120, orb:6},
    {name:'opposition', angle:180, orb:8}
  ];

  const SIGN_DEGREES = {
    Aries:0, Taurus:30, Gemini:60, Cancer:90, Leo:120, Virgo:150,
    Libra:180, Scorpio:210, Sagittarius:240, Capricorn:270, Aquarius:300, Pisces:330
  };

  const p1Placements = {
    Sun: chart1.sunSign, Moon: chart1.moonSign, Venus: chart1.venusSign,
    Mars: chart1.marsSign, Mercury: chart1.mercurySign
  };
  const p2Placements = {
    Sun: chart2.sunSign, Moon: chart2.moonSign, Venus: chart2.venusSign,
    Mars: chart2.marsSign, Mercury: chart2.mercurySign
  };

  const SYNASTRY_INTERPS = {
    'Sun_trine_Sun': 'Your solar energies harmonize naturally — you share a fundamental orientation toward life that makes cooperation feel effortless.',
    'Sun_opposition_Sun': 'Your solar energies are opposite but complementary — you can balance and complete each other when you recognize the polarity as a gift.',
    'Sun_square_Sun': 'Your solar energies create productive friction — you challenge each other to grow beyond your individual comfort zones.',
    'Sun_conjunction_Sun': 'Identical solar energies create strong recognition and shared purpose, though you may lack the polarity that keeps relationships dynamic.',
    'Moon_trine_Moon': 'Your emotional natures harmonize beautifully — you instinctively understand each other\'s feelings and needs.',
    'Moon_conjunction_Moon': 'Your emotional natures are almost identical — deep mutual understanding and extraordinary emotional attunement characterize your bond.',
    'Moon_opposition_Moon': 'Your emotional needs are complementary opposites — each of you provides what the other instinctively seeks.',
    'Moon_square_Moon': 'Your emotional needs create tension that requires conscious work — but this work deepens both of you significantly.',
    'Venus_trine_Venus': 'Your aesthetic sensibilities and love natures harmonize naturally — shared pleasures, beauty, and affectionate styles align beautifully.',
    'Venus_conjunction_Venus': 'Your values and love natures are closely aligned — you want the same things from love and express affection in similar ways.',
    'Venus_trine_Mars': 'Attraction and love flow easily between you — the spark between your Venus and Mars creates natural romantic chemistry.',
    'Venus_opposition_Mars': 'Powerful magnetic attraction characterizes your bond — the polarity between your Venus and Mars creates intense romantic and sexual energy.',
    'Venus_square_Mars': 'Passionate tension and creative conflict characterize your romantic connection — the square produces heat that can be either productive or consuming.',
    'Sun_trine_Moon': 'A harmonious connection between will and feeling — one person\'s solar confidence supports the other\'s emotional needs naturally.',
    'Sun_conjunction_Moon': 'A deeply personal connection — one person\'s solar identity resonates profoundly with the other\'s emotional nature.',
    'Mercury_trine_Mercury': 'Effortless communication and intellectual understanding — you think similarly and find each other\'s minds naturally engaging.',
    'Mercury_sextile_Mercury': 'Good communication and complementary thinking styles create productive intellectual exchange.',
    'Mercury_square_Mercury': 'Your communication styles create friction that, when worked through, produces much clearer and more honest exchange.',
    'default': 'This planetary connection between your charts adds a layer of interaction that both challenges and enriches your connection.'
  };

  for (const [p1name, p1sign] of Object.entries(p1Placements)) {
    for (const [p2name, p2sign] of Object.entries(p2Placements)) {
      if (!p1sign || !p2sign) continue;
      const deg1 = SIGN_DEGREES[p1sign] + 15;  // use midpoint of sign
      const deg2 = SIGN_DEGREES[p2sign] + 15;
      const rawDiff = Math.abs(deg1 - deg2);
      const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;

      for (const {name, angle, orb} of ASPECT_DEFS) {
        const orbActual = Math.abs(diff - angle);
        if (orbActual <= orb) {
          const key = `${p1name}_${name}_${p2name}`;
          const reverseKey = `${p2name}_${name}_${p1name}`;
          const interp = SYNASTRY_INTERPS[key] || SYNASTRY_INTERPS[reverseKey] || SYNASTRY_INTERPS['default'];
          synastryAspects.push({
            planet1: p1name, planet2: p2name, aspect: name,
            orb: orbActual.toFixed(1),
            harmony: name === 'trine' || name === 'sextile' || name === 'conjunction' ? 'harmonious' : 'dynamic',
            interpretation: `${p1name} ${name} ${p2name}: ${interp}`
          });
          break;
        }
      }
    }
  }

  const COMPAT_NARRATIVES = {
    'fire_air': 'Your fire-air combination creates natural inspiration and excitement — you fan each other\'s flames and keep the energy intellectually alive.',
    'earth_water': 'Your earth-water bond creates natural nourishment — you provide practical grounding for each other\'s emotional depth.',
    'fire_fire': 'Two fire signs create passionate intensity and mutual inspiration, but you must ensure you don\'t compete for the spotlight.',
    'earth_earth': 'Two earth signs create lasting stability and shared practical values — your bond is built to endure through consistent, quiet loyalty.',
    'air_air': 'Two air signs create a richly intellectual bond full of stimulating conversation, though you may both need help staying emotionally grounded.',
    'water_water': 'Two water signs create profound emotional attunement and deep intuitive understanding — your bond runs beneath the surface.',
    'fire_earth': 'Fire and earth create a complementary tension — one provides spark, the other provides substance, and learning each other\'s pace is the key.',
    'fire_water': 'Fire and water create passionate but challenging chemistry — your natures are fundamentally different in ways that both attract and frustrate.',
    'air_water': 'Air and water create an interesting tension between thought and feeling — you each offer what the other sometimes lacks.',
    'earth_air': 'Earth and air combine practical intelligence with conceptual insight — you work well together when you respect each other\'s different orientations.'
  };

  const elem1 = ELEMENT_MAP[sign1] || 'fire';
  const elem2 = ELEMENT_MAP[sign2] || 'fire';
  const narrativeKey = `${elem1}_${elem2}`;
  const baseNarrative = COMPAT_NARRATIVES[narrativeKey] || COMPAT_NARRATIVES[`${elem2}_${elem1}`] || 'Your combination creates a unique dynamic with both complementary gifts and growth-inducing challenges.';

  const moonNarrative = moon1 === moon2
    ? `Your Moon signs are identical — you share an almost telepathic emotional understanding.`
    : ELEMENT_MAP[moon1] === ELEMENT_MAP[moon2]
    ? `Your Moon signs share the same element, giving you natural emotional attunement despite individual differences.`
    : `Your Moon signs come from different elements, meaning you will need to learn each other\'s emotional languages — a rewarding journey.`;

  const overview = `${sign1} and ${sign2} — ${baseNarrative} ${moonNarrative} Overall compatibility of ${overall}% reflects both your natural resonance and the specific growth opportunities this pairing offers. ${overall >= 80 ? 'This is a highly compatible combination with natural ease and mutual understanding.' : overall >= 65 ? 'This combination has genuine potential that develops through mutual understanding and respect.' : 'This combination requires conscious effort and genuine appreciation of your differences, but these differences can be your greatest teachers.'}`;

  return { overall, love, communication, values, longTerm, passion, synastryAspects, overview };
}

// ── SECTION 5: getTransitAspects function ────────────────────────────────
function getTransitAspects(natalChart, transitPositions) {
  if (!natalChart || !transitPositions) return [];

  const TRANSIT_INTERPRETATIONS = {
    // JUPITER TRANSITS
    'Jupiter_Sun': "Jupiter transiting your natal Sun activates a significant period of growth, opportunity, and expanding confidence. Your sense of identity expands, and you tend to attract recognition, opportunity, and good fortune almost effortlessly during this period. Use this window to take bold steps toward your most meaningful goals — Jupiter's benefic energy amplifies whatever you put genuine effort into.",
    'Jupiter_Moon': "Jupiter transiting your natal Moon brings emotional expansion, increased warmth, and a period of genuine contentment. Family relationships tend to improve, domestic life flourishes, and your emotional generosity attracts people and situations that nourish you. This is an excellent time for anything related to home, family, or emotional healing.",
    'Jupiter_Mercury': "Jupiter transiting your natal Mercury expands your mental horizons significantly — thinking becomes more philosophical, communications are persuasive and well-received, and learning opportunities arrive in abundance. This is an excellent time for writing, publishing, study, travel, and any communication-heavy professional endeavors.",
    'Jupiter_Venus': "Jupiter transiting your natal Venus is one of the most fortunate love and financial transits available — your charm and magnetism expand, romantic opportunities multiply, and financial abundance tends to follow your increased confidence. Relationships deepen and new connections form with unusual ease and genuine warmth.",
    'Jupiter_Mars': "Jupiter transiting your natal Mars amplifies your energy, courage, and drive to an exceptional degree. Ambitious projects receive the sustained energy they require, physical vitality is high, and the confidence to act boldly on your best instincts is readily available. This is an excellent time for launching new initiatives and pursuing long-deferred goals.",
    'Jupiter_Jupiter': "Jupiter returning to its natal position — the Jupiter Return — marks a significant milestone of approximately twelve years. This is a major period of life expansion, philosophical renewal, and the beginning of a new twelve-year cycle of growth. Review what you have learned and accomplished, and set intentions for the new cycle with genuine ambition.",
    'Jupiter_Saturn': "Jupiter transiting your natal Saturn brings a welcome period of optimism and opportunity to areas where you have been working hard with discipline and patience. Long-standing efforts begin to pay off, and the structures you have been building receive the recognition and expansion that your sustained effort deserves. Balance expansion with the Saturnian wisdom of sustainable growth.",

    // SATURN TRANSITS
    'Saturn_Sun': "Saturn transiting your natal Sun is a significant period of testing, restructuring, and the building of genuine authority. You may feel that the world demands more from you than usual, that obstacles are more numerous, and that your usual confidence requires more effort to sustain. This transit, however difficult, builds the specific capabilities that your next level of development requires — what you construct now will last.",
    'Saturn_Moon': "Saturn transiting your natal Moon creates a period of emotional sobriety, increased responsibility, and the challenge of balancing your own needs with the demands of others. Emotional patterns from the past surface for examination and revision. This transit builds emotional maturity and the capacity for deeply committed, responsible relationships — the work is real, and so are the results.",
    'Saturn_Mercury': "Saturn transiting your natal Mercury demands precision, sustained mental focus, and the discipline to develop genuine expertise rather than broad knowledge. Communication slows down, but what you do communicate carries more weight and authority. This is an excellent transit for writing a book, mastering a technical skill, or developing an area of genuine intellectual depth.",
    'Saturn_Venus': "Saturn transiting your natal Venus brings a period of testing in relationships and finances — you may experience greater seriousness, responsibility, or limitation in these areas. The relationships that survive this transit are the ones built on genuine mutual respect and shared values rather than convenience or attraction alone. Financial discipline practiced now produces excellent long-term results.",
    'Saturn_Mars': "Saturn transiting your natal Mars creates a period of significant friction between your drive to act and the demands for patience, preparation, and strategic delay. Your energy may feel blocked or frustrating, but this restraint is building the capacity for disciplined, precisely timed action that impulsive Mars energy alone cannot achieve. Mastery of this transit is the difference between force and power.",
    'Saturn_Jupiter': "Saturn transiting your natal Jupiter brings your optimistic visions into contact with practical reality — this is the transit that separates workable ideas from wish-fulfillment. Projects that have real substance are refined and strengthened; those built on unrealistic assumptions require honest revision. The result of this disciplined engagement with your vision is a more achievable, more durable version of your dreams.",
    'Saturn_Saturn': "The Saturn opposition (around age 44) and Saturn Return (around ages 29 and 58) are among the most significant transits in the astrological calendar. These are periods of major life reassessment, restructuring of identity and purpose, and the confrontation with questions about whether your current life reflects your genuine values and authentic ambitions. What you build now — in integrity and genuine commitment — is what lasts.",

    // URANUS TRANSITS
    'Uranus_Sun': "Uranus transiting your natal Sun brings a period of radical change in your sense of identity and life direction — the authentic self that has been compressed or unexpressed in your current life structure now demands freedom and genuine expression. Disruptions to your established path are not disasters but liberations, even when they feel destabilizing. Flexibility, openness, and genuine self-honesty are your best navigational tools.",
    'Uranus_Moon': "Uranus transiting your natal Moon creates sudden and often unexpected shifts in your emotional landscape, domestic situation, or relationship to family. What you feel, what you need, and how you define home and belonging may shift dramatically. Your emotional independence and the freedom to be authentically yourself in your most intimate relationships becomes a non-negotiable priority.",
    'Uranus_Mercury': "Uranus transiting your natal Mercury produces sudden intellectual breakthroughs, radical shifts in how you think, and the arrival of unconventional ideas that disrupt your previous mental frameworks. Genius-level insights are available, but so is mental erraticism — ground your most inspired thinking before acting on it. Technology, science, and innovative communication are especially activated.",
    'Uranus_Venus': "Uranus transiting your natal Venus brings sudden and unexpected changes in your love life, financial situation, or aesthetic values. Relationships that no longer serve your authentic freedom may end abruptly; new connections form with electric suddenness and genuine originality. Your values are undergoing a radical update, and this process is ultimately liberating even when it feels destabilizing.",
    'Uranus_Mars': "Uranus transiting your natal Mars creates explosive bursts of energy, sudden changes in direction, and the restless need for freedom and originality in how you pursue your goals. You may feel an urgent need to break free from any situation that feels confining or inauthentic. Channel this revolutionary energy into genuine innovation rather than mere disruption.",
    'Uranus_Jupiter': "Uranus transiting your natal Jupiter brings sudden, unexpected opportunities for major expansion — breakthroughs in business, education, philosophical understanding, or geographical movement arrive with surprising speed. This is an exceptionally inventive period where your most original ideas receive genuine support. Stay alert and agile, as the opportunities may not announce themselves in advance.",
    'Uranus_Saturn': "Uranus transiting your natal Saturn creates a fundamental tension between your established structures and the revolutionary forces of change. Rigid systems, outdated rules, and structures maintained by habit rather than genuine value come under pressure. This transit invites you to distinguish between structures worth preserving and those that have outlived their purpose — liberating in the long run, though potentially disruptive in the process.",

    // NEPTUNE TRANSITS
    'Neptune_Sun': "Neptune transiting your natal Sun is one of the most spiritually significant and potentially confusing transits in the astrological lexicon. Your sense of ego and personal identity becomes more fluid, permeable, and spiritually open — which can be experienced as profound inspiration and heightened compassion, or as confusion, disillusionment, and loss of direction. Spiritual practice, creative work, and honest self-examination are essential navigational tools.",
    'Neptune_Moon': "Neptune transiting your natal Moon heightens your intuition, empathy, and psychic sensitivity to extraordinary levels, while also creating vulnerability to emotional confusion, boundary dissolution, and the projection of your own feelings onto others. Dreams are vivid and often prophetically relevant. Spiritual and creative work flourish under this influence, while practical matters may feel unusually difficult to navigate clearly.",
    'Neptune_Mercury': "Neptune transiting your natal Mercury creates a period of heightened creative and intuitive thinking alongside potential confusion about facts, schedules, and practical details. Your imagination is exceptional and your poetic, symbolic, and spiritual thinking is at its most productive. Poetry, music, visionary writing, and any work requiring access to the unconscious mind is strongly supported. Ground yourself in practical details to avoid significant errors.",
    'Neptune_Venus': "Neptune transiting your natal Venus brings a period of idealized, spiritualized, and sometimes confused love experiences. Romantic relationships may seem magical and otherworldly, or may involve illusion, deception, or the painful collision of an ideal with reality. Creative and artistic work, however, is genuinely inspired. The transit's gift is expanded compassion, spiritual love, and the dissolution of barriers between self and other.",
    'Neptune_Mars': "Neptune transiting your natal Mars gradually dissolves the clarity and directness of your drive — you may find that your usual confidence in action gives way to confusion about what you want, passive-aggressive patterns, or the spiritual aspiration to act from selfless motives rather than ego-driven desire. This transit produces spiritual warriors and inspired artists when its subtler gifts are engaged consciously.",
    'Neptune_Jupiter': "Neptune transiting your natal Jupiter creates a period of spiritual expansion, mystical seeking, and the desire for transcendence and ultimate meaning. This can be a profoundly inspiring period of religious or spiritual development, creative vision, and compassionate service. The shadow of this transit is spiritual grandiosity, impractical idealism, or the flight into fantasy as a substitute for genuine development.",
    'Neptune_Saturn': "Neptune transiting your natal Saturn gently dissolves the rigid structures and limiting beliefs that Saturn has solidified in your life. Responsibilities that no longer serve your genuine purpose fade away, rigid self-definitions become more fluid, and the spiritual dimensions of your practical life become increasingly visible. This transit invites you to rebuild your structures on genuinely spiritual and compassionate foundations.",

    // PLUTO TRANSITS
    'Pluto_Sun': "Pluto transiting your natal Sun is one of the most profound transformations available to a human life — the entire structure of your identity is dismantled at a level deeper than ego, rebuilt, and ultimately regenerated into something more authentic, more powerful, and more aligned with your soul's genuine purpose. This transit is intense, often feels like a death of the self you were, and is among the most significant of the major life events astrology maps.",
    'Pluto_Moon': "Pluto transiting your natal Moon brings the most profound emotional transformation available — unconscious patterns, ancestral wounds, deeply buried emotional material, and the foundations of your psychological security all come into the light of Plutonian truth. The process is intense, sometimes overwhelming, but ultimately regenerative — you emerge with an emotional depth, resilience, and authenticity that cannot be acquired any other way.",
    'Pluto_Mercury': "Pluto transiting your natal Mercury transforms your thinking at the most fundamental level — you begin to perceive the hidden structures beneath surface realities, to think in terms of power and depth rather than surface information, and to communicate with a penetrating intensity that others find both illuminating and occasionally uncomfortable. This transit produces profound researchers, investigative journalists, depth psychologists, and transformative writers.",
    'Pluto_Venus': "Pluto transiting your natal Venus brings profound transformation to your experience of love, beauty, money, and your fundamental values. Relationships that were maintained by comfort, habit, or fear rather than genuine love do not survive this transit. What remains — or what is created new within this window — is deeply authentic, soulfully connected, and more truly aligned with who you are becoming.",
    'Pluto_Mars': "Pluto transiting your natal Mars creates the most intense transformation of your drive, your relationship to power, and your relationship to desire. You may experience this as overwhelming compulsion, as the confrontation with your own shadow aggression, or as the gradual emergence of a deeper, more sustainable form of personal power than the reactive, ego-driven Mars energy that preceded it. Athletes, transformers, and regenerators are made in this crucible.",
    'Pluto_Jupiter': "Pluto transiting your natal Jupiter brings profound transformation to your beliefs, your philosophy, your relationship to abundance, and your understanding of what constitutes genuine growth and expansion. Religious or philosophical convictions are tested to their core; what survives is genuine wisdom rather than inherited assumption. The philosophical framework you build through this process is genuinely transformative for everyone it touches.",
    'Pluto_Saturn': "Pluto transiting your natal Saturn is a generational transit that dismantles and rebuilds the fundamental structures of your life — the systems of authority, discipline, and long-term commitment that Saturn governs are subjected to Plutonian transformation at the deepest level. What is genuinely essential in your life structures survives and is strengthened; what is maintained by fear, habit, or outdated authority dissolves to make room for structures of genuine power and integrity."
  };

  const ASPECT_DEFS = [
    {name:'conjunction', angle:0, orb:8},
    {name:'sextile', angle:60, orb:4},
    {name:'square', angle:90, orb:6},
    {name:'trine', angle:120, orb:6},
    {name:'opposition', angle:180, orb:8}
  ];

  const PLANET_DEGREES = {
    Aries:0, Taurus:30, Gemini:60, Cancer:90, Leo:120, Virgo:150,
    Libra:180, Scorpio:210, Sagittarius:240, Capricorn:270, Aquarius:300, Pisces:330
  };

  const transitPlanets = ['Jupiter','Saturn','Uranus','Neptune','Pluto'];
  const natalPlanets   = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'];

  function getSignDeg(sign) {
    return (PLANET_DEGREES[sign] || 0) + 15;
  }

  function getTransitDeg(tPlanet) {
    if (transitPositions[tPlanet]) {
      if (typeof transitPositions[tPlanet] === 'number') return transitPositions[tPlanet];
      if (transitPositions[tPlanet].lon !== undefined) return transitPositions[tPlanet].lon;
      if (transitPositions[tPlanet].sign) return getSignDeg(transitPositions[tPlanet].sign);
    }
    return null;
  }

  function getNatalDeg(nPlanet) {
    if (natalChart.positions && natalChart.positions[nPlanet]) {
      const p = natalChart.positions[nPlanet];
      if (typeof p === 'number') return p;
      if (p.lon !== undefined) return p.lon;
    }
    // Fallback to sign-based
    const signKey = nPlanet.toLowerCase() + 'Sign';
    const fallbackSign = natalChart[signKey] || natalChart.sunSign;
    return fallbackSign ? getSignDeg(fallbackSign) : null;
  }

  const aspects = [];

  for (const tp of transitPlanets) {
    const tDeg = getTransitDeg(tp);
    if (tDeg === null) continue;

    for (const np of natalPlanets) {
      const nDeg = getNatalDeg(np);
      if (nDeg === null) continue;

      const rawDiff = Math.abs(tDeg - nDeg) % 360;
      const diff = rawDiff > 180 ? 360 - rawDiff : rawDiff;

      for (const {name, angle, orb} of ASPECT_DEFS) {
        const orbActual = Math.abs(diff - angle);
        if (orbActual <= orb) {
          const interpKey = `${tp}_${np}`;
          const baseInterp = TRANSIT_INTERPRETATIONS[interpKey] ||
            `Transiting ${tp} forms a ${name} to your natal ${np}, activating themes of ${np}-related life areas with ${tp}'s particular quality of transformation. This ${orbActual < 2 ? 'exact' : orbActual < 4 ? 'close' : 'applying'} aspect carries ${name === 'conjunction' ? 'intensified focus and new beginnings' : name === 'trine' ? 'harmonious flow and natural opportunity' : name === 'sextile' ? 'cooperative potential awaiting your engagement' : name === 'square' ? 'productive friction demanding growth and adjustment' : 'awareness through polarity and the integration of opposites'} in its energy.`;

          const aspectQuality = name === 'trine' || name === 'sextile' ? 'harmonious' : name === 'conjunction' ? 'intensifying' : 'dynamic';

          aspects.push({
            transitPlanet: tp,
            natalPlanet: np,
            aspect: name,
            orb: orbActual,
            strength: orbActual < 2 ? 'exact' : orbActual < 5 ? 'close' : 'wide',
            quality: aspectQuality,
            interpretation: baseInterp
          });
          break;
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb);
}

// ── SECTION 6: Export ─────────────────────────────────────────────────────
// Merge IIFE functions with the richer global implementations in this module.
window.AstroInterpretations = Object.assign({}, window.Interpretations, {
  calculateCompatibility,
  getDailyHoroscope,
  getTransitAspects,
  analyzeChartDetailed,
  ASPECTS,
});
  // ── SATURN ────────────────────────────────────────────────
  'Saturn_Aries': "Saturn in Aries places the lesson of disciplined action at the center of your development. You have an impulse toward independence and initiative that must be tempered with patience and strategic thinking before it becomes effective. The early life often features experiences that seem to block or punish directness, teaching you — often the hard way — that courage requires planning as much as daring. At maturity, this placement produces a self-starting authority that is genuinely earned.",

  'Saturn_Taurus': "Saturn in Taurus teaches the lessons of genuine security, simplicity, and the proper relationship to material resources. You may have early experiences of scarcity or insecurity that create a deep drive toward financial stability — sometimes to the point of anxiety and over-accumulation. The maturation of this placement produces a real capacity for stewardship: the understanding that resources are meant to be both secured and shared, and that true security is internal rather than external.",

  'Saturn_Gemini': "Saturn in Gemini places the disciplining principle in the domain of mind and communication. You may have experienced early difficulty in self-expression — feeling unheard, struggling with learning, or doubting your intelligence. The work of this placement is to develop the intellectual rigor and focused communication that Saturn demands. At maturity, this becomes genuine mastery of language and thought: the writer who chose every word with care, the teacher whose precision serves learning.",

  'Saturn_Cancer': "Saturn in Cancer places the lesson in the domain of home, family, and emotional safety — precisely the areas where Saturn is most uncomfortable and where its influence cuts deepest. Early experiences may have involved emotional unavailability, familial hardship, or the sense of being responsible for more than a child should carry. The maturation of this placement requires building, from the inside out, the security that was not provided from without — a depth of inner home that no circumstance can demolish.",

  'Saturn_Leo': "Saturn in Leo teaches the lessons of authentic self-expression, creative maturity, and the proper use of authority. You may have grown up with experiences that deflated natural self-expression — criticism of your creativity, suppression of your need to shine — leaving a complicated relationship with visibility and recognition. The mature expression of this placement is a self-assurance that does not require the audience's approval: the authority that comes from genuine achievement rather than performance.",

  'Saturn_Virgo': "Saturn in Virgo amplifies the already self-critical Virgo tendency into a demanding inner taskmaster that can be both a tremendous engine of productivity and a source of chronic anxiety. Your lessons involve service, health, and the development of practical mastery through meticulous effort. The shadow is the paralysis of perfectionism and the health problems that result from sustained self-criticism applied to the nervous system. Maturity brings a self-discipline that is compassionate as well as exacting.",

  'Saturn_Libra': "Saturn in Libra — its exaltation — places the structuring principle in the domain of relationship, law, and fairness. You take commitments seriously and have an instinctive understanding of how justice and social order actually function. Your lessons involve partnership: learning to be in genuine relationship without either dominating or self-erasing, and developing the maturity to sustain commitment through difficulty rather than retreating. At its best, this produces an extraordinary capacity for principled, loyal partnership.",

  'Saturn_Scorpio': "Saturn in Scorpio places the lesson in the territory of power, transformation, and emotional depth. You are asked to develop a mature relationship with control — to understand the difference between power that serves and power that destroys. There may be early experiences involving loss, betrayal, or the abuse of power that necessitate a profound psychological excavation. The mature expression of this placement is a psychological authority that has genuinely confronted the shadow and emerged with integrity.",

  'Saturn_Sagittarius': "Saturn in Sagittarius places the lessons in the domain of belief, philosophy, and the quest for meaning. You may have grown up in a restrictive or doctrinaire religious or philosophical environment, or conversely in one so lacking in structure that you inherited nothing to push against. The work is the development of a mature, tested personal philosophy — one that has been questioned, revised, and finally owned. At maturity, this becomes the wisdom teacher: genuine authority born of genuine seeking.",

  'Saturn_Capricorn': "Saturn in Capricorn — its home — produces the most structurally disciplined and professionally capable expression of the planet's energy. Your lessons involve mastery, patience, and the long-term commitment to building something lasting. The early life may feel heavy with responsibility or expectation; you may feel that you have been old since childhood. The gift is an extraordinary capacity for sustained effort and genuine achievement. The shadow is the coldness and rigidity that can develop when ambition substitutes for feeling.",

  'Saturn_Aquarius': "Saturn in Aquarius — its second home — places the disciplining principle in the domain of community, innovation, and social progress. You are tasked with building actual structures out of visionary ideals — the bridge between the possible future and the practical present. Lessons involve belonging: learning to find genuine community while maintaining individual integrity, and to be a reformer without becoming a tyrant in your own image. At maturity, this placement produces exceptional systemic thinking and true social responsibility.",

  'Saturn_Pisces': "Saturn in Pisces places the lesson in the terrain of imagination, spirituality, and the boundless inner world. The challenge is the confrontation of the infinite within the finite container of a human life. You may have experienced spiritual doubt, creative frustration, or the difficulty of living in a world that seems to have no room for what you most deeply feel. The maturation of this placement involves developing a disciplined spiritual practice and finding forms for the formless — the mystic who writes, the dreamer who builds.",

// -----------------------------------------------------------------------------
// 2. PLANET IN HOUSE — 10 planets × 12 houses = 120 entries
// -----------------------------------------------------------------------------
const planetInHouse = {
  Sun: {
    1: "The Sun in the First House creates an individual whose solar identity and physical presence are powerfully aligned — they project personal vitality, strong will, and a self-defining energy that makes them immediately visible in any gathering. Their life journey involves the explicit and ongoing development of personal identity, and they tend to be at their best when their outer presentation and inner self-concept are genuinely congruent. Leadership and visibility come naturally to this placement, as the First House Sun cannot easily hide or blend into the background.",
    2: "The Sun in the Second House finds its identity through the development of personal values, the acquisition of material resources, and the cultivation of genuine self-worth. These individuals often experience their sense of self as closely tied to their financial situation and material security, making the development of healthy abundance consciousness a central life theme. At their best they develop a profound relationship to value in all its forms and become genuinely skilled stewards of material and personal resources.",
    3: "The Sun in the Third House channels the solar identity through communication, learning, and the local environment — these individuals experience themselves most fully when they are thinking, writing, speaking, and making connections. Siblings, neighbors, and the daily life of the community often play significant roles in shaping their identity, and intellectual engagement is a genuine source of vitality and self-expression. They tend to be gifted communicators with a particular talent for making complex ideas accessible.",
    4: "The Sun in the Fourth House grounds the solar identity in home, family, ancestral heritage, and private life — these individuals experience their deepest sense of self in relation to their roots and the intimate domestic sphere. The relationship to the father or dominant parent is often particularly formative, and the work of establishing a genuine inner home and emotional foundation is central to their life journey. They tend to find their greatest satisfaction in private life rather than public achievement.",
    5: "The Sun in the Fifth House blazes with creative self-expression, pleasure, romance, and the joy of being fully alive — this is one of the most naturally vital placements for the Sun, as the Fifth House is the Sun's natural domain. These individuals need to create, to play, to love, and to be genuinely celebrated for their authentic self-expression in order to feel fully themselves. Relationships with children, artistic endeavors, and romantic love affairs are often particularly significant to their sense of identity and vitality.",
    6: "The Sun in the Sixth House channels the solar drive into the development of skills, practical service, and the detailed work of daily routines and health maintenance. These individuals often find their deepest sense of identity and purpose through their work and through being genuinely useful to others, and they can be remarkably dedicated and skillful in any craft they take seriously. The challenge is learning to express the full solar vitality rather than subordinating it entirely to duty and service.",
    7: "The Sun in the Seventh House projects the solar identity into relationships and partnerships, making the quality and nature of close partnerships a central concern and vehicle for self-understanding. These individuals often meet important aspects of their own character through the significant people in their lives, and relationships serve as mirrors for their own development in unusually direct ways. At their best they become genuinely skilled at the art of relating and develop a mature understanding of what genuine partnership requires.",
    8: "The Sun in the Eighth House channels the solar identity through the domains of shared resources, psychological depth, sexuality, death, and transformation. These individuals are often deeply interested in the hidden dimensions of life and drawn to experiences that involve genuine risk, intimacy, or transformation. Their path to solar self-expression runs through the willingness to face what is dark, intense, and transformative rather than remaining in the comfortable shallows of conventional experience.",
    9: "The Sun in the Ninth House channels the solar identity through philosophy, travel, higher education, and the pursuit of meaning that transcends ordinary experience. These individuals often experience themselves most fully when they are expanding their horizons — through study, travel, teaching, or the development of a personal philosophy — and their vitality is genuinely connected to the sense of ongoing intellectual and spiritual adventure. They are often natural teachers and inspired communicators of big ideas.",
    10: "The Sun in the Tenth House places the solar identity squarely in the domain of public life, career, and social achievement — this is a placement of genuine public visibility and a drive toward recognition and professional accomplishment that is among the strongest in the zodiac. These individuals experience their deepest sense of self through their public role and their professional achievement, and the development of genuine authority and public integrity is central to their life purpose. The relationship to authority figures, particularly the father, is often particularly formative.",
    11: "The Sun in the Eleventh House channels the solar identity through friendship, community, collective ideals, and the vision of a better future. These individuals experience themselves most fully in the context of like-minded groups and social networks, and their personal vitality is genuinely connected to the sense of contributing to something larger than individual achievement. They tend to be gifted at building communities and inspiring collective action in service of progressive ideals.",
    12: "The Sun in the Twelfth House places the solar identity behind a veil, making self-expression a more complex and interior process than it is for most people. These individuals often experience difficulty with direct self-assertion and may feel most truly themselves in private, in creative solitude, or in service to others in ways that require a degree of personal self-effacement. The spiritual dimensions of existence are particularly central to their development, and their greatest work is often done in conditions of privacy, institutional service, or creative retreat."
  },
  Moon: {
    1: "The Moon in the First House creates an extraordinarily responsive and emotionally visible individual whose feeling states are immediately readable in their changing facial expressions, voice, and physical presence. They tend to project a quality of warmth, fluctuation, and emotional immediacy that draws people to them and makes them instinctively nurturing in their social interactions. The challenge of this placement is maintaining a stable sense of self when the emotional world is so directly expressed through the body and the immediate environment.",
    2: "The Moon in the Second House creates an emotional life that is closely tied to material security, the stability of one's resources, and the sensory pleasures of the physical world. Emotional safety tends to be equated with financial stability, making fluctuations in income or material circumstances feel particularly destabilizing. At their best these individuals develop a rich and deeply appreciative relationship to the physical world as a source of genuine emotional nourishment.",
    3: "The Moon in the Third House creates an emotional life that is expressed and processed primarily through communication — talking, writing, and making connections in the local environment. These individuals need to articulate their feelings to understand them, and their intellectual curiosity is emotionally motivated rather than merely analytical. Relationships with siblings often carry significant emotional weight, and the emotional quality of everyday communication is a genuine source of either nourishment or distress.",
    4: "The Moon in the Fourth House — the Moon's natural house — creates the most powerful possible emphasis on home, family, and emotional foundations as the center of the individual's psychological life. These individuals need a genuine home base and the experience of deep family belonging to feel emotionally secure, and the relationship to the mother is typically one of the most significant and formative relationships in their entire life. At their fullest expression they are the emotional anchors and caretakers of their communities.",
    5: "The Moon in the Fifth House creates an emotional life that flows most naturally through creative self-expression, romantic love, and the playful, joyful dimensions of experience. These individuals feel most emotionally alive when they are creating, when they are in love, or when they are actively engaged with children — their own or others'. The emotional warmth of this placement is considerable, though a tendency toward emotional drama in romantic relationships requires conscious awareness.",
    6: "The Moon in the Sixth House creates an emotional life that is closely tied to daily routine, work, and the state of health and physical functioning. Emotional security tends to come from having useful tasks, orderly routines, and a sense of being genuinely effective in the practical management of daily life. The body tends to be a very direct reflector of emotional states, and health often fluctuates with psychological wellbeing in particularly direct ways.",
    7: "The Moon in the Seventh House creates an emotional life that is fundamentally organized around close partnership — these individuals need and seek the emotional security of committed relationship as a foundational requirement for their inner wellbeing. They are highly attuned to the emotional states of their partners and tend to organize their own emotional experience in direct response to the quality of their close relationships. Learning to develop a stable inner emotional ground that does not entirely depend on the partner's state is often a central developmental task.",
    8: "The Moon in the Eighth House creates an emotional life of considerable depth, intensity, and complexity — these individuals feel things at a profound level and rarely reveal the full extent of their inner experience. Emotional security requires genuine psychological intimacy and the willingness to share what is most private and vulnerable; superficial emotional relating feels worse than no relating at all. They tend to be drawn to the hidden and taboo dimensions of emotional life and often have a particular gift for understanding the unconscious.",
    9: "The Moon in the Ninth House creates an emotional life that finds its deepest security in philosophical meaning, adventure, and the ongoing expansion of horizons. These individuals feel most emotionally at home when they are learning, traveling, or engaging with perspectives that broaden their understanding of the world. The mother may have been particularly significant as a source of philosophical or cultural breadth, and foreign cultures often feel emotionally resonant in surprising ways.",
    10: "The Moon in the Tenth House places the emotional life in the domain of public life, career, and social recognition — these individuals experience their emotional wellbeing as closely tied to their professional standing and the quality of their public reputation. They may have an unusually public emotional life, or their professional identity may be associated with emotional work, caretaking, or public nurturing. The relationship between public achievement and private emotional need is a central and often complex life theme.",
    11: "The Moon in the Eleventh House creates an emotional life that finds its deepest security in friendship, community, and the sense of belonging to a group of genuinely like-minded people. These individuals feel most emotionally nourished when surrounded by friends who share their values and when working toward collective goals that feel personally meaningful. Their friendships tend to be emotionally significant and enduring, and the emotional quality of their social networks is a genuine indicator of their overall wellbeing.",
    12: "The Moon in the Twelfth House creates an emotional life that is largely hidden, even from the individual themselves — feelings tend to be experienced as diffuse, overwhelming, or difficult to name, surfacing through dreams, creative work, or sudden emotional floods rather than consistent conscious experience. These individuals often need significant solitude to process their emotional experience, and they tend to be unusually sensitive to collective emotional atmospheres. Their empathy can be extraordinary but also burdensome without adequate self-care and boundary development."
  },
  Mercury: {
    1: "Mercury in the First House creates a quick, verbally expressive, and intellectually oriented personality whose mind is immediately evident in their manner of presenting themselves to the world. These individuals process experience through analysis and communication, and their intellectual energy is a defining feature of their first impression. They tend to be genuinely curious, articulate, and versatile, with a gift for reading their immediate environment and responding with appropriate verbal agility.",
    2: "Mercury in the Second House channels intellectual energy toward questions of value, financial strategy, and the practical application of information in ways that produce material results. These individuals often make their living through communication, and they have a particular talent for the kind of careful, practical thinking that produces tangible financial outcomes. Their values tend to be carefully thought through rather than received from tradition.",
    3: "Mercury in the Third House — the planet's natural house — produces the clearest and most effortlessly expressed intellectual energy, as the planet of mind operates in the domain of everyday communication, local mobility, and the exchange of information without friction. These individuals are natural communicators, often gifted writers or teachers, with an instinctive ease in navigating intellectual territory. The challenge is depth — the facility of communication can sometimes substitute for the harder work of genuine understanding.",
    4: "Mercury in the Fourth House channels intellectual energy into the exploration of family history, psychological foundations, and the private inner life. These individuals often think deeply about their roots, their family mythology, and the emotional foundations of their own psychology, and they may be particularly gifted in fields involving domestic life, psychology, or the history of personal and family systems. Their most significant thinking often happens in private.",
    5: "Mercury in the Fifth House channels intellectual energy into creative self-expression, playful speculation, and the kind of thinking that is most alive when it has an appreciative audience. These individuals are often gifted storytellers, performers, and creative writers whose intellectual energy is genuinely enlivened by the theatrical and the personally expressive dimensions of communication. Their thinking tends to be colorful, dramatic, and personally engaged.",
    6: "Mercury in the Sixth House channels intellectual energy into detailed analysis, systematic problem-solving, and the careful application of knowledge to practical and health-related matters. These individuals are often extraordinarily detail-oriented and methodical thinkers, with a particular talent for the kind of precise, systematic analysis that improves practical systems and processes. Their intellectual interests tend toward the technical, the analytical, and the practically applicable.",
    7: "Mercury in the Seventh House channels intellectual energy into dialogue, partnership, and the stimulation of genuine intellectual exchange. These individuals think most clearly and originally in conversation, and they need intellectual companionship — partners who can genuinely match and stretch their thinking — as a significant emotional and intellectual requirement. Their most original ideas often emerge in the friction and flow of genuine dialogue.",
    8: "Mercury in the Eighth House channels intellectual energy into the investigation of hidden things — the psychological, the taboo, and the deeply concealed dimensions of human motivation and social reality. These individuals are natural researchers and depth psychologists whose thinking goes instinctively beneath the surface, and they have a talent for the kind of penetrating analysis that uncovers what was deliberately concealed. They may be particularly gifted in research, investigation, or any field requiring deep analytical persistence.",
    9: "Mercury in the Ninth House channels intellectual energy into philosophy, higher learning, and the synthesis of broad frameworks of meaning. These individuals are natural philosophers, teachers, and cultural synthesizers whose thinking operates most powerfully at the level of grand perspective and overarching significance. They tend to be attracted to fields involving law, religion, education, or intercultural communication, and their best thinking occurs when engaged with the biggest available questions.",
    10: "Mercury in the Tenth House channels intellectual energy into professional achievement and public communication, often producing individuals who are known for their intellectual work, their professional writing or speaking, or their authoritative communication in their chosen field. These individuals tend to take their intellectual reputation seriously and to develop their communicative skills with deliberate professional intention. Their public voice is often among their most significant professional assets.",
    11: "Mercury in the Eleventh House channels intellectual energy into collective vision, social networks, and the communication of progressive ideas within communities of like-minded people. These individuals tend to be prolific networkers and communicators within their social and professional communities, with a gift for articulating collective ideals in ways that inspire group action. They are often most intellectually alive when working collaboratively toward shared goals.",
    12: "Mercury in the Twelfth House channels intellectual energy inward and downward, producing a mind that thinks most productively in solitude, that is particularly attuned to the unconscious and the symbolic dimensions of experience, and that often produces its most significant work in private. These individuals may find public communication difficult or may use language in ways that seem indirect or overly symbolic to more literal minds. At their most developed they are remarkable communicators of the invisible and deeply interior dimensions of experience."
  },
  Venus: {
    1: "Venus in the First House creates an individual of natural beauty, charm, and social grace whose capacity for relationship and aesthetic appreciation is immediately visible in their manner and physical presentation. These individuals tend to attract others effortlessly and to create an atmosphere of warmth and aesthetic pleasure wherever they go. The challenge is ensuring that the presentation of likability does not become a substitute for deeper self-knowledge and genuine values.",
    2: "Venus in the Second House creates a deep connection between love, beauty, and material security — these individuals find genuine pleasure in the sensory world and have a talent for creating beautiful, comfortable environments. They often attract material abundance and tend to develop refined taste that serves them well in any field requiring aesthetic judgment. Their sense of self-worth and their values are deeply tied to their experience of beauty and pleasure.",
    3: "Venus in the Third House creates an intellectually charming and communicatively graceful individual who finds beauty in ideas, words, and the pleasures of intellectual companionship. These individuals are often gifted writers and speakers with a particular talent for making communication itself beautiful and pleasurable. They tend to be attracted to those who stimulate them intellectually and find great pleasure in the daily exchange of ideas and information.",
    4: "Venus in the Fourth House creates a deep investment in the beauty, harmony, and emotional warmth of home and domestic life. These individuals find genuine aesthetic and emotional pleasure in creating beautiful domestic environments and are often genuinely gifted at the art of making a home feel welcoming and lovely. Relationships with family are typically among the most significant and pleasurable dimensions of their life.",
    5: "Venus in the Fifth House creates one of the most naturally joyful and romantically expressive Venus placements — these individuals are natural lovers, creatives, and pleasure-seekers whose aesthetic sense is closely tied to the joy of self-expression and the delight of romance. They attract love relatively easily and tend to experience romantic relationships as genuinely central to the experience of being fully alive. Creative work and the expression of personal aesthetic vision are genuine sources of deep satisfaction.",
    6: "Venus in the Sixth House channels the pleasure principle into work, health, and daily service — these individuals find genuine satisfaction in the quality of their craftsmanship and in creating beauty and harmony in their working environment. They tend to attract pleasant working conditions and harmonious colleagues, and they are often able to make daily routines genuinely beautiful. The challenge is ensuring that service does not become servility.",
    7: "Venus in the Seventh House — the planet in its natural house — creates one of the strongest placements for partnership, relationship, and the arts of love and cooperation. These individuals are genuinely gifted at relating, tend to attract significant and often beautiful partnerships, and experience their deepest sense of pleasure and value through the quality of their close relationships. Their commitment to fairness and harmony in all partnerships is genuine and consistent.",
    8: "Venus in the Eighth House channels love and aesthetic pleasure into the domains of deep intimacy, shared resources, and the transformative dimensions of erotic life. These individuals experience love as a vehicle for psychological depth and genuine transformation, and they tend to attract relationships that involve significant emotional intensity, shared financial entanglement, or profound personal change. Their aesthetic sensibilities tend toward the dark, the profound, and the erotically charged.",
    9: "Venus in the Ninth House channels the pleasure principle into adventure, philosophical exploration, and the beauty of broad cultural and intellectual horizons. These individuals find genuine aesthetic and emotional pleasure in travel, higher learning, and the encounter with perspectives radically different from their own cultural background. They are often attracted to partners from different cultures or with significantly different philosophical frameworks.",
    10: "Venus in the Tenth House channels charm, beauty, and social grace into professional life and public standing, often producing individuals who are known for their aesthetic contributions, their professional diplomacy, or their capacity to create harmony in public and institutional contexts. These individuals tend to attract professional opportunities through their personal charm and often find their career advancement facilitated by their ability to create goodwill and positive aesthetic impressions.",
    11: "Venus in the Eleventh House channels the pleasure principle into friendship, social networks, and the aesthetic qualities of collective life. These individuals tend to have a wide and genuinely warm social network and to experience their deepest pleasures in the context of group belonging and shared social vision. They are often gifted at creating the social conditions in which genuine community can flourish.",
    12: "Venus in the Twelfth House channels love and aesthetic pleasure into hidden, private, or spiritually oriented experience — these individuals may have secret relationships or hidden creative lives, or they may find their deepest sense of beauty and love in spiritual practice, solitude, and the invisible dimensions of experience. Their love nature tends to be boundlessly compassionate and self-sacrificing, which can be both a gift and a challenge when it manifests as unavailable or clandestine relationships."
  },
  Mars: {
    1: "Mars in the First House creates one of the most physically dynamic and assertively present individuals in the zodiac — their energy, drive, and competitive spirit are immediately apparent in their bearing, their directness, and the quality of initiative they bring to every situation. They are natural leaders who move first and think about the implications later, and their considerable physical vitality and aggressive presence make them difficult to ignore. The challenge is channeling this potent energy constructively rather than allowing it to express as unnecessary confrontation.",
    2: "Mars in the Second House channels aggressive energy into the acquisition of material resources, the defense of personal values, and the development of financial independence. These individuals are often highly motivated earners who pursue financial security with considerable energy and determination, and they can be aggressive in the protection of what they have worked to build. Their relationship to money tends to be direct, active, and relatively uncomplicated by guilt.",
    3: "Mars in the Third House channels aggressive energy into communication, debate, and the competitive world of ideas. These individuals are often sharp, direct, and occasionally combative in their communication style, with a talent for argument and a willingness to defend their intellectual positions with vigor. Conflicts with siblings are common, and the relationship to the local environment and to the everyday world of communication tends to be active and occasionally contentious.",
    4: "Mars in the Fourth House channels aggressive energy into the domestic sphere, the defense of home and family, and the relationship to the inner emotional foundations. Conflicts within the family of origin are common, and these individuals may have experienced considerable Martian energy — conflict, force, or passionate intensity — in their childhood home. At their best they are fierce protectors of those they love, channeling considerable energy into the defense and development of home and family life.",
    5: "Mars in the Fifth House channels aggressive energy into creative self-expression, romantic pursuit, and the vigorous enjoyment of pleasure. These individuals pursue romance with considerable heat, express their creativity with competitive energy, and bring a vigorous physical vitality to sports, performance, and all forms of self-expression. Their romantic energy is direct and sometimes impulsive, and the tendency to experience love as a sport or a conquest requires conscious tempering.",
    6: "Mars in the Sixth House channels aggressive energy into work, daily tasks, and the cultivation of skill and efficiency. These individuals are often highly productive workers who attack their practical tasks with considerable energy and a competitive desire for excellence, and they can be demanding of both themselves and those who work alongside them. Health crises are often related to overwork and the tendency to drive the body beyond its sustainable limits.",
    7: "Mars in the Seventh House — the planet in its detriment — channels aggressive energy into the domain of close partnerships, often producing significant tension between the desire for authentic relationship and the competitive or combative energies that emerge in intimate contexts. These individuals may attract partners who are particularly dynamic, assertive, or occasionally aggressive, as the Seventh House Mars tends to project its energy onto significant others. Learning to own and consciously express one's own assertive energy within partnership is the central developmental task.",
    8: "Mars in the Eighth House channels aggressive energy into the domains of deep intimacy, shared resources, sexuality, and psychological transformation. These individuals have a particularly intense and probing quality to their erotic and psychological engagements, and they are drawn to the most challenging and transformative dimensions of intimate experience. Their capacity for sustained effort in the face of deep psychological challenge is considerable, and they often find that crises bring out their most formidable qualities.",
    9: "Mars in the Ninth House channels aggressive energy into philosophical conviction, the pursuit of adventure, and the vigorous propagation of belief systems. These individuals can be crusaders and enthusiasts of considerable energy and conviction, bringing a missionary heat to their philosophical and educational activities. The challenge is the tendency toward righteous excess and the willingness to impose their convictions on those who did not ask for them.",
    10: "Mars in the Tenth House channels aggressive energy into professional ambition, public achievement, and the desire to occupy a position of genuine authority and recognition in the world. These individuals are often highly driven professionally, willing to compete for status and recognition, and capable of considerable sustained effort in service of their career objectives. Their drive for professional achievement can be inspiring or intimidating depending on context, and their capacity for leadership in challenging professional circumstances is genuine.",
    11: "Mars in the Eleventh House channels aggressive energy into collective action, social causes, and the competitive dynamics of group membership. These individuals are often active and energizing forces within their social networks and communities, willing to fight for collective ideals and to challenge group inertia with considerable personal initiative. Conflicts within friend groups are common, and learning to direct the Martian drive into productive collective action rather than interpersonal power struggles within groups is often a significant development.",
    12: "Mars in the Twelfth House channels aggressive energy into hidden or unconscious channels, creating a situation in which the individual's assertive drive operates largely below the level of conscious awareness. This can result in the tendency for anger and desire to emerge in unexpected ways — through passive-aggressive patterns, through physical ailments, or through eruptions that seem to come from nowhere. At their most evolved, these individuals can access a remarkable capacity for sustained, self-sacrificing effort in service of spiritual or creative work conducted in solitude."
  },
  Jupiter: {
    1: "Jupiter in the First House creates an individual of natural expansiveness, optimism, and philosophical generosity whose presence tends to make others feel more possible and more welcome in the world. These individuals tend to project an aura of abundance and good fortune and often attract genuine opportunity through the sheer quality of their positive expectation. The challenge is the tendency toward overconfidence and excess — the Jupiterian assumption that more is always better requires periodic conscious review.",
    2: "Jupiter in the Second House tends to attract material abundance, financial opportunity, and a generally prosperous relationship to the physical world. These individuals often find that money flows toward them with relative ease, particularly when they are operating from genuine values alignment, and they tend to be naturally generous with material resources. The shadow is excess and financial overextension — the tendency to expand beyond what is genuinely sustainable.",
    3: "Jupiter in the Third House expands intellectual curiosity, communicative ability, and the pleasure of learning across multiple domains. These individuals tend to attract knowledge and intellectual opportunity, and they are often gifted communicators whose breadth of interest and enthusiasm makes them inspiring teachers and conversationalists. The shadow is the tendency to scatter intellectual energy across too many subjects without achieving genuine depth.",
    4: "Jupiter in the Fourth House tends to create an experience of home as a genuinely abundant and expansive environment — these individuals often benefit from family connections, tend toward large or generously appointed domestic spaces, and experience the private sphere of life as a source of genuine prosperity and wellbeing. Their relationship to their roots is typically positive and supportive, and they often find that their deepest development occurs in the cultivation of genuine inner abundance.",
    5: "Jupiter in the Fifth House creates one of the most joyful and creatively expansive placements in the chart, as the planet of expansion operates in the house of pleasure, self-expression, and creative vitality. These individuals tend to attract genuine good fortune through their creative work, their romantic lives, and their engagement with children and playful experience. Their generosity in love and creative expression tends to be rewarded with genuine delight.",
    6: "Jupiter in the Sixth House tends to create abundance in the domains of work, health, and practical service — these individuals often find good fortune in their professional skills and may have an extraordinary capacity for work or unusually robust health. Their generosity in service tends to be rewarded, and they often find that the quality of their craftsmanship attracts genuine opportunity. The shadow is excess in the work domain — the tendency to overwork or overextend in service of practical ideals.",
    7: "Jupiter in the Seventh House tends to attract significant, often very capable or benevolent partners, and to create an experience of relationship as genuinely abundant, mutually enriching, and philosophically expansive. These individuals often find that their most important partnerships bring genuine growth and good fortune, and they tend to be generous and philosophical in their approach to relating. The challenge is a tendency to idealize partners and to attract relationships that look better from a distance than they are in daily life.",
    8: "Jupiter in the Eighth House tends to create abundance through other people's resources, inheritance, investment, and the various channels through which shared financial and psychological wealth flows. These individuals often find genuine good fortune in matters of legacy, shared investment, or the financial benefits of partnership, and they tend to approach the deep and transformative dimensions of life with philosophical generosity. Their capacity for psychological growth and genuine transformation can be remarkable.",
    9: "Jupiter in the Ninth House — the planet in its natural house — creates the most natural and powerful expression of Jovian energy, expanding through philosophy, higher education, travel, and the development of a genuinely broad and generous worldview. These individuals tend to attract genuine good fortune through their openness to new ideas, their willingness to expand their horizons, and their generosity in sharing what they have learned. Their optimism tends to be self-fulfilling.",
    10: "Jupiter in the Tenth House tends to attract professional recognition, career advancement, and genuine public good fortune — these individuals often find that their professional ambitions are rewarded with unusual expansiveness, and they tend to attract positions of genuine authority and visibility. Their reputation for generosity and philosophical breadth tends to open professional doors, and they often achieve a public standing that reflects genuine achievement rather than mere image management.",
    11: "Jupiter in the Eleventh House tends to create abundance in the domains of friendship, social networks, and collective endeavor — these individuals often attract wide social networks of genuinely capable and supportive people and find that their most important professional opportunities come through their connections within communities of shared purpose. Their vision for collective possibility tends to be genuinely inspiring and practically generative.",
    12: "Jupiter in the Twelfth House tends to create hidden or private abundance — the good fortune of this placement is often invisible to others but palpable to the individual as a kind of spiritual protection, creative richness, or inner reservoir of optimism and meaning. These individuals often find their deepest growth through solitude, spiritual practice, and the various forms of retreat that allow them to connect with the inexhaustible source that Jupiter in the Twelfth quietly maintains."
  },
  Saturn: {
    1: "Saturn in the First House creates an individual whose early experience of life is characterized by a sense of constraint, burden, or excessive seriousness that often produces a simultaneously mature and somewhat inhibited self-presentation. These individuals may have experienced early life as heavier and more responsible than their peers, and they often develop a notable reserve and self-sufficiency as a result. As they mature, however, the discipline and self-mastery this placement demands tends to produce individuals of genuine authority and structural integrity.",
    2: "Saturn in the Second House creates persistent anxiety around financial security, material stability, and the right to possess and enjoy resources. These individuals often work very hard for their material security and may experience chronic worry about financial matters even when their actual situation is comfortable. The developmental task is building genuine financial competence and the emotional permission to enjoy what they have earned.",
    3: "Saturn in the Third House creates difficulty with communication, learning, and intellectual self-expression — these individuals may have experienced early educational challenges, difficulty with siblings, or a deep sense that their ideas were not welcome or capable of being adequately expressed. The development of genuine communicative authority through persistent effort and disciplined study is the central task, and many of the most rigorous and precise thinkers in any field have this placement.",
    4: "Saturn in the Fourth House creates a deeply challenging domestic and emotional foundation — these individuals often experienced the home of origin as cold, restrictive, or burdened with heavy responsibilities, and the work of creating genuine inner security and a comfortable domestic environment is a significant life task. The relationship to the father or dominant parent tends to be particularly complex and formative, and the construction of genuine inner emotional solidity is the central developmental achievement.",
    5: "Saturn in the Fifth House restricts the free expression of creativity, playfulness, and the capacity for romantic spontaneity — these individuals often experience difficulty with creative self-expression, with the willingness to be seen in genuine joy, and with the spontaneous emotional availability that romantic love requires. The developmental task is reclaiming the right to create, play, and love without the internal critic's supervision. When achieved, this placement can produce extraordinarily disciplined and enduring creative work.",
    6: "Saturn in the Sixth House creates a demanding and exacting relationship to work, health, and daily routine — these individuals tend to set very high standards for their practical functioning and can be chronically self-critical about the quality of their work and the state of their health. The developmental task involves building a relationship to work and self-care that is disciplined without being punishing, and learning to find genuine satisfaction in the honest work of daily life.",
    7: "Saturn in the Seventh House creates significant challenges, delays, and lessons in the domain of close partnership. These individuals may experience considerable difficulty finding and maintaining committed relationships, or they may attract partners who carry significant Saturnine qualities — older, more serious, more restricting. The developmental task is building the maturity and genuine self-knowledge that sustainable partnership requires, and the relationships that do endure with this placement tend to be among the most seriously committed.",
    8: "Saturn in the Eighth House creates anxiety around deep intimacy, shared vulnerability, sexuality, and the various forms of psychological and financial merger that intimate partnership involves. These individuals often develop significant self-protective strategies around the very domains where genuine transformation is most needed, and the work of opening to the full depth of shared experience is a significant life task. When achieved, their capacity for genuine psychological integration and financial management is considerable.",
    9: "Saturn in the Ninth House creates challenges in the domains of faith, higher education, philosophical freedom, and the right to believe what one has genuinely discovered. These individuals often carry persistent doubt about the validity of their own philosophical conclusions and may struggle to find a coherent belief system that feels both intellectually honest and spiritually sustaining. The development of genuine personal philosophy through rigorous intellectual and experiential testing is the central task.",
    10: "Saturn in the Tenth House — the planet in its natural house — creates one of the most powerful placements for professional achievement, but typically requires considerable early struggle before the genuine authority and recognition of mid-life arrive. These individuals often feel burdened by excessive responsibility early in life and may experience significant professional setbacks before their genuine competence is established and recognized. When the Saturnine task of this placement is met, the professional achievement and public authority that result are genuinely earned and remarkably enduring.",
    11: "Saturn in the Eleventh House creates challenges in the domains of friendship, social belonging, and the realization of long-term hopes and dreams. These individuals often experience a sense of social isolation or difficulty finding genuine belonging within their peer groups, and their approach to friendship tends to be serious, selective, and sometimes lonely. The development of genuine community and the patient pursuit of authentic collective vision are the central tasks, and their friendships, though few, tend to be enduring and substantive.",
    12: "Saturn in the Twelfth House creates challenges in the domains of solitude, spiritual life, and the relationship to the unconscious — these individuals may carry significant karmic burdens or deep unconscious fears that make the necessary work of inner retreat and psychological integration particularly challenging. The development of a genuine inner life and the capacity for honest engagement with what is hidden or feared within the self is the central task. When achieved, the spiritual maturity and psychological depth available to this placement are exceptional."
  },
  Uranus: {
    1: "Uranus in the First House creates a powerfully individualistic, unpredictable, and original personality whose need for freedom and authentic self-expression makes them genuinely difficult to categorize or contain. These individuals project an energy of radical individuality and tend to experience strong resistance to any form of external definition or constraint. Their path forward is one of genuine innovation in their own life and often in the lives of those they influence.",
    2: "Uranus in the Second House creates an unconventional, erratic, and innovative relationship to money and material resources. These individuals may experience sudden gains and losses in their financial lives and tend to have a deliberately non-conventional approach to earning, spending, and managing resources. Their values tend to be genuinely original and resistant to materialistic convention.",
    3: "Uranus in the Third House creates an original, inventive, and occasionally erratic communicator whose thinking tends to arrive in sudden flashes rather than through orderly sequential development. These individuals often communicate in ways that are unconventional, ahead of their time, or deliberately provocative, and they tend to be drawn to the most innovative and technically forward-looking areas of communication and intellectual exchange.",
    4: "Uranus in the Fourth House creates an unconventional, disrupted, or actively reformed domestic and family life. These individuals may have experienced significant instability or genuine originality in their childhood home, or they may deliberately create unconventional living situations as adults. The development of genuine inner freedom that does not depend on external stability is the central psychological task.",
    5: "Uranus in the Fifth House creates an original, experimental, and unconventional approach to creativity, romance, and self-expression. These individuals tend to pursue creative work in genuinely innovative directions and to approach romantic relationships with a characteristic need for freedom and unconventionality. Their creative innovations can be genuinely ahead of their time.",
    6: "Uranus in the Sixth House creates an innovative, disrupted, or unconventional relationship to work, daily routines, and health practices. These individuals tend to resist conventional working structures and are often drawn to innovative or technologically oriented fields. Their health tends to benefit from unconventional approaches and may respond poorly to overly rigid routines.",
    7: "Uranus in the Seventh House creates unconventional, freedom-oriented, and often genuinely innovative close partnerships. These individuals need considerable autonomy within their most intimate relationships and may be drawn to genuinely unconventional partnership structures. They often attract partners who are themselves unusual, innovative, or freedom-oriented, and their most significant relationships tend to be electric, transformative, and unpredictable.",
    8: "Uranus in the Eighth House creates sudden, disruptive, and transformative experiences in the domains of shared resources, sexuality, and psychological depth. These individuals often experience sudden changes in the financial arrangements that involve other people and may have genuinely unconventional approaches to intimacy, sexuality, and the psychological work of transformation.",
    9: "Uranus in the Ninth House creates an innovative, iconoclastic, and genuinely original philosophical mind that resists received wisdom and tends toward the revolutionary in its intellectual and spiritual pursuits. These individuals are drawn to the frontiers of knowledge and belief, and their philosophical conclusions tend to be genuinely ahead of conventional thinking.",
    10: "Uranus in the Tenth House creates an unconventional, disruptive, and often brilliantly innovative professional life in which the individual's genuine originality becomes a public identity. These individuals often have career trajectories that are non-linear, surprising, or genuinely path-breaking, and they tend to be known for the innovative quality of their professional contributions.",
    11: "Uranus in the Eleventh House — the planet in its natural house — creates the most natural expression of Uranian energy in a social and collective direction. These individuals are drawn to progressive communities, innovative social movements, and the cultivation of friendships among genuinely original and free-thinking people. Their vision for collective possibility tends to be genuinely ahead of its time.",
    12: "Uranus in the Twelfth House channels innovative and liberating energy through the unconscious, spiritual life, and the hidden dimensions of the self. These individuals may experience sudden liberations from unconscious material through dreams, spiritual insight, or unexpected events that disrupt carefully maintained psychological structures. Their most significant innovations may emerge from the private and interior realms of their experience."
  },
  Neptune: {
    1: "Neptune in the First House creates an individual of unusual sensitivity, spiritual presence, and diffuse personal boundaries whose identity tends to be more fluid and impressionable than most. These individuals project an aura of mystery, artistic sensitivity, or spiritual depth that makes them simultaneously compelling and difficult to fully pin down. The challenge is developing sufficient personal definition to navigate the world without losing oneself in the impressions and projections of others.",
    2: "Neptune in the Second House creates a complex and often confused relationship to material resources — these individuals may find that money slips through their fingers in mysterious ways or that their relationship to their own values is unusually fluid and hard to define. At their best they develop a genuinely spiritual or altruistic relationship to material resources and find their deepest wealth in non-material domains.",
    3: "Neptune in the Third House creates a poetic, impressionistic, and intuitively rich communication style that operates more through feeling and imagery than through linear logic. These individuals may have difficulty with precision and factual accuracy but can be extraordinarily gifted in any form of communication that values beauty, resonance, and emotional truth over literal exactitude.",
    4: "Neptune in the Fourth House creates a home environment and early family life characterized by confusion, idealization, or a peculiar enchantment that is difficult to describe in ordinary terms. The mother or dominant parent may have been particularly dreamy, absent, spiritual, or hard to grasp, and the individual's relationship to their own emotional foundations may be similarly elusive. The development of genuine inner sanctuary through spiritual practice is often particularly important.",
    5: "Neptune in the Fifth House creates an extraordinarily rich creative and romantic imagination that draws these individuals toward artistic work of the most emotionally and spiritually resonant kind. Their romantic idealism can be both a source of great beauty and a setup for genuine disappointment, as the beloved inevitably inhabits a human body that falls short of the sublime figure of the imagination.",
    6: "Neptune in the Sixth House creates a sensitivity to the working environment and to health matters that can make ordinary routines feel both confusing and potentially overwhelming. These individuals may be drawn to healing professions or to forms of work that involve service and spiritual meaning, and they tend to be particularly sensitive to environmental toxins and emotionally charged working conditions.",
    7: "Neptune in the Seventh House creates profoundly idealized close partnerships in which the partner tends to be experienced through the rose-colored lens of the most elevated imagination. These individuals are capable of extraordinary devotion and spiritual love but tend to attract situations of idealization, disappointment, or genuine confusion in their most committed relationships.",
    8: "Neptune in the Eighth House creates a particularly fluid and spiritually charged relationship to deep intimacy, shared resources, and the transformative dimensions of psychological and sexual life. These individuals may have genuinely psychic sensitivity to their partners' emotional states and find that the most transformative experiences in their lives involve a kind of mystical dissolution of the individual self.",
    9: "Neptune in the Ninth House creates a particularly spiritually oriented and visionary philosophical mind, drawn to mysticism, the highest expressions of religious experience, and the most transcendent dimensions of philosophical inquiry. These individuals may have genuine spiritual gifts but are also vulnerable to the kind of grand philosophical delusion that Neptunian enthusiasm can produce.",
    10: "Neptune in the Tenth House creates a public identity that is fluid, somewhat mysterious, or associated with spirituality, artistic vision, or the kinds of institutional work that involve genuine service and self-transcendence. These individuals may project a quality of idealized authority and may find that their professional reputation undergoes significant dissolution and reformation over time.",
    11: "Neptune in the Eleventh House creates a deeply idealistic relationship to friendship, collective vision, and the dream of social transformation. These individuals are capable of profound dedication to collective ideals and may experience their deepest spiritual experiences within the context of group belonging and shared visionary purpose. The challenge is maintaining discernment about which communities and which collective visions are genuinely worthy of their devotion.",
    12: "Neptune in the Twelfth House — the planet in its natural house — creates the most profound possible access to the unconscious, the spiritual dimensions of experience, and the dissolving of all boundaries between self and cosmos. These individuals carry an extraordinary depth of spiritual sensitivity and may have genuine access to states of consciousness that most people barely imagine. The challenge of maintaining adequate personal definition while remaining genuinely open to this depth is one of the most delicate psychological tasks in the entire chart."
  },
  Pluto: {
    1: "Pluto in the First House creates an individual of intense personal presence, transformative power, and a quality of psychological penetration that others feel before a word is spoken. These individuals project an aura of concentrated force and tend to affect the people around them at a depth that is often difficult to explain. Their own identity tends to go through profound and repeated transformations throughout the life course.",
    2: "Pluto in the Second House creates powerful, transformative, and often crisis-laden experiences in the domains of material security, personal values, and financial resources. These individuals may experience significant wealth and significant loss, often multiple times, and through these experiences are pushed toward a deep reformation of their relationship to material reality and genuine worth.",
    3: "Pluto in the Third House creates a penetrating, research-oriented, and sometimes compulsive intellectual style that seeks the hidden truth beneath every communication and situation. These individuals are often gifted investigators and researchers whose thinking goes instinctively to the concealed dimension of any matter. Significant transformations in their relationship to communication and siblings tend to be recurring themes.",
    4: "Pluto in the Fourth House creates profound, often powerful, and sometimes traumatic experiences in the domains of home, family, and the emotional foundations of the self. These individuals typically carry significant family karma and may have experienced the family of origin as a place of intense psychological complexity, power dynamics, or transformative crisis that fundamentally shaped their inner architecture.",
    5: "Pluto in the Fifth House creates intense, transformative, and occasionally obsessive experiences in the domains of creative self-expression, romantic love, and the life of children. These individuals bring considerable psychological power to their creative work and their romantic engagements, and the quality of their self-expression tends to have a compelling, provocative, and emotionally penetrating quality.",
    6: "Pluto in the Sixth House creates transformative and occasionally crisis-driven experiences in the domains of work, daily functioning, and health. These individuals may experience profound changes in their working life and may be drawn to fields involving psychological healing, depth research, or the kind of practical crisis management that requires the willingness to go to difficult places.",
    7: "Pluto in the Seventh House creates intensely transformative close partnerships that tend to involve significant power dynamics, profound psychological encounter, and a kind of mutual transformation that irrevocably changes both parties. These individuals attract partners of great intensity and tend to experience their most important relationships as vehicles for profound personal reformation.",
    8: "Pluto in the Eighth House — the planet in its natural house — creates the most complete and self-consistent expression of Plutonian energy, operating in the domain of deep intimacy, shared power, transformation, and the confrontation with death and regeneration. These individuals have extraordinary capacity for depth, resilience, and genuine psychological transformation, and they tend to be naturally drawn to the most intense and challenging dimensions of human experience.",
    9: "Pluto in the Ninth House creates transformative and occasionally fanatical experiences in the domains of philosophy, religion, higher education, and the pursuit of ultimate meaning. These individuals tend to undergo profound transformations in their belief systems and may have an intense, zealous, or obsessive quality to their philosophical and spiritual seeking.",
    10: "Pluto in the Tenth House creates a professional life characterized by significant power, genuine public impact, and the kind of transformative authority that can leave lasting marks on public institutions and social structures. These individuals often occupy positions of genuine power and tend to attract the attention of powerful people, for both constructive and challenging reasons.",
    11: "Pluto in the Eleventh House creates transformative, intense, and occasionally power-laden experiences within friend groups, communities, and collective movements. These individuals often become catalysts for group transformation and may find that their most significant personal transformations occur within the context of collective engagement with important social challenges.",
    12: "Pluto in the Twelfth House channels the most intense transformative power through the unconscious, the hidden self, and the spiritual dimensions of existence. These individuals carry profound unconscious material that requires careful psychological attention and tend to do their most significant inner work in conditions of solitude, retreat, or crisis. Their capacity for deep psychological healing and spiritual transformation, once engaged, can be extraordinary."
  }
};

