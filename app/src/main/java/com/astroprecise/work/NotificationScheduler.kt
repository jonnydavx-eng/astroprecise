package com.astroprecise.work

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.time.LocalTime
import java.util.concurrent.TimeUnit

private const val WORK_NAME = "horoscope_notification"

fun scheduleHoroscopeNotification(context: Context, hour: Int, minute: Int) {
    val now = LocalTime.now()
    val target = LocalTime.of(hour, minute)
    val nowMins = now.hour * 60L + now.minute
    val targetMins = hour * 60L + minute
    val delayMins = if (targetMins > nowMins) targetMins - nowMins else 1440 - nowMins + targetMins

    val request = PeriodicWorkRequestBuilder<HoroscopeNotificationWorker>(1, TimeUnit.DAYS)
        .setInitialDelay(delayMins, TimeUnit.MINUTES)
        .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        WORK_NAME,
        ExistingPeriodicWorkPolicy.REPLACE,
        request,
    )
}

fun cancelHoroscopeNotification(context: Context) {
    WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
}
