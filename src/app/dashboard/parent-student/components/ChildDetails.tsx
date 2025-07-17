
import { FC, useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon,
    ExclamationCircleIcon,
    UserCircleIcon,
    HomeIcon,
    CurrencyDollarIcon,
    AcademicCapIcon,
    ClipboardDocumentListIcon,
    ExclamationTriangleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';
import { Button, Tabs } from '@/components/ui';
import ParentStudentFeesPage from '../fees/page';
import ParentStudentResultsPage from '../results/page';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ChildDetailsProps {
    childId: number;
    onBack: () => void;
}

// Quiz interface
interface Quiz {
    id: number;
    title: string;
    subject: string;
    score: number | null;
    totalMarks: number;
    completedAt: string | null;
    status: string;
}

// Overview Tab Component
const OverviewTab: FC<{ childData: any }> = ({ childData }) => {
    return (
        <div className="p-6 space-y-6">
            {/* Student Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-4">
                        {childData?.photo ? (
                            <img src={childData.photo} alt={childData.name} className="w-16 h-16 rounded-full" />
                        ) : (
                            <UserCircleIcon className="w-16 h-16 text-gray-400" />
                        )}
                        <div>
                            <h4 className="text-xl font-bold text-gray-900">{childData?.name}</h4>
                            <p className="text-gray-600">Matricule: {childData?.matricule || 'N/A'}</p>
                            <p className="text-gray-600">Class: {childData?.classInfo?.className} - {childData?.classInfo?.subclassName}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p><span className="font-medium">Class Master:</span> {childData?.classInfo?.classMaster || 'N/A'}</p>
                        <p><span className="font-medium">Date of Birth:</span> {childData?.dateOfBirth ? new Date(childData.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                        <p><span className="font-medium">Enrollment Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${childData?.enrollmentStatus === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                                }`}>
                                {childData?.enrollmentStatus || 'Unknown'}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <AcademicCapIcon className="w-8 h-8 text-blue-600" />
                        <div className="ml-3">
                            <div className="text-2xl font-bold text-blue-900">{childData?.academicPerformance?.overallAverage || 'N/A'}</div>
                            <div className="text-sm text-blue-600">Overall Average</div>
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold">✓</span>
                        </div>
                        <div className="ml-3">
                            <div className="text-2xl font-bold text-green-900">{childData?.attendance?.attendanceRate || 0}%</div>
                            <div className="text-sm text-green-600">Attendance Rate</div>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold">#</span>
                        </div>
                        <div className="ml-3">
                            <div className="text-2xl font-bold text-purple-900">{childData?.academicPerformance?.positionInClass || 'N/A'}</div>
                            <div className="text-sm text-purple-600">Class Rank</div>
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                        <CurrencyDollarIcon className="w-8 h-8 text-red-600" />
                        <div className="ml-3">
                            <div className="text-2xl font-bold text-red-900">{(childData?.fees?.outstandingBalance || 0).toLocaleString()}</div>
                            <div className="text-sm text-red-600">Pending Fees (FCFA)</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                        <AcademicCapIcon className="w-4 h-4 text-green-500" />
                        <span>Math Quiz: 85% (2 days ago)</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                        <CurrencyDollarIcon className="w-4 h-4 text-blue-500" />
                        <span>Fee payment recorded: 25,000 FCFA (1 week ago)</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                        <ClipboardDocumentListIcon className="w-4 h-4 text-gray-500" />
                        <span>Attendance marked present (today)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Quizzes Tab Component
const QuizzesTab: FC<{ studentId: number }> = ({ studentId }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Mock quiz data
        setTimeout(() => {
            setQuizzes([
                {
                    id: 1,
                    title: 'Mathematics - Algebra',
                    subject: 'Mathematics',
                    score: 85,
                    totalMarks: 100,
                    completedAt: '2024-01-20',
                    status: 'COMPLETED'
                },
                {
                    id: 2,
                    title: 'English - Grammar Test',
                    subject: 'English',
                    score: 92,
                    totalMarks: 100,
                    completedAt: '2024-01-18',
                    status: 'COMPLETED'
                },
                {
                    id: 3,
                    title: 'Physics - Motion',
                    subject: 'Physics',
                    score: null,
                    totalMarks: 100,
                    completedAt: null,
                    status: 'AVAILABLE'
                }
            ]);
            setIsLoading(false);
        }, 1000);
    }, [studentId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Quiz Results & Available Quizzes</h3>
                <p className="text-gray-600">Track quiz performance and access new quizzes</p>
            </div>

            {/* Quiz Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">{quizzes.filter((q: Quiz) => q.status === 'COMPLETED').length}</div>
                    <div className="text-sm text-blue-600">Completed Quizzes</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">
                        {Math.round(quizzes.filter((q: Quiz) => q.score !== null).reduce((avg: number, q: Quiz) => avg + (q.score || 0), 0) / quizzes.filter((q: Quiz) => q.score !== null).length) || 0}%
                    </div>
                    <div className="text-sm text-green-600">Average Score</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-900">{quizzes.filter((q: Quiz) => q.status === 'AVAILABLE').length}</div>
                    <div className="text-sm text-yellow-600">Available Quizzes</div>
                </div>
            </div>

            {/* Quiz List */}
            <div className="space-y-4">
                {quizzes.map((quiz: Quiz) => (
                    <div key={quiz.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                                <p className="text-sm text-gray-500">{quiz.subject}</p>
                                {quiz.completedAt && (
                                    <p className="text-xs text-gray-400">Completed: {new Date(quiz.completedAt).toLocaleDateString()}</p>
                                )}
                            </div>
                            <div className="text-right">
                                {quiz.status === 'COMPLETED' ? (
                                    <div>
                                        <div className="text-lg font-bold text-green-600">{quiz.score}%</div>
                                        <div className="text-sm text-gray-500">{quiz.score}/{quiz.totalMarks}</div>
                                    </div>
                                ) : (
                                    <Button size="sm">Start Quiz</Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Discipline Tab Component
const DisciplineTab: FC<{ studentId: number }> = ({ studentId }) => {
    const [disciplineData, setDisciplineData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Mock discipline data
        setTimeout(() => {
            setDisciplineData({
                totalIssues: 2,
                resolvedIssues: 2,
                pendingIssues: 0,
                recentIssues: [
                    {
                        id: 1,
                        type: 'MORNING_LATENESS',
                        description: 'Arrived at 8:30 AM',
                        dateOccurred: '2023-12-05',
                        status: 'RESOLVED',
                        resolvedAt: '2023-12-06'
                    },
                    {
                        id: 2,
                        type: 'CLASS_ABSENCE',
                        description: 'Missed History class',
                        dateOccurred: '2023-11-20',
                        status: 'RESOLVED',
                        resolvedAt: '2023-11-21'
                    }
                ],
                behavioralScore: 95,
                recommendations: [
                    'Continue maintaining good behavior',
                    'Work on punctuality during morning hours'
                ]
            });
            setIsLoading(false);
        }, 1000);
    }, [studentId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Discipline & Behavior</h3>
                <p className="text-gray-600">Track behavioral patterns and discipline records</p>
            </div>

            {/* Discipline Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{disciplineData?.totalIssues || 0}</div>
                    <div className="text-sm text-gray-600">Total Issues</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">{disciplineData?.resolvedIssues || 0}</div>
                    <div className="text-sm text-green-600">Resolved</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-900">{disciplineData?.pendingIssues || 0}</div>
                    <div className="text-sm text-yellow-600">Pending</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">{disciplineData?.behavioralScore || 0}%</div>
                    <div className="text-sm text-blue-600">Behavior Score</div>
                </div>
            </div>

            {/* Recent Issues */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Recent Discipline Records</h4>
                {disciplineData?.recentIssues?.length > 0 ? (
                    <div className="space-y-3">
                        {disciplineData.recentIssues.map((issue: any) => (
                            <div key={issue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-900">{issue.type.replace('_', ' ')}</div>
                                    <div className="text-sm text-gray-600">{issue.description}</div>
                                    <div className="text-xs text-gray-500">Date: {new Date(issue.dateOccurred).toLocaleDateString()}</div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${issue.status === 'RESOLVED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {issue.status}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No discipline issues recorded</p>
                )}
            </div>

            {/* Recommendations */}
            {disciplineData?.recommendations?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-medium text-blue-900 mb-3">Behavioral Recommendations</h4>
                    <ul className="space-y-2">
                        {disciplineData.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="text-sm text-blue-800 flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Analytics Tab Component
const AnalyticsTab: FC<{ studentId: number }> = ({ studentId }) => {
    return (
        <div className="p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
                <p className="text-gray-600">Detailed insights and trends for this student</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <p className="text-gray-500 text-center">
                    For comprehensive analytics, please visit the main
                    <Button variant="outline" size="sm" className="mx-2">
                        Analytics Dashboard
                    </Button>
                </p>
            </div>
        </div>
    );
};

export const ChildDetails: FC<ChildDetailsProps> = ({ childId, onBack }) => {
    const [childData, setChildData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChildData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/parents/children/${childId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch child details.');
            }

            const result = await response.json();
            setChildData(result.data);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [childId]);

    useEffect(() => {
        fetchChildData();
    }, [fetchChildData]);

    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: HomeIcon,
            content: <OverviewTab childData={childData} />
        },
        {
            id: 'fees',
            label: 'Fees',
            icon: CurrencyDollarIcon,
            content: <ParentStudentFeesPage studentId={childId} />
        },
        {
            id: 'academics',
            label: 'Academics',
            icon: AcademicCapIcon,
            content: <ParentStudentResultsPage studentId={childId} />
        },
        {
            id: 'quizzes',
            label: 'Quizzes',
            icon: ClipboardDocumentListIcon,
            content: <QuizzesTab studentId={childId} />
        },
        {
            id: 'discipline',
            label: 'Discipline',
            icon: ExclamationTriangleIcon,
            content: <DisciplineTab studentId={childId} />
        },
        {
            id: 'analytics',
            label: 'Analytics',
            icon: ChartBarIcon,
            content: <AnalyticsTab studentId={childId} />
        },
    ];

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
                    <h2 className="mt-2 text-xl font-semibold">Failed to load child details</h2>
                    <p>{error}</p>
                    <Button onClick={onBack} className="mt-4">Go Back</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center mb-4">
                    <Button variant="ghost" onClick={onBack} className="mr-4">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                    {childData?.photo ? (
                        <img src={childData.photo} alt={childData.name} className="w-12 h-12 rounded-full mr-4" />
                    ) : (
                        <UserCircleIcon className="w-12 h-12 text-gray-400 mr-4" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{childData?.name}</h1>
                        <p className="text-gray-600">{childData?.classInfo?.className} - {childData?.classInfo?.subclassName}</p>
                    </div>
                </div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs tabs={tabs} />
            </div>
        </div>
    );
}; 