'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import MarksManagementTabs from '../components/MarksManagementTabs';
import { useMarksManagementFilters } from '../hooks/useMarksManagementFilters';

// --- Types (mirror GET /exams/:id/missing-marks, camelCased) ---
type MissingStudent = {
    studentId: number;
    name: string;
    matricule: string | null;
    noMarksAtAll: boolean;
    missingSubjects: { subjectId: number; subjectName: string }[];
};

type MissingClass = {
    subClassId: number;
    subClassName: string;
    className: string;
    totalStudents: number;
    subjectCount: number;
    students: MissingStudent[];
};

type MissingResult = {
    examSequence: { id: number; sequenceNumber: number; status: string };
    totalStudentsMissing: number;
    classes: MissingClass[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

export default function MissingMarksPage() {
    const [yearId, setYearId] = useState<number | ''>('');
    const [sequenceId, setSequenceId] = useState<number | ''>('');
    const [subClassId, setSubClassId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    const { derivedExamSequences, currentYearId, getOngoingSequenceId, isLoadingFilters, filterError } =
        useMarksManagementFilters(yearId, '');
    const examSequences = useMemo(
        () => [...derivedExamSequences].sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0)),
        [derivedExamSequences],
    );

    useEffect(() => { if (yearId === '' && currentYearId !== '') setYearId(currentYearId); }, [yearId, currentYearId]);
    useEffect(() => {
        if (sequenceId === '' && yearId !== '' && derivedExamSequences.length) setSequenceId(getOngoingSequenceId(yearId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [yearId, derivedExamSequences.length]);

    const { data, error, isLoading } = useSWR<{ success: boolean; data: MissingResult }>(
        sequenceId ? `${API_BASE_URL}/exams/${sequenceId}/missing-marks` : null,
    );
    const classes = useMemo(() => data?.data?.classes ?? [], [data]);

    const needle = search.trim().toLowerCase();
    const shown = useMemo(() => classes
        .filter(c => subClassId === '' || c.subClassId === subClassId)
        .map(c => ({
            ...c,
            students: needle
                ? c.students.filter(s => s.name.toLowerCase().includes(needle) || (s.matricule ?? '').toLowerCase().includes(needle))
                : c.students,
        }))
        .filter(c => c.students.length > 0), [classes, subClassId, needle]);
    const shownCount = shown.reduce((n, c) => n + c.students.length, 0);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Marks Management</h1>
            <MarksManagementTabs />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-white rounded shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exam Sequence</label>
                    <select
                        value={sequenceId}
                        onChange={e => { setSequenceId(Number(e.target.value) || ''); setSubClassId(''); }}
                        disabled={isLoadingFilters}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 sm:text-sm rounded-md disabled:bg-gray-100"
                    >
                        <option value="">{isLoadingFilters ? 'Loading...' : 'Select Exam Sequence'}</option>
                        {examSequences.map(s => (
                            <option key={s.id} value={s.id}>
                                {s.name || `Sequence ${s.sequenceNumber}`}{s.status && s.status !== 'OPEN' ? ' - closed' : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <select
                        value={subClassId}
                        onChange={e => setSubClassId(Number(e.target.value) || '')}
                        disabled={!classes.length}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 sm:text-sm rounded-md disabled:bg-gray-100"
                    >
                        <option value="">All classes</option>
                        {classes.map(c => (
                            <option key={c.subClassId} value={c.subClassId}>{c.subClassName} ({c.students.length})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search student</label>
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Name or matricule"
                        className="mt-1 block w-full px-3 py-2 text-base border border-gray-300 sm:text-sm rounded-md"
                    />
                </div>
            </div>

            {filterError && <p className="text-red-500 mb-4">{filterError}</p>}
            {error && <p className="text-red-500 mb-4">Could not load the list: {(error as Error).message}</p>}

            {isLoading && (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            )}

            {!isLoading && !sequenceId && (
                <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">Select an exam sequence.</div>
            )}

            {!isLoading && data?.data && (
                <>
                    <p className="text-sm text-gray-700 mb-3">
                        <strong>{shownCount}</strong> student{shownCount === 1 ? '' : 's'} with missing marks
                        {(subClassId !== '' || needle) ? ` (of ${data.data.totalStudentsMissing} in the school)` : ''}.
                        Only subjects on the class timetable are counted; withdrawn students are left out. From Form 4 upwards a subject without a mark means the student does not take it, so only students with no marks at all are listed.
                    </p>
                    {shown.length === 0 && (
                        <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
                            {classes.length === 0 ? 'Every student has marks in every subject.' : 'No student matches.'}
                        </div>
                    )}
                    {shown.map(c => (
                        <div key={c.subClassId} className="mb-6 bg-white shadow rounded-lg overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="font-semibold text-gray-900">{c.subClassName}</h2>
                                <span className="text-xs text-gray-600">
                                    {c.students.length} of {c.totalStudents} students incomplete · {c.subjectCount} subjects
                                </span>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {c.students.map((s, i) => (
                                    <li key={s.studentId} className="px-4 py-3">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="text-sm font-medium text-gray-900">{i + 1}. {s.name}</span>
                                            <span className="text-xs text-gray-500">{s.matricule || 'N/A'}</span>
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                                            {s.noMarksAtAll && (
                                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-white">No marks in any subject</span>
                                            )}
                                            {!s.noMarksAtAll && s.missingSubjects.map(m => (
                                                <span key={m.subjectId} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    {m.subjectName}
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
