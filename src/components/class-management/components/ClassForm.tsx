import { useState, useEffect } from 'react';
import { Class } from '../types/class';

interface ClassFormProps {
  initialData?: Partial<Class>; // Use Partial for initial data, ID might be missing for create
  onSubmit: (data: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

// Class Management only creates/renames classes — the fee structure is
// configured by the Super Manager under Fees Management → Class Fees.
// Existing fee values are passed through unchanged on update (0 on create).
export function ClassForm({ initialData, onSubmit, isLoading, onCancel }: ClassFormProps) {
  const [name, setName] = useState(initialData?.name || '');

  useEffect(() => {
    setName(initialData?.name || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a class name.');
      return;
    }

    onSubmit({
      name: name.trim(),
      // Preserve the existing fee structure — edited in Fees Management
      firstTermFee: initialData?.firstTermFee ?? 0,
      secondTermFee: initialData?.secondTermFee ?? 0,
      thirdTermFee: initialData?.thirdTermFee,
      newStudentAddFee: initialData?.newStudentAddFee ?? 0,
      oldStudentAddFee: initialData?.oldStudentAddFee ?? 0,
      miscellaneousFee: initialData?.miscellaneousFee ?? 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        {initialData?.id ? 'Edit Class' : 'Create New Class'}
      </h2>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Class Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Form 1, Grade 5"
        />
      </div>

      <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-md p-2.5">
        Class fees are configured in <span className="font-medium">Fees Management → Class Fees</span>.
      </p>

      {/* Form actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (initialData?.id ? 'Update Class' : 'Create Class')}
        </button>
      </div>
    </form>
  );
}
