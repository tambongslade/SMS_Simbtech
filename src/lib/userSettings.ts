// Account settings. The deployed API has no per-user preference endpoint —
// both /users/me/settings and the documented /messaging/preferences return
// "Route not found" — so notification channels, quiet hours and categories are
// deliberately absent here rather than being faked. What remains is the profile
// (/users/me), the device push opt-in (OneSignal, see lib/push), and the
// device-local display preferences below.

import { apiService } from '@/lib/apiService';

export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';

/** Theme and language have no server-side home yet, so they stay on the device. */
const LOCAL_PREFS_KEY = 'sms_local_prefs';

export interface LocalPrefs {
    theme: Theme;
    language: string;
}

export function loadLocalPrefs(): LocalPrefs {
    const fallback: LocalPrefs = { theme: 'SYSTEM', language: 'en' };
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(LOCAL_PREFS_KEY);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

export function saveLocalPrefs(prefs: LocalPrefs): void {
    try {
        window.localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs));
    } catch {
        // Private browsing / full storage — the choice just will not persist.
    }
}

/** Fields PUT /users/me actually honours. Anything else is silently dropped. */
export const EDITABLE_PROFILE_FIELDS = [
    'name',
    'phone',
    'whatsappNumber',
    'address',
    'photo',
    'idCardNum',
    'dateOfBirth',
    'gender',
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

export interface MeProfile {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    whatsappNumber?: string | null;
    address?: string | null;
    photo?: string | null;
    idCardNum?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    matricule?: string | null;
}

export async function fetchMe(): Promise<MeProfile> {
    const res = await apiService.get<{ data: MeProfile }>('/users/me');
    return res.data;
}

/**
 * Sends only the whitelisted fields whose value actually changed, so a profile
 * save never re-submits untouched data the user cannot see.
 */
export async function updateMe(
    original: MeProfile,
    edited: MeProfile,
): Promise<{ changed: boolean; profile?: MeProfile }> {
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE_PROFILE_FIELDS) {
        const before = original[field as keyof MeProfile] ?? '';
        const after = edited[field as keyof MeProfile] ?? '';
        if (before !== after) patch[field] = after === '' ? null : after;
    }
    if (Object.keys(patch).length === 0) return { changed: false };

    const res = await apiService.put<{ data: MeProfile }>('/users/me', patch);
    return { changed: true, profile: res.data };
}
