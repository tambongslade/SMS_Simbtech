// Client for the read-only overview endpoints under /super-manager/overview/*.
// Roles: SUPER_MANAGER, MANAGER, PRINCIPAL (audit: SUPER_MANAGER + MANAGER only).
import apiService from '@/lib/apiService';

// Generic labelled-count shapes shared by every breakdown array
export interface CountBy<K extends string> {
    count: number;
    // The dimension key varies per endpoint ('type', 'status', 'role', …)
    [key: string]: number | string | null | undefined;
    // K documents the expected dimension name for readers of the type
    _dimension?: K;
}

export interface DisciplineOverview {
    summary: {
        totalIssues: number;
        issuesLast30Days: number;
        unexcusedLateness: number;
        unexcusedClassAbsences: number;
        activeWarnings: number;
        pendingParentSummons: number;
        pendingSaturdayPunishments: number;
        seizedItemsInCustody: number;
        rollCallsThisWeek: number;
    };
    issuesByType: { type: string; count: number }[];
    disciplinaryActions: {
        byType: { type: string; count: number }[];
        byStatus: { status: string; count: number }[];
    };
    seizedItemsByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

export interface AttendanceOverview {
    summary: {
        studentAttendanceRate: number;
        teacherAttendanceRateThisMonth: number;
        rollCallsThisMonth: number;
        teacherEvaluationsThisMonth: number;
        teacherAbsencesLast30Days: number;
    };
    studentRollCallByStatus: { status: string; count: number }[];
    teacherAttendanceByStatus: { status: string; count: number }[];
    teacherRollCallByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

export interface AcademicOverview {
    summary: {
        totalExamSequences: number;
        openSequences: number;
        marksRecorded: number;
        pendingReportCards?: number;
        subjectSchemes: number;
        logbookEntriesLast7Days: number;
    };
    sequencesByStatus: { status: string; count: number }[];
    reportsByStatus: { status: string; count: number }[];
    logbookByStatusLast30Days: { status: string; count: number }[];
    studentAveragesByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

export interface FinancialOverview {
    summary: {
        totalExpected: number;
        totalCollected: number;
        outstanding: number;
        collectionRate: number;
        paymentsLast7Days: number;
        totalExpendituresYTD: number;
        totalRefunds: number;
        refundCount: number;
        pendingFinanceRequests: number;
        activeFeeItems: number;
        controlPaymentsRecorded: number;
    };
    paymentsByMethod: { method: string; transactionCount: number; totalAmount: number; percentage: number }[];
    expendituresByCategoryYTD: { category: string; count: number; totalAmount: number }[];
    financeRequestsByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

export interface StaffOverview {
    summary: {
        totalUsers: number;
        totalTeachers: number;
        averageTeachingHours: number;
        newStaffThisMonth: number;
        teachersWithFullSchedule: number;
    };
    usersByRole: { role: string; count: number }[];
    usersByStatus: { status: string; count: number }[];
    subclassAssignmentsByRole: { role: string; count: number }[];
    lastUpdated: string;
}

export interface CommunicationOverview {
    summary: {
        totalAnnouncements: number;
        announcementsThisMonth: number;
        unreadNotifications: number;
        messagesLast7Days: number;
        chatMessagesLast7Days?: number;
    };
    announcementsByAudience: { audience: string; count: number }[];
    notificationsLast30DaysByCategory: { category: string; count: number }[];
    notificationsLast30DaysByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

export interface HealthOverview {
    summary: {
        totalVisitsInYear: number;
        visitsThisMonth: number;
        visitsLast7Days: number;
        sentHomeThisMonth: number;
        studentsWithHealthConditions: number;
    };
    topReasonsLast30Days: { reason: string; count: number }[];
    lastUpdated: string;
}

export interface ReamStockOverview {
    summary: {
        currentStock: number;
        totalReceived: number;
        totalIssued: number;
        receiptsLast30Days: number;
        reamsReceivedLast30Days: number;
        issuancesLast30Days: number;
        reamsIssuedLast30Days: number;
    };
    topRecipientsLast90Days: { recipientUserId: number | null; recipientName: string | null; reamsIssued: number }[];
    lastUpdated: string;
}

export interface SalaryOverview {
    summary: {
        activeProfiles: number;
        pendingApprovalProfiles: number;
        pendingChangeRequests: number;
        pendingAllowances: number;
        pendingWithholdings: number;
        totalPayoutYear?: number;
        totalWithheldYear?: number;
        totalPaymentsRecorded: number;
        cashInjectionsTotal?: number;
        cashInjectionsCount: number;
        latestPayPeriod: { id: number; year: number; month: number; payDate: string; status: string } | null;
    };
    profilesByStatus: { status: string; count: number }[];
    profilesByType: { type: string; count: number }[];
    payPeriodsByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

export interface TasksOverview {
    summary: {
        totalTasks: number;
        overdueTasks: number;
        completionRate: number;
        tasksCreatedLast30Days: number;
        tasksCompletedLast30Days: number;
    };
    tasksByStatus: { status: string; count: number }[];
    tasksByPriority: { priority: string; count: number }[];
    tasksByCategory: { category: string; count: number }[];
    lastUpdated: string;
}

export interface InventoryOverview {
    summary: {
        totalItems: number;
        activeItems?: number;
        totalHoldings: number;
        distinctHoldings: number;
        pendingTransfers: number;
        ledgerEntriesLast30Days: number;
    };
    transfersByStatus: { status: string; count: number }[];
    topItemsByQuantity: { itemId: number; name: string; unit: string; totalQuantity: number }[];
    lastUpdated: string;
}

export interface AuditOverview {
    summary: {
        totalModificationsLast30Days: number;
        distinctActiveUsersLast30Days: number;
    };
    actionsLast30Days: { action: string; count: number }[];
    topTablesLast30Days: { table: string; count: number }[];
    topActiveUsersLast30Days: { userId: number; name: string; matricule: string; actions: number }[];
    lastUpdated: string;
}

export interface EnrollmentOverview {
    summary: {
        totalEnrollments: number;
        unassignedEnrollments: number;
        newEnrollmentsThisMonth: number;
        averageClassUtilization: number;
        assignmentRate: number;
    };
    classUtilization: { classId: number; className: string; maxStudents: number; currentStudents: number; utilizationRate: number }[];
    genderSplit: { gender: string; count: number }[];
    studentsByStatus: { status: string; count: number }[];
    lastUpdated: string;
}

// GET /snapshot — one call for the whole KPI strip
export interface OverviewSnapshot {
    academicYearId: number;
    discipline: DisciplineOverview['summary'];
    attendance: AttendanceOverview['summary'];
    academic: AcademicOverview['summary'];
    financial: FinancialOverview['summary'];
    staff: StaffOverview['summary'];
    communication: CommunicationOverview['summary'];
    health: HealthOverview['summary'];
    reamStock: ReamStockOverview['summary'];
    salary: SalaryOverview['summary'];
    tasks: TasksOverview['summary'];
    inventory: InventoryOverview['summary'];
    audit?: AuditOverview['summary'];
    enrollment: EnrollmentOverview['summary'];
    lastUpdated: string;
}

export type OverviewModuleKey =
    | 'discipline'
    | 'attendance'
    | 'academic'
    | 'financial'
    | 'staff'
    | 'communication'
    | 'health'
    | 'ream-stock'
    | 'salary'
    | 'tasks'
    | 'inventory'
    | 'audit'
    | 'enrollment';

// Endpoints that ignore the academicYearId query param
const YEARLESS: OverviewModuleKey[] = ['ream-stock', 'tasks', 'inventory', 'audit'];

export const overviewEndpoint = (module: OverviewModuleKey | 'snapshot', academicYearId?: number) => {
    const base = `/super-manager/overview/${module}`;
    if (module !== 'snapshot' && YEARLESS.includes(module)) return base;
    return academicYearId ? `${base}?academicYearId=${academicYearId}` : base;
};

interface Envelope<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function fetchOverview<T>(url: string): Promise<T> {
    const res: Envelope<T> = await apiService.get(url);
    if (!res?.success || !res.data) throw new Error(res?.error || 'Failed to load overview data.');
    return res.data;
}
