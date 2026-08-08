// Thin wrapper over the OneSignal Cordova plugin so UI code never has to poke
// at window globals or care whether it is running in the Capacitor shell.
// On the plain website every call resolves to "not supported".
//
// Initialization and identity (OneSignal.login) live in OneSignalInit.tsx —
// this module only reads and flips the user's own subscription preference.

export interface PushState {
    /** True only inside the native app with the plugin present. */
    supported: boolean;
    /**
     * OS-level permission. 'notDetermined' means the system dialog has never
     * been shown, so asking will still work — it must not be reported to the
     * user as "blocked", which is only true of 'denied'.
     */
    permission: 'granted' | 'denied' | 'notDetermined' | 'unknown';
    /** Whether this device is currently subscribed in OneSignal. */
    optedIn: boolean;
    /** False once the OS refuses further prompts — only settings can fix it. */
    canAsk: boolean;
}

const UNSUPPORTED: PushState = {
    supported: false,
    permission: 'unknown',
    optedIn: false,
    canAsk: false,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const getOneSignal = (): any => {
    if (typeof window === 'undefined') return null;
    const cap = (window as any).Capacitor;
    if (!cap?.isNativePlatform?.()) return null;
    return (window as any).plugins?.OneSignal ?? null;
};

// The plugin exposes these as either plain values or promises depending on
// platform and version, so normalise before use.
const resolve = async <T,>(value: T | Promise<T>, fallback: T): Promise<T> => {
    try {
        return (await value) ?? fallback;
    } catch {
        return fallback;
    }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Mirrors OSNotificationPermission in the plugin. iOS reports all four; on
 *  Android the value is only ever NotDetermined, Denied or Authorized. */
const NATIVE_PERMISSION: Record<number, PushState['permission']> = {
    0: 'notDetermined',
    1: 'denied',
    2: 'granted',
    3: 'granted', // Provisional — quiet delivery, but pushes do arrive.
    4: 'granted', // Ephemeral (App Clips).
};

export async function getPushState(): Promise<PushState> {
    const OneSignal = getOneSignal();
    if (!OneSignal) return UNSUPPORTED;

    try {
        const granted = await resolve<boolean>(OneSignal.Notifications.getPermissionAsync(), false);
        const optedIn = await resolve<boolean>(OneSignal.User.pushSubscription.getOptedInAsync(), false);
        // canRequestPermission is the honest test for "has the OS given up on
        // us": Android returns false after the user dismisses twice, iOS after
        // the single dialog is answered.
        const canAsk = await resolve<boolean>(OneSignal.Notifications.canRequestPermission(), false);
        const native = await resolve<number>(OneSignal.Notifications.permissionNative(), -1);

        const permission: PushState['permission'] = granted
            ? 'granted'
            : NATIVE_PERMISSION[native] ?? (canAsk ? 'notDetermined' : 'denied');

        return { supported: true, permission, optedIn: granted && optedIn, canAsk };
    } catch {
        return { supported: true, permission: 'unknown', optedIn: false, canAsk: true };
    }
}

/**
 * Turn notifications on or off for this device, returning the resulting state.
 *
 * Enabling asks for OS permission the first time. The system dialog is a
 * one-shot — once per install on iOS, twice on Android — so this is called
 * only from a deliberate user action, never on launch.
 */
export async function setPushEnabled(enabled: boolean): Promise<PushState> {
    const OneSignal = getOneSignal();
    if (!OneSignal) return UNSUPPORTED;

    try {
        if (enabled) {
            // fallbackToSettings=false: a plain permission ask. Sending the user
            // to device settings is a separate, explicitly-labelled action.
            const granted = await resolve<boolean>(
                OneSignal.Notifications.requestPermission(false),
                false,
            );
            if (granted) OneSignal.User.pushSubscription.optIn();
        } else {
            OneSignal.User.pushSubscription.optOut();
        }
    } catch {
        // Fall through to a state read — the plugin may still have applied it.
    }

    return getPushState();
}

/**
 * Asks the OS to show its "open settings" path for a previously denied app.
 * This is the only way back once permission is hard-denied — the permission
 * dialog itself will never appear again.
 */
export async function openNotificationSettings(): Promise<PushState> {
    const OneSignal = getOneSignal();
    if (!OneSignal) return UNSUPPORTED;
    try {
        await resolve<boolean>(OneSignal.Notifications.requestPermission(true), false);
    } catch {
        // Nothing more we can do from JavaScript.
    }
    return getPushState();
}
