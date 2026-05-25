package com.astroprecise.ui.screens.horoscope

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.astroprecise.data.model.Horoscope
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.data.repository.AstrologyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HoroscopeUiState(
    val isLoading: Boolean = true,
    val selectedSign: ZodiacSign = ZodiacSign.ARIES,
    val horoscope: Horoscope? = null,
)

@HiltViewModel
class HoroscopeViewModel @Inject constructor(
    private val astrologyRepository: AstrologyRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HoroscopeUiState())
    val uiState: StateFlow<HoroscopeUiState> = _uiState

    init {
        loadHoroscope(ZodiacSign.ARIES)
    }

    fun selectSign(sign: ZodiacSign) {
        _uiState.update { it.copy(selectedSign = sign, isLoading = true) }
        loadHoroscope(sign)
    }

    private fun loadHoroscope(sign: ZodiacSign) {
        viewModelScope.launch {
            val horoscope = astrologyRepository.getDailyHoroscope(sign)
            _uiState.update { it.copy(horoscope = horoscope, isLoading = false) }
        }
    }
}
