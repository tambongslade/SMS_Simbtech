'use client'
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import {
    AcademicCapIcon,
    BanknotesIcon,
    BuildingLibraryIcon,
    ClipboardDocumentListIcon,
    DocumentChartBarIcon,
    IdentificationIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Badge } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import TasksNotificationsSection from '@/components/dashboard/TasksNotificationsSection';

interface FeeBucket {
    expected: number;
    collected: number;
    remaining: number;
    collectionRate: number;
}

interface EnhancedDashboardData {
    schoolOverview: {
        finance: {
            totalExpected: number;
            totalCollected: number;
            collectionRate: number;
            totalAccounts: number;
        };
        discipline: {
            totalIssues: number;
            issuesByType: { type: string; count: number }[];
        };
        teachers: {
            totalTeachers: number;
            averageSubjectsPerTeacher: number;
        };
    };
    schoolFees: {
        total: FeeBucket;
        firstTerm: FeeBucket;
        secondTerm: FeeBucket;
        thirdTerm: FeeBucket;
    };
    teacherAnalytics: {
        summary: {
            totalTeachers: number;
            averageHoursPerWeek: number;
            averageAttendanceRate: number;
            teachersWithFullSchedule: number;
        };
    };
    reportAnalytics: {
        totalReports: number;
        reportsByStatus: Record<string, number>;
        pendingReports: number;
        overdueReports: number;
        recentReports: {
            id: number;
            type: string;
            status: string;
            studentName?: string | null;
            subClassName?: string | null;
            createdAt: string;
            sequenceName?: string | null;
        }[];
        upcomingDeadlines: { id: number; name: string; status: string }[];
    };
    formManagement: {
        totalForms: number;
        activeForms: number;
        formsWithDeadlines: number;
        submissionsByStatus: { status: string; count: number }[];
        recentForms: {
            id: number;
            title: string;
            assignedRole: string;
            isActive: boolean;
            deadline?: string | null;
            submissionCount: number;
        }[];
    };
    auditTrail: {
        recentModifications: {
            id: number;
            action: string;
            tableName: string;
            recordId: number;
            userName?: string | null;
            userMatricule?: string | null;
            createdAt: string;
        }[];
        modificationsByAction: Record<string, number>;
    };
    systemStatistics: {
        usersByRole: { role: string; count: number }[];
        totalEnrollments: number;
        averageClassUtilization: number;
    };
    lastUpdated: string;
}

interface EnhancedDashboardResponse {
    success: boolean;
    data?: EnhancedDashboardData;
    message?: string;
}

const formatMoney = (amount?: number | null) =>
    `FCFA ${(amount ?? 0).toLocaleString()}`;

const formatRole = (role: string) =>
    role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(iso).toLocaleString();
};

const statusBadgeColor = (status: string): 'green' | 'yellow' | 'red' | 'gray' => {
    switch (status) {
        case 'COMPLETED':
        case 'SUBMITTED':
            return 'green';
        case 'PENDING':
        case 'DRAFT':
            return 'yellow';
        case 'FAILED':
            return 'red';
        default:
            return 'gray';
    }
};

function FeeCard({ title, bucket, highlight = false }: { title: string; bucket?: FeeBucket; highlight?: boolean }) {
    const rate = Math.min(100, Math.max(0, bucket?.collectionRate ?? 0));
    return (
        <Link
            href="/dashboard/super-manager/fees-overview"
            className={`block bg-white p-4 sm:p-5 rounded-lg shadow-sm border min-w-0 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${highlight ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'}`}
        >
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">{title}</h3>
                <span className="text-sm font-semibold text-gray-900">{rate.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} collection rate`}>
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${rate}%` }} />
            </div>
            <dl className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-500">Expected</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right break-words">{formatMoney(bucket?.expected)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-500">Collected</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right break-words">{formatMoney(bucket?.collected)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-500">Remaining</dt>
                    <dd className="text-sm font-medium text-gray-900 text-right break-words">{formatMoney(bucket?.remaining)}</dd>
                </div>
            </dl>
            <p className="mt-3 text-xs font-medium text-blue-600">View breakdown by class →</p>
        </Link>
    );
}

