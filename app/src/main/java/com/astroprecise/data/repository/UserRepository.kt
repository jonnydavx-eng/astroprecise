package com.astroprecise.data.repository

import com.astroprecise.data.local.UserPreferences
import com.astroprecise.data.model.UserProfile
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class UserRepository @Inject constructor(
    private val userPreferences: UserPreferences,
) {
    val userProfile: Flow<UserProfile> = userPreferences.userProfile
    val notificationsEnabled: Flow<Boolean> = userPreferences.notificationsEnabled
    val notificationHour: Flow<Int> = userPreferences.notificationHour
    val notificationMinute: Flow<Int> = userPreferences.notificationMinute

    suspend fun saveProfile(profile: UserProfile) {
        userPreferences.saveUserProfile(profile)
    }

    suspend fun saveNotificationSettings(enabled: Boolean, hour: Int, minute: Int) {
        userPreferences.saveNotificationSettings(enabled, hour, minute)
    }
}
