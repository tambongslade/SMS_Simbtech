'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { 
    MagnifyingGlassIcon, 
    DocumentArrowDownIcon,
    PencilSquareIcon,
    ClipboardDocumentListIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

// --- Types ---
type Student = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  matricule?: string;
  parentName?: string;
  parentPhone?: string;
  className?: string; // Might come from enrollment info
  subClassName?: string; // Might come from enrollment info
  subClassId?: number;
  academicYearName?: string;
  academicYearId?: number;
  // Add other relevant fields: dateOfBirth, address, gender, place_of_birth, residence, former_school
  date_of_birth?: string;
  place_of_birth?: string;
  gender?: string;
  residence?: string;
  former_school?: string;
};

// Simplified ClassInfo - might not be needed directly in form if using subclasses
// type ClassInfo = {
//   id: number;
//   name: string;
//   level?: string; 
// };

type SubClassInfo = {
  id: number;
  name: string; // e.g., Form 1A
  classId: number; // ID of the parent class
  className?: string; // Name of the parent class (e.g., Form 1)
};

type AcademicYearInfo = {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isActive?: boolean; // To filter for active years perhaps
};

type FormData = {
    // Basic student details from POST /students payload
    name: string;
    matricule?: string;
    date_of_birth?: string;
    place_of_birth?: string;
    gender?: 'Male' | 'Female' | 'Other' | '';
    residence?: string;
    former_school?: string;
    email?: string; // Add if needed by API
    phone?: string; // Add if needed by API

    // Details for POST /students/{id}/enroll payload
    subClassId: number | '';
    academicYearId: number | '';
    repeater?: boolean; // Optional enrollment field
    photo?: string; // Optional enrollment field

    // Parent details (handle separately or add to basic details if API expects)
    parentName?: string;
    parentPhone?: string;
};

// For Edit Details Modal
type EditFormData = {
    name: string;
    matricule?: string | null;
    dateOfBirth?: string | null;
    placeofbirth?: string | null;
    gender?: string | null;
    residence?: string | null;
    former_school?: string | null;
    email?: string | null;
    phone?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
};

// For Enrollment Modal
type EnrollmentFormData = {
    subClassId: number | '';
    academicYearId: number | '';
    repeater?: boolean;
    photo?: string; // Maintain consistency if needed by API
};

