'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import useSWR, { mutate } from 'swr'; // Import mutate

// --- Types --- (Assume these are defined or imported)
type Student = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  matricule?: string;
  parentName?: string;
  parentPhone?: string;
  className?: string;
  subClassName?: string;
  subClassId?: number;
  academicYearName?: string;
  academicYearId?: number;
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: string;
  residence?: string;
  former_school?: string;
};

type SubClassInfo = {
  id: number;
  name: string;
  classId: number;
  className?: string;
};

type AcademicYearInfo = {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
};

// Separate types for form data if they differ significantly from Student
type AddEnrollFormData = Partial<Student> & {
    subClassId?: string | number;
    academicYearId?: string | number;
    repeater?: boolean;
    photo?: string; // Or File?
    parentName?: string; // Explicitly add if separate from Student
    parentPhone?: string;
}; 

type EditFormData = Partial<Student> & {
    // Add fields specific to edit form if any
     parentName?: string;
     parentPhone?: string;
};

type EnrollmentFormData = {
    subClassId?: string | number;
    academicYearId?: string | number;
    repeater?: boolean;
    photo?: string; // Or File?
};

type EnrollmentStatusFilter = 'all' | 'enrolled' | 'not-enrolled';

// --- Constants --- 
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const STUDENTS_PER_PAGE = 10;
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- SWR Fetcher --- 
const fetcher = async (url: string) => {
    const token = getAuthToken();
    if (!token) throw new Error('Authentication token not found.');
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    return response.json();
};

