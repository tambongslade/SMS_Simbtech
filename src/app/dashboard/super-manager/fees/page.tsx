'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { MagnifyingGlassIcon, FunnelIcon, CheckCircleIcon, ClockIcon, XCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import apiService from '../../../../lib/apiService'; // Import apiService

// --- Type Definitions (move to types.ts later) ---
type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

interface StudentInfo {
    id: number | string;
    name: string;
    matricule?: string; // Optional matricule
}

interface ClassInfo {
    id: number | string;
    name: string;
}

interface PaymentRecord {
    id: number | string;
    student: StudentInfo;
    classInfo: ClassInfo; // Assuming class info is available
    academicYear?: { id: number | string; name: string }; // Optional academic year info
    term?: { id: number | string; name: string }; // Optional term info
    amountExpected: number;
    amountPaid: number;
    balance: number;
    status: PaymentStatus;
    dueDate?: string; // Optional due date
    lastPaymentDate?: string; // Optional last payment date
}

// --- API Configuration ---
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
// const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- Mock Data (Replace with API call) ---
const generateMockPayments = (): PaymentRecord[] => {
    return [
        {
            id: 1, student: { id: 101, name: 'Alice Johnson', matricule: 'S101' }, classInfo: { id: 1, name: 'Form 1 A' },
            amountExpected: 50000, amountPaid: 50000, balance: 0, status: 'Paid', lastPaymentDate: '2024-03-15'
        },
        {
            id: 2, student: { id: 102, name: 'Bob Williams', matricule: 'S102' }, classInfo: { id: 1, name: 'Form 1 A' },
            amountExpected: 50000, amountPaid: 20000, balance: 30000, status: 'Partially Paid', dueDate: '2024-04-30'
        },
        {
            id: 3, student: { id: 103, name: 'Charlie Brown', matricule: 'S103' }, classInfo: { id: 2, name: 'Form 2 B' },
            amountExpected: 60000, amountPaid: 0, balance: 60000, status: 'Unpaid', dueDate: '2024-04-30'
        },
        {
            id: 4, student: { id: 104, name: 'Diana Miller', matricule: 'S104' }, classInfo: { id: 2, name: 'Form 2 B' },
            amountExpected: 60000, amountPaid: 60000, balance: 0, status: 'Paid', lastPaymentDate: '2024-02-28'
        },
    ];
};

