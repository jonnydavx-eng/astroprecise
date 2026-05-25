package com.astroprecise.data.model

enum class ZodiacSign(
    val displayName: String,
    val symbol: String,
    val element: Element,
    val modality: Modality,
    val rulingPlanet: String,
    val startDay: Int,
    val startMonth: Int,
    val endDay: Int,
    val endMonth: Int,
    val traits: List<String>,
    val description: String,
) {
    ARIES(
        displayName = "Aries",
        symbol = "♈",
        element = Element.FIRE,
        modality = Modality.CARDINAL,
        rulingPlanet = "Mars",
        startDay = 21, startMonth = 3,
        endDay = 19, endMonth = 4,
        traits = listOf("Courageous", "Confident", "Enthusiastic", "Impulsive"),
        description = "The first sign of the zodiac, Aries is a bold initiator full of raw energy and pioneering spirit.",
    ),
    TAURUS(
        displayName = "Taurus",
        symbol = "♉",
        element = Element.EARTH,
        modality = Modality.FIXED,
        rulingPlanet = "Venus",
        startDay = 20, startMonth = 4,
        endDay = 20, endMonth = 5,
        traits = listOf("Reliable", "Patient", "Practical", "Stubborn"),
        description = "Grounded and sensual, Taurus seeks beauty, stability, and the finer pleasures of life.",
    ),
    GEMINI(
        displayName = "Gemini",
        symbol = "♊",
        element = Element.AIR,
        modality = Modality.MUTABLE,
        rulingPlanet = "Mercury",
        startDay = 21, startMonth = 5,
        endDay = 20, endMonth = 6,
        traits = listOf("Versatile", "Curious", "Witty", "Inconsistent"),
        description = "The twins of the zodiac — quick-minded, adaptable, and endlessly curious about the world.",
    ),
    CANCER(
        displayName = "Cancer",
        symbol = "♋",
        element = Element.WATER,
        modality = Modality.CARDINAL,
        rulingPlanet = "Moon",
        startDay = 21, startMonth = 6,
        endDay = 22, endMonth = 7,
        traits = listOf("Nurturing", "Intuitive", "Protective", "Moody"),
        description = "Deeply emotional and intuitive, Cancer is the nurturer of the zodiac, fiercely protective of loved ones.",
    ),
    LEO(
        displayName = "Leo",
        symbol = "♌",
        element = Element.FIRE,
        modality = Modality.FIXED,
        rulingPlanet = "Sun",
        startDay = 23, startMonth = 7,
        endDay = 22, endMonth = 8,
        traits = listOf("Generous", "Confident", "Creative", "Dramatic"),
        description = "Radiant and theatrical, Leo commands attention and leads with warmth and generosity.",
    ),
    VIRGO(
        displayName = "Virgo",
        symbol = "♍",
        element = Element.EARTH,
        modality = Modality.MUTABLE,
        rulingPlanet = "Mercury",
        startDay = 23, startMonth = 8,
        endDay = 22, endMonth = 9,
        traits = listOf("Analytical", "Practical", "Diligent", "Perfectionist"),
        description = "Detail-oriented and methodical, Virgo strives for perfection and is always ready to serve.",
    ),
    LIBRA(
        displayName = "Libra",
        symbol = "♎",
        element = Element.AIR,
        modality = Modality.CARDINAL,
        rulingPlanet = "Venus",
        startDay = 23, startMonth = 9,
        endDay = 22, endMonth = 10,
        traits = listOf("Diplomatic", "Fair-minded", "Social", "Indecisive"),
        description = "The scales of balance — Libra seeks harmony, justice, and beauty in all aspects of life.",
    ),
    SCORPIO(
        displayName = "Scorpio",
        symbol = "♏",
        element = Element.WATER,
        modality = Modality.FIXED,
        rulingPlanet = "Pluto",
        startDay = 23, startMonth = 10,
        endDay = 21, endMonth = 11,
        traits = listOf("Passionate", "Resourceful", "Determined", "Secretive"),
        description = "Intense and transformative, Scorpio dives deep beneath the surface to uncover hidden truths.",
    ),
    SAGITTARIUS(
        displayName = "Sagittarius",
        symbol = "♐",
        element = Element.FIRE,
        modality = Modality.MUTABLE,
        rulingPlanet = "Jupiter",
        startDay = 22, startMonth = 11,
        endDay = 21, endMonth = 12,
        traits = listOf("Optimistic", "Adventurous", "Philosophical", "Tactless"),
        description = "The eternal wanderer, Sagittarius seeks wisdom through exploration, philosophy, and adventure.",
    ),
    CAPRICORN(
        displayName = "Capricorn",
        symbol = "♑",
        element = Element.EARTH,
        modality = Modality.CARDINAL,
        rulingPlanet = "Saturn",
        startDay = 22, startMonth = 12,
        endDay = 19, endMonth = 1,
        traits = listOf("Ambitious", "Disciplined", "Responsible", "Pessimistic"),
        description = "The determined climber, Capricorn scales any mountain through sheer discipline and ambition.",
    ),
    AQUARIUS(
        displayName = "Aquarius",
        symbol = "♒",
        element = Element.AIR,
        modality = Modality.FIXED,
        rulingPlanet = "Uranus",
        startDay = 20, startMonth = 1,
        endDay = 18, endMonth = 2,
        traits = listOf("Progressive", "Original", "Independent", "Aloof"),
        description = "The visionary humanitarian, Aquarius thinks ahead of its time and champions collective progress.",
    ),
    PISCES(
        displayName = "Pisces",
        symbol = "♓",
        element = Element.WATER,
        modality = Modality.MUTABLE,
        rulingPlanet = "Neptune",
        startDay = 19, startMonth = 2,
        endDay = 20, endMonth = 3,
        traits = listOf("Compassionate", "Intuitive", "Artistic", "Escapist"),
        description = "Dreamy and empathic, Pisces exists at the boundary of the material and spiritual worlds.",
    );

    enum class Element(val displayName: String, val color: Long) {
        FIRE("Fire", 0xFFE53935),
        EARTH("Earth", 0xFF43A047),
        AIR("Air", 0xFF1E88E5),
        WATER("Water", 0xFF00897B),
    }

    enum class Modality(val displayName: String) {
        CARDINAL("Cardinal"),
        FIXED("Fixed"),
        MUTABLE("Mutable"),
    }

    companion object {
        fun fromBirthDate(month: Int, day: Int): ZodiacSign = entries.first { sign ->
            if (sign.startMonth == sign.endMonth) {
                month == sign.startMonth && day in sign.startDay..sign.endDay
            } else if (month == sign.startMonth) {
                day >= sign.startDay
            } else {
                month == sign.endMonth && day <= sign.endDay
            }
        }
    }
}
