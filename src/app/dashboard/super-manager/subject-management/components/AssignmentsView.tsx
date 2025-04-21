import React, { useState, useMemo } from 'react';
import { Subject, SubjectAssignment } from '../types/subject';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
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
    onAssignSubject: (subjectId: number, subClassId: number, coefficient: number) => Promise<void>;
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
    filterSubjectId,
    apiBaseUrl,
    getAuthToken,
}) => {
    const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
    const [selectedSubClassId, setSelectedSubClassId] = useState<number | ''>('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

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
                  <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                                     <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
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