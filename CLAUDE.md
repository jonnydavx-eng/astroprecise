# AstroPrecise — Android App

An astrology Android app built with Kotlin and Jetpack Compose. Provides personalized birth charts, daily horoscopes, and planetary position data.

## Tech Stack

- **Language**: Kotlin 2.0
- **UI**: Jetpack Compose + Material 3
- **DI**: Hilt (Dagger)
- **Navigation**: Navigation Compose
- **State**: ViewModel + StateFlow + `collectAsStateWithLifecycle`
- **Persistence**: DataStore Preferences
- **Build**: Gradle Kotlin DSL, version catalog (`gradle/libs.versions.toml`)
- **Min SDK**: 26 (Android 8.0) | **Target SDK**: 35

## Project Structure

```
app/src/main/java/com/astroprecise/
├── AstroPreciseApp.kt          # @HiltAndroidApp Application class
├── MainActivity.kt             # Single activity, edge-to-edge, sets Compose content
├── data/
│   ├── local/
│   │   └── UserPreferences.kt  # DataStore — persists UserProfile fields
│   ├── model/                  # Pure data/enum classes (no Android deps)
│   │   ├── BirthChart.kt       # BirthChart, House, Aspect, AspectType
│   │   ├── Horoscope.kt
│   │   ├── Planet.kt           # Planet + CLASSICAL_PLANETS + PLANET_KEYWORDS constants
│   │   ├── UserProfile.kt      # Serializable; has computed props: sunSign, isComplete
│   │   └── ZodiacSign.kt       # All 12 signs as enum; ZodiacSign.fromBirthDate()
│   └── repository/
│       ├── AstrologyRepository.kt  # Calculates charts and horoscopes (Default dispatcher)
│       └── UserRepository.kt       # Thin wrapper around UserPreferences
├── domain/astrology/
│   ├── BirthChartCalculator.kt # Julian day + simplified planetary positions algorithm
│   └── HoroscopeGenerator.kt  # Deterministic readings seeded by sign + date
└── ui/
    ├── theme/
    │   ├── Color.kt            # Deep-space dark palette + element colors
    │   ├── Theme.kt            # AstroPreciseTheme (dark/light Material3 schemes)
    │   └── Type.kt             # Serif display + sans-serif body typography scale
    ├── navigation/
    │   └── AppNavigation.kt    # Bottom nav + NavHost (Home/BirthChart/Horoscope/Profile)
    ├── components/
    │   ├── ZodiacWheel.kt      # Animated Canvas zodiac wheel + StarRatingBar
    │   └── PlanetCard.kt       # PlanetCard, KeywordChip, SectionHeader composables
    └── screens/
        ├── home/               # HomeScreen + HomeViewModel
        ├── birthchart/         # BirthChartScreen (tabbed: Overview/Planets/Houses/Aspects)
        ├── horoscope/          # HoroscopeScreen (sign picker + detail)
        └── profile/            # ProfileScreen (view + edit form)
```

## Architecture

Unidirectional data flow: Repository → ViewModel (`UiState` StateFlow) → Screen composable.

- **Screens** are stateless — they read `UiState` and dispatch events to the ViewModel.
- **ViewModels** are `@HiltViewModel`; all are scoped to the nav back-stack entry via `hiltViewModel()`.
- **Repositories** are `@Singleton` and inject `@Inject constructor` dependencies automatically.
- No use cases/interactors layer — the domain logic lives directly in `BirthChartCalculator` and `HoroscopeGenerator`, both injected into repositories.

## Key Conventions

- **State**: Single `UiState` data class per screen; updated via `_uiState.update { }`.
- **Collections**: Prefer `collectAsStateWithLifecycle` over `collectAsState` in composables.
- **Coroutines**: Repositories switch to `Dispatchers.Default` for CPU-bound calculations.
- **No comments** on obvious code; comments only for algorithm math or non-obvious invariants.
- **No backwards-compat shims** — minimum SDK 26 means no legacy workarounds needed.

## Build & Run

```bash
# From repo root — requires Android SDK and ANDROID_HOME set
./gradlew assembleDebug
./gradlew installDebug
./gradlew test            # unit tests
./gradlew lint
```

No environment variables or API keys are required — all horoscope content is generated deterministically offline.

## Adding a New Screen

1. Create `ui/screens/<name>/<Name>Screen.kt` and `<Name>ViewModel.kt`.
2. Add a `Screen` sealed object entry in `AppNavigation.kt`.
3. Add the `composable(Screen.<Name>.route)` block to `NavHost`.
4. Add a `NavigationBarItem` to `bottomNavItems`.

## Astrology Calculations

`BirthChartCalculator` uses simplified VSOP87-derived mean elements (accurate to ~1°). It computes:
- Julian Day from birth date/time
- Solar and lunar longitude via perturbation series
- Outer planet longitudes via mean motion
- Ascendant from Local Sidereal Time + latitude
- Twelve equal houses (Whole Sign variant)
- Ptolemaic aspects with standard orbs

`HoroscopeGenerator` produces deterministic readings by seeding a selection index with `sign.ordinal * 31 + epochDay` — same sign on the same date always returns the same reading.
