package com.simbtech.sms;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

/**
 * The notification channel every push is posted to.
 *
 * <p>Android decides whether a notification slides quietly into the shade or
 * drops down over whatever the user is looking at (a "heads-up" banner) from
 * the importance of its channel, and from nothing else. IMPORTANCE_HIGH is
 * the lowest level that produces a banner.
 *
 * <p>The id below is versioned, and that is the whole point. Android lets an
 * app create a channel once; from then on {@code createNotificationChannel}
 * can lower a channel's importance but <em>never raise it</em>, because
 * importance belongs to the user once they can see it in Settings. Devices
 * that ran an earlier build already have OneSignal's own default channel,
 * {@code fcm_fallback_notification_channel}, registered at
 * IMPORTANCE_DEFAULT — so re-creating that id at HIGH, as this app used to,
 * is silently a no-op on every existing install. Only a brand-new id can
 * start life at HIGH.
 *
 * <p>If the importance or behaviour of this channel ever has to change again,
 * bump the version suffix rather than editing the existing channel in place,
 * for the same reason. Note that the user is then asked afresh, and anyone
 * who had deliberately turned notifications down loses that choice — so bump
 * it only when there is no alternative.
 */
final class NotificationChannels {

    /** Passed to OneSignal per-notification by {@link NotificationServiceExtension}. */
    static final String ALERTS = "sms_alerts_v2";

    private NotificationChannels() {}

    /**
     * Registers the channel if it does not exist yet. Cheap and idempotent, so
     * it is called from both the activity and the push receiver — a push can
     * arrive while the app is closed, in which case the process is started for
     * the receiver and no activity ever runs.
     */
    static void ensureCreated(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel channel = new NotificationChannel(
                ALERTS,
                "Notifications",
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Messages, fees, results and announcements");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        // Creating a channel that already exists only refreshes its name and
        // description; the user's own importance and sound choices are kept.
        manager.createNotificationChannel(channel);
    }
}
