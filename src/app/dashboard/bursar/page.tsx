'use client';

import React, { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CalculatorIcon,
  ClockIcon,
  ExclamationCircleIcon,
  DocumentChartBarIcon,
  EnvelopeIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button, Badge } from '@/components/ui';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- Helper Functions ---
const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    // Attempt to show only date part
    return new Date(dateString).toLocaleDateString('en-GB');
  } catch (e) {
    return 'Invalid Date';
  }
};

// --- Types ---
// Based on GET /fees and GET /communications/announcements
type AcademicYear = { id: number; name: string; is_active?: boolean };

type PaymentTransaction = {
  id: number;
  amount: number;
  paymentDate: string;
  receiptNumber: string | null;
  paymentMethod: string;
  feeId?: number; // Assuming feeId might be present
};

type FeeRecord = {
  id: number;
  amountExpected: number;
  amountPaid: number;
  dueDate: string | null;
  academicYearId?: number;
  enrollment?: {
    student?: { id: number; name: string; matricule?: string };
    subClass?: { id: number; name: string; class?: { id: number; name: string } };
  };
  paymentTransactions?: PaymentTransaction[]; // Optional based on if GET /fees includes them
};

// Calculated stats
interface BursarStats {
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  collectionRate: number; // Percentage
}

// For displaying stats cards
interface DisplayStat {
  title: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: { value: number; isUpward: boolean }; // Optional trend
  color: 'success' | 'danger' | 'primary' | 'warning';
}

// Combined type for recent transactions display
interface DisplayTransaction {
  id: number; // Payment Transaction ID
  student: string;
  amount: string;
  date: string;
  receiptNumber: string | null;
  paymentMethod: string;
}

type Announcement = {
  id: number;
  title: string;
  message: string;
  audience: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
  createdAt: string;
};

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'success' | 'primary' | 'secondary' | 'warning';
  href?: string;
}

