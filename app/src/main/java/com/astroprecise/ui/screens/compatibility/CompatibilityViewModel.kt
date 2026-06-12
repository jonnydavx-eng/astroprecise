package com.astroprecise.ui.screens.compatibility

import androidx.lifecycle.ViewModel
import com.astroprecise.data.model.CompatibilityResult
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.domain.astrology.CompatibilityCalculator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

data class CompatibilityUiState(
    val sign1: ZodiacSign = ZodiacSign.ARIES,
    val sign2: ZodiacSign = ZodiacSign.LIBRA,
    val result: CompatibilityResult? = null,
)

@HiltViewModel
class CompatibilityViewModel @Inject constructor(
    private val calculator: CompatibilityCalculator,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CompatibilityUiState())
    val uiState: StateFlow<CompatibilityUiState> = _uiState

    init {
        recalculate()
    }

    fun setSign1(sign: ZodiacSign) {
        _uiState.update { it.copy(sign1 = sign) }
        recalculate()
    }

    fun setSign2(sign: ZodiacSign) {
        _uiState.update { it.copy(sign2 = sign) }
        recalculate()
    }

    private fun recalculate() {
        val s = _uiState.value
        _uiState.update { it.copy(result = calculator.calculate(s.sign1, s.sign2)) }
    }
}
