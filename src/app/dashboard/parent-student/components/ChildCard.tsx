
import { FC } from 'react';
import { Child } from '../hooks/useParentDashboard';
import { AcademicCapIcon, CurrencyDollarIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button, StudentPhoto } from '@/components/ui';

interface ChildCardProps {
    child: Child;
    onViewDetails: (childId: number) => void;
    compact?: boolean;
}

// Function to format enrollment status with colors and readable text
const getEnrollmentStatusDisplay = (status: string) => {
    const statusMap: Record<string, { text: string; colorClasses: string }> = {
        'ENROLLED': { text: 'Enrolled', colorClasses: 'bg-green-100 text-green-800 border-green-200' },
        'ASSIGNED_TO_CLASS': { text: 'Assigned to Class', colorClasses: 'bg-blue-100 text-blue-800 border-blue-200' },
        'GRADUATED': { text: 'Graduated', colorClasses: 'bg-green-100 text-green-800 border-green-200' },
        'TRANSFERRED': { text: 'Transferred', colorClasses: 'bg-red-100 text-red-800 border-red-200' },
        'SUSPENDED': { text: 'Suspended', colorClasses: 'bg-orange-100 text-orange-800 border-orange-200' }
    };

    return statusMap[status] || { text: status.replace('_', ' '), colorClasses: 'bg-gray-100 text-gray-800 border-gray-200' };
};

export const ChildCard: FC<ChildCardProps> = ({ child, onViewDetails, compact = false }) => {
    if (compact) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <StudentPhoto
                            studentId={child.id}
                            photo={child.photo}
                            size="sm"
                            studentName={child.name}
                            fetchPhoto={!child.photo}
                        />
                        <div>
                            <h3 className="font-medium text-gray-900">{child.name}</h3>
                            <div className="flex items-center space-x-2">
                                <p className="text-sm text-gray-500">{child.className} - {child.subclassName}</p>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEnrollmentStatusDisplay(child.enrollmentStatus).colorClasses}`}>
                                    {getEnrollmentStatusDisplay(child.enrollmentStatus).text}
                                </span>
                            </div>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewDetails(child.id)}
                    >
                        View
                    </Button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center text-green-600">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        {child.attendanceRate}% Attendance
                    </div>
                    <div className="flex items-center text-red-600">
                        <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                        {child.pendingFees.toLocaleString()} FCFA
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between">
            <div>
                <div className="flex items-center mb-4">
                    <div className="mr-4">
                        <StudentPhoto
                            studentId={child.id}
                            photo={child.photo}
                            size="md"
                            studentName={child.name}
                            fetchPhoto={!child.photo}
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{child.name}</h3>
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">{child.className} - {child.subclassName}</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEnrollmentStatusDisplay(child.enrollmentStatus).colorClasses}`}>
                                {getEnrollmentStatusDisplay(child.enrollmentStatus).text}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 flex items-center">
                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500" />
                            Attendance Rate
                        </span>
                        <span className="text-sm font-semibold">{child.attendanceRate}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 flex items-center">
                            <AcademicCapIcon className="w-4 h-4 mr-1 text-blue-500" />
                            Latest Marks
                        </span>
                        <span className="text-sm font-semibold">
                            {child.latestMarks.length > 0 ? `${child.latestMarks.length} subjects` : 'No marks'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 flex items-center">
                            <CurrencyDollarIcon className="w-4 h-4 mr-1 text-red-500" />
                            Pending Fees
                        </span>
                        <span className="text-sm font-semibold">{child.pendingFees.toLocaleString()} FCFA</span>
                    </div>

                    {child.disciplineIssues > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center">
                                <ExclamationCircleIcon className="w-4 h-4 mr-1 text-yellow-500" />
                                Discipline Issues
                            </span>
                            <span className="text-sm font-semibold text-red-600">{child.disciplineIssues}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex space-x-2">
                <Button
                    className="flex-1"
                    onClick={() => onViewDetails(child.id)}
                    variant="solid"
                >
                    View Details
                </Button>
                <Button variant="outline" size="sm">
                    Quick Actions
                </Button>
            </div>
        </div>
    );
}; 