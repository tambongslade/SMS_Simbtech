'use client'
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import {
    AcademicCapIcon,
    BuildingLibraryIcon,
    CheckCircleIcon,
    ClipboardDocumentListIcon,
    DocumentChartBarIcon,
    IdentificationIcon,
    ShieldCheckIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Badge } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import TasksNotificationsSection from '@/components/dashboard/TasksNotificationsSection';

// ── GET /manager/dashboard (operational KPIs) ──
interface OperationalDashboard {
    overview: {
        totalStaff: number;
        activeStaff: number;
        onLeaveToday: number;
        pendingLeaveRequests: number;
    };
    attendance: {
        overallAttendanceRate: number;
        departmentBreakdown: { department: string; attendanceRate: number; presentCount: number; absentCount: number }[];
        weeklyTrend: { date: string; attendanceRate: number }[];
    };
    performance: {
        staffPerformanceScore: number;
        topPerformers: { userId: number; name: string; role: string; performanceScore: number }[];
        improvementAreas: string[];
    };
    tasks: {
        totalActiveTasks: number;
        completedThisWeek: number;
        overdueTasks: number;
        upcomingDeadlines: { id: number; title: string; assignedTo: string; deadline: string; priority: string }[];
    };
}

// ── GET /dashboard/teacher-analytics ──
interface TeacherAnalytics {
    totalTeachers: number;
    attendanceRate: number;
    hoursScheduled: number;
    hoursTaught: number;
    topPerformers: { userId: number; name: string; score: number }[];
    underperformers: { userId: number; name: string; score: number }[];
}

// ── GET /manager/operational-support ──
interface OperationalSupport {
    maintenance: {
        openRequests: number;
        byPriority: { priority: string; count: number }[];
        recent: { id: number; location: string; issue: string; status: string }[];
    };
    facilities: { facilityId: number; name: string; status: string; lastInspection: string }[];
    inventoryAlerts: { item: string; quantity: number; threshold: number }[];
}

// ── GET /dashboard/manager/enhanced (analytics) ──
interface EnhancedDashboard {
    schoolOverview: {
        totalStudents: number;
        totalTeachers: number;
        totalEnrollments: number;
        openDisciplineIssues: number;
    };
    reportAnalytics: {
        totalReports: number;
        generated: number;
        pending: number;
        generationRate: number;
    };
    formManagement: {
        totalForms: number;
        openSubmissions: number;
    };
    staffBreakdown?: {
        totalStaff: number;
        teachers: number;
        administrators: number;
    };
    enrollmentSummary?: {
        academicYearId: number | null;
        totalEnrolled: number;
        classes: {
            classId: number;
            className: string;
            totalStudents: number;
            subClasses: { subClassId: number; subClassName: string; studentCount: number }[];
        }[];
    };
}

const formatLabel = (value: string) =>
    value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const priorityColor = (priority: string): 'red' | 'yellow' | 'gray' => {
    if (priority === 'HIGH' || priority === 'URGENT') return 'red';
    if (priority === 'MEDIUM') return 'yellow';
    return 'gray';
};

function ProgressBar({ rate }: { rate: number }) {
    const clamped = Math.min(100, Math.max(0, rate));
    return (
        <div className="h-2 w-full rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${clamped}%` }} />
        </div>
    );
}

