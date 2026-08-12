import { apiService, ApiError } from './apiService';

// ── Teacher search ───────────────────────────────────────────────────────────
// Wraps GET /users/teachers/search, the dedicated teacher-management endpoint
// (pagination + rich filters). Older backends only expose GET /users?role=TEACHER,
// so a 404 falls back to that and applies the filtering/paging client-side.

export type TeacherStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type TeacherGender = 'Male' | 'Female';
export type SortOrder = 'asc' | 'desc';

export const TEACHER_SORT_FIELDS = [
    'id',
    'name',
    'email',
    'matricule',
    'phone',
    'gender',
    'status',
    'createdAt',
    'updatedAt',
    'dateOfBirth',
    'lastSeenAt',
    'totalHoursPerWeek',
] as const;
export type TeacherSortField = (typeof TEACHER_SORT_FIELDS)[number];

export interface TeacherSubjectBrief {
    id: number;
    name: string;
    category?: string;
}

export interface TeacherSubClassBrief {
    id: number;
    name: string;
    class?: { id: number; name: string };
}

export interface TeacherSearchItem {
    id: number;
    name: string;
    email?: string;
    matricule?: string;
    phone?: string;
    whatsappNumber?: string;
    gender?: string;
    status?: TeacherStatus;
    dateOfBirth?: string;
    address?: string;
    photo?: string | null;
    totalHoursPerWeek?: number;
    lastSeenAt?: string;
    createdAt?: string;
    updatedAt?: string;
    subjects: TeacherSubjectBrief[];
    subClasses: TeacherSubClassBrief[];
    isHod: boolean;
    hodSubjects: TeacherSubjectBrief[];
    isClassMaster: boolean;
    classMasterOf: TeacherSubClassBrief[];
    totalAssignments: number;
}

export interface TeacherSearchFilters {
    q?: string;
    name?: string;
    email?: string;
    matricule?: string;
    phone?: string;
    gender?: TeacherGender | '';
    status?: TeacherStatus | '';
    subjectId?: number;
    subClassId?: number;
    academicYearId?: number;
    isHod?: boolean;
    hodSubjectId?: number;
    isClassMaster?: boolean;
    classMasterOfSubClassId?: number;
    minHoursPerWeek?: number;
    maxHoursPerWeek?: number;
    hasAssignments?: boolean;
    page?: number;
    limit?: number;
    sortBy?: TeacherSortField;
    sortOrder?: SortOrder;
}

export interface TeacherSearchMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface TeacherSearchResponse {
    data: TeacherSearchItem[];
    meta: TeacherSearchMeta;
    /** True when the dedicated endpoint was unavailable and results came from /users. */
    degraded: boolean;
}

