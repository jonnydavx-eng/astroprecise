package com.astroprecise.data.model

import kotlinx.serialization.Serializable

@Serializable
data class BirthChart(
    val sunSign: String,
    val moonSign: String,
    val risingSign: String,
    val planets: List<Planet>,
    val houses: List<House>,
    val aspects: List<Aspect>,
)

@Serializable
data class House(
    val number: Int,
    val sign: String,
    val degree: Double,
    val meaning: String,
)

@Serializable
data class Aspect(
    val planet1: String,
    val planet2: String,
    val type: AspectType,
    val orb: Double,
    val isApplying: Boolean,
)

enum class AspectType(
    val displayName: String,
    val symbol: String,
    val angle: Double,
    val orb: Double,
    val nature: Nature,
) {
    CONJUNCTION("Conjunction", "☌", 0.0, 8.0, Nature.NEUTRAL),
    SEXTILE("Sextile", "⚹", 60.0, 4.0, Nature.HARMONIOUS),
    SQUARE("Square", "□", 90.0, 8.0, Nature.CHALLENGING),
    TRINE("Trine", "△", 120.0, 8.0, Nature.HARMONIOUS),
    OPPOSITION("Opposition", "☍", 180.0, 8.0, Nature.CHALLENGING);

    enum class Nature { HARMONIOUS, CHALLENGING, NEUTRAL }
}
