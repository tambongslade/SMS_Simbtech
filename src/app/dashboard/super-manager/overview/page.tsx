'use client'
import { useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, UsersIcon, IdentificationIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import apiService from '../../../lib/apiService';

// Interface for the expected summary data structure from the API
interface DashboardSummary {
    academicYearCount?: number;
    personnelCount?: number;
    studentCount?: number;
    classCount?: number;
    totalFeesCollected?: number;
    subClassCount?: number;
}

// Interface for the expected API response structure
interface SummaryApiResponse {
    success: boolean;
    data?: DashboardSummary;
    message?: string;
}

export default function SuperManagerDashboard() {
    // Fetch dashboard data with role parameter as specified in API docs
    const {
        data: dashboardData,
        error: dashboardError,
        isLoading
    } = useSWR<SummaryApiResponse>(
        '/users/me/dashboard?role=SUPER_MANAGER',
        (url: string) => apiService.get(url)
    );

    // Extract the actual summary data, defaulting to empty object
    const summaryData = useMemo(() => dashboardData?.data || {}, [dashboardData]);

    // Error handling for UI
    useEffect(() => {
        if (dashboardError && dashboardError.message !== 'Unauthorized') {
            console.error("Dashboard Fetch Error:", dashboardError);
            toast.error('Failed to load dashboard data');
        }
    }, [dashboardError]);

    // Define stats based on fetched summaryData
    const stats = [
        {
            title: 'Academic Years',
            value: isLoading ? '...' : String(summaryData.academicYearCount ?? 0),
            icon: AcademicCapIcon,
            color: 'primary' as const
        },
        {
            title: 'Personnel',
            value: isLoading ? '...' : String(summaryData.personnelCount ?? 0),
            icon: UsersIcon,
            color: 'secondary' as const
        },
        {
            title: 'Students',
            value: isLoading ? '...' : String(summaryData.studentCount ?? 0),
            icon: IdentificationIcon,
            color: 'warning' as const
        },
        {
            title: 'Classes',
            value: isLoading ? '...' : String(summaryData.classCount ?? 0),
            icon: BuildingLibraryIcon,
            color: 'warning' as const
        },
        {
            title: 'Sub Classes',
            value: isLoading ? '...' : String(summaryData.subClassCount ?? 0),
            icon: BuildingLibraryIcon,
            color: 'secondary' as const
        },
        {
            title: 'Total Fees Collected',
            value: isLoading ? '...' : `FCFA ${(summaryData.totalFeesCollected ?? 0).toLocaleString()}`,
            icon: CurrencyDollarIcon,
            color: 'success' as const
        },
    ] as const;

    const hasErrors = dashboardError;

    return (
        <div className="flex">
            {/* Main Content */}
            <div className="flex-1 p-4">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Super Manager Dashboard</h1>
                    <p className="text-gray-600">
                        Welcome to the Super Manager dashboard. Overview of key school metrics.
                    </p>
                </div>

                {/* Display error message if fetch failed */}
                {dashboardError && dashboardError.message !== 'Unauthorized' && !isLoading && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> Failed to load dashboard data. Please check your connection and try again.</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <StatsCard key={index} {...stat} />
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-0 h-auto text-left"
                                onClick={() => window.location.href = '/dashboard/super-manager/academic-years'}
                            >
                                🗓️ Manage Academic Years
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-0 h-auto text-left"
                                onClick={() => window.location.href = '/dashboard/super-manager/personnel-management'}
                            >
                                👥 Manage Personnel
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-0 h-auto text-left"
                                onClick={() => window.location.href = '/dashboard/super-manager/student-management'}
                            >
                                🎓 Manage Students
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-0 h-auto text-left"
                                onClick={() => window.location.href = '/dashboard/super-manager/classes'}
                            >
                                🏫 Manage Classes
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full justify-start p-0 h-auto text-left"
                                onClick={() => window.location.href = '/dashboard/super-manager/fees-management'}
                            >
                                💰 Fee Management
                            </Button>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>System Status</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">API Status</span>
                                    <span className={`text-sm font-medium ${dashboardError ? 'text-red-600' : 'text-green-600'}`}>
                                        {dashboardError ? '⚠️ Issues Detected' : '✅ Operational'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Last Updated</span>
                                    <span className="text-sm text-gray-900">
                                        {new Date().toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Your Role</span>
                                    <span className="text-sm font-medium text-blue-600">Super Manager</span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
} 