const DEFAULT_LIMIT = 20;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toArray = (value: any): any[] => (Array.isArray(value) ? value : []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapSubject = (s: any): TeacherSubjectBrief => ({
    id: s?.id,
    name: s?.name ?? '',
    category: s?.category,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapSubClass = (sc: any): TeacherSubClassBrief => ({
    id: sc?.id,
    name: sc?.name ?? '',
    class: sc?.class ? { id: sc.class.id, name: sc.class.name } : undefined,
});

/** Normalises both the new endpoint's rows and legacy /users rows into one shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapTeacher = (t: any): TeacherSearchItem => {
    const hodSubjects = toArray(t?.hodSubjects).map(mapSubject);
    const classMasterOf = toArray(t?.classMasterOf).map(mapSubClass);
    return {
        id: t?.id,
        name: t?.name ?? '',
        email: t?.email ?? undefined,
        matricule: t?.matricule ?? undefined,
        phone: t?.phone ?? undefined,
        whatsappNumber: t?.whatsappNumber ?? t?.whatsapp_number ?? undefined,
        gender: t?.gender ?? undefined,
        status: t?.status ?? undefined,
        dateOfBirth: t?.dateOfBirth ?? t?.date_of_birth ?? undefined,
        address: t?.address ?? undefined,
        photo: t?.photo ?? null,
        totalHoursPerWeek: t?.totalHoursPerWeek ?? t?.total_hours_per_week ?? undefined,
        lastSeenAt: t?.lastSeenAt ?? t?.last_seen_at ?? undefined,
        createdAt: t?.createdAt ?? t?.created_at ?? undefined,
        updatedAt: t?.updatedAt ?? t?.updated_at ?? undefined,
        subjects: toArray(t?.subjects).map(mapSubject),
        subClasses: toArray(t?.subClasses ?? t?.sub_classes).map(mapSubClass),
        isHod: t?.isHod ?? hodSubjects.length > 0,
        hodSubjects,
        isClassMaster: t?.isClassMaster ?? classMasterOf.length > 0,
        classMasterOf,
        totalAssignments: t?.totalAssignments ?? toArray(t?.subjects).length,
    };
};

/** Drops empty values so the backend never receives `?gender=` and 400s on it. */
const buildParams = (filters: TeacherSearchFilters): Record<string, string> => {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        params[key] = String(value);
    });
    return params;
};

const matchesText = (teacher: TeacherSearchItem, term: string): boolean => {
    const needle = term.toLowerCase();
    return [teacher.name, teacher.email, teacher.matricule, teacher.phone].some(
        (field) => field?.toLowerCase().includes(needle),
    );
};

/** Client-side stand-in for the server filters when only /users is available. */
const applyFallbackFilters = (
    teachers: TeacherSearchItem[],
    filters: TeacherSearchFilters,
): TeacherSearchItem[] => {
    let result = teachers;
    if (filters.q?.trim()) result = result.filter((t) => matchesText(t, filters.q!.trim()));
    if (filters.gender) result = result.filter((t) => t.gender?.toLowerCase() === filters.gender!.toLowerCase());
    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.subjectId) result = result.filter((t) => t.subjects.some((s) => s.id === filters.subjectId));
    if (filters.subClassId) result = result.filter((t) => t.subClasses.some((sc) => sc.id === filters.subClassId));
    if (filters.isHod !== undefined) result = result.filter((t) => t.isHod === filters.isHod);
    if (filters.isClassMaster !== undefined) result = result.filter((t) => t.isClassMaster === filters.isClassMaster);
    if (filters.hasAssignments !== undefined) {
        result = result.filter((t) => (t.totalAssignments > 0) === filters.hasAssignments);
    }
    if (filters.minHoursPerWeek !== undefined) {
        result = result.filter((t) => (t.totalHoursPerWeek ?? 0) >= filters.minHoursPerWeek!);
    }
    if (filters.maxHoursPerWeek !== undefined) {
        result = result.filter((t) => (t.totalHoursPerWeek ?? 0) <= filters.maxHoursPerWeek!);
    }

    const sortBy = filters.sortBy ?? 'name';
    const direction = filters.sortOrder === 'desc' ? -1 : 1;
    result = [...result].sort((a, b) => {
        const left = a[sortBy as keyof TeacherSearchItem];
        const right = b[sortBy as keyof TeacherSearchItem];
        if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
        return String(left ?? '').localeCompare(String(right ?? '')) * direction;
    });
    return result;
};

const searchTeachersLegacy = async (
    filters: TeacherSearchFilters,
): Promise<TeacherSearchResponse> => {
    const params: Record<string, string> = { role: 'TEACHER' };
    if (filters.q?.trim()) params.search = filters.q.trim();
    if (filters.academicYearId) params.academicYearId = String(filters.academicYearId);
    params.limit = '500';

    const result = await apiService.get('/users', { params });
    const all = toArray(result?.data).map(mapTeacher);
    const filtered = applyFallbackFilters(all, filters);

    const limit = filters.limit ?? DEFAULT_LIMIT;
    const page = filters.page ?? 1;
    const start = (page - 1) * limit;
    return {
        data: filtered.slice(start, start + limit),
        meta: {
            total: filtered.length,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        },
        degraded: true,
    };
};

export const searchTeachers = async (
    filters: TeacherSearchFilters = {},
): Promise<TeacherSearchResponse> => {
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const page = filters.page ?? 1;
    try {
        const result = await apiService.get(
            '/users/teachers/search',
            { params: buildParams({ ...filters, page, limit }), silent: true },
        );
        const data = toArray(result?.data).map(mapTeacher);
        const meta = result?.meta ?? {};
        return {
            data,
            meta: {
                total: meta.total ?? data.length,
                page: meta.page ?? page,
                limit: meta.limit ?? limit,
                totalPages: meta.totalPages ?? Math.max(1, Math.ceil((meta.total ?? data.length) / limit)),
            },
            degraded: false,
        };
    } catch (error) {
        // 404 means this backend predates the endpoint — fall back rather than fail.
        if (error instanceof ApiError && error.status === 404) {
            return searchTeachersLegacy(filters);
        }
        throw error;
    }
};
