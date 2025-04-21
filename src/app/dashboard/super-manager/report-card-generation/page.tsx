'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';

// --- Types --- (Using refined types)

type SelectOption = {
    id: number;
    name: string;
};

type ExamSequence = {
    id: number;
    sequenceNumber: number;
    academicYearId: number;
    termId: number;
    createdAt?: string;
    updatedAt?: string;
    name: string;
};

type Term = { 
    id: number;
    name: string;
    academicYearId: number;
};

type AcademicYear = {
    id: number;
    name: string;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
    updatedAt?: string;
    terms: Term[]; 
    examSequences: ExamSequence[]; 
};

// Remove Sequence type if ExamSequence covers it
// type Sequence = SelectOption & { term_id: number; sequence_number?: number; name?: string }; 

// Remove Class type
// type Class = SelectOption;

type SubClass = {
    id: number;
    name: string;
    classId?: number;
    className?: string;
};

type Student = {
    id: number;
    name: string;
    matricule?: string;
};

// --- API Configuration --- (remains the same)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- Main Page Component ---
export default function ReportCardGenerationPage() {
    // Data States
    const [academicYearsData, setAcademicYearsData] = useState<AcademicYear[]>([]);
    // Remove unused states
    // const [terms, setTerms] = useState<Term[]>([]);
    // const [sequences, setSequences] = useState<Sequence[]>([]);
    // const [classes, setClasses] = useState<Class[]>([]);
    const [allSubClassesData, setAllSubClassesData] = useState<SubClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // Filter States
    const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedSequenceId, setSelectedSequenceId] = useState<number | null>(null);
    // const [selectedClassId, setSelectedClassId] = useState<number | null>(null); // Removed
    const [selectedSubClassId, setSelectedSubClassId] = useState<number | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<number | 'all' | null>(null);

    // Loading States - Remove unused ones
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    // const [isLoadingTerms, setIsLoadingTerms] = useState(false); // Removed
    // const [isLoadingSequences, setIsLoadingSequences] = useState(false); // Removed
    // const [isLoadingSubClasses, setIsLoadingSubClasses] = useState(false); // Removed
    const [isLoadingStudents, setIsLoadingStudents] = useState(false); // Keep
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Fetch Initial Filter Data (Years and All SubClasses) ---
    useEffect(() => {
        const fetchInitialFilters = async () => {
            setIsLoadingFilters(true);
            setError(null);
            const token = getAuthToken();
            if (!token) { toast.error("Authentication token not found."); setIsLoadingFilters(false); return; }

            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const yearsPromise = fetch(`${API_BASE_URL}/academic-years`, { headers });
                const subClassesPromise = fetch(`${API_BASE_URL}/classes/sub-classes`, { headers });

                const [yearsRes, subClassesRes] = await Promise.all([yearsPromise, subClassesPromise]);

                if (!yearsRes.ok) throw new Error(`Failed to fetch academic years: ${yearsRes.statusText}`);
                if (!subClassesRes.ok) throw new Error(`Failed to fetch subclasses: ${subClassesRes.statusText}`);

                const yearsData = await yearsRes.json();
                const subClassesData = await subClassesRes.json();

                console.log("Report Card - Years Data Raw:", yearsData);
                console.log("Report Card - All SubClasses Data Raw:", subClassesData);

                setAcademicYearsData(yearsData.data?.map((year: any) => ({
                    ...year,
                    terms: year.terms || [],
                    examSequences: (year.examSequences || []).map((seq: any) => ({
                         ...seq,
                         name: seq.name || `Sequence ${seq.sequenceNumber}`
                    }))
                })) || []);

                setAllSubClassesData(subClassesData.data || []);

            } catch (err: any) {
                 const errorMsg = `Error loading initial filters: ${err.message}`;
                 toast.error(errorMsg);
                 setError(errorMsg);
                 setAcademicYearsData([]);
                 setAllSubClassesData([]);
            } finally {
                setIsLoadingFilters(false);
            }
        };
        fetchInitialFilters();
    }, []);

    // --- Derive Dropdown Options --- 
    const derivedTerms = useMemo(() => {
        if (!selectedYearId) return [];
        const selectedYear = academicYearsData.find(year => year.id === selectedYearId);
        return selectedYear?.terms || [];
    }, [selectedYearId, academicYearsData]);

    const derivedExamSequences = useMemo(() => {
        if (!selectedYearId || !selectedTermId) return []; // Filter by term ID
        const selectedYear = academicYearsData.find(year => year.id === selectedYearId);
        // Filter sequences from the selected year based on the selected termId
        return selectedYear?.examSequences.filter(seq => seq.termId === selectedTermId) || [];
    }, [selectedYearId, selectedTermId, academicYearsData]);

    // --- Keep Dynamic Fetch for Students --- 
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedSubClassId || !selectedYearId) {
                setStudents([]);
                setSelectedStudentId(null);
                return;
            }
            setIsLoadingStudents(true);
            const token = getAuthToken();
            if (!token) { toast.error("Auth error"); setIsLoadingStudents(false); return; }
            try {
                 const url = `${API_BASE_URL}/students?subclassId=${selectedSubClassId}&academicYearId=${selectedYearId}&status=ENROLLED`;
                 const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                 if (!res.ok) throw new Error('Failed to fetch students for subclass');
                 const data = await res.json();
                 setStudents(data.data || []);
            } catch (error: any) {
                 toast.error(`Error fetching students: ${error.message}`);
                 setStudents([]);
            } finally {
                 setIsLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [selectedSubClassId, selectedYearId]);

    // --- Reset Dependent Selections --- 
    useEffect(() => {
        setSelectedTermId(null); // Reset Term when Year changes
        setSelectedSequenceId(null);
        setSelectedSubClassId(null);
        setSelectedStudentId(null);
        setStudents([]); // Clear students too
    }, [selectedYearId]);

    useEffect(() => {
        setSelectedSequenceId(null); // Reset Sequence when Term changes
        setSelectedSubClassId(null); // Reset Subclass when Term changes (as Sequence depends on Term)
        setSelectedStudentId(null);
        setStudents([]);
    }, [selectedTermId]);

    useEffect(() => {
        // No reset needed based only on sequence change
    }, [selectedSequenceId]);

    useEffect(() => {
        setSelectedStudentId(null); // Reset Student when Subclass changes
        // Fetch students is handled by its own useEffect
    }, [selectedSubClassId]);

    // --- Handlers --- 
    const handleGenerateStudentReport = useCallback(async () => {
        if (!selectedYearId || !selectedTermId || !selectedSequenceId || !selectedSubClassId || !selectedStudentId || selectedStudentId === 'all' || selectedStudentId === null) {
            toast.error("Please select Year, Term, Evaluation, Subclass, and a specific Student.");
            return;
        }

        // Ensure selectedStudentId is a number before proceeding
        const studentId = Number(selectedStudentId);
        if (isNaN(studentId)) {
            toast.error("Invalid student selection.");
            return;
        }

        setIsGenerating(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication failed. Please log in again.");
            setIsGenerating(false);
            return;
        }

        // Construct the URL based on the comment/API doc
        const url = `${API_BASE_URL}/report-cards/student/${studentId}?academic_year_id=${selectedYearId}&term_id=${selectedTermId}&exam_sequence_id=${selectedSequenceId}`;
        console.log("Generating student report card from URL:", url);
        const toastId = toast.loading("Generating student report card...");

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                let errorMsg = `Failed to generate report card (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = `${errorMsg}: ${errorData.message || 'Unknown server error'}`;
                } catch (e) {
                    errorMsg = `${errorMsg}: ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Received response is not a PDF file.');
            }

            const disposition = response.headers.get('content-disposition');
            let filename = `student-${studentId}-report.pdf`; // Default filename
            if (disposition && disposition.includes('attachment')) {
                const filenameRegex = /filename[^;=\n]*=((['"]?)([^\"\';\n]*)\2)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[3]) {
                    filename = matches[3].replace(/^[\"']|[\"']$/g, '');
                }
            }

            console.log("Received PDF, attempting download as:", filename);

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success("Student report card downloaded successfully!", { id: toastId });

        } catch (err: any) {
            console.error("Student report generation failed:", err);
            toast.error(`Student report generation failed: ${err.message}`, { id: toastId });
        } finally {
             setIsGenerating(false);
        }

    }, [selectedYearId, selectedTermId, selectedSequenceId, selectedSubClassId, selectedStudentId]);

    const handleGenerateSubclassReport = async () => {
        if (selectedYearId === null || selectedSequenceId === null || selectedSubClassId === null) {
            toast.error("Please select Academic Year, Exam Sequence, and Subclass.");
            return;
        }

        setIsGenerating(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication failed. Please log in again.");
            setIsGenerating(false);
            return;
        }

        const url = `${API_BASE_URL}/report-cards/sub_class/${selectedSubClassId}?academic_year_id=${selectedYearId}&exam_sequence_id=${selectedSequenceId}`;
        console.log("Generating report card from URL:", url);
        const toastId = toast.loading("Generating report cards... This may take a moment.");

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                let errorMsg = `Failed to generate report cards (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg = `${errorMsg}: ${errorData.message || 'Unknown server error'}`;
                } catch (e) {
                    errorMsg = `${errorMsg}: ${response.statusText}`;
                }
                throw new Error(errorMsg);
            }

            // Check content type
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Received response is not a PDF file.');
            }

            // Extract filename from Content-Disposition header
            const disposition = response.headers.get('content-disposition');
            let filename = `subclass-${selectedSubClassId}-reports.pdf`; // Default filename
            if (disposition && disposition.includes('attachment')) {
                const filenameRegex = /filename[^;=\n]*=((['"]?)([^\"\';\n]*)\2)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[3]) {
                    filename = matches[3].replace(/^[\"']|[\"']$/g, '');
                }
            }

            console.log("Received PDF, attempting download as:", filename);

            // Process Blob download
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Clean up
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success("Report cards downloaded successfully!", { id: toastId });

        } catch (err: any) {
            console.error("Report generation failed:", err);
            toast.error(`Report generation failed: ${err.message}`, { id: toastId });
        } finally {
             setIsGenerating(false);
        }
    };

    // --- Calculate Button Disabled States ---
    const isStudentGenerateDisabled = !(
        selectedYearId !== null &&
        selectedTermId !== null &&
        selectedSequenceId !== null &&
        selectedSubClassId !== null &&
        selectedStudentId !== null &&
        selectedStudentId !== 'all'
    ) || isGenerating;

    // Subclass generation only needs Year, Sequence, Subclass
    const isSubclassGenerateDisabled = !(
        selectedYearId !== null &&
        selectedSequenceId !== null &&
        selectedSubClassId !== null
    ) || isGenerating;

    // --- JSX --- 
    const renderFilterDropdown = (
        label: string,
        value: number | null, 
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
        options: SelectOption[],
        isLoading: boolean,
        disabled: boolean = false,
        placeholder?: string
    ) => (
        <div className="mb-4 md:mb-0 md:mr-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <select
                value={value === null ? '' : value}
                onChange={onChange}
                disabled={isLoading || disabled || (!isLoading && options.length === 0)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
                <option value="">
                    {isLoading ? 'Loading...' : (placeholder || (options.length === 0 && !disabled ? `No ${label} available` : `Select ${label}...`))}
                 </option>
                {options.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                ))}
            </select>
        </div>
    );

    // Check if all filters *needed for generation* are selected
    const canGenerate = selectedYearId !== null && selectedSequenceId !== null && selectedSubClassId !== null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-full mx-auto">
                 <h1 className="text-2xl font-bold text-gray-900 mb-6">Report Card Generation</h1>

                 {error && <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">Error: {error}</div>}

                {/* Filter Section - Already updated */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
                    {/* Academic Year */} 
                    {renderFilterDropdown("Academic Year", selectedYearId, e => setSelectedYearId(e.target.value ? Number(e.target.value) : null), academicYearsData.map(y => ({ id: y.id, name: y.name })), isLoadingFilters)}
                    {/* Term */} 
                    {renderFilterDropdown("Term", selectedTermId, e => setSelectedTermId(e.target.value ? Number(e.target.value) : null), derivedTerms, isLoadingFilters, selectedYearId === null)}
                     {/* Sequence/Evaluation */} 
                    {renderFilterDropdown("Evaluation", selectedSequenceId, e => setSelectedSequenceId(e.target.value ? Number(e.target.value) : null), derivedExamSequences, isLoadingFilters, selectedTermId === null)}
                     {/* SubClass */} 
                    {renderFilterDropdown("Subclass", selectedSubClassId, e => setSelectedSubClassId(e.target.value ? Number(e.target.value) : null), allSubClassesData, isLoadingFilters, false)} 
                     {/* Student Selection */} 
                     <div>
                        <label htmlFor="student" className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                        <select 
                            id="student" 
                            value={selectedStudentId === null ? '' : selectedStudentId === 'all' ? 'all' : selectedStudentId} 
                            onChange={e => setSelectedStudentId(e.target.value === 'all' ? 'all' : e.target.value === '' ? null : Number(e.target.value))} 
                            disabled={isLoadingStudents || selectedSubClassId === null || selectedYearId === null} 
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">{isLoadingStudents ? 'Loading...' : 'Select Student'}</option>
                            {students.length > 0 && <option value="all">-- All Students in Subclass --</option>}
                            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.matricule || 'No ID'})</option>)}
                        </select>
                    </div>
                 </div>

                 {/* Action Buttons Section */} 
                 <div className="mt-6 p-4 bg-white rounded-lg shadow-sm flex flex-col md:flex-row justify-start items-start md:items-center gap-4">
                     <button 
                        onClick={handleGenerateStudentReport} 
                        disabled={isStudentGenerateDisabled}
                        className="w-full md:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                         Generate for Selected Student
                     </button>
                     
                     <button 
                        onClick={handleGenerateSubclassReport} 
                        disabled={isSubclassGenerateDisabled}
                        className="w-full md:w-auto flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                         <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                         Generate for Entire Subclass
                     </button>
                     
                     {isGenerating && <span className="text-sm text-gray-500">Generating report(s)... Please wait.</span>}
                 </div>
            </div>
        </div>
    );
} 