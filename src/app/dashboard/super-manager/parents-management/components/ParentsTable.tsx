'use client'
import React from 'react';
import { LinkIcon, UserCircleIcon, EyeIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import type { ParentUser } from '../hooks/useParentsManagement'; // Assuming type is exported

interface ParentsTableProps {
    parents: ParentUser[];
    isLoading: boolean;
    onLinkToStudent: (parent: ParentUser) => void;
    onViewStudents: (parent: ParentUser) => void;
    onEditParent: (parent: ParentUser) => void;
}

export const ParentsTable: React.FC<ParentsTableProps> = ({
    parents,
    isLoading,
    onLinkToStudent,
    onViewStudents,
    onEditParent,
}) => {
    if (isLoading && parents.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500 italic">Loading parents...</p>
            </div>
        );
    }

    if (!isLoading && parents.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <p className="text-gray-500">No parents found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {parents.map((parent) => (
                            <tr key={parent.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                                        <div className="text-sm font-medium text-gray-900">{parent.name}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{parent.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{parent.phone || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {parent.username ? (
                                        <span className="text-gray-700">{parent.username}</span>
                                    ) : (
                                        <span className="text-gray-500 italic">empty</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                                    <button
                                        onClick={() => onEditParent(parent)}
                                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                        disabled={isLoading}
                                        title="Edit Parent Details"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onViewStudents(parent)}
                                        className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                                        disabled={isLoading}
                                        title="View Linked Students"
                                    >
                                        View Students
                                    </button>
                                    <button
                                        onClick={() => onLinkToStudent(parent)}
                                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                                        disabled={isLoading}
                                        title="Link Parent to a Student"
                                    >
                                        Link Student
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}; 