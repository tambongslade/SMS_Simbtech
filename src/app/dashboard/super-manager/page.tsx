'use client'
import { useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, CurrencyDollarIcon, UsersIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import apiService from '../../../lib/apiService'; // Import apiService

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1'; // Removed

// Interface for the expected summary data structure from the API
interface DashboardSummary {
    academicYearCount?: number;
    personnelCount?: number;
    studentCount?: number;
    classCount?: number;
    totalFeesCollected?: number;
    // Add other relevant summary fields if the API provides them
}

// Interface for the expected API response structure
interface SummaryApiResponse {
    data?: DashboardSummary;
    // Include other potential top-level keys from the API response if necessary
}

export default function SuperManagerDashboard() {
    const SUMMARY_API_ENDPOINT = '/users/me/dashboard'; // Relative path for apiService

    // Fetch summary data using SWR with apiService
    const {
        data: apiResult, // Raw API response, potentially { data: { ... } }
        error: fetchError,
        isLoading // Use SWR's loading state
    } = useSWR<SummaryApiResponse>(SUMMARY_API_ENDPOINT, (url: string) => apiService.get(url));

    // Extract the actual summary data, defaulting to empty object
    const summaryData = useMemo(() => apiResult?.data || {}, [apiResult]);

    // Error handling for UI (toast is handled by apiService)
    useEffect(() => {
        if (fetchError && fetchError.message !== 'Unauthorized') { // apiService handles Unauthorized redirect and toast
            console.error("SWR Fetch Error (Summary):", fetchError);
            // Optionally, show a specific UI error element or a non-intrusive general error indicator
            // toast.error(`Failed to load dashboard summary: ${fetchError.message}`); // Removed, apiService handles this
        }
    }, [fetchError]);

    // Define stats based on fetched summaryData
    const stats = [
        {
            title: 'Academic Years',
            value: isLoading ? '...' : String(summaryData.academicYearCount ?? 0),
            icon: AcademicCapIcon,
            color: 'primary'
        },
        {
            title: 'Personnel',
            value: isLoading ? '...' : String(summaryData.personnelCount ?? 0),
            icon: UsersIcon,
            color: 'secondary'
        },
        {
            title: 'Students',
            value: isLoading ? '...' : String(summaryData.studentCount ?? 0),
            icon: IdentificationIcon,
            color: 'info'
        },
        {
            title: 'Classes',
            value: isLoading ? '...' : String(summaryData.classCount ?? 0),
            icon: BuildingLibraryIcon,
            color: 'warning'
        },
        {
            title: 'Total Fees Collected',
            value: isLoading ? '...' : `FCFA ${(summaryData.totalFeesCollected ?? 0).toLocaleString()}`,
            icon: CurrencyDollarIcon,
            color: 'success'
        },
    ];

    return (
        <div className="flex">
            {/* Main Content */}
            <div className="flex-1 p-4">
                <h1 className="text-2xl font-bold">Super Manager Dashboard</h1>
                <p className="mb-6">Welcome to the Super Manager dashboard. Overview of key school metrics.</p>

                {/* Display error message if fetch failed (and not an Unauthorized error, which causes redirect) */}
                {fetchError && fetchError.message !== 'Unauthorized' && !isLoading && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> Failed to load dashboard data. Please try again later.</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((stat, index) => (
                        <StatsCard key={index} {...stat} />
                    ))}
                </div>

                {/* Remove static descriptive text sections if overview cards are sufficient */}
                {/* 
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                           <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-2">
                            <Button variant="link" className="p-0 h-auto">Go to Academic Year Management</Button>
                            <Button variant="link" className="p-0 h-auto">Go to Fee Management</Button>
                            <Button variant="link" className="p-0 h-auto">Go to Personnel Management</Button>
                        </CardBody>
                    </Card>
                     <Card>
                        <CardHeader>
                           <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <p className="text-gray-500 italic">(Recent activity feed placeholder)</p>
                        </CardBody>
                    </Card>
                </div>
                 */}
            </div>
        </div>
    );
} 