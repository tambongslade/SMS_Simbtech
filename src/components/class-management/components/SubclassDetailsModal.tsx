import React from 'react';
import { SubClass } from '../types/class';
import { XMarkIcon, AcademicCapIcon, UserGroupIcon, BookOpenIcon, UserIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

interface SubclassDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    subclass: SubClass | null;
    onManageSubjects?: (subclass: SubClass) => void;
    onAssignClassMaster?: (subclass: SubClass) => void;
    isLoadingSubjects?: boolean;
}

export function SubclassDetailsModal({ isOpen, onClose, subclass, onManageSubjects, onAssignClassMaster, isLoadingSubjects }: SubclassDetailsModalProps) {
    if (!isOpen || !subclass) return null;

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
                className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <AcademicCapIcon className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{subclass.name}</h2>
                                <p className="text-sm text-gray-600 mt-1">Subclass Details</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                                <UserGroupIcon className="h-5 w-5 mr-2 text-gray-600" />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Subclass ID</label>
                                    <p className="text-sm text-gray-900 font-mono">{subclass.id}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Class ID</label>
                                    <p className="text-sm text-gray-900 font-mono">{subclass.classId}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500">Student Count</label>
                                    <p className="text-sm text-gray-900">{subclass.studentCount || 0} students</p>
                                </div>
                            </div>
                        </div>

                        {/* Class Master Information */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                                    Class Master
                                </h3>
                                {onAssignClassMaster && (
                                    <button
                                        onClick={() => onAssignClassMaster(subclass)}
                                        className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors flex items-center"
                                        title={subclass.classMasterName ? "Change Class Master" : "Assign Class Master"}
                                    >
                                        {subclass.classMasterName ? (
                                            <>
                                                <PencilIcon className="h-4 w-4 mr-1" />
                                                Change
                                            </>
                                        ) : (
                                            <>
                                                <PlusIcon className="h-4 w-4 mr-1" />
                                                Assign
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                            {subclass.classMasterName ? (
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <UserIcon className="h-6 w-6 text-blue-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{subclass.classMasterName}</p>
                                        <p className="text-xs text-gray-500">Master ID: {subclass.classMasterId}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-3 text-gray-500">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <UserIcon className="h-6 w-6 text-gray-400" />
                                        </div>
                                    </div>
                                    <p className="text-sm italic">No class master assigned</p>
                                </div>
                            )}
                        </div>

                        {/* Subjects */}
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <BookOpenIcon className="h-5 w-5 mr-2 text-green-600" />
                                    Subjects ({subclass.subjects?.length || 0})
                                </h3>
                                {onManageSubjects && (
                                    <button
                                        onClick={() => onManageSubjects(subclass)}
                                        className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition-colors flex items-center"
                                        title="Manage Subjects"
                                    >
                                        <BookOpenIcon className="h-4 w-4 mr-1" />
                                        Manage
                                    </button>
                                )}
                            </div>
                            {isLoadingSubjects ? (
                                <div className="text-center py-6">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                                    <p className="text-sm text-gray-500 mt-2">Loading subjects...</p>
                                </div>
                            ) : subclass.subjects && subclass.subjects.length > 0 ? (
                                <div className="space-y-2">
                                    {subclass.subjects.map((subject, index) => (
                                        <div key={subject.id || index} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-green-200">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                                <span className="text-sm font-medium text-gray-900">{subject.name}</span>
                                            </div>
                                            {('coefficient' in subject) && (
                                                <div className="flex items-center space-x-1 bg-green-100 rounded-md px-2 py-1">
                                                    <span className="text-xs font-medium text-green-700">Coeff:</span>
                                                    <span className="text-sm font-bold text-green-800 bg-white rounded px-2 py-0.5 min-w-[24px] text-center">
                                                        {(subject as any).coefficient}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <BookOpenIcon className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="text-sm text-gray-500 mt-2">No subjects assigned</p>
                                </div>
                            )}
                        </div>

                        {/* Statistics */}
                        <div className="bg-yellow-50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Statistics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-600">{subclass.studentCount || 0}</div>
                                    <div className="text-xs text-gray-500">Students</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">{subclass.subjects?.length || 0}</div>
                                    <div className="text-xs text-gray-500">Subjects</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-600">{subclass.classMasterName ? 1 : 0}</div>
                                    <div className="text-xs text-gray-500">Class Master</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 