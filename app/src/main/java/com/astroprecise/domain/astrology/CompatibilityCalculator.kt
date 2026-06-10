package com.astroprecise.domain.astrology

import com.astroprecise.data.model.CompatibilityResult
import com.astroprecise.data.model.ZodiacSign
import javax.inject.Inject
import kotlin.math.abs

class CompatibilityCalculator @Inject constructor() {

    fun calculate(sign1: ZodiacSign, sign2: ZodiacSign): CompatibilityResult {
        val distance = minOf(abs(sign1.ordinal - sign2.ordinal), 12 - abs(sign1.ordinal - sign2.ordinal))
        val base = BASE_SCORES[distance] ?: 65
        val elemBonus = elementBonus(sign1.element, sign2.element)
        val modBonus = modalityBonus(sign1.modality, sign2.modality)
        val overall = (base + elemBonus + modBonus).coerceIn(20, 99)

        val seed = (sign1.ordinal * 17 + sign2.ordinal * 13)
        val cat = categoryForDistance(distance)
        val readings = READINGS[cat]!!

        return CompatibilityResult(
            sign1 = sign1,
            sign2 = sign2,
            overallScore = overall,
            loveScore = (overall + loveOffset(sign1, sign2)).coerceIn(20, 99),
            friendshipScore = (overall + friendshipOffset(sign1.element, sign2.element)).coerceIn(20, 99),
            communicationScore = (overall + communicationOffset(sign1, sign2)).coerceIn(20, 99),
            valuesScore = (overall + valuesOffset(sign1.element, sign2.element)).coerceIn(20, 99),
            overallReading = readings.overall[seed % readings.overall.size],
            loveReading = readings.love[seed % readings.love.size],
            friendshipReading = readings.friendship[seed % readings.friendship.size],
            communicationReading = readings.communication[seed % readings.communication.size],
            advice = readings.advice[seed % readings.advice.size],
        )
    }

    private fun elementBonus(e1: ZodiacSign.Element, e2: ZodiacSign.Element): Int = when {
        e1 == e2 -> 6
        (e1 == ZodiacSign.Element.FIRE && e2 == ZodiacSign.Element.AIR) ||
        (e1 == ZodiacSign.Element.AIR && e2 == ZodiacSign.Element.FIRE) -> 5
        (e1 == ZodiacSign.Element.EARTH && e2 == ZodiacSign.Element.WATER) ||
        (e1 == ZodiacSign.Element.WATER && e2 == ZodiacSign.Element.EARTH) -> 5
        (e1 == ZodiacSign.Element.FIRE && e2 == ZodiacSign.Element.WATER) ||
        (e1 == ZodiacSign.Element.WATER && e2 == ZodiacSign.Element.FIRE) -> -8
        (e1 == ZodiacSign.Element.EARTH && e2 == ZodiacSign.Element.AIR) ||
        (e1 == ZodiacSign.Element.AIR && e2 == ZodiacSign.Element.EARTH) -> -6
        else -> 0
    }

    private fun modalityBonus(m1: ZodiacSign.Modality, m2: ZodiacSign.Modality): Int = when {
        m1 == m2 -> -4
        (m1 == ZodiacSign.Modality.CARDINAL && m2 == ZodiacSign.Modality.MUTABLE) ||
        (m1 == ZodiacSign.Modality.MUTABLE && m2 == ZodiacSign.Modality.CARDINAL) -> 4
        else -> 0
    }

    private fun loveOffset(s1: ZodiacSign, s2: ZodiacSign): Int {
        val venusAffinity = setOf(ZodiacSign.TAURUS, ZodiacSign.LIBRA, ZodiacSign.PISCES)
        return when {
            s1 in venusAffinity && s2 in venusAffinity -> 8
            s1.element == ZodiacSign.Element.WATER || s2.element == ZodiacSign.Element.WATER -> 4
            else -> 0
        }
    }

    private fun friendshipOffset(e1: ZodiacSign.Element, e2: ZodiacSign.Element): Int =
        if (e1 == ZodiacSign.Element.AIR || e2 == ZodiacSign.Element.AIR) 5 else 0

