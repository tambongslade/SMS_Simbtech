package com.simbtech.sms;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // So the channel is listed under Settings > Notifications from first
        // launch, rather than only appearing after the first push arrives.
        // NotificationServiceExtension creates it too — see NotificationChannels.
        NotificationChannels.ensureCreated(this);
        insetContentFromSystemBars();
    }

    /**
     * Keeps the web view clear of the status bar, the navigation bar, any
     * display cutout, and the on-screen keyboard.
     *
     * <p>Android 16 (API 36) lays every app out edge to edge and no longer
     * reserves room for the system bars, so from the moment this app targets 36
     * the web view fills the whole screen and its header would sit underneath
     * the clock and battery icons. Capacitor 6 does nothing about window
     * insets, so the app has to.
     *
     * <p>Padding the content view rather than letting the page draw behind the
     * bars reproduces the pre-Android-16 layout, so the web app needs no
     * changes. The padded strips show through to the content view's own
     * background, hence the explicit colour.
     */
    private void insetContentFromSystemBars() {
        View content = findViewById(android.R.id.content);
        content.setBackgroundResource(R.color.systemBarBackdrop);

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout());
            // adjustResize no longer moves the window for apps targeting 35+,
            // so the keyboard has to be treated as another inset. It overlaps
            // the navigation bar rather than stacking on top of it.
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());

            view.setPadding(
                    bars.left,
                    bars.top,
                    bars.right,
                    Math.max(bars.bottom, keyboard.bottom));

            return WindowInsetsCompat.CONSUMED;
        });
    }
}
