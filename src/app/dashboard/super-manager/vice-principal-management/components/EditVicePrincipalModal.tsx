'use client'
import React from 'react';

// Assuming a type similar to ParentUser or a generic User type will be used/defined in the main page.
// For now, let's define a local one or expect it from props.
export type VicePrincipalEditableFields = {
    name?: string;
    email?: string;
    phone?: string;
    username?: string;
    matricule?: string;
    // Add other relevant editable fields specific to VicePrincipal if any
};

interface EditVicePrincipalModalProps {
    isOpen: boolean;
    onClose: () => void;
    vicePrincipalData: VicePrincipalEditableFields;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onSubmit: () => Promise<void>;
    isLoading: boolean;
    editingVicePrincipalName?: string;
}

export const EditVicePrincipalModal: React.FC<EditVicePrincipalModalProps> = ({
    isOpen,
    onClose,
    vicePrincipalData,
    onInputChange,
    onSubmit,
    isLoading,
    editingVicePrincipalName
}) => {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Edit Vice Principal: {editingVicePrincipalName || 'Details'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={isLoading}>
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="edit-vp-name" className="block text-sm font-medium text-gray-700">Name *</label>
                        <input
                            type="text"
                            id="edit-vp-name"
                            name="name"
                            value={vicePrincipalData.name || ''}
                            onChange={onInputChange}
                            required
                            className="mt-1 block w-full input-field"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="edit-vp-email" className="block text-sm font-medium text-gray-700">Email *</label>
                        <input
                            type="email"
                            id="edit-vp-email"
                            name="email"
                            value={vicePrincipalData.email || ''}
                            onChange={onInputChange}
                            required
                            className="mt-1 block w-full input-field"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="edit-vp-matricule" className="block text-sm font-medium text-gray-700">Matricule</label>
                        <input
                            type="text"
                            id="edit-vp-matricule"
                            name="matricule"
                            value={vicePrincipalData.matricule || ''}
                            onChange={onInputChange}
                            className="mt-1 block w-full input-field"
                            placeholder="e.g., STF001"
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label htmlFor="edit-vp-phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                            type="tel"
                            id="edit-vp-phone"
                            name="phone"
                            value={vicePrincipalData.phone || ''}
                            onChange={onInputChange}
                            className="mt-1 block w-full input-field"
                            disabled={isLoading}
                        />
                    </div>
                    {/* Add other editable fields if necessary */}

                    <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            disabled={isLoading || !vicePrincipalData.name || !vicePrincipalData.email}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
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