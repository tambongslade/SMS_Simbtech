'use client';

import React, { useState } from 'react';
import { Button, Card, CardBody, CardHeader } from '@/components/ui';
import { CalendarIcon, UsersIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';

interface AcademicYear {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: 'ACTIVE' | 'COMPLETED' | 'INACTIVE';
    studentCount?: number;
    classCount?: number;
    terms?: Term[];
}

interface Term {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    feeDeadline: string;
}

interface AcademicYearSelectorProps {
    availableAcademicYears: AcademicYear[];
    onSelectAcademicYear: (year: AcademicYear) => Promise<void>;
    onClose: () => void; // Keeping onClose as mandatory, can be optional in calling component
    className?: string;
}

const AcademicYearSelector: React.FC<AcademicYearSelectorProps> = ({ availableAcademicYears, onSelectAcademicYear, onClose, className }) => {
    const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
    const { isLoading, isSelectingAcademicYear } = useAuth(); // Get both loading states from AuthContext

    const handleYearSelect = (year: AcademicYear) => {
        setSelectedYear(year);
    };

    const handleConfirm = async () => {
        if (selectedYear) {
            try {
                await onSelectAcademicYear(selectedYear);
            } catch (error) {
                console.error('Error selecting academic year:', error);
            }
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'text-green-600 bg-green-50';
            case 'COMPLETED':
                return 'text-blue-600 bg-blue-50';
            case 'INACTIVE':
                return 'text-gray-600 bg-gray-50';
            default:
                return 'text-gray-600 bg-gray-50';
        }
    };

    if (availableAcademicYears.length === 0) {
        return (
            <div className={`flex items-center justify-center min-h-screen p-4 ${className}`}>
                <Card className="w-full max-w-md">
                    <CardBody className="text-center py-8">
                        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Academic Years Available</h3>
                        <p className="text-sm text-gray-600">
                            No academic years are available for your selected role. Please contact the administrator.
                        </p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center min-h-screen p-4 ${className}`}>
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-4">
                        <CalendarIcon className="h-8 w-8 text-blue-600 mr-2" />
                        <h2 className="text-xl font-semibold text-gray-900">Select Academic Year</h2>
                    </div>
                    <p className="text-sm text-gray-600">
                        Choose the academic year for your {selectedYear?.name} role
                    </p>
                </CardHeader>
                <CardBody>
                    <div className="space-y-4 mb-6">
                        {availableAcademicYears.map((year) => (
                            <div
                                key={year.id}
                                onClick={() => !isSelectingAcademicYear && handleYearSelect(year)}
                                className={`relative rounded-lg border-2 p-4 transition-all duration-200 ${
                                    isSelectingAcademicYear 
                                        ? 'cursor-not-allowed opacity-50' 
                                        : 'cursor-pointer'
                                } ${selectedYear?.id === year.id
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-lg font-medium text-gray-900">{year.name}</h3>
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                                    year.status
                                                )}`}
                                            >
                                                {year.status}
                                            </span>
                                            {year.isCurrent && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                            <div>
                                                <p className="font-medium">Duration:</p>
                                                <p>{formatDate(year.startDate)} - {formatDate(year.endDate)}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {year.studentCount && (
                                                    <div className="flex items-center gap-1">
                                                        <UsersIcon className="h-4 w-4" />
                                                        <span>{year.studentCount} students</span>
                                                    </div>
                                                )}
                                                {year.classCount && (
                                                    <div className="flex items-center gap-1">
                                                        <AcademicCapIcon className="h-4 w-4" />
                                                        <span>{year.classCount} classes</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {year.terms && year.terms.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Terms:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {year.terms.map((term) => (
                                                        <span
                                                            key={term.id}
                                                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                                                        >
                                                            {term.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {selectedYear?.id === year.id && (
                                        <div className="ml-4">
                                            <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading || isSelectingAcademicYear}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!selectedYear || isLoading || isSelectingAcademicYear}
                            className="min-w-[120px]"
                        >
                            {isSelectingAcademicYear ? 'Setting up...' : isLoading ? 'Loading...' : 'Continue'}
                        </Button>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};

export default AcademicYearSelector; 