'use client';
import React from 'react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    isLoading: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm, itemName, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-md shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-red-600 mb-4">Confirm Deletion</h3>
                <p className="text-sm text-gray-600 mb-6">
                    Are you sure you want to delete {itemName ? `'${itemName}'` : 'this item'}? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300" disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700" disabled={isLoading}>
                        {isLoading ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 