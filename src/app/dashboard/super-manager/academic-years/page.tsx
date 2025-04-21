'use client';
import { useState, useEffect, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { AcademicYear, Term } from './types/academic-year';
import { AcademicYearForm } from './components/AcademicYearForm';
import { toast } from 'react-hot-toast';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

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

  const API_ENDPOINT = `${API_BASE_URL}/academic-years`;

  // --- SWR Data Fetching ---
  const {
      data: apiResult, 
      error: fetchError,
      isLoading: isLoadingData, // Use SWR loading state for data fetch
      mutate // Function to trigger refetch
  } = useSWR<AcademicYearsApiResponse>(API_ENDPOINT);

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
      if (fetchError) {
          console.error("SWR Fetch Error (Academic Years):", fetchError);
          toast.error(`Error fetching academic years: ${fetchError.message}`);
      }
  }, [fetchError]);

  // --- CRUD Handlers (Updated for SWR) ---
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
        // Use standard fetch for mutation
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to create academic year');
        }
        toast.success('Academic year created successfully.');
        setIsCreating(false);
        mutate(); // Revalidate SWR cache for API_ENDPOINT
    } catch (error: any) {
        toast.error(`Creation failed: ${error.message}`);
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
         // Use standard fetch for mutation
         const response = await fetch(`${API_ENDPOINT}/${id}`, {
            method: 'PUT', 
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to update academic year');
        }
        toast.success('Academic year updated successfully.');
        setEditingId(null);
        mutate(); // Revalidate SWR cache
    } catch (error: any) {
        toast.error(`Update failed: ${error.message}`);
    } finally {
        setIsMutating(false); // End mutation loading
    }
  };

  const handleDelete = async (id: string | undefined) => {
     if (!id || !window.confirm('Are you sure you want to delete this academic year?')) return;
    setIsMutating(true); // Start mutation loading
    try {
        // Use standard fetch for mutation
        const response = await fetch(`${API_ENDPOINT}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Handle specific errors, e.g., cannot delete if active or has related data
            throw new Error(errorData.message || 'Failed to delete academic year');
        }
        toast.success('Academic year deleted successfully.');
        mutate(); // Revalidate SWR cache
    } catch (error: any) {
        toast.error(`Deletion failed: ${error.message}`);
    } finally {
        setIsMutating(false); // End mutation loading
    }
  };

  // Toggle Active might need PUT/PATCH request instead of local state change
  // Assuming API handles activation via PUT/PATCH on the academic year resource
  const handleToggleActive = async (year: AcademicYear) => {
      if (!year.id) return;
      setIsMutating(true); // Start mutation loading
      const newActiveState = !year.isActive;
      const payload = { isActive: newActiveState }; // Payload to update active status

      try {
          // Use standard fetch for mutation
          const response = await fetch(`${API_ENDPOINT}/${year.id}`, { 
              method: 'PUT', 
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(payload)
          });
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || 'Failed to update status');
          }
          toast.success(`Academic year ${newActiveState ? 'activated' : 'deactivated'} successfully.`);
          mutate(); // Revalidate SWR cache
      } catch (error: any) {
          toast.error(`Status update failed: ${error.message}`);
      } finally {
          setIsMutating(false); // End mutation loading
      }
  };

  // Consolidate loading state for UI disabling
  const isLoading = isLoadingData || isMutating;

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
        {fetchError && !isLoadingData && (
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
          {!isLoadingData && academicYears.length === 0 && <p className="text-center text-gray-500">No academic years found. Add one to get started.</p>}
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
                      {formatDateDisplay(year.startDate)} -{' '}
                      {formatDateDisplay(year.endDate)}
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
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleToggleActive(year)}
                        disabled={isLoading}
                        title={year.isActive ? 'Deactivate' : 'Activate'}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
                      <button
                        onClick={() => {
                          setIsCreating(false);
                          if (year.id) {
                              setEditingId(year.id);
                          } else {
                              toast.error('Cannot edit year without ID.');
                          }
                        }}
                        disabled={isLoading || editingId === year.id}
                        title="Edit"
                        className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(year.id)}
                        disabled={isLoading}
                        title="Delete"
                        className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {editingId === year.id ? (
                  <div className="p-6 border-t border-gray-200">
                  <AcademicYearForm
                    initialData={year}
                    onSubmit={(data) => handleUpdate(year.id, data)}
                    onCancel={() => setEditingId(null)}
                        isLoading={isMutating}
                  />
                  </div>
                ) : (
                   <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-3">
                      Terms
                        </h3>
                     {year.terms && year.terms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {year.terms.map((term: Term, index: number) => (
                            <div key={term.id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <h4 className="font-medium text-gray-800 mb-2 truncate" title={term.name}>
                                {term.name}
                              </h4>
                              <dl className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">Start:</dt>
                                  <dd className="text-gray-700">{formatDateDisplay(term.startDate)}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500">End:</dt>
                                  <dd className="text-gray-700">{formatDateDisplay(term.endDate)}</dd>
                                </div>
                                 <div className="flex justify-between">
                                  <dt className="text-gray-500">Fee Deadline:</dt>
                                  <dd className="text-gray-700">{formatDateDisplay(term.feeDeadline)}</dd>
                                </div>
                              </dl>
                            </div>
                          ))}
                        </div>
                     ) : (
                         <p className="text-sm text-gray-500 italic">No terms defined for this academic year.</p>
                     )}
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}