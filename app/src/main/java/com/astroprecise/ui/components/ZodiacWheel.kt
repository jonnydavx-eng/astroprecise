package com.astroprecise.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.ui.theme.CosmicViolet
import com.astroprecise.ui.theme.GlassOverlay
import com.astroprecise.ui.theme.GlowGold
import com.astroprecise.ui.theme.MoonSilver

@Composable
fun ZodiacWheel(
    highlightedSign: ZodiacSign? = null,
    size: Dp = 280.dp,
    modifier: Modifier = Modifier,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "wheel")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(60_000), RepeatMode.Restart),
        label = "rotation",
    )
    val textMeasurer = rememberTextMeasurer()

    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier.size(size),
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(this.size.width / 2, this.size.height / 2)
            val outerRadius = this.size.minDimension / 2 - 4.dp.toPx()
            val innerRadius = outerRadius * 0.65f
            val symbolRadius = outerRadius * 0.835f

            rotate(rotation, center) {
                drawOuterRing(center, outerRadius, innerRadius, highlightedSign)
            }

            ZodiacSign.entries.forEachIndexed { index, sign ->
                val angle = Math.toRadians((index * 30.0 - 90 + rotation).toDouble())
                val symbolAngle = Math.toRadians((index * 30.0 + 15.0 - 90 + rotation).toDouble())
                val x = center.x + symbolRadius * Math.cos(symbolAngle).toFloat()
                val y = center.y + symbolRadius * Math.sin(symbolAngle).toFloat()

                val isHighlighted = sign == highlightedSign
                val textColor = if (isHighlighted) GlowGold else MoonSilver.copy(alpha = 0.8f)
                val measured = textMeasurer.measure(
                    sign.symbol,
                    style = TextStyle(
                        fontSize = if (isHighlighted) 14.sp else 12.sp,
                        color = textColor,
                        fontFamily = FontFamily.Default,
                    ),
                )
                drawText(measured, topLeft = Offset(x - measured.size.width / 2, y - measured.size.height / 2))
            }

            drawCircle(
                color = CosmicViolet.copy(alpha = 0.3f),
                radius = innerRadius,
                center = center,
            )
            drawCircle(
                color = GlowGold.copy(alpha = 0.6f),
                radius = 6.dp.toPx(),
                center = center,
            )
        }
    }
}

private fun DrawScope.drawOuterRing(
    center: Offset,
    outerRadius: Float,
    innerRadius: Float,
    highlightedSign: ZodiacSign?,
) {
    drawCircle(
        color = GlassOverlay,
        radius = outerRadius,
        center = center,
    )
    drawCircle(
        color = MoonSilver.copy(alpha = 0.4f),
        radius = outerRadius,
        center = center,
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx()),
    )
    drawCircle(
        color = MoonSilver.copy(alpha = 0.2f),
        radius = innerRadius,
        center = center,
        style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx()),
    )

    ZodiacSign.entries.forEachIndexed { index, sign ->
        val angle = Math.toRadians((index * 30.0 - 90).toDouble())
        val isHighlighted = sign == highlightedSign
        val tickColor = if (isHighlighted) GlowGold else MoonSilver.copy(alpha = 0.5f)
        val tickStart = Offset(
            center.x + innerRadius * Math.cos(angle).toFloat(),
            center.y + innerRadius * Math.sin(angle).toFloat(),
        )
        val tickEnd = Offset(
            center.x + outerRadius * Math.cos(angle).toFloat(),
            center.y + outerRadius * Math.sin(angle).toFloat(),
        )
        drawLine(tickColor, tickStart, tickEnd, strokeWidth = if (isHighlighted) 2.dp.toPx() else 1.dp.toPx(), cap = StrokeCap.Round)

        if (isHighlighted) {
            val midRadius = (outerRadius + innerRadius) / 2
            val arcStart = (index * 30.0 - 90).toFloat()
            drawArc(
                color = GlowGold.copy(alpha = 0.2f),
                startAngle = arcStart,
                sweepAngle = 30f,
                useCenter = true,
                topLeft = Offset(center.x - midRadius, center.y - midRadius),
                size = androidx.compose.ui.geometry.Size(midRadius * 2, midRadius * 2),
            )
        }
    }
}

@Composable
fun StarRatingBar(
    rating: Int,
    maxRating: Int = 5,
    modifier: Modifier = Modifier,
) {
    androidx.compose.foundation.layout.Row(modifier = modifier) {
        repeat(maxRating) { index ->
            androidx.compose.material3.Text(
                text = if (index < rating) "★" else "☆",
                style = androidx.compose.material3.MaterialTheme.typography.bodyLarge,
                color = if (index < rating) GlowGold else MoonSilver.copy(alpha = 0.4f),
            )
        }
    }
}
