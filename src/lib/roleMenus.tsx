import {
  HomeIcon,
  SparklesIcon,
  UserGroupIcon,
  UserPlusIcon,
  BellIcon,
  DocumentChartBarIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  CalendarIcon,
  Cog6ToothIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon,
  ArchiveBoxIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UsersIcon,
  MegaphoneIcon,
  ClockIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { QuickAction, QuickActionColor } from '@/components/dashboard/QuickActionGrid';

export interface MenuItem {
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, 'ref'> & { title?: string | undefined; titleId?: string | undefined } & React.RefAttributes<SVGSVGElement>>;
  label: string;
  href: string;
  subItems?: MenuItem[];
  navigates?: boolean;
}

export type RoleKey =
  | 'principal'
  | 'bursar'
  | 'discipline-master'
  | 'senior-discipline-master'
  | 'dean-of-discipline'
  | 'dean-of-studies'
  | 'fee-auditor'
  | 'secretary'
  | 'nurse'
  | 'hod'
  | 'parent-student'
  | 'super-manager'
  | 'guidancecounselor'
  | 'teacher'
  | 'vice-principal'
  | 'manager'
  | 'controller';

export type MenuItemsStructure = Record<RoleKey, MenuItem[]>;

export const menuItems: MenuItemsStructure = {
  principal: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/principal' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/principal/students' },
    { icon: UsersIcon, label: 'Enrollment', href: '/dashboard/principal/enrollment' },
    { icon: UserGroupIcon, label: 'Personnel', href: '/dashboard/principal/personnel-management' },
    { icon: AcademicCapIcon, label: 'Teacher Management', href: '/dashboard/principal/teacher-management' },
    { icon: BanknotesIcon, label: 'Expense Requisition', href: '/dashboard/principal/finance-requests' },
    { icon: ReceiptRefundIcon, label: 'Expenditures', href: '/dashboard/principal/expenditures' },
    { icon: CurrencyDollarIcon, label: 'Fee Defaulters', href: '/dashboard/principal/defaulters' },
    {
      icon: ClipboardDocumentListIcon, label: 'Discipline', href: '/dashboard/principal/discipline', subItems: [
        { label: 'Morning Roll-Call', href: '/dashboard/principal/roll-call', icon: ChevronRightIcon },
        { label: 'Roll Call', href: '/dashboard/principal/dm-roll-call', icon: ChevronRightIcon },
        { label: 'Teacher Roll Calls', href: '/dashboard/principal/teacher-roll-calls', icon: ChevronRightIcon },
        { label: 'Teacher Attendance', href: '/dashboard/principal/teacher-attendance', icon: ChevronRightIcon },
        { label: 'Warnings & Summons', href: '/dashboard/principal/warnings-summons', icon: ChevronRightIcon },
        { label: 'Disciplinary Actions', href: '/dashboard/principal/disciplinary-actions', icon: ChevronRightIcon },
        { label: 'Saturday Punishments', href: '/dashboard/principal/punishments', icon: ChevronRightIcon },
        { label: 'Broken Property', href: '/dashboard/principal/broken-property', icon: ChevronRightIcon },
        { label: 'Report Requests', href: '/dashboard/principal/report-requests', icon: ChevronRightIcon },
        { label: 'Seized Items', href: '/dashboard/principal/seized-items', icon: ChevronRightIcon },
      ]
    },
    { icon: CalendarDaysIcon, label: 'Examination Structure', href: '/dashboard/principal/examination-structure' },
    { icon: CalendarIcon, label: 'Timetable Management', href: '/dashboard/principal/timetable' },
    { icon: DocumentChartBarIcon, label: 'Report Card Management', href: '/dashboard/principal/report-card-management' },
    { icon: BookOpenIcon, label: 'Schemes of Work', href: '/dashboard/principal/schemes-of-work' },
    { icon: ClipboardDocumentCheckIcon, label: 'Logbook Review', href: '/dashboard/principal/teacher-logbook' },
    { icon: ClipboardDocumentCheckIcon, label: 'Fee Audit', href: '/dashboard/principal/fee-comparison' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/principal/overview' },
  ],
  bursar: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/bursar' },
    { icon: CurrencyDollarIcon, label: 'Fee Management', href: '/dashboard/bursar/fee-management' },
    { icon: BanknotesIcon, label: 'Fee Items', href: '/dashboard/bursar/fee-items' },
    { icon: ReceiptRefundIcon, label: 'Overpayments & Refunds', href: '/dashboard/bursar/overpayments' },
    { icon: BanknotesIcon, label: 'Expense Requisition', href: '/dashboard/bursar/finance-requests' },
    { icon: ReceiptRefundIcon, label: 'Expenditures', href: '/dashboard/bursar/expenditures' },
    { icon: ClipboardDocumentListIcon, label: 'Broken Property', href: '/dashboard/bursar/broken-property' },
    { icon: UserPlusIcon, label: 'Student Registration', href: '/dashboard/bursar/student-registration' },
    { icon: UsersIcon, label: 'Enrollment', href: '/dashboard/bursar/enrollment' },
    { icon: DocumentChartBarIcon, label: 'Report Card Readiness', href: '/dashboard/bursar/report-card-readiness' },
    { icon: ChartBarIcon, label: 'Fee Statistics', href: '/dashboard/bursar/fee-statistics' },
    { icon: CurrencyDollarIcon, label: 'Fee Defaulters', href: '/dashboard/bursar/defaulters' },
    { icon: DocumentChartBarIcon, label: 'Financial Reports', href: '/dashboard/bursar/reports' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/bursar/overview' },
  ],
  'discipline-master': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/discipline-master' },
    { icon: ClockIcon, label: 'Roll Call', href: '/dashboard/discipline-master/dm-roll-call' },
    { icon: ClipboardDocumentCheckIcon, label: 'Teacher Attendance', href: '/dashboard/discipline-master/teacher-attendance' },
    { icon: BellIcon, label: 'Warnings & Summons', href: '/dashboard/discipline-master/warnings-summons' },
    { icon: ClipboardDocumentListIcon, label: 'Attendance & Lateness', href: '/dashboard/discipline-master/attendance' },
    { icon: CalendarDaysIcon, label: 'Saturday Punishments', href: '/dashboard/discipline-master/punishments' },
    { icon: BanknotesIcon, label: 'Broken Property', href: '/dashboard/discipline-master/broken-property' },
    { icon: ClipboardDocumentListIcon, label: 'Disciplinary Actions', href: '/dashboard/discipline-master/disciplinary-actions' },
    { icon: DocumentChartBarIcon, label: 'Report Requests', href: '/dashboard/discipline-master/report-requests' },
    { icon: UserGroupIcon, label: 'Student Profiles', href: '/dashboard/discipline-master/students' },
    { icon: ArchiveBoxIcon, label: 'Seized Items', href: '/dashboard/discipline-master/seized-items' },
    { icon: DocumentChartBarIcon, label: 'Reports', href: '/dashboard/discipline-master/reports' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/discipline-master/overview' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/discipline-master/finance-requests' },
  ],
  hod: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/hod' },
    { icon: UserGroupIcon, label: 'Department Staff', href: '/dashboard/hod/staff' },
    { icon: CalendarIcon, label: 'Period Tracking', href: '/dashboard/hod/periods' },
    { icon: AcademicCapIcon, label: 'Curriculum', href: '/dashboard/hod/curriculum' },
    { icon: BookOpenIcon, label: 'Schemes of Work', href: '/dashboard/hod/schemes-of-work' },
    { icon: ClipboardDocumentCheckIcon, label: 'Logbook Review', href: '/dashboard/hod/teacher-logbook' },
    { icon: DocumentChartBarIcon, label: 'Performance', href: '/dashboard/hod/performance' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/hod/overview' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/hod/finance-requests' },
  ],
  'parent-student': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/parent-student' },
    { icon: UserGroupIcon, label: 'My Children', href: '/dashboard/parent-student/children' },
    { icon: DocumentChartBarIcon, label: 'Results & Report Cards', href: '/dashboard/parent-student/child-snapshot' },
    { icon: BanknotesIcon, label: 'My Payments', href: '/dashboard/parent-student/payments' },
    { icon: DocumentChartBarIcon, label: 'Analytics', href: '/dashboard/parent-student/analytics' },
    { icon: Cog6ToothIcon, label: 'Settings', href: '/dashboard/parent-student/settings' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/parent-student/overview' },
  ],
  'super-manager': [
    { label: 'Menu', href: '/dashboard/super-manager', icon: HomeIcon },
    { label: 'Ask (AI)', href: '/dashboard/super-manager/ask', icon: SparklesIcon },
    {
      label: 'Personnel Management', href: '/dashboard/super-manager/personnel-management', icon: UserGroupIcon, navigates: true, subItems: [
        { label: 'All Personnel', href: '/dashboard/super-manager/personnel-management', icon: ChevronRightIcon },
        { label: 'Vice Principals', href: '/dashboard/super-manager/vice-principal-management', icon: ChevronRightIcon },
        { label: 'Discipline Masters', href: '/dashboard/super-manager/discipline-master-management', icon: ChevronRightIcon },
        { label: 'Teachers', href: '/dashboard/super-manager/teacher-management', icon: ChevronRightIcon },
        { label: 'Parents', href: '/dashboard/super-manager/parents-management', icon: ChevronRightIcon },
        { label: 'Bursars', href: '/dashboard/super-manager/bursar-management', icon: ChevronRightIcon },
        { label: 'Guidance Counselors', href: '/dashboard/super-manager/guidance-counselor-management', icon: ChevronRightIcon },
      ]
    },
    { label: 'Classes & Subclasses', href: '/dashboard/super-manager/classes', icon: BuildingLibraryIcon },
    { label: 'Student Management', href: '/dashboard/super-manager/student-management', icon: UsersIcon },
    { label: 'Enrollment', href: '/dashboard/super-manager/enrollment', icon: UsersIcon },
    { label: 'Subject Management', href: '/dashboard/super-manager/subject-management', icon: BookOpenIcon },
    { label: 'Fees Management', href: '/dashboard/super-manager/fees-management', icon: CurrencyDollarIcon },
    { label: 'Fee Audit & Control', href: '/dashboard/super-manager/fee-comparison', icon: ClipboardDocumentCheckIcon },
    { label: 'Fee Defaulters', href: '/dashboard/super-manager/defaulters', icon: CurrencyDollarIcon },
    { label: 'Expense Requisition', href: '/dashboard/super-manager/finance-requests', icon: BanknotesIcon },
    { label: 'Salary Management', href: '/dashboard/super-manager/salaries', icon: BanknotesIcon },
    { label: 'Expenditures', href: '/dashboard/super-manager/expenditures', icon: ReceiptRefundIcon },
    { label: 'Discipline Overview', href: '/dashboard/super-manager/overview?module=discipline', icon: ClipboardDocumentListIcon },
    { label: 'Report Requests', href: '/dashboard/super-manager/report-requests', icon: DocumentChartBarIcon },
    { label: 'Examination Structure', href: '/dashboard/super-manager/examination-structure', icon: CalendarDaysIcon },
    { label: 'Marks Management', href: '/dashboard/super-manager/marks-management', icon: ClipboardDocumentCheckIcon },
    { label: 'Report Card Generation', href: '/dashboard/super-manager/report-card-generation', icon: DocumentChartBarIcon },
    { label: 'Academic Year', href: '/dashboard/super-manager/academic-years', icon: CalendarIcon },
    { label: 'Timetable Management', href: '/dashboard/super-manager/timetable', icon: CalendarIcon },
    { label: 'Communication', href: '/dashboard/super-manager/communication', icon: MegaphoneIcon },
    { label: 'Settings', href: '/dashboard/super-manager/settings', icon: Cog6ToothIcon },
    { label: 'Data Sync', href: '/dashboard/super-manager/data-sync', icon: ArrowPathIcon },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/super-manager/overview' },
  ],
  guidancecounselor: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/guidance-counselor' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/guidance-counselor/students' },
    { icon: ClipboardDocumentCheckIcon, label: 'Remarks', href: '/dashboard/guidance-counselor/remarks' },
    { icon: BuildingLibraryIcon, label: 'Behavior', href: '/dashboard/guidance-counselor/behavior' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/guidance-counselor/overview' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/guidance-counselor/finance-requests' },
  ],
  teacher: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/teacher' },
    { icon: BuildingLibraryIcon, label: 'Question Management', href: '/dashboard/teacher/question-management' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/teacher/students' },
    { icon: AcademicCapIcon, label: 'Subjects', href: '/dashboard/teacher/subjects' },
    { icon: ClipboardDocumentCheckIcon, label: 'Submit Marks', href: '/dashboard/teacher/submit-marks' },
    { icon: BuildingLibraryIcon, label: 'Exams', href: '/dashboard/teacher/exams' },
    { icon: CalendarIcon, label: 'Timetable', href: '/dashboard/teacher/timetable' },
    { icon: ClipboardDocumentCheckIcon, label: 'Roll Call', href: '/dashboard/teacher/roll-call' },
    { icon: ClockIcon, label: 'Period Roll Call', href: '/dashboard/teacher/period-roll-call' },
    { icon: BookOpenIcon, label: 'Logbook', href: '/dashboard/teacher/logbook' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/teacher/overview' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/teacher/finance-requests' },
  ],
  'vice-principal': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/vice-principal' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/vice-principal/students' },
    { icon: AcademicCapIcon, label: 'Classes', href: '/dashboard/vice-principal/classes' },
    { icon: ClipboardDocumentCheckIcon, label: 'Subjects', href: '/dashboard/vice-principal/subjects' },
    { icon: UserGroupIcon, label: 'Teachers', href: '/dashboard/vice-principal/teachers' },
    { icon: UserGroupIcon, label: 'Interviews', href: '/dashboard/vice-principal/interviews' },
    { icon: UsersIcon, label: 'Enrollment', href: '/dashboard/vice-principal/enrollment' },
    { icon: CalendarIcon, label: 'Timetable', href: '/dashboard/vice-principal/timetable' },
    { icon: BookOpenIcon, label: 'Schemes of Work', href: '/dashboard/vice-principal/schemes-of-work' },
    { icon: ClipboardDocumentCheckIcon, label: 'Logbook Review', href: '/dashboard/vice-principal/teacher-logbook' },
    { icon: ClipboardDocumentListIcon, label: 'Marks Submission', href: '/dashboard/vice-principal/marks-submission' },
    { icon: DocumentChartBarIcon, label: 'Report Card Management', href: '/dashboard/vice-principal/report-card-management' },
    { icon: BanknotesIcon, label: 'Expense Requisition', href: '/dashboard/vice-principal/finance-requests' },
    { icon: ReceiptRefundIcon, label: 'Expenditures', href: '/dashboard/vice-principal/expenditures' },
    {
      icon: ClipboardDocumentListIcon, label: 'Discipline', href: '/dashboard/vice-principal/discipline', subItems: [
        { label: 'Morning Roll-Call', href: '/dashboard/vice-principal/roll-call', icon: ChevronRightIcon },
        { label: 'Roll Call', href: '/dashboard/vice-principal/dm-roll-call', icon: ChevronRightIcon },
        { label: 'Teacher Roll Calls', href: '/dashboard/vice-principal/teacher-roll-calls', icon: ChevronRightIcon },
        { label: 'Teacher Attendance', href: '/dashboard/vice-principal/teacher-attendance', icon: ChevronRightIcon },
        { label: 'Warnings & Summons', href: '/dashboard/vice-principal/warnings-summons', icon: ChevronRightIcon },
        { label: 'Disciplinary Actions', href: '/dashboard/vice-principal/disciplinary-actions', icon: ChevronRightIcon },
        { label: 'Saturday Punishments', href: '/dashboard/vice-principal/punishments', icon: ChevronRightIcon },
        { label: 'Broken Property', href: '/dashboard/vice-principal/broken-property', icon: ChevronRightIcon },
        { label: 'Report Requests', href: '/dashboard/vice-principal/report-requests', icon: ChevronRightIcon },
        { label: 'Seized Items', href: '/dashboard/vice-principal/seized-items', icon: ChevronRightIcon },
      ]
    },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/vice-principal/overview' },
  ],
  manager: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/manager' },
    { icon: DocumentChartBarIcon, label: 'Financial Reports', href: '/dashboard/manager/financial-reports' },
    { icon: BanknotesIcon, label: 'Expense Requisition', href: '/dashboard/manager/finance-requests' },
    { icon: BanknotesIcon, label: 'Salary Management', href: '/dashboard/manager/salaries' },
    { icon: ReceiptRefundIcon, label: 'Expenditures', href: '/dashboard/manager/expenditures' },
    {
      icon: ClipboardDocumentListIcon, label: 'Discipline', href: '/dashboard/manager/discipline', subItems: [
        { label: 'Morning Roll-Call', href: '/dashboard/manager/roll-call', icon: ChevronRightIcon },
        { label: 'Disciplinary Actions', href: '/dashboard/manager/disciplinary-actions', icon: ChevronRightIcon },
        { label: 'Saturday Punishments', href: '/dashboard/manager/punishments', icon: ChevronRightIcon },
        { label: 'Broken Property', href: '/dashboard/manager/broken-property', icon: ChevronRightIcon },
        { label: 'Report Requests', href: '/dashboard/manager/report-requests', icon: ChevronRightIcon },
      ]
    },
    { icon: ClipboardDocumentCheckIcon, label: 'Fee Audit', href: '/dashboard/manager/fee-comparison' },
    { icon: CurrencyDollarIcon, label: 'Fee Defaulters', href: '/dashboard/manager/defaulters' },
    { icon: ArchiveBoxIcon, label: 'Seized Items', href: '/dashboard/manager/seized-items' },
    { icon: ChartBarIcon, label: 'Overview', href: '/dashboard/manager/overview' },
  ],
  'dean-of-studies': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/dean-of-studies' },
    { icon: CalendarDaysIcon, label: 'Timetable', href: '/dashboard/dean-of-studies/timetable' },
    { icon: BookOpenIcon, label: 'Schemes of Work', href: '/dashboard/dean-of-studies/schemes-of-work' },
    { icon: ClipboardDocumentCheckIcon, label: 'Logbook Review', href: '/dashboard/dean-of-studies/teacher-logbook' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/dean-of-studies/finance-requests' },
  ],
  'dean-of-discipline': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/dean-of-discipline' },
    { icon: ClipboardDocumentCheckIcon, label: 'Morning Roll-Call', href: '/dashboard/dean-of-discipline/roll-call' },
    { icon: ClockIcon, label: 'Roll Call', href: '/dashboard/dean-of-discipline/dm-roll-call' },
    { icon: BellIcon, label: 'Warnings & Summons', href: '/dashboard/dean-of-discipline/warnings-summons' },
    { icon: UserPlusIcon, label: 'DM Assignments', href: '/dashboard/dean-of-discipline/dm-assignments' },
    { icon: ClipboardDocumentCheckIcon, label: 'Teacher Roll Calls', href: '/dashboard/dean-of-discipline/teacher-roll-calls' },
    { icon: ClipboardDocumentCheckIcon, label: 'Teacher Attendance', href: '/dashboard/dean-of-discipline/teacher-attendance' },
    { icon: ArchiveBoxIcon, label: 'Seized Items', href: '/dashboard/dean-of-discipline/seized-items' },
    { icon: ClipboardDocumentListIcon, label: 'Disciplinary Actions', href: '/dashboard/dean-of-discipline/disciplinary-actions' },
    { icon: CalendarDaysIcon, label: 'Saturday Punishments', href: '/dashboard/dean-of-discipline/punishments' },
    { icon: BanknotesIcon, label: 'Broken Property', href: '/dashboard/dean-of-discipline/broken-property' },
    { icon: DocumentChartBarIcon, label: 'Report Requests', href: '/dashboard/dean-of-discipline/report-requests' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/dean-of-discipline/finance-requests' },
  ],
  'senior-discipline-master': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/senior-discipline-master' },
    { icon: BellIcon, label: 'Warnings & Summons', href: '/dashboard/senior-discipline-master/warnings-summons' },
    { icon: CalendarDaysIcon, label: 'Saturday Punishments', href: '/dashboard/senior-discipline-master/punishments' },
    { icon: BanknotesIcon, label: 'Broken Property', href: '/dashboard/senior-discipline-master/broken-property' },
    { icon: ClipboardDocumentListIcon, label: 'Disciplinary Actions', href: '/dashboard/senior-discipline-master/disciplinary-actions' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/senior-discipline-master/students' },
    { icon: UserPlusIcon, label: 'DM Assignments', href: '/dashboard/senior-discipline-master/dm-assignments' },
    { icon: ClipboardDocumentCheckIcon, label: 'Teacher Roll Calls', href: '/dashboard/senior-discipline-master/teacher-roll-calls' },
    { icon: ClipboardDocumentCheckIcon, label: 'Teacher Attendance', href: '/dashboard/senior-discipline-master/teacher-attendance' },
    { icon: ArchiveBoxIcon, label: 'Seized Items', href: '/dashboard/senior-discipline-master/seized-items' },
    { icon: DocumentChartBarIcon, label: 'Report Requests', href: '/dashboard/senior-discipline-master/report-requests' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/senior-discipline-master/finance-requests' },
  ],
  'fee-auditor': [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/fee-auditor' },
    { icon: BanknotesIcon, label: 'Expense Requisition', href: '/dashboard/fee-auditor/finance-requests' },
    { icon: ReceiptRefundIcon, label: 'Expenditures', href: '/dashboard/fee-auditor/expenditures' },
    { icon: ClipboardDocumentListIcon, label: 'Broken Property', href: '/dashboard/fee-auditor/broken-property' },
  ],
  secretary: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/secretary' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/secretary/students' },
    { icon: UsersIcon, label: 'Enrollment', href: '/dashboard/secretary/enrollment' },
    { icon: AcademicCapIcon, label: 'Teachers', href: '/dashboard/secretary/teachers' },
    { icon: DocumentChartBarIcon, label: 'Class Lists', href: '/dashboard/secretary/class-lists' },
    { icon: BanknotesIcon, label: 'Finance Requests', href: '/dashboard/secretary/finance-requests' },
    { icon: ReceiptRefundIcon, label: 'Expenditures', href: '/dashboard/secretary/expenditures' },
    { icon: DocumentChartBarIcon, label: 'Overview', href: '/dashboard/secretary/overview' },
  ],
  nurse: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/nurse' },
    { icon: ClipboardDocumentCheckIcon, label: 'Visits', href: '/dashboard/nurse/visits' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/nurse/finance-requests' },
  ],
  controller: [
    { icon: HomeIcon, label: 'Menu', href: '/dashboard/controller' },
    { icon: ClipboardDocumentCheckIcon, label: 'Control Fee Management', href: '/dashboard/controller/fee-management' },
    { icon: BanknotesIcon, label: 'Request Money', href: '/dashboard/controller/finance-requests' },
  ],
};

