package com.astroprecise.ui.screens.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astroprecise.data.local.UserPreferences
import com.astroprecise.data.model.UserProfile
import com.astroprecise.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingUiState(
    val name: String = "",
    val birthDay: Int = 1,
    val birthMonth: Int = 6,
    val birthYear: Int = 1995,
    val birthHour: Int = 12,
    val birthMinute: Int = 0,
    val birthCity: String = "",
    val birthLatitude: Double = 0.0,
    val birthLongitude: Double = 0.0,
    val isSaving: Boolean = false,
)

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val userPreferences: UserPreferences,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState

    fun updateName(v: String) = _uiState.update { it.copy(name = v) }
    fun updateDay(v: Int) = _uiState.update { it.copy(birthDay = v.coerceIn(1, 31)) }
    fun updateMonth(v: Int) = _uiState.update { it.copy(birthMonth = v.coerceIn(1, 12)) }
    fun updateYear(v: Int) = _uiState.update { it.copy(birthYear = v.coerceIn(1900, 2025)) }
    fun updateHour(v: Int) = _uiState.update { it.copy(birthHour = v.coerceIn(0, 23)) }
    fun updateMinute(v: Int) = _uiState.update { it.copy(birthMinute = v.coerceIn(0, 59)) }
    fun updateCity(v: String) = _uiState.update { it.copy(birthCity = v) }
    fun updateLatitude(v: Double) = _uiState.update { it.copy(birthLatitude = v) }
    fun updateLongitude(v: Double) = _uiState.update { it.copy(birthLongitude = v) }

    fun completeOnboarding(onDone: () -> Unit) {
        _uiState.update { it.copy(isSaving = true) }
        viewModelScope.launch {
            val s = _uiState.value
            userRepository.saveProfile(
                UserProfile(
                    name = s.name,
                    birthDay = s.birthDay,
                    birthMonth = s.birthMonth,
                    birthYear = s.birthYear,
                    birthHour = s.birthHour,
                    birthMinute = s.birthMinute,
                    birthCity = s.birthCity,
                    birthLatitude = s.birthLatitude,
                    birthLongitude = s.birthLongitude,
                )
            )
            userPreferences.markOnboardingComplete()
            _uiState.update { it.copy(isSaving = false) }
            onDone()
        }
    }
}
