'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import {
  ISSUE_TYPES,
  listDisciplineIssues,
  updateDisciplineIssue,
  type DisciplineIssue,
  type DisciplineIssueType,
} from '@/lib/disciplineApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';

// Generic Discipline Issue register for the Super Manager — the drill-down
// target for the "Total Issues" / "Issues · 30 days" / "Issues by Type"
// tiles and chart on the Overview page's Discipline module. There is no
// dedicated management page for the raw DisciplineIssue log anywhere else
// in the app (Warnings/Summons, Disciplinary Actions, Punishments and
// Seized Items are all separate, more specific models) — this is the first.

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const todayISO = () => toISO(new Date());
const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISO(d);
};

const PAGE_SIZE = 25;

const TYPE_LABEL: Record<DisciplineIssueType, string> = Object.fromEntries(
  ISSUE_TYPES.map((t) => [t.value, t.label])
) as Record<DisciplineIssueType, string>;

// listDisciplineIssues({ includeStudent: true }) attaches this shape to
// DisciplineIssue.enrollment (typed `any` in disciplineApi.ts since most
// callers don't request it).
interface EnrollmentWithStudent {
  student?: { id: number; name: string; matricule: string | null };
  subClass?: { id: number; name: string; class?: { id: number; name: string } };
}

function DisciplineIssuesPageInner() {
  const { selectedAcademicYear } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [issueType, setIssueType] = useState<DisciplineIssueType | 'all'>(
    (searchParams.get('type') as DisciplineIssueType) || 'all'
  );
  const [from, setFrom] = useState(
    searchParams.get('range') === '30d' ? daysAgoISO(30) : searchParams.get('from') || ''
  );
  const [to, setTo] = useState(searchParams.get('to') || (searchParams.get('range') === '30d' ? todayISO() : ''));

  const [rows, setRows] = useState<DisciplineIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<DisciplineIssue | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editAction, setEditAction] = useState('');
  const [saving, setSaving] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listDisciplineIssues({
        academicYearId: selectedAcademicYear?.id,
        issueType: issueType === 'all' ? undefined : issueType,
        startDate: from || undefined,
        endDate: to || undefined,
        includeStudent: true,
        includeAssignedBy: true,
        page,
        limit: PAGE_SIZE,
      });
      setRows(res.data);
      setTotal(res.meta?.total ?? res.data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('Failed to load discipline issues'));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAcademicYear?.id, issueType, from, to, page]);

  const openEdit = (issue: DisciplineIssue) => {
    setEditing(issue);
    setEditNotes(issue.notes ?? '');
    setEditAction(issue.actionTaken ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateDisciplineIssue(editing.id, { notes: editNotes, actionTaken: editAction });
      toast.success(t('Issue updated.'));
      setEditing(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('Failed to update issue'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4">
      <div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/super-manager/overview?module=discipline')}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('Back to Overview')}
        </button>
        <h1 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900">{t('Discipline Issues')}</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {t('Every recorded discipline issue, across all types.')}
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('Type')}</label>
            <select
              value={issueType}
              onChange={(e) => { setIssueType(e.target.value as DisciplineIssueType | 'all'); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              <option value="all">{t('All types')}</option>
              {ISSUE_TYPES.map((it) => (
                <option key={it.value} value={it.value}>{t(it.label)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('From')}</label>
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('To')}</label>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
          {(from || to) && (
            <Button variant="outline" onClick={() => { setFrom(''); setTo(''); setPage(1); }}>
              {t('Clear dates')}
            </Button>
          )}
          <div className="ml-auto text-sm text-gray-600 self-end">
            {loading ? t('Loading…') : `${total} ${t('records')}`}
          </div>
        </div>
      </Card>

      {error && <Card className="p-4 bg-red-50 border-red-200 text-red-800 text-sm">{error}</Card>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50 border-b">
              <tr>
                <th className="text-left py-2 px-3">{t('Date')}</th>
                <th className="text-left py-2 px-3">{t('Student')}</th>
                <th className="text-left py-2 px-3">{t('Class')}</th>
                <th className="text-left py-2 px-3">{t('Type')}</th>
                <th className="text-left py-2 px-3">{t('Description')}</th>
                <th className="text-left py-2 px-3">{t('Action Taken')}</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">{t('Loading…')}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">{t('No discipline issues found for this filter.')}</td></tr>
              ) : (
                rows.map((issue) => {
                  const enrollment = issue.enrollment as EnrollmentWithStudent | undefined;
                  const student = enrollment?.student;
                  const subClass = enrollment?.subClass;
                  return (
                    <tr key={issue.id} className="border-b last:border-none hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700 whitespace-nowrap">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        {student ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/super-manager/student-management/${student.id}`)}
                            className="text-blue-700 hover:text-blue-900 hover:underline text-left"
                          >
                            {student.name}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600">
                        {subClass ? `${subClass.class?.name ?? ''} · ${subClass.name}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{t(TYPE_LABEL[issue.issueType as DisciplineIssueType] ?? issue.issueType)}</td>
                      <td className="py-2 px-3 text-gray-700 max-w-xs truncate" title={issue.description}>{issue.description}</td>
                      <td className="py-2 px-3 text-gray-600 max-w-xs truncate" title={issue.actionTaken ?? ''}>
                        {issue.actionTaken || <span className="text-gray-400 italic">{t('None')}</span>}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => openEdit(issue)}
                          className="text-gray-400 hover:text-gray-700"
                          title={t('Edit')}
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <Card className="p-0">
          <div className="flex items-center justify-between p-3 bg-gray-50">
            <div className="text-xs text-gray-600">{t('Page')} {page} / {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} leftIcon={ChevronLeftIcon}>
                {t('Previous')}
              </Button>
              <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} rightIcon={ChevronRightIcon}>
                {t('Next')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900">{t('Edit Discipline Issue')}</h2>
            <p className="text-sm text-gray-600">{editing.description}</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('Notes')}</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('Action Taken')}</label>
              <textarea
                value={editAction}
                onChange={(e) => setEditAction(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>{t('Cancel')}</Button>
              <Button onClick={saveEdit} disabled={saving}>{saving ? t('Saving…') : t('Save')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DisciplineIssuesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <DisciplineIssuesPageInner />
    </Suspense>
  );
}
