package com.astroprecise.data.model

data class CurrentSkyData(
    val moonPhase: MoonPhase,
    val moonIllumination: Int,
    val moonSign: String,
    val retrogradeplanets: List<String>,
    val sunSign: String,
)

enum class MoonPhase(val displayName: String, val emoji: String) {
    NEW_MOON("New Moon", "🌑"),
    WAXING_CRESCENT("Waxing Crescent", "🌒"),
    FIRST_QUARTER("First Quarter", "🌓"),
    WAXING_GIBBOUS("Waxing Gibbous", "🌔"),
    FULL_MOON("Full Moon", "🌕"),
    WANING_GIBBOUS("Waning Gibbous", "🌖"),
    LAST_QUARTER("Last Quarter", "🌗"),
    WANING_CRESCENT("Waning Crescent", "🌘"),
}