// --- Main Component ---
export default function BursarDashboard() {
  const [stats, setStats] = useState<BursarStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<DisplayTransaction[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<AcademicYear | null>(null);

  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching --- //
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        toast.error("Authentication required.");
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }
      const headers = { 'Authorization': `Bearer ${token}` };

      let currentYear: AcademicYear | null = null;

      try {
        // 1. Fetch Academic Years to find the current one
        const yearsResponse = await fetch(`${API_BASE_URL}/academic-years`, { headers });
        if (!yearsResponse.ok) throw new Error('Failed to fetch academic years');
        const yearsData = await yearsResponse.json();
        currentYear = (yearsData.data || []).find((y: AcademicYear) => y.is_active) || yearsData.data?.[0] || null;
        setCurrentAcademicYear(currentYear);

        if (!currentYear) {
          throw new Error("No academic year found.");
        }

        // 2. Fetch All Fees for the current year
        // Note: Fetching ALL fees might be slow. A summary endpoint is preferable.
        const feesResponse = await fetch(`${API_BASE_URL}/fees?academic_year_id=${currentYear.id}`, { headers });
        if (!feesResponse.ok && feesResponse.status !== 404) { // Allow 404 if no fees yet
          throw new Error(`Failed to fetch fees: ${feesResponse.statusText}`);
        }
        const feesData = feesResponse.ok ? await feesResponse.json() : { data: [] };
        const allFees: FeeRecord[] = feesData.data || [];

        // 3. Calculate Stats from fetched fees
        let totalExpected = 0;
        let totalPaid = 0;
        const allTransactions: PaymentTransaction[] = [];

        allFees.forEach(fee => {
          totalExpected += fee.amountExpected || 0;
          totalPaid += fee.amountPaid || 0;
          // Assuming GET /fees includes paymentTransactions - if not, this needs adjustment
          if (fee.paymentTransactions && Array.isArray(fee.paymentTransactions)) {
            fee.paymentTransactions.forEach(tx => allTransactions.push({ ...tx, feeId: fee.id })); // Add feeId for context
          }
        });

        const totalOutstanding = totalExpected - totalPaid;
        const collectionRate = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

        setStats({
          totalExpected,
          totalPaid,
          totalOutstanding,
          collectionRate
        });

        // 4. Process Recent Transactions
        allTransactions.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        const latestTransactions = allTransactions.slice(0, 5);

        // Map to DisplayTransaction format (needs student name from the fee record)
        const displayTxs = latestTransactions.map(tx => {
          // Find the parent fee record to get student name
          const parentFee = allFees.find(f => f.id === tx.feeId);
          const studentName = parentFee?.enrollment?.student?.name || 'Unknown Student';
          return {
            id: tx.id,
            student: studentName,
            amount: formatCurrency(tx.amount),
            date: formatDate(tx.paymentDate),
            receiptNumber: tx.receiptNumber,
            paymentMethod: tx.paymentMethod,
          };
        });
        setRecentTransactions(displayTxs);

        // 5. Fetch Announcements (Filter by audience in the request)
        const annResponse = await fetch(`${API_BASE_URL}/communications/announcements?limit=5&audience=INTERNAL,BOTH&sort=createdAt:desc`, { headers });
        if (!annResponse.ok) {
          console.error("Failed to fetch announcements, but continuing...");
          // Don't throw error for announcements, just log and show empty
          toast.error('Could not load recent announcements.');
          setAnnouncements([]);
        } else {
          const annData = await annResponse.json();
          setAnnouncements((annData.data || []));
        }

      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || 'Failed to load dashboard data.');
        toast.error(err.message || 'Failed to load dashboard data.');
        // Clear potentially partial data
        setStats(null);
        setRecentTransactions([]);
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- Prepare Display Data --- //

  const displayStats: DisplayStat[] = !stats ? [] : [
    { title: 'Total Collections', value: formatCurrency(stats.totalPaid), icon: BanknotesIcon, color: 'success' },
    { title: 'Outstanding Fees', value: formatCurrency(stats.totalOutstanding), icon: ExclamationCircleIcon, color: 'danger' },
    { title: 'Collection Rate', value: `${stats.collectionRate.toFixed(1)}%`, icon: ArrowTrendingUpIcon, color: 'primary' },
    { title: 'Total Expected', value: formatCurrency(stats.totalExpected), icon: CurrencyDollarIcon, color: 'warning' },
  ];

  const quickActions: QuickAction[] = [
    { title: 'Record Payment', description: 'Process new student payments', icon: BanknotesIcon, color: 'success', href: '/dashboard/bursar/fee-management' },
    { title: 'Generate Report', description: 'Create financial reports', icon: DocumentChartBarIcon, color: 'primary', href: '/dashboard/bursar/reports' },
    { title: 'View Announcements', description: 'Check recent notices', icon: MegaphoneIcon, color: 'secondary', href: '/dashboard/bursar/announcements' },
    { title: 'Fee Management', description: 'Manage student fees', icon: CalculatorIcon, color: 'warning', href: '/dashboard/bursar/fee-management' },
  ];

  // --- Render --- //
  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Welcome Message */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Bursar Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Financial overview for {currentAcademicYear ? `the ${currentAcademicYear.name} academic year` : 'the current period'}.
        </p>
      </div>

      {/* Error Display */}
      {error && !isLoading && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">Error loading dashboard data: {error}</div>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 bg-gray-200 rounded-lg animate-pulse"></div> // Skeleton loader
            ))
          : displayStats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (Spans 2 columns on lg) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/dashboard/bursar/fee-management" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardBody>
            {isLoading && <p className="text-center text-gray-500 py-4">Loading transactions...</p>}
            {!isLoading && recentTransactions.length === 0 && <p className="text-center text-gray-500 py-4">No recent transactions found.</p>}
            {!isLoading && recentTransactions.length > 0 && (
              <div className="space-y-1">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="font-medium text-gray-900 truncate">{transaction.student}</p>
                      {/* Display Receipt # and Method */}
                      <p className="text-sm text-gray-500 truncate">
                        {transaction.paymentMethod} {transaction.receiptNumber ? `(${transaction.receiptNumber})` : ''}
                      </p>
                      <div className="flex items-center mt-1 space-x-2">
                        {/* Status might not be applicable per transaction, assuming completed */}
                        <Badge variant="subtle" color={'green'} size="sm"> Completed </Badge>
                        <span className="text-xs text-gray-400">{transaction.date}</span>
                      </div>
                    </div>
                    <p className="text-base font-semibold text-gray-900 whitespace-nowrap">{transaction.amount}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Actions & Announcements (Span 1 column on lg) */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href || '#'}
                    className={`flex flex-col items-start p-3 space-y-1 text-left border rounded-md transition-colors border-${action.color}-200 hover:bg-${action.color}-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-${action.color}-500`}
                  >
                    <action.icon className={`h-5 w-5 mb-1 text-${action.color}-600`} />
                    <div>
                      <p className="font-medium text-sm text-gray-800">{action.title}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Announcements */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Recent Announcements</CardTitle>
              <Link href="/dashboard/bursar/announcements" className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardBody>
              {isLoading && <p className="text-center text-gray-500 py-3">Loading announcements...</p>}
              {!isLoading && announcements.length === 0 && <p className="text-center text-gray-500 py-3 italic">No recent announcements for internal staff.</p>}
              {!isLoading && announcements.length > 0 && (
                <ul className="space-y-3">
                  {announcements.slice(0, 3).map(ann => (
                    <li key={ann.id} className="text-sm border-b border-gray-100 pb-2 last:border-b-0">
                      <p className="font-medium text-gray-800 mb-0.5 truncate" title={ann.title}>{ann.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(ann.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
} 