// --- Hook --- 
export function useStudentManagement() {

    // --- Filters & Pagination State ---
    const [searchTerm, setSearchTerm] = useState(''); 
    const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentStatusFilter>('all');
    const [subClassFilter, setSubClassFilter] = useState<string>('all'); // 'all' or subclass ID
    const [currentPage, setCurrentPage] = useState(1);

    // --- SWR Data Fetching ---

    // 1. SubClasses (fetched once)
    const SUBCLASSES_ENDPOINT = `${API_BASE_URL}/sub-classes`;
    const { data: subClassesResult, error: subClassesErrorSWR } = useSWR<{ data: SubClassInfo[] }>(SUBCLASSES_ENDPOINT, fetcher);
    const subClasses = useMemo(() => subClassesResult?.data || [], [subClassesResult]);

    // 2. Academic Years (fetched once, consider filtering active?)
    const ACADEMIC_YEARS_ENDPOINT = `${API_BASE_URL}/academic-years`;
    const { data: yearsResult, error: yearsErrorSWR } = useSWR<{ data: AcademicYearInfo[] }>(ACADEMIC_YEARS_ENDPOINT, fetcher);
    const academicYears = useMemo(() => yearsResult?.data || [], [yearsResult]);
    const activeAcademicYear = useMemo(() => academicYears.find(ay => ay.isActive), [academicYears]);

    // 3. Students (dynamic key based on filters/pagination)
    const studentListKey = useMemo(() => {
        const params = new URLSearchParams();
        params.append('page', String(currentPage));
        params.append('limit', String(STUDENTS_PER_PAGE));
        if (searchTerm) params.append('search', searchTerm); // Assuming API supports search
        if (enrollmentFilter !== 'all') params.append('enrollmentStatus', enrollmentFilter === 'enrolled' ? 'enrolled' : 'not_enrolled');
        if (subClassFilter !== 'all') params.append('subClassId', subClassFilter);
        return `${API_BASE_URL}/students?${params.toString()}`;
    }, [currentPage, searchTerm, enrollmentFilter, subClassFilter]);

    const { 
        data: studentsApiResult, 
        error: studentsErrorSWR, 
        isLoading: isLoadingStudentsSWR, 
        mutate: mutateStudentList // Get mutate function for the student list
    } = useSWR<{ data: any[], meta?: { total?: number } }>(studentListKey, fetcher, {
        // Optional: Keep previous data while loading new page/filter results
        // keepPreviousData: true,
    });

    // --- Process SWR Data ---
    const students = useMemo((): Student[] => {
        if (!studentsApiResult?.data) return [];
        // Map API data to Student type
        return studentsApiResult.data.map((s: any): Student => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            matricule: s.matricule,
            // Safely access nested enrollment/parent data
            subClassName: s.enrollments?.[0]?.subClass?.name,
            subClassId: s.enrollments?.[0]?.subClass?.id,
            className: s.enrollments?.[0]?.subClass?.class?.name,
            academicYearId: s.enrollments?.[0]?.academic_year_id,
            academicYearName: s.enrollments?.[0]?.academicYear?.name, // Ensure API provides this if needed
            date_of_birth: s.dateOfBirth, // Match API field name
            place_of_birth: s.placeOfBirth,
            gender: s.gender,
            residence: s.residence,
            former_school: s.formerSchool,
            parentName: s.parents?.[0]?.name,
            parentPhone: s.parents?.[0]?.phone,
        }));
    }, [studentsApiResult]);

    const totalStudents = useMemo(() => studentsApiResult?.meta?.total || 0, [studentsApiResult]);

    // --- Consolidated Loading & Error --- 
    const isLoading = isLoadingStudentsSWR; // Primarily loading students list
    const fetchError = useMemo(() => {
        if (subClassesErrorSWR) return `Failed to load subclasses: ${subClassesErrorSWR.message}`;
        if (yearsErrorSWR) return `Failed to load academic years: ${yearsErrorSWR.message}`;
        if (studentsErrorSWR) return `Failed to load students: ${studentsErrorSWR.message}`;
        return null;
    }, [subClassesErrorSWR, yearsErrorSWR, studentsErrorSWR]);

    // Display fetch errors using toast
    useMemo(() => { if (fetchError) { toast.error(fetchError); } }, [fetchError]);

    // --- State for Modals & Forms ---
    const [isAddEnrollModalOpen, setIsAddEnrollModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [enrollmentStudent, setEnrollmentStudent] = useState<Student | null>(null);

    // Define initial states more clearly
    const initialAddEnrollFormState: AddEnrollFormData = {
        name: '', matricule: '', date_of_birth: '', place_of_birth: '', gender: '', 
        residence: '', former_school: '', email: '', phone: '', 
        subClassId: '', academicYearId: '', repeater: false, photo: '', 
        parentName: '', parentPhone: '',
    };
    const initialEditFormState: EditFormData = { name: '' };
    const initialEnrollmentFormState: EnrollmentFormData = { subClassId: '', academicYearId: '', repeater: false, photo: '' };

    const [addEnrollFormData, setAddEnrollFormData] = useState<AddEnrollFormData>(initialAddEnrollFormState);
    const [editFormData, setEditFormData] = useState<EditFormData>(initialEditFormState);
    const [enrollmentFormData, setEnrollmentFormData] = useState<EnrollmentFormData>(initialEnrollmentFormState);

    // --- Mutation State (Track loading/error for specific actions) ---
    const [isMutating, setIsMutating] = useState(false);
    const [mutationError, setMutationError] = useState<string | null>(null);

    // --- Modal Handlers --- 
    const openAddEnrollModal = () => {
        setAddEnrollFormData(initialAddEnrollFormState);
        setAddEnrollFormData(prev => ({ ...prev, academicYearId: activeAcademicYear?.id || '' })); // Pre-fill active year
        setIsAddEnrollModalOpen(true);
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        // Pre-fill edit form from student data
        setEditFormData({
            name: student.name || '',
            matricule: student.matricule || '',
            date_of_birth: student.date_of_birth || '',
            place_of_birth: student.place_of_birth || '',
            gender: student.gender || '',
            residence: student.residence || '',
            former_school: student.former_school || '',
            email: student.email || '',
            phone: student.phone || '',
            parentName: student.parentName || '', 
            parentPhone: student.parentPhone || '',
        });
        setIsEditModalOpen(true);
    };

    const openEnrollmentModal = (student: Student) => {
        setEnrollmentStudent(student);
        setEnrollmentFormData({
            subClassId: student.subClassId || '',
            // Pre-fill with active year if available, else empty
            academicYearId: activeAcademicYear?.id || '',
            repeater: false, // Default repeater
            photo: '',
        });
        setIsEnrollmentModalOpen(true);
    };

    const closeModal = () => {
        setIsAddEnrollModalOpen(false);
        setIsEditModalOpen(false);
        setIsEnrollmentModalOpen(false);
        setEditingStudent(null);
        setEnrollmentStudent(null);
        setMutationError(null); // Clear mutation errors on close
        // Optionally reset forms on close if needed
        // setAddEnrollFormData(initialAddEnrollFormState);
        // setEditFormData(initialEditFormState);
        // setEnrollmentFormData(initialEnrollmentFormState);
    };

    // --- Pagination & Filter Handlers ---
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        // SWR refetches automatically due to key change
    };

    const handleEnrollmentFilterChange = (value: EnrollmentStatusFilter) => {
        setEnrollmentFilter(value);
        setCurrentPage(1); // Reset page when filter changes
    };

    const handleSubClassFilterChange = (value: string) => {
        setSubClassFilter(value);
        setCurrentPage(1); // Reset page when filter changes
    };

     const handleSearchTermChange = (term: string) => {
        setSearchTerm(term);
        setCurrentPage(1); // Reset page on search
    };

    // --- CRUD Operations --- 

    const handleApiMutation = async <T,>( 
        apiCall: () => Promise<Response>, 
        successMessage: string,
        errorMessagePrefix: string
    ): Promise<{ success: boolean; data?: T }> => {
        setIsMutating(true);
        setMutationError(null);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.");
            setIsMutating(false);
            return { success: false };
        }

        try {
            const response = await apiCall();
            const result = await response.json().catch(() => ({})); // Attempt to parse JSON, even for errors

            if (!response.ok) {
                throw new Error(result.message || `${errorMessagePrefix} failed (${response.status})`);
            }

            // Handle 204 No Content specifically if needed (e.g., DELETE)
            if (response.status === 204) {
                 toast.success(successMessage);
                 mutateStudentList(); // Revalidate student list
                 closeModal();
                 setIsMutating(false);
                 return { success: true };
            }
            
            toast.success(successMessage);
            mutateStudentList(); // Revalidate student list
            closeModal();
            setIsMutating(false);
            return { success: true, data: result.data as T }; // Return data if available

        } catch (error: any) {
            console.error(`${errorMessagePrefix} Error:`, error);
            const msg = error.message || `${errorMessagePrefix} failed.`;
            setMutationError(msg);
            toast.error(msg);
            setIsMutating(false);
            return { success: false };
        }
    };

    // --- Create and Enroll Student ---
    const handleCreateAndEnrollStudent = async (formData: AddEnrollFormData) => {
        // 1. Create Student
        const studentPayload = {
            name: formData.name,
            matricule: formData.matricule || null,
            dateOfBirth: formData.date_of_birth || null, 
            placeOfBirth: formData.place_of_birth || null,
            gender: formData.gender || null,
            residence: formData.residence || null,
            formerSchool: formData.former_school || null,
            email: formData.email || null,
            phone: formData.phone || null,
            parentName: formData.parentName,
            parentPhone: formData.parentPhone,
        };

        const createResult = await handleApiMutation<{ id: number }>( 
            () => fetch(`${API_BASE_URL}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify(studentPayload),
            }),
            'Student created successfully.',
            'Student creation'
        );

        if (!createResult.success || !createResult.data?.id) {
             // Error handled by handleApiMutation, just exit
            return; 
        }
        const newStudentId = createResult.data.id;

        // 2. Enroll Student (if details provided)
        if (!formData.subClassId || !formData.academicYearId) {
            toast.info('Student created, but enrollment skipped (missing details).');
            // List already mutated by create success, just exit
            return; 
        }

        const enrollmentPayload = {
            subClassId: Number(formData.subClassId),
            academicYearId: Number(formData.academicYearId),
            repeater: formData.repeater ?? false,
            photo: formData.photo || null,
        };

        await handleApiMutation(
            () => fetch(`${API_BASE_URL}/students/${newStudentId}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify(enrollmentPayload),
            }),
            'Student enrolled successfully!',
            'Student enrollment'
        );
        // Note: closeModal and mutateStudentList are called inside handleApiMutation on success
    };

    // --- Update Student Details ---
    const handleUpdateStudent = async (formData: EditFormData) => {
        if (!editingStudent?.id) return;

        const updatePayload = {
            name: formData.name,
            matricule: formData.matricule,
            dateOfBirth: formData.date_of_birth,
            placeOfBirth: formData.place_of_birth,
            gender: formData.gender,
            residence: formData.residence,
            formerSchool: formData.former_school,
            email: formData.email,
            phone: formData.phone,
             // TODO: How are parents updated? Separate endpoint or included here?
            // parentName: formData.parentName,
            // parentPhone: formData.parentPhone,
        };

        await handleApiMutation(
            () => fetch(`${API_BASE_URL}/students/${editingStudent.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify(updatePayload),
            }),
            'Student details updated successfully!',
            'Student update'
        );
    };

    // --- Enroll/Update Enrollment ---
    const handleEnrollStudent = async (formData: EnrollmentFormData) => {
        if (!enrollmentStudent?.id || !formData.subClassId || !formData.academicYearId) {
            toast.error('Missing student, subclass, or academic year for enrollment.');
            return;
        }

        const enrollmentPayload = {
            subClassId: Number(formData.subClassId),
            academicYearId: Number(formData.academicYearId),
            repeater: formData.repeater ?? false,
            photo: formData.photo || null,
        };

        // Determine if this is a new enrollment or an update (needs API clarification)
        // Assuming POST for new, PUT for update. Let's use POST for simplicity now.
        await handleApiMutation(
            () => fetch(`${API_BASE_URL}/students/${enrollmentStudent.id}/enroll`, { 
                method: 'POST', // Use PUT if the API endpoint updates enrollment
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify(enrollmentPayload),
            }),
            'Student enrollment updated successfully!',
            'Student enrollment'
        );
    };

    // --- Delete Student ---
    const handleDeleteStudent = async (studentId: number) => {
        if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;

        await handleApiMutation(
            () => fetch(`${API_BASE_URL}/students/${studentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` },
            }),
            'Student deleted successfully!',
            'Student deletion'
        );
        // Close modals if the deleted student was being viewed/edited
        if (editingStudent?.id === studentId || enrollmentStudent?.id === studentId) {
            closeModal(); // closeModal is now called within handleApiMutation
        }
    };

    // --- Export Handler ---
    const handleExport = (format: 'pdf' | 'excel' = 'pdf') => {
        console.log(`Triggering export for format: ${format}, Filters:`, { enrollmentFilter, subClassFilter, searchTerm });
        const params = new URLSearchParams({
            format: format,
            enrollmentStatus: enrollmentFilter === 'all' ? '' : (enrollmentFilter === 'enrolled' ? 'enrolled' : 'not_enrolled'),
            subClassId: subClassFilter === 'all' ? '' : subClassFilter,
            search: searchTerm,
            // limit: '10000' // Include all results for export?
        });
        // Ensure token is included if backend requires auth for export
        const exportUrl = `${API_BASE_URL}/students/export?${params.toString()}`;
        console.log("Export URL:", exportUrl);
        window.open(exportUrl, '_blank'); // Consider adding token if needed
        toast.info(`Exporting students as ${format}...`);
    };


    // --- Return Values --- 
    return {
        // Data
        students,
        subClasses,
        academicYears,
        activeAcademicYear,
        totalStudents,
        
        // Loading & Error States
        isLoading, // Primary data loading state (student list)
        fetchError, // Error fetching initial data (students, subclasses, years)
        isMutating, // Loading state for CRUD operations
        mutationError, // Error from last CRUD operation

        // Filters & Pagination
        currentPage,
        studentsPerPage: STUDENTS_PER_PAGE,
        searchTerm,
        enrollmentFilter,
        subClassFilter,
        setSearchTerm: handleSearchTermChange, // Use handler to reset page
        setEnrollmentFilter: handleEnrollmentFilterChange,
        setSubClassFilter: handleSubClassFilterChange,
        handlePageChange,

        // Modals State & Handlers
        isAddEnrollModalOpen,
        isEditModalOpen,
        isEnrollmentModalOpen,
        editingStudent,
        enrollmentStudent,
        openAddEnrollModal,
        openEditModal,
        openEnrollmentModal,
        closeModal,

        // Form State & Setters
        addEnrollFormData,
        editFormData,
        enrollmentFormData,
        setAddEnrollFormData,
        setEditFormData,
        setEnrollmentFormData,

        // Action Handlers (CRUD, Export)
        handleCreateAndEnrollStudent,
        handleUpdateStudent,
        handleEnrollStudent,
        handleDeleteStudent,
        handleExport,

        // SWR Mutate Function (Optional - if direct revalidation needed outside hook)
        // mutateStudentList, 
    };
}