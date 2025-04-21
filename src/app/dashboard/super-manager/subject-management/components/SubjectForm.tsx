import React, { useState, useEffect } from 'react';
import { Subject, SubjectCategory } from '../types/subject';

interface SubjectFormProps {
    initialData?: Subject;
    onSubmit: (formData: Omit<Subject, 'id'>) => void;
    onCancel: () => void;
    isLoading: boolean;
}

export const SubjectForm: React.FC<SubjectFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
    const [formData, setFormData] = useState<Omit<Subject, 'id'>>({
        name: '',
        category: SubjectCategory.OTHERS, // Update default category to a valid one
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                category: initialData.category,
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert('Subject name is required.'); // Replace with toast later
            return;
        }
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">{initialData ? 'Edit Subject' : 'Add New Subject'}</h2>
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Subject Name</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    {Object.entries(SubjectCategory).map(([key, value]) => (
                        <option key={value} value={value}>
                            {/* Format the category name (e.g., SCIENCE_AND_TECHNOLOGY -> Science And Technology) */}
                            {key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Saving...' : (initialData ? 'Update Subject' : 'Create Subject')}
                </button>
            </div>
        </form>
    );
}; 