'use client'
import { useMemo, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { UserGroupIcon, AcademicCapIcon, BuildingLibraryIcon, CurrencyDollarIcon, UsersIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button, Select } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AcademicYear } from '@/app/dashboard/super-manager/academic-years/types/academic-year';
import { Class, SubClass } from '@/app/dashboard/super-manager/classes/types/class';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

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

// Interface for Fee Records (adjust based on actual API response)
interface FeeRecord {
    id: number | string;
    enrollment?: {
        subClassId?: number | string;
    };
    amountExpected: number;
    amountPaid: number;
}

// Interface for Aggregated Data
interface AggregatedFeeData {
    [subClassId: string]: {
        expected: number;
        paid: number;
    }
}

export default function SuperManagerDashboard() {
    const SUMMARY_API_ENDPOINT = `${API_BASE_URL}/dashboard/summary`;

    // Fetch summary data using SWR
    const {
        data: apiResult, // Raw API response, potentially { data: { ... } }
        error: fetchError,
        isLoading: isSummaryLoading // Renamed: Use SWR's loading state
    } = useSWR<SummaryApiResponse>(SUMMARY_API_ENDPOINT);

    // Extract the actual summary data, defaulting to empty object
    const summaryData = useMemo(() => apiResult?.data || {}, [apiResult]);

    // Fetch Active Academic Year
    const { data: activeYearResult, error: activeYearError } = useSWR< { data: AcademicYear[] } > (`${API_BASE_URL}/academic-years?isActive=true`);
    const activeAcademicYear = useMemo(() => activeYearResult?.data?.[0] || null, [activeYearResult]);

    // Fetch Classes with SubClasses
    const { data: classesResult, error: classesError } = useSWR< { data: Class[] } > (`${API_BASE_URL}/classes?includeSubClasses=true`);
    const classesList = useMemo(() => classesResult?.data || [], [classesResult]);
    const allSubClasses = useMemo(() => classesList.flatMap(c => c.subClasses || []).map(sc => ({ ...sc, id: String(sc.id) })), [classesList]); // Ensure ID is string

    // Fetch Fee Records for Active Year
    const feeRecordsKey = activeAcademicYear ? `${API_BASE_URL}/fees?academicYearId=${activeAcademicYear.id}&include=enrollment` : null;
    const { data: feeRecordsResult, error: feeRecordsError } = useSWR< { data: FeeRecord[] } >(feeRecordsKey);
    const feeRecords = useMemo(() => feeRecordsResult?.data || [], [feeRecordsResult]);

    // --- State --- 
    const [selectedSubClassId, setSelectedSubClassId] = useState<string>('');

    // --- Memoized Aggregation --- 
    const aggregatedFeeData = useMemo((): AggregatedFeeData => {
        const aggregation: AggregatedFeeData = {};
        feeRecords.forEach(record => {
            const subClassId = record.enrollment?.subClassId?.toString(); // Ensure string ID
            if (subClassId) {
                if (!aggregation[subClassId]) {
                    aggregation[subClassId] = { expected: 0, paid: 0 };
                }
                aggregation[subClassId].expected += record.amountExpected || 0;
                aggregation[subClassId].paid += record.amountPaid || 0;
            }
        });
        return aggregation;
    }, [feeRecords]);

    // --- Derived Overview for Selected Class --- 
    const selectedClassOverview = useMemo(() => {
        if (!selectedSubClassId || !aggregatedFeeData[selectedSubClassId]) {
            return { expected: 0, paid: 0, balance: 0 };
        }
        const data = aggregatedFeeData[selectedSubClassId];
        return { 
            ...data, 
            balance: data.expected - data.paid
        };
    }, [selectedSubClassId, aggregatedFeeData]);

    // --- Prepare Chart Data ---
    const chartData = useMemo(() => {
        if (!selectedSubClassId || !selectedClassOverview) {
            return [];
        }
        // Recharts typically expects an array of objects
        return [
            {
                name: allSubClasses.find(sc => sc.id === selectedSubClassId)?.name || 'Selected Class', // Use subclass name if available
                Expected: selectedClassOverview.expected,
                Collected: selectedClassOverview.paid,
            }
        ];
    }, [selectedSubClassId, selectedClassOverview, allSubClasses]);

    // --- Loading & Error Handling --- 
    const isFeeDataLoading = (!feeRecordsResult && !feeRecordsError && !!feeRecordsKey) || (!classesResult && !classesError) || (!activeYearResult && !activeYearError);
    const combinedError = fetchError || activeYearError || classesError || feeRecordsError;

    useEffect(() => {
        if (combinedError) {
            console.error("SWR Fetch Error (Dashboard):", combinedError);
            toast.error(`Failed to load some dashboard data: ${combinedError.message}`);
        }
    }, [combinedError]);

    // Define stats based on fetched summaryData
    const stats = [
        {
            title: 'Academic Years',
            value: isSummaryLoading ? '...' : String(summaryData.academicYearCount ?? 0),
            icon: AcademicCapIcon,
            color: 'primary'
        },
        {
            title: 'Personnel',
            value: isSummaryLoading ? '...' : String(summaryData.personnelCount ?? 0),
            icon: UsersIcon,
            color: 'secondary'
        },
        {
            title: 'Students',
            value: isSummaryLoading ? '...' : String(summaryData.studentCount ?? 0),
            icon: IdentificationIcon,
            color: 'info'
        },
        {
            title: 'Classes',
            value: isSummaryLoading ? '...' : String(summaryData.classCount ?? 0),
            icon: BuildingLibraryIcon,
            color: 'warning'
        },
        {
            title: 'Total Fees Collected (Overall)',
            value: isSummaryLoading ? '...' : `$${(summaryData.totalFeesCollected ?? 0).toLocaleString()}`,
            icon: CurrencyDollarIcon,
            color: 'success'
        },
    ];

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return amount.toLocaleString("en-US", {
             style: "currency",
             currency: "XAF", // Assuming XAF
             minimumFractionDigits: 0,
             maximumFractionDigits: 0
         });
    }

    return (
        <div className="flex">
            {/* Main Content */}
            <div className="flex-1 p-4">
                <h1 className="text-2xl font-bold">Super Manager Dashboard</h1>
                <p className="mb-6">Welcome to the Super Manager dashboard. Overview of key school metrics.</p>

                {/* Display error message if fetch failed */}
                {combinedError && !isSummaryLoading && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> Failed to load some dashboard data. Please try again later.</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {stats.map((stat, index) => (
                        <StatsCard key={index} {...stat} />
                    ))}
                </div>

                {/* --- Fee Overview Section --- */}
                <h2 className="text-xl font-semibold mb-4">Class Fee Overview ({activeAcademicYear?.name || 'Loading Year...'})</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Subclass Selector */}
                    <div className="md:col-span-1">
                        <label htmlFor="subclass-select" className="block text-sm font-medium text-gray-700 mb-1">
                            Select Subclass
                        </label>
                        <Select
                            id="subclass-select"
                            value={selectedSubClassId}
                            onChange={(e) => setSelectedSubClassId(e.target.value)}
                            options={[
                                { value: '', label: '-- Select a Subclass --' },
                                ...allSubClasses.map(sc => ({ value: sc.id, label: sc.name }))
                            ]}
                            disabled={isFeeDataLoading}
                            className="w-full"
                        />
                         {isFeeDataLoading && <p className="text-xs text-gray-500 mt-1">Loading classes/fees...</p>}
                    </div>

                    {/* Overview Display Card */}
                    <div className="md:col-span-2">
                       <Card>
                           <CardHeader>
                               <CardTitle>Fee Summary for: {allSubClasses.find(sc => sc.id === selectedSubClassId)?.name || 'N/A'}</CardTitle>
                           </CardHeader>
                           <CardBody className="space-y-3 min-h-[250px]">
                               {selectedSubClassId && chartData.length > 0 ? (
                                   <>
                                       {/* Fee Summary Chart */}
                                       <ResponsiveContainer width="100%" height={200}>
                                           <BarChart
                                               data={chartData}
                                               margin={{
                                                   top: 5, right: 30, left: 20, bottom: 5,
                                               }}
                                           >
                                               <CartesianGrid strokeDasharray="3 3" />
                                               <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                               <YAxis
                                                   tickFormatter={(value) => formatCurrency(value)}
                                                   tick={{ fontSize: 10 }}
                                                   width={80}
                                               />
                                               <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                               <Legend wrapperStyle={{ fontSize: '12px' }}/>
                                               <Bar dataKey="Expected" fill="#8884d8" name="Total Expected" />
                                               <Bar dataKey="Collected" fill="#82ca9d" name="Total Collected" />
                                           </BarChart>
                                       </ResponsiveContainer>
                                       {/* Balance Display */}
                                       <div className="text-center mt-2">
                                           <span className="font-medium">Balance:</span>
                                           <span className={`ml-2 font-semibold ${selectedClassOverview.balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                               {formatCurrency(selectedClassOverview.balance)}
                                           </span>
                                       </div>
                                   </>
                               ) : (
                                   <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500 italic">
                                           {isFeeDataLoading ? "Loading fee data..." : "Please select a subclass to view its fee summary."}
                                        </p>
                                   </div>
                               )}
                           </CardBody>
                       </Card>
                    </div>
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