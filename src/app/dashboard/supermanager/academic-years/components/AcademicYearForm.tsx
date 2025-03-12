import { useState } from 'react';
import { AcademicYear, Semester } from '../types/academic-year';

interface AcademicYearFormProps {
  initialData?: AcademicYear;
  onSubmit: (data: Partial<AcademicYear>) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

export function AcademicYearForm({ initialData, onSubmit, isLoading, onCancel }: AcademicYearFormProps) {
  const [formData, setFormData] = useState<Partial<AcademicYear>>(initialData || {
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
    semesters: [
      { name: 'First Semester', startDate: '', endDate: '', feePaymentDeadline: '' },
      { name: 'Second Semester', startDate: '', endDate: '', feePaymentDeadline: '' },
      { name: 'Third Semester', startDate: '', endDate: '', feePaymentDeadline: '' }
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800">Semesters</h3>
            {formData.semesters?.map((semester, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="font-medium text-gray-700 mb-3">{semester.name}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={semester.startDate}
                      onChange={(e) => {
                        const newSemesters = [...(formData.semesters || [])];
                        newSemesters[index] = { ...semester, startDate: e.target.value };
                        setFormData({ ...formData, semesters: newSemesters });
                      }}
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
                      value={semester.endDate}
                      onChange={(e) => {
                        const newSemesters = [...(formData.semesters || [])];
                        newSemesters[index] = { ...semester, endDate: e.target.value };
                        setFormData({ ...formData, semesters: newSemesters });
                      }}
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
                      value={semester.feePaymentDeadline}
                      onChange={(e) => {
                        const newSemesters = [...(formData.semesters || [])];
                        newSemesters[index] = { ...semester, feePaymentDeadline: e.target.value };
                        setFormData({ ...formData, semesters: newSemesters });
                      }}
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