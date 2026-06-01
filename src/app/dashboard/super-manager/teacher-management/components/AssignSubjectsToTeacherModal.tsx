import React, { useState, useEffect } from 'react';
import { Teacher, SubjectBrief } from '../types/teacher';

interface AssignSubjectsToTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (teacherId: number, selectedSubjectIds: number[]) => Promise<void>;
    teacher: Teacher | null;
    allSubjects: SubjectBrief[];
    isLoading: boolean;
}

export const AssignSubjectsToTeacherModal: React.FC<AssignSubjectsToTeacherModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    teacher,
    allSubjects,
    isLoading,
}) => {
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (isOpen && teacher?.subjects) {
            // Initialize selections based on the teacher's current assignments
            setSelectedSubjectIds(new Set(teacher.subjects.map(s => s.id)));
        } else if (isOpen) {
            setSelectedSubjectIds(new Set()); // Reset if no teacher or no subjects
        }
    }, [isOpen, teacher]);

    const handleCheckboxChange = (subjectId: number, isChecked: boolean) => {
        setSelectedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(subjectId);
            } else {
                newSet.delete(subjectId);
            }
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacher) return;
        await onSubmit(teacher.id, Array.from(selectedSubjectIds));
    };

    if (!isOpen || !teacher) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Assign Subjects to {teacher.name}</h2>

                    <div className="max-h-60 overflow-y-auto border rounded-md p-3 space-y-2">
                        {allSubjects.length > 0 ? (
                            allSubjects.map(subject => (
                                <div key={subject.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`subject-${subject.id}`}
                                        checked={selectedSubjectIds.has(subject.id)}
                                        onChange={(e) => handleCheckboxChange(subject.id, e.target.checked)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        disabled={isLoading}
                                    />
                                    <label htmlFor={`subject-${subject.id}`} className="ml-2 block text-sm text-gray-900">
                                        {subject.name}
                                    </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">No subjects available to assign.</p>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
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
                            {isLoading ? 'Saving...' : 'Save Assignments'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 