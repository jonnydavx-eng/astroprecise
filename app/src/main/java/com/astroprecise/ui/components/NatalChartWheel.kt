package com.astroprecise.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.astroprecise.data.model.AspectType
import com.astroprecise.data.model.BirthChart
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.ui.theme.AuroraGreen
import com.astroprecise.ui.theme.FireRed
import com.astroprecise.ui.theme.GlowGold
import com.astroprecise.ui.theme.MoonSilver
import com.astroprecise.ui.theme.SpaceBlue
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun NatalChartWheel(
    chart: BirthChart,
    modifier: Modifier = Modifier,
) {
    val textMeasurer = rememberTextMeasurer()

    Canvas(modifier = modifier.aspectRatio(1f)) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val totalR = size.minDimension / 2f - 6.dp.toPx()

        // Radii for each ring layer (outside → in)
        val rZO = totalR              // zodiac outer
        val rZI = totalR * 0.78f     // zodiac inner / house outer
        val rHI = totalR * 0.54f     // house inner
        val rPlanet = totalR * 0.66f // planet glyph placement
        val rInner = totalR * 0.48f  // inner filled circle

        val ascSignIdx = ZodiacSign.entries
            .indexOfFirst { it.displayName == chart.risingSign }.coerceAtLeast(0)
        val ascDeg = ascSignIdx * 30.0 + (chart.houses.firstOrNull()?.degree ?: 0.0)

        // Ecliptic longitude → Android canvas angle (traditional chart: ASC=left, CCW progression)
        fun toCanvas(ecl: Double): Float = ((180.0 - ecl + ascDeg + 360.0) % 360.0).toFloat()

        fun polar(deg: Float, r: Float) = Offset(
            center.x + r * cos(Math.toRadians(deg.toDouble())).toFloat(),
            center.y + r * sin(Math.toRadians(deg.toDouble())).toFloat(),
        )

        fun donutSector(inner: Float, outer: Float, start: Float, sweep: Float): Path = Path().apply {
            val sr = Math.toRadians(start.toDouble())
            val er = Math.toRadians((start + sweep).toDouble())
            moveTo(center.x + inner * cos(sr).toFloat(), center.y + inner * sin(sr).toFloat())
            lineTo(center.x + outer * cos(sr).toFloat(), center.y + outer * sin(sr).toFloat())
            arcTo(Rect(center.x - outer, center.y - outer, center.x + outer, center.y + outer), start, sweep, false)
            lineTo(center.x + inner * cos(er).toFloat(), center.y + inner * sin(er).toFloat())
            arcTo(Rect(center.x - inner, center.y - inner, center.x + inner, center.y + inner), start + sweep, -sweep, false)
            close()
        }

        // Inner background
        drawCircle(SpaceBlue, rInner, center)

        // Aspect lines
        chart.aspects.filter { it.type.nature != AspectType.Nature.NEUTRAL }.take(12).forEach { asp ->
            val p1 = chart.planets.firstOrNull { it.name == asp.planet1 } ?: return@forEach
            val p2 = chart.planets.firstOrNull { it.name == asp.planet2 } ?: return@forEach
            val idx1 = ZodiacSign.entries.indexOfFirst { it.displayName == p1.sign }.coerceAtLeast(0)
            val idx2 = ZodiacSign.entries.indexOfFirst { it.displayName == p2.sign }.coerceAtLeast(0)
            val lineColor = when (asp.type.nature) {
                AspectType.Nature.HARMONIOUS -> AuroraGreen.copy(alpha = 0.35f)
                AspectType.Nature.CHALLENGING -> FireRed.copy(alpha = 0.35f)
                else -> MoonSilver.copy(alpha = 0.1f)
            }
            drawLine(
                lineColor,
                polar(toCanvas(idx1 * 30.0 + p1.degree), rInner * 0.88f),
                polar(toCanvas(idx2 * 30.0 + p2.degree), rInner * 0.88f),
                strokeWidth = 0.6.dp.toPx(),
            )
        }

        // House ring
        for (i in 0 until 12) {
            val sectorStart = toCanvas(ascDeg + (i + 1) * 30.0)
            drawPath(donutSector(rHI, rZI, sectorStart, 30f), if (i % 2 == 0) Color(0x0DFFFFFF) else Color(0x17FFFFFF))
            val midAngle = toCanvas(ascDeg + i * 30.0 + 15.0)
            val pos = polar(midAngle, (rHI + rZI) / 2f)
            val m = textMeasurer.measure(
                "${i + 1}",
                style = TextStyle(fontSize = 8.sp, color = MoonSilver.copy(alpha = 0.5f), fontFamily = FontFamily.Default),
            )
            drawText(m, topLeft = Offset(pos.x - m.size.width / 2f, pos.y - m.size.height / 2f))
        }

        // Zodiac sign ring
        ZodiacSign.entries.forEachIndexed { i, sign ->
            val sectorStart = toCanvas((i + 1) * 30.0)
            drawPath(donutSector(rZI, rZO, sectorStart, 30f), Color(sign.element.color).copy(alpha = 0.18f))
            val midAngle = toCanvas(i * 30.0 + 15.0)
            val pos = polar(midAngle, (rZI + rZO) / 2f)
            val m = textMeasurer.measure(
                sign.symbol,
                style = TextStyle(fontSize = 10.sp, color = Color(sign.element.color).copy(alpha = 0.9f), fontFamily = FontFamily.Default),
            )
            drawText(m, topLeft = Offset(pos.x - m.size.width / 2f, pos.y - m.size.height / 2f))
        }

        // Ring borders
        val thin = 0.6.dp.toPx()
        drawCircle(MoonSilver.copy(alpha = 0.5f), rZO, center, style = Stroke(thin))
        drawCircle(MoonSilver.copy(alpha = 0.5f), rZI, center, style = Stroke(thin))
        drawCircle(MoonSilver.copy(alpha = 0.3f), rHI, center, style = Stroke(thin))
        drawCircle(MoonSilver.copy(alpha = 0.2f), rInner, center, style = Stroke(thin))

        // House cusp lines — angular houses (1, 4, 7, 10) in gold
        for (i in 0 until 12) {
            val angle = toCanvas(ascDeg + i * 30.0)
            val isAngular = i % 3 == 0
            drawLine(
                color = if (isAngular) GlowGold.copy(alpha = 0.7f) else MoonSilver.copy(alpha = 0.2f),
                start = polar(angle, rHI),
                end = polar(angle, rZO),
                strokeWidth = if (isAngular) 1.dp.toPx() else thin,
            )
        }

        // Planet glyphs
        chart.planets.forEach { planet ->
            val signIdx = ZodiacSign.entries.indexOfFirst { it.displayName == planet.sign }.coerceAtLeast(0)
            val angle = toCanvas(signIdx * 30.0 + planet.degree)
            val pos = polar(angle, rPlanet)
            drawCircle(SpaceBlue, 9.dp.toPx(), pos)
            val m = textMeasurer.measure(
                planet.symbol,
                style = TextStyle(fontSize = 11.sp, color = GlowGold, fontFamily = FontFamily.Default),
            )
            drawText(m, topLeft = Offset(pos.x - m.size.width / 2f, pos.y - m.size.height / 2f))
            drawLine(MoonSilver.copy(alpha = 0.25f), polar(angle, rZI), polar(angle, rZI - 4.dp.toPx()), strokeWidth = thin)
        }

        // ASC / DSC labels
        listOf("ASC" to toCanvas(ascDeg), "DSC" to toCanvas(ascDeg + 180.0)).forEach { (label, angle) ->
            val pos = polar(angle, rHI - 11.dp.toPx())
            val m = textMeasurer.measure(label, style = TextStyle(fontSize = 7.sp, color = GlowGold))
            drawText(m, topLeft = Offset(pos.x - m.size.width / 2f, pos.y - m.size.height / 2f))
        }

        // Center dot
        drawCircle(GlowGold, 3.dp.toPx(), center)
    }
}
