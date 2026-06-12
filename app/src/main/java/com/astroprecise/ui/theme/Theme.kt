package com.astroprecise.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = CosmicViolet,
    onPrimary = StarWhite,
    primaryContainer = NebulaPurple,
    onPrimaryContainer = MoonSilver,
    secondary = CelestialTeal,
    onSecondary = StarWhite,
    tertiary = StarGold,
    onTertiary = DeepSpace,
    background = DeepSpace,
    onBackground = MoonSilver,
    surface = SpaceBlue,
    onSurface = MoonSilver,
    surfaceVariant = CosmicCard,
    onSurfaceVariant = DimStar,
    outline = DimStar,
    error = FireRed,
)

private val LightColorScheme = lightColorScheme(
    primary = CosmicViolet,
    onPrimary = StarWhite,
    primaryContainer = CosmicLavender,
    onPrimaryContainer = NebulaPurple,
    secondary = CelestialTeal,
    onSecondary = StarWhite,
    tertiary = StarGold,
    onTertiary = DeepSpace,
    background = StarWhite,
    onBackground = SpaceBlue,
    surface = NebulaPink,
    onSurface = SpaceBlue,
    surfaceVariant = CosmicLavender,
    onSurfaceVariant = DimStar,
    outline = DimStar,
    error = FireRed,
)

@Composable
fun AstroPreciseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content,
    )
}
