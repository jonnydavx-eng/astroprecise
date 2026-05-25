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

    suspend fun saveProfile(profile: UserProfile) {
        userPreferences.saveUserProfile(profile)
    }
}
