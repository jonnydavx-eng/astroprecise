package com.astroprecise.data.repository

import com.astroprecise.data.model.BirthChart
import com.astroprecise.data.model.CurrentSkyData
import com.astroprecise.data.model.Horoscope
import com.astroprecise.data.model.UserProfile
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.domain.astrology.BirthChartCalculator
import com.astroprecise.domain.astrology.CurrentSkyCalculator
import com.astroprecise.domain.astrology.HoroscopeGenerator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AstrologyRepository @Inject constructor(
    private val birthChartCalculator: BirthChartCalculator,
    private val horoscopeGenerator: HoroscopeGenerator,
    private val currentSkyCalculator: CurrentSkyCalculator,
) {
    suspend fun calculateBirthChart(profile: UserProfile): BirthChart =
        withContext(Dispatchers.Default) {
            birthChartCalculator.calculate(profile)
        }

    suspend fun getDailyHoroscope(sign: ZodiacSign): Horoscope =
        withContext(Dispatchers.Default) {
            val today = LocalDate.now()
            val dateKey = today.toEpochDay()
            horoscopeGenerator.generateDaily(sign, dateKey)
        }

    suspend fun getAllDailyHoroscopes(): List<Horoscope> =
        withContext(Dispatchers.Default) {
            val today = LocalDate.now()
            val dateKey = today.toEpochDay()
            ZodiacSign.entries.map { sign ->
                horoscopeGenerator.generateDaily(sign, dateKey)
            }
        }

    suspend fun getCurrentSky(): CurrentSkyData =
        withContext(Dispatchers.Default) {
            currentSkyCalculator.calculate()
        }
}
