package com.astroprecise.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Stars
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.astroprecise.data.local.UserPreferences
import com.astroprecise.ui.screens.birthchart.BirthChartScreen
import com.astroprecise.ui.screens.home.HomeScreen
import com.astroprecise.ui.screens.horoscope.HoroscopeScreen
import com.astroprecise.ui.screens.onboarding.OnboardingScreen
import com.astroprecise.ui.screens.profile.ProfileScreen
import com.astroprecise.ui.theme.DeepSpace
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

sealed class Screen(val route: String, val label: String, val icon: ImageVector) {
    data object Home : Screen("home", "Home", Icons.Default.Home)
    data object BirthChart : Screen("birth_chart", "Chart", Icons.Default.AutoAwesome)
    data object Horoscope : Screen("horoscope", "Horoscope", Icons.Default.Stars)
    data object Profile : Screen("profile", "Profile", Icons.Default.Person)
}

private val bottomNavItems = listOf(Screen.Home, Screen.BirthChart, Screen.Horoscope, Screen.Profile)

@HiltViewModel
class AppNavigationViewModel @Inject constructor(
    userPreferences: UserPreferences,
) : ViewModel() {
    val startDestination: StateFlow<String?> = userPreferences.hasCompletedOnboarding
        .map { completed -> if (completed) Screen.Home.route else "onboarding" }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
}

@Composable
fun AppNavigation(viewModel: AppNavigationViewModel = hiltViewModel()) {
    val startDest by viewModel.startDestination.collectAsStateWithLifecycle()

    if (startDest == null) {
        Box(modifier = Modifier.fillMaxSize().background(DeepSpace))
        return
    }

    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination
    val currentRoute = currentDestination?.route
    val showBottomBar = bottomNavItems.any { it.route == currentRoute }

    Scaffold(
        bottomBar = {
            AnimatedVisibility(
                visible = showBottomBar,
                enter = slideInVertically { it },
                exit = slideOutVertically { it },
            ) {
                NavigationBar {
                    bottomNavItems.forEach { screen ->
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.label) },
                            label = { Text(screen.label) },
                            selected = currentDestination?.hierarchy?.any { it.route == screen.route } == true,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDest!!,
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(
                route = "onboarding",
                enterTransition = { fadeIn() },
                exitTransition = { fadeOut() },
            ) {
                OnboardingScreen(
                    onComplete = {
                        navController.navigate(Screen.Home.route) {
                            popUpTo("onboarding") { inclusive = true }
                        }
                    },
                )
            }
            composable(
                route = Screen.Home.route,
                enterTransition = { fadeIn() + slideInHorizontally { -40 } },
                exitTransition = { fadeOut() + slideOutHorizontally { -40 } },
            ) { HomeScreen() }
            composable(
                route = Screen.BirthChart.route,
                enterTransition = { fadeIn() + slideInHorizontally { -40 } },
                exitTransition = { fadeOut() + slideOutHorizontally { -40 } },
            ) { BirthChartScreen() }
            composable(
                route = Screen.Horoscope.route,
                enterTransition = { fadeIn() + slideInHorizontally { -40 } },
                exitTransition = { fadeOut() + slideOutHorizontally { -40 } },
            ) { HoroscopeScreen() }
            composable(
                route = Screen.Profile.route,
                enterTransition = { fadeIn() + slideInHorizontally { -40 } },
                exitTransition = { fadeOut() + slideOutHorizontally { -40 } },
            ) { ProfileScreen() }
        }
    }
}
