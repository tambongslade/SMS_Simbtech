'use client'

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import {
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    AcademicCapIcon,
    ClockIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowTopRightOnSquareIcon,
    CalendarIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { useParentAnalytics } from '../hooks/useParentAnalytics';

interface AnalyticsData {
    performanceAnalytics: {
        overallAverage: number;
        grade: string;
        classRank?: number;
        improvementTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
        subjectsAboveAverage: number;
        subjectsBelowAverage: number;
        recommendation: string;
    };
    attendanceAnalytics: {
        totalDays: number;
        presentDays: number;
        absentDays: number;
        attendanceRate: number;
        status: string;
        monthlyTrends: Array<{
            month: string;
            attendanceRate: number;
        }>;
    };
    quizAnalytics: {
        totalQuizzes: number;
        completedQuizzes: number;
        averageScore: number;
        highestScore: number;
        completionRate: number;
        recentQuizzes: Array<{
            id: number;
            subject: string;
            score: number;
            date: string;
        }>;
    };
    subjectTrends: Array<{
        subjectName: string;
        currentAverage: number;
        trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
        bestMark: number;
        lowestMark: number;
        recommendedAction?: string;
    }>;
    comparativeAnalytics: {
        studentAverage: number;
        classAverage: number;
        aboveClassAverage: boolean;
        percentileRank?: number;
        subjectComparisons: Array<{
            subject: string;
            studentAverage: number;
            classAverage: number;
            rank: number;
        }>;
    };
    behavioralInsights: {
        disciplineScore: number;
        punctualityScore: number;
        participationLevel: 'HIGH' | 'MEDIUM' | 'LOW';
        socialInteraction: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT';
        recommendations: string[];
    };
}

export default function ParentAnalyticsPage() {
    const { analytics, isLoading, error, fetchAnalytics } = useParentAnalytics();
    const [selectedChild, setSelectedChild] = useState<number | null>(null);
    const [timeRange, setTimeRange] = useState('current_term');

    // Mock data for demonstration
    const mockAnalytics: AnalyticsData = {
        performanceAnalytics: {
            overallAverage: 15.2,
            grade: 'B+',
            classRank: 5,
            improvementTrend: 'IMPROVING',
            subjectsAboveAverage: 4,
            subjectsBelowAverage: 2,
            recommendation: 'Focus on Chemistry and Physics to improve overall performance'
        },
        attendanceAnalytics: {
            totalDays: 120,
            presentDays: 110,
            absentDays: 10,
            attendanceRate: 91.7,
            status: 'GOOD',
            monthlyTrends: [
                { month: 'September', attendanceRate: 95 },
                { month: 'October', attendanceRate: 92 },
                { month: 'November', attendanceRate: 89 },
                { month: 'December', attendanceRate: 94 },
                { month: 'January', attendanceRate: 88 }
            ]
        },
        quizAnalytics: {
            totalQuizzes: 15,
            completedQuizzes: 13,
            averageScore: 78.5,
            highestScore: 95,
            completionRate: 86.7,
            recentQuizzes: [
                { id: 1, subject: 'Mathematics', score: 85, date: '2024-01-20' },
                { id: 2, subject: 'English', score: 92, date: '2024-01-18' },
                { id: 3, subject: 'Physics', score: 78, date: '2024-01-15' },
                { id: 4, subject: 'Chemistry', score: 72, date: '2024-01-12' }
            ]
        },
        subjectTrends: [
            {
                subjectName: 'Mathematics',
                currentAverage: 16.2,
                trend: 'IMPROVING',
                bestMark: 18,
                lowestMark: 14,
                recommendedAction: 'Continue current study methods'
            },
            {
                subjectName: 'English',
                currentAverage: 15.8,
                trend: 'STABLE',
                bestMark: 17,
                lowestMark: 15,
                recommendedAction: 'Focus on creative writing'
            },
            {
                subjectName: 'Physics',
                currentAverage: 14.5,
                trend: 'IMPROVING',
                bestMark: 16,
                lowestMark: 12,
                recommendedAction: 'Practice more problem-solving'
            },
            {
                subjectName: 'Chemistry',
                currentAverage: 13.2,
                trend: 'DECLINING',
                bestMark: 15,
                lowestMark: 11,
                recommendedAction: 'Consider additional tutoring'
            },
            {
                subjectName: 'Biology',
                currentAverage: 17.1,
                trend: 'STABLE',
                bestMark: 18,
                lowestMark: 16,
                recommendedAction: 'Maintain current performance'
            },
            {
                subjectName: 'History',
                currentAverage: 14.8,
                trend: 'IMPROVING',
                bestMark: 16,
                lowestMark: 13,
                recommendedAction: 'Increase reading comprehension'
            }
        ],
        comparativeAnalytics: {
            studentAverage: 15.2,
            classAverage: 14.8,
            aboveClassAverage: true,
            percentileRank: 75,
            subjectComparisons: [
                { subject: 'Mathematics', studentAverage: 16.2, classAverage: 15.1, rank: 3 },
                { subject: 'English', studentAverage: 15.8, classAverage: 15.5, rank: 7 },
                { subject: 'Physics', studentAverage: 14.5, classAverage: 14.2, rank: 12 },
                { subject: 'Chemistry', studentAverage: 13.2, classAverage: 14.0, rank: 18 },
                { subject: 'Biology', studentAverage: 17.1, classAverage: 15.8, rank: 2 },
                { subject: 'History', studentAverage: 14.8, classAverage: 14.5, rank: 9 }
            ]
        },
        behavioralInsights: {
            disciplineScore: 95,
            punctualityScore: 88,
            participationLevel: 'HIGH',
            socialInteraction: 'GOOD',
            recommendations: [
                'Encourage continued positive behavior',
                'Work on improving punctuality',
                'Maintain high participation levels'
            ]
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'IMPROVING': return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
            case 'DECLINING': return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
            case 'STABLE': return <div className="w-4 h-4 bg-gray-400 rounded-full"></div>;
            default: return null;
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'IMPROVING': return 'text-green-600';
            case 'DECLINING': return 'text-red-600';
            case 'STABLE': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    };

    const getGradeColor = (average: number) => {
        if (average >= 16) return 'text-green-600';
        if (average >= 14) return 'text-blue-600';
        if (average >= 12) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getAttendanceStatus = (rate: number) => {
        if (rate >= 95) return { label: 'Excellent', color: 'text-green-600 bg-green-100' };
        if (rate >= 90) return { label: 'Good', color: 'text-blue-600 bg-blue-100' };
        if (rate >= 85) return { label: 'Satisfactory', color: 'text-yellow-600 bg-yellow-100' };
        return { label: 'Needs Improvement', color: 'text-red-600 bg-red-100' };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <ChartBarIcon className="w-7 h-7 mr-2" />
                            Student Analytics
                        </h1>
                        <p className="text-gray-600">Comprehensive insights into academic performance and behavior</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="current_term">Current Term</option>
                            <option value="last_term">Last Term</option>
                            <option value="academic_year">Academic Year</option>
                            <option value="all_time">All Time</option>
                        </select>
                        <Button variant="outline" onClick={() => fetchAnalytics()}>
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{mockAnalytics.performanceAnalytics.overallAverage}/20</div>
                                <div className="text-sm text-gray-500">Overall Average</div>
                                <div className={`text-xs font-medium ${getGradeColor(mockAnalytics.performanceAnalytics.overallAverage)}`}>
                                    Grade: {mockAnalytics.performanceAnalytics.grade}
                                </div>
                            </div>
                            <div className="flex items-center">
                                {getTrendIcon(mockAnalytics.performanceAnalytics.improvementTrend)}
                                <AcademicCapIcon className="w-8 h-8 text-blue-600 ml-2" />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{mockAnalytics.performanceAnalytics.classRank}</div>
                                <div className="text-sm text-gray-500">Class Rank</div>
                                <div className="text-xs text-gray-500">out of 30 students</div>
                            </div>
                            <UserGroupIcon className="w-8 h-8 text-green-600" />
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{mockAnalytics.attendanceAnalytics.attendanceRate}%</div>
                                <div className="text-sm text-gray-500">Attendance Rate</div>
                                <div className={`text-xs px-2 py-1 rounded-full ${getAttendanceStatus(mockAnalytics.attendanceAnalytics.attendanceRate).color}`}>
                                    {getAttendanceStatus(mockAnalytics.attendanceAnalytics.attendanceRate).label}
                                </div>
                            </div>
                            <CheckCircleIcon className="w-8 h-8 text-green-600" />
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{mockAnalytics.quizAnalytics.averageScore}%</div>
                                <div className="text-sm text-gray-500">Quiz Average</div>
                                <div className="text-xs text-gray-500">
                                    {mockAnalytics.quizAnalytics.completedQuizzes}/{mockAnalytics.quizAnalytics.totalQuizzes} completed
                                </div>
                            </div>
                            <ClockIcon className="w-8 h-8 text-purple-600" />
                        </div>
                    </CardBody>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Subject Performance Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle>Subject Performance Trends</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-4">
                            {mockAnalytics.subjectTrends.map((subject) => (
                                <div key={subject.subjectName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h4 className="font-medium text-gray-900">{subject.subjectName}</h4>
                                            {getTrendIcon(subject.trend)}
                                            <span className={`text-sm ${getTrendColor(subject.trend)}`}>
                                                {subject.trend.toLowerCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                                            <span>Current: {subject.currentAverage}/20</span>
                                            <span>Best: {subject.bestMark}</span>
                                            <span>Lowest: {subject.lowestMark}</span>
                                        </div>
                                        {subject.recommendedAction && (
                                            <div className="text-xs text-blue-600 mt-1">💡 {subject.recommendedAction}</div>
                                        )}
                                    </div>
                                    <div className="w-16 bg-gray-200 rounded-full h-2 ml-4">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full"
                                            style={{ width: `${(subject.currentAverage / 20) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {/* Comparative Analytics */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance vs Class Average</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-600">Overall Performance</span>
                                <span className={`text-sm font-medium ${mockAnalytics.comparativeAnalytics.aboveClassAverage ? 'text-green-600' : 'text-red-600'}`}>
                                    {mockAnalytics.comparativeAnalytics.percentileRank}th Percentile
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-xl font-bold text-blue-600">{mockAnalytics.comparativeAnalytics.studentAverage}</div>
                                    <div className="text-xs text-gray-600">Your Child</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xl font-bold text-gray-600">{mockAnalytics.comparativeAnalytics.classAverage}</div>
                                    <div className="text-xs text-gray-600">Class Average</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-900">Subject Comparisons</h5>
                            {mockAnalytics.comparativeAnalytics.subjectComparisons.map((comparison) => (
                                <div key={comparison.subject} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">{comparison.subject}</span>
                                    <div className="flex items-center space-x-2">
                                        <span className={comparison.studentAverage > comparison.classAverage ? 'text-green-600' : 'text-red-600'}>
                                            {comparison.studentAverage.toFixed(1)}
                                        </span>
                                        <span className="text-gray-400">vs</span>
                                        <span className="text-gray-600">{comparison.classAverage.toFixed(1)}</span>
                                        <span className="text-xs text-gray-500">#{comparison.rank}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Quiz Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Quiz Results</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3">
                            {mockAnalytics.quizAnalytics.recentQuizzes.map((quiz) => (
                                <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <div className="font-medium text-gray-900">{quiz.subject}</div>
                                        <div className="text-xs text-gray-500">{new Date(quiz.date).toLocaleDateString()}</div>
                                    </div>
                                    <div className={`text-lg font-bold ${quiz.score >= 80 ? 'text-green-600' : quiz.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                        {quiz.score}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="text-center">
                                <div className="text-xl font-bold text-gray-900">{mockAnalytics.quizAnalytics.completionRate}%</div>
                                <div className="text-sm text-gray-500">Quiz Completion Rate</div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Attendance Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle>Attendance Trends</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-3">
                            {mockAnalytics.attendanceAnalytics.monthlyTrends.map((month) => (
                                <div key={month.month} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">{month.month}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${month.attendanceRate >= 95 ? 'bg-green-500' : month.attendanceRate >= 90 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${month.attendanceRate}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm font-medium">{month.attendanceRate}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-lg font-bold text-green-600">{mockAnalytics.attendanceAnalytics.presentDays}</div>
                                    <div className="text-xs text-gray-500">Present Days</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-red-600">{mockAnalytics.attendanceAnalytics.absentDays}</div>
                                    <div className="text-xs text-gray-500">Absent Days</div>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Behavioral Insights */}
                <Card>
                    <CardHeader>
                        <CardTitle>Behavioral Insights</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Discipline Score</span>
                                    <span className="text-sm font-bold text-green-600">{mockAnalytics.behavioralInsights.disciplineScore}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${mockAnalytics.behavioralInsights.disciplineScore}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">Punctuality Score</span>
                                    <span className="text-sm font-bold text-blue-600">{mockAnalytics.behavioralInsights.punctualityScore}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${mockAnalytics.behavioralInsights.punctualityScore}%` }}></div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <div className="text-sm font-medium text-purple-600">{mockAnalytics.behavioralInsights.participationLevel}</div>
                                    <div className="text-xs text-gray-600">Participation</div>
                                </div>
                                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                                    <div className="text-sm font-medium text-indigo-600">{mockAnalytics.behavioralInsights.socialInteraction}</div>
                                    <div className="text-xs text-gray-600">Social</div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <h5 className="text-sm font-medium text-gray-900 mb-2">Recommendations</h5>
                                <ul className="space-y-1">
                                    {mockAnalytics.behavioralInsights.recommendations.map((rec, index) => (
                                        <li key={index} className="text-xs text-gray-600 flex items-start">
                                            <span className="text-blue-500 mr-1">•</span>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Recommendations Section */}
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-yellow-600" />
                        Personalized Recommendations
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Academic Improvement Plan</h4>
                        <p className="text-blue-800 text-sm mb-3">{mockAnalytics.performanceAnalytics.recommendation}</p>
                        <div className="flex space-x-3">
                            <Button size="sm" variant="solid">
                                View Study Plan
                            </Button>
                            <Button size="sm" variant="outline">
                                Contact Teacher
                            </Button>
                            <Button size="sm" variant="outline">
                                Schedule Tutoring
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
} 