function BarListRow({ label, value, max, display }: { label: string; value: number; max: number; display?: string }) {
    const width = max > 0 ? Math.max(2, (value / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm text-gray-600 truncate" title={label}>{label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
            </div>
            <span className="w-28 text-right text-sm font-medium text-gray-900 truncate">{display ?? value}</span>
        </div>
    );
}

const fetcher = (url: string) => apiService.get(url);

export default function ManagerOverviewPage() {
    const { selectedAcademicYear } = useAuth();
    const yearParam = selectedAcademicYear?.id ? `?academicYearId=${selectedAcademicYear.id}` : '';

    const { data: opsRes, error: opsError, isLoading: isLoadingOps } = useSWR<{ data?: OperationalDashboard }>(`/manager/dashboard${yearParam}`, fetcher);
    const { data: teacherRes } = useSWR<{ data?: TeacherAnalytics }>(`/dashboard/teacher-analytics${yearParam}`, fetcher);
    const { data: supportRes } = useSWR<{ data?: OperationalSupport }>('/manager/operational-support', fetcher);
    const { data: enhancedRes, isLoading: isLoadingEnhanced } = useSWR<{ data?: EnhancedDashboard }>(`/dashboard/manager/enhanced${yearParam}`, fetcher);

    const ops = opsRes?.data;
    const teachers = teacherRes?.data;
    const support = supportRes?.data;
    const analytics = enhancedRes?.data;
    const staffBreakdown = analytics?.staffBreakdown;
    const enrollment = analytics?.enrollmentSummary;

    useEffect(() => {
        if (opsError && opsError.message !== 'Unauthorized') {
            console.error('Manager dashboard fetch error:', opsError);
            toast.error('Failed to load some dashboard data');
        }
    }, [opsError]);

    const maxDeptRate = Math.max(0, ...(ops?.attendance?.departmentBreakdown ?? []).map(d => d.attendanceRate));

    const schoolStats = useMemo(() => ([
        {
            title: 'Students',
            value: isLoadingEnhanced ? '...' : String(analytics?.schoolOverview?.totalStudents ?? 0),
            icon: IdentificationIcon,
            color: 'primary' as const,
            href: '/dashboard/manager/academic-reports',
        },
        {
            title: 'Teachers',
            value: isLoadingEnhanced ? '...' : String(analytics?.schoolOverview?.totalTeachers ?? teachers?.totalTeachers ?? 0),
            icon: AcademicCapIcon,
            color: 'secondary' as const,
            href: '/dashboard/manager/departments',
        },
        {
            title: 'Open Discipline Issues',
            value: isLoadingEnhanced ? '...' : String(analytics?.schoolOverview?.openDisciplineIssues ?? 0),
            icon: ClipboardDocumentListIcon,
            color: 'warning' as const,
            href: '/dashboard/manager/disciplinary-actions',
        },
        {
            title: 'Pending Reports',
            value: isLoadingEnhanced ? '...' : String(analytics?.reportAnalytics?.pending ?? 0),
            icon: DocumentChartBarIcon,
            color: 'neutral' as const,
            href: '/dashboard/manager/academic-reports',
        },
    ]), [analytics, teachers, isLoadingEnhanced]);

    return (
        <div className="flex-1 p-4 space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold">Manager Dashboard</h1>
                <p className="text-gray-600">
                    School operations overview
                    {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                </p>
            </div>

            {/* ── People (staff / teachers / administrators) ── */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">People</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    <StatsCard title="Total Staff" value={isLoadingEnhanced ? '...' : String(staffBreakdown?.totalStaff ?? 0)} icon={UserGroupIcon} color="primary" />
                    <StatsCard title="Teachers" value={isLoadingEnhanced ? '...' : String(staffBreakdown?.teachers ?? 0)} icon={AcademicCapIcon} color="secondary" />
                    <StatsCard title="Administrators" value={isLoadingEnhanced ? '...' : String(staffBreakdown?.administrators ?? 0)} icon={ShieldCheckIcon} color="neutral" />
                    <StatsCard title="Active Staff" value={isLoadingOps ? '...' : String(ops?.overview?.activeStaff ?? 0)} icon={CheckCircleIcon} color="success" />
                </div>
            </section>

            {/* ── Enrollment by class ── */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">Enrollment by class</h2>
                    <span className="text-sm text-gray-500">
                        {isLoadingEnhanced ? 'Loading…' : `Total enrolled: ${enrollment?.totalEnrolled ?? 0}`}
                    </span>
                </div>
                {(enrollment?.classes?.length ?? 0) === 0 ? (
                    <p className="text-sm text-gray-500">{isLoadingEnhanced ? 'Loading…' : 'No enrollments yet.'}</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                        {enrollment!.classes.map((cls) => (
                            <Card key={cls.classId}>
                                <CardHeader className="flex items-center justify-between">
                                    <CardTitle>
                                        <span className="inline-flex items-center gap-2">
                                            <BuildingLibraryIcon className="w-5 h-5 text-blue-600" />
                                            {cls.className}
                                        </span>
                                    </CardTitle>
                                    <Badge color="blue" size="sm">{cls.totalStudents} students</Badge>
                                </CardHeader>
                                <CardBody>
                                    {cls.subClasses.length === 0 ? (
                                        <p className="text-sm text-gray-500">No sub-classes.</p>
                                    ) : (
                                        <ul className="divide-y divide-gray-100">
                                            {cls.subClasses.map((sc) => (
                                                <li key={sc.subClassId} className="py-1.5 flex items-center justify-between gap-2">
                                                    <Link
                                                        href={`/dashboard/manager/students?subClassId=${sc.subClassId}`}
                                                        className="text-sm text-blue-700 hover:text-blue-900 truncate min-w-0"
                                                    >
                                                        {sc.subClassName}
                                                    </Link>
                                                    <span className="text-sm font-medium text-gray-900 shrink-0">{sc.studentCount}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            <TasksNotificationsSection />

            {/* ── School stats (clickable) ── */}
            <section>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {schoolStats.map(({ href, ...stat }) => (
                        <Link key={stat.title} href={href} className="block min-w-0 rounded-lg transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
                            <StatsCard {...stat} />
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── Attendance + Teacher analytics ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Staff Attendance</CardTitle>
                        <span className="text-sm font-semibold text-gray-900">{(ops?.attendance?.overallAttendanceRate ?? 0).toFixed(1)}%</span>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <ProgressBar rate={ops?.attendance?.overallAttendanceRate ?? 0} />
                        {(ops?.attendance?.departmentBreakdown?.length ?? 0) > 0 ? (
                            <div className="space-y-2 pt-1">
                                {ops!.attendance.departmentBreakdown.map((dept) => (
                                    <BarListRow
                                        key={dept.department}
                                        label={formatLabel(dept.department)}
                                        value={dept.attendanceRate}
                                        max={maxDeptRate}
                                        display={`${dept.attendanceRate.toFixed(1)}%`}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">{isLoadingOps ? 'Loading…' : 'No attendance data.'}</p>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Teachers</CardTitle>
                        <span className="text-sm font-semibold text-gray-900">{(teachers?.attendanceRate ?? 0).toFixed(1)}% attendance</span>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-gray-500">Hours Scheduled</p>
                                <p className="text-lg font-semibold text-gray-900">{(teachers?.hoursScheduled ?? 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Hours Taught</p>
                                <p className="text-lg font-semibold text-gray-900">{(teachers?.hoursTaught ?? 0).toLocaleString()}</p>
                            </div>
                        </div>
                        {(teachers?.topPerformers?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Top Performers</p>
                                <ul className="divide-y divide-gray-100">
                                    {teachers!.topPerformers.slice(0, 3).map((t) => (
                                        <li key={t.userId} className="py-1.5 flex items-center justify-between gap-2">
                                            <span className="text-sm text-gray-700 truncate min-w-0">{t.name}</span>
                                            <span className="text-sm font-medium text-green-700 shrink-0">{t.score}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {(teachers?.underperformers?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Needs Attention</p>
                                <ul className="divide-y divide-gray-100">
                                    {teachers!.underperformers.slice(0, 3).map((t) => (
                                        <li key={t.userId} className="py-1.5 flex items-center justify-between gap-2">
                                            <span className="text-sm text-gray-700 truncate min-w-0">{t.name}</span>
                                            <span className="text-sm font-medium text-red-600 shrink-0">{t.score}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </section>

            {/* ── Maintenance + Tasks ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Maintenance & Inventory</CardTitle>
                        {(support?.maintenance?.openRequests ?? 0) > 0 && (
                            <Badge color="yellow" size="sm">{support!.maintenance.openRequests} open</Badge>
                        )}
                    </CardHeader>
                    <CardBody className="space-y-3">
                        {(support?.maintenance?.byPriority?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {support!.maintenance.byPriority.map((p) => (
                                    <Badge key={p.priority} color={priorityColor(p.priority)} size="sm">
                                        {formatLabel(p.priority)}: {p.count}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        {(support?.maintenance?.recent?.length ?? 0) > 0 && (
                            <ul className="divide-y divide-gray-100">
                                {support!.maintenance.recent.slice(0, 4).map((r) => (
                                    <li key={r.id} className="py-1.5 flex items-center justify-between gap-2">
                                        <span className="text-sm text-gray-700 truncate min-w-0">{r.location} — {r.issue}</span>
                                        <Badge color={r.status === 'PENDING' ? 'yellow' : 'green'} size="sm">{formatLabel(r.status)}</Badge>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {(support?.inventoryAlerts?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Low Stock</p>
                                <ul className="divide-y divide-gray-100">
                                    {support!.inventoryAlerts.slice(0, 4).map((alert) => (
                                        <li key={alert.item} className="py-1.5 flex items-center justify-between gap-2">
                                            <span className="text-sm text-gray-700 truncate min-w-0">{alert.item}</span>
                                            <span className="text-sm font-medium text-red-600 shrink-0">{alert.quantity} / {alert.threshold}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {!support && <p className="text-sm text-gray-500">Loading…</p>}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Tasks</CardTitle>
                        {(ops?.tasks?.overdueTasks ?? 0) > 0 && (
                            <Badge color="red" size="sm">{ops!.tasks.overdueTasks} overdue</Badge>
                        )}
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div>
                                <p className="text-xs text-gray-500">Active</p>
                                <p className="text-lg font-semibold text-gray-900">{ops?.tasks?.totalActiveTasks ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Completed This Week</p>
                                <p className="text-lg font-semibold text-gray-900">{ops?.tasks?.completedThisWeek ?? 0}</p>
                            </div>
                        </div>
                        {(ops?.tasks?.upcomingDeadlines?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Upcoming Deadlines</p>
                                <ul className="divide-y divide-gray-100">
                                    {ops!.tasks.upcomingDeadlines.slice(0, 5).map((task) => (
                                        <li key={task.id} className="py-1.5 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-900 truncate">{task.title}</p>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {task.assignedTo} · due {new Date(task.deadline).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Badge color={priorityColor(task.priority)} size="sm">{formatLabel(task.priority)}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </section>

            {/* ── Performance + Reports ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Staff Performance</CardTitle>
                        <span className="text-sm font-semibold text-gray-900">{(ops?.performance?.staffPerformanceScore ?? 0).toFixed(1)} / 100</span>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <ProgressBar rate={ops?.performance?.staffPerformanceScore ?? 0} />
                        {(ops?.performance?.topPerformers?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Top Performers</p>
                                <ul className="divide-y divide-gray-100">
                                    {ops!.performance.topPerformers.slice(0, 5).map((p) => (
                                        <li key={p.userId} className="py-1.5 flex items-center justify-between gap-2">
                                            <span className="text-sm text-gray-700 truncate min-w-0">
                                                {p.name} <span className="text-xs text-gray-400">({formatLabel(p.role)})</span>
                                            </span>
                                            <span className="text-sm font-medium text-green-700 shrink-0">{p.performanceScore}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {(ops?.performance?.improvementAreas?.length ?? 0) > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Improvement Areas</p>
                                <div className="flex flex-wrap gap-2">
                                    {ops!.performance.improvementAreas.map((area) => (
                                        <Badge key={area} color="yellow" size="sm">{area}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader className="flex items-center justify-between">
                        <CardTitle>Report Cards & Forms</CardTitle>
                        <Link href="/dashboard/manager/academic-reports" className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</Link>
                    </CardHeader>
                    <CardBody className="space-y-3">
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div>
                                <p className="text-xs text-gray-500">Total Reports</p>
                                <p className="text-lg font-semibold text-gray-900">{analytics?.reportAnalytics?.totalReports ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Generated</p>
                                <p className="text-lg font-semibold text-gray-900">{analytics?.reportAnalytics?.generated ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Pending</p>
                                <p className="text-lg font-semibold text-gray-900">{analytics?.reportAnalytics?.pending ?? 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-gray-500">Generation rate</span>
                            <span className="text-sm font-semibold text-gray-900">{(analytics?.reportAnalytics?.generationRate ?? 0).toFixed(1)}%</span>
                        </div>
                        <ProgressBar rate={analytics?.reportAnalytics?.generationRate ?? 0} />
                        <div className="pt-1 flex flex-wrap gap-x-6 gap-y-2">
                            <div>
                                <p className="text-xs text-gray-500">Active Forms</p>
                                <p className="text-lg font-semibold text-gray-900">{analytics?.formManagement?.totalForms ?? 0}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Open Submissions</p>
                                <p className="text-lg font-semibold text-gray-900">{analytics?.formManagement?.openSubmissions ?? 0}</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </section>
        </div>
    );
}
