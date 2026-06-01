import { useState, useEffect } from 'react';
import { Class } from '../types/class';

interface ClassFormProps {
  initialData?: Partial<Class>; // Use Partial for initial data, ID might be missing for create
  onSubmit: (data: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => void;
  isLoading?: boolean;
  onCancel: () => void;
}

export function ClassForm({ initialData, onSubmit, isLoading, onCancel }: ClassFormProps) {
  // Use new field names for state
  const [formData, setFormData] = useState(() => ({
    name: initialData?.name || '',
    firstTermFee: initialData?.firstTermFee?.toString() || '',
    secondTermFee: initialData?.secondTermFee?.toString() || '',
    thirdTermFee: initialData?.thirdTermFee?.toString() || '',
    newStudentAddFee: initialData?.newStudentAddFee?.toString() || '',
    oldStudentAddFee: initialData?.oldStudentAddFee?.toString() || '',
    miscellaneousFee: initialData?.miscellaneousFee?.toString() || '',
  }));

  // Update state with new field names
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        firstTermFee: initialData.firstTermFee?.toString() || '',
        secondTermFee: initialData.secondTermFee?.toString() || '',
        thirdTermFee: initialData.thirdTermFee?.toString() || '',
        newStudentAddFee: initialData.newStudentAddFee?.toString() || '',
        oldStudentAddFee: initialData.oldStudentAddFee?.toString() || '',
        miscellaneousFee: initialData.miscellaneousFee?.toString() || '',
      });
    } else {
      // Reset form
      setFormData({
        name: '',
        firstTermFee: '',
        secondTermFee: '',
        thirdTermFee: '',
        newStudentAddFee: '',
        oldStudentAddFee: '',
        miscellaneousFee: '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Use new field names for parsing
    const thirdTermFeeValue = formData.thirdTermFee.trim() === ''
      ? undefined
      : (parseFloat(formData.thirdTermFee) || 0);

    const dataToSubmit = {
      name: formData.name,
      firstTermFee: parseFloat(formData.firstTermFee) || 0,
      secondTermFee: parseFloat(formData.secondTermFee) || 0,
      thirdTermFee: thirdTermFeeValue,
      newStudentAddFee: parseFloat(formData.newStudentAddFee) || 0,
      oldStudentAddFee: parseFloat(formData.oldStudentAddFee) || 0,
      miscellaneousFee: parseFloat(formData.miscellaneousFee) || 0,
    };

    // Use new field names for validation
    if (!dataToSubmit.name ||
        isNaN(dataToSubmit.firstTermFee) ||
        isNaN(dataToSubmit.secondTermFee) ||
        (dataToSubmit.thirdTermFee !== undefined && isNaN(dataToSubmit.thirdTermFee)) ||
        isNaN(dataToSubmit.newStudentAddFee) ||
        isNaN(dataToSubmit.oldStudentAddFee) ||
        isNaN(dataToSubmit.miscellaneousFee))
    {
        alert('Please fill in all required fields correctly.');
        return;
    }

    const finalData: Omit<Class, 'id' | 'subClasses' | 'studentCount'> = dataToSubmit;
    onSubmit(finalData);
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
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Form 1, Grade 5"
        />
      </div>
      {/* Fee Inputs - Use new field names */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <label htmlFor="firstTermFee" className="block text-sm font-medium text-gray-700">1st Term Fee *</label>
            <input
              type="number"
              id="firstTermFee"
              name="firstTermFee"
              value={formData.firstTermFee}
              onChange={handleChange}
              required
              min="0"
              step="any"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="secondTermFee" className="block text-sm font-medium text-gray-700">2nd Term Fee *</label>
            <input
              type="number"
              id="secondTermFee"
              name="secondTermFee"
              value={formData.secondTermFee}
              onChange={handleChange}
              required
              min="0"
              step="any"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="thirdTermFee" className="block text-sm font-medium text-gray-700">3rd Term Fee</label>
            <input
              type="number"
              id="thirdTermFee"
              name="thirdTermFee"
              value={formData.thirdTermFee}
              onChange={handleChange}
              min="0"
              step="any"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Leave empty if none"
            />
          </div>
          {/* Registration and Miscellaneous fields remain the same */}
          <div>
            <label htmlFor="newStudentAddFee" className="block text-sm font-medium text-gray-700">Registration (New Students) *</label>
            <input
              type="number"
              id="newStudentAddFee"
              name="newStudentAddFee"
              value={formData.newStudentAddFee}
              onChange={handleChange}
              required
              min="0"
              step="any"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="oldStudentAddFee" className="block text-sm font-medium text-gray-700">Registration (Old Students) *</label>
            <input
              type="number"
              id="oldStudentAddFee"
              name="oldStudentAddFee"
              value={formData.oldStudentAddFee}
              onChange={handleChange}
              required
              min="0"
              step="any"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
           <div>
            <label htmlFor="miscellaneousFee" className="block text-sm font-medium text-gray-700">Miscellaneous Fee *</label>
            <input
              type="number"
              id="miscellaneousFee"
              name="miscellaneousFee"
              value={formData.miscellaneousFee}
              onChange={handleChange}
              required
              min="0"
              step="any"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (initialData?.id ? 'Update Class' : 'Create Class')}
        </button>
      </div>
    </form>
  );
}
