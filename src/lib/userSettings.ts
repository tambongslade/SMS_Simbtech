// Notification preferences live on /api/v1/messaging/preferences. That endpoint
// speaks a nested shape (channel flags, a categories map, a quietHours object);
// this module flattens it into the shape the settings screen works with.

import { apiService } from '@/lib/apiService';

export type Theme = 'LIGHT' | 'DARK' | 'SYSTEM';

/** The only categories the backend recognises — sending others is dropped. */
export const NOTIFICATION_CATEGORIES = [
    'general',
    'academic',
    'disciplinary',
    'financial',
    'administrative',
    'emergency',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Human labels — the raw keys are not for showing to school staff. */
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
    general: 'General',
    academic: 'Academic — results and marks',
    disciplinary: 'Discipline and attendance',
    financial: 'Fees and payments',
    administrative: 'Administrative notices',
    emergency: 'Emergencies',
};

export interface UserSettings {
    notificationsEmail: boolean;
    notificationsSms: boolean;
    notificationsPush: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    /** Categories the user has switched off. Derived from the server's map. */
    mutedCategories: NotificationCategory[];
}

/** What /messaging/preferences returns. Every field is treated as optional
 *  because older accounts predate some of them. */
interface ApiPreferences {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    categories?: Partial<Record<NotificationCategory, boolean>>;
    quietHours?: { enabled?: boolean; startTime?: string | null; endTime?: string | null };
}

function fromApi(prefs: ApiPreferences | undefined): UserSettings {
    const categories = prefs?.categories ?? {};
    return {
        notificationsEmail: prefs?.emailNotifications ?? true,
        notificationsSms: prefs?.smsNotifications ?? false,
        notificationsPush: prefs?.pushNotifications ?? true,
        quietHoursEnabled: prefs?.quietHours?.enabled ?? false,
        quietHoursStart: prefs?.quietHours?.startTime ?? null,
        quietHoursEnd: prefs?.quietHours?.endTime ?? null,
        // Absent means "on" — only an explicit false counts as muted.
        mutedCategories: NOTIFICATION_CATEGORIES.filter(c => categories[c] === false),
    };
}

export async function fetchUserSettings(): Promise<UserSettings> {
    const res = await apiService.get<{ data?: ApiPreferences }>('/messaging/preferences');
    return fromApi(res.data);
}

/**
 * Sends the complete preference set rather than a patch: the categories map and
 * quietHours object are replaced wholesale server-side, so a partial body would
 * silently reset the fields it left out.
 */
export async function updateUserSettings(next: UserSettings): Promise<UserSettings> {
    const categories = Object.fromEntries(
        NOTIFICATION_CATEGORIES.map(c => [c, !next.mutedCategories.includes(c)]),
    );
    const body = {
        emailNotifications: next.notificationsEmail,
        pushNotifications: next.notificationsPush,
        smsNotifications: next.notificationsSms,
        categories,
        quietHours: {
            enabled: next.quietHoursEnabled,
            startTime: next.quietHoursStart ?? '22:00',
            endTime: next.quietHoursEnd ?? '06:00',
        },
    };
    const res = await apiService.put<{ data?: ApiPreferences }>('/messaging/preferences', body);
    // Some deployments echo only a success message; fall back to what we sent.
    return res.data ? fromApi(res.data) : next;
}

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

/** Matches the backend's HH:MM 24-hour validation so we fail before the request. */
export const isValidTime = (value: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

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
