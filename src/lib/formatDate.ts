// Standardised date formatters — always day/month/year (en-GB, or fr-FR when
// the app is in French) so the output does not shift with the device locale. Use these instead of
// `.toLocaleDateString()` or ad-hoc `.split('T')[0]` for anything user-facing.

// "15 Mar 2005" ("15 mars 2005" in French) for anything that looks like a
// valid date, otherwise a dash. Accepts ISO strings, Date objects, or null/undefined.
export function formatDOB(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(appDateLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

// School timezone. `new Date().toISOString().split('T')[0]` returns the UTC
// date, which is still "yesterday" between 00:00 and 01:00 in Cameroon, so
// date pickers must use this helper for their default "today" value.
export const SCHOOL_TIMEZONE = 'Africa/Douala';

// "YYYY-MM-DD" for the given instant (default: now) in the school timezone.
export function schoolTodayStr(at: Date = new Date()): string {
    // en-CA formats dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: SCHOOL_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(at);
}

// ── Locale-aware display (day/month/year) ──
// Every user-facing date goes through these helpers so the order is always
// day/month/year: en-GB for English, fr-FR for French — never the device's
// en-US default (10/14/2026). The app language lives in localStorage
// 'app-language' (see LanguageContext), mirrored on <html lang>.
export type DateLocale = 'en-GB' | 'fr-FR';

export function appDateLocale(): DateLocale {
    try {
        if (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('fr')) return 'fr-FR';
        if (typeof localStorage !== 'undefined' && localStorage.getItem('app-language') === 'fr') return 'fr-FR';
    } catch { /* storage unavailable */ }
    return 'en-GB';
}

const toDate = (value: string | number | Date | null | undefined): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

// "14/10/2026"
export function formatDate(value: string | number | Date | null | undefined, fallback = '—'): string {
    const d = toDate(value);
    return d ? d.toLocaleDateString(appDateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : fallback;
}

// "14 Oct 2026" / "14 oct. 2026"
export function formatDateMedium(value: string | number | Date | null | undefined, fallback = '—'): string {
    const d = toDate(value);
    return d ? d.toLocaleDateString(appDateLocale(), { day: '2-digit', month: 'short', year: 'numeric' }) : fallback;
}

// "14/10/2026, 09:30"
export function formatDateTime(value: string | number | Date | null | undefined, fallback = '—'): string {
    const d = toDate(value);
    return d
        ? d.toLocaleString(appDateLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : fallback;
}
