'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useMarksManagementFilters } from './hooks/useMarksManagementFilters';

// --- Types ---
// Adjusted based on API docs and expected usage
type SelectOption = {
    id: number;
    name: string;
};

// Types reflecting the streamlined approach
type ExamSequence = {
    id: number;
    sequenceNumber: number;
    academicYearId: number;
    termId: number; // Keep termId for filtering sequences, even if Term dropdown is removed
    createdAt?: string;
    updatedAt?: string;
    name: string;
};

// Term type is no longer needed for direct state/dropdowns
// type Term = { ... };

type AcademicYear = {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    updatedAt?: string;
    terms: { id: number; name: string; academicYearId: number }[]; // Keep terms data for sequence filtering
    examSequences: ExamSequence[];
};

// Update SubClassSubject to expect full Subject info if provided by API

type SubClass = {
    id: number;
    name: string;
    classId?: number;
    className?: string;
    studentCount?: number;
    subjects: Subject[]; // Now expects array of Subject-like objects
};

// Class type is no longer needed for direct state/dropdowns
// type Class = { ... };

type Subject = SelectOption & {
    // Category, etc.
};

type Student = {
    id: number;
    name: string;
    matricule?: string;
    // Other relevant student fields like photoUrl if needed
};

// Represents the structure from GET /marks
type ApiMark = {
    id: number; // Mark ID
    studentId: number;
    score: number | null; // API uses 'score' for GET
    comment?: string | null;
    // Other potential fields from API GET response
    subjectId?: number;
    examId?: number;
    teacherId?: number;
    createdAt?: string;
    updatedAt?: string;
    student?: { id: number; name: string; matricule?: string };
    subject?: { id: number; name: string };
    examSequence?: { id: number; name: string };
};

// Local state representation for the table, merging student and their mark info
type StudentMarkRow = Student & {
    markId: number | null; // ID of the existing mark, if any
    currentScore: number | string; // Input field value (string to allow empty input, represents the 'score')
    originalScore: number | null; // Original 'score' fetched from API
    isSaving?: boolean; // Optional: for individual row saving state
    saveError?: string | null; // Optional: for individual row errors
};


// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1'; // Corrected default URL based on http file
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// Helper to get user ID from localStorage
const getUserId = (): number | null => {
    if (typeof window === 'undefined') return null;
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) {
        console.warn("User data not found in localStorage.");
        return null;
    }
    try {
        const userData = JSON.parse(userDataString);
        // Assuming the user object has an 'id' field
        return userData?.id ? Number(userData.id) : null;
    } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        return null;
    }
};

