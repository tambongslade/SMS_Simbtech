'use client'
import React from 'react';
import { UserIcon, MagnifyingGlassIcon, AcademicCapIcon, IdentificationIcon } from '@heroicons/react/24/outline';
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
}) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLink();
    };

    const selectedStudentInfo = allStudents.find(student => String(student.id) === selectedStudent);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto border w-full max-w-4xl h-[80vh] shadow-2xl rounded-xl bg-white flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 rounded-t-xl">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                                <UserIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-white">
                                    Link Student to Parent
                                </h3>
                                <p className="text-blue-100 text-sm">
                                    Connect a student to: <span className="font-medium">{parentUser.name}</span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-blue-200 transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-lg"
                            disabled={isLoading || studentsLoading}
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {/* Search & Filter Section */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6">
                        <div className="flex items-center space-x-2 mb-4">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
                            <h4 className="text-lg font-medium text-gray-900">Find Student</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Use the filters below to search for the student you want to link to this parent.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="student-name-filter" className="block text-sm font-medium text-gray-700 mb-2">
                                    <IdentificationIcon className="h-4 w-4 inline mr-1" />
                                    Student Name
                                </label>
                                <input
                                    type="text"
                                    id="student-name-filter"
                                    value={studentNameFilter}
                                    onChange={(e) => setStudentNameFilter(e.target.value)}
                                    placeholder="Type student's name..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    disabled={studentsLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="student-subclass-filter" className="block text-sm font-medium text-gray-700 mb-2">
                                    <AcademicCapIcon className="h-4 w-4 inline mr-1" />
                                    Class Filter
                                </label>
                                <select
                                    id="student-subclass-filter"
                                    value={studentSubClassFilter}
                                    onChange={(e) => setStudentSubClassFilter(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
                                    disabled={studentsLoading || subClassesForFilter.length === 0}
                                >
                                    <option value="all">All Classes</option>
                                    {subClassesForFilter.map((sc) => (
                                        <option key={sc.id} value={String(sc.id)}>
                                            {sc.name} {sc.className ? `(${sc.className})` : ''}
                                        </option>
                                    ))}
                                    {subClassesForFilter.length === 0 && <option disabled>Loading classes...</option>}
                                </select>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Student Selection Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label htmlFor="student-to-link" className="text-lg font-medium text-gray-900">
                                    Choose Student to Link
                                </label>
                                <span className="text-sm text-gray-500">
                                    {studentsLoading ? (
                                        <span className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            Searching...
                                        </span>
                                    ) : (
                                        `${allStudents.length} student${allStudents.length !== 1 ? 's' : ''} found`
                                    )}
                                </span>
                            </div>

                            {/* Student Selection Area */}
                            <div className="border border-gray-300 rounded-lg overflow-hidden">
                                {studentsLoading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                        <p className="text-gray-600">Searching for students...</p>
                                    </div>
                                ) : allStudents.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-content">
                                            <UserIcon className="h-8 w-8 text-gray-400 mx-auto" />
                                        </div>
                                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h4>
                                        {studentNameFilter && studentSubClassFilter !== 'all' ? (
                                            <p className="text-gray-600">No students match "<span className="font-medium">{studentNameFilter}</span>" in the selected class.</p>
                                        ) : studentNameFilter ? (
                                            <p className="text-gray-600">No students found matching "<span className="font-medium">{studentNameFilter}</span>".</p>
                                        ) : studentSubClassFilter !== 'all' ? (
                                            <p className="text-gray-600">No students found in the selected class.</p>
                                        ) : (
                                            <p className="text-gray-600">Use the search filters above to find students.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-64 overflow-y-auto">
                                        {allStudents.map((student) => (
                                            <label
                                                key={student.id}
                                                className={`flex items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${String(student.id) === selectedStudent ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="selectedStudent"
                                                    value={String(student.id)}
                                                    checked={String(student.id) === selectedStudent}
                                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <div className="ml-4 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-lg font-medium text-gray-900">{student.name}</p>
                                                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                                                {student.matricule && (
                                                                    <span className="flex items-center">
                                                                        <IdentificationIcon className="h-4 w-4 mr-1" />
                                                                        {student.matricule}
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center">
                                                                    <AcademicCapIcon className="h-4 w-4 mr-1" />
                                                                    Class information
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {String(student.id) === selectedStudent && (
                                                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                                                                Selected
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Selected Student Summary */}
                        {selectedStudentInfo && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="bg-green-100 rounded-full p-2 mr-3">
                                        <UserIcon className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-green-800">Selected Student:</p>
                                        <p className="text-green-700">
                                            <span className="font-medium">{selectedStudentInfo.name}</span>
                                            {selectedStudentInfo.matricule && ` (${selectedStudentInfo.matricule})`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                disabled={isLoading || studentsLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                disabled={isLoading || studentsLoading || !selectedStudent}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Linking Student...
                                    </>
                                ) : (
                                    <>
                                        <UserIcon className="h-4 w-4 mr-2" />
                                        Link Student to Parent
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}; 