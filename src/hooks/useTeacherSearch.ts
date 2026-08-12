'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiService } from '@/lib/apiService';
import {
    searchTeachers,
    type TeacherSearchFilters,
    type TeacherSearchItem,
    type TeacherSearchMeta,
} from '@/lib/teacherSearchApi';

/** Searching only starts once the user has typed this many characters. */
export const MIN_SEARCH_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 400;

/** Filters the UI owns; paging and the academic year are managed by the hook. */
export type TeacherQueryFilters = Omit<TeacherSearchFilters, 'q' | 'page' | 'academicYearId'>;

interface UseTeacherSearchOptions {
    academicYearId?: number;
    limit?: number;
    initialFilters?: TeacherQueryFilters;
}

export interface UseTeacherSearchResult {
    teachers: TeacherSearchItem[];
    meta: TeacherSearchMeta;
    isLoading: boolean;
    /** True only for the first load — lets tables keep rows visible while refetching. */
    isInitialLoading: boolean;
    /** Raw input value; bind this to the search box so typing never blocks on a request. */
    searchInput: string;
    setSearchInput: (value: string) => void;
    /** Set when 1–2 characters have been typed, so the UI can explain the wait. */
    searchHint: string | null;
    filters: TeacherQueryFilters;
    setFilter: <K extends keyof TeacherQueryFilters>(key: K, value: TeacherQueryFilters[K]) => void;
    resetFilters: () => void;
    hasActiveFilters: boolean;
    page: number;
    setPage: (page: number) => void;
    refresh: () => void;
    /** True when results came from the legacy /users endpoint. */
    degraded: boolean;
}

const emptyMeta = (limit: number): TeacherSearchMeta => ({ total: 0, page: 1, limit, totalPages: 1 });

export function useTeacherSearch({
    academicYearId,
    limit = 20,
    initialFilters = {},
}: UseTeacherSearchOptions = {}): UseTeacherSearchResult {
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filters, setFilters] = useState<TeacherQueryFilters>(initialFilters);
    const [page, setPage] = useState(1);
    const [teachers, setTeachers] = useState<TeacherSearchItem[]>([]);
    const [meta, setMeta] = useState<TeacherSearchMeta>(emptyMeta(limit));
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [degraded, setDegraded] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);

    // Only the newest request may write state, so a slow early response cannot
    // overwrite the results of a later keystroke.
    const requestId = useRef(0);

    const initialFiltersRef = useRef(initialFilters);

    // Short inputs are treated as "no search" — the request only fires from
    // MIN_SEARCH_LENGTH characters up, or when the box is cleared.
    useEffect(() => {
        const trimmed = searchInput.trim();
        const effective = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : '';
        if (effective === debouncedSearch) return;
        const timer = setTimeout(() => setDebouncedSearch(effective), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [searchInput, debouncedSearch]);

    // Any change to what is being searched puts the user back on page 1.
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters, academicYearId]);

    const filtersKey = JSON.stringify(filters);

    useEffect(() => {
        let cancelled = false;
        const id = ++requestId.current;

        const run = async () => {
            setIsLoading(true);
            try {
                const response = await searchTeachers({
                    ...(JSON.parse(filtersKey) as TeacherQueryFilters),
                    q: debouncedSearch || undefined,
                    academicYearId,
                    page,
                    limit,
                });
                if (cancelled || id !== requestId.current) return;
                setTeachers(response.data);
                setMeta(response.meta);
                setDegraded(response.degraded);
            } catch (error: unknown) {
                if (cancelled || id !== requestId.current) return;
                const message = error instanceof Error ? error.message : 'Failed to load teachers.';
                if (message !== 'Unauthorized') toast.error(message, { id: 'teacher-search' });
                setTeachers([]);
                setMeta(emptyMeta(limit));
            } finally {
                if (!cancelled && id === requestId.current) {
                    setIsLoading(false);
                    setHasLoadedOnce(true);
                }
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, filtersKey, academicYearId, page, limit, reloadToken]);

    const setFilter = useCallback(
        <K extends keyof TeacherQueryFilters>(key: K, value: TeacherQueryFilters[K]) => {
            setFilters((prev) => {
                const next = { ...prev };
                if (value === undefined || value === '') delete next[key];
                else next[key] = value;
                return next;
            });
        },
        [],
    );

    const resetFilters = useCallback(() => {
        setFilters(initialFiltersRef.current);
        setSearchInput('');
    }, []);

    const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

    const trimmed = searchInput.trim();
    const searchHint =
        trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH
            ? `Type at least ${MIN_SEARCH_LENGTH} characters to search`
            : null;

    const hasActiveFilters = useMemo(
        () => trimmed.length > 0 || Object.keys(filters).length > Object.keys(initialFiltersRef.current).length,
        [trimmed, filters],
    );

    return {
        teachers,
        meta,
        isLoading,
        isInitialLoading: isLoading && !hasLoadedOnce,
        searchInput,
        setSearchInput,
        searchHint,
        filters,
        setFilter,
        resetFilters,
        hasActiveFilters,
        page,
        setPage,
        refresh,
        degraded,
    };
}

// ── Filter dropdown options ──────────────────────────────────────────────────

export interface FilterOption {
    id: number;
    name: string;
}

export interface SubClassOption extends FilterOption {
    className?: string;
}

export function useTeacherFilterOptions() {
    const [subjects, setSubjects] = useState<FilterOption[]>([]);
    const [subClasses, setSubClasses] = useState<SubClassOption[]>([]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [subjectsResult, classesResult] = await Promise.all([
                    apiService.get('/subjects', { silent: true }).catch(() => null),
                    apiService.get('/classes', { params: { includeSubClasses: 'true' }, silent: true }).catch(() => null),
                ]);
                if (cancelled) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mappedSubjects = (subjectsResult?.data ?? []).map((s: any) => ({ id: s.id, name: s.name }));
                setSubjects(mappedSubjects);
                const mappedSubClasses: SubClassOption[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (classesResult?.data ?? []).forEach((c: any) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (c?.subClasses ?? c?.sub_classes ?? []).forEach((sc: any) => {
                        mappedSubClasses.push({ id: sc.id, name: sc.name, className: c.name });
                    });
                });
                setSubClasses(mappedSubClasses);
            } catch {
                // Filter dropdowns are optional — a failure here must not break the page.
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    return { subjects, subClasses };
}
