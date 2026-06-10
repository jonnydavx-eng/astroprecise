package com.astroprecise.domain.astrology

import com.astroprecise.data.model.CurrentSkyData
import com.astroprecise.data.model.MoonPhase
import com.astroprecise.data.model.ZodiacSign
import java.time.LocalDate
import javax.inject.Inject
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin

class CurrentSkyCalculator @Inject constructor() {

    fun calculate(): CurrentSkyData {
        val today = LocalDate.now()
        val jd = julianDay(today.year, today.monthValue, today.dayOfMonth)
        val T = (jd - 2451545.0) / 36525.0

        val sunLong = solarLongitude(T)
        val moonLong = lunarLongitude(T)
        val phaseAngle = ((moonLong - sunLong) + 360) % 360

        val todayPositions = planetaryPositions(T)
        val tomorrowT = ((jd + 1) - 2451545.0) / 36525.0
        val tomorrowPositions = planetaryPositions(tomorrowT)

        val retrogrades = todayPositions
            .filter { (planet, _) -> planet != "Sun" && planet != "Moon" }
            .filter { (planet, pos) ->
                val next = tomorrowPositions[planet] ?: return@filter false
                ((next - pos + 360) % 360) > 180.0
            }
            .keys.toList()

        return CurrentSkyData(
            moonPhase = phaseToEnum(phaseAngle),
            moonIllumination = ((1.0 - cos(toRad(phaseAngle))) * 50.0).toInt().coerceIn(0, 100),
            moonSign = degreeToSign(moonLong),
            retrogradeplanets = retrogrades,
            sunSign = degreeToSign(sunLong),
        )
    }

    private fun julianDay(year: Int, month: Int, day: Int): Double {
        val y = if (month <= 2) year - 1 else year
        val m = if (month <= 2) month + 12 else month
        val a = floor(y / 100.0)
        val b = 2 - a + floor(a / 4.0)
        return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + day + b - 1524.5
    }

    private fun solarLongitude(T: Double): Double {
        val L0 = normalize(280.46646 + 36000.76983 * T)
        val M = toRad(normalize(357.52911 + 35999.05029 * T))
        val C = (1.914602 - 0.004817 * T) * sin(M) + 0.019993 * sin(2 * M)
        return normalize(L0 + C)
    }

    private fun lunarLongitude(T: Double): Double {
        val L = normalize(218.3165 + 481267.8813 * T)
        val M = toRad(normalize(357.5291 + 35999.0503 * T))
        val Mprime = toRad(normalize(134.9634 + 477198.8676 * T))
        val D = toRad(normalize(297.8502 + 445267.1115 * T))
        val F = toRad(normalize(93.2721 + 483202.0175 * T))
        val c = 6.2888 * sin(Mprime) + 1.2740 * sin(2 * D - Mprime) +
                0.6583 * sin(2 * D) + 0.2136 * sin(2 * Mprime) -
                0.1851 * sin(M) - 0.1143 * sin(2 * F)
        return normalize(L + c)
    }

    private fun planetaryPositions(T: Double): Map<String, Double> = mapOf(
        "Sun" to solarLongitude(T),
        "Moon" to lunarLongitude(T),
        "Mercury" to outerPlanet(T, 252.2503, 149472.6742, 77.4561),
        "Venus" to outerPlanet(T, 181.9798, 58517.8156, 131.5637),
        "Mars" to outerPlanet(T, 355.4330, 19140.2993, 336.0602),
        "Jupiter" to outerPlanet(T, 34.3515, 3034.9057, 14.3312),
        "Saturn" to outerPlanet(T, 50.0774, 1222.1138, 93.0572),
        "Uranus" to outerPlanet(T, 314.0550, 428.4677, 173.0052),
        "Neptune" to outerPlanet(T, 304.3487, 218.4897, 48.1202),
        "Pluto" to outerPlanet(T, 238.9508, 145.1809, 224.0700),
    )

    private fun outerPlanet(T: Double, L0: Double, n: Double, w: Double): Double {
        val M = toRad(normalize(L0 + n * T - w))
        val e = 0.0167
        val c = (2 * e - e * e * e / 4) * sin(M) + (5.0 / 4) * e * e * sin(2 * M)
        return normalize(w + toDeg(c) + toDeg(M))
    }

    private fun phaseToEnum(angle: Double): MoonPhase = when {
        angle < 22.5 || angle >= 337.5 -> MoonPhase.NEW_MOON
        angle < 67.5 -> MoonPhase.WAXING_CRESCENT
        angle < 112.5 -> MoonPhase.FIRST_QUARTER
        angle < 157.5 -> MoonPhase.WAXING_GIBBOUS
        angle < 202.5 -> MoonPhase.FULL_MOON
        angle < 247.5 -> MoonPhase.WANING_GIBBOUS
        angle < 292.5 -> MoonPhase.LAST_QUARTER
        else -> MoonPhase.WANING_CRESCENT
    }

    private fun degreeToSign(deg: Double) = ZodiacSign.entries[(deg / 30.0).toInt() % 12].displayName

    private fun normalize(d: Double) = ((d % 360) + 360) % 360
    private fun toRad(d: Double) = d * PI / 180.0
    private fun toDeg(r: Double) = r * 180.0 / PI
}
