'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  DocumentArrowDownIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HeartIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { enumLabel } from '@/lib/disciplineExtApi';
import {
  type ChildSnapshot,
  type ChildReportCard,
  getChildSnapshot,
  listChildReportCards,
  downloadChildReportCard,
} from '@/lib/parentChildApi';

const avg = (n?: number | null) => (n == null ? '—' : Number(n).toFixed(2));

function ChildSnapshotInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const matricule = searchParams.get('matricule');
  const { data: dashboard } = useParentDashboard();

  const [snapshot, setSnapshot] = useState<ChildSnapshot | null>(null);
  const [reports, setReports] = useState<ChildReportCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openSequence, setOpenSequence] = useState<number | null>(null);
  const [downloadingSeq, setDownloadingSeq] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!matricule) return;
    setIsLoading(true);
    try {
      const [snap, rc] = await Promise.all([
        getChildSnapshot(matricule),
        listChildReportCards(matricule).catch(() => ({ student: undefined as any, reports: [] })),
      ]);
      setSnapshot(snap);
      setReports(rc.reports);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load child information.');
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, [matricule]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (report: ChildReportCard) => {
    if (!matricule) return;
    setDownloadingSeq(report.examSequenceId);
    try {
      const result = await downloadChildReportCard(matricule, report.academicYearId, report.examSequenceId);
      if (result.kind === 'downloaded') {
        toast.success('Report card downloaded.');
      } else if (result.kind === 'processing') {
        toast(result.message || 'The report card is still being generated — try again in a moment.', { icon: '⏳' });
      } else if (result.kind === 'fee-blocked') {
        toast.error(
          result.shortfall
            ? `Report card locked: outstanding fees of ${Number(result.shortfall).toLocaleString()} XAF. Please settle with the Bursar.`
            : result.message || 'Report card locked until school fees are settled.',
          { duration: 8000 }
        );
      } else {
        toast.error(result.message);
      }
    } finally {
      setDownloadingSeq(null);
    }
  };

  const children = dashboard?.children || [];
  const seqAverages = useMemo(() => snapshot?.academic?.sequenceAverages || [], [snapshot]);

  // No matricule chosen — show the child picker
  if (!matricule) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Results & Report Cards</h1>
          <p className="text-sm text-gray-500 mt-1">Choose a child to see their full academic snapshot.</p>
        </div>
        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {children.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">No children linked to your account yet.</p>
          ) : (
            children.map((child: any) => (
              <button
                key={child.id}
                disabled={!child.matricule}
                onClick={() => router.push(`/dashboard/parent-student/child-snapshot?matricule=${encodeURIComponent(child.matricule)}`)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{child.name}</p>
                  <p className="text-xs text-gray-500">
                    {child.matricule || 'No matricule on file'}
                    {child.className ? ` · ${child.className}${child.subclassName ? ` ${child.subclassName}` : ''}` : ''}
                  </p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-300 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => router.push('/dashboard/parent-student/child-snapshot')}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeftIcon className="w-4 h-4" /> All children
        </button>
        <button onClick={load} className="p-2 text-gray-500 hover:bg-gray-100 rounded-md" title="Refresh">
          <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && !snapshot ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Loading snapshot…</div>
      ) : !snapshot ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Could not load this child's information.
        </div>
      ) : (
        <>
          {/* Student header */}
          <div className="bg-white rounded-lg shadow p-4">
            <h1 className="text-lg font-bold text-gray-900">{snapshot.student.name}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {snapshot.student.matricule}
              {snapshot.enrollment?.className ? ` · ${snapshot.enrollment.className}${snapshot.enrollment.subclassName ? ` ${snapshot.enrollment.subclassName}` : ''}` : ''}
              {snapshot.enrollment?.academicYearName ? ` · ${snapshot.enrollment.academicYearName}` : ''}
            </p>
            {snapshot.enrollment?.classMaster && (
              <p className="text-xs text-gray-500">Class master: {snapshot.enrollment.classMaster}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-700">{avg(snapshot.academic?.overallAverage)}</p>
                <p className="text-[11px] text-blue-700">Overall average / 20</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-gray-700">{snapshot.academic?.totalAssessments ?? 0}</p>
                <p className="text-[11px] text-gray-600">Assessments recorded</p>
              </div>
            </div>
          </div>

          {/* Report cards */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <DocumentArrowDownIcon className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-sm text-gray-900">Report Cards</h2>
            </div>
            {reports.filter(r => r.status === 'COMPLETED').length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No report cards available yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {reports.filter(r => r.status === 'COMPLETED').map(r => (
                  <li key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Sequence {r.sequenceNumber}{r.termName ? ` — ${r.termName}` : ''}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {r.academicYearName || ''}{r.generatedAt ? ` · generated ${new Date(r.generatedAt).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(r)}
                      disabled={downloadingSeq === r.examSequenceId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 shrink-0"
                    >
                      <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                      {downloadingSeq === r.examSequenceId ? 'Downloading…' : 'Download PDF'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Results per sequence */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-indigo-500" />
              <h2 className="font-semibold text-sm text-gray-900">Results by Sequence</h2>
            </div>
            {(snapshot.academic?.sequences || []).length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No marks recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {(snapshot.academic?.sequences || []).map(seq => {
                  const summary = seqAverages.find(s => s.examSequenceId === seq.examSequenceId);
                  const open = openSequence === seq.examSequenceId;
                  return (
                    <li key={seq.examSequenceId}>
                      <button
                        onClick={() => setOpenSequence(open ? null : seq.examSequenceId)}
                        className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {open ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
                          <span className="text-sm font-medium text-gray-900">
                            Sequence {seq.sequenceNumber}{seq.termName ? ` — ${seq.termName}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-semibold">{avg(seq.average)}</span>
                          {summary?.rank != null && (
                            <span className="text-gray-500">Rank {summary.rank}/{summary.totalStudents ?? '—'}</span>
                          )}
                          {summary?.decision && (
                            <span className={`px-2 py-0.5 rounded-full font-medium ${summary.decision === 'PASS' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {enumLabel(summary.decision)}
                            </span>
                          )}
                        </div>
                      </button>
                      {open && (
                        <div className="px-4 pb-3 bg-gray-50">
                          <ul className="divide-y divide-gray-100">
                            {seq.subjects.map(sub => (
                              <li key={sub.subjectId} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                                <div className="min-w-0">
                                  <span className="text-gray-800">{sub.subjectName}</span>
                                  <span className="text-[11px] text-gray-400"> {sub.coefficient ? `· coef ${sub.coefficient}` : ''}{sub.teacher ? ` · ${sub.teacher}` : ''}</span>
                                </div>
                                <span className={`font-semibold shrink-0 ${sub.score != null && sub.score >= 10 ? 'text-green-700' : 'text-red-600'}`}>
                                  {sub.score != null ? `${sub.score}/20` : '—'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Discipline */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-sm text-gray-900">Discipline ({snapshot.discipline?.totalIssues ?? 0})</h2>
            </div>
            {(snapshot.discipline?.issues || []).length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No discipline issues — keep it up! 🎉</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {(snapshot.discipline?.issues || []).map(i => (
                  <li key={i.id} className="px-4 py-2.5">
                    <p className="text-sm font-medium text-gray-900">{enumLabel(i.issueType)}</p>
                    {i.description && <p className="text-xs text-gray-500">{i.description}</p>}
                    {i.actionTaken && <p className="text-xs text-green-700">Action: {i.actionTaken}</p>}
                    <p className="text-[11px] text-gray-400">{i.createdAt ? new Date(i.createdAt).toLocaleDateString() : ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Health */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <HeartIcon className="w-5 h-5 text-rose-500" />
              <h2 className="font-semibold text-sm text-gray-900">Health</h2>
            </div>
            <div className="p-4 space-y-2">
              {(snapshot.health?.healthConditions || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(snapshot.health?.healthConditions || []).map(c => (
                    <span key={c} className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-medium rounded-full">{enumLabel(c)}</span>
                  ))}
                </div>
              )}
              {snapshot.health?.medicalNotes && (
                <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-md p-2.5">{snapshot.health.medicalNotes}</p>
              )}
              {(snapshot.health?.recentVisits || []).length === 0 ? (
                <p className="text-sm text-gray-400">No infirmary visits recorded.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {(snapshot.health?.recentVisits || []).map(v => (
                    <li key={v.id} className="py-2">
                      <p className="text-sm text-gray-800">
                        {v.reason}
                        {v.sentHome && <span className="ml-2 text-[11px] px-2 py-0.5 bg-red-50 text-red-700 rounded-full">Sent home</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(v.visitDate).toLocaleString()}
                        {v.medicationGiven ? ` · 💊 ${v.medicationGiven}` : ''}
                        {v.loggedBy ? ` · ${v.loggedBy}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ChildSnapshotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}>
      <ChildSnapshotInner />
    </Suspense>
  );
}