function BarListRow({ label, count, max }: { label: string; count: number; max: number }) {
    const width = max > 0 ? Math.max(2, (count / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-gray-600 truncate" title={label}>{label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
            </div>
            <span className="w-10 text-right text-sm font-medium text-gray-900">{count}</span>
        </div>
    );
}

export default function SuperManagerDashboard() {
    const { selectedAcademicYear } = useAuth();
    const academicYearId = selectedAcademicYear?.id;

    const endpoint = academicYearId
        ? `/dashboard/super-manager/enhanced?academicYearId=${academicYearId}`
        : '/dashboard/super-manager/enhanced';

    const {
        data: response,
        error: dashboardError,
        isLoading,
    } = useSWR<EnhancedDashboardResponse>(
        endpoint,
        (url: string) => apiService.get(url)
    );

    const data = response?.data;

    useEffect(() => {
        if (dashboardError && dashboardError.message !== 'Unauthorized') {
            console.error('Dashboard Fetch Error:', dashboardError);
            toast.error('Failed to load dashboard data');
        }
    }, [dashboardError]);

    const parentCount = data?.systemStatistics?.usersByRole?.find(r => r.role === 'PARENT')?.count ?? 0;

    const stats = useMemo(() => ([
        {
            title: 'Amount Owing',
            value: isLoading ? '...' : formatMoney(data?.schoolFees?.total?.remaining),
            icon: BanknotesIcon,
            color: 'danger' as const,
            href: '/dashboard/super-manager/fees-overview',
        },
        {
            title: 'Students Enrolled',
            value: isLoading ? '...' : String(data?.systemStatistics?.totalEnrollments ?? 0),
            icon: IdentificationIcon,
            color: 'primary' as const,
            href: '/dashboard/super-manager/student-management',
        },
        {
            title: 'Teachers',
            value: isLoading ? '...' : String(data?.schoolOverview?.teachers?.totalTeachers ?? 0),
            icon: AcademicCapIcon,
            color: 'secondary' as const,
            href: '/dashboard/super-manager/teacher-management',
        },
        {
            title: 'Parents',
            value: isLoading ? '...' : String(parentCount),
            icon: UserGroupIcon,
            color: 'primary' as const,
            href: '/dashboard/super-manager/parents-management',
        },
        {
            title: 'Fee Accounts',
            value: isLoading ? '...' : String(data?.schoolOverview?.finance?.totalAccounts ?? 0),
            icon: BanknotesIcon,
            color: 'success' as const,
            href: '/dashboard/super-manager/fees-management',
        },
        {
            title: 'Discipline Issues',
            value: isLoading ? '...' : String(data?.schoolOverview?.discipline?.totalIssues ?? 0),
            icon: ClipboardDocumentListIcon,
            color: 'warning' as const,
            href: '/dashboard/super-manager/disciplinary-actions',
        },
        {
            title: 'Pending Reports',
            value: isLoading ? '...' : String(data?.reportAnalytics?.pendingReports ?? 0),
            icon: DocumentChartBarIcon,
            color: 'neutral' as const,
            href: '/dashboard/super-manager/report-card-generation',
        },
        {
            title: 'Class Utilization',
            value: isLoading ? '...' : `${(data?.systemStatistics?.averageClassUtilization ?? 0).toFixed(1)}%`,
            icon: BuildingLibraryIcon,
            color: 'secondary' as const,
            href: '/dashboard/super-manager/classes',
        },
    ]), [data, isLoading, parentCount]);

    const issuesByType = data?.schoolOverview?.discipline?.issuesByType ?? [];
    const maxIssueCount = Math.max(0, ...issuesByType.map((i) => i.count));

    const usersByRole = data?.systemStatistics?.usersByRole ?? [];
    const maxRoleCount = Math.max(0, ...usersByRole.map((r) => r.count));

    const teacherSummary = data?.teacherAnalytics?.summary;
    const reportAnalytics = data?.reportAnalytics;
    const auditTrail = data?.auditTrail;

    return (
        <div className="flex">
            <div className="flex-1 p-4 space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold">Super Manager Dashboard</h1>
                        <p className="text-gray-600">
                            School overview
                            {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                        </p>
                    </div>
                    {data?.lastUpdated && (
                        <p className="text-xs text-gray-500">
                            Last refreshed: {formatRelativeTime(data.lastUpdated)}
                        </p>
                    )}
                </div>

                {dashboardError && dashboardError.message !== 'Unauthorized' && !isLoading && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                        <strong className="font-bold">Error!</strong>
                        <span className="block sm:inline"> Failed to load dashboard data. Please check your connection and try again.</span>
                    </div>
                )}

                {/* School Fees — finances first */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">School Fees</h2>
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 animate-pulse h-40" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                            <FeeCard title="Total" bucket={data?.schoolFees?.total} highlight />
                            <FeeCard title="1st Installment" bucket={data?.schoolFees?.firstTerm} />
                            <FeeCard title="2nd Installment" bucket={data?.schoolFees?.secondTerm} />
                            <FeeCard title="3rd Installment" bucket={data?.schoolFees?.thirdTerm} />
                        </div>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                        The 1st installment includes miscellaneous and new/old-student surcharges billed upfront. Payments fill the 1st installment first, then overflow to the 2nd and 3rd.
                    </p>
                </section>

                {/* Key stats */}
                <section>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        {stats.map(({ href, ...stat }) => (
                            <Link
                                key={stat.title}
                                href={href}
                                className="block min-w-0 rounded-lg transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
                            >
                                <StatsCard {...stat} />
                            </Link>
                        ))}
                    </div>
                </section>

                <TasksNotificationsSection />

                {/* Discipline + Reports */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle>Discipline Issues by Type</CardTitle>
                            <Link href="/dashboard/super-manager/disciplinary-actions" className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</Link>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            {issuesByType.length === 0 ? (
                                <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : 'No discipline issues recorded.'}</p>
                            ) : (
                                issuesByType.map((issue) => (
                                    <BarListRow
                                        key={issue.type}
                                        label={formatRole(issue.type)}
                                        count={issue.count}
                                        max={maxIssueCount}
                                    />
                                ))
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle>Report Cards</CardTitle>
                            <Link href="/dashboard/super-manager/report-card-generation" className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</Link>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                <div>
                                    <p className="text-xs text-gray-500">Total</p>
                                    <p className="text-lg font-semibold text-gray-900">{reportAnalytics?.totalReports ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Pending</p>
                                    <p className="text-lg font-semibold text-gray-900">{reportAnalytics?.pendingReports ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Overdue</p>
                                    <p className="text-lg font-semibold text-gray-900">{reportAnalytics?.overdueReports ?? 0}</p>
                                </div>
                            </div>
                            {(reportAnalytics?.upcomingDeadlines?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Upcoming Deadlines</p>
                                    <div className="flex flex-wrap gap-2">
                                        {reportAnalytics!.upcomingDeadlines.map((d) => (
                                            <Badge key={d.id} color="blue" size="sm">{d.name}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(reportAnalytics?.recentReports?.length ?? 0) > 0 && (
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Recent Reports</p>
                                    <ul className="divide-y divide-gray-100">
                                        {reportAnalytics!.recentReports.slice(0, 5).map((report) => (
                                            <li key={report.id} className="py-1.5 flex items-center justify-between gap-2">
                                                <span className="text-sm text-gray-700 truncate min-w-0">
                                                    {report.studentName ?? formatRole(report.type)}
                                                    {report.subClassName ? ` · ${report.subClassName}` : ''}
                                                    {report.sequenceName ? ` · ${report.sequenceName}` : ''}
                                                </span>
                                                <Badge color={statusBadgeColor(report.status)} size="sm">{formatRole(report.status)}</Badge>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </section>

                {/* Teachers + Users by role */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle>Teacher Workload</CardTitle>
                            <Link href="/dashboard/super-manager/teacher-management" className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</Link>
                        </CardHeader>
                        <CardBody>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">Total Teachers</p>
                                    <p className="text-lg font-semibold text-gray-900">{teacherSummary?.totalTeachers ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Avg. Hours / Week</p>
                                    <p className="text-lg font-semibold text-gray-900">{teacherSummary?.averageHoursPerWeek ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Full Schedule</p>
                                    <p className="text-lg font-semibold text-gray-900">{teacherSummary?.teachersWithFullSchedule ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Avg. Subjects / Teacher</p>
                                    <p className="text-lg font-semibold text-gray-900">{data?.schoolOverview?.teachers?.averageSubjectsPerTeacher ?? 0}</p>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Users by Role</CardTitle>
                        </CardHeader>
                        <CardBody className="space-y-3">
                            {usersByRole.length === 0 ? (
                                <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : 'No user data available.'}</p>
                            ) : (
                                usersByRole.map((entry) => (
                                    <BarListRow
                                        key={entry.role}
                                        label={formatRole(entry.role)}
                                        count={entry.count}
                                        max={maxRoleCount}
                                    />
                                ))
                            )}
                        </CardBody>
                    </Card>
                </section>

                {/* Recent activity (audit trail) */}
                <section>
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Changes</CardTitle>
                        </CardHeader>
                        <CardBody>
                            {(auditTrail?.recentModifications?.length ?? 0) === 0 ? (
                                <p className="text-sm text-gray-500">{isLoading ? 'Loading…' : 'No recent changes.'}</p>
                            ) : (
                                <ul className="divide-y divide-gray-100">
                                    {auditTrail!.recentModifications.slice(0, 8).map((mod) => (
                                        <li key={mod.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm text-gray-900 truncate">
                                                    <span className="font-medium">{mod.userName ?? 'Unknown user'}</span>
                                                    {mod.userMatricule ? ` (${mod.userMatricule})` : ''}
                                                    {' — '}
                                                    {formatRole(mod.action)} on {mod.tableName} #{mod.recordId}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-500 shrink-0">{formatRelativeTime(mod.createdAt)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </section>
            </div>
        </div>
    );
}
