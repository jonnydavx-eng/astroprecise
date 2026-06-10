package com.astroprecise

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.astroprecise.work.HoroscopeNotificationWorker
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class AstroPreciseApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                HoroscopeNotificationWorker.CHANNEL_ID,
                "Daily Horoscope",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Your daily cosmic guidance"
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}
