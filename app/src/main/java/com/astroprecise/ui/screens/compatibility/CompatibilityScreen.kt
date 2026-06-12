package com.astroprecise.ui.screens.compatibility

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.astroprecise.data.model.CompatibilityResult
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.ui.components.SectionHeader
import com.astroprecise.ui.theme.CosmicViolet
import com.astroprecise.ui.theme.GlowGold

@Composable
fun CompatibilityScreen(viewModel: CompatibilityViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
    ) {
        Spacer(Modifier.height(32.dp))
        Text(
            text = "Compatibility",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            text = "Discover your cosmic connections",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(24.dp))

        SignPickerRow(
            sign1 = uiState.sign1,
            sign2 = uiState.sign2,
            onSign1Change = viewModel::setSign1,
            onSign2Change = viewModel::setSign2,
        )

        uiState.result?.let { result ->
            Spacer(Modifier.height(28.dp))
            OverallScoreCard(result)
            Spacer(Modifier.height(16.dp))
            CategoryScoresCard(result)
            Spacer(Modifier.height(24.dp))
            SectionHeader("Readings")
            Spacer(Modifier.height(12.dp))
            ReadingCard("Overall", result.overallReading)
            Spacer(Modifier.height(10.dp))
            ReadingCard("Love & Romance", result.loveReading)
            Spacer(Modifier.height(10.dp))
            ReadingCard("Friendship", result.friendshipReading)
            Spacer(Modifier.height(10.dp))
            ReadingCard("Communication", result.communicationReading)
            Spacer(Modifier.height(16.dp))
            AdviceCard(result.advice)
        }

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun SignPickerRow(
    sign1: ZodiacSign,
    sign2: ZodiacSign,
    onSign1Change: (ZodiacSign) -> Unit,
    onSign2Change: (ZodiacSign) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        SignPicker(selected = sign1, onSelect = onSign1Change, modifier = Modifier.weight(1f))
        Text("💫", style = MaterialTheme.typography.headlineSmall)
        SignPicker(selected = sign2, onSelect = onSign2Change, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun SignPicker(
    selected: ZodiacSign,
    onSelect: (ZodiacSign) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        Card(
            onClick = { expanded = true },
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(12.dp).fillMaxWidth(),
            ) {
                Text(selected.symbol, style = MaterialTheme.typography.displaySmall, color = GlowGold)
                Text(
                    text = selected.displayName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            ZodiacSign.entries.forEach { sign ->
                DropdownMenuItem(
                    text = { Text("${sign.symbol} ${sign.displayName}") },
                    onClick = { onSelect(sign); expanded = false },
                )
            }
        }
    }
}

@Composable
private fun OverallScoreCard(result: CompatibilityResult) {
    val animatedScore by animateIntAsState(
        targetValue = result.overallScore,
        animationSpec = tween(900, easing = FastOutSlowInEasing),
        label = "overallScore",
    )

    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp).fillMaxWidth(),
        ) {
            Text(
                text = "${result.sign1.symbol}  ×  ${result.sign2.symbol}",
                style = MaterialTheme.typography.headlineMedium,
            )
            Spacer(Modifier.height(20.dp))
            Box(contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { animatedScore / 100f },
                    modifier = Modifier.size(120.dp),
                    strokeWidth = 8.dp,
                    trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
                    color = scoreColor(result.overallScore),
                )
                Text(
                    text = "$animatedScore%",
                    style = MaterialTheme.typography.headlineLarge,
                    fontWeight = FontWeight.Bold,
                    color = scoreColor(result.overallScore),
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                text = result.scoreLabel,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "${result.sign1.displayName} + ${result.sign2.displayName}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun CategoryScoresCard(result: CompatibilityResult) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            ScoreBar("♥ Love", result.loveScore)
            Spacer(Modifier.height(14.dp))
            ScoreBar("★ Friendship", result.friendshipScore)
            Spacer(Modifier.height(14.dp))
            ScoreBar("⚡ Communication", result.communicationScore)
            Spacer(Modifier.height(14.dp))
            ScoreBar("♦ Values", result.valuesScore)
        }
    }
}

@Composable
private fun ScoreBar(label: String, score: Int) {
    val animatedProgress by animateFloatAsState(
        targetValue = score / 100f,
        animationSpec = tween(900, easing = FastOutSlowInEasing),
        label = "scoreBar",
    )
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(text = label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            Text(text = "$score%", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = scoreColor(score))
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { animatedProgress },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f),
            color = scoreColor(score),
        )
    }
}

@Composable
private fun ReadingCard(title: String, text: String) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = GlowGold)
            Spacer(Modifier.height(6.dp))
            Text(text = text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f))
        }
    }
}

@Composable
private fun AdviceCard(advice: String) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = CosmicViolet.copy(alpha = 0.15f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(text = "✦ Cosmic Advice", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = GlowGold)
            Spacer(Modifier.height(8.dp))
            Text(text = advice, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.9f))
        }
    }
}

private fun scoreColor(score: Int): Color = when {
    score >= 80 -> Color(0xFF4ADE80)
    score >= 65 -> Color(0xFFFBBF24)
    score >= 50 -> Color(0xFFF97316)
    else -> Color(0xFFEF4444)
}
