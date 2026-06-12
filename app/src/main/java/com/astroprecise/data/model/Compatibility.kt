package com.astroprecise.data.model

data class CompatibilityResult(
    val sign1: ZodiacSign,
    val sign2: ZodiacSign,
    val overallScore: Int,
    val loveScore: Int,
    val friendshipScore: Int,
    val communicationScore: Int,
    val valuesScore: Int,
    val overallReading: String,
    val loveReading: String,
    val friendshipReading: String,
    val communicationReading: String,
    val advice: String,
) {
    val scoreLabel: String get() = when {
        overallScore >= 90 -> "Cosmic Match ✨"
        overallScore >= 80 -> "Excellent"
        overallScore >= 70 -> "Very Good"
        overallScore >= 60 -> "Good"
        overallScore >= 50 -> "Moderate"
        else -> "Challenging"
    }
}