export default function FeesPaymentManagement() {
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
    const [classFilter, setClassFilter] = useState<string | 'all'>('all'); // Use class ID or name as string
    const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]); // To populate filter dropdown

    const FEES_ENDPOINT = '/fees'; // Define base endpoint
    const CLASSES_ENDPOINT = '/classes'; // Define classes endpoint

    // --- Fetching Data ---
    const fetchData = async () => {
        setIsLoading(true);
        const queryParams = new URLSearchParams();
        if (statusFilter !== 'all') queryParams.append('paymentStatus', statusFilter);
        if (classFilter !== 'all') queryParams.append('classId', classFilter);
        if (searchTerm) queryParams.append('studentSearch', searchTerm);
        // queryParams.append('page', '1'); 
        // queryParams.append('limit', '50');

        const url = `${FEES_ENDPOINT}?${queryParams.toString()}`;
        console.log("Fetching from URL:", url);

        try {
            const result = await apiService.get<{ data: any[] }>(url); // Use apiService

            const mappedPayments = result.data?.map((item: any): PaymentRecord => ({
                id: item.fee_id || item.id,
                student: {
                    id: item.student?.id,
                    name: item.student?.name,
                    matricule: item.student?.matricule
                },
                classInfo: {
                    id: item.class?.id,
                    name: item.class?.name
                },
                academicYear: item.academic_year ? { id: item.academic_year.id, name: item.academic_year.name } : undefined,
                term: item.term ? { id: item.term.id, name: item.term.name } : undefined,
                amountExpected: item.amount_expected,
                amountPaid: item.amount_paid,
                balance: item.balance ?? (item.amount_expected - item.amount_paid),
                status: item.payment_status,
                dueDate: item.due_date,
                lastPaymentDate: item.last_payment_date
            })) || [];
            setPayments(mappedPayments);

            // Fetch available classes if not already fetched (Consider doing this once)
            if (availableClasses.length === 0) {
                try {
                    const classResult = await apiService.get<{ data: ClassInfo[] }>(`${CLASSES_ENDPOINT}?fields=id,name`);
                    setAvailableClasses(classResult.data || []);
                } catch (classError: any) {
                    console.error("Failed to fetch classes:", classError);
                    // apiService will toast for auth, but maybe a specific non-blocking error for classes
                    if (classError.message !== 'Unauthorized') {
                        toast.error("Could not load class filter options.");
                    }
                }
            }
        } catch (error: any) {
            console.error("Failed to fetch payment data:", error);
            setPayments(generateMockPayments()); // Fallback to mock on error, or handle differently
            // apiService handles toast for main data fetch error
            if (error.message !== 'Unauthorized') {
                // toast.error(`Failed to fetch data: ${error.message}`); // Already handled by apiService
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter, classFilter, searchTerm]); // Re-fetch when filters change for server-side filtering

    // --- Client-side Filtering & Searching ---
    const filteredPayments = useMemo(() => {
        return payments.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm ||
                p.student.name.toLowerCase().includes(searchLower) ||
                p.student.matricule?.toLowerCase().includes(searchLower);

            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            const matchesClass = classFilter === 'all' || String(p.classInfo.id) === classFilter;

            return matchesSearch && matchesStatus && matchesClass;
        });
    }, [payments, searchTerm, statusFilter, classFilter]);

    // --- Status Styling Helper ---
    const getStatusBadge = (status: PaymentStatus) => {
        switch (status) {
            case 'Paid': return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 items-center"><CheckCircleIcon className='h-3 w-3 mr-1' />Paid</span>;
            case 'Partially Paid': return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 items-center"><ClockIcon className='h-3 w-3 mr-1' />Partial</span>;
            case 'Unpaid': return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 items-center"><XCircleIcon className='h-3 w-3 mr-1' />Unpaid</span>;
            default: return null;
        }
    };

    // --- Date Formatting Helper ---
    const formatDate = (dateString: string | undefined | null): string => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return date.toLocaleDateString(); // Adjust format if needed
        } catch (e) {
            return 'Error';
        }
    };

    const formatCurrency = (amount: number | null | undefined): string => {
        if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
        return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
    };

    // --- Export Handler ---
    const handleExport = async (format: 'pdf' | 'docx') => {
        const unpaidPartialPayments = filteredPayments.filter(
            p => p.status === 'Unpaid' || p.status === 'Partially Paid'
        );
        if (unpaidPartialPayments.length === 0) {
            toast.error("No unpaid or partially paid records in the current view to export.");
            return;
        }
        const exportData = unpaidPartialPayments.map(p => ({ id: p.id /* Send IDs or full data based on API */ }));
        toast.loading(`Preparing ${format.toUpperCase()} export...`, { id: 'export-toast' });
        setIsLoading(true);
        try {
            const response = await apiService.post(`${FEES_ENDPOINT}/export`, {
                format: format,
                records: exportData.map(r => r.id), // Example: Send IDs
                // Or send filters: filters: { searchTerm, statusFilter, classFilter }
            }, undefined, 'blob'); // Pass undefined for options, then 'blob' for expectedResponseType

            const downloadUrl = window.URL.createObjectURL(response); // response should now be a Blob
            const link = document.createElement('a');
            link.href = downloadUrl;
            const filename = `fee_ defaulters_${new Date().toISOString().split('T')[0]}.${format}`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
            toast.success(`Export downloaded successfully.`, { id: 'export-toast' });
        } catch (error: any) {
            console.error("Export failed:", error);
            // apiService handles general error toast, specific error logic can be here
            toast.error(`Export failed. ${error.message || 'Please try again.'}`, { id: 'export-toast' });
        } finally {
            setIsLoading(false);
        }
    };

    // --- JSX ---
    return (
        <div className="p-4 md:p-6 min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Fees Payment Tracking</h1>
            <p className="text-gray-600 mb-6">Monitor student fee payments across different classes.</p>

            {/* Filters and Search Section */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Search Input */}
                    <div className="md:col-span-2">
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </div>
                            <input
                                type="text"
                                id="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Name or Matricule..."
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                        <select
                            id="statusFilter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Partially Paid">Partially Paid</option>
                            <option value="Unpaid">Unpaid</option>
                        </select>
                    </div>

                    {/* Class Filter */}
                    <div>
                        <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Class</label>
                        <select
                            id="classFilter"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            disabled={isLoading || availableClasses.length === 0}
                        >
                            <option value="all">All Classes</option>
                            {availableClasses.map(cls => (
                                <option key={cls.id} value={String(cls.id)}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* Export Button Row */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={() => handleExport('pdf')} // Defaulting to PDF for the button
                        disabled={isLoading || filteredPayments.filter(p => p.status !== 'Paid').length === 0}
                        className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                        Export Unpaid/Partial (PDF)
                    </button>
                    {/* Add another button for DOCX if needed */}
                    {/* 
                    <button onClick={() => handleExport('docx')} ... >
                        Export Unpaid/Partial (Word)
                    </button>
                    */}
                </div>
            </div>

            {/* Payment Records Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevant Date</th>
                                {/* <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th> */}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan={7} className="text-center py-4 text-gray-500 italic">Loading payment records...</td></tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-gray-500">No matching payment records found.</td></tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 truncate" title={payment.student.name}>{payment.student.name}</div>
                                            <div className="text-xs text-gray-500">{payment.student.matricule || `ID: ${payment.student.id}`}</div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{payment.classInfo.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{formatCurrency(payment.amountExpected)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-700 text-right">{formatCurrency(payment.amountPaid)}</td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${payment.balance > 0 ? 'text-red-700' : 'text-gray-700'}`}>{formatCurrency(payment.balance)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                                            {getStatusBadge(payment.status)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {/* Show last paid date if paid, otherwise due date */}
                                            <span className="text-xs text-gray-400 mr-1">{payment.status === 'Paid' ? 'Paid:' : payment.dueDate ? 'Due:' : ''}</span>
                                            {formatDate(payment.status === 'Paid' ? payment.lastPaymentDate : payment.dueDate)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}