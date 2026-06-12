package com.astroprecise.work

import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationCompat
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.astroprecise.data.local.dataStore
import com.astroprecise.data.model.Horoscope
import com.astroprecise.data.model.ZodiacSign
import com.astroprecise.domain.astrology.HoroscopeGenerator
import kotlinx.coroutines.flow.first
import java.time.LocalDate

class HoroscopeNotificationWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.dataStore.data.first()
        val birthMonth = prefs[intPreferencesKey("birth_month")] ?: 6
        val birthDay = prefs[intPreferencesKey("birth_day")] ?: 21
        val sign = ZodiacSign.fromBirthDate(birthMonth, birthDay)
        val horoscope = HoroscopeGenerator().generateDaily(sign, LocalDate.now().toEpochDay())
        showNotification(sign, horoscope)
        return Result.success()
    }

    private fun showNotification(sign: ZodiacSign, horoscope: Horoscope) {
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("${sign.symbol} ${sign.displayName} · Today's Horoscope")
            .setContentText(horoscope.general.take(120))
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("${horoscope.general}\n\n♥ ${horoscope.love}\n⚡ ${horoscope.career}")
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .build()

        val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(NOTIFICATION_ID, notification)
    }

    companion object {
        const val CHANNEL_ID = "horoscope_daily"
        const val NOTIFICATION_ID = 1001
    }
}
