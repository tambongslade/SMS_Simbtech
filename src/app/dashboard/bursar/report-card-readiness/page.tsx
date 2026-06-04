'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { Button, Select, Input } from '@/components/ui';
import apiService from '@/lib/apiService';
import { fmtMoney } from '@/lib/feeItemsApi';
import { getSubclassFeeStatus, type SubclassFeeStatus } from '@/lib/feeStatusApi';

type SubClassInfo = { id: number; name: string; classId?: number; className?: string };

export default function BursarReportCardReadinessPage() {
  const { selectedAcademicYear } = useAuth();
  const router = useRouter();

  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [subClassId, setSubClassId] = useState('');
  const [status, setStatus] = useState<SubclassFeeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiService
      .get<{ data: any[] }>('/classes/sub-classes?limit=100')
      .then((r) =>
        setSubClasses(
          (r.data || []).map((sc: any) => ({
            id: sc.id,
            name: sc.name,
            classId: sc.class?.id ?? sc.classId,
            className: sc.class?.name,
          })),
        ),
      )
      .catch(() => setSubClasses([]));
  }, []);

  const loadStatus = useCallback(async () => {
    if (!subClassId) {
      setStatus(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getSubclassFeeStatus(Number(subClassId), selectedAcademicYear?.id);
      setStatus(data);
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error(error?.message || 'Failed to load fee status.');
      }
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [subClassId, selectedAcademicYear?.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const clearedPct = status && status.totalStudents > 0
    ? Math.round((status.paidInFullCount / status.totalStudents) * 100)
    : 0;

  const visibleStudents = useMemo(() => {
    if (!status) return [];
    const term = search.trim().toLowerCase();
    return status.students.filter((s) => {
      if (onlyUnpaid && s.paidInFull) return false;
      if (term && !s.name?.toLowerCase().includes(term) && !s.matricule?.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [status, onlyUnpaid, search]);

  const selectedSubClassName = subClasses.find((sc) => String(sc.id) === subClassId)?.name;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Report Card Readiness</h1>
        <p className="text-gray-600 mt-1">
          See which students are cleared (school fees paid in full) for report cards
          {selectedAcademicYear ? ` · ${selectedAcademicYear.name}` : ''}.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[240px]">
          <Select
            label="Subclass"
            value={subClassId}
            onChange={(e) => setSubClassId(e.target.value)}
            options={[
              { value: '', label: 'Select a subclass' },
              ...subClasses.map((sc) => ({
                value: String(sc.id),
                label: sc.className ? `${sc.name} (${sc.className})` : sc.name,
              })),
            ]}
          />
        </div>
        <Button variant="outline" leftIcon={ArrowPathIcon} onClick={loadStatus} disabled={!subClassId || isLoading}>
          Refresh
        </Button>
      </div>

      {/* Empty / loading states */}
      {!subClassId ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Select a subclass to view fee readiness.
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Loading fee status…
        </div>
      ) : !status || status.totalStudents === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          No enrolled students found for this subclass.
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {status.paidInFullCount} / {status.totalStudents}
                </div>
                <div className="text-sm text-gray-500">
                  students cleared for report cards
                  {selectedSubClassName ? ` · ${selectedSubClassName}` : ''}
                </div>
              </div>
              <div className="flex gap-3">
                <Tile label="Cleared" value={status.paidInFullCount} tone="success" />
                <Tile label="Outstanding" value={status.unpaidCount} tone={status.unpaidCount > 0 ? 'danger' : 'default'} />
                <Tile label="Total" value={status.totalStudents} tone="default" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${clearedPct === 100 ? 'bg-green-500' : clearedPct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                  style={{ width: `${clearedPct}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{clearedPct}% cleared</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <Input
                label="Search"
                placeholder="Name or matricule"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" checked={onlyUnpaid} onChange={(e) => setOnlyUnpaid(e.target.checked)} />
              Only outstanding
            </label>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shortfall</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {onlyUnpaid ? 'No outstanding students 🎉' : 'No students match your search.'}
                      </td>
                    </tr>
                  ) : (
                    visibleStudents.map((s) => (
                      <tr key={s.studentId} className={`hover:bg-gray-50 ${s.paidInFull ? '' : 'bg-red-50/40'}`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.matricule}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{fmtMoney(s.amountExpected)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{fmtMoney(s.amountPaid)}</td>
                        <td className={`px-4 py-3 text-sm text-right ${s.shortfall > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {s.shortfall > 0 ? fmtMoney(s.shortfall) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {s.paidInFull ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                              <CheckCircleIcon className="h-3.5 w-3.5" /> Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Outstanding
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              size="xs"
                              variant="outline"
                              leftIcon={EyeIcon}
                              onClick={() => router.push(`/dashboard/bursar/student-registration/${s.studentId}`)}
                            >
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone: 'success' | 'danger' | 'default' }) {
  const color =
    tone === 'success' ? 'text-green-600' : tone === 'danger' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="text-center px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
