import { useState, useEffect } from 'react';
import { SubClass } from '../types/class'; // Import SubClass type if needed for initialData structure

// Local Teacher type definition for the props
type Teacher = {
  id: number;
  name: string;
};

interface SubClassFormProps {
  initialData?: Partial<SubClass>; // Add initialData for editing
  onSubmit: (data: { name: string; classMasterId: number | null }) => void; // Keep onSubmit simple, handle logic in parent
  isLoading?: boolean;
  onCancel: () => void;
  className?: string; // Optional class name for context
  teachers: Teacher[]; // Add teachers list to props
}

export function SubClassForm({ initialData, onSubmit, isLoading, onCancel, className, teachers }: SubClassFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  // State for selected class master ID
  const [classMasterId, setClassMasterId] = useState<number | string>(initialData?.classMasterId || ''); // Use string for select value

  // Update name if initialData changes (for editing)
  useEffect(() => {
    setName(initialData?.name || '');
    // Reset classMasterId when initialData changes
    setClassMasterId(initialData?.classMasterId || '');
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
        alert('Subclass name cannot be empty.'); // Use toast in real app
        return;
    }
    // Pass name and converted classMasterId (null if empty string)
    onSubmit({ 
        name: trimmedName, 
        classMasterId: classMasterId === '' ? null : Number(classMasterId) 
    });
    // Don't reset name here, parent component handles modal closing/state reset
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <h3 className="text-lg font-semibold text-gray-800">
         {initialData?.id ? 'Edit Subclass' : `Add New Subclass${className ? ` to ${className}` : ''}`}
       </h3>
      <div>
        <label htmlFor="subclassName" className="block text-sm font-medium text-gray-700">Subclass Name *</label>
        <input
          type="text"
          id="subclassName"
          name="subclassName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., A, B, Blue, Gold"
        />
      </div>

      {/* Class Master Selection */}
      <div>
        <label htmlFor="classMasterId" className="block text-sm font-medium text-gray-700">Class Master (Optional)</label>
        <select
          id="classMasterId"
          name="classMasterId"
          value={classMasterId}
          onChange={(e) => setClassMasterId(e.target.value)} // Store ID as string directly
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={isLoading || teachers.length === 0}
        >
          <option value="">-- None --</option>
          {teachers.length === 0 && <option disabled>Loading teachers...</option>}
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
         {teachers.length === 0 && !isLoading && (
            <p className="text-xs text-red-600 mt-1">Teacher list unavailable.</p>
        )}
      </div>

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
          className={`text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${initialData?.id ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (initialData?.id ? 'Update Subclass' : 'Add Subclass')}
        </button>
      </div>
    </form>
  );
}