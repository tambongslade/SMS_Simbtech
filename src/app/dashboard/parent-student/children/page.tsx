'use client'

import { useState } from 'react';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { Card, CardHeader, CardTitle, CardBody, Button, Input } from '@/components/ui';
import { ChildCard } from '../components/ChildCard';
import { ChildDetails } from '../components/ChildDetails';
import {
    UserGroupIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function MyChildrenPage() {
    const { data, isLoading, error } = useParentDashboard();
    const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('');

    const handleViewDetails = (childId: number) => {
        setSelectedChildId(childId);
    };

    const handleBackToOverview = () => {
        setSelectedChildId(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-500 text-center">
                    <ExclamationCircleIcon className="w-12 h-12 mx-auto" />
                    <h2 className="mt-2 text-xl font-semibold">Failed to load children</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (selectedChildId) {
        return <ChildDetails childId={selectedChildId} onBack={handleBackToOverview} />;
    }

    const children = data?.children || [];

    // Filter children based on search and class filter
    const filteredChildren = children.filter(child => {
        const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesClass = !classFilter || child.className === classFilter;
        return matchesSearch && matchesClass;
    });

    // Get unique classes for filter
    const uniqueClasses = [...new Set(children.map(child => child.className).filter(Boolean))];

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <UserGroupIcon className="w-7 h-7 mr-2" />
                    My Children
                </h1>
                <p className="text-gray-600">Manage and monitor all your children's academic progress</p>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
                <CardBody>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    type="text"
                                    placeholder="Search children by name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="md:w-64">
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">All Classes</option>
                                {uniqueClasses.map(className => (
                                    <option key={className} value={className}>{className}</option>
                                ))}
                            </select>
                        </div>
                        <Button variant="outline" className="flex items-center">
                            <FunnelIcon className="w-4 h-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </CardBody>
            </Card>

            {/* Children Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardBody>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <UserGroupIcon className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">{children.length}</div>
                                <div className="text-sm text-gray-500">Total Children</div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 font-bold">✓</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {children.filter(c => c.enrollmentStatus === 'ACTIVE').length}
                                </div>
                                <div className="text-sm text-gray-500">Active Enrollments</div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <span className="text-yellow-600 font-bold">⚠</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {children.reduce((total, child) => total + child.disciplineIssues, 0)}
                                </div>
                                <div className="text-sm text-gray-500">Discipline Issues</div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-red-600 font-bold">₣</span>
                                </div>
                            </div>
                            <div className="ml-4">
                                <div className="text-2xl font-bold text-gray-900">
                                    {children.reduce((total, child) => total + child.pendingFees, 0).toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500">Pending Fees (FCFA)</div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Children Grid */}
            {filteredChildren.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredChildren.map((child) => (
                        <ChildCard
                            key={child.id}
                            child={child}
                            onViewDetails={handleViewDetails}
                        />
                    ))}
                </div>
            ) : (
                <Card>
                    <CardBody>
                        <div className="text-center py-8">
                            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No children found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || classFilter
                                    ? 'Try adjusting your search or filter criteria.'
                                    : 'No children are currently enrolled.'}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
} 