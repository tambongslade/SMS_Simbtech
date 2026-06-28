'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/context/AuthContext';
import apiService from '@/lib/apiService';
import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  BuildingLibraryIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// ─── Types ───────────────────────────────────────────────────────────────────

type PaymentMethod = 'EXPRESS_UNION' | 'CCA' | 'F3DC' | 'AFRILAND_FIRST_BANK';
type ExportFormat = 'csv' | 'pdf' | 'docx' | 'xlsx';

interface ControlPaymentTransaction {
  id: number;
  amount: number;
  paymentDate: string;
  receiptNumber: string | null;
  paymentMethod: string;
  controlFeeId: number;
  createdAt: string;
}

interface ControlFeeRecord {
  id: number;
  amountExpected: number;
  amountPaid: number;
  academicYearId: number;
  dueDate: string;
  enrollmentId: number;
  isNewStudent: boolean;
  enrollment: {
    id: number;
    studentId: number;
    student: {
      id: number;
      name: string;
      matricule: string;
      parents: Array<{ parent: { id: number; name: string; phone: string } }>;
    };
    subClass: {
      id: number;
      name: string;
      class: { id: number; name: string };
    };
  };
  academicYear: { id: number; name: string };
  controlPaymentTransactions: ControlPaymentTransaction[];
}

interface ClassOption {
  id: number;
  name: string;
}

interface SubclassSummary {
  subClassId: number;
  subClassName: string;
  className: string;
  academicYearId: number;
  totalStudentsWithControlFees: number;
  totalExpected: number;
  totalPaid: number;
  outstanding: number;
  paymentPercentage: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB');
  } catch {
    return dateStr;
  }
};

const todayISO = () => new Date().toISOString().split('T')[0];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  EXPRESS_UNION: 'Express Union',
  CCA: 'CCA',
  F3DC: 'F3DC',
  AFRILAND_FIRST_BANK: 'Afriland First Bank',
};

// ─── New Payment Modal (record for any student by search) ────────────────────

interface NewPaymentModalProps {
  academicYearId: number;
  onClose: () => void;
  onSuccess: () => void;
}

