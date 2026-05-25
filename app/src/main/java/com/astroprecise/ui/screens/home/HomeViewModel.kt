package com.astroprecise.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astroprecise.data.model.Horoscope
import com.astroprecise.data.model.UserProfile
import com.astroprecise.data.repository.AstrologyRepository
import com.astroprecise.data.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val userProfile: UserProfile = UserProfile(),
    val dailyHoroscope: Horoscope? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val userRepository: UserRepository,
    private val astrologyRepository: AstrologyRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    val userProfile: StateFlow<UserProfile> = userRepository.userProfile
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UserProfile())

    init {
        viewModelScope.launch {
            userRepository.userProfile.collect { profile ->
                _uiState.update { it.copy(userProfile = profile, isLoading = false) }
                val horoscope = astrologyRepository.getDailyHoroscope(profile.sunSign)
                _uiState.update { it.copy(dailyHoroscope = horoscope) }
            }
        }
    }
}
