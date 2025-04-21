import React, { useState } from 'react';

interface SequenceFormProps {
    termId: number;
    academicYearId: number;
    onSubmit: (formData: { sequence_number: number }) => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

export const SequenceForm: React.FC<SequenceFormProps> = ({
    termId,
    academicYearId,
    onSubmit,
    onCancel,
    isLoading,
}) => {
    const [sequenceNumber, setSequenceNumber] = useState<number | ''>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sequenceNumber === '' || sequenceNumber <= 0) {
            alert('Please enter a valid positive sequence number.'); // Replace with toast if available
            return;
        }

        const formData = {
            sequence_number: sequenceNumber,
        };

        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Add New Sequence</h2>
            {/* Form Fields */}
            <div>
                <label htmlFor="sequence_number" className="block text-sm font-medium text-gray-700">Sequence Number</label>
                <input
                    type="number"
                    id="sequence_number"
                    value={sequenceNumber}
                    onChange={(e) => setSequenceNumber(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    required
                    min="1"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    disabled={isLoading}
                />
            </div>

            {/* Actions */}
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
                    disabled={isLoading || sequenceNumber === ''}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? 'Adding...' : 'Add Sequence'}
                </button>
            </div>
        </form>
    );
}; 