// --- Main Page Component ---
export default function MarksManagementPage() {
    // --- Selection State (Remains in Page Component) ---
    const [selectedYearId, setSelectedYearId] = useState<number | ''>( '');
    const [selectedExamSequenceId, setSelectedExamSequenceId] = useState<number | ''>( '');
    const [selectedSubClassId, setSelectedSubClassId] = useState<number | ''>( '');
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>( '');

    // --- Fetch Filter Data using the new hook --- 
    const {
        academicYears,          // Renamed from academicYearsData
        subClasses,             // Renamed from allSubClassesData
        derivedExamSequences,   // Derived list
        derivedSubjects,        // Derived list
        isLoadingFilters,       // Loading state from hook
        filterError,            // Error state from hook
    } = useMarksManagementFilters(selectedYearId, selectedSubClassId); // Pass selected IDs

    // --- Removed States Managed by Hook ---
    // const [academicYearsData, setAcademicYearsData] = useState<AcademicYear[]>([]);
    // const [allSubClassesData, setAllSubClassesData] = useState<SubClass[]>([]);
    // const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    // const [error, setError] = useState<string | null>(null); // Use filterError from hook

    // --- State for Student Marks Table --- 
    const [studentsWithMarks, setStudentsWithMarks] = useState<StudentMarkRow[]>([]);
    const [isLoadingStudentsAndMarks, setIsLoadingStudentsAndMarks] = useState(false);
    const [isSavingMarks, setIsSavingMarks] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null); // Separate error for saving
    // Pagination State (Remains for student/marks fetch)
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20; 

    // --- Removed useEffect for Initial Filter Fetch --- 
    // useEffect(() => { fetchInitialFilters(); }, []);

    // --- Fetch Students and Marks (Existing Logic - Potential future SWR candidate) ---
    const fetchStudentsAndMarks = useCallback(async () => {
        // Check if all required filters are selected
        if (!selectedYearId || !selectedExamSequenceId || !selectedSubClassId || !selectedSubjectId) {
            setStudentsWithMarks([]); // Clear table if filters are incomplete
            setTotalPages(1);
            setCurrentPage(1);
            return;
        }

        setIsLoadingStudentsAndMarks(true);
        setSaveError(null); // Clear previous save/fetch marks errors
            const token = getAuthToken();
        if (!token) { /* ... handle auth error ... */ setIsLoadingStudentsAndMarks(false); return; }

        try {
            const params = new URLSearchParams({
                academicYearId: String(selectedYearId),
                subClassId: String(selectedSubClassId),
                examSequenceId: String(selectedExamSequenceId),
                subjectId: String(selectedSubjectId),
                page: String(currentPage),
                limit: String(limit),
            });
            const url = `${API_BASE_URL}/marks?${params.toString()}`;
            console.log("Fetching marks from:", url);

            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Failed to fetch marks: ${response.statusText}`);
            const result = await response.json();
            console.log("Marks API Response:", result);

            // Map API marks data to StudentMarkRow
            const mappedData: StudentMarkRow[] = result.data?.map((apiMark: ApiMark) => ({
                id: apiMark.studentId,
                name: apiMark.student?.name || 'Unknown Student',
                matricule: apiMark.student?.matricule,
                markId: apiMark.id,
                currentScore: apiMark.score ?? '', // Use empty string for null/undefined scores for input
                originalScore: apiMark.score ?? null,
            })) || [];

            setStudentsWithMarks(mappedData);
            setTotalPages(result.meta?.last_page || 1);
            // setCurrentPage(result.meta?.current_page || 1); // Keep current page from state

            } catch (err: any) {
            const errorMsg = `Error loading students/marks: ${err.message}`;
                 toast.error(errorMsg);
            setSaveError(errorMsg);
            setStudentsWithMarks([]);
            setTotalPages(1);
            } finally {
            setIsLoadingStudentsAndMarks(false);
        }
    // Include necessary dependencies for refetching marks
    }, [selectedYearId, selectedExamSequenceId, selectedSubClassId, selectedSubjectId, currentPage, limit]);

    // Trigger fetchStudentsAndMarks when relevant filters or page change
    useEffect(() => {
        fetchStudentsAndMarks();
    }, [fetchStudentsAndMarks]); // Runs when function identity changes (i.e., dependencies change)

    // --- Reset Dependent Selections (Use data from hook) ---
    // Reset Sequence, Subclass, Subject when Year changes
    useEffect(() => {
                 setSelectedExamSequenceId('');
        setSelectedSubClassId('');
        setSelectedSubjectId('');
        setStudentsWithMarks([]);
    }, [selectedYearId]);

    // Reset Subject when Subclass changes
    useEffect(() => {
                 setSelectedSubjectId('');
        setStudentsWithMarks([]);
    }, [selectedSubClassId]);

    // Reset marks table when Sequence or Subject changes
    useEffect(() => {
        setStudentsWithMarks([]);
    }, [selectedExamSequenceId, selectedSubjectId]);

    // --- Mark Input Handling (Remains in page) ---
    const handleMarkChange = (studentId: number, value: string) => { /* ... */ };

    // --- Save Marks (Existing Logic - Potential future hook candidate) ---
    const handleSaveAllMarks = async () => { /* ... */ };

    // --- Pagination Handlers (Remain in page) ---
    const handlePreviousPage = () => { /* ... */ };
    const handleNextPage = () => { /* ... */ };

    // --- Filter Dropdown Component (Use data/state from hook) ---
    const renderFilterDropdown = (
        label: string,
        value: number | '' /* string */,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
        options: SelectOption[],
        isLoading: boolean,
        disabled: boolean = false,
        placeholder?: string
    ) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select
                value={value} // Use state variable from page
                onChange={onChange} // Use handler from page
                disabled={isLoading || disabled} // Disable during initial load or if dependent filter not selected
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
            >
                <option value="">{placeholder || `Select ${label}`}</option>
                {isLoading && <option>Loading...</option>}
                {!isLoading && options.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                ))}
                {!isLoading && options.length === 0 && value === '' && <option disabled>No options available</option>}
            </select>
        </div>
    );

    // --- JSX Rendering --- 
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Marks Management</h1>

            {/* Filters Row - Use data from hook */} 
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded shadow">
                {renderFilterDropdown('Academic Year', selectedYearId, (e) => setSelectedYearId(Number(e.target.value) || ''), academicYears, isLoadingFilters)}
                {renderFilterDropdown('Exam Sequence', selectedExamSequenceId, (e) => setSelectedExamSequenceId(Number(e.target.value) || ''), derivedExamSequences, isLoadingFilters, !selectedYearId)}
                {renderFilterDropdown('Subclass', selectedSubClassId, (e) => setSelectedSubClassId(Number(e.target.value) || ''), subClasses, isLoadingFilters, !selectedYearId)}
                {renderFilterDropdown('Subject', selectedSubjectId, (e) => setSelectedSubjectId(Number(e.target.value) || ''), derivedSubjects, isLoadingFilters, !selectedSubClassId)}
            </div>

            {/* Display Filter Errors */}
            {filterError && <p className="text-red-500 mb-4">Error loading filters: {filterError}</p>}

            {/* Marks Table Area */}
            <div className="mt-6">
                {/* Loading State for Table */}
                {isLoadingStudentsAndMarks && (
                    <div className="text-center py-10">
                         <p className="text-gray-600">Loading students and marks...</p>
                    </div>
                )}

                {/* Prompt to select filters (shows if fetch hasn't run because filters incomplete) */}
                {!isLoadingStudentsAndMarks && studentsWithMarks.length === 0 && (!selectedYearId || !selectedExamSequenceId || !selectedSubClassId || !selectedSubjectId) && (
                     <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
                         Please select an Academic Year, Exam Sequence, Subclass, and Subject to view and manage marks.
                     </div>
                 )}

                {/* No Students/Marks Found (shows after successful fetch with empty results) */}
                {!isLoadingStudentsAndMarks && studentsWithMarks.length === 0 && selectedYearId && selectedExamSequenceId && selectedSubClassId && selectedSubjectId && (
                    <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
                         No students are enrolled for the selected Subclass and Academic Year, or no marks data is available for this specific Exam and Subject yet.
                     </div>
                )}

                {/* Display Table when loaded and has data */}
                {/* Simplified Condition: Check for loading state and if data exists */}
                {!isLoadingStudentsAndMarks && studentsWithMarks.length > 0 && (
                    <>
                        <div className="overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg mb-6">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            #
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Matricule
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Student Name
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Mark
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentsWithMarks.map((student, index) => (
                                        <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{index + 1 + (currentPage - 1) * limit}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{student.matricule || 'N/A'}</td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                <input
                                                    type="number" 
                                                    step="0.1" 
                                                    min="0"
                                                    max="20"
                                                    value={student.currentScore}
                                                    onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                                    className={`w-24 p-1.5 border rounded text-sm ${
                                                        (() => {
                                                            const currentScoreStr = String(student.currentScore).trim();
                                                            const currentScoreNumeric = currentScoreStr === '' ? null : parseFloat(currentScoreStr);
                                                            return currentScoreNumeric !== student.originalScore;
                                                        })()
                                                        ? 'border-blue-500 ring-1 ring-blue-300 bg-blue-50'
                                                        : 'border-gray-300'
                                                    } focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                                                    disabled={isSavingMarks}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* --- Pagination Controls --- */}
                        {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 mb-6 px-1">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1 || isLoadingStudentsAndMarks || isSavingMarks}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-700">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages || isLoadingStudentsAndMarks || isSavingMarks}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                        )}

                        {/* --- Save All Button --- */}
                        <div className="text-right mt-6">
                            <button
                                onClick={handleSaveAllMarks}
                                disabled={isSavingMarks || isLoadingStudentsAndMarks || studentsWithMarks.length === 0}
                                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingMarks ? (
                                     <span className="flex items-center">
                                         {/* Spinner SVG */} 
                                         <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                         </svg>
                                        Saving...
                                     </span>
                                ) : 'Save All Changes'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 