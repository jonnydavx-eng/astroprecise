package com.astroprecise.domain.astrology

import com.astroprecise.data.model.Horoscope
import com.astroprecise.data.model.ZodiacSign
import javax.inject.Inject
import kotlin.math.abs

class HoroscopeGenerator @Inject constructor() {

    fun generateDaily(sign: ZodiacSign, dateKey: Long): Horoscope {
        val seed = abs(sign.ordinal * 31L + dateKey)
        return Horoscope(
            sign = sign.displayName,
            period = Horoscope.Period.DAILY,
            date = java.time.LocalDate.now().toString(),
            general = generalReadings(sign)[(seed % generalReadings(sign).size).toInt()],
            love = loveReadings(sign)[(seed % loveReadings(sign).size).toInt()],
            career = careerReadings(sign)[(seed % careerReadings(sign).size).toInt()],
            wellness = wellnessReadings(sign)[(seed % wellnessReadings(sign).size).toInt()],
            luckyNumber = ((seed % 99) + 1).toInt(),
            luckyColor = luckyColors[(seed % luckyColors.size).toInt()],
            rating = ((seed % 5) + 1).toInt(),
        )
    }

    private val luckyColors = listOf(
        "Crimson", "Sapphire Blue", "Emerald Green", "Gold", "Silver",
        "Violet", "Rose", "Midnight Blue", "Amber", "Pearl White",
    )

    private fun generalReadings(sign: ZodiacSign) = listOf(
        "The stars align to illuminate your path, ${sign.displayName}. Trust your instincts today — the universe is guiding you toward meaningful encounters and fresh perspectives.",
        "A surge of cosmic energy infuses your day with possibility. ${sign.rulingPlanet} supports bold action, making this an ideal time to pursue what matters most.",
        "Reflective energy surrounds you today. Step back from the noise to listen to your inner wisdom. Important insights may surface when you least expect them.",
        "Dynamic celestial shifts bring both challenge and opportunity. Navigate with the ${sign.element.displayName} element's natural strength — you're more resilient than you realize.",
        "Planetary alignments favor growth and self-expression. Lean into your ${sign.traits.first()} nature and watch new doors open with surprising ease.",
    )

    private fun loveReadings(sign: ZodiacSign) = listOf(
        "Venus blesses your connections today. Whether single or partnered, genuine vulnerability opens the heart to deeper bonds.",
        "A meaningful exchange awaits. Express what you feel with clarity — the cosmos rewards honest emotional communication.",
        "Romantic tensions may surface but carry transformative potential. Approach disagreements with compassion and you'll emerge closer.",
        "Your magnetic presence draws others in. Enjoy the attention, but be discerning about who deserves access to your inner world.",
        "Love requires patience now. Trust in divine timing — what is meant for you cannot be rushed.",
    )

    private fun careerReadings(sign: ZodiacSign) = listOf(
        "Professional momentum builds steadily. Focus your considerable talents on one priority rather than scattering energy across many fronts.",
        "An unexpected collaboration could prove highly fruitful. Stay open to unconventional partnerships and creative problem-solving.",
        "Your reputation benefits from careful, diligent work today. Avoid shortcuts — quality will be noticed and rewarded.",
        "Mercury sharpens your mental clarity. Use this window to negotiate, present ideas, or tackle complex analytical tasks.",
        "Leadership opportunities emerge. Step into them with the confident, grounded approach that is your birthright.",
    )

    private fun wellnessReadings(sign: ZodiacSign) = listOf(
        "Your body holds wisdom worth listening to. Honor the signals it sends — rest when tired, move when restless.",
        "Mental and physical balance is the theme. A mindful walk or brief meditation can recalibrate your entire system.",
        "Nourish yourself with intention today. Small, deliberate acts of self-care compound into lasting vitality.",
        "Release what no longer serves your health. Whether a habit, a worry, or a relationship — letting go creates space for renewal.",
        "Energy runs high. Channel this vitality through physical activity that brings you joy, not obligation.",
    )
}
