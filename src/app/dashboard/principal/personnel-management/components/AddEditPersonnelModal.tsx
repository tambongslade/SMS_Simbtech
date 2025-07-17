'use client';
import React, { Dispatch, SetStateAction } from 'react';

// Assuming Personnel and Role types are defined elsewhere (e.g., in the hook or a types file)
// For now, let's define basic versions here if not imported.
// You should replace these with actual imports if they exist.
type Personnel = {
    id: number;
    name: string;
    roles: string[];
    username?: string;
    matricule?: string;
    email: string;
    phone?: string;
    status: 'active' | 'inactive';
    dateJoined?: string;
    gender?: string;
    date_of_birth?: string;
    address?: string;
    // password is only for form, not part of base Personnel usually
};

type PersonnelFormData = Partial<Personnel & { password?: string }>;


type Role = {
    value: string;
    label: string;
};

interface AddEditPersonnelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => Promise<void>; // Function to handle form submission
    initialData: Personnel | null; // For pre-filling the form when editing
    formData: PersonnelFormData; // Current form data state
    setFormData: Dispatch<SetStateAction<PersonnelFormData>>; // Function to update form data
    isLoading: boolean;
    allRoles: Role[]; // All available roles for selection (though role assignment is separate)
}

export const AddEditPersonnelModal: React.FC<AddEditPersonnelModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    formData,
    setFormData,
    isLoading,
    allRoles, // Though roles might be managed in a separate modal, it might be needed for initial assignment context
}) => {
    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        // const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined; // If checkboxes are used
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Example basic form structure. Adapt fields as per your PersonnelFormData
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
            <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                        {initialData ? 'Edit Personnel' : 'Add New Personnel'}
                    </h3>
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
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-6">
                    {/* Personal Information Section */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-700 mb-4">Personal Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    value={formData.name || ''}
                                    onChange={handleChange}
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    disabled={isLoading}
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email || ''}
                                    onChange={handleChange}
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    disabled={isLoading}
                                    placeholder="Enter email address"
                                />
                            </div>
                            <div>
                                <label htmlFor="matricule" className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                                <input
                                    type="text"
                                    name="matricule"
                                    id="matricule"
                                    value={formData.matricule || ''}
                                    onChange={handleChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    placeholder="e.g., STF001"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    id="phone"
                                    value={formData.phone || ''}
                                    onChange={handleChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    disabled={isLoading}
                                    placeholder="Enter phone number"
                                />
                            </div>
                            <div>
                                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                                <select
                                    name="gender"
                                    id="gender"
                                    value={formData.gender || ''}
                                    onChange={handleChange}
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    disabled={isLoading}
                                >
                                    <option value="" disabled>Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                                <input
                                    type="date"
                                    name="date_of_birth"
                                    id="date_of_birth"
                                    value={formData.date_of_birth || ''}
                                    onChange={handleChange}
                                    required
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <textarea
                                name="address"
                                id="address"
                                value={formData.address || ''}
                                onChange={handleChange}
                                rows={3}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                disabled={isLoading}
                                placeholder="Enter address"
                            ></textarea>
                        </div>
                    </div>

                    {/* Account Information Section */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-700 mb-4">Account Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {initialData ? ( // Only show New Password for existing users
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">New Password (optional)</label>
                                    <input
                                        type="password"
                                        name="password"
                                        id="password"
                                        value={formData.password || ''}
                                        onChange={handleChange}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                        placeholder="Leave blank to keep current password"
                                        disabled={isLoading}
                                    />
                                </div>
                            ) : ( // Only show password for new users
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                    <input
                                        type="password"
                                        name="password"
                                        id="password"
                                        value={formData.password || ''}
                                        onChange={handleChange}
                                        required
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                        placeholder="Minimum 6 characters"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}
                            <div>
                                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    id="status"
                                    value={formData.status || 'active'}
                                    onChange={handleChange}
                                    className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                    disabled={isLoading}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    {/* Role assignment is typically handled in a separate modal or step, 
              but if initial role can be suggested, `allRoles` could be used here.
              For this example, direct role editing is not part of this form. */}

                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                initialData ? 'Update Personnel' : 'Create Personnel'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 