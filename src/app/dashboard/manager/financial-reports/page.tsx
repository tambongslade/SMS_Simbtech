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

    useEffect(() => {
        fetchFinancialData();
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

    const fetchFeeReports = async () => {
        // Mock fee collection data by class
        const classes = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5'];

        const mockData = classes.map(className => {
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

    const generateReport = () => {
        toast.success('Financial report exported successfully');
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                    <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
                </div>
                <div className="flex space-x-2">
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
                    <Button
                        onClick={generateReport}
                        className="flex items-center"
                    >
                        <PrinterIcon className="h-4 w-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

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