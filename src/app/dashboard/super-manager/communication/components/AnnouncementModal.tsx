'use client';

import { useState, useEffect, FormEvent } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Re-use or redefine Announcement type parts needed for the form
type Audience = 'INTERNAL' | 'EXTERNAL' | 'BOTH';

// Add the Announcement type itself for initialData prop
type Announcement = {
    id: number;
    title: string;
    message: string;
    audience: Audience;
    authorName?: string;
    academicYearId?: number;
    createdAt: string;
    updatedAt: string;
};

type AnnouncementFormData = {
    title: string;
    message: string;
    audience: Audience | ''; // Allow empty initial state for select
    // academicYearId?: number | ''; // Optional - Add if implementing Academic Year selection
};

interface AnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: Omit<AnnouncementFormData, 'audience'> & { audience: Audience }) => Promise<void>; // Ensure audience is not empty on submit
    isLoading: boolean; // Loading state from parent for submission
    initialData?: Announcement | null; // Add initialData prop for editing
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isLoading,
    initialData, // Destructure initialData
}) => {
    const [formData, setFormData] = useState<AnnouncementFormData>({
        title: '',
        message: '',
        audience: ''
    });

    // Determine if editing based on initialData
    const isEditing = !!initialData;

    // Effect to populate form when editing or reset when creating/closing
    useEffect(() => {
        if (isOpen) {
            if (isEditing && initialData) {
                // Populate form with initial data if editing
                setFormData({
                    title: initialData.title,
                    message: initialData.message,
                    audience: initialData.audience,
                });
            } else {
                // Reset form if creating a new one
                setFormData({ title: '', message: '', audience: '' });
            }
        } else {
            // Optional: Reset form on close as well to ensure clean state next time
            setFormData({ title: '', message: '', audience: '' });
        }
        // Dependency array includes isOpen and initialData to react to changes
    }, [isOpen, initialData, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.title || !formData.message || !formData.audience) {
            toast.error('Title, Message, and Audience are required.');
            return;
        }
        // Type assertion needed as we validated audience is not ''
        onSubmit(formData as Omit<AnnouncementFormData, 'audience'> & { audience: Audience });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    {/* Change title based on editing state */}
                    <h2 className="text-xl font-semibold text-gray-800">
                        {isEditing ? 'Edit Announcement' : 'Create Announcement'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title Input */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>

                    {/* Message Textarea */}
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                        <textarea
                            id="message"
                            name="message"
                            rows={4}
                            value={formData.message}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        ></textarea>
                    </div>

                    {/* Audience Select */}
                    <div>
                        <label htmlFor="audience" className="block text-sm font-medium text-gray-700">Target Audience</label>
                        <select
                            id="audience"
                            name="audience"
                            value={formData.audience}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="" disabled>-- Select Audience --</option>
                            <option value="INTERNAL">Internal (Staff Only)</option>
                            <option value="EXTERNAL">External (Public)</option>
                            <option value="BOTH">Both (Internal & Public)</option>
                        </select>
                    </div>

                     {/* TODO: Optional Academic Year Dropdown */}
                     {/* Requires fetching academic years */}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {/* Change button text based on editing state */}
                            {isLoading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Announcement' : 'Create Announcement')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}; 