// Every staff role gets the shared Inventory + Leave & Loans sections; parents can't hold
// inventory so they're excluded.
(Object.entries(menuItems) as [RoleKey, MenuItem[]][]).forEach(([key, items]) => {
  if (key === 'parent-student') return;
  const slug = key === 'guidancecounselor' ? 'guidance-counselor' : key;
  items.push({ icon: ArchiveBoxIcon, label: 'Inventory', href: `/dashboard/${slug}/inventory` });
  items.push({ icon: CurrencyDollarIcon, label: 'Leave & Loans', href: '/dashboard/leave-and-loans' });
});

// Super Manager also gets the approval queue.
menuItems['super-manager'].push({
  icon: CurrencyDollarIcon,
  label: 'Leave & Loans (Approvals)',
  href: '/dashboard/super-manager/leave-and-loans',
});

const QUICK_ACTION_COLORS: QuickActionColor[] = [
  'blue',
  'purple',
  'amber',
  'cyan',
  'green',
  'indigo',
  'teal',
  'rose',
];

/**
 * Flatten a role's sidebar menu into launcher tiles for the landing page.
 * Skips the self-referential "Menu" entry and follows the sidebar order.
 * When include_sub_items = true, sub-items are appended right after their parent.
 */
export function getQuickActionsForRole(
  roleKey: RoleKey,
  t: (s: string) => string,
  options: { includeSubItems?: boolean } = {},
): QuickAction[] {
  const includeSubItems = options.includeSubItems ?? true;
  const items = menuItems[roleKey] ?? [];
  const landingHref = `/dashboard/${roleKey === 'guidancecounselor' ? 'guidance-counselor' : roleKey}`;

  const seen = new Set<string>();
  const flat: MenuItem[] = [];
  for (const item of items) {
    if (item.href === landingHref) continue; // self-referential "Menu" entry
    if (!seen.has(item.href)) {
      seen.add(item.href);
      flat.push(item);
    }
    if (includeSubItems && item.subItems) {
      for (const sub of item.subItems) {
        if (!seen.has(sub.href)) {
          seen.add(sub.href);
          flat.push(sub);
        }
      }
    }
  }

  return flat.map((item, index) => ({
    label: t(item.label),
    href: item.href,
    icon: item.icon,
    color: QUICK_ACTION_COLORS[index % QUICK_ACTION_COLORS.length],
  }));
}
