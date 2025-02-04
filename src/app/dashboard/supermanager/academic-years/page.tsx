'use client';
import { useState } from 'react';
import { AcademicYear } from './types/academic-year';
import { AcademicYearForm } from './components/AcademicYearForm';

export default function AcademicYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Hide toast after 3 seconds
  };

  const handleCreate = (data: Partial<AcademicYear>) => {
    const newYear = {
      ...data,
      id: Date.now().toString(),
      isActive: false,
    } as AcademicYear;

    setAcademicYears([...academicYears, newYear]);
    setIsCreating(false);
    showToast('The academic year has been created successfully.', 'success');
  };

  const handleUpdate = (id: string, data: Partial<AcademicYear>) => {
    setAcademicYears(
      academicYears.map((year) =>
        year.id === id ? { ...year, ...data } : year
      )
    );
    setEditingId(null);
    showToast('The academic year has been updated successfully.', 'success');
  };

  const handleDelete = (id: string) => {
    setAcademicYears(academicYears.filter((year) => year.id !== id));
    showToast('The academic year has been deleted successfully.', 'error');
  };

  const handleToggleActive = (id: string) => {
    setAcademicYears(
      academicYears.map((year) =>
        year.id === id ? { ...year, isActive: !year.isActive } : year
      )
    );
    const year = academicYears.find((y) => y.id === id);
    showToast(
      `The academic year has been ${
        year?.isActive ? 'deactivated' : 'activated'
      } successfully.`,
      'success'
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-md shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Academic Year
          </button>
        </div>

        {isCreating && (
          <div className="mb-6">
            <AcademicYearForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
            />
          </div>
        )}

        <div className="space-y-6">
          {academicYears.map((year) => (
            <div
              key={year.id}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {year.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {new Date(year.startDate).toLocaleDateString()} -{' '}
                      {new Date(year.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        year.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {year.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(year.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              year.isActive
                                ? 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
                                : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                            }
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingId(year.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(year.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {editingId === year.id ? (
                  <AcademicYearForm
                    initialData={year}
                    onSubmit={(data) => handleUpdate(year.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Semesters
                        </h3>
                        <div className="grid gap-4">
                          {year.semesters.map((semester, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 p-4 rounded-lg"
                            >
                              <h4 className="font-medium text-gray-800 mb-2">
                                {semester.name}
                              </h4>
                              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <span className="block text-gray-500">
                                    Start Date
                                  </span>
                                  {new Date(semester.startDate).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="block text-gray-500">
                                    End Date
                                  </span>
                                  {new Date(semester.endDate).toLocaleDateString()}
                                </div>
                                <div>
                                  <span className="block text-gray-500">
                                    Status
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      semester.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {semester.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}