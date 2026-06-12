package com.astroprecise.ui.screens.profile

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.astroprecise.ui.components.SectionHeader
import com.astroprecise.ui.theme.CosmicViolet
import com.astroprecise.ui.theme.GlowGold

@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        if (uiState.isLoading) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
        } else {
            ProfileContent(uiState, viewModel)
        }
    }
}

@Composable
private fun ProfileContent(uiState: ProfileUiState, viewModel: ProfileViewModel) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
    ) {
        Spacer(Modifier.height(32.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "My Profile",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            if (!uiState.isEditing) {
                FilledTonalButton(onClick = viewModel::startEditing) {
                    Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                    Text(" Edit", style = MaterialTheme.typography.labelLarge)
                }
            }
        }

        Spacer(Modifier.height(24.dp))

        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(CosmicViolet.copy(alpha = 0.3f))
                .align(Alignment.CenterHorizontally),
        ) {
            Text(
                text = uiState.profile.sunSign.symbol,
                style = MaterialTheme.typography.displayMedium,
                color = GlowGold,
            )
        }

        Spacer(Modifier.height(16.dp))

        if (uiState.profile.isComplete) {
            Text(
                text = uiState.profile.name,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
            Text(
                text = uiState.profile.sunSign.displayName,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        }

        Spacer(Modifier.height(32.dp))

        if (uiState.isEditing) {
            EditForm(uiState, viewModel)
        } else {
            ProfileDisplay(uiState)
        }

        Spacer(Modifier.height(32.dp))

        NotificationsSection(uiState, viewModel)

        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun ProfileDisplay(uiState: ProfileUiState) {
    val profile = uiState.profile

    SectionHeader("Birth Details")
    Spacer(Modifier.height(16.dp))

    if (profile.isComplete) {
        ProfileRow("Date of Birth", profile.birthDateDisplay)
        ProfileRow("Time of Birth", profile.birthTimeDisplay)
        ProfileRow("Place of Birth", profile.birthCity)
        ProfileRow("Sun Sign", "${profile.sunSign.symbol} ${profile.sunSign.displayName}")
        ProfileRow("Element", "${profile.sunSign.element.displayName} Sign")
        ProfileRow("Ruling Planet", profile.sunSign.rulingPlanet)
    } else {
        Text(
            text = "No birth details yet. Tap Edit to add your information.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Text(text = label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurface)
    }
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)))
}

@Composable
private fun EditForm(uiState: ProfileUiState, viewModel: ProfileViewModel) {
    SectionHeader("Personal Info")
    Spacer(Modifier.height(12.dp))

    OutlinedTextField(
        value = uiState.editName,
        onValueChange = viewModel::updateName,
        label = { Text("Your Name") },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
        shape = RoundedCornerShape(12.dp),
    )

    Spacer(Modifier.height(24.dp))
    SectionHeader("Birth Date")
    Spacer(Modifier.height(12.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = uiState.editDay.toString(),
            onValueChange = { it.toIntOrNull()?.let(viewModel::updateDay) },
            label = { Text("Day") },
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
        OutlinedTextField(
            value = uiState.editMonth.toString(),
            onValueChange = { it.toIntOrNull()?.let(viewModel::updateMonth) },
            label = { Text("Month") },
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
        OutlinedTextField(
            value = uiState.editYear.toString(),
            onValueChange = { it.toIntOrNull()?.let(viewModel::updateYear) },
            label = { Text("Year") },
            modifier = Modifier.weight(1.5f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
    }

    Spacer(Modifier.height(16.dp))
    SectionHeader("Birth Time (24h)")
    Spacer(Modifier.height(12.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = uiState.editHour.toString(),
            onValueChange = { it.toIntOrNull()?.let(viewModel::updateHour) },
            label = { Text("Hour (0–23)") },
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
        OutlinedTextField(
            value = uiState.editMinute.toString(),
            onValueChange = { it.toIntOrNull()?.let(viewModel::updateMinute) },
            label = { Text("Minute") },
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
    }

    Spacer(Modifier.height(16.dp))
    SectionHeader("Birth Location")
    Spacer(Modifier.height(12.dp))

    OutlinedTextField(
        value = uiState.editCity,
        onValueChange = viewModel::updateCity,
        label = { Text("City of Birth") },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
        shape = RoundedCornerShape(12.dp),
    )
    Spacer(Modifier.height(8.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(
            value = uiState.editLatitude.toString(),
            onValueChange = { it.toDoubleOrNull()?.let(viewModel::updateLatitude) },
            label = { Text("Latitude") },
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
            shape = RoundedCornerShape(12.dp),
        )
        OutlinedTextField(
            value = uiState.editLongitude.toString(),
            onValueChange = { it.toDoubleOrNull()?.let(viewModel::updateLongitude) },
            label = { Text("Longitude") },
            modifier = Modifier.weight(1f),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Done),
            shape = RoundedCornerShape(12.dp),
        )
    }

    Spacer(Modifier.height(32.dp))

    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
        TextButton(onClick = viewModel::cancelEditing, modifier = Modifier.weight(1f)) {
            Text("Cancel")
        }
        Button(
            onClick = viewModel::saveProfile,
            enabled = !uiState.isSaving,
            modifier = Modifier.weight(1f),
        ) {
            if (uiState.isSaving) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
            } else {
                Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                Text(" Save Profile")
            }
        }
    }
}

@Composable
private fun NotificationsSection(uiState: ProfileUiState, viewModel: ProfileViewModel) {
    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) viewModel.setNotificationsEnabled(true)
    }

    SectionHeader("Notifications")
    Spacer(Modifier.height(12.dp))

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Daily Horoscope",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = "Get your cosmic guidance each morning",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = uiState.notifEnabled,
                    onCheckedChange = { enabled ->
                        if (enabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            permLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        } else {
                            viewModel.setNotificationsEnabled(enabled)
                        }
                    },
                )
            }

            if (uiState.notifEnabled) {
                Spacer(Modifier.height(16.dp))
                Text(
                    text = "Notification Time (24h)",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = uiState.notifHour.toString().padStart(2, '0'),
                        onValueChange = { it.toIntOrNull()?.let(viewModel::updateNotifHour) },
                        label = { Text("Hour") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        shape = RoundedCornerShape(12.dp),
                    )
                    Text(
                        text = ":",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    OutlinedTextField(
                        value = uiState.notifMinute.toString().padStart(2, '0'),
                        onValueChange = { it.toIntOrNull()?.let(viewModel::updateNotifMinute) },
                        label = { Text("Minute") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                        shape = RoundedCornerShape(12.dp),
                    )
                    FilledTonalButton(onClick = viewModel::saveNotificationTime) {
                        Text("Set")
                    }
                }
            }
        }
    }
}
