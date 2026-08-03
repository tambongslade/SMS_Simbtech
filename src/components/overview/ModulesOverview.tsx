'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
    AcademicCapIcon,
    ArchiveBoxIcon,
    BanknotesIcon,
    ChartBarIcon,
    CheckCircleIcon,
    ClipboardDocumentCheckIcon,
    CurrencyDollarIcon,
    FingerPrintIcon,
    HeartIcon,
    IdentificationIcon,
    MegaphoneIcon,
    PrinterIcon,
    ShieldExclamationIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import {
    fetchOverview,
    overviewEndpoint,
    type AcademicOverview,
    type AttendanceOverview,
    type AuditOverview,
    type CommunicationOverview,
    type DisciplineOverview,
    type EnrollmentOverview,
    type FinancialOverview,
    type HealthOverview,
    type InventoryOverview,
    type OverviewModuleKey,
    type OverviewSnapshot,
    type ReamStockOverview,
    type SalaryOverview,
    type StaffOverview,
    type TasksOverview,
} from '@/lib/overviewApi';
import {
    BarChart,
    BarList,
    DonutChart,
    Meter,
    StatGrid,
    StatTile,
    formatLabel,
    formatMoney,
    formatNumber,
    formatPercent,
    formatRelativeTime,
    toCategoricalSegments,
    toStatusSegments,
} from '@/components/overview/primitives';

const LOW_REAM_THRESHOLD = 20;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface ModuleDef {
    key: OverviewModuleKey;
    title: string;
    icon: typeof ChartBarIcon;
    // Headline + caption + actionable-pending count from the snapshot
    headline: (s: OverviewSnapshot) => string;
    caption: (s: OverviewSnapshot) => string;
    alerts?: (s: OverviewSnapshot) => number;
}

const MODULES: ModuleDef[] = [
    {
        key: 'financial',
        title: 'Fees & Finance',
        icon: BanknotesIcon,
        headline: s => formatPercent(s.financial?.collectionRate),
        caption: s => `${formatMoney(s.financial?.outstanding)} outstanding`,
        alerts: s => s.financial?.pendingFinanceRequests ?? 0,
    },
    {
        key: 'enrollment',
        title: 'Enrollment',
        icon: IdentificationIcon,
        headline: s => formatNumber(s.enrollment?.totalEnrollments),
        caption: s => `${formatPercent(s.enrollment?.averageClassUtilization)} class utilization`,
        alerts: s => s.enrollment?.unassignedEnrollments ?? 0,
    },
    {
        key: 'discipline',
        title: 'Discipline',
        icon: ShieldExclamationIcon,
        headline: s => formatNumber(s.discipline?.totalIssues),
        caption: s => `${formatNumber(s.discipline?.issuesLast30Days)} issues in last 30 days`,
        alerts: s => (s.discipline?.pendingParentSummons ?? 0) + (s.discipline?.pendingSaturdayPunishments ?? 0),
    },
    {
        key: 'attendance',
        title: 'Attendance',
        icon: ClipboardDocumentCheckIcon,
        headline: s => formatPercent(s.attendance?.studentAttendanceRate),
        caption: s => `Teachers ${formatPercent(s.attendance?.teacherAttendanceRateThisMonth)} this month`,
    },
    {
        key: 'academic',
        title: 'Academics',
        icon: AcademicCapIcon,
        headline: s => formatNumber(s.academic?.marksRecorded),
        caption: s => `${formatNumber(s.academic?.openSequences)} open sequence(s)`,
        alerts: s => s.academic?.pendingReportCards ?? 0,
    },
    {
        key: 'staff',
        title: 'Staff',
        icon: UserGroupIcon,
        headline: s => formatNumber(s.staff?.totalUsers),
        caption: s => `${formatNumber(s.staff?.totalTeachers)} teachers`,
    },
    {
        key: 'salary',
        title: 'Salaries',
        icon: CurrencyDollarIcon,
        headline: s => formatNumber(s.salary?.activeProfiles),
        caption: () => 'active salary profiles',
        alerts: s =>
            (s.salary?.pendingApprovalProfiles ?? 0) +
            (s.salary?.pendingChangeRequests ?? 0) +
            (s.salary?.pendingAllowances ?? 0) +
            (s.salary?.pendingWithholdings ?? 0),
    },
    {
        key: 'tasks',
        title: 'Tasks',
        icon: CheckCircleIcon,
        headline: s => formatPercent(s.tasks?.completionRate),
        caption: () => 'completion rate',
        alerts: s => s.tasks?.overdueTasks ?? 0,
    },
    {
        key: 'communication',
        title: 'Communication',
        icon: MegaphoneIcon,
        headline: s => formatNumber(s.communication?.messagesLast7Days),
        caption: () => 'messages in last 7 days',
    },
    {
        key: 'health',
        title: 'Infirmary',
        icon: HeartIcon,
        headline: s => formatNumber(s.health?.visitsThisMonth),
        caption: () => 'visits this month',
    },
    {
        key: 'inventory',
        title: 'Inventory',
        icon: ArchiveBoxIcon,
        headline: s => formatNumber(s.inventory?.totalHoldings),
        caption: s => `${formatNumber(s.inventory?.totalItems)} catalogued items`,
        alerts: s => s.inventory?.pendingTransfers ?? 0,
    },
    {
        key: 'ream-stock',
        title: 'Ream Stock',
        icon: PrinterIcon,
        headline: s => formatNumber(s.reamStock?.currentStock),
        caption: () => 'reams in stock',
        alerts: s => ((s.reamStock?.currentStock ?? 0) < LOW_REAM_THRESHOLD ? 1 : 0),
    },
    {
        key: 'audit',
        title: 'Audit Trail',
        icon: FingerPrintIcon,
        headline: s => formatNumber(s.audit?.totalModificationsLast30Days),
        caption: s => `${formatNumber(s.audit?.distinctActiveUsersLast30Days)} active users · 30 days`,
    },
];

