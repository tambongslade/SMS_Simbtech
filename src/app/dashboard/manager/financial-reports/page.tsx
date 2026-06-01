'use client';

import React, { useState, useEffect } from 'react';
import {
    CurrencyDollarIcon,
    ChartBarIcon,
    DocumentChartBarIcon,
    CalendarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    BanknotesIcon,
    ReceiptPercentIcon,
    PrinterIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button, Badge } from '@/components/ui';
import { toast } from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// Types
interface FinancialOverview {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    outstandingFees: number;
    collectionRate: number;
    currentAcademicYear: string;
}

interface MonthlyReport {
    month: string;
    revenue: number;
    expenses: number;
    netIncome: number;
    feeCollection: number;
}

interface ExpenseCategory {
    category: string;
    amount: number;
    percentage: number;
    color: string;
}

interface FeeReport {
    class: string;
    totalStudents: number;
    totalExpected: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
}

export default function ManagerFinancialReportsPage() {
    const [overview, setOverview] = useState<FinancialOverview>({
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        outstandingFees: 0,
        collectionRate: 0,
        currentAcademicYear: ''
    });

    const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [feeReports, setFeeReports] = useState<FeeReport[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('current-year');
    const [isLoading, setIsLoading] = useState(true);
    const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        fetchFinancialData();
        fetchClasses();
    }, [selectedPeriod]);

    const fetchFinancialData = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error('Authentication required');
            return;
        }

        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            // This would normally fetch from multiple endpoints
            // For now, using mock data to demonstrate functionality
            await Promise.all([
                fetchOverview(),
                fetchMonthlyReports(),
                fetchExpenseCategories(),
                fetchFeeReports()
            ]);
        } catch (error) {
            console.error('Error fetching financial data:', error);
            toast.error('Failed to load financial data');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOverview = async () => {
        // Mock data - replace with actual API call
        setOverview({
            totalRevenue: 125000000, // 125M FCFA
            totalExpenses: 95000000,  // 95M FCFA
            netIncome: 30000000,     // 30M FCFA
            outstandingFees: 25000000, // 25M FCFA
            collectionRate: 85.5,
            currentAcademicYear: '2024/2025'
        });
    };

    const fetchMonthlyReports = async () => {
        // Mock monthly data
        const months = [
            'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024', 'Jan 2025', 'Feb 2025'
        ];

        const mockData = months.map(month => ({
            month,
            revenue: Math.floor(Math.random() * 20000000) + 15000000,
            expenses: Math.floor(Math.random() * 15000000) + 10000000,
            netIncome: 0,
            feeCollection: Math.floor(Math.random() * 18000000) + 12000000
        }));

        mockData.forEach(item => {
            item.netIncome = item.revenue - item.expenses;
        });

        setMonthlyReports(mockData);
    };

    const fetchExpenseCategories = async () => {
        // Mock expense categories
        const categories = [
            { category: 'Salaries & Benefits', amount: 45000000, percentage: 47.4, color: 'bg-blue-500' },
            { category: 'Infrastructure', amount: 18000000, percentage: 18.9, color: 'bg-green-500' },
            { category: 'Utilities', amount: 12000000, percentage: 12.6, color: 'bg-yellow-500' },
            { category: 'Supplies & Materials', amount: 8000000, percentage: 8.4, color: 'bg-purple-500' },
            { category: 'Transportation', amount: 6000000, percentage: 6.3, color: 'bg-red-500' },
            { category: 'Other', amount: 6000000, percentage: 6.3, color: 'bg-gray-500' }
        ];

        setExpenseCategories(categories);
    };

    const fetchClasses = async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/classes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setClasses(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
            // Use fallback mock data if API fails
            setClasses([
                { id: 1, name: 'Form 1' },
                { id: 2, name: 'Form 2' },
                { id: 3, name: 'Form 3' },
                { id: 4, name: 'Form 4' },
                { id: 5, name: 'Form 5' }
            ]);
        }
    };

    const fetchFeeReports = async () => {
        // Mock fee collection data by class
        const classNames = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'];

        const mockData = classNames.map(className => {
            const totalStudents = Math.floor(Math.random() * 150) + 100;
            const totalExpected = totalStudents * 1500000; // 1.5M FCFA per student
            const totalCollected = Math.floor(totalExpected * (Math.random() * 0.3 + 0.7)); // 70-100%
            const outstanding = totalExpected - totalCollected;
            const collectionRate = (totalCollected / totalExpected) * 100;

            return {
                class: className,
                totalStudents,
                totalExpected,
                totalCollected,
                outstanding,
                collectionRate
            };
        });

        setFeeReports(mockData);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XAF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`;
    };

    const getCollectionRateColor = (rate: number) => {
        if (rate >= 90) return 'green';
        if (rate >= 75) return 'yellow';
        return 'red';
    };

    // Enhanced report generation with multiple report types
    const [reportType, setReportType] = useState<'summary' | 'detailed' | 'analytics'>('detailed');
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [isExporting, setIsExporting] = useState(false);

    const generateReport = async () => {
        setIsExporting(true);
        const token = getAuthToken();

        if (!token) {
            toast.error('Authentication required');
            setIsExporting(false);
            return;
        }

        try {
            // Build export URL with new parameters
            const params = new URLSearchParams({
                reportType,
                format: exportFormat,
                period: selectedPeriod
            });

            // Add class filter if specific class is selected
            if (selectedClass !== 'all') {
                params.append('classId', selectedClass);
            }

            const exportUrl = `${API_BASE_URL}/fees/export?${params.toString()}`;

            // Create and trigger download
            const response = await fetch(exportUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Generate filename based on report type and format
            const timestamp = new Date().toISOString().split('T')[0];
            const reportTypeNames = {
                summary: 'Fee-Summary',
                detailed: 'Detailed-Fees',
                analytics: 'Payment-Analytics'
            };

            link.download = `${reportTypeNames[reportType]}_${timestamp}.${exportFormat}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(`${reportTypeNames[reportType]} report exported successfully as ${exportFormat.toUpperCase()}`);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export report. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                    <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
                </div>
                <div className="flex flex-col space-y-2">
                    {/* Period Selector */}
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="current-year">Current Academic Year</option>
                        <option value="last-year">Previous Academic Year</option>
                        <option value="current-month">Current Month</option>
                        <option value="last-quarter">Last Quarter</option>
                    </select>
                </div>
            </div>

            {/* Export Controls Panel */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <PrinterIcon className="h-5 w-5 mr-2" />
                        Export Financial Reports
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Report Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Report Type
                            </label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed' | 'analytics')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="detailed">By Student (Detailed Fees)</option>
                                <option value="summary">By Class (Fee Summary)</option>
                                <option value="analytics">By Payment Method (Analytics)</option>
                            </select>
                        </div>

                        {/* Export Format */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Format
                            </label>
                            <select
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx' | 'pdf')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="xlsx">Excel (.xlsx)</option>
                                <option value="csv">CSV (.csv)</option>
                                <option value="pdf">PDF (.pdf)</option>
                            </select>
                        </div>

                        {/* Class Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Class Filter
                            </label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Classes</option>
                                {classes.map((cls) => (
                                    <option key={cls.id} value={cls.id.toString()}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Export Button */}
                        <div className="flex items-end">
                            <Button
                                onClick={generateReport}
                                disabled={isExporting}
                                className={`w-full flex items-center justify-center ${exportFormat === 'xlsx' ? 'bg-green-600 hover:bg-green-700' :
                                    exportFormat === 'csv' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isExporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                ) : (
                                    <PrinterIcon className="h-4 w-4 mr-2" />
                                )}
                                {isExporting ? 'Exporting...' : 'Export Report'}
                            </Button>
                        </div>
                    </div>

                    {/* Report Type Descriptions & Preview */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 rounded-md">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Report Description:</h4>
                            <div className="text-xs text-gray-600">
                                {reportType === 'detailed' && (
                                    <div>
                                        <p><strong>By Student (Detailed Fees):</strong></p>
                                        <p>Individual student fee records with payment history, balances, and transaction details.</p>
                                        <p className="mt-1"><strong>Includes:</strong> Student name, class, matricule, expected fees, paid amount, balance, payment dates, transaction IDs</p>
                                    </div>
                                )}
                                {reportType === 'summary' && (
                                    <div>
                                        <p><strong>By Class (Fee Summary):</strong></p>
                                        <p>Aggregated fee collection statistics grouped by class, showing totals and collection rates.</p>
                                        <p className="mt-1"><strong>Includes:</strong> Class name, total students, expected fees, collected amount, outstanding balance, collection percentage</p>
                                    </div>
                                )}
                                {reportType === 'analytics' && (
                                    <div>
                                        <p><strong>By Payment Method (Analytics):</strong></p>
                                        <p>Payment method analysis showing transaction volumes, trends, and preferred payment channels.</p>
                                        <p className="mt-1"><strong>Includes:</strong> Payment method, transaction count, total amount, average transaction size, usage trends</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-md">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Export Preview:</h4>
                            <div className="text-xs text-blue-700">
                                <p><strong>Format:</strong> {exportFormat.toUpperCase()}</p>
                                <p><strong>Period:</strong> {selectedPeriod.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                <p><strong>Classes:</strong> {selectedClass === 'all' ? 'All Classes' : classes.find(c => c.id.toString() === selectedClass)?.name || 'Selected Class'}</p>
                                <p><strong>Report Type:</strong> {reportType === 'detailed' ? 'Student Details' : reportType === 'summary' ? 'Class Summary' : 'Payment Analytics'}</p>
                                <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                                    <p className="text-xs text-blue-600">
                                        📊 Estimated data rows: {reportType === 'detailed' ? '500-2000' : reportType === 'summary' ? '5-20' : '3-10'} records
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardBody className="flex items-center">
                        <BanknotesIcon className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-lg font-bold text-green-600">
                                {formatCurrency(overview.totalRevenue)}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center">
                        <ReceiptPercentIcon className="h-8 w-8 text-red-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Total Expenses</p>
                            <p className="text-lg font-bold text-red-600">
                                {formatCurrency(overview.totalExpenses)}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center">
                        <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Net Income</p>
                            <p className="text-lg font-bold text-blue-600">
                                {formatCurrency(overview.netIncome)}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center">
                        <CurrencyDollarIcon className="h-8 w-8 text-orange-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Outstanding Fees</p>
                            <p className="text-lg font-bold text-orange-600">
                                {formatCurrency(overview.outstandingFees)}
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody className="flex items-center">
                        <ChartBarIcon className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                            <p className="text-sm text-gray-600">Collection Rate</p>
                            <p className="text-lg font-bold text-purple-600">
                                {formatPercentage(overview.collectionRate)}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Monthly Trends */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <ChartBarIcon className="h-5 w-5 mr-2" />
                        Monthly Financial Trends
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    {isLoading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading monthly data...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Month
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Revenue
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Expenses
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Net Income
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fee Collection
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {monthlyReports.map((report, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {report.month}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                                {formatCurrency(report.revenue)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                                {formatCurrency(report.expenses)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <span className={report.netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}>
                                                    {formatCurrency(report.netIncome)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                                                {formatCurrency(report.feeCollection)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <ReceiptPercentIcon className="h-5 w-5 mr-2" />
                            Expense Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-4">
                            {expenseCategories.map((category, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded ${category.color} mr-3`}></div>
                                        <span className="text-sm font-medium">{category.category}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{formatCurrency(category.amount)}</p>
                                        <p className="text-xs text-gray-500">{formatPercentage(category.percentage)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* Fee Collection by Class */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                            Fee Collection by Class
                        </CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-4">
                            {feeReports.map((report, index) => (
                                <div key={index} className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium">{report.class}</h4>
                                            <p className="text-sm text-gray-600">{report.totalStudents} students</p>
                                        </div>
                                        <Badge
                                            variant="solid"
                                            color={getCollectionRateColor(report.collectionRate)}
                                            size="sm"
                                        >
                                            {formatPercentage(report.collectionRate)}
                                        </Badge>
                                    </div>

                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Expected:</span>
                                            <span className="font-medium">{formatCurrency(report.totalExpected)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Collected:</span>
                                            <span className="font-medium text-green-600">{formatCurrency(report.totalCollected)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Outstanding:</span>
                                            <span className="font-medium text-red-600">{formatCurrency(report.outstanding)}</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${getCollectionRateColor(report.collectionRate) === 'green' ? 'bg-green-600' :
                                                    getCollectionRateColor(report.collectionRate) === 'yellow' ? 'bg-yellow-600' : 'bg-red-600'
                                                    }`}
                                                style={{ width: `${report.collectionRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Key Financial Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <DocumentChartBarIcon className="h-5 w-5 mr-2" />
                        Key Performance Indicators
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                                {formatPercentage(overview.collectionRate)}
                            </div>
                            <div className="text-sm text-gray-600">Overall Collection Rate</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Target: 90% | Current: {formatPercentage(overview.collectionRate)}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {formatPercentage((overview.totalRevenue - overview.totalExpenses) / overview.totalRevenue * 100)}
                            </div>
                            <div className="text-sm text-gray-600">Profit Margin</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Revenue - Expenses / Revenue
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600 mb-2">
                                {Math.ceil(overview.outstandingFees / (overview.totalRevenue / 12))}
                            </div>
                            <div className="text-sm text-gray-600">Months to Collect Outstanding</div>
                            <div className="text-xs text-gray-500 mt-1">
                                At current collection rate
                            </div>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}