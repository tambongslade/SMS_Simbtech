'use client'
import React from 'react';
import type { ParentUser, StudentLinkInfo, SubClassFilterInfo } from '../hooks/useParentsManagement';

interface LinkStudentModalProps {
    parentUser: ParentUser;
    allStudents: StudentLinkInfo[];
    selectedStudent: string; // Store student ID as string
    setSelectedStudent: (studentId: string) => void;
    onClose: () => void;
    onLink: () => Promise<void>; // Or () => void if not async
    isLoading: boolean;
    studentsLoading: boolean; // Specific loading state for the student list

    // Filters
    studentNameFilter: string;
    setStudentNameFilter: (name: string) => void;
    studentSubClassFilter: string;
    setStudentSubClassFilter: (subClassId: string) => void;
    subClassesForFilter: SubClassFilterInfo[];
    // Function to trigger student fetch, typically used by filter changes in the hook
    // fetchStudents: (name: string, subClassId: string) => void; 
}

export const LinkStudentModal: React.FC<LinkStudentModalProps> = ({
    parentUser,
    allStudents,
    selectedStudent,
    setSelectedStudent,
    onClose,
    onLink,
    isLoading,
    studentsLoading,
    studentNameFilter,
    setStudentNameFilter,
    studentSubClassFilter,
    setStudentSubClassFilter,
    subClassesForFilter,
    // fetchStudents
}) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLink();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Link Student to: {parentUser.name}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading || studentsLoading}>
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Filter Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b">
                    <div>
                        <label htmlFor="student-name-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Filter by Student Name:
                        </label>
                        <input
                            type="text"
                            id="student-name-filter"
                            value={studentNameFilter}
                            onChange={(e) => setStudentNameFilter(e.target.value)}
                            placeholder="Enter student name..."
                            className="mt-1 block w-full input-field"
                            disabled={studentsLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="student-subclass-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Filter by Subclass:
                        </label>
                        <select
                            id="student-subclass-filter"
                            value={studentSubClassFilter}
                            onChange={(e) => setStudentSubClassFilter(e.target.value)}
                            className="mt-1 block w-full input-field bg-white"
                            disabled={studentsLoading || subClassesForFilter.length === 0}
                        >
                            <option value="all">All Subclasses</option>
                            {subClassesForFilter.map((sc) => (
                                <option key={sc.id} value={String(sc.id)}>
                                    {sc.name} {sc.className ? `(${sc.className})` : ''}
                                </option>
                            ))}
                            {subClassesForFilter.length === 0 && <option disabled>Loading subclasses...</option>}
                        </select>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="student-to-link" className="block text-sm font-medium text-gray-700 mb-1">
                            Select Student to Link (Matching Filters):
                        </label>
                        <select
                            id="student-to-link"
                            value={selectedStudent}
                            onChange={(e) => setSelectedStudent(e.target.value)}
                            required
                            className="mt-1 block w-full input-field bg-white h-48" // Increased height for better UX
                            disabled={isLoading || studentsLoading || allStudents.length === 0}
                            multiple={false} // Ensure it's not a multi-select by accident
                            size={5} // Show a few items to indicate it's a list
                        >
                            {/* <option value="" disabled>Select a student...</option> */}
                            {studentsLoading && <option disabled>Loading students...</option>}
                            {!studentsLoading && allStudents.length === 0 && studentNameFilter &&
                                <option disabled>No students match "{studentNameFilter}"{studentSubClassFilter !== 'all' ? ' in selected subclass' : ''}.</option>
                            }
                            {!studentsLoading && allStudents.length === 0 && !studentNameFilter && studentSubClassFilter !== 'all' &&
                                <option disabled>No students found in selected subclass.</option>
                            }
                            {!studentsLoading && allStudents.length === 0 && !studentNameFilter && studentSubClassFilter === 'all' &&
                                <option disabled>Type a name or select a subclass to search.</option>
                            }
                            {allStudents.map((student) => (
                                <option key={student.id} value={String(student.id)}>
                                    {student.name} {student.matricule ? `(${student.matricule})` : ''} (ID: {student.id})
                                </option>
                            ))}
                        </select>
                        {studentsLoading && <p className="text-xs text-gray-500 mt-1">Searching for students...</p>}
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                            disabled={isLoading || studentsLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={isLoading || studentsLoading || !selectedStudent}
                        >
                            {isLoading ? 'Linking...' : 'Link Selected Student'}
                        </button>
                    </div>
                </form>
                {/* Simple CSS for input fields - Can be moved to a global CSS file or Tailwind configured */}
                <style jsx>{`
         .input-field {
             border: 1px solid #d1d5db; /* border-gray-300 */
             border-radius: 0.375rem; /* rounded-md */
             box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
             padding: 0.5rem 0.75rem; /* py-2 px-3 */
         }
         .input-field:focus {
             outline: none;
             box-shadow: 0 0 0 2px #3b82f6; /* focus:ring-2 focus:ring-blue-500 */
             border-color: #3b82f6; /* focus:border-blue-500 */
         }
        `}</style>
            </div>
        </div>
    );
}; 