export default function ModulesOverview({ showAudit = true, initialModule }: {
    showAudit?: boolean;
    initialModule?: string | null;
}) {
    const { selectedAcademicYear } = useAuth();
    const academicYearId = selectedAcademicYear?.id;

    const modules = useMemo(
        () => MODULES.filter(m => showAudit || m.key !== 'audit'),
        [showAudit]
    );

    const validInitial = modules.some(m => m.key === initialModule) ? (initialModule as OverviewModuleKey) : null;
    const [selected, setSelected] = useState<OverviewModuleKey | null>(validInitial);
    const panelRef = useRef<HTMLDivElement | null>(null);

    const { data: snapshot, error: snapshotError, isLoading } = useSWR<OverviewSnapshot>(
        overviewEndpoint('snapshot', academicYearId),
        fetchOverview,
        { refreshInterval: 60_000 }
    );

    const { data: detail, error: detailError, isLoading: detailLoading } = useSWR(
        selected ? overviewEndpoint(selected, academicYearId) : null,
        fetchOverview
    );

    useEffect(() => {
        if (snapshotError && snapshotError.message !== 'Unauthorized') {
            toast.error(snapshotError.message || 'Failed to load overview.');
        }
    }, [snapshotError]);

    const openModule = (key: OverviewModuleKey) => {
        const next = selected === key ? null : key;
        setSelected(next);
        // Keep the URL shareable without triggering a navigation
        const url = new URL(window.location.href);
        if (next) url.searchParams.set('module', next);
        else url.searchParams.delete('module');
        window.history.replaceState(null, '', url.toString());
        if (next) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

    const selectedDef = modules.find(m => m.key === selected);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">School Overview</h1>
                    <p className="text-sm text-gray-600 mt-0.5">
                        Read-only analytics across every module
                        {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}
                    </p>
                </div>
                {snapshot?.lastUpdated && (
                    <p className="text-xs text-gray-500">Updated {formatRelativeTime(snapshot.lastUpdated)}</p>
                )}
            </div>

            {snapshotError && snapshotError.message !== 'Unauthorized' && !isLoading && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                    Failed to load the overview snapshot. Please check your connection and try again.
                </div>
            )}

            {/* Module KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {isLoading && !snapshot
                    ? modules.map(m => (
                        <div key={m.key} className="h-28 rounded-lg border border-gray-100 bg-white animate-pulse" />
                    ))
                    : modules.map(m => {
                        const alerts = snapshot ? m.alerts?.(snapshot) ?? 0 : 0;
                        const active = selected === m.key;
                        return (
                            <button
                                key={m.key}
                                onClick={() => openModule(m.key)}
                                className={`relative min-w-0 rounded-lg border bg-white p-3 sm:p-4 text-left transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 ${
                                    active ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-2 text-gray-500">
                                    <m.icon className="w-4 h-4 shrink-0" />
                                    <span className="text-xs font-medium truncate">{m.title}</span>
                                    {alerts > 0 && (
                                        <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center" title="Items needing attention">
                                            {alerts > 99 ? '99+' : alerts}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-2 text-xl font-semibold text-gray-900 truncate">
                                    {snapshot ? m.headline(snapshot) : '—'}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{snapshot ? m.caption(snapshot) : ''}</p>
                            </button>
                        );
                    })}
            </div>

            {/* Detail panel for the selected module */}
            {selectedDef && (
                <div ref={panelRef} className="scroll-mt-20">
                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <selectedDef.icon className="w-5 h-5 text-gray-400" />
                                {selectedDef.title}
                            </CardTitle>
                            <button onClick={() => openModule(selectedDef.key)} className="text-xs font-medium text-gray-400 hover:text-gray-600">
                                Close
                            </button>
                        </CardHeader>
                        <CardBody>
                            {detailError ? (
                                <p className="text-sm text-red-600">
                                    {detailError.message || 'Failed to load details.'}
                                </p>
                            ) : detailLoading || !detail ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-16 bg-gray-100 rounded-lg" />
                                    <div className="h-3 bg-gray-100 rounded-full" />
                                    <div className="h-3 bg-gray-100 rounded-full w-2/3" />
                                </div>
                            ) : (
                                <ModulePanel module={selectedDef.key} data={detail} />
                            )}
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{title}</p>
            {children}
        </div>
    );
}

