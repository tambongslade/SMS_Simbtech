import React, { useState, useMemo } from 'react';
import { Subject, SubjectAssignment } from '../types/subject';
import { TrashIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import { AssignSubjectModal } from './AssignSubjectModal';

// Add ClassInfo type here or import from a shared location
type ClassInfo = {
  id: number;
  name: string;
  subClasses: { id: number; name: string }[];
};

interface AssignmentsViewProps {
    subjectsWithAssignments: Subject[];
    allSubjects: Subject[];
    allClasses: ClassInfo[];
    isLoading: boolean;
    onRemoveAssignment: (subjectId: number, subClassId: number) => void;
    onAssignSubject: (subjectId: number, subClassId: number, coefficient: number) => Promise<boolean>;
    onUpdateCoefficient: (subjectId: number, subClassIds: number[], coefficient: number) => Promise<void>;
    filterSubjectId?: number | null;
    apiBaseUrl: string;
    getAuthToken: () => string | null;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
    subjectsWithAssignments,
    allSubjects,
    allClasses,
    isLoading,
    onRemoveAssignment,
    onAssignSubject,
    onUpdateCoefficient,
    filterSubjectId,
    apiBaseUrl,
    getAuthToken,
}) => {
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [selectedSubClassId, setSelectedSubClassId] = useState<number | ''>('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    // Edit-coefficient state
    const [editingAssignment, setEditingAssignment] = useState<(SubjectAssignment & { subjectName: string; subjectId: number }) | null>(null);
    const [editCoefficient, setEditCoefficient] = useState<string>('');
    const [applyToWholeClass, setApplyToWholeClass] = useState(true);
    const [isSavingCoefficient, setIsSavingCoefficient] = useState(false);

    // Flatten the assignments for easier display
    const allAssignments = useMemo(() => {
        return subjectsWithAssignments.reduce((acc, subject) => {
            subject.assignments?.forEach(assignment => {
                acc.push({ ...assignment, subjectName: subject.name, subjectId: subject.id });
            });
            return acc;
        }, [] as (SubjectAssignment & { subjectName: string; subjectId: number })[]);
    }, [subjectsWithAssignments]);

    // Filter assignments based on dropdown selection AND subject filter prop
    const filteredAssignments = useMemo(() => {
        return allAssignments.filter(assignment => {
            const subjectMatch = filterSubjectId === null || assignment.subjectId === filterSubjectId;
            const classMatch = selectedClassId === '' || assignment.classId === selectedClassId;
            const subClassMatch = selectedSubClassId === '' || assignment.subClassId === selectedSubClassId;
            return subjectMatch && classMatch && subClassMatch;
        });
    }, [allAssignments, selectedClassId, selectedSubClassId, filterSubjectId]);

    // Get available subclasses for the selected class filter
    const availableSubclasses = useMemo(() => {
        if (selectedClassId === '') return [];
        return allClasses.find(c => c.id === selectedClassId)?.subClasses || [];
    }, [selectedClassId, allClasses]);

    // Determine the filtered subject object (if any)
    const filteredSubject = useMemo(() => {
        if (filterSubjectId === null) return null;
        return allSubjects.find(s => s.id === filterSubjectId) || null;
    }, [filterSubjectId, allSubjects]);

    // Use the name from the filtered subject object for the title
    const filteredSubjectName = filteredSubject?.name || null;

    const handleClassFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedClassId(e.target.value === '' ? '' : Number(e.target.value));
        setSelectedSubClassId(''); // Reset subclass filter when class changes
    };

    const handleSubClassFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSubClassId(e.target.value === '' ? '' : Number(e.target.value));
    };

    // Modal open/close
    const openAssignModal = () => setIsAssignModalOpen(true);
    const closeAssignModal = () => setIsAssignModalOpen(false);

    // --- Edit coefficient handlers ---
    const openEditModal = (assignment: SubjectAssignment & { subjectName: string; subjectId: number }) => {
        setEditingAssignment(assignment);
        setEditCoefficient(String(assignment.coefficient ?? ''));
        setApplyToWholeClass(true); // Subjects are the same across a class, so class-wide is the default
    };

    const closeEditModal = () => {
        setEditingAssignment(null);
        setEditCoefficient('');
        setIsSavingCoefficient(false);
    };

    // Sibling assignments = same subject assigned in other subclasses of the same class
    const siblingAssignments = useMemo(() => {
        if (!editingAssignment) return [];
        return allAssignments.filter(a =>
            a.subjectId === editingAssignment.subjectId && a.classId === editingAssignment.classId
        );
    }, [editingAssignment, allAssignments]);

    const handleSaveCoefficient = async () => {
        if (!editingAssignment) return;
        const newCoefficient = Number(editCoefficient);
        if (!newCoefficient || newCoefficient <= 0) return;
        const targetSubClassIds = applyToWholeClass
            ? siblingAssignments.map(a => a.subClassId)
            : [editingAssignment.subClassId];
        setIsSavingCoefficient(true);
        try {
            await onUpdateCoefficient(editingAssignment.subjectId, targetSubClassIds, newCoefficient);
            closeEditModal();
        } finally {
            setIsSavingCoefficient(false);
        }
    };

    return (
        <div className="space-y-4">
             {/* Title and Add Button (Always visible) */}
             <div className="flex justify-between items-center mb-0">
                 {filteredSubjectName ? (
                     <h2 className="text-xl font-semibold text-gray-800">
                         Assignments for: <span className="text-indigo-600">{filteredSubjectName}</span>
                     </h2>
                 ) : (
                     <h2 className="text-xl font-semibold text-gray-800">
                         All Subject Assignments
                     </h2>
                 )}
                 {/* Add Assignment Button */}
                 <button
                    onClick={openAssignModal}
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 text-sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-1.5" />
                    Add Assignment
                  </button>
             </div>

             {/* Filter Section (only show if not filtering by a specific subject) */}
             {filterSubjectId === null && (
                 <div className="p-4 bg-white rounded-lg shadow-sm flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label htmlFor="classFilter" className="block text-sm font-medium text-gray-700">Filter by Class</label>
                        <select
                            id="classFilter"
                            value={selectedClassId}
                            onChange={handleClassFilterChange}
                            disabled={isLoading}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                        >
                            <option value="">-- All Classes --</option>
                            {allClasses.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="subClassFilter" className="block text-sm font-medium text-gray-700">Filter by Subclass</label>
                        <select
                            id="subClassFilter"
                            value={selectedSubClassId}
                            onChange={handleSubClassFilterChange}
                            disabled={isLoading || selectedClassId === ''}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                        >
                            <option value="">-- All Subclasses --</option>
                            {availableSubclasses.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                    </div>
                 </div>
             )}

             {/* Conditional Rendering for Table OR Empty State Message */}
             {isLoading ? (
                <p className="text-center text-gray-500 py-4">Loading assignments...</p>
             ) : filteredAssignments.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 bg-white rounded-lg shadow-sm">
                      {filteredSubjectName
                          ? `No assignments found for ${filteredSubjectName}. `
                          : 'No assignments found matching the current filter. '
                      }
                      {filteredSubjectName && (
                          <span className="text-sm">You can add one using the button above.</span>
                      )}
                  </p>
             ) : (
                  // Render the table only if there are assignments
                  <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-100">
                             <tr>
                                 <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Subject</th>
                                 <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Class</th>
                                 <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Subclass</th>
                                 <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Coefficient</th>
                                 <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                             {filteredAssignments.map((assignment) => (
                                 <tr key={`${assignment.subjectId}-${assignment.subClassId}`} className="hover:bg-gray-50">
                                     <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assignment.subjectName}</td>
                                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.className}</td>
                                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{assignment.subClassName}</td>
                                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{assignment.coefficient}</td>
                                     <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                         <button
                                             onClick={() => openEditModal(assignment)}
                                             disabled={isLoading}
                                             title="Edit Coefficient"
                                             className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                         >
                                             <PencilIcon className="h-4 w-4 mr-1" /> Edit
                                         </button>
                                         <button
                                             onClick={() => onRemoveAssignment(assignment.subjectId, assignment.subClassId)}
                                             disabled={isLoading}
                                             title="Remove Assignment"
                                             className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                         >
                                             <TrashIcon className="h-4 w-4 mr-1" /> Remove
                                         </button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                  </div>
             )}

            {/* Edit Coefficient Modal */}
            {editingAssignment && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                    <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
                        <button onClick={closeEditModal} disabled={isSavingCoefficient} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50">&times;</button>
                        <h2 className="text-lg font-semibold mb-1">Edit Coefficient</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            <span className="font-medium">{editingAssignment.subjectName}</span> — {editingAssignment.className} ({editingAssignment.subClassName})
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="editCoefficient" className="block text-sm font-medium text-gray-700">New Coefficient</label>
                                <input
                                    type="number"
                                    id="editCoefficient"
                                    value={editCoefficient}
                                    onChange={(e) => setEditCoefficient(e.target.value)}
                                    min="1"
                                    step="1"
                                    disabled={isSavingCoefficient}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                                />
                            </div>
                            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={applyToWholeClass}
                                    onChange={(e) => setApplyToWholeClass(e.target.checked)}
                                    disabled={isSavingCoefficient}
                                    className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span>
                                    Apply to all <span className="font-medium">{editingAssignment.className}</span> subclasses with this subject
                                    <span className="block text-xs text-gray-500">
                                        {siblingAssignments.length} subclass(es): {siblingAssignments.map(a => a.subClassName).join(', ')}
                                    </span>
                                </span>
                            </label>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={isSavingCoefficient}
                                    className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCoefficient}
                                    disabled={isSavingCoefficient || !editCoefficient || Number(editCoefficient) <= 0}
                                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:bg-indigo-300"
                                >
                                    {isSavingCoefficient
                                        ? 'Saving...'
                                        : applyToWholeClass
                                            ? `Update ${siblingAssignments.length} Subclass(es)`
                                            : 'Update This Subclass'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Subject Modal (Always rendered, visibility controlled by isOpen) */}
            <AssignSubjectModal
                isOpen={isAssignModalOpen}
                onClose={closeAssignModal}
                onSubmit={onAssignSubject}
                subject={filteredSubject} // Pass the specific subject if filtering
                allSubjects={allSubjects}
                allClasses={allClasses}
                isLoading={isLoading}
                apiBaseUrl={apiBaseUrl}
                getAuthToken={getAuthToken}
            />
        </div>
    );
}; 