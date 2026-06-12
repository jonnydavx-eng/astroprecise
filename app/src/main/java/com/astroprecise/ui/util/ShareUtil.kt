package com.astroprecise.ui.util

import android.content.Context
import android.content.Intent
import com.astroprecise.data.model.BirthChart
import com.astroprecise.data.model.Horoscope

fun Context.shareText(text: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    startActivity(Intent.createChooser(intent, null))
}

fun Horoscope.toShareText(): String = buildString {
    appendLine("${sign} Horoscope ✨  ${date}")
    appendLine()
    appendLine(general)
    appendLine()
    appendLine("♥ Love")
    appendLine(love)
    appendLine()
    appendLine("⚡ Career")
    appendLine(career)
    appendLine()
    appendLine("✦ Wellness")
    appendLine(wellness)
    appendLine()
    appendLine("Lucky Number: $luckyNumber  ·  Lucky Colour: $luckyColor")
    appendLine()
    append("— via AstroPrecise")
}

fun BirthChart.toShareText(): String = buildString {
    appendLine("My Birth Chart ✨")
    appendLine()
    appendLine("☉ Sun: $sunSign")
    appendLine("☽ Moon: $moonSign")
    appendLine("↑ Rising: $risingSign")
    appendLine()
    planets.forEach { p ->
        appendLine("${p.symbol} ${p.name}: ${p.sign} ${String.format("%.1f", p.degree)}° · House ${p.house}")
    }
    appendLine()
    append("— via AstroPrecise")
}
