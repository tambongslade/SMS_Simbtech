
import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Child {
    id: number;
    name: string;
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

export function useParentDashboard() {
    const [data, setData] = useState<ParentDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            const response = await fetch(`${API_BASE_URL}/parents/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch dashboard data.');
            }

            const result = await response.json();
            setData(result.data);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, isLoading, error, refetch: fetchData };
} 