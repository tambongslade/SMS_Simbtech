'use client'
import React from 'react';
import type { ParentUser, StudentLinkInfo } from '../hooks/useParentsManagement';
import { TrashIcon, UserCircleIcon } from '@heroicons/react/24/outline';

interface ViewStudentsModalProps {
    parentUser: ParentUser;
    linkedStudents: StudentLinkInfo[];
    isLoading: boolean; // For the list loading & unlink action
    onClose: () => void;
    onUnlinkStudent: (studentId: number, parentUser: ParentUser) => Promise<void>;
}

export const ViewStudentsModal: React.FC<ViewStudentsModalProps> = ({
    parentUser,
    linkedStudents,
    isLoading,
    onClose,
    onUnlinkStudent,
}) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-xl shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Students Linked to: {parentUser.name}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading}>
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {isLoading && linkedStudents.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-gray-500 italic">Loading linked students...</p>
                    </div>
                )}

                {!isLoading && linkedStudents.length === 0 && (
                    <div className="text-center py-4">
                        <p className="text-gray-500">No students currently linked to this parent.</p>
                    </div>
                )}

                {linkedStudents.length > 0 && (
                    <ul className="space-y-3 max-h-80 overflow-y-auto mb-6 pr-2">
                        {linkedStudents.map(student => (
                            <li key={student.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50">
                                <div className="flex items-center">
                                    <UserCircleIcon className="h-7 w-7 text-gray-400 mr-2 flex-shrink-0" />
                                    <div>
                                        <span className="text-sm font-medium text-gray-800">{student.name}</span>
                                        {student.matricule && <span className="text-xs text-gray-500 block">Matricule: {student.matricule}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onUnlinkStudent(student.id, parentUser)}
                                    className="text-red-500 hover:text-red-700 text-xs font-semibold disabled:opacity-50 p-1 rounded hover:bg-red-50 flex items-center"
                                    title="Unlink Student"
                                    disabled={isLoading}
                                >
                                    <TrashIcon className="h-4 w-4 mr-1" />
                                    Unlink
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                        disabled={isLoading}
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}; 