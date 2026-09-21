'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
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
  ArrowRightOnRectangleIcon,
  ClipboardDocumentCheckIcon,
  BuildingLibraryIcon,
  Bars3Icon,
  ArchiveBoxIcon,
  XMarkIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UsersIcon,
  MegaphoneIcon,
  ChevronUpDownIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ClockIcon,
  BanknotesIcon,
  ReceiptRefundIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Fade, PullToRefresh, LanguageSwitcher } from '@/components/ui';
import { Toaster, toast } from 'react-hot-toast';
import Image from 'next/image';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import NotificationIndicator from '@/components/messaging/NotificationIndicator';
import ChatIndicator from '@/components/chat/ChatIndicator';
import { menuItems, type MenuItem } from '@/lib/roleMenus';


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

// Dashboard sections that belong to every role rather than to one, so their
// first path segment is a page name and not a role.
const SHARED_SECTIONS = ['settings', 'leave-and-loans'];

const formatRoleForURL = (role: string | undefined | null): string => {
  if (!role) return '';

  // Handle parent and student roles mapping to same dashboard
  if (role === 'PARENT' || role === 'STUDENT') {
    return 'parent-student';
  }

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
  const { t } = useLanguage();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Desktop sidebar collapsed (icon rail) state, persisted across sessions
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem('sidebar-collapsed') === 'true') {
        setIsSidebarCollapsed(true);
      }
    } catch { /* ignore */ }
  }, []);
  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => {
      try { localStorage.setItem('sidebar-collapsed', String(!prev)); } catch { /* ignore */ }
      return !prev;
    });
  };

  // State to manage open submenus { [href]: boolean }
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});

  // --- Auth Context ---
  const {
    user,
    selectedRole,
    availableRoles,
    isAuthenticated,
    isLoading,
    logout,
    selectRole,
    requiresAcademicYear,
    selectedAcademicYear,
    selectAcademicYear,
  } = useAuth();

  // --- Academic Years for sidebar selector ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allAcademicYears, setAllAcademicYears] = useState<any[]>([]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/academic-years`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(json => setAllAcademicYears(json.data || []))
      .catch(() => { /* silent */ });
  }, [isAuthenticated]);

  // --- Get Role from URL Path ---
  // Use useMemo to avoid recalculating on every render unless pathname changes
  const roleFromPath = useMemo(() => {
    const pathSegments = pathname.split('/');
    const segment = pathSegments.length > 2 ? pathSegments[2] : null;
    if (segment && SHARED_SECTIONS.includes(segment)) {
      // Keep the signed-in role's menu and skip the role-mismatch redirect.
      return selectedRole ? formatRoleForURL(selectedRole) : null;
    }
    return segment;
  }, [pathname, selectedRole]);

  // --- Effect to validate authentication and redirect if needed ---
  useEffect(() => {
    console.log('Layout useEffect running:');
    console.log('  isLoading:', isLoading);
    console.log('  isAuthenticated:', isAuthenticated);
    console.log('  selectedRole:', selectedRole);
    console.log('  roleFromPath:', roleFromPath);
    console.log('  pathname:', pathname);
    console.log('  requiresAcademicYear(selectedRole):', selectedRole ? requiresAcademicYear(selectedRole) : 'N/A');

    if (!isLoading && !isAuthenticated) {
      toast.error("Not authenticated. Redirecting to login.");
      router.push('/'); // Redirect to login if not authenticated
      return;
    }

    if (!isLoading && isAuthenticated) {
      if (selectedRole && requiresAcademicYear(selectedRole) && !selectedAcademicYear) {
        // If an academic year is required but not selected, always redirect to root
        if (pathname !== '/') {
          console.log(`Redirecting to / for academic year selection for role: ${selectedRole}`);
          router.push('/');
        }
        return; // Important: Stop further checks if academic year selection is pending
      }

      // Proceed with normal role-based dashboard redirection only if academic year is NOT required or already selected
      if (selectedRole) {
        const formattedSelectedRole = formatRoleForURL(selectedRole);
        if (roleFromPath && roleFromPath !== formattedSelectedRole && !pathname.startsWith(`/dashboard/${formattedSelectedRole}`)) {
          console.warn(`Initial path ${pathname} doesn't match selected role ${formattedSelectedRole}. Redirecting.`);
          router.push(`/dashboard/${formattedSelectedRole}`);
        }
      }
    }

  }, [isLoading, isAuthenticated, selectedRole, roleFromPath, pathname, router, requiresAcademicYear, selectedAcademicYear]);

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
    'senior-discipline-master': 'Senior Discipline Master',
    'dean-of-discipline': 'Dean of Discipline',
    'dean-of-studies': 'Dean of Studies',
    'fee-auditor': 'Fee Auditor',
    secretary: 'Secretary',
    nurse: 'Nurse',
    hod: 'Head of Department',
    'super-manager': 'Super Manager',
    teacher: 'Teacher',
    'parent-student': 'Parent/Student',
    guidancecounselor: 'Guidance Counselor',
    manager: 'Manager',
    'vice-principal': 'Vice Principal',
    controller: 'Controller'
  };

  const toggleSubmenu = (href: string) => {
    setOpenSubmenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  // --- Handle Role Change from Dropdown ---
  const handleRoleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value; // e.g., "TEACHER"
    console.log('Role change initiated. New role:', newRole);
    if (newRole && newRole !== selectedRole) {
      try {
        console.log('Attempting to select new role:', newRole);
        await selectRole(newRole);
        console.log('Role selected in AuthContext. Checking if academic year is required...');
        // Check if the newly selected role requires an academic year
        const academicYearNeeded = requiresAcademicYear(newRole);
        console.log('Academic year needed for', newRole, ':', academicYearNeeded);

        if (academicYearNeeded) {
          // If it does, redirect to the root path to trigger academic year selection
          console.log('Redirecting to / for academic year selection.');
          router.push('/');
        } else {
          // If it doesn't, redirect directly to the new role's dashboard
          const DASHBOARD_ROUTES: Record<string, string> = {
            'SUPER_MANAGER': '/dashboard/super-manager',
            'PRINCIPAL': '/dashboard/principal',
            'VICE_PRINCIPAL': '/dashboard/vice-principal',
            'TEACHER': '/dashboard/teacher',
            'HOD': '/dashboard/hod',
            'BURSAR': '/dashboard/bursar',
            'DISCIPLINE_MASTER': '/dashboard/discipline-master',
            'SENIOR_DISCIPLINE_MASTER': '/dashboard/senior-discipline-master',
            'DEAN_OF_DISCIPLINE': '/dashboard/dean-of-discipline',
            'DEAN_OF_STUDIES': '/dashboard/dean-of-studies',
            'GUIDANCE_COUNSELOR': '/dashboard/guidance-counselor',
            'FEE_AUDITOR': '/dashboard/fee-auditor',
            'SECRETARY': '/dashboard/secretary',
            'NURSE': '/dashboard/nurse',
            'PARENT': '/dashboard/parent-student',
            'STUDENT': '/dashboard/parent-student',
            'MANAGER': '/dashboard/manager',
            'CONTROLLER': '/dashboard/controller',
          };
          const redirectPath = DASHBOARD_ROUTES[newRole] || '/dashboard';
          console.log('Academic year not needed. Redirecting to:', redirectPath);
          router.push(redirectPath);
        }
      } catch (error) {
        console.error('Error during role change:', error);
        toast.error('Failed to change role.');
      }
    }
  };

  // --- Handle Logout ---
  const handleLogout = () => {
    console.log("Logout button clicked. Attempting logout..."); // Log start
    try {
      logout(); // Use the logout function from auth context
      console.log("Logout successful."); // Log after logout
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("An error occurred during logout. Please try again.");
    }
  };

  // --- Active-link helper ---
  // The role root ("Menu") only matches exactly; every other entry is active on
  // its own page and any nested page under it.
  const roleRootHref = roleFromPath ? `/dashboard/${roleFromPath}` : '';
  const isLinkActive = (href: string) =>
    href === roleRootHref
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  // --- Sidebar Component Logic (with Role Switcher and Logout) ---
  // `collapsed` renders the desktop icon rail; mobile always renders expanded.
  const renderSidebar = (collapsed: boolean, isDesktop: boolean) => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center border-b border-gray-200 ${collapsed ? 'justify-center px-2 py-3' : 'justify-between px-4 py-3'}`}>
        {!collapsed && (
          <h2 className="text-base font-semibold text-gray-800 truncate">
            {roleFromPath ? t(roleTitle[roleFromPath] || formatRoleName(roleFromPath)) : t('Dashboard')}
          </h2>
        )}
        {isDesktop && (
          <button
            onClick={toggleSidebarCollapsed}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={collapsed ? t('Expand sidebar') : t('Collapse sidebar')}
            aria-label={collapsed ? t('Expand sidebar') : t('Collapse sidebar')}
          >
            {collapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Main navigation */}
      <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {currentMenuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isSubmenuOpen = openSubmenus[item.href] || false;
          const isParentActive = isLinkActive(item.href)
            || (hasSubItems && item.subItems!.some(sub => isLinkActive(sub.href)));

          const activeClasses = 'bg-blue-50 text-blue-700 font-semibold';
          const inactiveClasses = 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';
          const iconClasses = isParentActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600';
          const accentBar = isParentActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-600" aria-hidden="true" />
          );

          if (collapsed) {
            // Icon rail: parents with submenus expand the sidebar and open their submenu.
            return hasSubItems ? (
              <button
                key={item.href}
                onClick={() => {
                  toggleSidebarCollapsed();
                  setOpenSubmenus(prev => ({ ...prev, [item.href]: true }));
                }}
                className={`relative flex items-center justify-center w-full p-2.5 rounded-lg transition-colors duration-200 group ${isParentActive ? activeClasses : inactiveClasses}`}
                title={t(item.label)}
                aria-label={t(item.label)}
              >
                {accentBar}
                <item.icon className={`h-5 w-5 flex-shrink-0 ${iconClasses}`} />
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-center p-2.5 rounded-lg transition-colors duration-200 group ${isParentActive ? activeClasses : inactiveClasses}`}
                title={t(item.label)}
                aria-label={t(item.label)}
              >
                {accentBar}
                <item.icon className={`h-5 w-5 flex-shrink-0 ${iconClasses}`} />
              </Link>
            );
          }

          return (
            <div key={item.href}>
              {hasSubItems && item.navigates ? (
                /* Parent that navigates to its own page; the chevron toggles the submenu */
                <div className={`relative flex items-center w-full rounded-lg transition-colors duration-200 group ${isParentActive ? activeClasses : inactiveClasses}`}>
                  {accentBar}
                  <Link
                    href={item.href}
                    onClick={() => {
                      setIsMobileSidebarOpen(false);
                      setOpenSubmenus(prev => ({ ...prev, [item.href]: true }));
                    }}
                    className="flex items-center flex-1 min-w-0 px-3 py-2 text-sm font-medium"
                  >
                    <item.icon className={`h-5 w-5 mr-3 flex-shrink-0 ${iconClasses}`} />
                    <span className="truncate">{t(item.label)}</span>
                  </Link>
                  <button
                    onClick={() => toggleSubmenu(item.href)}
                    className="p-2 mr-1 rounded hover:bg-gray-100"
                    aria-label={`Toggle ${t(item.label)} submenu`}
                  >
                    <ChevronRightIcon
                      className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`}
                    />
                  </button>
                </div>
              ) : hasSubItems ? (
                <button
                  onClick={() => toggleSubmenu(item.href)}
                  className={`relative flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg text-left transition-colors duration-200 group ${isParentActive ? activeClasses : inactiveClasses}`}
                >
                  {accentBar}
                  <span className="flex items-center min-w-0">
                    <item.icon className={`h-5 w-5 mr-3 flex-shrink-0 ${iconClasses}`} />
                    <span className="truncate">{t(item.label)}</span>
                  </span>
                  <ChevronRightIcon
                    className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`relative flex items-center px-3 py-2 text-sm font-medium rounded-lg group transition-colors duration-200 ${isParentActive ? activeClasses : inactiveClasses}`}
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  {accentBar}
                  <item.icon className={`h-5 w-5 mr-3 flex-shrink-0 ${iconClasses}`} />
                  <span className="truncate">{t(item.label)}</span>
                </Link>
              )}

              {/* Render Submenu Items if open */}
              {hasSubItems && isSubmenuOpen && (
                <div className="mt-0.5 ml-5 pl-3 border-l border-gray-200 space-y-0.5">
                  {item.subItems!.map((subItem) => {
                    const isSubItemActive = isLinkActive(subItem.href);
                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={`
                          flex items-center px-3 py-1.5 text-sm rounded-md group
                          transition-colors duration-200
                          ${isSubItemActive
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                        onClick={() => setIsMobileSidebarOpen(false)}
                      >
                        <span className="truncate">{t(subItem.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Role Switcher and Logout Section — shrink-0 keeps it visible however long the menu is */}
      <div className={`mt-auto shrink-0 border-t border-gray-200 ${collapsed ? 'p-2 space-y-2' : 'p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]'}`}>
        {!collapsed && availableRoles.length > 1 && !isLoading && (
          <div className="relative">
            <label htmlFor="role-switcher" className="block text-xs font-medium text-gray-500 mb-1">
              {t('Switch Role')}
            </label>
            <select
              id="role-switcher"
              value={selectedRole || ''}
              onChange={handleRoleChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
            >
              {availableRoles.map(roleValue => (
                <option key={roleValue} value={roleValue}>
                  {t(formatRoleName(roleValue))}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700">
              <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        )}
        {!collapsed && isLoading && availableRoles.length <= 1 && (
          <div className="text-xs text-gray-400">{t('Loading roles...')}</div>
        )}

        {/* Academic Year Selector */}
        {!collapsed && allAcademicYears.length > 1 && (
          <div className="relative">
            <label htmlFor="academic-year-switcher" className="block text-xs font-medium text-gray-500 mb-1">
              {t('Academic Year')}
            </label>
            <select
              id="academic-year-switcher"
              value={selectedAcademicYear?.id ?? ''}
              onChange={e => {
                const yr = allAcademicYears.find(y => y.id === parseInt(e.target.value));
                if (yr) selectAcademicYear(yr);
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md appearance-none"
            >
              <option value="">{t('Select Year')}</option>
              {allAcademicYears.map(yr => (
                <option key={yr.id} value={yr.id}>{yr.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700">
              <ChevronUpDownIcon className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Settings — shared by every role, so it lives here rather than in
            each role's menu array. */}
        <Link
          href="/dashboard/settings"
          onClick={() => setIsMobileSidebarOpen(false)}
          className={`w-full flex items-center justify-center py-2 mb-2 text-sm font-medium rounded-lg group transition-colors duration-200 ${pathname === '/dashboard/settings'
            ? 'text-blue-700 bg-blue-50'
            : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
            } ${collapsed ? 'px-2' : 'px-4'}`}
          title={t('Settings')}
          aria-label={t('Settings')}
        >
          <Cog6ToothIcon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && t('Settings')}
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg group transition-colors duration-200 ${collapsed ? 'px-2' : 'px-4'}`}
          title={t('Logout')}
          aria-label={t('Logout')}
        >
          <ArrowRightOnRectangleIcon className={`h-5 w-5 text-red-600 group-hover:text-red-700 ${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && t('Logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <PullToRefresh />
      {/* *** Add Toaster Component here *** */}
      {/* Position can be adjusted, see react-hot-toast docs */}
      <Toaster
        position="top-right"
        containerStyle={{ top: 'calc(var(--safe-top) + 1rem)' }}
        toastOptions={{ duration: 4000 }}
      />

      {/* Top Navigation Bar — padded clear of the device status/notification bar */}
      <nav
        className="bg-white shadow-sm fixed w-full z-30"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
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
                <span className="ml-3 text-xl font-semibold text-blue-900 hidden sm:inline"> {/* Dark blue text, hidden on mobile */}
                  St. Stephen&apos;s International College
                </span>
              </div>
            </div>
            {/* Chat + Notification Indicators + Language Switcher */}
            <div className="flex items-center gap-2">
              <ChatIndicator className="mr-1" />
              {/* Bell opens its own notifications panel (works for every role) */}
              <NotificationIndicator className="mr-2" />
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar and Main Content */}
      <div className="flex" style={{ paddingTop: 'var(--app-header-height)' }}>
        {/* Desktop Sidebar (Fixed) - Hidden below lg */}
        <aside
          className={`fixed bottom-0 hidden lg:flex lg:flex-col bg-white shadow-sm border-r border-gray-200 transition-[width] duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}
          style={{ top: 'var(--app-header-height)' }}
        >
          {renderSidebar(isSidebarCollapsed, true)}
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
            {/* Anchored to the bar's bottom edge, not 100vh, so the footer stays
                above mobile browser toolbars and clear of the status bar. */}
            <aside
              className="fixed bottom-0 left-0 flex flex-col w-64 bg-white shadow-lg border-r border-gray-200 z-50 lg:hidden"
              style={{ top: 'var(--app-header-height)' }}
            >
              {renderSidebar(false, false)}
            </aside>
          </>
        )}

        {/* Main Content Area - Adjust margin based on desktop sidebar visibility */}
        {/* min-w-0 stops wide content (tables) from stretching the page; wide content scrolls in its own overflow-x-auto wrapper, not here */}
        <main className={`flex-1 min-w-0 max-w-full pt-8 px-4 sm:px-8 pb-8 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
          {children}
        </main>

      </div>
    </div>
  );
}