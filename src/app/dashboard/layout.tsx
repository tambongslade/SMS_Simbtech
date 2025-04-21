'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  HomeIcon, 
  UserGroupIcon, 
  BellIcon, 
  DocumentChartBarIcon,
  BookOpenIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  CalendarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UsersIcon,
  MegaphoneIcon,
  ChevronUpDownIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { Fade } from '@/components/ui';
import { Toaster, toast } from 'react-hot-toast';
import Image from 'next/image';

// Define type for a menu item - Added subItems
interface MenuItem {
  icon: React.ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & { title?: string | undefined; titleId?: string | undefined; } & React.RefAttributes<SVGSVGElement>>;
  label: string;
  href: string;
  subItems?: MenuItem[]; // Optional array for sub-menu items
}

// Corrected type definition for the final menuItems object
type MenuItemsStructure = {
  principal: MenuItem[];
  bursar: MenuItem[];
  'discipline-master': MenuItem[];
  hod: MenuItem[];
  parentstudent: MenuItem[];
  'super-manager': MenuItem[];
  guidancecounselor: MenuItem[];
  teacher: MenuItem[];
  'vice-principal': MenuItem[];
  manager: MenuItem[];
};

// Original menu items structure with corrected type
const menuItems: MenuItemsStructure = {
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
    { icon: ClockIcon, label: 'Lateness', href: '/dashboard/discipline-master/lateness' },
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
  'super-manager': [
    { label: 'Dashboard', href: '/dashboard/super-manager', icon: HomeIcon },
    { label: 'Personnel Management', href: '/dashboard/super-manager/personnel-management', icon: UserGroupIcon, subItems: [
      { label: 'All Personnel', href: '/dashboard/super-manager/personnel-management', icon: ChevronRightIcon},
      { label: 'Vice Principals', href: '/dashboard/super-manager/vice-principal-management', icon: ChevronRightIcon },
      { label: 'Discipline Masters', href: '/dashboard/super-manager/discipline-master-management', icon: ChevronRightIcon },
      { label: 'Teachers', href: '/dashboard/super-manager/teacher-management', icon: ChevronRightIcon },
      { label: 'Bursars', href: '/dashboard/super-manager/bursar-management', icon: ChevronRightIcon },
      { label: 'Guidance Counselors', href: '/dashboard/super-manager/guidance-counselor-management', icon: ChevronRightIcon },
    ]},
    { label: 'Classes & Subclasses', href: '/dashboard/super-manager/classes', icon: BuildingLibraryIcon },
    { label: 'Student Management', href: '/dashboard/super-manager/student-management', icon: UsersIcon },
    { label: 'Subject Management', href: '/dashboard/super-manager/subject-management', icon: BookOpenIcon },
    { label: 'Fees Management', href: '/dashboard/super-manager/fees-management', icon: CurrencyDollarIcon },
    { label: 'Examination Structure', href: '/dashboard/super-manager/examination-structure', icon: CalendarDaysIcon },
    { label: 'Marks Management', href: '/dashboard/super-manager/marks-management', icon: ClipboardDocumentCheckIcon },
    { label: 'Report Card Generation', href: '/dashboard/super-manager/report-card-generation', icon: DocumentChartBarIcon },
    { label: 'Academic Year', href: '/dashboard/super-manager/academic-years', icon: CalendarIcon },
    { label: 'Timetable Management', href: '/dashboard/super-manager/timetable', icon: CalendarIcon },
    { label: 'Communication', href: '/dashboard/super-manager/communication', icon: MegaphoneIcon },
    { label: 'Settings', href: '/dashboard/super-manager/settings', icon: Cog6ToothIcon },
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
  'vice-principal': [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/vice-principal' },
    { icon: AcademicCapIcon, label: 'Classes', href: '/dashboard/vice-principal/classes' },
    { icon: ClipboardDocumentCheckIcon, label: 'Subjects', href: '/dashboard/vice-principal/subjects' },
    { icon: UserGroupIcon, label: 'Teachers', href: '/dashboard/vice-principal/teachers' },
    { icon: UserGroupIcon, label: 'Interviews', href: '/dashboard/vice-principal/interviews' },
    { icon: CalendarIcon, label: 'Timetable', href: '/dashboard/vice-principal/timetable' },
    { icon: DocumentChartBarIcon, label: 'Report Card Management', href: '/dashboard/vice-principal/report-card-management' },
  ],
  manager: [
    { icon: HomeIcon, label: 'Overview', href: '/dashboard/manager' },
    { icon: DocumentChartBarIcon, label: 'Financial Reports', href: '/dashboard/manager/financial-reports' },
    { icon: AcademicCapIcon, label: 'Academic Reports', href: '/dashboard/manager/academic-reports' },
    { icon: BuildingLibraryIcon, label: 'Departments', href: '/dashboard/manager/departments' },
  ],
};

// Helper function to format role names
const formatRoleName = (role: string | undefined | null): string => {
  if (!role) return '';
  return role
    .toLowerCase()
    .replace(/_/g, '-')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatRoleForURL = (role: string | undefined | null): string => {
  if (!role) return '';
  return role.toLowerCase().replace(/_/g, '-');
};

// --- Dashboard Layout Component ---
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // State to manage open submenus { [href]: boolean }
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});

  // --- State for Role Switching ---
  const [userRoleFromStorage, setUserRoleFromStorage] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>(''); // Stores the role selected in the dropdown (e.g., 'SUPER_MANAGER')
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  // --- Get Role from URL Path ---
  // Use useMemo to avoid recalculating on every render unless pathname changes
  const roleFromPath = useMemo(() => {
      const pathSegments = pathname.split('/');
      return pathSegments.length > 2 ? pathSegments[2] : null;
  }, [pathname]);

  // --- Effect to load roles from localStorage and validate initial path ---
  useEffect(() => {
    const storedRole = localStorage.getItem('userRole'); // e.g., "SUPER_MANAGER"
    const storedRolesList = localStorage.getItem('userRolesList'); // e.g., '["SUPER_MANAGER", "TEACHER"]'
    
    if (!storedRole) {
      toast.error("Not authenticated. Redirecting to login.");
      router.push('/'); // Redirect to login if no primary role found
      return;
    }
    
    setUserRoleFromStorage(storedRole);
    setSelectedRole(storedRole); // Initialize dropdown selection

    let parsedRoles: string[] = [];
    if (storedRolesList) {
      try {
        parsedRoles = JSON.parse(storedRolesList);
        if (!Array.isArray(parsedRoles)) {
          parsedRoles = [storedRole]; // Fallback if parse result isn't an array
          console.warn('userRolesList in localStorage was not an array. Falling back to primary role.');
        }
      } catch (error) {
        console.error('Failed to parse userRolesList from localStorage:', error);
        parsedRoles = [storedRole]; // Fallback on JSON parse error
      }
    } else {
        parsedRoles = [storedRole]; // Fallback if list doesn't exist
        console.warn('userRolesList not found in localStorage. Only showing primary role.');
    }
    setAvailableRoles(parsedRoles);
    setIsLoadingRoles(false);

    // Validate initial path against the stored primary role (run only once after roles loaded)
    const formattedStoredRole = formatRoleForURL(storedRole);
    if (roleFromPath && roleFromPath !== formattedStoredRole && !pathname.startsWith(`/dashboard/${formattedStoredRole}`)) {
        console.warn(`Initial path ${pathname} doesn't match stored role ${formattedStoredRole}. Redirecting.`);
        router.push(`/dashboard/${formattedStoredRole}`);
    }

  }, [router]); // Run once on mount

  // --- Effect to manage sidebar state based on path ---
  useEffect(() => {
    // Close mobile sidebar on route change
    setIsMobileSidebarOpen(false);

    // Determine current menu based on role from URL path
    const currentMenuItems = roleFromPath && menuItems[roleFromPath as keyof typeof menuItems] 
                           ? menuItems[roleFromPath as keyof typeof menuItems] 
                           : [];

    // Pre-open submenu if the current path is within it
    const initiallyOpen: { [key: string]: boolean } = {};
    currentMenuItems.forEach(item => {
      if (item.subItems && item.subItems.some(subItem => pathname.startsWith(subItem.href))) {
        initiallyOpen[item.href] = true;
      }
    });
    setOpenSubmenus(initiallyOpen);

  }, [pathname, roleFromPath]); // Re-run when pathname changes

  // --- Get Menu Items based on Role from Path ---
  const currentMenuItems = useMemo(() => {
      return roleFromPath && menuItems[roleFromPath as keyof typeof menuItems] 
             ? menuItems[roleFromPath as keyof typeof menuItems] 
             : [];
  }, [roleFromPath]);

  // Map role keys (like 'discipline-master') to display titles
  const roleTitle: { [key: string]: string } = {
    principal: 'Principal',
    bursar: 'Bursar',
    'discipline-master': 'Discipline Master',
    hod: 'Head of Department',
    'super-manager': 'Super Manager',
    teacher: 'Teacher',
    parentstudent: 'Parent/Student',
    guidancecounselor: 'Guidance Counselor',
    manager: 'Manager',
    'vice-principal': 'Vice Principal'
  };

  const toggleSubmenu = (href: string) => {
    setOpenSubmenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  // --- Handle Role Change from Dropdown ---
  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value; // e.g., "TEACHER"
    if (newRole && newRole !== selectedRole) {
        setSelectedRole(newRole);
        localStorage.setItem('userRole', newRole); // Update active role in storage
        const formattedNewRole = formatRoleForURL(newRole);
        router.push(`/dashboard/${formattedNewRole}`); // Navigate to new role's dashboard
    }
  };

  // --- Handle Logout ---
  const handleLogout = () => {
    console.log("Logout button clicked. Attempting logout..."); // Log start
    try {
        // Clear relevant local storage items
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userRolesList');
        localStorage.removeItem('userData'); // Assuming user data is stored
        console.log("Local storage cleared."); // Log after clearing
        
        toast.success('Logged out successfully.');
        
        console.log("Attempting redirect to /"); // Log before push
        router.push('/'); // Redirect to login page
        console.log("Redirect command issued."); // Log after push
    } catch (error) {
        console.error("Error during logout:", error);
        toast.error("An error occurred during logout.");
    }
  };

  // --- Sidebar Component Logic (with Role Switcher and Logout) ---
  const SidebarContent = (
    <div className="flex flex-col h-full"> {/* Make sidebar flex column */}
      <div className="p-4 border-b border-gray-200">
        {/* Use role from path for the title */}
        <h2 className="text-lg font-medium text-gray-800">
          {roleFromPath ? roleTitle[roleFromPath] || formatRoleName(roleFromPath) : 'Dashboard'}
        </h2>
      </div>
      {/* Main navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {currentMenuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isSubmenuOpen = openSubmenus[item.href] || false;
          const isParentActive = pathname === item.href || (hasSubItems && item.subItems?.some(sub => pathname.startsWith(sub.href)));
          
          return (
            <div key={item.href}>
              {hasSubItems ? (
                <button
                  onClick={() => toggleSubmenu(item.href)}
                  className={`
                    flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium rounded-lg text-left
                    transition-colors duration-200 group
                    ${isParentActive
                      ? 'bg-blue-100 text-blue-800' // Active style for parent (Dark Blue)
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900' // Inactive style
                    }
                  `}
                >
                  <span className="flex items-center">
                    <item.icon 
                      className={`h-5 w-5 mr-3 flex-shrink-0 ${isParentActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}`} 
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isSubmenuOpen ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-4 py-2.5 text-sm font-medium rounded-lg group
                    transition-colors duration-200
                    ${pathname === item.href
                      ? 'bg-blue-100 text-blue-800' // Active style (Dark Blue)
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900' // Inactive style
                    }
                  `}
                  onClick={() => setIsMobileSidebarOpen(false)} // Close mobile on navigation
                >
                  <item.icon 
                    className={`h-5 w-5 mr-3 flex-shrink-0 ${pathname === item.href ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}`} 
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              )}

              {/* Render Submenu Items if open */} 
              {hasSubItems && isSubmenuOpen && (
                 <div className="mt-1 ml-5 pl-4 border-l border-gray-200 space-y-1">
                  {item.subItems?.map((subItem) => {
                    const isSubItemActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/'); // Active if path matches exactly or starts with it
                     return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`
                          flex items-center px-4 py-2 text-sm font-medium rounded-lg group
                          transition-colors duration-200
                          ${isSubItemActive
                            ? 'bg-blue-100 text-blue-800' // Active style for sub-item (Dark Blue)
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' // Inactive style for sub-item
                          }
                        `}
                         onClick={() => setIsMobileSidebarOpen(false)} // Close mobile on navigation
                      >
                         {/* Optional: Add icon for sub-items if needed, or just text */}
                         {/* <subItem.icon className={`h-4 w-4 mr-2 flex-shrink-0 ${isSubItemActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}`} /> */} 
                         <span className="truncate">{subItem.label}</span>
                      </Link>
                     );
                  })}
                 </div>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* Role Switcher and Logout Section */}
      <div className="p-4 mt-auto border-t border-gray-200 space-y-4">
        {/* Role Switcher */}
        {availableRoles.length > 1 && !isLoadingRoles && (
            <div className="relative">
                <label htmlFor="role-switcher" className="block text-xs font-medium text-gray-500 mb-1">
                    Switch Role
                </label>
                <select
                    id="role-switcher"
                    value={selectedRole}
                    onChange={handleRoleChange}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none" // Changed focus ring to blue-500
                >
                    {availableRoles.map(roleValue => (
                        <option key={roleValue} value={roleValue}>
                            {formatRoleName(roleValue)} 
                        </option>
                    ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700"> 
                    <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
                </div>
            </div>
        )}
         {isLoadingRoles && availableRoles.length <= 1 && (
           <div className="text-xs text-gray-400">Loading roles...</div> // Placeholder while loading
         )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg group transition-colors duration-200" // Use Red colors
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 text-red-600 group-hover:text-red-700" /> {/* Use Red colors */}
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* *** Add Toaster Component here *** */}
      {/* Position can be adjusted, see react-hot-toast docs */}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm fixed w-full z-30">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
               {/* Hamburger Menu Button - Visible on smaller screens (e.g., below lg) */}
               <button
                 onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                 className="mr-2 p-2 text-gray-500 hover:text-gray-700 lg:hidden" // Hidden on lg screens and up
               >
                 {isMobileSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
               </button>
              {/* Logo and School Name */}
              <div className="flex items-center flex-shrink-0">
                 {/* Assume logo is in /public/logo.png or similar */}
                 <Image
                    src="/logo.png" // Adjust path if needed
                    alt="SSIC Logo"
                    width={40} // Adjust width as needed
                    height={40} // Adjust height as needed
                    className="h-10 w-auto" // Tailwind class for height
                  />
                 <span className="ml-3 text-xl font-semibold text-blue-900"> {/* Dark blue text */}
                    St Stephens International College
                 </span>
              </div>
            </div>
            {/* Removed settings/logout icons from top bar */}
          </div>
        </div>
      </nav>

      {/* Sidebar and Main Content */}
      <div className="flex pt-16">
        {/* Desktop Sidebar (Fixed) - Hidden below lg */}
        <aside className="fixed hidden lg:flex lg:flex-col w-64 h-[calc(100vh-4rem)] bg-white shadow-sm border-r border-gray-200">
          {SidebarContent}
        </aside>

        {/* Mobile Sidebar (Slide-in) - Conditional rendering */}
         {isMobileSidebarOpen && (
           <>
             {/* Overlay for mobile */}
             <div
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              />
             {/* Mobile Sidebar Content */}
             <aside className="fixed flex flex-col w-64 h-[calc(100vh-4rem)] bg-white shadow-lg border-r border-gray-200 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}">
                {SidebarContent}
              </aside>
           </>
         )}

        {/* Main Content Area - Adjust margin based on desktop sidebar visibility */}
        <main className={`flex-1 pt-8 px-4 sm:px-8 pb-8 lg:ml-64 transition-all duration-300 ease-in-out`}>
            {children}
        </main>

      </div>
    </div>
  );
} 