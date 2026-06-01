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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-1">Manage Roles for:</h3>
                <p className="text-xl font-semibold text-indigo-600 mb-6">{userName}</p>

                <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-2">
                    {availableRoles.map(role => (
                        <label key={role.value} htmlFor={`role-${role.value}`} className="flex items-center p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                id={`role-${role.value}`}
                                value={role.value}
                                checked={currentRoles.includes(role.value)}
                                onChange={() => handleRoleToggle(role.value)}
                                className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-75"
                                disabled={isLoading}
                            />
                            <span className="ml-3 text-sm font-medium text-gray-800">{role.label}</span>
                        </label>
                    ))}
                </div>

                <div className="flex justify-end space-x-3 pt-5 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onAssignRoles}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                        disabled={isLoading || currentRoles.length === 0} // Example: Disable if no roles selected
                    >
                        {isLoading ? 'Assigning...' : 'Assign Roles'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 