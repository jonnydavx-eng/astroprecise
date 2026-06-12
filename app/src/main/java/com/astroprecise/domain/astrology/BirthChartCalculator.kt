package com.astroprecise.domain.astrology

import com.astroprecise.data.model.Aspect
import com.astroprecise.data.model.AspectType
import com.astroprecise.data.model.BirthChart
import com.astroprecise.data.model.House
import com.astroprecise.data.model.Planet
import com.astroprecise.data.model.PLANET_KEYWORDS
import com.astroprecise.data.model.UserProfile
import com.astroprecise.data.model.ZodiacSign
import javax.inject.Inject
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.sin
import kotlin.math.tan

class BirthChartCalculator @Inject constructor() {

    fun calculate(profile: UserProfile): BirthChart {
        val jd = julianDay(
            year = profile.birthYear,
            month = profile.birthMonth,
            day = profile.birthDay,
            hour = profile.birthHour + profile.birthMinute / 60.0,
        )

        val planetDegrees = calculatePlanetaryPositions(jd)
        val ascendantDegree = calculateAscendant(
            jd = jd,
            latitude = profile.birthLatitude,
            longitude = profile.birthLongitude,
        )

        val planets = planetDegrees.map { (name, degree) ->
            val sign = degreeToSign(degree)
            Planet(
                name = name,
                symbol = planetSymbol(name),
                sign = sign,
                degree = degree % 30.0,
                house = calculateHouse(degree, ascendantDegree),
                keywords = PLANET_KEYWORDS[name] ?: emptyList(),
                meaning = planetMeaning(name, sign),
            )
        }

        val houses = calculateHouses(ascendantDegree)
        val aspects = calculateAspects(planetDegrees)

        return BirthChart(
            sunSign = degreeToSign(planetDegrees["Sun"] ?: 0.0),
            moonSign = degreeToSign(planetDegrees["Moon"] ?: 0.0),
            risingSign = degreeToSign(ascendantDegree),
            planets = planets,
            houses = houses,
            aspects = aspects,
        )
    }

    private fun julianDay(year: Int, month: Int, day: Int, hour: Double): Double {
        val y = if (month <= 2) year - 1 else year
        val m = if (month <= 2) month + 12 else month
        val a = floor(y / 100.0)
        val b = 2 - a + floor(a / 4.0)
        return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + day + hour / 24.0 + b - 1524.5
    }

    private fun calculatePlanetaryPositions(jd: Double): Map<String, Double> {
        val T = (jd - 2451545.0) / 36525.0
        return mapOf(
            "Sun" to solarLongitude(T),
            "Moon" to lunarLongitude(T),
            "Mercury" to planetLongitude(T, 252.2503, 149472.6742, 77.4561, 0.3870),
            "Venus" to planetLongitude(T, 181.9798, 58517.8156, 131.5637, 0.7233),
            "Mars" to planetLongitude(T, 355.4330, 19140.2993, 336.0602, 1.5237),
            "Jupiter" to planetLongitude(T, 34.3515, 3034.9057, 14.3312, 5.2026),
            "Saturn" to planetLongitude(T, 50.0774, 1222.1138, 93.0572, 9.5371),
            "Uranus" to planetLongitude(T, 314.0550, 428.4677, 173.0052, 19.1913),
            "Neptune" to planetLongitude(T, 304.3487, 218.4897, 48.1202, 30.0690),
            "Pluto" to planetLongitude(T, 238.9508, 145.1809, 224.0700, 39.4817),
        )
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
        val correction = 6.2888 * sin(Mprime) + 1.2740 * sin(2 * D - Mprime) +
                0.6583 * sin(2 * D) + 0.2136 * sin(2 * Mprime) -
                0.1851 * sin(M) - 0.1143 * sin(2 * F)
        return normalize(L + correction)
    }

    private fun planetLongitude(T: Double, L0: Double, n: Double, w: Double, a: Double): Double {
        val M = toRad(normalize(L0 + n * T - w))
        val e = 0.0167
        val correction = (2 * e - e * e * e / 4) * sin(M) + (5.0 / 4) * e * e * sin(2 * M)
        return normalize(w + toDeg(correction) + toDeg(M))
    }

    private fun calculateAscendant(jd: Double, latitude: Double, longitude: Double): Double {
        val T = (jd - 2451545.0) / 36525.0
        val theta = normalize(280.46061837 + 360.98564736629 * (jd - 2451545.0) + longitude)
        val e = toRad(23.439291111 - 0.013004167 * T)
        val latRad = toRad(latitude)
        val thetaRad = toRad(theta)
        val ascRad = Math.atan2(cos(thetaRad), -(sin(thetaRad) * cos(e) + tan(latRad) * sin(e)))
        return normalize(toDeg(ascRad))
    }

    private fun calculateHouses(ascendant: Double): List<House> {
        val houseMeanings = listOf(
            "Self, appearance, beginnings",
            "Money, possessions, values",
            "Communication, siblings, short trips",
            "Home, family, roots",
            "Creativity, romance, children",
            "Health, work, daily routines",
            "Partnerships, marriage, open enemies",
            "Transformation, shared resources, death",
            "Philosophy, travel, higher learning",
            "Career, reputation, authority",
            "Friends, groups, hopes and wishes",
            "Spirituality, hidden matters, karma",
        )
        return (0 until 12).map { i ->
            House(
                number = i + 1,
                sign = degreeToSign(normalize(ascendant + i * 30.0)),
                degree = normalize(ascendant + i * 30.0) % 30.0,
                meaning = houseMeanings[i],
            )
        }
    }

    private fun calculateAspects(positions: Map<String, Double>): List<Aspect> {
        val aspects = mutableListOf<Aspect>()
        val planets = positions.keys.toList()
        for (i in planets.indices) {
            for (j in i + 1 until planets.size) {
                val p1 = planets[i]
                val p2 = planets[j]
                val angle = abs(positions[p1]!! - positions[p2]!!)
                val normalizedAngle = if (angle > 180) 360 - angle else angle
                for (type in AspectType.entries) {
                    val orb = abs(normalizedAngle - type.angle)
                    if (orb <= type.orb) {
                        aspects.add(Aspect(p1, p2, type, orb, isApplying = orb < type.orb / 2))
                    }
                }
            }
        }
        return aspects
    }

    private fun calculateHouse(planetDegree: Double, ascendant: Double): Int {
        val offset = normalize(planetDegree - ascendant)
        return (offset / 30.0).toInt() + 1
    }

    private fun degreeToSign(degree: Double): String {
        val signs = ZodiacSign.entries
        return signs[(degree / 30.0).toInt() % 12].displayName
    }

    private fun planetSymbol(name: String): String = mapOf(
        "Sun" to "☉", "Moon" to "☽", "Mercury" to "☿", "Venus" to "♀",
        "Mars" to "♂", "Jupiter" to "♃", "Saturn" to "♄", "Uranus" to "⛢",
        "Neptune" to "♆", "Pluto" to "♇",
    )[name] ?: "?"

    private fun planetMeaning(planet: String, sign: String): String =
        "$planet in $sign — ${
            PLANET_KEYWORDS[planet]?.joinToString(", ") ?: "cosmic influence"
        } expressed through ${sign.lowercase()} energy."

    private fun normalize(deg: Double): Double = ((deg % 360) + 360) % 360
    private fun toRad(deg: Double) = deg * PI / 180.0
    private fun toDeg(rad: Double) = rad * 180.0 / PI
}
