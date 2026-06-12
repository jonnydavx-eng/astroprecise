package com.astroprecise.ui.screens.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.astroprecise.ui.components.ZodiacWheel
import com.astroprecise.ui.theme.CosmicViolet
import com.astroprecise.ui.theme.GlowGold
import kotlinx.coroutines.launch

@Composable
fun OnboardingScreen(
    onComplete: () -> Unit,
    viewModel: OnboardingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val pagerState = rememberPagerState(pageCount = { 4 })
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        HorizontalPager(
            state = pagerState,
            userScrollEnabled = false,
            modifier = Modifier.fillMaxSize().padding(bottom = 140.dp),
        ) { page ->
            when (page) {
                0 -> WelcomePage()
                1 -> NameAndDatePage(uiState, viewModel)
                2 -> BirthTimePage(uiState, viewModel)
                3 -> BirthLocationPage(uiState, viewModel)
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 32.dp),
        ) {
            PageDots(current = pagerState.currentPage, total = 4)
            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (pagerState.currentPage > 0) {
                    TextButton(
                        onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } },
                        modifier = Modifier.weight(1f),
                    ) {
                        Text("Back")
                    }
                }
                Button(
                    onClick = {
                        if (pagerState.currentPage < 3) {
                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                        } else {
                            viewModel.completeOnboarding(onComplete)
                        }
                    },
                    enabled = !uiState.isSaving,
                    modifier = Modifier.weight(if (pagerState.currentPage > 0) 2f else 1f),
                    colors = ButtonDefaults.buttonColors(containerColor = CosmicViolet),
                ) {
                    if (uiState.isSaving) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp, color = GlowGold)
                    } else {
                        AnimatedContent(
                            targetState = pagerState.currentPage == 3,
                            transitionSpec = { fadeIn() togetherWith fadeOut() },
                            label = "btn_text",
                        ) { isLast ->
                            Text(if (isLast) "Begin My Journey ✨" else "Next →")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PageDots(current: Int, total: Int) {
    Row(
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth(),
    ) {
        repeat(total) { i ->
            val isActive = i == current
            Box(
                modifier = Modifier
                    .padding(horizontal = 4.dp)
                    .size(if (isActive) 10.dp else 6.dp)
                    .clip(CircleShape)
                    .background(if (isActive) GlowGold else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f)),
            )
        }
    }
}

@Composable
private fun WelcomePage() {
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        ZodiacWheel(size = 220.dp)
        Spacer(Modifier.height(32.dp))
        Text(
            text = "AstroPrecise",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            color = GlowGold,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = "Discover Your Cosmic Blueprint",
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Personalized birth charts, daily horoscopes, and planetary insights — calculated with precision from the moment you were born.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun NameAndDatePage(uiState: OnboardingUiState, viewModel: OnboardingViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        PageHeader("About You", "Your name and birth date let us calculate your Sun sign and generate a personalized experience.")
        OutlinedTextField(
            value = uiState.name,
            onValueChange = viewModel::updateName,
            label = { Text("Your Name") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
        Spacer(Modifier.height(20.dp))
        SectionLabel("Date of Birth")
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = uiState.birthDay.toString(),
                onValueChange = { it.toIntOrNull()?.let(viewModel::updateDay) },
                label = { Text("Day") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                shape = RoundedCornerShape(12.dp),
            )
            OutlinedTextField(
                value = uiState.birthMonth.toString(),
                onValueChange = { it.toIntOrNull()?.let(viewModel::updateMonth) },
                label = { Text("Month") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                shape = RoundedCornerShape(12.dp),
            )
            OutlinedTextField(
                value = uiState.birthYear.toString(),
                onValueChange = { it.toIntOrNull()?.let(viewModel::updateYear) },
                label = { Text("Year") },
                modifier = Modifier.weight(1.5f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                shape = RoundedCornerShape(12.dp),
            )
        }
    }
}

@Composable
private fun BirthTimePage(uiState: OnboardingUiState, viewModel: OnboardingViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        PageHeader("Birth Time", "Your exact birth time determines your rising sign and house positions. Enter in 24-hour format.")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(
                value = uiState.birthHour.toString(),
                onValueChange = { it.toIntOrNull()?.let(viewModel::updateHour) },
                label = { Text("Hour (0–23)") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                shape = RoundedCornerShape(12.dp),
            )
            OutlinedTextField(
                value = uiState.birthMinute.toString(),
                onValueChange = { it.toIntOrNull()?.let(viewModel::updateMinute) },
                label = { Text("Minute (0–59)") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                shape = RoundedCornerShape(12.dp),
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            text = "Don't know your exact time? Use 12:00 — your Sun sign and planets will still be accurate.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun BirthLocationPage(uiState: OnboardingUiState, viewModel: OnboardingViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        PageHeader("Birth Location", "Your birthplace is used to calculate your Ascendant and house positions precisely.")
        OutlinedTextField(
            value = uiState.birthCity,
            onValueChange = viewModel::updateCity,
            label = { Text("City of Birth") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
        Spacer(Modifier.height(12.dp))
        SectionLabel("Coordinates (optional)")
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = if (uiState.birthLatitude == 0.0) "" else uiState.birthLatitude.toString(),
                onValueChange = { it.toDoubleOrNull()?.let(viewModel::updateLatitude) },
                label = { Text("Latitude") },
                placeholder = { Text("e.g. 51.5") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
                shape = RoundedCornerShape(12.dp),
            )
            OutlinedTextField(
                value = if (uiState.birthLongitude == 0.0) "" else uiState.birthLongitude.toString(),
                onValueChange = { it.toDoubleOrNull()?.let(viewModel::updateLongitude) },
                label = { Text("Longitude") },
                placeholder = { Text("e.g. -0.12") },
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
                shape = RoundedCornerShape(12.dp),
            )
        }
        Spacer(Modifier.height(8.dp))
        Text(
            text = "Coordinates improve accuracy. You can update these later in Profile.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun PageHeader(title: String, subtitle: String) {
    Column(modifier = Modifier.padding(bottom = 28.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text = text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
}
