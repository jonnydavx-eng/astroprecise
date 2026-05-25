package com.astroprecise.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astroprecise.data.model.UserProfile
import com.astroprecise.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = true,
    val profile: UserProfile = UserProfile(),
    val isEditing: Boolean = false,
    val editName: String = "",
    val editDay: Int = 1,
    val editMonth: Int = 1,
    val editYear: Int = 1990,
    val editHour: Int = 12,
    val editMinute: Int = 0,
    val editCity: String = "",
    val editLatitude: Double = 0.0,
    val editLongitude: Double = 0.0,
    val isSaving: Boolean = false,
    val saveSuccess: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val userRepository: UserRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState

    init {
        viewModelScope.launch {
            userRepository.userProfile.collect { profile ->
                _uiState.update { state ->
                    state.copy(
                        isLoading = false,
                        profile = profile,
                        editName = if (!state.isEditing) profile.name else state.editName,
                        editDay = if (!state.isEditing) profile.birthDay else state.editDay,
                        editMonth = if (!state.isEditing) profile.birthMonth else state.editMonth,
                        editYear = if (!state.isEditing) profile.birthYear else state.editYear,
                        editHour = if (!state.isEditing) profile.birthHour else state.editHour,
                        editMinute = if (!state.isEditing) profile.birthMinute else state.editMinute,
                        editCity = if (!state.isEditing) profile.birthCity else state.editCity,
                        editLatitude = if (!state.isEditing) profile.birthLatitude else state.editLatitude,
                        editLongitude = if (!state.isEditing) profile.birthLongitude else state.editLongitude,
                    )
                }
            }
        }
    }

    fun startEditing() {
        val profile = _uiState.value.profile
        _uiState.update {
            it.copy(
                isEditing = true,
                editName = profile.name,
                editDay = profile.birthDay,
                editMonth = profile.birthMonth,
                editYear = profile.birthYear,
                editHour = profile.birthHour,
                editMinute = profile.birthMinute,
                editCity = profile.birthCity,
                editLatitude = profile.birthLatitude,
                editLongitude = profile.birthLongitude,
            )
        }
    }

    fun cancelEditing() = _uiState.update { it.copy(isEditing = false) }

    fun updateName(value: String) = _uiState.update { it.copy(editName = value) }
    fun updateDay(value: Int) = _uiState.update { it.copy(editDay = value.coerceIn(1, 31)) }
    fun updateMonth(value: Int) = _uiState.update { it.copy(editMonth = value.coerceIn(1, 12)) }
    fun updateYear(value: Int) = _uiState.update { it.copy(editYear = value.coerceIn(1900, 2024)) }
    fun updateHour(value: Int) = _uiState.update { it.copy(editHour = value.coerceIn(0, 23)) }
    fun updateMinute(value: Int) = _uiState.update { it.copy(editMinute = value.coerceIn(0, 59)) }
    fun updateCity(value: String) = _uiState.update { it.copy(editCity = value) }
    fun updateLatitude(value: Double) = _uiState.update { it.copy(editLatitude = value) }
    fun updateLongitude(value: Double) = _uiState.update { it.copy(editLongitude = value) }

    fun saveProfile() {
        _uiState.update { it.copy(isSaving = true) }
        viewModelScope.launch {
            val state = _uiState.value
            val newProfile = UserProfile(
                name = state.editName,
                birthDay = state.editDay,
                birthMonth = state.editMonth,
                birthYear = state.editYear,
                birthHour = state.editHour,
                birthMinute = state.editMinute,
                birthCity = state.editCity,
                birthLatitude = state.editLatitude,
                birthLongitude = state.editLongitude,
            )
            userRepository.saveProfile(newProfile)
            _uiState.update { it.copy(isSaving = false, isEditing = false, saveSuccess = true) }
        }
    }
}