function NewPaymentModal({ academicYearId, onClose, onSuccess }: NewPaymentModalProps) {
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Array<{ id: number; name: string; matricule: string; enrollmentId?: number }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string; enrollmentId?: number } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('EXPRESS_UNION');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchStudents = useCallback(async (query: string) => {
    if (!query.trim()) { setStudentResults([]); return; }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({ q: query, limit: '10' });
      if (academicYearId) params.set('academicYearId', String(academicYearId));
      const res = await apiService.get(`/students/search?${params.toString()}`);
      const list = res?.data?.data || res?.data || [];
      setStudentResults(
        (Array.isArray(list) ? list : []).map((s: any) => ({
          id: s.id,
          name: s.name,
          matricule: s.matricule,
          enrollmentId: s.enrollments?.[0]?.id || s.enrollmentId,
        }))
      );
    } catch {
      setStudentResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [academicYearId]);

  const handleSearchChange = (val: string) => {
    setStudentSearch(val);
    setSelectedStudent(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchStudents(val), 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) { toast.error('Please select a student'); return; }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { toast.error('Please enter a valid amount'); return; }
    setLoading(true);
    try {
      await apiService.post('/control-fees/payments', {
        studentId: selectedStudent.id,
        ...(selectedStudent.enrollmentId ? { enrollmentId: selectedStudent.enrollmentId } : {}),
        amount: numAmount,
        paymentDate,
        paymentMethod,
        ...(receiptNumber ? { receiptNumber } : {}),
        academicYearId,
      });
      toast.success('Payment recorded successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Student search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student *</label>
            {selectedStudent ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2.5">
                <span className="text-sm text-blue-900 font-medium">{selectedStudent.name}</span>
                <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(''); }} className="text-blue-400 hover:text-blue-600 ml-2 flex-shrink-0">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Search by name or matricule…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                )}
                {studentResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {studentResults.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); setStudentResults([]); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <span className="text-gray-500 ml-2 text-xs">{s.matricule}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (XAF) *</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date *</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map(m => (
                <option key={m} value={m}>{paymentMethodLabels[m]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number (optional)</label>
            <input
              type="text"
              value={receiptNumber}
              onChange={e => setReceiptNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. EU-2026-00421"
            />
          </div>

          <div className="flex gap-3 pt-2 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedStudent}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Payment History Modal ────────────────────────────────────────────────────

interface PaymentHistoryModalProps {
  record: ControlFeeRecord;
  onClose: () => void;
}

function PaymentHistoryModal({ record, onClose }: PaymentHistoryModalProps) {
  const [transactions, setTransactions] = useState<ControlPaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get(`/control-fees/${record.id}/payments`);
        setTransactions(res?.data || res || []);
      } catch {
        toast.error('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    })();
  }, [record.id]);

  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
            <p className="text-sm text-gray-500 mt-0.5">{record.enrollment?.student?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClipboardDocumentListIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No payments recorded yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(t.amount)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(t.paymentDate)}</p>
                      {t.receiptNumber && (
                        <p className="text-xs text-gray-400">Receipt: {t.receiptNumber}</p>
                      )}
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {paymentMethodLabels[t.paymentMethod as PaymentMethod] || t.paymentMethod}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between">
                <span className="text-sm font-medium text-gray-700">Total Paid</span>
                <span className="text-sm font-bold text-green-700">{formatCurrency(total)}</span>
              </div>
            </>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subclass Summary Modal ───────────────────────────────────────────────────

interface SubclassSummaryModalProps {
  subClassId: number;
  subClassName: string;
  academicYearId: number;
  onClose: () => void;
}

function SubclassSummaryModal({ subClassId, subClassName, academicYearId, onClose }: SubclassSummaryModalProps) {
  const [summary, setSummary] = useState<SubclassSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.get(`/control-fees/sub_class/${subClassId}/summary`, { params: { academicYearId } });
        setSummary(res?.data || null);
      } catch {
        toast.error('Failed to load subclass summary');
      } finally {
        setLoading(false);
      }
    })();
  }, [subClassId, academicYearId]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Subclass Summary</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subClassName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : !summary ? (
            <p className="text-center text-gray-500 py-4">No data available</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Class</p>
                  <p className="text-sm font-semibold text-gray-900">{summary.className}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Subclass</p>
                  <p className="text-sm font-semibold text-gray-900">{summary.subClassName}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Students with Fees</p>
                  <p className="text-xl font-bold text-blue-900">{summary.totalStudentsWithControlFees}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600">Collection Rate</p>
                  <p className="text-xl font-bold text-green-900">{summary.paymentPercentage.toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Expected</span>
                  <span className="font-medium">{formatCurrency(summary.totalExpected)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="font-medium text-green-700">{formatCurrency(summary.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Outstanding</span>
                  <span className="font-medium text-red-700">{formatCurrency(summary.outstanding)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Collection Progress</span>
                  <span>{summary.paymentPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(summary.paymentPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full mt-6 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ControllerFeeManagementPage() {
  const { selectedAcademicYear } = useAuth();
  const academicYearId = selectedAcademicYear?.id;

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [historyFor, setHistoryFor] = useState<ControlFeeRecord | null>(null);
  const [summaryFor, setSummaryFor] = useState<{ id: number; name: string } | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Classes for filter dropdown
  const { data: classesData } = useSWR('/classes', (url: string) => apiService.get(url));
  const classes: ClassOption[] = classesData?.data || classesData || [];

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, selectedClassId, academicYearId]);

  // Build SWR key
  const swrKey = academicYearId
    ? `/control-fees?page=${page}&limit=${limit}&academicYearId=${academicYearId}${debouncedSearch ? `&studentIdentifier=${encodeURIComponent(debouncedSearch)}` : ''}${selectedClassId ? `&classId=${selectedClassId}` : ''}`
    : null;

  const { data: feeData, isLoading, mutate } = useSWR(
    swrKey,
    (url: string) => apiService.get(url),
  );

  const records: ControlFeeRecord[] = feeData?.data?.data || [];
  const meta = feeData?.data?.meta || { total: 0, totalPages: 1, page: 1 };

  const totalPaid = records.reduce((s, r) => s + r.amountPaid, 0);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedClassId('');
  };

  const hasFilters = search || selectedClassId;

  const handleExport = async (format: ExportFormat) => {
    if (!academicYearId) { toast.error('No academic year selected'); return; }
    setExportLoading(true);
    setShowExportMenu(false);
    try {
      const blob = await apiService.get(
        '/control-fees/export',
        { params: { format, academicYearId, ...(selectedClassId ? { classId: selectedClassId } : {}) } },
        'blob',
      );
      const url = window.URL.createObjectURL(blob as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `control-fees-${selectedAcademicYear?.name || 'export'}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (!academicYearId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No academic year selected</p>
          <p className="text-sm text-gray-400 mt-1">Please select an academic year to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control Fee Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Academic Year: <span className="font-medium text-blue-700">{selectedAcademicYear?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewPaymentModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Record Payment
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(v => !v)}
              disabled={exportLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {exportLoading ? 'Exporting…' : 'Export'}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {(['csv', 'xlsx', 'pdf', 'docx'] as ExportFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 capitalize"
                  >
                    {fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Records', value: meta.total.toString(), icon: ClipboardDocumentListIcon, color: 'blue' },
          { label: 'Total Collected', value: formatCurrency(totalPaid), icon: CurrencyDollarIcon, color: 'green' },
        ].map(stat => {
          const Icon = stat.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600',
            green: 'bg-green-50 text-green-600',
          };
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorMap[stat.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search student name or matricule…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Class filter */}
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 whitespace-nowrap"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table (desktop) / Cards (mobile) ──────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-500 text-sm">Loading control fees…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <ChartBarIcon className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No control fees found</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Student', 'Class / Subclass', 'Total Paid', 'Last Payment', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map(record => {
                    const student = record.enrollment?.student;
                    const subClass = record.enrollment?.subClass;
                    const lastTx = record.controlPaymentTransactions?.[0];
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{student?.name}</p>
                            <p className="text-xs text-gray-500">{student?.matricule}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-900">{subClass?.class?.name}</p>
                            <p className="text-xs text-gray-500">{subClass?.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-green-700 font-medium whitespace-nowrap">
                          {formatCurrency(record.amountPaid)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {lastTx ? formatDate(lastTx.paymentDate) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setHistoryFor(record)}
                              title="View Payment History"
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <ClockIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setSummaryFor({ id: subClass?.id ?? 0, name: subClass?.name ?? '' })}
                              title="Subclass Summary"
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            >
                              <BuildingLibraryIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {records.map(record => {
                const student = record.enrollment?.student;
                const subClass = record.enrollment?.subClass;
                const lastTx = record.controlPaymentTransactions?.[0];
                return (
                  <div key={record.id} className="p-4 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{student?.name}</p>
                      <p className="text-xs text-gray-500">{student?.matricule}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{subClass?.class?.name} — {subClass?.name}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total paid:</span>
                      <span className="font-semibold text-green-700">{formatCurrency(record.amountPaid)}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {lastTx ? `Last payment: ${formatDate(lastTx.paymentDate)}` : 'No payments yet'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHistoryFor(record)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        History
                      </button>
                      <button
                        onClick={() => setSummaryFor({ id: subClass?.id ?? 0, name: subClass?.name ?? '' })}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Summary
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} records)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────── */}
      {showNewPaymentModal && (
        <NewPaymentModal
          academicYearId={academicYearId}
          onClose={() => setShowNewPaymentModal(false)}
          onSuccess={() => mutate()}
        />
      )}

      {historyFor && (
        <PaymentHistoryModal
          record={historyFor}
          onClose={() => setHistoryFor(null)}
        />
      )}

      {summaryFor && summaryFor.id > 0 && (
        <SubclassSummaryModal
          subClassId={summaryFor.id}
          subClassName={summaryFor.name}
          academicYearId={academicYearId}
          onClose={() => setSummaryFor(null)}
        />
      )}

      {/* Close export menu on outside click */}
      {showExportMenu && (
        <div className="fixed inset-0 z-[5]" onClick={() => setShowExportMenu(false)} />
      )}
    </div>
  );
}
