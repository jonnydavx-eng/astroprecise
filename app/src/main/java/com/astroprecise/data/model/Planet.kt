package com.astroprecise.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Planet(
    val name: String,
    val symbol: String,
    val sign: String,
    val degree: Double,
    val house: Int,
    val isRetrograde: Boolean = false,
    val keywords: List<String>,
    val meaning: String,
)

val CLASSICAL_PLANETS = listOf(
    "Sun" to "☉",
    "Moon" to "☽",
    "Mercury" to "☿",
    "Venus" to "♀",
    "Mars" to "♂",
    "Jupiter" to "♃",
    "Saturn" to "♄",
    "Uranus" to "⛢",
    "Neptune" to "♆",
    "Pluto" to "♇",
)

val PLANET_KEYWORDS = mapOf(
    "Sun" to listOf("Identity", "Ego", "Vitality"),
    "Moon" to listOf("Emotions", "Intuition", "Subconscious"),
    "Mercury" to listOf("Communication", "Intellect", "Travel"),
    "Venus" to listOf("Love", "Beauty", "Harmony"),
    "Mars" to listOf("Action", "Desire", "Energy"),
    "Jupiter" to listOf("Expansion", "Luck", "Wisdom"),
    "Saturn" to listOf("Discipline", "Karma", "Structure"),
    "Uranus" to listOf("Innovation", "Rebellion", "Change"),
    "Neptune" to listOf("Dreams", "Illusion", "Spirituality"),
    "Pluto" to listOf("Transformation", "Power", "Rebirth"),
)
