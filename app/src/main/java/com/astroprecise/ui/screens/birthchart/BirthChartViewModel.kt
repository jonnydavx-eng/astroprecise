package com.astroprecise.ui.screens.birthchart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astroprecise.data.model.BirthChart
import com.astroprecise.data.model.UserProfile
import com.astroprecise.data.repository.AstrologyRepository
import com.astroprecise.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BirthChartUiState(
    val isLoading: Boolean = true,
    val userProfile: UserProfile = UserProfile(),
    val birthChart: BirthChart? = null,
    val selectedTab: Int = 0,
)

@HiltViewModel
class BirthChartViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val astrologyRepository: AstrologyRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BirthChartUiState())
    val uiState: StateFlow<BirthChartUiState> = _uiState

    init {
        viewModelScope.launch {
            userRepository.userProfile.collect { profile ->
                _uiState.update { it.copy(userProfile = profile, isLoading = false) }
                if (profile.isComplete) {
                    val chart = astrologyRepository.calculateBirthChart(profile)
                    _uiState.update { it.copy(birthChart = chart) }
                }
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }
}
