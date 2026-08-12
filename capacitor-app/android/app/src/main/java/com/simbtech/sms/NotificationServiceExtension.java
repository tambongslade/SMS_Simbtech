package com.simbtech.sms;

import androidx.core.app.NotificationCompat;

import com.onesignal.notifications.IDisplayableMutableNotification;
import com.onesignal.notifications.INotificationReceivedEvent;
import com.onesignal.notifications.INotificationServiceExtension;

/**
 * Runs in the push receiver's process for every notification that arrives while
 * the app is backgrounded or closed, just before OneSignal posts it, and moves
 * it onto our own high-importance channel so it shows as a heads-up banner
 * instead of dropping silently into the shade.
 *
 * <p>This is the only place the change can be made. OneSignal builds and posts
 * background notifications itself, on its own default channel, and the JS
 * listeners in OneSignalInit.tsx never run — the WebView does not exist yet.
 *
 * <p>Registered by name in AndroidManifest.xml under the meta-data key
 * {@code com.onesignal.NotificationServiceExtension}, so it is constructed
 * reflectively and must stay public with a no-argument constructor.
 */
public class NotificationServiceExtension implements INotificationServiceExtension {

    @Override
    public void onNotificationReceived(INotificationReceivedEvent event) {
        // The app may not have been launched since install, or since this
        // version was installed, so the channel is not guaranteed to exist yet.
        NotificationChannels.ensureCreated(event.getContext());

        IDisplayableMutableNotification notification = event.getNotification();
        notification.setExtender(builder -> builder
                // Android O and above: the channel alone decides heads-up.
                .setChannelId(NotificationChannels.ALERTS)
                // Below O there are no channels, and priority decides instead.
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                // OneSignal was observed posting these with FLAG_SILENT, which
                // suppresses the banner whatever the channel importance says.
                .setSilent(false));

        // preventDefault() is deliberately not called: OneSignal still displays
        // the notification, now with the extender above applied.
    }
}
