package com.astroprecise.data.model

import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    val name: String = "",
    val birthDay: Int = 1,
    val birthMonth: Int = 1,
    val birthYear: Int = 1990,
    val birthHour: Int = 12,
    val birthMinute: Int = 0,
    val birthCity: String = "",
    val birthLatitude: Double = 0.0,
    val birthLongitude: Double = 0.0,
) {
    val isComplete: Boolean
        get() = name.isNotBlank() && birthCity.isNotBlank()

    val sunSign: ZodiacSign
        get() = ZodiacSign.fromBirthDate(birthMonth, birthDay)

    val birthDateDisplay: String
        get() {
            val months = listOf(
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            )
            return "${months.getOrNull(birthMonth - 1) ?: ""} $birthDay, $birthYear"
        }

    val birthTimeDisplay: String
        get() {
            val period = if (birthHour < 12) "AM" else "PM"
            val hour = when {
                birthHour == 0 -> 12
                birthHour > 12 -> birthHour - 12
                else -> birthHour
            }
            return "$hour:${birthMinute.toString().padStart(2, '0')} $period"
        }
}
