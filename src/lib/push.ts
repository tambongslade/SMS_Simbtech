// Thin wrapper over the OneSignal Cordova plugin so UI code never has to poke
// at window globals or care whether it is running in the Capacitor shell.
// On the plain website every call resolves to "not supported".
//
// Initialization and identity (OneSignal.login) live in OneSignalInit.tsx —
// this module only reads and flips the user's own subscription preference.

export interface PushState {
    /** True only inside the native app with the plugin present. */
    supported: boolean;
    /** OS-level permission for notifications. */
    permission: 'granted' | 'denied' | 'unknown';
    /** Whether this device is currently subscribed in OneSignal. */
    optedIn: boolean;
}

const UNSUPPORTED: PushState = { supported: false, permission: 'unknown', optedIn: false };

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

export async function getPushState(): Promise<PushState> {
    const OneSignal = getOneSignal();
    if (!OneSignal) return UNSUPPORTED;

    try {
        const granted = await resolve<boolean>(OneSignal.Notifications.getPermissionAsync(), false);
        const optedIn = await resolve<boolean>(OneSignal.User.pushSubscription.getOptedInAsync(), false);
        return {
            supported: true,
            permission: granted ? 'granted' : 'denied',
            optedIn: granted && optedIn,
        };
    } catch {
        return { supported: true, permission: 'unknown', optedIn: false };
    }
}

/**
 * Turn notifications on or off for this device, returning the resulting state.
 *
 * Enabling asks for OS permission the first time. On iOS that dialog can only
 * ever be shown once per install, so a later "denied" result means the user
 * must change it in device settings — the caller surfaces that.
 */
export async function setPushEnabled(enabled: boolean): Promise<PushState> {
    const OneSignal = getOneSignal();
    if (!OneSignal) return UNSUPPORTED;

    try {
        if (enabled) {
            const granted = await resolve<boolean>(
                OneSignal.Notifications.requestPermission(true),
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
