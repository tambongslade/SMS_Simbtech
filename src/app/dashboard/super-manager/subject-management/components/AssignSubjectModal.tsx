import React, { useState, useEffect } from 'react';
import { Subject } from '../types/subject';
import { toast } from 'react-hot-toast';

// Assuming Class/SubClass types similar to classes/page.tsx
// You might want to move these to a shared types folder
type SubClassBrief = {
    id: number;
    name: string;
};
type ClassBrief = {
    id: number;
    name: string;
    subClasses: SubClassBrief[];
};

interface AssignSubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (subjectId: number, subClassId: number, coefficient: number) => Promise<boolean>;
    subject: Subject | null;
    allSubjects: Subject[];
    allClasses: ClassBrief[];
    isLoading: boolean;
    apiBaseUrl: string;
    getAuthToken: () => string | null;
}

export const AssignSubjectModal: React.FC<AssignSubjectModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    subject,
    allSubjects,
    allClasses,
    isLoading: isOverallLoading,
    apiBaseUrl,
    getAuthToken,
}) => {
    const [classes, setClasses] = useState<ClassBrief[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(subject ? subject.id : null);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [selectedSubclassIds, setSelectedSubclassIds] = useState<number[]>([]);
    const [coefficient, setCoefficient] = useState<number | null>(subject ? subject.coefficient || null : null);
    const [isFetchingClasses, setIsFetchingClasses] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchClassesAndSubclasses();
            setSelectedClassId(null);
            setSelectedSubclassIds([]);
            setCoefficient(null);
            if (!subject) {
                setSelectedSubjectId(null);
            }
            setIsSubmitting(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, subject]);

    const fetchClassesAndSubclasses = async () => {
        setIsFetchingClasses(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication token not found.");
            setIsFetchingClasses(false);
            return;
        }
        try {
            setClasses(allClasses);
        } catch (error: any) {
            toast.error(`Could not load classes: ${error.message}`);
            setClasses([]);
        } finally {
            setIsFetchingClasses(false);
        }
    };

    const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const classId = e.target.value ? Number(e.target.value) : null;
        setSelectedClassId(classId);
        setSelectedSubclassIds([]);
    };

    // Handle checkbox change for subclasses
    const handleSubclassCheckboxChange = (subClassId: number, isChecked: boolean) => {
        setSelectedSubclassIds(prevIds => {
            if (isChecked) {
                // Add ID if checked and not already present
                return prevIds.includes(subClassId) ? prevIds : [...prevIds, subClassId];
            } else {
                // Remove ID if unchecked
                return prevIds.filter(id => id !== subClassId);
            }
        });
    };

    const handleCoefficientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setCoefficient(null);
        } else {
            const numValue = Number(value);
            if (numValue > 0) {
                setCoefficient(numValue);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const subjectIdToSubmit = subject?.id || selectedSubjectId;

        if (subjectIdToSubmit === null || selectedSubclassIds.length === 0 || coefficient === null || Number(coefficient) <= 0) {
            toast.error('Please select a subject, at least one subclass, and enter a valid positive coefficient.');
            return;
        }

        setIsSubmitting(true);
        const submissionPromises = selectedSubclassIds.map(subClassId =>
            onSubmit(Number(subjectIdToSubmit), subClassId, Number(coefficient))
        );

        try {
            const results = await Promise.allSettled(submissionPromises);

            const successfulAssignments = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
            const failedAssignments = results.length - successfulAssignments;

            if (successfulAssignments > 0) {
                toast.success(`Successfully assigned subject to ${successfulAssignments} subclass(es).`);
            }
            if (failedAssignments > 0) {
                toast.error(`Failed to assign subject to ${failedAssignments} subclass(es). Check console or existing assignments.`);
                console.error("Failed assignment details:", results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === false)));
            }

            if (successfulAssignments > 0) {
                onClose();
            }
        } catch (error) {
            console.error("Unexpected error during submission:", error);
            toast.error("An unexpected error occurred during assignment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableSubclasses = classes.find(c => c.id === selectedClassId)?.subClasses || [];

    const isFormIncomplete = (
        selectedSubjectId === null ||
        selectedClassId === null ||
        selectedSubclassIds.length === 0 ||
        coefficient === null ||
        Number(coefficient) <= 0
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <button onClick={onClose} disabled={isSubmitting} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50">&times;</button>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Assign Subject to Subclass(es)</h2>
                    {subject ? (
                        <p className="mb-4">Assigning: <span className="font-medium">{subject.name}</span></p>
                    ) : (
                         <div>
                            <label htmlFor="subjectSelect" className="block text-sm font-medium text-gray-700">Select Subject</label>
                            <select
                                id="subjectSelect"
                                value={selectedSubjectId || ''}
                                onChange={(e) => setSelectedSubjectId(Number(e.target.value) || null)}
                                required
                                disabled={isSubmitting || isOverallLoading}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                            >
                                <option value="" disabled>-- Select a Subject --</option>
                                {allSubjects.map((subj) => (
                                    <option key={subj.id} value={subj.id}>{subj.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="classSelect" className="block text-sm font-medium text-gray-700">Select Class</label>
                        <select
                            id="classSelect"
                            value={selectedClassId || ''}
                            onChange={handleClassChange}
                            disabled={isFetchingClasses || isSubmitting || isOverallLoading}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                        >
                            <option value="" disabled>{isFetchingClasses ? 'Loading Classes...' : '-- Select a Class --'}</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subclass Multi-Selection (Checkboxes) */}
                    {selectedClassId !== null && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Subclass(es)</label>
                            {availableSubclasses.length === 0 ? (
                                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">This class has no subclasses defined.</p>
                            ) : (
                                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 space-y-1 bg-white">
                                    {availableSubclasses.map((sub) => (
                                        <div key={sub.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`subclass-${sub.id}`}
                                                value={sub.id}
                                                checked={selectedSubclassIds.includes(sub.id)}
                                                onChange={(e) => handleSubclassCheckboxChange(sub.id, e.target.checked)}
                                                disabled={isSubmitting || isOverallLoading}
                                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <label
                                                htmlFor={`subclass-${sub.id}`}
                                                className="ml-2 block text-sm text-gray-700 cursor-pointer"
                                            >
                                                {sub.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label htmlFor="coefficient" className="block text-sm font-medium text-gray-700">Coefficient</label>
                        <input
                            type="number"
                            id="coefficient"
                            name="coefficient"
                            value={coefficient === null ? '' : coefficient.toString()}
                            onChange={handleCoefficientChange}
                            required
                            min="1"
                            step="1"
                            disabled={isSubmitting || isOverallLoading}
                            placeholder="e.g., 4"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isFetchingClasses || isFormIncomplete || isOverallLoading}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:bg-green-300"
                        >
                            {isSubmitting ? 'Assigning...' : `Assign to ${selectedSubclassIds.length} Subclass(es)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 