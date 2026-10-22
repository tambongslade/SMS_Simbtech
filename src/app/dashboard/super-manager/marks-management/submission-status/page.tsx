'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import MarksManagementTabs from '../components/MarksManagementTabs';
import { useMarksManagementFilters } from '../hooks/useMarksManagementFilters';

// --- Types (mirror GET /exams/:id/submission-tracking, camelCased) ---
type Status = 'complete' | 'partial' | 'missing';

type SubjectTracking = {
    subjectId: number;
    subjectName: string;
    totalStudents: number;
    marksSubmitted: number;
    marksMissing: number;
    percentage: number;
    status: Status;
    assignedTeachers: { id: number; name: string }[];
};

type SubClassTracking = {
    subClassId: number;
    subClassName: string;
    className: string;
    totalStudents: number;
    subjects: SubjectTracking[];
};

type TrackingResult = {
    examSequence: { id: number; sequenceNumber: number; status: string };
    classes: SubClassTracking[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

const STATUS_LABEL: Record<Status, string> = {
    complete: 'Submitted',
    partial: 'Partial',
    missing: 'Not submitted',
};

const STATUS_CHIP: Record<Status, string> = {
    complete: 'bg-green-100 text-green-800',
    partial: 'bg-amber-100 text-amber-800',
    missing: 'bg-red-100 text-red-800',
};

const StatusChip = ({ status }: { status: Status }) => (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CHIP[status]}`}>{STATUS_LABEL[status]}</span>
);

// One unit = one subject taught in one subclass (marks are submitted per subject per subclass).
type Unit = {
    subClassId: number;
    subClassName: string;
    className: string;
    subjectId: number;
    subjectName: string;
    status: Status;
    submitted: number;
    total: number;
    missing: number;
};

const toUnit = (c: SubClassTracking, s: SubjectTracking): Unit => ({
    subClassId: c.subClassId,
    subClassName: c.subClassName,
    className: c.className,
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    status: s.status,
    submitted: s.marksSubmitted,
    total: s.totalStudents,
    missing: s.marksMissing,
});

const countBy = (units: { status: Status }[]) => ({
    complete: units.filter(u => u.status === 'complete').length,
    partial: units.filter(u => u.status === 'partial').length,
    missing: units.filter(u => u.status === 'missing').length,
});

// A group of subclasses (a class) is complete when all are, not submitted when none have anything.
const groupStatus = (units: { status: Status }[]): Status => {
    if (units.every(u => u.status === 'complete')) return 'complete';
    if (units.every(u => u.status === 'missing')) return 'missing';
    return 'partial';
};

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

const Th = ({ children }: { children: React.ReactNode }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>
);

type TeacherRow = { id: number; name: string; units: Unit[] };
type SubjectRow = { id: number; name: string; units: Unit[] };

export default function SubmissionStatusPage() {
    const [yearId, setYearId] = useState<number | ''>('');
    const [sequenceId, setSequenceId] = useState<number | ''>('');
    const [view, setView] = useState<'teacher' | 'subject'>('teacher');
    const [search, setSearch] = useState('');
    const [onlyIncomplete, setOnlyIncomplete] = useState(false);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    const { academicYears, derivedExamSequences, currentYearId, getOngoingSequenceId, isLoadingFilters } =
        useMarksManagementFilters(yearId, '');

    // Defaults: current year, ongoing sequence.
    useEffect(() => {
        if (yearId === '' && currentYearId !== '') setYearId(currentYearId);
    }, [yearId, currentYearId]);
    useEffect(() => {
        if (yearId !== '' && sequenceId === '') setSequenceId(getOngoingSequenceId(yearId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [yearId, academicYears]);

    const { data, error, isLoading } = useSWR<{ data: TrackingResult }>(
        sequenceId ? `${API_BASE_URL}/exams/${sequenceId}/submission-tracking` : null
    );

    const classes = data?.data?.classes;

    const teacherRows = useMemo((): TeacherRow[] => {
        const map = new Map<number, TeacherRow>();
        for (const c of classes ?? []) {
            for (const s of c.subjects) {
                for (const t of s.assignedTeachers) {
                    if (!map.has(t.id)) map.set(t.id, { id: t.id, name: t.name, units: [] });
                    map.get(t.id)!.units.push(toUnit(c, s));
                }
            }
        }
        return [...map.values()].sort((a, b) => byName(a.name, b.name));
    }, [classes]);

    const subjectRows = useMemo((): SubjectRow[] => {
        const map = new Map<number, SubjectRow>();
        for (const c of classes ?? []) {
            for (const s of c.subjects) {
                if (!map.has(s.subjectId)) map.set(s.subjectId, { id: s.subjectId, name: s.subjectName, units: [] });
                map.get(s.subjectId)!.units.push(toUnit(c, s));
            }
        }
        return [...map.values()].sort((a, b) => byName(a.name, b.name));
    }, [classes]);

    const toggle = (id: number) =>
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const switchView = (v: 'teacher' | 'subject') => {
        setView(v);
        setExpanded(new Set());
        setSearch('');
    };

    const q = search.trim().toLowerCase();
    const incomplete = (units: Unit[]) => units.some(u => u.status !== 'complete');

    const teachers = teacherRows.filter(r => (!q || r.name.toLowerCase().includes(q)) && (!onlyIncomplete || incomplete(r.units)));
    const subjects = subjectRows.filter(r => (!q || r.name.toLowerCase().includes(q)) && (!onlyIncomplete || incomplete(r.units)));

    const sequenceName = (id: number) => derivedExamSequences.find(s => s.id === id)?.name ?? '';

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Marks Management</h1>
            <MarksManagementTabs />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                    <select
                        value={yearId}
                        onChange={e => { setYearId(Number(e.target.value) || ''); setSequenceId(''); setExpanded(new Set()); }}
                        disabled={isLoadingFilters}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 sm:text-sm rounded-md disabled:bg-gray-100"
                    >
                        <option value="">Select Academic Year</option>
                        {academicYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exam Sequence</label>
                    <select
                        value={sequenceId}
                        onChange={e => { setSequenceId(Number(e.target.value) || ''); setExpanded(new Set()); }}
                        disabled={isLoadingFilters || !yearId}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 sm:text-sm rounded-md disabled:bg-gray-100"
                    >
                        <option value="">Select Exam Sequence</option>
                        {derivedExamSequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
                    <div className="mt-1 inline-flex rounded-md shadow-sm w-full" role="group">
                        {([['teacher', 'By teacher'], ['subject', 'By subject']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => switchView(key)}
                                className={`flex-1 px-3 py-2 text-sm font-medium border first:rounded-l-md last:rounded-r-md ${view === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={view === 'teacher' ? 'Teacher name...' : 'Subject name...'}
                        className="mt-1 block w-full px-3 py-2 text-base border border-gray-300 sm:text-sm rounded-md"
                    />
                </div>
            </div>

            {!sequenceId && (
                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md shadow-sm">Select an Exam Sequence to see the submission status.</div>
            )}
            {sequenceId && isLoading && <div className="p-4 text-center text-gray-600">Loading submission status...</div>}
            {sequenceId && !isLoading && (error || !data?.data) && <div className="p-4 text-red-500">Could not load the submission status.</div>}

            {sequenceId && classes && (
                <div className="bg-white rounded shadow">
                    <div className="p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-gray-600">
                            {sequenceName(Number(sequenceId))}. A class here means one subject taught in one subclass, because marks are submitted per subject.
                            Only subjects on the timetable are counted.
                        </p>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" checked={onlyIncomplete} onChange={e => setOnlyIncomplete(e.target.checked)} />
                            Only show incomplete
                        </label>
                    </div>

                    {view === 'teacher' ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th>Teacher</Th>
                                        <Th>Classes taught</Th>
                                        <Th>Fully submitted</Th>
                                        <Th>Partially submitted</Th>
                                        <Th>Not submitted</Th>
                                        <Th>Students without marks</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {teachers.map(t => {
                                        const n = countBy(t.units);
                                        const open = expanded.has(t.id);
                                        const missing = t.units.reduce((s, u) => s + u.missing, 0);
                                        const units = [...t.units].sort((a, b) => byName(a.className + a.subClassName, b.className + b.subClassName) || byName(a.subjectName, b.subjectName));
                                        return (
                                            <Fragment key={t.id}>
                                                <tr className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{t.name}</td>
                                                    <td className="px-4 py-2 text-sm">
                                                        <button onClick={() => toggle(t.id)} className="text-indigo-600 hover:underline font-medium">
                                                            {open ? '▾' : '▸'} {t.units.length}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-green-700 font-medium">{n.complete}</td>
                                                    <td className="px-4 py-2 text-sm text-amber-700 font-medium">{n.partial}</td>
                                                    <td className="px-4 py-2 text-sm text-red-700 font-medium">{n.missing}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{missing}</td>
                                                </tr>
                                                {open && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={6} className="px-4 py-3">
                                                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {units.map(u => (
                                                                    <li key={`${u.subClassId}:${u.subjectId}`} className="flex items-center justify-between gap-2 bg-white rounded border border-gray-200 px-3 py-2 text-sm">
                                                                        <span className="text-gray-800">{u.subClassName} <span className="text-gray-500">- {u.subjectName}</span></span>
                                                                        <span className="flex items-center gap-2 shrink-0">
                                                                            <span className="text-xs text-gray-500">{u.submitted}/{u.total}</span>
                                                                            <StatusChip status={u.status} />
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                    {teachers.length === 0 && (
                                        <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No teachers to show.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th>Subject</Th>
                                        <Th>Classes (all)</Th>
                                        <Th>Classes submitted</Th>
                                        <Th>Classes partial</Th>
                                        <Th>Classes not submitted</Th>
                                        <Th>Subclasses (all)</Th>
                                        <Th>Subclasses submitted</Th>
                                        <Th>Subclasses partial</Th>
                                        <Th>Subclasses not submitted</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {subjects.map(sj => {
                                        const sub = countBy(sj.units);
                                        const byClass = new Map<string, Unit[]>();
                                        for (const u of sj.units) byClass.set(u.className, [...(byClass.get(u.className) ?? []), u]);
                                        const cls = countBy([...byClass.values()].map(us => ({ status: groupStatus(us) })));
                                        const open = expanded.has(sj.id);
                                        return (
                                            <Fragment key={sj.id}>
                                                <tr onClick={() => toggle(sj.id)} className="cursor-pointer hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                        <span className="inline-block w-4 text-gray-400">{open ? '▾' : '▸'}</span>{sj.name}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">{byClass.size}</td>
                                                    <td className="px-4 py-2 text-sm text-green-700 font-medium">{cls.complete}</td>
                                                    <td className="px-4 py-2 text-sm text-amber-700 font-medium">{cls.partial}</td>
                                                    <td className="px-4 py-2 text-sm text-red-700 font-medium">{cls.missing}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">{sj.units.length}</td>
                                                    <td className="px-4 py-2 text-sm text-green-700 font-medium">{sub.complete}</td>
                                                    <td className="px-4 py-2 text-sm text-amber-700 font-medium">{sub.partial}</td>
                                                    <td className="px-4 py-2 text-sm text-red-700 font-medium">{sub.missing}</td>
                                                </tr>
                                                {open && (
                                                    <tr className="bg-gray-50">
                                                        <td colSpan={9} className="px-4 py-3 space-y-3">
                                                            {[...byClass.entries()].map(([className, us]) => (
                                                                <div key={className}>
                                                                    <div className="flex items-center gap-2 mb-1 text-sm font-medium text-gray-800">
                                                                        {className} <StatusChip status={groupStatus(us)} />
                                                                    </div>
                                                                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                                        {us.map(u => (
                                                                            <li key={u.subClassId} className="flex items-center justify-between gap-2 bg-white rounded border border-gray-200 px-3 py-2 text-sm">
                                                                                <span className="text-gray-800">{u.subClassName}</span>
                                                                                <span className="flex items-center gap-2 shrink-0">
                                                                                    <span className="text-xs text-gray-500">{u.submitted}/{u.total}</span>
                                                                                    <StatusChip status={u.status} />
                                                                                </span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                    {subjects.length === 0 && (
                                        <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-gray-500">No subjects to show.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
