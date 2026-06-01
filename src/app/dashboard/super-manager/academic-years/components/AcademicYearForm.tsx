import { useState, useEffect } from 'react';
import { AcademicYear, Term } from '../types/academic-year';

interface AcademicYearFormProps {
  initialData?: AcademicYear;
  onSubmit: (data: Partial<AcademicYear>) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

// Helper function to format dates for <input type=\"date\">
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return ''; // Return empty string on error
  }
};

export function AcademicYearForm({ initialData, onSubmit, isLoading, onCancel }: AcademicYearFormProps) {
  // Initialize state, formatting dates from initialData if present
  const [formData, setFormData] = useState<Partial<AcademicYear>>(() => {
    const defaultState: Partial<AcademicYear> = {
      name: '',
      startDate: '',
      endDate: '',
      isActive: false,
      terms: [
        { name: 'First Term', startDate: '', endDate: '', feeDeadline: '' },
        { name: 'Second Term', startDate: '', endDate: '', feeDeadline: '' },
        { name: 'Third Term', startDate: '', endDate: '', feeDeadline: '' }
      ],
    };

    if (!initialData) {
      return defaultState;
    }

    // Format initial data dates before setting state
    return {
      ...initialData,
      startDate: formatDateForInput(initialData.startDate),
      endDate: formatDateForInput(initialData.endDate),
      terms: initialData.terms?.map(term => ({
        ...term,
        startDate: formatDateForInput(term.startDate),
        endDate: formatDateForInput(term.endDate),
        feeDeadline: formatDateForInput(term.feeDeadline),
      })) || defaultState.terms, // Fallback to default terms if initialData.terms is missing
    };
  });

  // Recalculate initial state if initialData changes *after* mount (though less common for modal edits)
  // This ensures the form updates if the parent passes different initialData later.
  useEffect(() => {
    if (initialData) {
        setFormData({
            ...initialData,
            startDate: formatDateForInput(initialData.startDate),
            endDate: formatDateForInput(initialData.endDate),
            terms: initialData.terms?.map(term => ({
                ...term,
                startDate: formatDateForInput(term.startDate),
                endDate: formatDateForInput(term.endDate),
                feeDeadline: formatDateForInput(term.feeDeadline),
            })) || [],
        });
    } else {
        // Reset form if initialData becomes null/undefined (e.g., closing edit and opening add)
         setFormData({
            name: '',
            startDate: '',
            endDate: '',
            isActive: false,
            terms: [
                { name: 'First Term', startDate: '', endDate: '', feeDeadline: '' },
                { name: 'Second Term', startDate: '', endDate: '', feeDeadline: '' },
                { name: 'Third Term', startDate: '', endDate: '', feeDeadline: '' }
            ],
        });
    }
}, [initialData]); // Dependency array ensures this runs when initialData changes

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
        alert('Academic Year Name, Start Date, and End Date are required.');
        return;
    }
    if (!formData.terms || formData.terms.length === 0) {
        alert('At least one term is required.');
        return;
    }
    for (const term of formData.terms) {
        if (!term.name || !term.startDate || !term.endDate || !term.feeDeadline) {
            alert(`All fields (Name, Start Date, End Date, Fee Deadline) are required for ${term.name || 'a term'}.`);
            return;
        }
    }
    onSubmit(formData);
  };

  const handleTermChange = (index: number, field: keyof Term, value: string) => {
    const updatedTerms = [...(formData.terms || [])];
    if (updatedTerms[index]) {
      updatedTerms[index] = { ...updatedTerms[index], [field]: value };
      setFormData({ ...formData, terms: updatedTerms });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            {initialData ? 'Edit Academic Year' : 'Create Academic Year'}
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2024-2025"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-800">Terms</h3>
            {formData.terms?.map((term, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Term Name
                    </label>
                    <input
                        type="text"
                        value={term.name}
                        onChange={(e) => handleTermChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={term.startDate}
                      onChange={(e) => handleTermChange(index, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={term.endDate}
                      onChange={(e) => handleTermChange(index, 'endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Deadline
                    </label>
                    <input
                      type="date"
                      value={term.feeDeadline}
                      onChange={(e) => handleTermChange(index, 'feeDeadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : initialData ? 'Update Academic Year' : 'Create Academic Year'}
          </button>
        </div>
      </div>
    </form>
  );
}