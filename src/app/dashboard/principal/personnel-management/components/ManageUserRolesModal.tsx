'use client';
import React, { Dispatch, SetStateAction } from 'react';

// Define Role type (can be imported if shared)
type Role = {
    value: string;
    label: string;
};

interface ManageUserRolesModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName: string;
    availableRoles: Role[]; // All roles defined in the system
    currentRoles: string[]; // Array of role values (e.g., ['TEACHER', 'HOD'])
    onSelectedRolesChange: Dispatch<SetStateAction<string[]>>; // To update the selected roles in the parent
    onAssignRoles: () => Promise<void>; // Function to call when submitting role changes
    isLoading: boolean;
}

export const ManageUserRolesModal: React.FC<ManageUserRolesModalProps> = ({
    isOpen,
    onClose,
    userName,
    availableRoles,
    currentRoles,
    onSelectedRolesChange,
    onAssignRoles,
    isLoading,
}) => {
    if (!isOpen) return null;

    const handleRoleToggle = (roleValue: string) => {
        onSelectedRolesChange(prevSelectedRoles =>
            prevSelectedRoles.includes(roleValue)
                ? prevSelectedRoles.filter(r => r !== roleValue)
                : [...prevSelectedRoles, roleValue]
        );
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-6 border w-full max-w-lg shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-medium leading-6 text-gray-900">Manage Roles</h3>
                        <p className="text-sm text-gray-600 mt-1">Assign roles to <span className="font-medium text-indigo-600">{userName}</span></p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        disabled={isLoading}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Roles ({currentRoles.length})</h4>
                        <div className="flex flex-wrap gap-2">
                            {currentRoles.length > 0 ? (
                                currentRoles.map(roleValue => {
                                    const role = availableRoles.find(r => r.value === roleValue);
                                    return (
                                        <span key={roleValue} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {role?.label || roleValue}
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="text-sm text-gray-500 italic">No roles assigned</span>
                            )}
                        </div>
                    </div>

                    <h4 className="text-sm font-medium text-gray-700 mb-3">Available Roles</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {availableRoles.map(role => {
                            const isSelected = currentRoles.includes(role.value);
                            const roleColors = {
                                'SUPER_MANAGER': 'border-red-200 bg-red-50',
                                'PRINCIPAL': 'border-purple-200 bg-purple-50',
                                'VICE_PRINCIPAL': 'border-indigo-200 bg-indigo-50',
                                'TEACHER': 'border-green-200 bg-green-50',
                                'BURSAR': 'border-yellow-200 bg-yellow-50',
                                'GUIDANCE_COUNSELOR': 'border-blue-200 bg-blue-50',
                                'DISCIPLINE_MASTER': 'border-orange-200 bg-orange-50',
                                'HOD': 'border-teal-200 bg-teal-50',
                                'MANAGER': 'border-pink-200 bg-pink-50'
                            };
                            
                            return (
                                <label 
                                    key={role.value} 
                                    htmlFor={`role-${role.value}`} 
                                    className={`flex items-center p-3 border rounded-lg hover:shadow-sm cursor-pointer transition-all ${
                                        isSelected 
                                            ? `${roleColors[role.value as keyof typeof roleColors] || 'border-gray-300 bg-gray-50'} border-2` 
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        id={`role-${role.value}`}
                                        value={role.value}
                                        checked={isSelected}
                                        onChange={() => handleRoleToggle(role.value)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-75"
                                        disabled={isLoading}
                                    />
                                    <div className="ml-3 flex-1">
                                        <span className="text-sm font-medium text-gray-800">{role.label}</span>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {role.value.replace(/_/g, ' ').toLowerCase()}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <svg className="h-4 w-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors" 
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onAssignRoles}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Assigning...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                                </svg>
                                Assign Roles
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}; 