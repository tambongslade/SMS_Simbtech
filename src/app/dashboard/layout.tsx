'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  HomeIcon, 
  UserGroupIcon, 
  BellIcon, 
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  CalendarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import { Fade } from '@/components/ui';

const menuItems = {
  principal: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/principal' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/principal/students' },
    { icon: UserGroupIcon, label: 'Staff', href: '/dashboard/principal/staff' },
    { icon: BellIcon, label: 'Announcements', href: '/dashboard/principal/announcements' },
    { icon: DocumentChartBarIcon, label: 'Reports', href: '/dashboard/principal/reports' },
    { icon: DocumentChartBarIcon, label: 'Report Card Management', href: '/dashboard/principal/report-card-management' },
  ],
  bursar: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/bursar' },
    { icon: CurrencyDollarIcon, label: 'Fee Management', href: '/dashboard/bursar/fee-management' },
    { icon: DocumentChartBarIcon, label: 'Financial Reports', href: '/dashboard/bursar/reports' },
    { icon: BellIcon, label: 'Announcements', href: '/dashboard/bursar/announcements' },
  ],
  'discipline-master': [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/discipline-master' },
    { icon: ClipboardDocumentListIcon, label: 'Attendance', href: '/dashboard/discipline-master/attendance' },
    { icon: DocumentChartBarIcon, label: 'Behavior Records', href: '/dashboard/discipline-master/behavior' },
    { icon: BellIcon, label: 'Disciplinary Cases', href: '/dashboard/discipline-master/cases' },
  ],
  hod: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/hod' },
    { icon: UserGroupIcon, label: 'Department Staff', href: '/dashboard/hod/staff' },
    { icon: CalendarIcon, label: 'Period Tracking', href: '/dashboard/hod/periods' },
    { icon: AcademicCapIcon, label: 'Curriculum', href: '/dashboard/hod/curriculum' },
    { icon: DocumentChartBarIcon, label: 'Performance', href: '/dashboard/hod/performance' },
    { icon: BellIcon, label: 'Announcements', href: '/dashboard/hod/announcements' },
  ],
  parentstudent: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/parentstudent' },
    { icon: CurrencyDollarIcon, label: 'Fees', href: '/dashboard/parentstudent/fees' },
    { icon: DocumentChartBarIcon, label: 'Results', href: '/dashboard/parentstudent/results' },
    { icon: BellIcon, label: 'Announcements', href: '/dashboard/parentstudent/announcements' },
  ],
  supermanager: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/supermanager' },
    { icon: AcademicCapIcon, label: 'Academic Years', href: '/dashboard/supermanager/academic-years' },
    { icon: CurrencyDollarIcon, label: 'Fees', href: '/dashboard/supermanager/fees' },
    { icon: CalendarIcon, label: 'School Calendar', href: '/dashboard/supermanager/calendar' },
    { icon: UserGroupIcon, label: 'Personnel Management', href: '/dashboard/supermanager/personnel-management' },
  ],
  guidancecounselor: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/guidancecounselor' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/guidancecounselor/students' },
    { icon: ClipboardDocumentCheckIcon, label: 'Remarks', href: '/dashboard/guidancecounselor/remarks' },
    { icon: BuildingLibraryIcon, label: 'Behavior', href: '/dashboard/guidancecounselor/behavior' },
  ],
  teacher: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/teacher' },
    { icon: BuildingLibraryIcon, label: 'Question Management', href: '/dashboard/teacher/question-management' },
    { icon: UserGroupIcon, label: 'Students', href: '/dashboard/teacher/students' },
    { icon: AcademicCapIcon, label: 'Subjects', href: '/dashboard/teacher/subjects' },
    { icon: ClipboardDocumentCheckIcon, label: 'Submit Marks', href: '/dashboard/teacher/submit-marks' },
    { icon: BuildingLibraryIcon, label: 'Exams', href: '/dashboard/teacher/exams' },
  ],
  viceprincipal: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/viceprincipal' },
    { icon: AcademicCapIcon, label: 'Classes', href: '/dashboard/viceprincipal/classes' },
    { icon: ClipboardDocumentCheckIcon, label: 'Subjects', href: '/dashboard/viceprincipal/subjects' },
    { icon: UserGroupIcon, label: 'Teachers', href: '/dashboard/viceprincipal/teachers' },
    { icon: DocumentChartBarIcon, label: 'Report Card Management', href: '/dashboard/viceprincipal/report-card-management' },
  ],
  manager: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/manager' },
    { icon: DocumentChartBarIcon, label: 'Financial Reports', href: '/dashboard/manager/financial-reports' },
    { icon: AcademicCapIcon, label: 'Academic Reports', href: '/dashboard/manager/academic-reports' },
    { icon: BuildingLibraryIcon, label: 'Departments', href: '/dashboard/manager/departments' },
  ],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = pathname.split('/')[2] as keyof typeof menuItems;
  const currentMenuItems = menuItems[role] || [];

  const roleTitle = {
    principal: 'Principal',
    bursar: 'Bursar',
    'discipline-master': 'Discipline Master',
    hod: 'Head of Department',
    supermanager: 'Super Manager',
    teacher: 'Teacher',
    parentstudent: 'Parent/Student',
    guidancecounselor: 'Guidance Counselor',
  }[role];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-semibold text-gray-800">
                School Management System
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
              <button 
                onClick={() => router.push('/')}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar and Main Content */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed w-64 h-[calc(100vh-4rem)] bg-white shadow-sm border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">{roleTitle} Dashboard</h2>
          </div>
          <nav className="p-4 space-y-1">
            {currentMenuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-2.5 text-sm font-medium rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-8">
          <Fade>
            {children}
          </Fade>
        </main>
      </div>
    </div>
  );
} 