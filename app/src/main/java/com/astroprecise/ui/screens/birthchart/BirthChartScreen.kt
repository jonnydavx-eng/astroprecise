package com.astroprecise.ui.screens.birthchart

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.astroprecise.data.model.Aspect
import com.astroprecise.data.model.AspectType
import com.astroprecise.data.model.BirthChart
import com.astroprecise.data.model.House
import com.astroprecise.ui.components.PlanetCard
import com.astroprecise.ui.components.SectionHeader
import com.astroprecise.ui.components.ZodiacWheel
import com.astroprecise.ui.theme.GlassOverlay
import com.astroprecise.ui.theme.GlowGold

@Composable
fun BirthChartScreen(viewModel: BirthChartViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when {
            uiState.isLoading -> CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            !uiState.userProfile.isComplete -> SetupPrompt(modifier = Modifier.align(Alignment.Center))
            uiState.birthChart != null -> BirthChartContent(
                chart = uiState.birthChart!!,
                selectedTab = uiState.selectedTab,
                onTabSelected = viewModel::selectTab,
            )
        }
    }
}

@Composable
private fun BirthChartContent(
    chart: BirthChart,
    selectedTab: Int,
    onTabSelected: (Int) -> Unit,
) {
    val tabs = listOf("Overview", "Planets", "Houses", "Aspects")

    Column(modifier = Modifier.fillMaxSize()) {
        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.background,
            contentColor = MaterialTheme.colorScheme.primary,
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { onTabSelected(index) },
                    text = { Text(title) },
                )
            }
        }

        when (selectedTab) {
            0 -> OverviewTab(chart)
            1 -> PlanetsTab(chart)
            2 -> HousesTab(chart)
            3 -> AspectsTab(chart)
        }
    }
}

@Composable
private fun OverviewTab(chart: BirthChart) {
    LazyColumn(
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            ZodiacWheel(size = 240.dp, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp))
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                BigThreeCard("Sun", "☉", chart.sunSign, modifier = Modifier.weight(1f))
                BigThreeCard("Moon", "☽", chart.moonSign, modifier = Modifier.weight(1f))
                BigThreeCard("Rising", "⬆", chart.risingSign, modifier = Modifier.weight(1f))
            }
        }
        item {
            SectionHeader("The Big Three")
        }
        item {
            Text(
                text = "Your Sun in ${chart.sunSign} defines your core identity and ego. Your Moon in ${chart.moonSign} governs your emotional world. Your ${chart.risingSign} Rising shapes how others perceive you.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
            )
        }
    }
}

@Composable
private fun BigThreeCard(label: String, symbol: String, sign: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(text = symbol, style = MaterialTheme.typography.titleLarge, color = GlowGold)
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = sign,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun PlanetsTab(chart: BirthChart) {
    LazyColumn(
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { SectionHeader("Planetary Positions") }
        items(chart.planets) { planet ->
            PlanetCard(planet)
        }
    }
}

@Composable
private fun HousesTab(chart: BirthChart) {
    LazyColumn(
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        item { SectionHeader("House Placements") }
        items(chart.houses) { house ->
            HouseRow(house)
        }
    }
}

@Composable
private fun HouseRow(house: House) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(GlassOverlay, RoundedCornerShape(12.dp))
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "H${house.number}",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = GlowGold,
            modifier = Modifier.padding(end = 16.dp),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "${house.sign} ${String.format("%.1f", house.degree)}°",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = house.meaning,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AspectsTab(chart: BirthChart) {
    LazyColumn(
        contentPadding = PaddingValues(24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { SectionHeader("Planetary Aspects") }
        items(chart.aspects) { aspect ->
            AspectRow(aspect)
        }
    }
}

@Composable
private fun AspectRow(aspect: Aspect) {
    val color = when (aspect.type.nature) {
        AspectType.Nature.HARMONIOUS -> androidx.compose.ui.graphics.Color(0xFF059669)
        AspectType.Nature.CHALLENGING -> androidx.compose.ui.graphics.Color(0xFFE53935)
        AspectType.Nature.NEUTRAL -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(GlassOverlay, RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = "${aspect.planet1} ${aspect.type.symbol} ${aspect.planet2}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
        Column(horizontalAlignment = Alignment.End) {
            Text(text = aspect.type.displayName, style = MaterialTheme.typography.labelMedium, color = color)
            Text(text = "${String.format("%.1f", aspect.orb)}° orb", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SetupPrompt(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(text = "🔭", style = MaterialTheme.typography.displayLarge)
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Your Birth Chart Awaits",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Complete your profile with your birth date, time, and location to generate your personalized natal chart.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
