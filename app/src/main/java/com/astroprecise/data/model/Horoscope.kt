package com.astroprecise.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Horoscope(
    val sign: String,
    val period: Period,
    val date: String,
    val general: String,
    val love: String,
    val career: String,
    val wellness: String,
    val luckyNumber: Int,
    val luckyColor: String,
    val rating: Int,
) {
    enum class Period { DAILY, WEEKLY, MONTHLY }
}
