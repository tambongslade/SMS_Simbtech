'use client'

import { FC } from 'react';
import { useStudentFees } from '../hooks/useStudentFees';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import { CurrencyDollarIcon, CalendarIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

const ParentStudentFeesPage: FC = () => {
    // In a real implementation, you would get studentId from:
    // 1. URL parameters (useParams)
    // 2. User context/auth
    // 3. Local storage
    // For now, using a default value
    const studentId = 1; // This should be dynamically determined
    const { data, isLoading, error } = useStudentFees(studentId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading fees</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-8">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No fee records</h3>
                <p className="mt-1 text-sm text-gray-500">No fee records found for this student.</p>
            </div>
        );
    }

    const {
        totalExpected,
        totalPaid,
        outstandingBalance,
        lastPaymentDate,
        paymentHistory = [],
        outstandingFees = []
    } = data || {};

    const stats = [
        {
            title: 'Total Fees',
            value: `${(totalExpected || 0).toLocaleString()} FCFA`,
            icon: CurrencyDollarIcon,
            color: 'primary' as const,
        },
        {
            title: 'Total Paid',
            value: `${(totalPaid || 0).toLocaleString()} FCFA`,
            icon: CheckCircleIcon,
            color: 'success' as const,
        },
        {
            title: 'Outstanding Balance',
            value: `${(outstandingBalance || 0).toLocaleString()} FCFA`,
            icon: ExclamationTriangleIcon,
            color: 'danger' as const,
        }
    ];

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Payment History</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paymentHistory.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{(payment.amount || 0).toLocaleString()} FCFA</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.paymentMethod}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{payment.receiptNumber}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Outstanding Fees</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Due</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {outstandingFees.map((fee) => (
                                        <tr key={fee.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{fee.feeType}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{(fee.amountDue || 0).toLocaleString()} FCFA</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default ParentStudentFeesPage; 