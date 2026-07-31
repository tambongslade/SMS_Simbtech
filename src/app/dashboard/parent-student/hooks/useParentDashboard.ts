
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Child {
    id: number;
    name: string;
    matricule?: string;
    className?: string;
    subclassName?: string;
    enrollmentStatus: string;
    photo?: string;
    attendanceRate: number;
    latestMarks: {
        subjectName: string;
        latestMark: number;
        sequence: string;
        date: string;
    }[];
    pendingFees: number;
    disciplineIssues: number;
    recentAbsences: number;
}

export interface ParentDashboardData {
    totalChildren: number;
    childrenEnrolled: number;
    pendingFees: number;
    totalFeesOwed: number;
    latestGrades: number;
    disciplineIssues: number;
    unreadMessages: number;
    upcomingEvents: number;
    children: Child[];
}

// The parent portal is matricule-based (no login): the device keeps a list of
// child matricules in localStorage under 'parentPortal', and each child's
// summary comes from the public GET /parents/:matricule/dashboard endpoint.
export const getSavedMatricules = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const portal = JSON.parse(localStorage.getItem('parentPortal') || 'null');
        return Array.isArray(portal?.matricules) ? portal.matricules : [];
    } catch {
        return [];
    }
};

export const saveMatricules = (matricules: string[], active?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('parentPortal', JSON.stringify({
        matricules,
        active: active ?? matricules[0] ?? null,
    }));
};

// Tolerant mapping — the per-child dashboard payload shape may evolve.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toChild = (payload: any, matricule: string, index: number): Child => {
    const d = payload?.data ?? payload ?? {};
    const student = d.student ?? d.child ?? d;
    return {
        id: student.id ?? -(index + 1),
        name: student.name ?? 'Unknown student',
        matricule: student.matricule ?? matricule,
        className: d.enrollment?.className ?? student.className,
        subclassName: d.enrollment?.subclassName ?? student.subclassName,
        enrollmentStatus: d.enrollment?.status ?? student.status ?? 'ENROLLED',
        photo: student.photo ?? student.photoUrl ?? undefined,
        attendanceRate: d.attendance?.attendanceRate ?? d.attendanceRate ?? 0,
        latestMarks: d.latestMarks ?? d.academic?.latestMarks ?? [],
        pendingFees: d.fees?.outstandingBalance ?? d.pendingFees ?? d.fees?.balance ?? 0,
        disciplineIssues: d.discipline?.totalIssues ?? d.disciplineIssues ?? 0,
        recentAbsences: d.attendance?.recentAbsences ?? d.recentAbsences ?? 0,
    };
};

export function useParentDashboard() {
    const [data, setData] = useState<ParentDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const matricules = getSavedMatricules();
            if (matricules.length === 0) {
                setData({
                    totalChildren: 0, childrenEnrolled: 0, pendingFees: 0, totalFeesOwed: 0,
                    latestGrades: 0, disciplineIssues: 0, unreadMessages: 0, upcomingEvents: 0,
                    children: [],
                });
                return;
            }

            const responses = await Promise.all(matricules.map(m =>
                fetch(`${API_BASE_URL}/parents/${encodeURIComponent(m)}/dashboard`)
                    .then(r => (r.ok ? r.json() : null))
                    .catch(() => null)
            ));

            const children = responses
                .map((res, i) => (res ? toChild(res, matricules[i], i) : null))
                .filter((c): c is Child => c !== null);

            if (children.length === 0) {
                throw new Error('Could not load any of your children. Please check your connection.');
            }

            setData({
                totalChildren: children.length,
                childrenEnrolled: children.filter(c => c.enrollmentStatus !== 'NOT_ENROLLED').length,
                pendingFees: children.filter(c => c.pendingFees > 0).length,
                totalFeesOwed: children.reduce((s, c) => s + (c.pendingFees || 0), 0),
                latestGrades: children.reduce((s, c) => s + (c.latestMarks?.length || 0), 0),
                disciplineIssues: children.reduce((s, c) => s + (c.disciplineIssues || 0), 0),
                unreadMessages: 0,
                upcomingEvents: 0,
                children,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load dashboard.';
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Add another child on this device by matricule; validates before saving.
    const addChild = useCallback(async (matricule: string): Promise<boolean> => {
        const normalized = matricule.trim().toUpperCase();
        if (!normalized) return false;
        try {
            const res = await fetch(`${API_BASE_URL}/parents/${encodeURIComponent(normalized)}/dashboard`);
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.success === false) {
                toast.error(json?.error || 'Student not found for that matricule.');
                return false;
            }
            const matricules = Array.from(new Set([...getSavedMatricules(), normalized]));
            saveMatricules(matricules, normalized);
            toast.success('Child added.');
            await fetchData();
            return true;
        } catch {
            toast.error('Could not reach the server. Please try again.');
            return false;
        }
    }, [fetchData]);

    const removeChild = useCallback(async (matricule: string) => {
        const matricules = getSavedMatricules().filter(m => m !== matricule);
        saveMatricules(matricules);
        await fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, isLoading, error, refetch: fetchData, addChild, removeChild };
}
