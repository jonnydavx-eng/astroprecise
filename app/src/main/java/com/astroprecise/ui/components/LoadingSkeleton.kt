package com.astroprecise.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun shimmerBrush(): Brush {
    val shimmerColors = listOf(
        Color.White.copy(alpha = 0.04f),
        Color.White.copy(alpha = 0.14f),
        Color.White.copy(alpha = 0.04f),
    )
    val transition = rememberInfiniteTransition(label = "shimmer")
    val pos by transition.animateFloat(
        initialValue = -600f,
        targetValue = 1400f,
        animationSpec = infiniteRepeatable(tween(1400, easing = LinearEasing), RepeatMode.Restart),
        label = "shimmer_pos",
    )
    return Brush.linearGradient(shimmerColors, start = Offset(pos, pos), end = Offset(pos + 600f, pos + 600f))
}

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 8.dp,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(shimmerBrush()),
    )
}

@Composable
fun ShimmerCircle(size: Dp) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(shimmerBrush()),
    )
}

@Composable
fun HomeScreenSkeleton() {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
        Spacer(Modifier.height(32.dp))
        ShimmerBox(modifier = Modifier.width(140.dp).height(16.dp))
        Spacer(Modifier.height(8.dp))
        ShimmerBox(modifier = Modifier.width(260.dp).height(32.dp), cornerRadius = 8.dp)
        Spacer(Modifier.height(32.dp))
        ShimmerCircle(size = 260.dp)
        Spacer(Modifier.height(24.dp))
        ShimmerBox(modifier = Modifier.fillMaxWidth().height(240.dp), cornerRadius = 20.dp)
        Spacer(Modifier.height(16.dp))
        ShimmerBox(modifier = Modifier.fillMaxWidth().height(120.dp), cornerRadius = 20.dp)
    }
}

@Composable
fun PlanetCardSkeleton() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(shimmerBrush())
            .padding(16.dp),
    ) {
        ShimmerCircle(size = 48.dp)
        Spacer(Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            ShimmerBox(modifier = Modifier.width(100.dp).height(14.dp))
            Spacer(Modifier.height(6.dp))
            ShimmerBox(modifier = Modifier.width(160.dp).height(12.dp))
            Spacer(Modifier.height(6.dp))
            Row {
                ShimmerBox(modifier = Modifier.width(60.dp).height(20.dp), cornerRadius = 50.dp)
                Spacer(Modifier.width(4.dp))
                ShimmerBox(modifier = Modifier.width(60.dp).height(20.dp), cornerRadius = 50.dp)
            }
        }
    }
}
