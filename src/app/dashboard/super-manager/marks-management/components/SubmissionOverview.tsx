'use client';

import { Fragment, useState } from 'react';
import useSWR from 'swr';

// --- Types (mirror GET /exams/:id/submission-tracking, camelCased) ---
type SubjectTracking = {
    subjectId: number;
    subjectName: string;
    totalStudents: number;
    marksSubmitted: number;
    marksMissing: number;
    percentage: number;
    status: 'complete' | 'partial' | 'missing';
    assignedTeachers: { id: number; name: string }[];
    submittedBy: { id: number; name: string; count: number }[];
};

type SubClassTracking = {
    subClassId: number;
    subClassName: string;
    className: string;
    totalStudents: number;
    overallPercentage: number;
    subjects: SubjectTracking[];
};

type TrackingResult = {
    examSequence: { id: number; sequenceNumber: number; status: string; submissionDeadline: string | null };
    summary: { totalMarksExpected: number; totalMarksSubmitted: number; totalMarksMissing: number; overallPercentage: number };
    classes: SubClassTracking[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

const STATUS_LABEL: Record<SubjectTracking['status'], string> = {
    complete: 'Submitted',
    partial: 'Partially submitted',
    missing: 'Not submitted',
};

const barColor = (pct: number) => (pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-500' : 'bg-red-500');

const ProgressBar = ({ pct }: { pct: number }) => (
    <div className="flex items-center gap-2 min-w-[110px]">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium text-gray-700 w-9 text-right">{pct}%</span>
    </div>
);

const subjectsOf = (c: SubClassTracking, status: SubjectTracking['status']) =>
    c.subjects.filter(s => s.status === status);

export default function SubmissionOverview({ examSequenceId }: { examSequenceId: number | '' }) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const { data, error, isLoading } = useSWR<{ data: TrackingResult }>(
        examSequenceId ? `${API_BASE_URL}/exams/${examSequenceId}/submission-tracking` : null
    );

    if (!examSequenceId) {
        return (
            <div className="mb-6 p-4 text-center text-gray-500 bg-gray-50 rounded-md shadow-sm">
                Select an Academic Year and Exam Sequence to see the marks submission overview.
            </div>
        );
    }
    if (isLoading) return <div className="mb-6 p-4 text-center text-gray-600">Loading submission overview...</div>;
    if (error || !data?.data) {
        return <div className="mb-6 p-4 text-red-500">Could not load the submission overview.</div>;
    }

    const { summary, classes } = data.data;

    const totals = classes.reduce(
        (acc, c) => ({
            subjects: acc.subjects + c.subjects.length,
            submitted: acc.submitted + subjectsOf(c, 'complete').length,
            partial: acc.partial + subjectsOf(c, 'partial').length,
            missing: acc.missing + subjectsOf(c, 'missing').length,
        }),
        { subjects: 0, submitted: 0, partial: 0, missing: 0 }
    );

    const toggle = (id: number) =>
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    return (
        <div className="mb-6 bg-white rounded shadow">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold mb-3">Marks Submission Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-3 rounded bg-gray-50">
                        <div className="text-xs text-gray-500">Subclasses</div>
                        <div className="text-xl font-semibold">{classes.length}</div>
                    </div>
                    <div className="p-3 rounded bg-green-50">
                        <div className="text-xs text-gray-500">Subjects fully submitted</div>
                        <div className="text-xl font-semibold text-green-700">{totals.submitted} / {totals.subjects}</div>
                    </div>
                    <div className="p-3 rounded bg-amber-50">
                        <div className="text-xs text-gray-500">Subjects partially submitted</div>
                        <div className="text-xl font-semibold text-amber-700">{totals.partial}</div>
                    </div>
                    <div className="p-3 rounded bg-red-50">
                        <div className="text-xs text-gray-500">Subjects not submitted</div>
                        <div className="text-xl font-semibold text-red-700">{totals.missing}</div>
                    </div>
                    <div className="p-3 rounded bg-indigo-50 col-span-2 md:col-span-1">
                        <div className="text-xs text-gray-500">Marks submitted</div>
                        <div className="text-xl font-semibold text-indigo-700">{summary.overallPercentage}%</div>
                        <div className="text-xs text-gray-500">{summary.totalMarksSubmitted} / {summary.totalMarksExpected}</div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['Subclass', 'Total subjects', 'Submitted', 'Partial', 'Not submitted', 'Marks submitted'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {classes.map(c => {
                            const open = expanded.has(c.subClassId);
                            return (
                                <Fragment key={c.subClassId}>
                                    <tr onClick={() => toggle(c.subClassId)} className="cursor-pointer hover:bg-gray-50">
                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                            <span className="inline-block w-4 text-gray-400">{open ? '▾' : '▸'}</span>{c.subClassName}
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-700">{c.subjects.length}</td>
                                        <td className="px-4 py-2 text-sm text-green-700 font-medium">{subjectsOf(c, 'complete').length}</td>
                                        <td className="px-4 py-2 text-sm text-amber-700 font-medium">{subjectsOf(c, 'partial').length}</td>
                                        <td className="px-4 py-2 text-sm text-red-700 font-medium">{subjectsOf(c, 'missing').length}</td>
                                        <td className="px-4 py-2"><ProgressBar pct={c.overallPercentage} /></td>
                                    </tr>
                                    {open && (
                                        <tr className="bg-gray-50">
                                            <td colSpan={6} className="px-4 py-3">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                    {(['complete', 'partial', 'missing'] as const).map(status => (
                                                        <div key={status}>
                                                            <div className="font-medium mb-1 text-gray-700">{STATUS_LABEL[status]}</div>
                                                            {subjectsOf(c, status).length === 0 ? (
                                                                <div className="text-gray-400">None</div>
                                                            ) : (
                                                                <ul className="space-y-0.5">
                                                                    {subjectsOf(c, status).map(s => (
                                                                        <li key={s.subjectId} className="text-gray-700">
                                                                            {s.subjectName}
                                                                            {status === 'partial' && (
                                                                                <span className="text-gray-500"> ({s.marksSubmitted}/{s.totalStudents})</span>
                                                                            )}
                                                                            {status !== 'complete' && (
                                                                                <span className="text-gray-400"> – {s.assignedTeachers.length > 0
                                                                                    ? s.assignedTeachers.map(t => t.name).join(', ')
                                                                                    : 'no teacher in the timetable'}</span>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
