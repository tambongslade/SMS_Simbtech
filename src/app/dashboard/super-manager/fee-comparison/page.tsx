"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/context/AuthContext';
import controlFeeService, { DiscrepancyResponse, ComparisonSummary } from '@/lib/controlFeeService';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';

export default function FeeComparisonDashboard() {
  const { user, currentAcademicYear, selectedRole, availableAcademicYears, selectAcademicYear } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ComparisonSummary | null>(null);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);
  const [localAcademicYears, setLocalAcademicYears] = useState<any[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<any>(null);

  // Check if user is super admin - check both selectedRole and user roles
  const isSuperAdmin = selectedRole === 'SUPER_MANAGER' || user?.userRoles?.some(ur => ur.role === 'SUPER_MANAGER');

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadAcademicYears();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin || !selectedAcademicYear) return;
    loadDashboardData();
  }, [selectedAcademicYear, isSuperAdmin]);

  const loadAcademicYears = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/academic-years`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setLocalAcademicYears(data.data || []);

      // Auto-select current academic year or first available
      if (currentAcademicYear) {
        setSelectedAcademicYear(currentAcademicYear);
      } else if (data.data && data.data.length > 0) {
        setSelectedAcademicYear(data.data[0]);
      }
    } catch (error) {
      console.error('Error loading academic years:', error);
      toast.error('Failed to load academic years');
    }
  };

  const loadDashboardData = async () => {
    if (!selectedAcademicYear) return;

    setLoading(true);
    try {
      const [summaryResponse, discrepanciesResponse] = await Promise.all([
        controlFeeService.getComparisonSummary({
          academicYearId: selectedAcademicYear.id
        }),
        controlFeeService.getDiscrepancies({
          academicYearId: selectedAcademicYear.id,
          limit: itemsPerPage,
          page: currentPage
        })
      ]);

      setSummary(summaryResponse.data);
      setDiscrepancies(discrepanciesResponse.data || []);
    } catch (error: any) {
      console.error('Error loading fee comparison data:', error);
      toast.error('Failed to load fee comparison data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportDiscrepancies = async () => {
    if (!selectedAcademicYear) return;

    setExportLoading(true);
    try {
      const blob = await controlFeeService.exportDiscrepancies({
        academicYearId: selectedAcademicYear.id,
        search: searchTerm
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fee-discrepancies-${selectedAcademicYear.name}-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Fee discrepancies exported successfully!');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error('Failed to export discrepancies');
    } finally {
      setExportLoading(false);
    }
  };

  const searchDiscrepancies = async () => {
    if (!currentAcademicYear) return;

    setLoading(true);
    try {
      const response = await controlFeeService.getDiscrepancies({
        academicYearId: currentAcademicYear.id,
        search: searchTerm,
        limit: itemsPerPage,
        page: 1
      });

      setDiscrepancies(response.data || []);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error searching discrepancies:', error);
      toast.error('Failed to search discrepancies');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDiscrepancyTypeLabel = (type: string) => {
    switch (type) {
      case 'MISSING_PRIMARY': return 'Missing Primary Fee';
      case 'MISSING_CONTROL': return 'Missing Control Fee';
      case 'AMOUNT_MISMATCH': return 'Amount Mismatch';
      case 'PAYMENT_MISMATCH': return 'Payment Mismatch';
      default: return type;
    }
  };

  const getDiscrepancyTypeColor = (type: string) => {
    switch (type) {
      case 'MISSING_PRIMARY': return 'bg-red-100 text-red-800 border-red-200';
      case 'MISSING_CONTROL': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'AMOUNT_MISMATCH': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PAYMENT_MISMATCH': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Access Denied</h1>
            <p className="text-gray-600 mb-4">Fee Audit & Control access is restricted to Super Administrators only.</p>
            <p className="text-sm text-gray-500">Contact your system administrator for access.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show dropdown even without selected academic year
  const showNoDataMessage = !selectedAcademicYear && localAcademicYears.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ScaleIcon className="w-8 h-8 text-blue-600" />
            Fee Audit & Control Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Compare and audit primary vs control fees for {selectedAcademicYear?.name || 'selected academic year'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="academic-year" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Academic Year:
            </label>
            <select
              id="academic-year"
              value={selectedAcademicYear?.id || ''}
              onChange={(e) => {
                const year = localAcademicYears.find(year => year.id === parseInt(e.target.value));
                if (year) setSelectedAcademicYear(year);
              }}
              className="min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Academic Year</option>
              {localAcademicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={handleExportDiscrepancies}
            disabled={exportLoading || !selectedAcademicYear}
            color="primary"
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exportLoading ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* No Academic Year Selected Message */}
      {showNoDataMessage && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No academic year is currently selected.</p>
            <p className="text-sm text-gray-500">Please select an academic year from the dropdown above to view fee comparison data.</p>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {summary && selectedAcademicYear && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalStudents}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Discrepancies</p>
                <p className="text-2xl font-bold text-red-900">{summary.totalDiscrepancies}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Students with Both Fees</p>
                <p className="text-2xl font-bold text-green-900">{summary.studentsWithBothFees}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <ChartBarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Variance</p>
                <p className="text-2xl font-bold text-yellow-900">{summary.averageVariancePercentage.toFixed(1)}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Discrepancy Types Breakdown */}
      {summary?.discrepancyTypes && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Discrepancy Types Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-2xl font-bold text-red-900">{summary.discrepancyTypes.missingPrimary}</p>
              <p className="text-sm text-red-600">Missing Primary</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-2xl font-bold text-orange-900">{summary.discrepancyTypes.missingControl}</p>
              <p className="text-sm text-orange-600">Missing Control</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-900">{summary.discrepancyTypes.amountMismatch}</p>
              <p className="text-sm text-yellow-600">Amount Mismatch</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-2xl font-bold text-purple-900">{summary.discrepancyTypes.paymentMismatch}</p>
              <p className="text-sm text-purple-600">Payment Mismatch</p>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Students
            </label>
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name or matricule..."
              className="w-full"
            />
          </div>
          <Button
            onClick={searchDiscrepancies}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            Search
          </Button>
        </div>
      </Card>

      {/* Discrepancies List */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Fee Discrepancies</h3>
          <span className="text-sm text-gray-500">
            Showing {discrepancies.length} discrepancies
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading discrepancies...</span>
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <p className="text-gray-500">No fee discrepancies found</p>
            <p className="text-sm text-gray-400 mt-1">All fees are properly synchronized</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discrepancies.map((discrepancy, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{discrepancy.studentName}</h4>
                    <p className="text-sm text-gray-600">Matricule: {discrepancy.studentMatricule}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full border ${getDiscrepancyTypeColor(discrepancy.discrepancyType)}`}>
                    {getDiscrepancyTypeLabel(discrepancy.discrepancyType)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discrepancy.primaryFee && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-700 mb-1">Primary Fee</p>
                      <p className="text-sm text-gray-600">
                        Expected: {formatCurrency(discrepancy.primaryFee.amountExpected)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Paid: {formatCurrency(discrepancy.primaryFee.amountPaid)}
                      </p>
                    </div>
                  )}

                  {discrepancy.controlFee && (
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <p className="text-sm font-medium text-green-700 mb-1">Control Fee</p>
                      <p className="text-sm text-gray-600">
                        Expected: {formatCurrency(discrepancy.controlFee.amountExpected)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Paid: {formatCurrency(discrepancy.controlFee.amountPaid)}
                      </p>
                    </div>
                  )}
                </div>

                {discrepancy.expectedAmountDifference && (
                  <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      Amount Difference: {formatCurrency(Math.abs(discrepancy.expectedAmountDifference))}
                      {discrepancy.variancePercentage && ` (${discrepancy.variancePercentage.toFixed(1)}% variance)`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}