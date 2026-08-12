'use client';

import React, { useEffect, useState } from 'react';
import type { TeacherSearchItem, TeacherSubjectBrief } from '@/lib/teacherSearchApi';

interface AssignSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (teacherId: number, selectedSubjectIds: number[]) => Promise<void>;
    teacher: TeacherSearchItem | null;
    allSubjects: TeacherSubjectBrief[];
    isLoading: boolean;
}

export const AssignSubjectsModal: React.FC<AssignSubjectsModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    teacher,
    allSubjects,
    isLoading,
}) => {
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<number>>(new Set());
    const [subjectFilter, setSubjectFilter] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setSubjectFilter('');
        setSelectedSubjectIds(new Set((teacher?.subjects ?? []).map((s) => s.id)));
    }, [isOpen, teacher]);

    if (!isOpen || !teacher) return null;

    const toggle = (subjectId: number, isChecked: boolean) => {
        setSelectedSubjectIds((prev) => {
            const next = new Set(prev);
            if (isChecked) next.add(subjectId);
            else next.delete(subjectId);
            return next;
        });
    };

    const term = subjectFilter.trim().toLowerCase();
    const visibleSubjects = term
        ? allSubjects.filter((s) => s.name.toLowerCase().includes(term))
        : allSubjects;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(teacher.id, Array.from(selectedSubjectIds));
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold"
                    aria-label="Close"
                >
                    &times;
                </button>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold">Assign Subjects to {teacher.name}</h2>

                    <input
                        type="search"
                        placeholder="Filter subjects…"
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                        {visibleSubjects.length > 0 ? (
                            visibleSubjects.map((subject) => (
                                <div key={subject.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`assign-subject-${subject.id}`}
                                        checked={selectedSubjectIds.has(subject.id)}
                                        onChange={(e) => toggle(subject.id, e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        disabled={isLoading}
                                    />
                                    <label
                                        htmlFor={`assign-subject-${subject.id}`}
                                        className="ml-2 block text-sm text-gray-900"
                                    >
                                        {subject.name}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">No subjects match this filter.</p>
                        )}
                    </div>

                    <p className="text-xs text-gray-500">{selectedSubjectIds.size} subject(s) selected.</p>

                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Saving…' : 'Save Assignments'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
