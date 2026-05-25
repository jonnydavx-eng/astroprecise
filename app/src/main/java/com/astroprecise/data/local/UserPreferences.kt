package com.astroprecise.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.astroprecise.data.model.UserProfile
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_prefs")

@Singleton
class UserPreferences @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private object Keys {
        val NAME = stringPreferencesKey("name")
        val BIRTH_DAY = intPreferencesKey("birth_day")
        val BIRTH_MONTH = intPreferencesKey("birth_month")
        val BIRTH_YEAR = intPreferencesKey("birth_year")
        val BIRTH_HOUR = intPreferencesKey("birth_hour")
        val BIRTH_MINUTE = intPreferencesKey("birth_minute")
        val BIRTH_CITY = stringPreferencesKey("birth_city")
        val BIRTH_LAT = doublePreferencesKey("birth_lat")
        val BIRTH_LON = doublePreferencesKey("birth_lon")
    }

    val userProfile: Flow<UserProfile> = context.dataStore.data.map { prefs ->
        UserProfile(
            name = prefs[Keys.NAME] ?: "",
            birthDay = prefs[Keys.BIRTH_DAY] ?: 1,
            birthMonth = prefs[Keys.BIRTH_MONTH] ?: 1,
            birthYear = prefs[Keys.BIRTH_YEAR] ?: 1990,
            birthHour = prefs[Keys.BIRTH_HOUR] ?: 12,
            birthMinute = prefs[Keys.BIRTH_MINUTE] ?: 0,
            birthCity = prefs[Keys.BIRTH_CITY] ?: "",
            birthLatitude = prefs[Keys.BIRTH_LAT] ?: 0.0,
            birthLongitude = prefs[Keys.BIRTH_LON] ?: 0.0,
        )
    }

    suspend fun saveUserProfile(profile: UserProfile) {
        context.dataStore.edit { prefs ->
            prefs[Keys.NAME] = profile.name
            prefs[Keys.BIRTH_DAY] = profile.birthDay
            prefs[Keys.BIRTH_MONTH] = profile.birthMonth
            prefs[Keys.BIRTH_YEAR] = profile.birthYear
            prefs[Keys.BIRTH_HOUR] = profile.birthHour
            prefs[Keys.BIRTH_MINUTE] = profile.birthMinute
            prefs[Keys.BIRTH_CITY] = profile.birthCity
            prefs[Keys.BIRTH_LAT] = profile.birthLatitude
            prefs[Keys.BIRTH_LON] = profile.birthLongitude
        }
    }
}
