package com.simbtech.sms;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // OneSignal's default channel id. Left to itself, the SDK creates this
    // channel at IMPORTANCE_DEFAULT, which means notifications slide silently
    // into the shade and never appear as a heads-up banner. Android refuses to
    // raise the importance of a channel that already exists, so the only way to
    // get banners on this channel is to create it ourselves, at HIGH, before
    // the first notification arrives.
    private static final String ONESIGNAL_DEFAULT_CHANNEL = "fcm_fallback_notification_channel";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createHighImportanceChannel();
    }

    private void createHighImportanceChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        // Only ever creates it — if the user has since turned this channel down,
        // that choice is theirs and Android keeps it.
        NotificationChannel channel = new NotificationChannel(
                ONESIGNAL_DEFAULT_CHANNEL,
                "Notifications",
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Messages, fees, results and announcements");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }
}
