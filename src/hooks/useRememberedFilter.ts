'use client';

// Remembered page filters (academic year, sequence, subclass, ...).
//
// Every results / marks / report-card page used to start with empty dropdowns,
// so staff re-picked the same year, sequence and class on each visit. Filters
// set through these hooks are stored per user in localStorage under shared
// keys (FILTER_KEYS), so a year chosen on one page is the default on the next.
// Storage can be unavailable (private window, blocked site data) — every read
// and write is wrapped and the page simply falls back to the defaults.

import { useCallback, useEffect, useState } from 'react';

export const FILTER_KEYS = {
    academicYear: 'academicYearId',
    sequence: 'examSequenceId',
    term: 'termId',
    subClass: 'subClassId',
    class: 'classId',
} as const;

type FilterValue = number | string | '';

const currentUserId = (): string => {
    try {
        const raw = localStorage.getItem('userData');
        const id = raw ? (JSON.parse(raw) as { id?: number | string })?.id : undefined;
        return id != null ? String(id) : 'anon';
    } catch {
        return 'anon';
    }
};

const storageKey = (key: string) => `sms-filters:${currentUserId()}:${key}`;

const readFilter = (key: string): FilterValue | undefined => {
    try {
        const raw = localStorage.getItem(storageKey(key));
        if (raw == null) return undefined;
        const parsed = JSON.parse(raw) as unknown;
        return typeof parsed === 'number' || typeof parsed === 'string' ? parsed : undefined;
    } catch {
        return undefined;
    }
};

const writeFilter = (key: string, value: FilterValue) => {
    try {
        if (value === '' || value == null) localStorage.removeItem(storageKey(key));
        else localStorage.setItem(storageKey(key), JSON.stringify(value));
    } catch { /* storage unavailable — keep the in-memory value only */ }
};

/**
 * useState that remembers its value per user across pages and visits.
 * `validValues`: once the option list has loaded (non-empty), a remembered
 * value that is no longer in it is dropped back to ''.
 * Returns [value, setValue, loaded] — `loaded` is false until the stored value
 * has been read, so callers can hold off their own defaulting until then.
 */
export function useRememberedFilter<T extends number | string>(
    key: string,
    validValues?: readonly T[],
): [T | '', (value: T | '') => void, boolean] {
    const [value, setValueState] = useState<T | ''>('');
    const [loaded, setLoaded] = useState(false);

    // Read after mount: the server render has no localStorage, and reading in
    // the useState initialiser would cause a hydration mismatch.
    useEffect(() => {
        const stored = readFilter(key);
        if (stored !== undefined) setValueState(stored as T);
        setLoaded(true);
    }, [key]);

    const setValue = useCallback((next: T | '') => {
        setValueState(next);
        writeFilter(key, next);
    }, [key]);

    const validKey = validValues ? validValues.join(',') : null;
    useEffect(() => {
        if (!loaded || !validValues || validValues.length === 0 || value === '') return;
        if (!validValues.includes(value as T)) setValue('');
        // validKey stands in for the array identity, which changes every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, validKey, value, setValue]);

    return [value, setValue, loaded];
}

interface YearLike {
    id: number;
    isCurrent?: boolean;
}

// The year chosen at login (AuthContext keeps it in localStorage 'academicYear').
const sessionYearId = (): number | null => {
    try {
        const raw = localStorage.getItem('academicYear');
        const id = raw ? (JSON.parse(raw) as { id?: number })?.id : undefined;
        return typeof id === 'number' ? id : null;
    } catch {
        return null;
    }
};

/** Default year for a dropdown: login year if listed → current year → first. */
export function pickDefaultYearId(years: readonly YearLike[]): number | '' {
    if (years.length === 0) return '';
    const session = sessionYearId();
    return (years.find(y => y.id === session) ?? years.find(y => y.isCurrent) ?? years[0]).id;
}

/**
 * Academic-year dropdown state with a sensible default: the year the user last
 * picked on any page → the year chosen at login → the current year → the first.
 */
export function useAcademicYearFilter(
    years: readonly YearLike[] | undefined,
): [number | '', (value: number | '') => void] {
    const ids = (years ?? []).map(y => y.id);
    const [yearId, setYearId, loaded] = useRememberedFilter<number>(FILTER_KEYS.academicYear, ids);

    useEffect(() => {
        if (!loaded || yearId !== '' || !years || years.length === 0) return;
        setYearId(pickDefaultYearId(years));
    }, [loaded, yearId, years, setYearId]);

    return [yearId, setYearId];
}
