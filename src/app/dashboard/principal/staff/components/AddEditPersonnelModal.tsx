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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    {initialData ? 'Edit Personnel' : 'Add New Personnel'}
                </h3>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                        <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleChange} required className="mt-1 block w-full input-field" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                        <input type="email" name="email" id="email" value={formData.email || ''} onChange={handleChange} required className="mt-1 block w-full input-field" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="matricule" className="block text-sm font-medium text-gray-700">Matricule</label>
                        <input type="text" name="matricule" id="matricule" value={formData.matricule || ''} onChange={handleChange} className="mt-1 block w-full input-field" placeholder="e.g., STF001" disabled={isLoading} />
                    </div>
                    {!initialData && ( // Only show password for new users
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password *</label>
                            <input type="password" name="password" id="password" value={formData.password || ''} onChange={handleChange} required className="mt-1 block w-full input-field" placeholder="Min. 6 characters" disabled={isLoading} />
                        </div>
                    )}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full input-field" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender *</label>
                        <select name="gender" id="gender" value={formData.gender || ''} onChange={handleChange} required className="mt-1 block w-full select-field" disabled={isLoading}>
                            <option value="" disabled>Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                        <input type="date" name="date_of_birth" id="date_of_birth" value={formData.date_of_birth || ''} onChange={handleChange} required className="mt-1 block w-full input-field" disabled={isLoading} />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea name="address" id="address" value={formData.address || ''} onChange={handleChange} rows={3} className="mt-1 block w-full input-field" disabled={isLoading}></textarea>
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select name="status" id="status" value={formData.status || 'active'} onChange={handleChange} className="mt-1 block w-full select-field" disabled={isLoading}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    {/* Role assignment is typically handled in a separate modal or step, 
              but if initial role can be suggested, `allRoles` could be used here.
              For this example, direct role editing is not part of this form. */}

                    <div className="flex justify-end space-x-3 pt-5 border-t mt-5">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 rounded-md hover:bg-gray-300" disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isLoading}>
                            {isLoading ? 'Saving...' : (initialData ? 'Update Personnel' : 'Create Personnel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 