'use client';
import { useState, useEffect, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { AcademicYear, Term } from './types/academic-year';
import { AcademicYearForm } from './components/AcademicYearForm';
import { toast } from 'react-hot-toast';
import apiService from '../../../../lib/apiService'; // Import apiService

// API Base URL - REMOVED
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

// --- Helper Function for Date Formatting ---
const formatDateDisplay = (dateString: string | undefined | null): string => {
  if (!dateString) {
    return 'N/A'; // Handle null, undefined, or empty strings
  }
  try {
    const date = new Date(dateString);
    // Check if the date object is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string encountered: ${dateString}`);
      return 'Invalid Date'; // Return specific string for invalid dates
    }
    // Return formatted date (e.g., MM/DD/YYYY or local equivalent)
    return date.toLocaleDateString();
  } catch (error) {
    console.error(`Error parsing date string: ${dateString}`, error);
    return 'Error'; // Return specific string on parsing errors
  }
};

// Interface for the API response structure
interface AcademicYearsApiResponse {
  data?: any[]; // Assuming API returns { data: [...] }
}

export default function AcademicYearsPage() {
  // Keep UI state for modals/forms
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false); // State for mutation loading

  const API_ENDPOINT_RELATIVE = '/academic-years'; // Relative path for apiService

  // --- SWR Data Fetching ---
  const {
    data: apiResult,
    error: fetchError,
    isLoading: isLoadingData, // Use SWR loading state for data fetch
    mutate // Function to trigger refetch
  } = useSWR<AcademicYearsApiResponse>(API_ENDPOINT_RELATIVE, (url) => apiService.get(url)); // Use apiService

  // --- Process SWR Data ---
  const academicYears = useMemo((): AcademicYear[] => {
    if (!apiResult?.data) return [];
    // Use the existing mapping logic
    return apiResult.data.map((year: any): AcademicYear => ({
      id: year.id,
      name: year.name,
      isActive: year.isActive,
      startDate: String(year.start_date || year.startDate || ''),
      endDate: String(year.end_date || year.endDate || ''),
      terms: year.terms?.map((term: any): Term => ({
        id: term.id,
        name: term.name,
        startDate: String(term.start_date || term.startDate || ''),
        endDate: String(term.end_date || term.endDate || ''),
        feeDeadline: String(term.fee_deadline || term.feeDeadline || ''),
      })) || [],
    }));
  }, [apiResult]);

  // --- Handle SWR Fetch Errors --- 
  useEffect(() => {
    if (fetchError && fetchError.message !== 'Unauthorized') { // apiService handles Unauthorized redirect and toast
      console.error("SWR Fetch Error (Academic Years):", fetchError);
      // Toasting is handled by apiService, specific UI updates for fetch errors can go here
    }
  }, [fetchError]);

  // --- CRUD Handlers (Updated for apiService) ---
  const handleCreate = async (data: Partial<AcademicYear>) => {
    setIsMutating(true); // Start mutation loading
    // Prepare data for API (ensure structure matches API expectations, e.g., snake_case?)
    const payload = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      terms: data.terms?.map(term => ({
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        feeDeadline: term.feeDeadline
      })) || []
    };
    console.log("Creating Academic Year Payload:", payload); // DEBUG

    try {
      await apiService.post(API_ENDPOINT_RELATIVE, payload);
      toast.success('Academic year created successfully.');
      setIsCreating(false);
      mutate(); // Revalidate SWR cache for API_ENDPOINT_RELATIVE
    } catch (error: any) {
      console.error("Creation failed:", error); // Keep console log for debugging
    } finally {
      setIsMutating(false); // End mutation loading
    }
  };

  const handleUpdate = async (id: string | undefined, data: Partial<AcademicYear>) => {
    if (!id) return;
    setIsMutating(true); // Start mutation loading
    // Prepare payload (only send fields that can be updated? Check API docs)
    const payload = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      // Updating terms might require a separate endpoint or specific format
      // terms: data.terms
    };
    console.log(`Updating Academic Year ${id} Payload:`, payload); // DEBUG
    try {
      await apiService.put(`${API_ENDPOINT_RELATIVE}/${id}`, payload);
      toast.success('Academic year updated successfully.');
      setEditingId(null);
      mutate(); // Revalidate SWR cache
    } catch (error: any) {
      console.error("Update failed:", error);
    } finally {
      setIsMutating(false); // End mutation loading
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id || !window.confirm('Are you sure you want to delete this academic year?')) return;
    setIsMutating(true); // Start mutation loading
    try {
      await apiService.delete(`${API_ENDPOINT_RELATIVE}/${id}`);
      toast.success('Academic year deleted successfully.');
      mutate(); // Revalidate SWR cache
    } catch (error: any) {
      console.error("Deletion failed:", error);
    } finally {
      setIsMutating(false); // End mutation loading
    }
  };

  // Toggle Active might need PUT/PATCH request instead of local state change
  // Assuming API supports PATCH or PUT with only `isActive` field or gracefully handles full object.
  const handleToggleActive = async (year: AcademicYear) => {
    if (!year.id) return;
    setIsMutating(true); // Start mutation loading
    const newActiveState = !year.isActive;
    const payload = { isActive: newActiveState }; // Payload to update active status

    try {
      await apiService.put(`${API_ENDPOINT_RELATIVE}/${year.id}`, payload);
      toast.success(`Academic year ${newActiveState ? 'activated' : 'deactivated'} successfully.`);
      mutate(); // Revalidate SWR cache
    } catch (error: any) {
      console.error("Status update failed:", error);
    } finally {
      setIsMutating(false); // End mutation loading
    }
  };

  // Consolidate loading state for UI disabling
  const isLoading = isLoadingData || isMutating;

  // Make sure to pass editingYear correctly to AcademicYearForm if it depends on `academicYears.find(y => y.id === editingId)`
  const editingYear = editingId ? academicYears.find(y => String(y.id) === editingId) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Academic Years</h1>
          <button
            onClick={() => { setEditingId(null); setIsCreating(true); }}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Academic Year
          </button>
        </div>

        {/* Display Fetch Error */}
        {fetchError && fetchError.message !== 'Unauthorized' && !isLoadingData && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> Failed to load academic years. Please try refreshing.</span>
          </div>
        )}

        {isCreating && (
          <div className="mb-6 bg-white rounded-lg shadow-md p-4">
            <AcademicYearForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreating(false)}
              isLoading={isMutating}
            />
          </div>
        )}

        <div className="space-y-6">
          {isLoadingData && academicYears.length === 0 && <p className="text-center text-gray-500">Loading academic years...</p>}
          {!isLoadingData && !fetchError && academicYears.length === 0 && !isCreating && (
            <div className="text-center py-10 bg-white rounded-lg shadow-md">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No academic years</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new academic year.</p>
            </div>
          )}
          {academicYears.map((year) => (
            editingId === String(year.id) ? (
              <div key={year.id} className="mb-6 bg-white rounded-lg shadow-md p-4">
                <AcademicYearForm
                  initialData={year}
                  onSubmit={(data) => handleUpdate(String(year.id), data)}
                  onCancel={() => setEditingId(null)}
                  isLoading={isMutating}
                />
              </div>
            ) : (
              <div key={year.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className={`p-4 ${year.isActive ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-800">{year.name}</h2>
                      <p className="text-sm text-gray-600">
                        {formatDateDisplay(year.startDate)} - {formatDateDisplay(year.endDate)}
                      </p>
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${year.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {year.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <button
                        onClick={() => setEditingId(String(year.id))}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 p-1 rounded-md hover:bg-blue-100 transition-colors"
                        title="Edit Academic Year"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(String(year.id))}
                        disabled={isLoading || year.isActive} // Example: Disable delete if active
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 p-1 rounded-md hover:bg-red-100 transition-colors"
                        title={year.isActive ? "Cannot delete active year" : "Delete Academic Year"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleActive(year)}
                        disabled={isLoading}
                        className={`p-1 rounded-md transition-colors ${year.isActive ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100' : 'text-green-600 hover:text-green-800 hover:bg-green-100'} disabled:opacity-50`}
                        title={year.isActive ? 'Set as Inactive' : 'Set as Active'}
                      >
                        {year.isActive ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {year.terms && year.terms.length > 0 && (
                  <div className="border-t border-gray-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Terms:</h3>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {year.terms.map(term => (
                        <li key={term.id} className="flex justify-between">
                          <span>{term.name}: {formatDateDisplay(term.startDate)} - {formatDateDisplay(term.endDate)}</span>
                          {term.feeDeadline && <span> (Fee Deadline: {formatDateDisplay(term.feeDeadline)})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}