    private fun communicationOffset(s1: ZodiacSign, s2: ZodiacSign): Int {
        val mercuryRuled = setOf(ZodiacSign.GEMINI, ZodiacSign.VIRGO)
        return if (s1 in mercuryRuled || s2 in mercuryRuled) 7 else 0
    }

    private fun valuesOffset(e1: ZodiacSign.Element, e2: ZodiacSign.Element): Int =
        if (e1 == ZodiacSign.Element.EARTH || e2 == ZodiacSign.Element.EARTH) 5 else 0

    private fun categoryForDistance(d: Int) = when (d) {
        0 -> "same"
        1 -> "semi_sextile"
        2 -> "sextile"
        3 -> "square"
        4 -> "trine"
        5 -> "quincunx"
        else -> "opposition"
    }

    private data class CategoryReadings(
        val overall: List<String>,
        val love: List<String>,
        val friendship: List<String>,
        val communication: List<String>,
        val advice: List<String>,
    )

    companion object {
        private val BASE_SCORES = mapOf(0 to 78, 1 to 60, 2 to 82, 3 to 52, 4 to 94, 5 to 47, 6 to 72)

        private val READINGS = mapOf(
            "trine" to CategoryReadings(
                overall = listOf(
                    "A profound natural harmony flows between you — one of the most blessed pairings in the zodiac. Shared elemental energy creates intuitive understanding without words.",
                    "You move through life in the same rhythm. This connection feels fated, warm, and deeply sustaining.",
                ),
                love = listOf(
                    "Romance feels effortless. You inspire the best in each other with little friction and great joy.",
                    "This love is gentle and enduring. You make each other feel truly seen and wholly accepted.",
                ),
                friendship = listOf(
                    "Your bond is warm, supportive, and essentially unshakeable. Trust forms quickly and lasts.",
                    "Kindred spirits — you feel like you've known each other for lifetimes.",
                ),
                communication = listOf(
                    "You understand each other almost instinctively. Conversations flow easily and misunderstandings are rare.",
                    "Words come naturally and feel safe between you. You finish each other's thoughts.",
                ),
                advice = listOf(
                    "Don't let comfort breed complacency — occasionally push each other to grow beyond your shared strengths.",
                    "Cherish this rare harmony, but remember growth often lives just outside your shared comfort zone.",
                ),
            ),
            "sextile" to CategoryReadings(
                overall = listOf(
                    "A pleasant, productive connection with genuine chemistry. You complement each other in meaningful ways.",
                    "Easy compatibility with real upside — this pairing tends to grow better over time.",
                ),
                love = listOf(
                    "There's natural attractiveness here. Once the flame is lit, it burns steadily and warmly.",
                    "A gentle, lasting attraction. Love grows through shared laughter and everyday moments.",
                ),
                friendship = listOf(
                    "Easy companionship and mutual support. You lift each other without effort or drama.",
                    "Reliable and enjoyable company. You make each other's lives better just by being present.",
                ),
                communication = listOf(
                    "Lively and enjoyable exchanges that stimulate both minds.",
                    "You talk easily and think well together. Conversations leave both of you energised.",
                ),
                advice = listOf(
                    "Build on your natural rapport by seeking new shared experiences.",
                    "Your ease together is a gift — don't take it for granted. Invest in going deeper.",
                ),
            ),
            "square" to CategoryReadings(
                overall = listOf(
                    "Dynamic, challenging, and ultimately growth-inducing. The tension between you is real but so is the potential for transformation.",
                    "Not the easiest pairing, but possibly the most character-building. You push each other to evolve.",
                ),
                love = listOf(
                    "Passionate and never boring — but both partners must work hard on compromise and patience.",
                    "Intense attraction paired with real friction. The love story that makes both of you stronger.",
                ),
                friendship = listOf(
                    "You challenge each other's worldviews in ways that can be energising or exhausting.",
                    "A friendship that demands honesty and growth from both sides.",
                ),
                communication = listOf(
                    "Debates run hot. Different problem-solving styles create friction worth learning to navigate.",
                    "You often talk past each other at first. Slowing down and listening creates breakthroughs.",
                ),
                advice = listOf(
                    "Channel the tension into shared goals. Your differences are the source of both conflict and growth.",
                    "Agree on what matters most. The struggle is finding a rhythm that honours both natures.",
                ),
            ),
            "opposition" to CategoryReadings(
                overall = listOf(
                    "Opposite signs are the zodiac's most fascinating pairing — magnetic, complementary, and provocative.",
                    "You represent what the other secretly yearns for. Together you form a complete whole.",
                ),
                love = listOf(
                    "The attraction can be instant and powerful. Sustaining it means honouring your differences.",
                    "A love that teaches and transforms. You see yourselves reflected in each other.",
                ),
                friendship = listOf(
                    "You balance each other beautifully, offering perspectives the other would never reach alone.",
                    "Unlikely allies who make each other stronger for it.",
                ),
                communication = listOf(
                    "Your different approaches, combined, cover every angle together.",
                    "You think differently enough that conversations are always illuminating.",
                ),
                advice = listOf(
                    "Embrace your differences as strengths. Resist the urge to convert each other.",
                    "The goal isn't to become alike — it's to build a bridge between two whole worlds.",
                ),
            ),
            "same" to CategoryReadings(
                overall = listOf(
                    "Two of the same sign create a uniquely mirrored connection — deeply understood, but sometimes too similar for your own good.",
                    "You get each other at a level few others can reach. The challenge is your shared blind spots.",
                ),
                love = listOf(
                    "You truly understand each other, which creates safety. Watch for amplifying each other's insecurities.",
                    "Deep recognition and comfort — love that feels like coming home.",
                ),
                friendship = listOf(
                    "A kindred-spirit connection. You are genuinely easy company for each other.",
                    "You laugh at the same things, care about the same things, want the same things.",
                ),
                communication = listOf(
                    "Almost telepathic — but you may unconsciously avoid each other's growth edges.",
                    "You speak the same language so fluently that you forget others don't.",
                ),
                advice = listOf(
                    "Actively seek people and experiences that challenge your shared worldview.",
                    "Your greatest risk is echo-chamber thinking. Encourage each other's individual paths.",
                ),
            ),
            "quincunx" to CategoryReadings(
                overall = listOf(
                    "An unusual connection requiring ongoing adjustment. Different enough that genuine understanding takes real effort.",
                    "Not a natural fit — but connections that demand work often reward it most.",
                ),
                love = listOf(
                    "Attraction is possible but sustaining it means accepting you may never fully understand each other.",
                    "Intriguing and complex. Love here is an ongoing act of curiosity.",
                ),
                friendship = listOf(
                    "Interesting but sometimes baffling to each other. Mutual curiosity bridges the gap.",
                    "A friendship built on the pleasure of puzzling each other out.",
                ),
                communication = listOf(
                    "Communication styles differ significantly. Patience and active listening are essential.",
                    "You often interpret the same words differently. Clarify early and often.",
                ),
                advice = listOf(
                    "Approach each other with curiosity rather than expectation.",
                    "Don't mistake unfamiliarity for incompatibility. Understanding takes longer here, and that's okay.",
                ),
            ),
            "semi_sextile" to CategoryReadings(
                overall = listOf(
                    "A subtle, nuanced connection. Adjacent signs share awareness of each other's world but speak different inner languages.",
                    "Understated compatibility that grows quietly over time.",
                ),
                love = listOf(
                    "Gentle attraction that deepens with patience. There's tenderness in this pairing.",
                    "Not the most explosive romance but one that wears remarkably well.",
                ),
                friendship = listOf(
                    "Steady and understated. You may not be the most exciting pair, but you show up for each other.",
                    "Quiet loyalty and consistent support define this friendship.",
                ),
                communication = listOf(
                    "Generally smooth, with occasional moments of talking past each other.",
                    "Respectful and calm — you handle disagreements with more grace than most.",
                ),
                advice = listOf(
                    "Give the relationship time to deepen. Don't mistake subtlety for lack of depth.",
                    "The connection rewards patience. Be curious about your differences rather than frustrated by them.",
                ),
            ),
        )
    }
}