type EnrollmentStatusFilter = 'all' | 'enrolled' | 'not-enrolled';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token');
const STUDENTS_PER_PAGE = 10; // Define how many students per page

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0); // State for total students from API
  // const [classes, setClasses] = useState<ClassInfo[]>([]); // Maybe not needed directly
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    // Initialize all fields
    name: '',
    matricule: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: '',
    residence: '',
    former_school: '',
    email: '',
    phone: '',
    subClassId: '',
    academicYearId: '',
    repeater: false,
    photo: '',
    parentName: '',
    parentPhone: '',
  });

  // State for Edit Details Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({ // Separate state for edit form
    name: '',
    matricule: '',
    dateOfBirth: '',
    placeofbirth: '',
    gender: '',
    residence: '',
    former_school: '',
    email: '',
    phone: '',
    parentName: '',
    parentPhone: '',
  });

  // --- State for Enrollment Modal ---
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentStudent, setEnrollmentStudent] = useState<Student | null>(null);
  const [enrollmentFormData, setEnrollmentFormData] = useState<EnrollmentFormData>({ // State for enrollment form
      subClassId: '',
      academicYearId: '',
      repeater: false,
      photo: '', // Include if needed
  });

  // --- State for Filters & Pagination ---
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentStatusFilter>('all');
  const [subClassFilter, setSubClassFilter] = useState<string>('all'); // Store subclass ID as string or 'all'
  const [currentPage, setCurrentPage] = useState(1);

  // --- Data Fetching ---
  const fetchStudents = async () => {
    setIsLoading(true);
    console.log("Fetching students...");
    const token = getAuthToken();
    if (!token) {
        toast.error("Authentication token not found.");
        setIsLoading(false);
        return;
    }
    try {
        // Construct URL with parameters
        const params = new URLSearchParams();
        params.append('page', String(currentPage));
        params.append('limit', String(STUDENTS_PER_PAGE));

        if (enrollmentFilter === 'enrolled') {
            params.append('enrollmentStatus', 'enrolled');
        } else if (enrollmentFilter === 'not-enrolled') {
            params.append('enrollmentStatus', 'not_enrolled');
        }
        // TODO: Add other filters like subClassFilter to params if the API supports it
        // if (subClassFilter !== 'all') {
        //     params.append('subClassId', subClassFilter);
        // }

        const url = `${API_BASE_URL}/students?${params.toString()}`;
        console.log(`Fetching from URL: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to fetch students (${response.status})`);
        }
        const result = await response.json();
        console.log("Students API response:", result);
        // Adjust mapping based on the provided API sample structure
        const fetchedStudents = result.data?.map((s: any) => {
          console.log(`Raw data for student ID ${s.id}:`, JSON.stringify(s, null, 2)); // Log raw student data from API
          return {
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            matricule: s.matricule,
            // Enrollment details
            subClassName: s.enrollments?.[0]?.subClass?.name,
            subClassId: s.enrollments?.[0]?.subClass?.id,
            className: s.enrollments?.[0]?.subClass?.class?.name,
            academicYearId: s.enrollments?.[0]?.academic_year_id,
            // Basic student details - Match API field names (camelCase)
            date_of_birth: s.dateOfBirth,
            place_of_birth: s.placeOfBirth,
            gender: s.gender,
            residence: s.residence,
            former_school: s.formerSchool,
            // Parent info
            parentName: s.parents?.[0]?.name,
            parentPhone: s.parents?.[0]?.phone,
          };
        }) || [];
        setTotalStudents(result.meta?.total || 0); // Get total count from meta
        setStudents(fetchedStudents);
    } catch (error: any) {
      console.error("Failed to fetch students:", error);
      toast.error(`Failed to load students: ${error.message}`);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch SubClasses for the dropdown
  const fetchSubClasses = async () => {
    console.log("Fetching subclasses...");
    const token = getAuthToken();
    if (!token) return;
    try {
      // TODO: Verify endpoint. Maybe GET /sub-classes? or needs class context?
      // Assuming a general endpoint for now
      const response = await fetch(`${API_BASE_URL}/classes/sub-classes`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch subclasses');
      const result = await response.json();
      // TODO: Adjust mapping based on actual API structure
      const fetchedSubClasses = result.data?.map((sc: any) => ({
        id: sc.id,
        name: sc.name,
        classId: sc.class?.id,
        className: sc.class?.name,
      })) || [];
      setSubClasses(fetchedSubClasses);
    } catch (error: any) {
      console.error("Failed to fetch subclasses:", error);
      toast.error(`Failed to load subclasses: ${error.message}`);
      setSubClasses([]);
    }
  };

  // Fetch Academic Years for the dropdown
  const fetchAcademicYears = async () => {
    console.log("Fetching academic years...");
    const token = getAuthToken();
    if (!token) return;
    try {
      // TODO: Verify endpoint. Maybe filter for active years? /academic-years?active=true
      const response = await fetch(`${API_BASE_URL}/academic-years`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch academic years');
      const result = await response.json();
      // TODO: Adjust mapping based on actual API structure
      const fetchedYears = result.data?.map((ay: any) => ({
        id: ay.id,
        name: ay.name,
        startDate: ay.startDate || ay.start_date, // Handle snake_case/camelCase
        endDate: ay.endDate || ay.end_date,
        isActive: ay.is_active, // Assuming boolean field indicates active status
      })) || [];
      // Optional: Filter for active years if API doesn't support it
      // setAcademicYears(fetchedYears.filter(y => y.isActive));
      setAcademicYears(fetchedYears); // Or show all
    } catch (error: any) {
      console.error("Failed to fetch academic years:", error);
      toast.error(`Failed to load academic years: ${error.message}`);
      setAcademicYears([]);
    }
  };

  // Initial data fetch & refetch on filters/page change
  useEffect(() => {
    fetchStudents();
    // Fetch these less often? Only if needed or once?
    // fetchSubClasses();
    // fetchAcademicYears();
  }, [enrollmentFilter, currentPage, subClassFilter, searchTerm]); // Add currentPage and potentially other filters

  // Fetch dropdown data once on mount
  useEffect(() => {
      fetchSubClasses();
      fetchAcademicYears();
  }, []);

  // --- Filtering Logic ---
  // Client-side filtering is less relevant now if API handles filters
  // We keep searchTerm filtering client-side for responsiveness unless API handles it
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Search Term Filter (Name, Email, Matricule)
      const term = searchTerm.toLowerCase();
      const matchesSearch = term === '' ||
                            student.name.toLowerCase().includes(term) ||
                            (student.email && student.email.toLowerCase().includes(term)) ||
                            (student.matricule && student.matricule.toLowerCase().includes(term));

      // SubClass Filter
      const matchesSubClass = subClassFilter === 'all' || String(student.subClassId) === subClassFilter;

      // Return based only on Search and SubClass filters now
      return matchesSearch && matchesSubClass;
    });
  }, [students, searchTerm, subClassFilter]);

  // --- Pagination Logic --- 
  // Calculate total pages based on API total
  const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);
  // Remove paginatedStudents - students state now holds the current page data
  /* 
  const paginatedStudents = useMemo(() => {
      const startIndex = (currentPage - 1) * STUDENTS_PER_PAGE;
      const endIndex = startIndex + STUDENTS_PER_PAGE;
      return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage]);
  */

  const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  };

  // --- Modal Control ---
  const openModal = () => {
    setFormData({ // Reset form
        name: '',
        matricule: '',
        date_of_birth: '',
        place_of_birth: '',
        gender: '',
        residence: '',
        former_school: '',
        email: '',
        phone: '',
        subClassId: '',
        academicYearId: '',
        repeater: false,
        photo: '',
        parentName: '',
        parentPhone: '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // --- Form Handling ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // Handle checkbox specifically
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- Student Creation & Enrollment ---
  const handleCreateAndEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation - Ensure required fields for *both* API calls are present
    if (!formData.name || !formData.subClassId || !formData.academicYearId) {
        toast.error("Student Name, Subclass, and Academic Year are required.");
        return;
    }

    setIsLoading(true);
    const token = getAuthToken();
    if (!token) {
        toast.error("Authentication token not found.");
        setIsLoading(false);
        return;
    }

    let newStudentId: number | null = null;
    let studentName = formData.name;

    // --- Step 1: Create Student --- 
    console.log("Step 1: Creating student...");
    const studentPayload = {
        name: formData.name,
        matricule: formData.matricule || null,
        date_of_birth: formData.date_of_birth || null,
        place_of_birth: formData.place_of_birth || null,
        gender: formData.gender || null,
        residence: formData.residence || null,
        former_school: formData.former_school || null,
        email: formData.email || null,
        phone: formData.phone || null,
        // Do NOT include parent/enrollment details here unless API combines them
    };
    console.log("Student Payload:", studentPayload);

    try {
        const createResponse = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(studentPayload),
        });

        const createResult = await createResponse.json();
        console.log("Create response:", createResult);

        if (!createResponse.ok) {
            throw new Error(createResult.message || 'Failed to create student record');
        }

        newStudentId = createResult.data?.id; // Assuming API returns created student with ID
        studentName = createResult.data?.name || formData.name;
        if (!newStudentId) {
            throw new Error('Student created, but no ID was returned by the API.');
        }

        toast.success(`Student '${studentName}' record created (ID: ${newStudentId}). Proceeding to enrollment...`);

        // --- Step 2: Enroll Student --- 
        console.log(`Step 2: Enrolling student ID ${newStudentId} into subclass ${formData.subClassId} for year ${formData.academicYearId}...`);
        const enrollmentPayload = {
            sub_class_id: formData.subClassId,
            academic_year_id: formData.academicYearId,
            repeater: formData.repeater || false,
            photo: formData.photo || null,
        };
        console.log("Enrollment Payload:", enrollmentPayload);

        const enrollResponse = await fetch(`${API_BASE_URL}/students/${newStudentId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(enrollmentPayload),
        });

        const enrollResult = await enrollResponse.json();
        console.log("Enroll response:", enrollResult);

        if (!enrollResponse.ok) {
            // If enrollment fails, the student record still exists!
             throw new Error(enrollResult.message || 'Student created, but failed to enroll');
        }

        toast.success(`Student '${studentName}' enrolled successfully!`);
        closeModal();
        fetchStudents(); // Refresh the student list to show the newly enrolled student

        // TODO: Optionally handle parent linking here if needed after enrollment
        // if (formData.parentName && formData.parentPhone) { ... call link parent API ... }

    } catch (error: any) {
        console.error("Student creation/enrollment failed:", error);
        toast.error(`Operation failed: ${error.message}`);
        // Consider if UI needs specific handling if student created but enrollment failed.
        // Maybe fetchStudents() anyway to show the non-enrolled student?
        fetchStudents(); 
    } finally {
        setIsLoading(false);
    }
  };

  // --- Edit Details Modal Control ---
  const openEditModal = (student: Student) => {
    console.log("Populating edit modal for student:", JSON.stringify(student, null, 2)); // Log the student data
    setEditingStudent(student);
    // Format date before setting state
        const formattedDOB = student.date_of_birth 
                       ? student.date_of_birth.split('T')[0] 
                       : ''; 

    setEditFormData({ // Populate edit form with student data using || ''
      name: student.name || '',
      matricule: student.matricule || '',
      dateOfBirth: formattedDOB, // Use formatted date
      placeofbirth: student.place_of_birth || '',
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

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
    // Optional: Clear editFormData, though it will be overwritten on next open
    // setEditFormData({ ...initialEditFormData... }); 
  };

  // --- Edit Form Input Handlers ---
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- API Handlers ---
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    // Basic validation
    if (!editFormData.name) {
        toast.error("Student Name is required.");
        return;
    }

    setIsLoading(true);
    const token = getAuthToken();
    if (!token) {
        toast.error("Authentication token not found.");
        setIsLoading(false);
        return;
    }

    // Prepare payload - ensure it matches what PUT /students/{id} expects
    const payload: EditFormData = {
        name: editFormData.name,
        matricule: editFormData.matricule || null,
        dateOfBirth: editFormData.dateOfBirth || null,
        placeofbirth: editFormData.placeofbirth || null,
        gender: editFormData.gender || null,
        residence: editFormData.residence || null,
        former_school: editFormData.former_school || null,
        email: editFormData.email || null,
        phone: editFormData.phone || null,
        parentName: editFormData.parentName || null,
        parentPhone: editFormData.parentPhone || null,
    };
    console.log(`Updating student ID ${editingStudent.id} with payload:`, payload);

    try {
        const response = await fetch(`${API_BASE_URL}/students/${editingStudent.id}`, {
            method: 'PUT', // Or PATCH?
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to update student');
        }

        toast.success(`Student '${editingStudent.name}' updated successfully!`);
        closeEditModal();
        fetchStudents(); // Refresh list

    } catch (error: any) {
        console.error("Student update failed:", error);
        toast.error(`Student update failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // --- Modal Control (Enrollment) ---
  const openEnrollmentModal = (student: Student) => {
      setEnrollmentStudent(student);
      // Pre-populate with current enrollment data if available, otherwise defaults
      setEnrollmentFormData({
          subClassId: student.subClassId || '',
          academicYearId: student.academicYearId || '', // Default to current/latest year if needed?
          repeater: false, // Default repeater status - API might dictate this
          photo: '', // Default photo - API might dictate this
      });
      // Ensure academic years and subclasses are loaded (or trigger fetch if needed)
      if (academicYears.length === 0) fetchAcademicYears();
      if (subClasses.length === 0) fetchSubClasses();
      setIsEnrollmentModalOpen(true);
  };
  const closeEnrollmentModal = () => {
      setIsEnrollmentModalOpen(false);
      setEnrollmentStudent(null);
      // Reset form data if needed
      setEnrollmentFormData({ subClassId: '', academicYearId: '', repeater: false, photo: '' });
  };

  // --- Form Input Handlers ---
  const handleEnrollmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setEnrollmentFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- API Handlers ---
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentStudent || !enrollmentFormData.subClassId || !enrollmentFormData.academicYearId) {
        toast.error("Subclass and Academic Year must be selected for enrollment.");
        return;
    }

    setIsLoading(true);
    const token = getAuthToken();
    if (!token) { /* ... handle missing token ... */ setIsLoading(false); return; }

    const studentId = enrollmentStudent.id;
    const payload = {
        sub_class_id: enrollmentFormData.subClassId,
        academic_year_id: enrollmentFormData.academicYearId,
        repeater: enrollmentFormData.repeater || false,
        photo: enrollmentFormData.photo || null, // Send null if empty or handle differently
    };
    console.log(`Enrolling student ID ${studentId} with payload:`, payload);

    try {
        // Using POST as per API tests - assuming this handles create/update for a given year
        const response = await fetch(`${API_BASE_URL}/students/${studentId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to enroll student');
        }

        toast.success(`Student '${enrollmentStudent.name}' enrollment updated/created successfully!`);
        closeEnrollmentModal();
        fetchStudents(); // Refresh list to show updated enrollment

    } catch (error: any) {
        console.error("Student enrollment failed:", error);
        toast.error(`Enrollment failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // --- Export Handler ---
  const handleExportSubclass = async (format: 'pdf' | 'excel' = 'pdf') => {
      if (subClassFilter === 'all') {
          toast.error("Please select a specific subclass to export.");
          return;
      }

      const subClassId = subClassFilter;
      const selectedSubClass = subClasses.find(sc => String(sc.id) === subClassId);
      const subClassName = selectedSubClass?.name || `Subclass ${subClassId}`;

      console.log(`Exporting students for subclass ID ${subClassId} (${subClassName}) in ${format} format...`);
      toast.loading(`Generating ${format.toUpperCase()} export for ${subClassName}...`, { id: 'export-toast' });
      setIsLoading(true); // Optional: Disable UI elements during export

      const token = getAuthToken();
      if (!token) {
          toast.error("Authentication required.", { id: 'export-toast' });
          setIsLoading(false);
          return;
      }

      // --- Option A: Backend Export (Recommended) --- 
      try {
          // TODO: Verify Endpoint and Query Params (e.g., format, maybe academicYearId?)
          const response = await fetch(`${API_BASE_URL}/students/export?subClassId=${subClassId}&format=${format}`, {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  // Add Accept header if needed, e.g., 'Accept': 'application/pdf'
              },
          });

          if (!response.ok) {
              // Try to get error message from backend if possible
              let errorMessage = `Export failed (${response.status})`;
              try {
                  const errorData = await response.json();
                  errorMessage = errorData.message || errorMessage;
              } catch (e) { /* Response might not be JSON */ }
              throw new Error(errorMessage);
          }

          // Trigger file download
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          // Suggest filename
          const filename = `${subClassName.replace(/\s+/g, '_')}_students_${new Date().toISOString().split('T')[0]}.${format}`;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(downloadUrl);
          toast.success(`Export for ${subClassName} downloaded successfully.`, { id: 'export-toast' });

      } catch (error: any) {
          toast.error(`Export failed: ${error.message}`, { id: 'export-toast' });
          console.error("Export error:", error);
      } finally {
          setIsLoading(false);
      }

      // --- Option B: Frontend PDF Generation (Example using jspdf) --- 
      /*
      if (format === 'pdf') {
          // Requires: npm install jspdf jspdf-autotable
          // Note: This filters the *already fetched* students. Might be incomplete if backend paginates.
          const studentsInSubclass = students.filter(s => String(s.subClassId) === subClassId);
          
          if (studentsInSubclass.length === 0) {
              toast.error(`No students found in the fetched list for ${subClassName}.`, { id: 'export-toast' });
              setIsLoading(false);
              return;
          }

          import jsPDF from 'jspdf';
          import 'jspdf-autotable';

          try {
              const doc = new jsPDF();
              doc.text(`Student List - ${subClassName}`, 14, 16);
              
              (doc as any).autoTable({ 
                  startY: 20,
                  head: [['Name', 'Matricule', 'Email', 'Phone']], // Customize columns
                  body: studentsInSubclass.map(s => [
                      s.name,
                      s.matricule || '-',
                      s.email || '-',
                      s.phone || '-',
                  ]),
                  theme: 'grid', 
              });
              
              const filename = `${subClassName.replace(/\s+/g, '_')}_students_${new Date().toISOString().split('T')[0]}.pdf`;
              doc.save(filename);
              toast.success(`PDF generated for ${subClassName}.`, { id: 'export-toast' });
          } catch (error: any) {
              toast.error(`PDF generation failed: ${error.message}`, { id: 'export-toast' });
          } finally {
              setIsLoading(false);
          }
      } else {
          toast.error(`Frontend export for ${format} not implemented.`, { id: 'export-toast' });
          setIsLoading(false);
      }
      */
  };

  // --- JSX --- 
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */} 
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600 mt-1">View, add, and enroll student records.</p>
            </div>
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Add & Enroll Student'}
            </button>
          </div>
        </div>

        {/* Filters Section */} 
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Search Input */}
                <div className="md:col-span-1">
                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
                     <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                         </div>
                        <input
                            type="text"
                            id="search"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Name, email, matricule..."
                        />
                     </div>
                </div>

               {/* Enrollment Status Filter */} 
                <div>
                    <label htmlFor="enrollmentFilter" className="block text-sm font-medium text-gray-700 mb-1">Enrollment Status</label>
                    <select
                        id="enrollmentFilter"
                        value={enrollmentFilter}
                        onChange={(e) => {
                            setEnrollmentFilter(e.target.value as EnrollmentStatusFilter);
                            setCurrentPage(1); // Reset page
                        }}
                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="all">All Statuses</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="not-enrolled">Not Enrolled</option>
                    </select>
                </div>

                {/* SubClass Filter & Export Button */} 
                 <div className="md:col-span-2 flex items-end space-x-2">
                    <div className="flex-grow">
                         <label htmlFor="subClassFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Subclass</label>
                        <select
                            id="subClassFilter"
                            value={subClassFilter}
                            onChange={(e) => {
                                setSubClassFilter(e.target.value);
                                setCurrentPage(1); // Reset page
                            }}
                            className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            disabled={subClasses.length === 0}
                        >
                            <option value="all">All Subclasses</option>
                            {subClasses.map((sc) => (
                                 <option key={sc.id} value={String(sc.id)}>
                                     {sc.name} {sc.className ? `(${sc.className})` : ''}
                                 </option>
                             ))}
                        </select>
                    </div>
                     {/* Export Button */}
                     <button
                         onClick={() => handleExportSubclass('pdf')} // Default to PDF
                         disabled={isLoading || subClassFilter === 'all'}
                         className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                         title={subClassFilter === 'all' ? "Select a specific subclass to export" : "Export selected subclass students (PDF)"}
                     >
                         <DocumentArrowDownIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                         Export
                     </button>
                     {/* TODO: Add Excel export button? */}
                </div>
           </div>
        </div>

        {/* Student Table Container with Relative Positioning */}
        <div className="relative">
            {/* Loading Overlay */} 
            {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                    {/* You can replace this text with a spinner component */} 
                    <p className="text-xl font-semibold text-gray-700">Loading Students...</p>
                </div>
            )}

            {/* Student Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                       <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                        {/* Updated header to show subclass/class */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment (Subclass / Year)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Info</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Other Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Former School</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                       </tr>
                     </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {isLoading && students.length === 0 && (
                        <tr><td colSpan={8} className="text-center py-4 text-gray-500 italic">Loading students...</td></tr>
                      )}
                      {!isLoading && filteredStudents.length === 0 && (
                         <tr><td colSpan={8} className="text-center py-4 text-gray-500">
                             {searchTerm || enrollmentFilter !== 'all' || subClassFilter !== 'all'
                               ? 'No students match the current filters.'
                               : 'No students found.'
                             }
                         </td></tr>
                      )}
                      {/* Map over students directly (current page data) */} 
                      {students.map((student) => (
                         <tr key={student.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm font-medium text-gray-900">{student.name}</div>
                             <div className="text-sm text-gray-500">{student.email || '-'}</div>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.matricule || '-'}</td>
                           {/* Updated cell to show subclass/year */}
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <div>{student.subClassName || 'Not Enrolled'}</div>
                               {student.academicYearName && <div className="text-xs text-gray-500">({student.academicYearName})</div>}
                            </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.phone || '-'}</td>
                           <td className="px-6 py-4 whitespace-nowrap">
                             <div className="text-sm text-gray-900">{student.parentName || '-'}</div>
                             <div className="text-sm text-gray-500">{student.parentPhone || '-'}</div>
                           </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {/* Format DOB for display */}
                              <div>DOB: {student.date_of_birth?.split('T')[0] || '-'}</div>
                              <div>Gender: {student.gender || '-'}</div>
                              <div>Residence: {student.residence || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.former_school || '-'}</td>
                           {/* Update td for vertical layout */}
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                             <div className="flex flex-col space-y-1 items-start"> {/* Flex column for vertical stacking */} 
                                 <button 
                                    onClick={() => openEditModal(student)} // Trigger edit modal
                                    className="inline-flex items-center text-blue-600 hover:text-blue-800 disabled:opacity-50 group" // Adjusted styling for inline-flex
                                    disabled={isLoading}
                                    title="Edit Student Details"
                                 >
                                   <PencilSquareIcon className="h-4 w-4 mr-1.5 group-hover:text-blue-700" /> {/* Icon */}
                                   <span>Edit</span> {/* Added Text */} 
                                 </button>
                                 <button 
                                    onClick={() => openEnrollmentModal(student)} // Open enrollment modal
                                    className="inline-flex items-center text-indigo-600 hover:text-indigo-800 disabled:opacity-50 group" // Adjusted styling for inline-flex
                                    disabled={isLoading} 
                                    title="Enroll/Manage Student"
                                 >
                                     <ClipboardDocumentListIcon className="h-4 w-4 mr-1.5 group-hover:text-indigo-700" /> {/* Icon */} 
                                     <span>Enroll</span> {/* Added Text */} 
                                 </button>
                                 <button 
                                    className="inline-flex items-center text-red-600 hover:text-red-800 disabled:opacity-50 group" // Adjusted styling for inline-flex
                                    disabled={isLoading}
                                    // onClick={() => openDeleteConfirmationModal(student)} // TODO: Add delete later
                                    title="Delete Student"
                                >
                                   <TrashIcon className="h-4 w-4 mr-1.5 group-hover:text-red-700" /> {/* Icon */} 
                                   <span>Delete</span> {/* Added Text */} 
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))}
                     </tbody>
                  </table>
               </div>
               
               {/* Pagination Controls */} 
                {totalPages > 1 && (
                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 bg-white rounded-b-lg">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * STUDENTS_PER_PAGE + 1}</span>
                                    {' '}to <span className="font-medium">{Math.min(currentPage * STUDENTS_PER_PAGE, totalStudents)}</span> {/* Use totalStudents */}
                                    {' '}of <span className="font-medium">{totalStudents}</span> results {/* Use totalStudents */}
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        {/* Heroicon name: solid/chevron-left */}
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                     {/* TODO: Add dynamic page number generation if needed */}
                                     <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Next</span>
                                        {/* Heroicon name: solid/chevron-right */}
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
             </div>
          </div>
       </div>

        {/* Add Student & Enroll Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-4xl shadow-lg rounded-md bg-white">
             <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Add New Student & Enroll</h3>
              {/* Updated form handler */}
              <form onSubmit={handleCreateAndEnrollStudent} className="space-y-4">
                 {/* Split into sections for clarity */}
                 <section className="border-b pb-4 mb-4">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Student Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {/* Name (Span 2) */}
                         <div className="md:col-span-2">
                             <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                             <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required className="mt-1 block w-full input-field"/>
                         </div>
                         {/* Matricule */} 
                         <div>
                            <label htmlFor="matricule" className="block text-sm font-medium text-gray-700">Matricule</label>
                            <input type="text" id="matricule" name="matricule" value={formData.matricule || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                         </div>
                         {/* Date of Birth */} 
                          <div>
                              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                              <input
                                type="text"
                                id="date_of_birth"
                                name="date_of_birth"
                                value={formData.date_of_birth || ''}
                                onChange={handleInputChange}
                                className="mt-1 block w-full input-field"
                                placeholder="YYYY-MM-DD"
                              />
                          </div>
                         {/* Place of Birth */} 
                         <div>
                            <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-700">Place of Birth</label>
                            <input type="text" id="place_of_birth" name="place_of_birth" value={formData.place_of_birth || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                         </div>
                         {/* Gender */} 
                          <div>
                             <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                             <select id="gender" name="gender" value={formData.gender || ''} onChange={handleInputChange} className="mt-1 block w-full input-field bg-white">
                                 <option value="" disabled>Select...</option>
                                 <option value="Male">Male</option>
                                 <option value="Female">Female</option>
                                 <option value="Other">Other</option>
                             </select>
                           </div>
                          {/* Email */} 
                          <div>
                              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                              <input type="email" id="email" name="email" value={formData.email || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Phone */} 
                          <div>
                              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                              <input type="tel" id="phone" name="phone" value={formData.phone || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Residence */} 
                          <div>
                              <label htmlFor="residence" className="block text-sm font-medium text-gray-700">Residence</label>
                              <input type="text" id="residence" name="residence" value={formData.residence || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Former School */} 
                          <div>
                              <label htmlFor="former_school" className="block text-sm font-medium text-gray-700">Former School</label>
                              <input type="text" id="former_school" name="former_school" value={formData.former_school || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                       </div>
                 </section>

                  <section className="border-b pb-4 mb-4">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Parent/Guardian Details</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Parent Name */} 
                          <div>
                              <label htmlFor="parentName" className="block text-sm font-medium text-gray-700">Name</label>
                              <input type="text" id="parentName" name="parentName" value={formData.parentName || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Parent Phone */} 
                          <div>
                              <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">Phone</label>
                              <input type="tel" id="parentPhone" name="parentPhone" value={formData.parentPhone || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* TODO: Consider adding Parent Email / Linking to existing Parent User */} 
                     </div>
                  </section>

                 <section>
                     <h4 className="text-md font-semibold text-gray-700 mb-3">Enrollment Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Academic Year */} 
                          <div>
                             <label htmlFor="academicYearId" className="block text-sm font-medium text-gray-700">Academic Year *</label>
                              <select
                                  id="academicYearId"
                                  name="academicYearId"
                                  value={formData.academicYearId}
                                  onChange={handleInputChange}
                                  required
                                  className="mt-1 block w-full input-field bg-white"
                                  disabled={academicYears.length === 0}
                              >
                                 <option value="" disabled>Select Year</option>
                                 {academicYears.length === 0 && <option disabled>Loading years...</option>}
                                 {academicYears.map((year) => (
                                     <option key={year.id} value={year.id}>
                                         {year.name} ({new Date(year.startDate).getFullYear()}-{new Date(year.endDate).getFullYear()})
                                     </option>
                                 ))}
                             </select>
                          </div>

                          {/* Subclass Assignment */} 
                          <div>
                              <label htmlFor="subClassId" className="block text-sm font-medium text-gray-700">Assign to Subclass *</label>
                              <select
                                  id="subClassId"
                                  name="subClassId"
                                  value={formData.subClassId}
                                  onChange={handleInputChange}
                                  required
                                  className="mt-1 block w-full input-field bg-white"
                                  disabled={subClasses.length === 0}
                              >
                                  <option value="" disabled>Select Subclass</option>
                                  {subClasses.length === 0 && <option disabled>Loading subclasses...</option>}
                                  {subClasses.map((sc) => (
                                      <option key={sc.id} value={sc.id}>
                                          {sc.name} {sc.className ? `(${sc.className})` : ''}
                                      </option>
                                  ))}
                              </select>
                          </div>

                          {/* Repeater Checkbox */}
                          <div className="flex items-end pb-1">
                             <div className="flex items-center h-full">
                                 <input
                                     id="repeater"
                                     name="repeater"
                                     type="checkbox"
                                     checked={formData.repeater || false}
                                     onChange={handleInputChange}
                                     className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                 />
                                 <label htmlFor="repeater" className="ml-2 block text-sm text-gray-900">
                                     Is Repeater?
                                 </label>
                             </div>
                          </div>
                          {/* Optional: Photo URL input? Or handle file upload separately */}
                          {/* <div>
                             <label htmlFor="photo" className="block text-sm font-medium text-gray-700">Photo URL (Optional)</label>
                             <input type="text" id="photo" name="photo" value={formData.photo || ''} onChange={handleInputChange} className="mt-1 block w-full input-field"/>
                          </div> */} 
                      </div>
                  </section>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                      <button type="button" onClick={closeModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                          Cancel
                      </button>
                      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={isLoading || !formData.subClassId || !formData.academicYearId}>
                          {isLoading ? 'Saving...' : 'Create & Enroll Student'}
                      </button>
                  </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Student Details Modal */} 
        {isEditModalOpen && editingStudent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-3xl shadow-lg rounded-md bg-white">
             <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Edit Student Details: {editingStudent.name}</h3>
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                  {/* Ensure all inputs use `editFormData.fieldName || ''` for value */}
                 <section>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         {/* Name (Span 2) */}
                         <div className="md:col-span-2">
                             <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                             <input type="text" id="edit-name" name="name" value={editFormData.name || ''} onChange={handleEditInputChange} required className="mt-1 block w-full input-field"/>
                         </div>
                         {/* Matricule */} 
                         <div>
                            <label htmlFor="edit-matricule" className="block text-sm font-medium text-gray-700">Matricule</label>
                            <input type="text" id="edit-matricule" name="matricule" value={editFormData.matricule || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                         </div>
                         {/* Date of Birth */} 
                          <div>
                              <label htmlFor="edit-date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                              <input
                                type="text"
                                id="edit-date_of_birth"
                                name="dateOfBirth"
                                value={editFormData.dateOfBirth || ''}
                                onChange={handleEditInputChange}
                                className="mt-1 block w-full input-field"
                                placeholder="YYYY-MM-DD"
                              />
                          </div>
                         {/* Place of Birth */} 
                         <div>
                            <label htmlFor="edit-place_of_birth" className="block text-sm font-medium text-gray-700">Place of Birth</label>
                                    <input type="text" id="edit-place_of_birth" name="placeofbirth" value={editFormData.placeofbirth || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                         </div>
                         {/* Gender */} 
                          <div>
                             <label htmlFor="edit-gender" className="block text-sm font-medium text-gray-700">Gender</label>
                             <select id="edit-gender" name="gender" value={editFormData.gender || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field bg-white">
                                 <option value="" disabled>Select...</option>
                                 <option value="Male">Male</option>
                                 <option value="Female">Female</option>
                                 <option value="Other">Other</option>
                             </select>
                           </div>
                          {/* Email */} 
                          <div>
                              <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email Address</label>
                              <input type="email" id="edit-email" name="email" value={editFormData.email || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Phone */} 
                          <div>
                              <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                              <input type="tel" id="edit-phone" name="phone" value={editFormData.phone || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Residence */} 
                          <div>
                              <label htmlFor="edit-residence" className="block text-sm font-medium text-gray-700">Residence</label>
                              <input type="text" id="edit-residence" name="residence" value={editFormData.residence || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                          {/* Former School */} 
                          <div>
                              <label htmlFor="edit-former_school" className="block text-sm font-medium text-gray-700">Former School</label>
                              <input type="text" id="edit-former_school" name="former_school" value={editFormData.former_school || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                         {/* Parent Name & Phone (Optional) */}
                         <div className="md:col-span-3"><hr className="my-2"/></div>
                         <div>
                            <label htmlFor="edit-parentName" className="block text-sm font-medium text-gray-700">Parent/Guardian Name</label>
                            <input type="text" id="edit-parentName" name="parentName" value={editFormData.parentName || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                         </div>
                          <div>
                              <label htmlFor="edit-parentPhone" className="block text-sm font-medium text-gray-700">Parent/Guardian Phone</label>
                              <input type="tel" id="edit-parentPhone" name="parentPhone" value={editFormData.parentPhone || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field"/>
                          </div>
                     </div>
                  </section>

                  {/* Form Actions */} 
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                      <button type="button" onClick={closeEditModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                          Cancel
                      </button>
                      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={isLoading || !editFormData.name}>
                          {isLoading ? 'Saving...' : 'Update Student'}
                      </button>
                  </div>
              </form>
            </div>
          </div>
        )}

        {/* Enrollment Management Modal */} 
         {isEnrollmentModalOpen && enrollmentStudent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Manage Enrollment for: {enrollmentStudent.name}</h3>
              <form onSubmit={handleEnrollStudent} className="space-y-4">
                   {/* Academic Year Selection */} 
                  <div>
                     <label htmlFor="enroll-academicYearId" className="block text-sm font-medium text-gray-700">Academic Year *</label>
                      <select
                          id="enroll-academicYearId"
                          name="academicYearId"
                          value={enrollmentFormData.academicYearId}
                          onChange={handleEnrollmentInputChange}
                          required
                          className="mt-1 block w-full input-field bg-white"
                          disabled={academicYears.length === 0 || isLoading}
                      >
                         <option value="" disabled>Select Year</option>
                         {academicYears.length === 0 && <option disabled>Loading years...</option>}
                         {academicYears.map((year) => (
                             <option key={year.id} value={year.id}>
                                 {year.name} ({new Date(year.startDate).getFullYear()}-{new Date(year.endDate).getFullYear()})
                             </option>
                         ))}
                     </select>
                  </div>

                   {/* Subclass Selection */} 
                  <div>
                      <label htmlFor="enroll-subClassId" className="block text-sm font-medium text-gray-700">Assign to Subclass *</label>
                      <select
                          id="enroll-subClassId"
                          name="subClassId"
                          value={enrollmentFormData.subClassId}
                          onChange={handleEnrollmentInputChange}
                          required
                          className="mt-1 block w-full input-field bg-white"
                          disabled={subClasses.length === 0 || isLoading}
                      >
                          <option value="" disabled>Select Subclass</option>
                          {subClasses.length === 0 && <option disabled>Loading subclasses...</option>}
                          {subClasses.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                  {sc.name} {sc.className ? `(${sc.className})` : ''}
                              </option>
                          ))}
                      </select>
                  </div>

                  {/* Repeater Checkbox */} 
                  <div className="flex items-center pt-2">
                      <input
                          id="enroll-repeater"
                          name="repeater"
                          type="checkbox"
                          checked={enrollmentFormData.repeater || false}
                          onChange={handleEnrollmentInputChange}
                          disabled={isLoading}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="enroll-repeater" className="ml-2 block text-sm text-gray-900">
                          Is Repeater?
                      </label>
                  </div>
                  
                  {/* Optional Photo Input - Hidden for now, uncomment if needed */}
                  {/* <div>
                     <label htmlFor="enroll-photo" className="block text-sm font-medium text-gray-700">Photo URL (Optional)</label>
                     <input type="text" id="enroll-photo" name="photo" value={enrollmentFormData.photo || ''} onChange={handleEnrollmentInputChange} disabled={isLoading} className="mt-1 block w-full input-field"/>
                  </div> */}

                  {/* Form Actions */} 
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                      <button type="button" onClick={closeEnrollmentModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                          Cancel
                      </button>
                      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50" disabled={isLoading || !enrollmentFormData.subClassId || !enrollmentFormData.academicYearId}>
                          {isLoading ? 'Saving Enrollment...' : 'Save Enrollment'}
                      </button>
                  </div>
              </form>
            </div>
          </div>
        )}

        {/* Simple CSS for input fields - Can be moved to a global CSS file */}
        <style jsx>{`
         .input-field {
             border: 1px solid #d1d5db; /* border-gray-300 */
             border-radius: 0.375rem; /* rounded-md */
             box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
             padding: 0.5rem 0.75rem; /* py-2 px-3 */
         }
         .input-field:focus {
             outline: none;
             box-shadow: 0 0 0 2px #3b82f6; /* focus:ring-2 focus:ring-blue-500 */
             border-color: #3b82f6; /* focus:border-blue-500 */
         }
        `}</style>
     </div>
   );
}