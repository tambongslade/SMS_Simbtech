package com.simbtech.sms;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // So the channel is listed under Settings > Notifications from first
        // launch, rather than only appearing after the first push arrives.
        // NotificationServiceExtension creates it too — see NotificationChannels.
        NotificationChannels.ensureCreated(this);
    }
}
