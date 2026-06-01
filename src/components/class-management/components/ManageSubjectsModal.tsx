
import { useState, useEffect, useMemo } from 'react';

type Subject = {
    id: number;
    name: string;
    // Add other subject properties as needed
};

type AssignedSubject = Subject & {
    coefficient: number;
};


interface ManageSubjectsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selectedSubjects: { subjectId: number; coefficient: number }[]) => void;
    allSubjects: Subject[];
    assignedSubjects: AssignedSubject[];
    targetName: string; // Name of the class or subclass
    isLoading: boolean;
}

export function ManageSubjectsModal({
    isOpen,
    onClose,
    onSave,
    allSubjects,
    assignedSubjects,
    targetName,
    isLoading,
}: ManageSubjectsModalProps) {
    const [selected, setSelected] = useState<Map<number, { selected: boolean; coefficient: number }>>(new Map());

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const initialSelection = new Map();
        allSubjects.forEach(subject => {
            const assignment = assignedSubjects.find(as => as.id === subject.id);
            initialSelection.set(subject.id, {
                selected: !!assignment,
                coefficient: assignment?.coefficient || 1, // Default coefficient to 1
            });
        });
        setSelected(initialSelection);
    }, [allSubjects, assignedSubjects, isOpen]);

    // Sort subjects: assigned ones first, then unassigned ones
    const sortedSubjects = useMemo(() => {
        return [...allSubjects].sort((a, b) => {
            const aSelected = selected.get(a.id)?.selected || false;
            const bSelected = selected.get(b.id)?.selected || false;

            // If both are selected or both are unselected, sort by name
            if (aSelected === bSelected) {
                return a.name.localeCompare(b.name);
            }

            // Selected subjects come first
            return bSelected ? 1 : -1;
        });
    }, [allSubjects, selected]);

    const handleToggle = (subjectId: number) => {
        setSelected(prev => {
            const newSelection = new Map(prev);
            const current = newSelection.get(subjectId);
            if (current) {
                newSelection.set(subjectId, { ...current, selected: !current.selected });
            }
            return newSelection;
        });
    };

    const handleCoefficientChange = (subjectId: number, coefficient: string) => {
        const coeffAsNumber = parseInt(coefficient, 10);
        if (!isNaN(coeffAsNumber) && coeffAsNumber >= 1 && coeffAsNumber <= 10) {
            setSelected(prev => {
                const newSelection = new Map(prev);
                const current = newSelection.get(subjectId);
                if (current) {
                    newSelection.set(subjectId, { ...current, coefficient: coeffAsNumber });
                }
                return newSelection;
            });
        }
    };

    const handleSave = () => {
        const subjectsToSave = Array.from(selected.entries())
            .filter(([, { selected }]) => selected)
            .map(([subjectId, { coefficient }]) => ({ subjectId, coefficient }));
        onSave(subjectsToSave);
    };

    // Calculate totals for summary
    const assignedCount = Array.from(selected.values()).filter(item => item.selected).length;
    const totalCount = allSubjects.length;

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center p-4 overflow-hidden"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Manage Subjects for {targetName}</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {assignedCount} of {totalCount} subjects assigned
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isLoading}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content - THIS IS THE SCROLLABLE AREA */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Assigned Subjects Section */}
                    {assignedCount > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Assigned Subjects ({assignedCount})
                            </h3>
                            <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-green-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider w-20 min-w-[80px]">Assigned</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider min-w-[200px]">Subject Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-green-800 uppercase tracking-wider w-32 min-w-[128px]">Coefficient</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-green-200">
                                            {sortedSubjects
                                                .filter(subject => selected.get(subject.id)?.selected)
                                                .map(subject => {
                                                    const currentSelection = selected.get(subject.id);
                                                    return (
                                                        <tr key={subject.id} className="hover:bg-green-50">
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={true}
                                                                    onChange={() => handleToggle(subject.id)}
                                                                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{subject.name}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="flex items-center space-x-1 bg-gray-50 rounded-md p-1 border border-gray-200">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const current = currentSelection?.coefficient || 1;
                                                                            if (current > 1) {
                                                                                handleCoefficientChange(subject.id, (current - 1).toString());
                                                                            }
                                                                        }}
                                                                        disabled={!currentSelection?.selected || (currentSelection?.coefficient || 1) <= 1}
                                                                        className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                        title="Decrease coefficient"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                        </svg>
                                                                    </button>
                                                                    <span className="w-8 text-center text-sm font-semibold text-gray-900 bg-white rounded border px-1 py-0.5">
                                                                        {currentSelection?.coefficient || 1}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const current = currentSelection?.coefficient || 1;
                                                                            if (current < 10) {
                                                                                handleCoefficientChange(subject.id, (current + 1).toString());
                                                                            }
                                                                        }}
                                                                        disabled={!currentSelection?.selected || (currentSelection?.coefficient || 1) >= 10}
                                                                        className="w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                        title="Increase coefficient"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Available Subjects Section */}
                    {totalCount - assignedCount > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Available Subjects ({totalCount - assignedCount})
                            </h3>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 min-w-[80px]">Select</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">Subject Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 min-w-[128px]">Coefficient</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {sortedSubjects
                                                .filter(subject => !selected.get(subject.id)?.selected)
                                                .map(subject => {
                                                    const currentSelection = selected.get(subject.id);
                                                    return (
                                                        <tr key={subject.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={false}
                                                                    onChange={() => handleToggle(subject.id)}
                                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{subject.name}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1 border border-gray-200 opacity-60">
                                                                    <button
                                                                        type="button"
                                                                        disabled
                                                                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 cursor-not-allowed"
                                                                        title="Select subject to change coefficient"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                                        </svg>
                                                                    </button>
                                                                    <span className="w-8 text-center text-sm font-semibold text-gray-500 bg-white rounded border px-1 py-0.5">
                                                                        {currentSelection?.coefficient || 1}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        disabled
                                                                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 cursor-not-allowed"
                                                                        title="Select subject to change coefficient"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {totalCount === 0 && (
                        <div className="text-center py-8">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No subjects available</h3>
                            <p className="mt-1 text-sm text-gray-500">Create some subjects first before assigning them.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-medium">{assignedCount}</span> subjects will be assigned to <span className="font-medium">{targetName}</span>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Saving...
                                    </div>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 