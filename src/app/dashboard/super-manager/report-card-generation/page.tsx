'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentArrowDownIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
    status?: 'OPEN' | 'CLOSED' | 'FINALIZED' | 'REPORTS_GENERATING' | 'REPORTS_AVAILABLE' | 'REPORTS_FAILED';
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

type ReportAvailability = {
    available: boolean;
    status: "COMPLETED" | "PENDING" | "PROCESSING" | "FAILED" | "NOT_ENROLLED" | "SEQUENCE_NOT_FOUND" | "NO_MARKS" | "NOT_GENERATED" | "SUBCLASS_NOT_FOUND" | "NO_STUDENTS";
    message: string;
    reportData?: {
        studentName?: string;
        matricule?: string;
        className?: string;
        subClassName?: string;
        enrolledStudents?: number;
        examSequence: number;
        termName: string;
        filePath?: string;
        generatedAt?: string;
        errorMessage?: string;
        marksCount?: number;
    };
};

// --- API Configuration --- (remains the same)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- Main Page Component ---
export default function ReportCardGenerationPage() {
    // Data States
    const [academicYearsData, setAcademicYearsData] = useState<AcademicYear[]>([]);
    const [allSubClassesData, setAllSubClassesData] = useState<SubClass[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);

    // Filter States
    const [selectedYearId, setSelectedYearId] = useState<number | null>(null);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [selectedSequenceId, setSelectedSequenceId] = useState<number | null>(null);
    const [selectedSubClassId, setSelectedSubClassId] = useState<number | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<number | 'all' | null>(null);
    const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

    // Loading States
    const [isLoadingFilters, setIsLoadingFilters] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Availability States
    const [studentReportAvailability, setStudentReportAvailability] = useState<ReportAvailability | null>(null);
    const [subclassReportAvailability, setSubclassReportAvailability] = useState<ReportAvailability | null>(null);

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
                const subClassesPromise = fetch(`${API_BASE_URL}/classes/sub-classes?limit=40`, { headers });

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
        if (!selectedYearId || !selectedTermId) return [];
        const selectedYear = academicYearsData.find(year => year.id === selectedYearId);
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
                const fetchedStudents = data.data || [];
                setAllStudents(fetchedStudents);
                setStudents(fetchedStudents);
            } catch (error: any) {
                toast.error(`Error fetching students: ${error.message}`);
                setAllStudents([]);
                setStudents([]);
            } finally {
                setIsLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [selectedSubClassId, selectedYearId]);

    // --- Filter students based on search term ---
    useEffect(() => {
        if (!studentSearchTerm.trim()) {
            setStudents(allStudents);
        } else {
            const filtered = allStudents.filter(student =>
                student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                (student.matricule && student.matricule.toLowerCase().includes(studentSearchTerm.toLowerCase()))
            );
            setStudents(filtered);

            // If current selected student is not in filtered results, clear selection
            if (selectedStudentId && selectedStudentId !== 'all') {
                const isSelectedStudentInFiltered = filtered.some(student => student.id === selectedStudentId);
                if (!isSelectedStudentInFiltered) {
                    setSelectedStudentId(null);
                }
            }
        }
    }, [studentSearchTerm, allStudents, selectedStudentId]);

    // --- Check Report Availability ---
    const checkReportAvailability = useCallback(async () => {
        if (!selectedYearId || !selectedSequenceId) {
            setStudentReportAvailability(null);
            setSubclassReportAvailability(null);
            return;
        }

        setIsCheckingAvailability(true);
        const token = getAuthToken();
        if (!token) return;

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const promises: Promise<any>[] = [];

            // Check student report availability if student is selected
            if (selectedStudentId && selectedStudentId !== 'all') {
                const studentUrl = `${API_BASE_URL}/report-cards/student/${selectedStudentId}/availability?academicYearId=${selectedYearId}&examSequenceId=${selectedSequenceId}`;
                promises.push(
                    fetch(studentUrl, { headers })
                        .then(res => res.json())
                        .then(data => ({ type: 'student', data }))
                );
            }

            // Check subclass report availability if subclass is selected
            if (selectedSubClassId) {
                const subclassUrl = `${API_BASE_URL}/report-cards/subclass/${selectedSubClassId}/availability?academicYearId=${selectedYearId}&examSequenceId=${selectedSequenceId}`;
                promises.push(
                    fetch(subclassUrl, { headers })
                        .then(res => res.json())
                        .then(data => ({ type: 'subclass', data }))
                );
            }

            const results = await Promise.all(promises);

            results.forEach(result => {
                if (result.type === 'student') {
                    setStudentReportAvailability(result.data.success ? result.data.data : null);
                } else if (result.type === 'subclass') {
                    setSubclassReportAvailability(result.data.success ? result.data.data : null);
                }
            });

        } catch (error: any) {
            console.error('Error checking report availability:', error);
        } finally {
            setIsCheckingAvailability(false);
        }
    }, [selectedYearId, selectedSequenceId, selectedStudentId, selectedSubClassId]);

    // Check availability when relevant selections change
    useEffect(() => {
        checkReportAvailability();
    }, [checkReportAvailability]);

    // --- Reset Dependent Selections --- 
    useEffect(() => {
        setSelectedTermId(null);
        setSelectedSequenceId(null);
        setSelectedSubClassId(null);
        setSelectedStudentId(null);
        setStudents([]);
        setAllStudents([]);
        setStudentSearchTerm('');
        setStudentReportAvailability(null);
        setSubclassReportAvailability(null);
    }, [selectedYearId]);

    useEffect(() => {
        setSelectedSequenceId(null);
        setSelectedSubClassId(null);
        setSelectedStudentId(null);
        setStudents([]);
        setAllStudents([]);
        setStudentSearchTerm('');
        setStudentReportAvailability(null);
        setSubclassReportAvailability(null);
    }, [selectedTermId]);

    useEffect(() => {
        setSelectedStudentId(null);
        setStudentSearchTerm('');
        setStudentReportAvailability(null);
        setSubclassReportAvailability(null);
    }, [selectedSubClassId]);

    // --- Download existing report ---
    const downloadExistingReport = useCallback(async (type: 'student' | 'subclass') => {
        if (!selectedYearId || !selectedSequenceId) {
            toast.error("Please select Academic Year and Exam Sequence.");
            return;
        }

        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication failed. Please log in again.");
            return;
        }

        const toastId = toast.loading(`Downloading ${type} report...`);

        try {
            let url: string;
            if (type === 'student' && selectedStudentId && selectedStudentId !== 'all') {
                url = `${API_BASE_URL}/report-cards/student/${selectedStudentId}?academicYearId=${selectedYearId}&examSequenceId=${selectedSequenceId}`;
            } else if (type === 'subclass' && selectedSubClassId) {
                url = `${API_BASE_URL}/report-cards/subclass/${selectedSubClassId}?academicYearId=${selectedYearId}&examSequenceId=${selectedSequenceId}`;
            } else {
                throw new Error("Invalid selection for download");
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.status === 202) {
                // Report is still processing
                const data = await response.json();
                toast.error(`Report is ${data.status.toLowerCase()}. Please try again later.`, { id: toastId });
                return;
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to download report (${response.status})`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Received response is not a PDF file.');
            }

            // Extract filename from Content-Disposition header
            const disposition = response.headers.get('content-disposition');
            let filename = `${type}-report.pdf`;
            if (disposition && disposition.includes('attachment')) {
                const filenameRegex = /filename[^;=\n]*=((['"]?)([^\"\';\n]*)\2)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[3]) {
                    filename = matches[3].replace(/^[\"']|[\"']$/g, '');
                }
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success(`${type === 'student' ? 'Student' : 'Subclass'} report downloaded successfully!`, { id: toastId });

        } catch (err: any) {
            console.error(`${type} report download failed:`, err);
            toast.error(`${type === 'student' ? 'Student' : 'Subclass'} report download failed: ${err.message}`, { id: toastId });
        }
    }, [selectedYearId, selectedSequenceId, selectedStudentId, selectedSubClassId]);

    // --- Generate and download new report ---
    const generateAndDownloadReport = useCallback(async (type: 'student' | 'subclass') => {
        if (!selectedYearId || !selectedSequenceId) {
            toast.error("Please select Academic Year and Exam Sequence.");
            return;
        }

        if (type === 'student' && (!selectedStudentId || selectedStudentId === 'all')) {
            toast.error("Please select a specific student.");
            return;
        }

        if (type === 'subclass' && !selectedSubClassId) {
            toast.error("Please select a subclass.");
            return;
        }

        setIsGenerating(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication failed. Please log in again.");
            setIsGenerating(false);
            return;
        }

        const toastId = toast.loading(`Generating ${type} report...`);

        try {
            let url: string;
            if (type === 'student') {
                url = `${API_BASE_URL}/report-cards/student/${selectedStudentId}/generate`;
            } else {
                url = `${API_BASE_URL}/report-cards/subclass/${selectedSubClassId}/generate`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    academicYearId: selectedYearId,
                    examSequenceId: selectedSequenceId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to generate report (${response.status})`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Received response is not a PDF file.');
            }

            // Extract filename from Content-Disposition header
            const disposition = response.headers.get('content-disposition');
            let filename = `${type}-report.pdf`;
            if (disposition && disposition.includes('attachment')) {
                const filenameRegex = /filename[^;=\n]*=((['"]?)([^\"\';\n]*)\2)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[3]) {
                    filename = matches[3].replace(/^[\"']|[\"']$/g, '');
                }
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success(`${type === 'student' ? 'Student' : 'Subclass'} report generated and downloaded successfully!`, { id: toastId });

            // Refresh availability after successful generation
            setTimeout(() => {
                checkReportAvailability();
            }, 1000);

        } catch (err: any) {
            console.error(`${type} report generation failed:`, err);
            toast.error(`${type === 'student' ? 'Student' : 'Subclass'} report generation failed: ${err.message}`, { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    }, [selectedYearId, selectedSequenceId, selectedStudentId, selectedSubClassId, checkReportAvailability]);

    // --- Helper function to get status icon ---
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
            case 'PROCESSING':
            case 'PENDING':
                return <ClockIcon className="h-5 w-5 text-yellow-600" />;
            case 'FAILED':
                return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
            default:
                return null;
        }
    };

    // --- Helper function to get exam sequence status badge ---
    const getExamSequenceStatusBadge = (status?: string) => {
        if (!status) return null;

        const getStatusStyles = (status: string) => {
            switch (status) {
                case 'OPEN':
                    return 'bg-green-100 text-green-800 border-green-200';
                case 'CLOSED':
                    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                case 'FINALIZED':
                    return 'bg-blue-100 text-blue-800 border-blue-200';
                case 'REPORTS_GENERATING':
                    return 'bg-purple-100 text-purple-800 border-purple-200';
                case 'REPORTS_AVAILABLE':
                    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                case 'REPORTS_FAILED':
                    return 'bg-red-100 text-red-800 border-red-200';
                default:
                    return 'bg-gray-100 text-gray-800 border-gray-200';
            }
        };

        return (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ml-2 ${getStatusStyles(status)}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    // --- Calculate Button Disabled States ---
    const isStudentDownloadDisabled = !(
        selectedYearId !== null &&
        selectedSequenceId !== null &&
        selectedStudentId !== null &&
        selectedStudentId !== 'all' &&
        studentReportAvailability?.status === 'COMPLETED'
    ) || isGenerating;

    const isStudentGenerateDisabled = !(
        selectedYearId !== null &&
        selectedSequenceId !== null &&
        selectedStudentId !== null &&
        selectedStudentId !== 'all'
    ) || isGenerating;

    const isSubclassDownloadDisabled = !(
        selectedYearId !== null &&
        selectedSequenceId !== null &&
        selectedSubClassId !== null &&
        subclassReportAvailability?.status === 'COMPLETED'
    ) || isGenerating;

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

    const renderExamSequenceDropdown = (
        label: string,
        value: number | null,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
        options: ExamSequence[],
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
                    <option key={option.id} value={option.id}>
                        {option.name}
                        {option.status && ` (${option.status.replace('_', ' ')})`}
                    </option>
                ))}
            </select>
            {value && options.find(opt => opt.id === value)?.status && (
                <div className="mt-1">
                    {getExamSequenceStatusBadge(options.find(opt => opt.id === value)?.status)}
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-full mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Report Card Generation</h1>

                {error && <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-300 rounded">Error: {error}</div>}

                {/* Filter Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
                    {/* Academic Year */}
                    {renderFilterDropdown("Academic Year", selectedYearId, e => setSelectedYearId(e.target.value ? Number(e.target.value) : null), academicYearsData.map(y => ({ id: y.id, name: y.name })), isLoadingFilters)}
                    {/* Term */}
                    {renderFilterDropdown("Term", selectedTermId, e => setSelectedTermId(e.target.value ? Number(e.target.value) : null), derivedTerms, isLoadingFilters, selectedYearId === null)}
                    {/* Sequence/Evaluation */}
                    {renderExamSequenceDropdown("Evaluation", selectedSequenceId, e => setSelectedSequenceId(e.target.value ? Number(e.target.value) : null), derivedExamSequences, isLoadingFilters, selectedTermId === null)}
                    {/* SubClass */}
                    {renderFilterDropdown("Subclass", selectedSubClassId, e => setSelectedSubClassId(e.target.value ? Number(e.target.value) : null), allSubClassesData, isLoadingFilters, false)}
                    {/* Student Search */}
                    <div>
                        <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 mb-1">Student Search</label>
                        <input
                            id="studentSearch"
                            type="text"
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            placeholder="Search by name or matricule..."
                            disabled={isLoadingStudents || selectedSubClassId === null || selectedYearId === null}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />

                        {/* Show selected student */}
                        {selectedStudentId && (
                            <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                                <span className="font-medium text-blue-800">
                                    Selected: {selectedStudentId === 'all' ? 'All Students in Subclass' :
                                        allStudents.find(s => s.id === selectedStudentId)?.name || 'Unknown Student'}
                                </span>
                                <button
                                    onClick={() => setSelectedStudentId(null)}
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                    Clear
                                </button>
                            </div>
                        )}

                        {students.length > 0 && studentSearchTerm.trim() && (
                            <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md bg-white shadow-sm">
                                <div
                                    className={`p-2 hover:bg-gray-50 cursor-pointer border-b ${selectedStudentId === 'all' ? 'bg-blue-50 border-blue-200' : ''}`}
                                    onClick={() => setSelectedStudentId('all')}
                                >
                                    <span className="font-medium">All Students in Subclass</span>
                                    {selectedStudentId === 'all' && <span className="text-blue-600 ml-2">✓</span>}
                                </div>
                                {students.map(student => (
                                    <div
                                        key={student.id}
                                        className={`p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 ${selectedStudentId === student.id ? 'bg-blue-50 border-blue-200' : ''}`}
                                        onClick={() => setSelectedStudentId(student.id)}
                                    >
                                        <span className="font-medium">{student.name}</span>
                                        {student.matricule && <span className="text-sm text-gray-500 ml-2">({student.matricule})</span>}
                                        {selectedStudentId === student.id && <span className="text-blue-600 ml-2">✓</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Report Availability Status */}
                {(studentReportAvailability || subclassReportAvailability) && (
                    <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Report Availability Status</h3>

                        {studentReportAvailability && selectedStudentId && selectedStudentId !== 'all' && (
                            <div className="mb-3 p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        {getStatusIcon(studentReportAvailability.status)}
                                        <span className="ml-2 font-medium">Student Report</span>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${studentReportAvailability.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        studentReportAvailability.status === 'PROCESSING' || studentReportAvailability.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {studentReportAvailability.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{studentReportAvailability.message}</p>
                                {studentReportAvailability.reportData?.generatedAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Generated: {new Date(studentReportAvailability.reportData.generatedAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        )}

                        {subclassReportAvailability && selectedSubClassId && (
                            <div className="p-3 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        {getStatusIcon(subclassReportAvailability.status)}
                                        <span className="ml-2 font-medium">Subclass Report</span>
                                    </div>
                                    <span className={`px-2 py-1 text-xs rounded-full ${subclassReportAvailability.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                        subclassReportAvailability.status === 'PROCESSING' || subclassReportAvailability.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                        {subclassReportAvailability.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{subclassReportAvailability.message}</p>
                                {subclassReportAvailability.reportData?.generatedAt && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Generated: {new Date(subclassReportAvailability.reportData.generatedAt).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons Section */}
                <div className="mt-6 p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>

                    {/* Student Report Actions */}
                    {selectedStudentId && selectedStudentId !== 'all' && (
                        <div className="mb-6">
                            <h4 className="text-md font-medium text-gray-700 mb-3">Student Report</h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => downloadExistingReport('student')}
                                    disabled={isStudentDownloadDisabled}
                                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                    Download Existing Report
                                </button>

                                <button
                                    onClick={() => generateAndDownloadReport('student')}
                                    disabled={isStudentGenerateDisabled}
                                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                    Generate New Report
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Subclass Report Actions */}
                    {selectedSubClassId && (
                        <div className="mb-6">
                            <h4 className="text-md font-medium text-gray-700 mb-3">Subclass Report</h4>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => downloadExistingReport('subclass')}
                                    disabled={isSubclassDownloadDisabled}
                                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                    Download Existing Report
                                </button>

                                <button
                                    onClick={() => generateAndDownloadReport('subclass')}
                                    disabled={isSubclassGenerateDisabled}
                                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                    Generate New Report
                                </button>
                            </div>
                        </div>
                    )}

                    {(isGenerating || isCheckingAvailability) && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-500">
                                {isGenerating ? 'Generating report(s)... Please wait.' : 'Checking availability...'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 