function TwoCol({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{children}</div>;
}

function ModulePanel({ module, data }: { module: OverviewModuleKey; data: unknown }) {
    switch (module) {
        case 'discipline': {
            const d = data as DisciplineOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Total Issues" value={formatNumber(d.summary?.totalIssues)} />
                        <StatTile label="Issues · 30 days" value={formatNumber(d.summary?.issuesLast30Days)} />
                        <StatTile label="Unexcused Lateness" value={formatNumber(d.summary?.unexcusedLateness)} />
                        <StatTile label="Class Absences" value={formatNumber(d.summary?.unexcusedClassAbsences)} />
                        <StatTile label="Active Warnings" value={formatNumber(d.summary?.activeWarnings)} />
                        <StatTile label="Pending Parent Summons" value={formatNumber(d.summary?.pendingParentSummons)} tone={(d.summary?.pendingParentSummons ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Pending Saturday Punishments" value={formatNumber(d.summary?.pendingSaturdayPunishments)} tone={(d.summary?.pendingSaturdayPunishments ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Seized Items in Custody" value={formatNumber(d.summary?.seizedItemsInCustody)} />
                        <StatTile label="Roll Calls This Week" value={formatNumber(d.summary?.rollCallsThisWeek)} />
                    </StatGrid>
                    <TwoCol>
                        <BarChart title="Issues by Type" rows={(d.issuesByType ?? []).map(x => ({ label: formatLabel(x.type), value: x.count }))} />
                        <BarChart title="Disciplinary Actions by Type" rows={(d.disciplinaryActions?.byType ?? []).map(x => ({ label: formatLabel(x.type), value: x.count }))} />
                    </TwoCol>
                    <TwoCol>
                        <DonutChart title="Actions by Status" centerSub="actions" segments={toStatusSegments(d.disciplinaryActions?.byStatus ?? [])} />
                        <DonutChart title="Seized Items by Status" centerSub="items" segments={toStatusSegments(d.seizedItemsByStatus ?? [])} />
                    </TwoCol>
                </div>
            );
        }
        case 'attendance': {
            const d = data as AttendanceOverview;
            return (
                <div className="space-y-5">
                    <TwoCol>
                        <Meter label="Student Attendance Rate" rate={d.summary?.studentAttendanceRate ?? 0} />
                        <Meter label="Teacher Attendance Rate · This Month" rate={d.summary?.teacherAttendanceRateThisMonth ?? 0} />
                    </TwoCol>
                    <StatGrid>
                        <StatTile label="Roll Calls This Month" value={formatNumber(d.summary?.rollCallsThisMonth)} />
                        <StatTile label="Teacher Evaluations This Month" value={formatNumber(d.summary?.teacherEvaluationsThisMonth)} />
                        <StatTile label="Teacher Absences · 30 days" value={formatNumber(d.summary?.teacherAbsencesLast30Days)} />
                    </StatGrid>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <DonutChart title="Student Roll Call" centerSub="entries" segments={toStatusSegments(d.studentRollCallByStatus ?? [])} />
                        <DonutChart title="Teacher Attendance" centerSub="entries" segments={toStatusSegments(d.teacherAttendanceByStatus ?? [])} />
                        <DonutChart title="Teacher Roll Call" centerSub="entries" segments={toStatusSegments(d.teacherRollCallByStatus ?? [])} />
                    </div>
                </div>
            );
        }
        case 'academic': {
            const d = data as AcademicOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Exam Sequences" value={formatNumber(d.summary?.totalExamSequences)} sub={`${formatNumber(d.summary?.openSequences)} open`} />
                        <StatTile label="Marks Recorded" value={formatNumber(d.summary?.marksRecorded)} />
                        <StatTile label="Pending Report Cards" value={formatNumber(d.summary?.pendingReportCards)} tone={(d.summary?.pendingReportCards ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Subject Schemes" value={formatNumber(d.summary?.subjectSchemes)} />
                        <StatTile label="Logbook Entries · 7 days" value={formatNumber(d.summary?.logbookEntriesLast7Days)} />
                    </StatGrid>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <DonutChart title="Exam Sequences by Status" centerSub="sequences" segments={toStatusSegments(d.sequencesByStatus ?? [])} />
                        <DonutChart title="Report Cards by Status" centerSub="reports" segments={toStatusSegments(d.reportsByStatus ?? [])} />
                        <DonutChart title="Logbook Coverage · 30 days" centerSub="entries" segments={toStatusSegments(d.logbookByStatusLast30Days ?? [])} />
                        <DonutChart title="Student Averages by Status" centerSub="averages" segments={toStatusSegments(d.studentAveragesByStatus ?? [])} />
                    </div>
                </div>
            );
        }
        case 'financial': {
            const d = data as FinancialOverview;
            return (
                <div className="space-y-5">
                    <Meter
                        label="Fee Collection"
                        rate={d.summary?.collectionRate ?? 0}
                        detail={`${formatMoney(d.summary?.totalCollected)} collected of ${formatMoney(d.summary?.totalExpected)} · ${formatMoney(d.summary?.outstanding)} outstanding`}
                    />
                    <StatGrid>
                        <StatTile label="Payments · 7 days" value={formatNumber(d.summary?.paymentsLast7Days)} />
                        <StatTile label="Expenditures YTD" value={formatMoney(d.summary?.totalExpendituresYTD)} />
                        <StatTile label="Refunds" value={formatMoney(d.summary?.totalRefunds)} sub={`${formatNumber(d.summary?.refundCount)} refund(s)`} />
                        <StatTile label="Pending Finance Requests" value={formatNumber(d.summary?.pendingFinanceRequests)} tone={(d.summary?.pendingFinanceRequests ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Active Fee Items" value={formatNumber(d.summary?.activeFeeItems)} />
                        <StatTile label="Control Payments" value={formatNumber(d.summary?.controlPaymentsRecorded)} />
                    </StatGrid>
                    <TwoCol>
                        <DonutChart
                            title="Payments by Method"
                            centerText={formatMoney((d.paymentsByMethod ?? []).reduce((s, x) => s + x.totalAmount, 0))}
                            centerSub="collected"
                            segments={toCategoricalSegments((d.paymentsByMethod ?? []).map(x => ({
                                label: formatLabel(x.method),
                                value: x.totalAmount,
                                display: formatMoney(x.totalAmount),
                            })))}
                        />
                        <Section title="Expenditures by Category · YTD">
                            <BarList rows={(d.expendituresByCategoryYTD ?? []).map(x => ({
                                label: formatLabel(x.category),
                                value: x.totalAmount,
                                display: formatMoney(x.totalAmount),
                            }))} />
                        </Section>
                    </TwoCol>
                    <DonutChart title="Finance Requests by Status" centerSub="requests" segments={toStatusSegments(d.financeRequestsByStatus ?? [])} />
                </div>
            );
        }
        case 'staff': {
            const d = data as StaffOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Total Users" value={formatNumber(d.summary?.totalUsers)} />
                        <StatTile label="Teachers" value={formatNumber(d.summary?.totalTeachers)} />
                        <StatTile label="Avg. Teaching Hours" value={formatNumber(d.summary?.averageTeachingHours)} />
                        <StatTile label="New Staff This Month" value={formatNumber(d.summary?.newStaffThisMonth)} />
                        <StatTile label="Teachers · Full Schedule" value={formatNumber(d.summary?.teachersWithFullSchedule)} />
                    </StatGrid>
                    <TwoCol>
                        <Section title="Users by Role">
                            <BarList
                                rows={[...(d.usersByRole ?? [])].sort((a, b) => b.count - a.count).map(x => ({ label: formatLabel(x.role), value: x.count }))}
                                maxRows={12}
                            />
                        </Section>
                        <div className="space-y-5">
                            <DonutChart title="Users by Status" centerSub="users" segments={toStatusSegments(d.usersByStatus ?? [])} />
                            <BarChart title="Subclass Assignments by Role" rows={(d.subclassAssignmentsByRole ?? []).map(x => ({ label: formatLabel(x.role), value: x.count }))} />
                        </div>
                    </TwoCol>
                </div>
            );
        }
        case 'communication': {
            const d = data as CommunicationOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Announcements" value={formatNumber(d.summary?.totalAnnouncements)} sub={`${formatNumber(d.summary?.announcementsThisMonth)} this month`} />
                        <StatTile label="Unread Notifications" value={formatNumber(d.summary?.unreadNotifications)} />
                        <StatTile label="Messages · 7 days" value={formatNumber(d.summary?.messagesLast7Days)} />
                        <StatTile label="Chat Messages · 7 days" value={formatNumber(d.summary?.chatMessagesLast7Days)} />
                    </StatGrid>
                    <BarChart title="Notifications by Category · 30 days" rows={(d.notificationsLast30DaysByCategory ?? []).map(x => ({ label: formatLabel(x.category), value: x.count }))} />
                    <TwoCol>
                        <DonutChart title="Announcements by Audience" centerSub="announcements" segments={toCategoricalSegments((d.announcementsByAudience ?? []).map(x => ({ label: formatLabel(x.audience), value: x.count })))} />
                        <DonutChart title="Notification Delivery · 30 days" centerSub="notifications" segments={toStatusSegments(d.notificationsLast30DaysByStatus ?? [])} />
                    </TwoCol>
                </div>
            );
        }
        case 'health': {
            const d = data as HealthOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Visits This Year" value={formatNumber(d.summary?.totalVisitsInYear)} />
                        <StatTile label="Visits This Month" value={formatNumber(d.summary?.visitsThisMonth)} />
                        <StatTile label="Visits · 7 days" value={formatNumber(d.summary?.visitsLast7Days)} />
                        <StatTile label="Sent Home This Month" value={formatNumber(d.summary?.sentHomeThisMonth)} />
                        <StatTile label="Students With Health Conditions" value={formatNumber(d.summary?.studentsWithHealthConditions)} />
                    </StatGrid>
                    <BarChart title="Top Infirmary Complaints · 30 days" rows={(d.topReasonsLast30Days ?? []).map(x => ({ label: formatLabel(x.reason), value: x.count }))} />
                </div>
            );
        }
        case 'ream-stock': {
            const d = data as ReamStockOverview;
            const low = (d.summary?.currentStock ?? 0) < LOW_REAM_THRESHOLD;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Current Stock" value={`${formatNumber(d.summary?.currentStock)} reams`} tone={low ? 'alert' : 'default'} sub={low ? 'Low stock' : undefined} />
                        <StatTile label="Total Received" value={formatNumber(d.summary?.totalReceived)} />
                        <StatTile label="Total Issued" value={formatNumber(d.summary?.totalIssued)} />
                        <StatTile label="Received · 30 days" value={formatNumber(d.summary?.reamsReceivedLast30Days)} sub={`${formatNumber(d.summary?.receiptsLast30Days)} receipt(s)`} />
                        <StatTile label="Issued · 30 days" value={formatNumber(d.summary?.reamsIssuedLast30Days)} sub={`${formatNumber(d.summary?.issuancesLast30Days)} issuance(s)`} />
                    </StatGrid>
                    <Section title="Top Recipients · 90 days">
                        <BarList rows={(d.topRecipientsLast90Days ?? []).map(x => ({
                            label: x.recipientName || (x.recipientUserId != null ? `User #${x.recipientUserId}` : 'Unknown'),
                            value: x.reamsIssued,
                        }))} />
                    </Section>
                </div>
            );
        }
        case 'salary': {
            const d = data as SalaryOverview;
            const p = d.summary?.latestPayPeriod;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile
                            label="Latest Pay Period"
                            value={p ? `${MONTHS[(p.month ?? 1) - 1]} ${p.year}` : '—'}
                            sub={p ? `${formatLabel(p.status)} · pays ${new Date(p.payDate).toLocaleDateString()}` : undefined}
                        />
                        <StatTile label="Active Profiles" value={formatNumber(d.summary?.activeProfiles)} />
                        <StatTile label="Payments Recorded" value={formatNumber(d.summary?.totalPaymentsRecorded)} />
                        {d.summary?.totalPayoutYear != null && <StatTile label="Payout This Year" value={formatMoney(d.summary?.totalPayoutYear)} />}
                        {d.summary?.totalWithheldYear != null && <StatTile label="Withheld This Year" value={formatMoney(d.summary?.totalWithheldYear)} />}
                        <StatTile label="Pending Approvals" value={formatNumber(d.summary?.pendingApprovalProfiles)} tone={(d.summary?.pendingApprovalProfiles ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Pending Change Requests" value={formatNumber(d.summary?.pendingChangeRequests)} tone={(d.summary?.pendingChangeRequests ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Pending Allowances" value={formatNumber(d.summary?.pendingAllowances)} tone={(d.summary?.pendingAllowances ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Pending Withholdings" value={formatNumber(d.summary?.pendingWithholdings)} tone={(d.summary?.pendingWithholdings ?? 0) > 0 ? 'alert' : 'default'} />
                    </StatGrid>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <DonutChart title="Profiles by Status" centerSub="profiles" segments={toStatusSegments(d.profilesByStatus ?? [])} />
                        <DonutChart title="Profiles by Type" centerSub="profiles" segments={toCategoricalSegments((d.profilesByType ?? []).map(x => ({ label: formatLabel(x.type), value: x.count })))} />
                        <DonutChart title="Pay Periods by Status" centerSub="periods" segments={toStatusSegments(d.payPeriodsByStatus ?? [])} />
                    </div>
                </div>
            );
        }
        case 'tasks': {
            const d = data as TasksOverview;
            return (
                <div className="space-y-5">
                    <Meter
                        label="Task Completion"
                        rate={d.summary?.completionRate ?? 0}
                        detail={`${formatNumber(d.summary?.tasksCompletedLast30Days)} completed · ${formatNumber(d.summary?.tasksCreatedLast30Days)} created in the last 30 days`}
                    />
                    <StatGrid>
                        <StatTile label="Total Tasks" value={formatNumber(d.summary?.totalTasks)} />
                        <StatTile label="Overdue" value={formatNumber(d.summary?.overdueTasks)} tone={(d.summary?.overdueTasks ?? 0) > 0 ? 'alert' : 'default'} />
                    </StatGrid>
                    <TwoCol>
                        <DonutChart title="Tasks by Status" centerSub="tasks" segments={toStatusSegments(d.tasksByStatus ?? [])} />
                        <DonutChart title="Tasks by Priority" centerSub="tasks" segments={toStatusSegments((d.tasksByPriority ?? []).map(x => ({ status: x.priority, count: x.count })))} />
                    </TwoCol>
                    <BarChart title="Tasks by Category" rows={(d.tasksByCategory ?? []).map(x => ({ label: formatLabel(x.category), value: x.count }))} />
                </div>
            );
        }
        case 'inventory': {
            const d = data as InventoryOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Catalogued Items" value={formatNumber(d.summary?.totalItems)} sub={d.summary?.activeItems != null ? `${formatNumber(d.summary?.activeItems)} active` : undefined} />
                        <StatTile label="Total Holdings" value={formatNumber(d.summary?.totalHoldings)} sub={`${formatNumber(d.summary?.distinctHoldings)} distinct`} />
                        <StatTile label="Pending Transfers" value={formatNumber(d.summary?.pendingTransfers)} tone={(d.summary?.pendingTransfers ?? 0) > 0 ? 'alert' : 'default'} />
                        <StatTile label="Ledger Entries · 30 days" value={formatNumber(d.summary?.ledgerEntriesLast30Days)} />
                    </StatGrid>
                    <TwoCol>
                        <BarChart title="Top Items by Quantity" rows={(d.topItemsByQuantity ?? []).map(x => ({ label: `${x.name} (${x.unit})`, value: x.totalQuantity }))} maxCols={6} />
                        <DonutChart title="Transfers by Status" centerSub="transfers" segments={toStatusSegments(d.transfersByStatus ?? [])} />
                    </TwoCol>
                </div>
            );
        }
        case 'audit': {
            const d = data as AuditOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Modifications · 30 days" value={formatNumber(d.summary?.totalModificationsLast30Days)} />
                        <StatTile label="Active Users · 30 days" value={formatNumber(d.summary?.distinctActiveUsersLast30Days)} />
                    </StatGrid>
                    <TwoCol>
                        <DonutChart
                            title="Actions · 30 days"
                            centerSub="changes"
                            segments={toCategoricalSegments((d.actionsLast30Days ?? []).map(x => ({ label: formatLabel(x.action), value: x.count })))}
                        />
                        <BarChart title="Most Modified Tables · 30 days" rows={(d.topTablesLast30Days ?? []).map(x => ({ label: x.table, value: x.count }))} maxCols={6} />
                    </TwoCol>
                    <TwoCol>
                        <Section title="Most Active Users · 30 days">
                            <ul className="divide-y divide-gray-100">
                                {(d.topActiveUsersLast30Days ?? []).map(u => (
                                    <li key={u.userId} className="py-1.5 flex items-center justify-between gap-2">
                                        <span className="text-sm text-gray-700 truncate min-w-0">
                                            {u.name}
                                            <span className="text-xs text-gray-400"> {u.matricule}</span>
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 tabular-nums shrink-0">{formatNumber(u.actions)}</span>
                                    </li>
                                ))}
                                {(d.topActiveUsersLast30Days ?? []).length === 0 && <p className="text-sm text-gray-500">No data.</p>}
                            </ul>
                        </Section>
                    </TwoCol>
                </div>
            );
        }
        case 'enrollment': {
            const d = data as EnrollmentOverview;
            return (
                <div className="space-y-5">
                    <StatGrid>
                        <StatTile label="Total Enrollments" value={formatNumber(d.summary?.totalEnrollments)} />
                        <StatTile label="Unassigned" value={formatNumber(d.summary?.unassignedEnrollments)} tone={(d.summary?.unassignedEnrollments ?? 0) > 0 ? 'alert' : 'default'} sub="need a subclass" />
                        <StatTile label="New This Month" value={formatNumber(d.summary?.newEnrollmentsThisMonth)} />
                        <StatTile label="Assignment Rate" value={formatPercent(d.summary?.assignmentRate)} />
                    </StatGrid>
                    <Section title="Class Utilization">
                        <div className="space-y-3">
                            {(d.classUtilization ?? []).map(c => (
                                <Meter
                                    key={c.classId}
                                    label={`${c.className} · ${formatNumber(c.currentStudents)}/${formatNumber(c.maxStudents)} students`}
                                    rate={c.utilizationRate}
                                    critical={c.utilizationRate > 95}
                                />
                            ))}
                            {(d.classUtilization ?? []).length === 0 && <p className="text-sm text-gray-500">No data.</p>}
                        </div>
                    </Section>
                    <TwoCol>
                        <DonutChart title="Gender Split" centerSub="students" segments={toCategoricalSegments((d.genderSplit ?? []).map(x => ({ label: x.gender, value: x.count })))} />
                        <DonutChart title="Students by Status" centerSub="students" segments={toStatusSegments(d.studentsByStatus ?? [])} />
                    </TwoCol>
                </div>
            );
        }
        default:
            return null;
    }
}
