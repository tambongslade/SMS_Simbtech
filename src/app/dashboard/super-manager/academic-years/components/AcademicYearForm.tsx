import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { AcademicYear, Term } from '../types/academic-year';
import apiService from '../../../../../lib/apiService';

interface AcademicYearFormProps {
  initialData?: AcademicYear;
  onSubmit: (data: Partial<AcademicYear>) => void;
  isLoading?: boolean;
  onCancel?: () => void;
}

interface ClassOption {
  id: number;
  name: string;
}

// Helper function to format dates for <input type="date">
const formatDateForInput = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

const buildDefaultTerms = (): Term[] => ([
  { name: 'First Term', startDate: '', endDate: '', feeDeadline: '', isHoliday: false, classIds: [] },
  { name: 'Second Term', startDate: '', endDate: '', feeDeadline: '', isHoliday: false, classIds: [] },
  { name: 'Third Term', startDate: '', endDate: '', feeDeadline: '', isHoliday: false, classIds: [] },
]);

export function AcademicYearForm({ initialData, onSubmit, isLoading, onCancel }: AcademicYearFormProps) {
  // Load classes for the holiday-term multi-select
  const { data: classesResult } = useSWR<{ data: ClassOption[] }>(
    '/classes?limit=200',
    (url: string) => apiService.get(url)
  );
  const classOptions: ClassOption[] = classesResult?.data ?? [];

  const [formData, setFormData] = useState<Partial<AcademicYear>>(() => {
    const defaultState: Partial<AcademicYear> = {
      name: '',
      startDate: '',
      endDate: '',
      isActive: false,
      terms: buildDefaultTerms(),
    };

    if (!initialData) return defaultState;

    return {
      ...initialData,
      startDate: formatDateForInput(initialData.startDate),
      endDate: formatDateForInput(initialData.endDate),
      terms: initialData.terms?.map(term => ({
        ...term,
        startDate: formatDateForInput(term.startDate),
        endDate: formatDateForInput(term.endDate),
        feeDeadline: formatDateForInput(term.feeDeadline),
        isHoliday: term.isHoliday ?? false,
        classIds: term.classIds ?? [],
      })) || defaultState.terms,
    };
  });

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
          isHoliday: term.isHoliday ?? false,
          classIds: term.classIds ?? [],
        })) || [],
      });
    } else {
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        isActive: false,
        terms: buildDefaultTerms(),
      });
    }
  }, [initialData]);

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
      if (!term.name || !term.startDate || !term.endDate) {
        alert(`Name, Start Date, and End Date are required for ${term.name || 'a term'}.`);
        return;
      }
      if (!term.isHoliday && !term.feeDeadline) {
        alert(`Fee Deadline is required for ${term.name} (non-holiday terms).`);
        return;
      }
      if (term.isHoliday && (!term.classIds || term.classIds.length === 0)) {
        alert(`Holiday term "${term.name}" must have at least one class selected.`);
        return;
      }
    }
    onSubmit(formData);
  };

  const handleTermChange = <K extends keyof Term>(index: number, field: K, value: Term[K]) => {
    const updatedTerms = [...(formData.terms || [])];
    if (updatedTerms[index]) {
      updatedTerms[index] = { ...updatedTerms[index], [field]: value };
      setFormData({ ...formData, terms: updatedTerms });
    }
  };

  const toggleClassForTerm = (index: number, classId: number) => {
    const term = formData.terms?.[index];
    if (!term) return;
    const current = term.classIds ?? [];
    const next = current.includes(classId)
      ? current.filter(id => id !== classId)
      : [...current, classId];
    handleTermChange(index, 'classIds', next);
  };

  const addHolidayTerm = () => {
    const updatedTerms = [
      ...(formData.terms || []),
      {
        name: 'Holiday',
        startDate: '',
        endDate: '',
        feeDeadline: '',
        isHoliday: true,
        classIds: [] as number[],
      },
    ];
    setFormData({ ...formData, terms: updatedTerms });
  };

  const removeTerm = (index: number) => {
    const updatedTerms = [...(formData.terms || [])];
    updatedTerms.splice(index, 1);
    setFormData({ ...formData, terms: updatedTerms });
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
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">Terms</h3>
              <button
                type="button"
                onClick={addHolidayTerm}
                className="text-sm px-3 py-1.5 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                + Add Holiday Term
              </button>
            </div>
            {formData.terms?.map((term, index) => {
              const isHoliday = !!term.isHoliday;
              return (
                <div
                  key={index}
                  className={`p-4 border rounded-lg ${isHoliday ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={isHoliday}
                        onChange={(e) => handleTermChange(index, 'isHoliday', e.target.checked)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      Holiday term
                    </label>
                    {isHoliday && (
                      <button
                        type="button"
                        onClick={() => removeTerm(index)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>

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
                    {!isHoliday && (
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
                    )}
                  </div>

                  {isHoliday && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Classes concerned <span className="text-red-500">*</span>
                      </label>
                      {classOptions.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">Loading classes...</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-white border border-gray-200 rounded-md">
                          {classOptions.map((cls) => {
                            const checked = (term.classIds ?? []).includes(cls.id);
                            return (
                              <label key={cls.id} className="inline-flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleClassForTerm(index, cls.id)}
                                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                {cls.name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        The holiday only applies to the selected classes.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
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
