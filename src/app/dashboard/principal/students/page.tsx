'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  UserGroupIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import apiService from '../../../../lib/apiService';
import { useAuth } from '../../../../components/context/AuthContext'; // Add useAuth import
import { StudentPhoto } from '../../../../components/ui';

// --- Types ---
type ParentLink = {
  id: number;
  name: string;
  phone?: string; // Assuming phone is also available from s.parents items
};

type Student = {
  id: number;
  name: string;
  matricule?: string;
  parents?: ParentLink[]; // Array of linked parent users
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
  // Photo fields
  photo?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
};

type SubClassInfo = {
  id: number;
  name: string; // e.g., Form 1A
  classId: number; // ID of the parent class
  className?: string; // Name of the parent class (e.g., Form 1)
};

type ClassInfo = {
  id: number;
  name: string;
  level?: string;
};

type AcademicYearInfo = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive?: boolean; // To filter for active years perhaps
};

type FormData = {
  // Student fields
  studentName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  gender: 'MALE' | 'FEMALE' | '';
  residence: string;
  formerSchool?: string;
  classId: number | '';
  academicYearId: number | '';
  isNewStudent?: boolean;
  // Parent fields
  parentName: string;
  parentPhone: string;
  parentWhatsapp?: string;
  parentEmail?: string;
  parentAddress: string;
  relationship?: string;
};

// For Edit Details Modal
type EditFormData = {
  name: string;
  matricule?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  gender?: string | null;
  residence?: string | null;
  former_school?: string | null;
};

// For Enrollment Modal
type EnrollmentFormData = {
  subClassId: number | '';
  academicYearId: number | '';
  repeater?: boolean;
  photo?: string; // Maintain consistency if needed by API
};

type ParentUser = {
  id: number;
  name: string;
  // Add other relevant parent user details if needed, e.g., email, phone
};

type EnrollmentStatusFilter = 'all' | 'enrolled' | 'not-enrolled';

const STUDENTS_PER_PAGE = 10; // Define how many students per page

export default function StudentManagement() {
  const { selectedAcademicYear } = useAuth(); // Add useAuth hook
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0); // State for total students from API
  const [classes, setClasses] = useState<ClassInfo[]>([]); // Maybe not needed directly
  const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearInfo[]>([]);
  const [parentUsers, setParentUsers] = useState<ParentUser[]>([]); // State for parent users
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    studentName: '',
    dateOfBirth: '',
    placeOfBirth: '',
    gender: '',
    residence: '',
    formerSchool: '',
    classId: '',
    academicYearId: '',
    isNewStudent: true,
    parentName: '',
    parentPhone: '',
    parentWhatsapp: '',
    parentEmail: '',
    parentAddress: '',
    relationship: 'PARENT',
  });

  // State for Edit Details Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    name: '',
    matricule: '',
    dateOfBirth: '',
    placeOfBirth: '',
    gender: '',
    residence: '',
    former_school: '',
  });

  // --- State for Enrollment Modal ---
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentStudent, setEnrollmentStudent] = useState<Student | null>(null);
  const [enrollmentFormData, setEnrollmentFormData] = useState<EnrollmentFormData>({
    subClassId: '',
    academicYearId: '',
    repeater: false,
    photo: '',
  });

  // --- State for Add & Enroll Student Modal (original flow) ---
  const [isAddEnrollModalOpen, setIsAddEnrollModalOpen] = useState(false);
  const [addEnrollFormData, setAddEnrollFormData] = useState({
    name: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: '',
    residence: '',
    former_school: '',
    subClassId: '',
    academicYearId: '',
    repeater: false,
    photo: '',
    is_new_student: true,
  });

  // --- State for Add & Assign Student Modal (class assignment flow) ---
  const [isAddAssignModalOpen, setIsAddAssignModalOpen] = useState(false);
  const [addAssignFormData, setAddAssignFormData] = useState({
    name: '',
    date_of_birth: '',
    place_of_birth: '',
    gender: '',
    residence: '',
    former_school: '',
    classId: '',
    academicYearId: '',
    repeater: false,
    photo: '',
    is_new_student: true,
  });

  // --- State for Assign Existing Student to Class Modal ---
  const [isAssignClassModalOpen, setIsAssignClassModalOpen] = useState(false);
  const [assignClassStudent, setAssignClassStudent] = useState<Student | null>(null);
  const [assignClassFormData, setAssignClassFormData] = useState({
    classId: '',
    academicYearId: '',
    repeater: false,
    photo: '',
  });

  // --- State for Add Student & Parent Modal (Bursar flow) ---
  const [isAddStudentParentModalOpen, setIsAddStudentParentModalOpen] = useState(false);
  const [parentCredentials, setParentCredentials] = useState<{ matricule: string, tempPassword: string, name: string, email?: string, phone: string } | null>(null);

  // --- State for Filters & Pagination ---
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState<EnrollmentStatusFilter>('all');
  const [subClassFilter, setSubClassFilter] = useState<string>('all'); // Store subclass ID as string or 'all'
  const [currentPage, setCurrentPage] = useState(1);

  // --- State for Manage Parents Modal ---
  const [isManageParentsModalOpen, setIsManageParentsModalOpen] = useState(false);
  const [managingParentsForStudent, setManagingParentsForStudent] = useState<Student | null>(null);
  const [selectedParentToLink, setSelectedParentToLink] = useState<string>(''); // Store parent ID

  // --- Data Fetching ---
  const fetchStudents = async () => {
    setIsLoading(true);
    console.log("Fetching students...");
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
      if (subClassFilter !== 'all') {
        params.append('subClassId', subClassFilter);
      }
      // Add academic year filter from AuthContext
      if (selectedAcademicYear) {
        params.append('academicYearId', String(selectedAcademicYear.id));
      }

      const url = `/students?${params.toString()}`;
      console.log(`Fetching from URL: ${url}`);

      // Use apiService
      const result = await apiService.get<{ data: any[], meta?: { total: number } }>(url);

      console.log("Students API response:", result);
      const fetchedStudents = result.data?.map((s: any) => {
        console.log(`Raw data for student ID ${s.id}:`, JSON.stringify(s, null, 2));
        return {
          id: s.id,
          name: s.name,
          matricule: s.matricule,
          subClassName: s.enrollments?.[0]?.subClass?.name,
          subClassId: s.enrollments?.[0]?.subClass?.id,
          className: s.enrollments?.[0]?.subClass?.class?.name,
          academicYearId: s.enrollments?.[0]?.academic_year_id,
          academicYearName: s.enrollments?.[0]?.academicYear?.name, // Assuming academicYear object is nested
          date_of_birth: s.dateOfBirth,
          place_of_birth: s.placeOfBirth,
          gender: s.gender,
          residence: s.residence,
          former_school: s.formerSchool,
          parents: s.parents?.map((p: any) => ({
            id: p.id,
            name: p.name,
            phone: p.phone
          })) || []
        };
      }) || [];
      setTotalStudents(result.meta?.total || 0);
      setStudents(fetchedStudents);
    } catch (error: any) {
      console.error("Failed to fetch students:", error);
      // Toasting is handled by apiService, but you can add specific UI updates here if needed
      if (error.message !== 'Unauthorized') { // Avoid double toast for unauth
        // toast.error(`Failed to load students: ${error.message}`); // Already handled by apiService
      }
      setStudents([]); // Clear students on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParentUsers = async () => {
    console.log("Fetching parent users...");
    try {
      // Use apiService
      const result = await apiService.get<{ data: any[] }>(`/users?role=PARENT`);
      const fetchedParents = result.data?.map((user: any) => ({
        id: user.id,
        name: user.name,
      })) || [];
      setParentUsers(fetchedParents);
      console.log("Parent users fetched:", fetchedParents);
    } catch (error: any) {
      console.error("Failed to fetch parent users:", error);
      // toast.error(`Failed to load parent users: ${error.message}`); // Handled by apiService
      setParentUsers([]);
    }
  };

  const fetchSubClasses = async () => {
    console.log("Fetching subclasses...");
    try {
      // Use apiService
      const result = await apiService.get<{ data: any[] }>(`/classes/sub-classes`);
      const fetchedSubClasses = result.data?.map((sc: any) => ({
        id: sc.id,
        name: sc.name,
        classId: sc.class?.id,
        className: sc.class?.name,
      })) || [];
      setSubClasses(fetchedSubClasses);
    } catch (error: any) {
      console.error("Failed to fetch subclasses:", error);
      // toast.error(`Failed to load subclasses: ${error.message}`); // Handled by apiService
      setSubClasses([]);
    }
  };

  const fetchAcademicYears = async () => {
    console.log("Fetching academic years...");
    try {
      // Use apiService
      const result = await apiService.get<{ data: any[] }>(`/academic-years`);
      const fetchedYears = result.data?.map((ay: any) => ({
        id: ay.id,
        name: ay.name,
        startDate: ay.startDate || ay.start_date,
        endDate: ay.endDate || ay.end_date,
        isActive: ay.is_active,
      })) || [];
      setAcademicYears(fetchedYears);
    } catch (error: any) {
      console.error("Failed to fetch academic years:", error);
      // toast.error(`Failed to load academic years: ${error.message}`); // Handled by apiService
      setAcademicYears([]);
    }
  };

  // Fetch classes for classId dropdown
  const fetchClasses = async () => {
    try {
      const result = await apiService.get<{ data: any[] }>(`/classes`);
      const fetchedClasses = result.data?.map((c: any) => ({
        id: c.id,
        name: c.name,
        level: c.level,
      })) || [];
      setClasses(fetchedClasses);
    } catch (error: any) {
      setClasses([]);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [enrollmentFilter, currentPage, subClassFilter, searchTerm, selectedAcademicYear]); // Add selectedAcademicYear dependency

  useEffect(() => {
    fetchSubClasses();
    fetchAcademicYears();
    fetchParentUsers();
    fetchClasses();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = term === '' ||
        student.name.toLowerCase().includes(term) ||
        (student.matricule && student.matricule.toLowerCase().includes(term));
      const matchesSubClass = subClassFilter === 'all' || String(student.subClassId) === subClassFilter;
      return matchesSearch && matchesSubClass;
    });
  }, [students, searchTerm, subClassFilter]);

  const totalPages = Math.ceil(totalStudents / STUDENTS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const openModal = () => {
    setFormData({
      studentName: '',
      dateOfBirth: '',
      placeOfBirth: '',
      gender: '',
      residence: '',
      formerSchool: '',
      classId: '',
      academicYearId: '',
      isNewStudent: true,
      parentName: '',
      parentPhone: '',
      parentWhatsapp: '',
      parentEmail: '',
      parentAddress: '',
      relationship: 'PARENT',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAndEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required fields
    if (!formData.studentName || !formData.classId || !formData.academicYearId || !formData.parentName || !formData.parentPhone || !formData.parentAddress) {
      toast.error("All required fields must be filled.");
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        studentName: formData.studentName,
        dateOfBirth: formData.dateOfBirth,
        placeOfBirth: formData.placeOfBirth,
        gender: formData.gender,
        residence: formData.residence,
        formerSchool: formData.formerSchool,
        classId: Number(formData.classId),
        academicYearId: Number(formData.academicYearId),
        isNewStudent: true,
        parentName: formData.parentName,
        parentPhone: formData.parentPhone,
        parentWhatsapp: formData.parentWhatsapp,
        parentEmail: formData.parentEmail,
        parentAddress: formData.parentAddress,
        relationship: formData.relationship || 'PARENT',
      };
      const result = await apiService.post('/bursar/create-parent-with-student', payload);
      toast.success('Student and parent created successfully!');
      if (result.data && result.data.parent) {
        setParentCredentials({
          matricule: result.data.parent.matricule,
          tempPassword: result.data.parent.tempPassword,
          name: result.data.parent.name,
          email: result.data.parent.email,
          phone: result.data.parent.phone,
        });
      }
      fetchStudents();
    } catch (error: any) {
      if (error.message !== 'Unauthorized') {
        toast.error(`Operation failed: ${error.message}`);
      }
      fetchStudents();
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (student: Student) => {
    console.log("Populating edit modal for student:", JSON.stringify(student, null, 2));
    setEditingStudent(student);
    const formattedDOB = student.date_of_birth
      ? student.date_of_birth.split('T')[0]
      : '';
    setEditFormData({
      name: student.name || '',
      matricule: student.matricule || '',
      dateOfBirth: formattedDOB,
      placeOfBirth: student.place_of_birth || '',
      gender: student.gender || '',
      residence: student.residence || '',
      former_school: student.former_school || '',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingStudent(null);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editFormData.name) {
      toast.error("Student Name is required.");
      return;
    }

    setIsLoading(true);
    const payload: EditFormData = {
      name: editFormData.name,
      matricule: editFormData.matricule || null,
      dateOfBirth: editFormData.dateOfBirth || null,
      placeOfBirth: editFormData.placeOfBirth || null,
      gender: editFormData.gender || null,
      residence: editFormData.residence || null,
      former_school: editFormData.former_school || null,
    };
    console.log(`Updating student ID ${editingStudent.id} with payload:`, payload);

    try {
      // Use apiService for updating student
      await apiService.put(`/students/${editingStudent.id}`, payload);
      toast.success(`Student '${editingStudent.name}' updated successfully!`);
      closeEditModal();
      fetchStudents();
    } catch (error: any) {
      console.error("Student update failed:", error);
      // toast.error(`Student update failed: ${error.message}`); // Handled by apiService
    } finally {
      setIsLoading(false);
    }
  };

  const openEnrollmentModal = (student: Student) => {
    setEnrollmentStudent(student);
    setEnrollmentFormData({
      subClassId: student.subClassId || '',
      academicYearId: student.academicYearId || (selectedAcademicYear ? String(selectedAcademicYear.id) : ''),
      repeater: false,
      photo: '',
    });
    if (academicYears.length === 0) fetchAcademicYears();
    if (subClasses.length === 0) fetchSubClasses();
    setIsEnrollmentModalOpen(true);
  };

  const closeEnrollmentModal = () => {
    setIsEnrollmentModalOpen(false);
    setEnrollmentStudent(null);
    setEnrollmentFormData({ subClassId: '', academicYearId: '', repeater: false, photo: '' });
  };

  const openAssignToClassModal = (student: Student) => {
    setAssignClassStudent(student);
    setAssignClassFormData({
      classId: '',
      academicYearId: student.academicYearId || (selectedAcademicYear ? String(selectedAcademicYear.id) : ''),
      repeater: false,
      photo: '',
    });
    if (academicYears.length === 0) fetchAcademicYears();
    if (classes.length === 0) fetchClasses();
    setIsAssignClassModalOpen(true);
  };

  const closeAssignToClassModal = () => {
    setIsAssignClassModalOpen(false);
    setAssignClassStudent(null);
    setAssignClassFormData({ classId: '', academicYearId: '', repeater: false, photo: '' });
  };

  const openAddEnrollModal = () => {
    setAddEnrollFormData({
      name: '',
      matricule: '',
      date_of_birth: '',
      place_of_birth: '',
      gender: '',
      residence: '',
      former_school: '',
      subClassId: '',
      academicYearId: selectedAcademicYear ? String(selectedAcademicYear.id) : '',
      repeater: false,
      photo: '',
    });
    setIsAddEnrollModalOpen(true);
  };

  const openAddAssignModal = () => {
    setAddAssignFormData({
      name: '',
      matricule: '',
      date_of_birth: '',
      place_of_birth: '',
      gender: '',
      residence: '',
      former_school: '',
      classId: '',
      academicYearId: selectedAcademicYear ? String(selectedAcademicYear.id) : '',
      repeater: false,
      photo: '',
    });
    setIsAddAssignModalOpen(true);
  };

  const handleEnrollmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setEnrollmentFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentStudent || !enrollmentFormData.subClassId || !enrollmentFormData.academicYearId) {
      toast.error("Subclass and Academic Year must be selected for enrollment.");
      return;
    }

    setIsLoading(true);
    const studentId = enrollmentStudent.id;
    const payload = {
      sub_class_id: enrollmentFormData.subClassId,
      academic_year_id: enrollmentFormData.academicYearId,
      repeater: enrollmentFormData.repeater || false,
      photo: enrollmentFormData.photo || null,
    };
    console.log(`Enrolling student ID ${studentId} with payload:`, payload);

    try {
      // Use apiService for enrolling student
      await apiService.post(`/students/${studentId}/enroll`, payload);
      toast.success(`Student '${enrollmentStudent.name}' enrollment updated/created successfully!`);
      closeEnrollmentModal();
      fetchStudents();
    } catch (error: any) {
      console.error("Student enrollment failed:", error);
      // toast.error(`Enrollment failed: ${error.message}`); // Handled by apiService
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignClassStudent || !assignClassFormData.classId || !assignClassFormData.academicYearId) {
      toast.error("Class and Academic Year must be selected for assignment.");
      return;
    }

    setIsLoading(true);
    const studentId = assignClassStudent.id;
    const payload = {
      classId: parseInt(assignClassFormData.classId),
      academicYearId: parseInt(assignClassFormData.academicYearId),
      repeater: assignClassFormData.repeater || false,
      photo: assignClassFormData.photo || null,
    };
    console.log(`Assigning student ID ${studentId} to class with payload:`, payload);

    try {
      await apiService.post(`/students/${studentId}/assign-class`, payload);
      toast.success(`Student '${assignClassStudent.name}' assigned to class successfully!`);
      closeAssignToClassModal();
      fetchStudents();
    } catch (error: any) {
      if (error.message !== 'Unauthorized') {
        toast.error(`Class assignment failed: ${error.message}`);
      }
      fetchStudents();
    } finally {
      setIsLoading(false);
    }
  };

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
    setIsLoading(true);

    try {
      // Use apiService.get but expect a blob response
      // The apiService currently assumes JSON response. This needs adjustment or a separate fetch.
      // For now, keeping original fetch for blob handling.
      const token = localStorage.getItem('token'); // apiService handles token, but direct fetch needs it
      if (!token) {
        toast.error("Authentication required.", { id: 'export-toast' });
        setIsLoading(false);
        return;
      }

      // Build export URL with academic year filter
      const exportParams = new URLSearchParams({
        subClassId: subClassId,
        format: format
      });
      if (selectedAcademicYear) {
        exportParams.append('academicYearId', String(selectedAcademicYear.id));
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/students/export?${exportParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        // Simplified 401 handling here as apiService is not used for this specific call
        toast.error("Session expired. Please log in again.", { id: 'export-toast' });
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        window.location.href = '/';
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        let errorMessage = `Export failed (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) { /* Response might not be JSON */ }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = `${subClassName.replace(/s+/g, '_')}_students_${new Date().toISOString().split('T')[0]}.${format}`;
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
  };

  const openManageParentsModal = (student: Student) => {
    console.log("Opening manage parents modal for:", student);
    setManagingParentsForStudent(student);
    setSelectedParentToLink('');
    setIsManageParentsModalOpen(true);
  };

  const closeManageParentsModal = () => {
    setIsManageParentsModalOpen(false);
    setManagingParentsForStudent(null);
  };

  const handleLinkParent = async () => {
    if (!managingParentsForStudent || !selectedParentToLink) {
      toast.error("Student and Parent must be selected.");
      return;
    }

    setIsLoading(true);
    const studentId = managingParentsForStudent.id;
    const parentId = selectedParentToLink;
    console.log(`Linking parent ID ${parentId} to student ID ${studentId}`);

    try {
      // Use apiService for linking parent
      await apiService.post(`/students/${studentId}/parents`, { parentId: parseInt(parentId) });

      toast.success(`Parent linked successfully to ${managingParentsForStudent.name}!`);
      await fetchStudents();
      setManagingParentsForStudent(prev => prev ?
        { ...prev, parents: [...(prev.parents || []), { id: parseInt(parentId), name: parentUsers.find(p => p.id === parseInt(parentId))?.name || 'New Parent' }] }
        : null
      );
      setSelectedParentToLink('');
    } catch (error: any) {
      console.error("Parent linking failed:", error);
      // toast.error(`Parent linking failed: ${error.message}`); // Handled by apiService
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkParent = async (studentId: number, parentId: number) => {
    if (!managingParentsForStudent) return;

    console.log(`Unlinking parent ID ${parentId} from student ID ${studentId}`);
    toast.loading('Unlinking parent...', { id: 'unlink-toast' });
    setIsLoading(true);

    try {
      // Use apiService for unlinking parent
      await apiService.delete(`/students/${studentId}/parents/${parentId}`);

      toast.success('Parent unlinked successfully!', { id: 'unlink-toast' });
      setStudents(prevStudents => prevStudents.map(s =>
        s.id === studentId
          ? { ...s, parents: s.parents?.filter(p => p.id !== parentId) || [] }
          : s
      ));
      setManagingParentsForStudent(prev => prev ?
        { ...prev, parents: prev.parents?.filter(p => p.id !== parentId) || [] }
        : null
      );
    } catch (error: any) {
      console.error("Parent unlinking failed:", error);
      // toast.error(`Unlinking failed: ${error.message}`); // Handled by apiService
      toast.dismiss('unlink-toast'); // Dismiss loading toast on error
      // The apiService will show its own error toast.
    } finally {
      setIsLoading(false);
    }
  };

  // JSX remains largely the same, only API call logic changes
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="text-gray-600 mt-1">View, add, and enroll student records.</p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Total Students: {totalStudents}</span>
                <span>•</span>
                <span>Page {currentPage} of {totalPages}</span>
                {selectedAcademicYear && (
                  <>
                    <span>•</span>
                    <span>Academic Year: {selectedAcademicYear.name}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={openAddEnrollModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Add & Enroll Student'
                )}
              </button>
              <button
                onClick={openAddAssignModal}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Add & Assign Student'
                )}
              </button>
              <button
                onClick={() => setIsAddStudentParentModalOpen(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Add Student & Parent'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section with Improved Layout */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 sticky top-0">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            {/* Search Input */}
            <div className="md:col-span-2">
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
                    setCurrentPage(1);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Name, matricule..."
                />
              </div>
            </div>

            {/* Enrollment Status Filter */}
            <div>
              <label htmlFor="enrollmentFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                id="enrollmentFilter"
                value={enrollmentFilter}
                onChange={(e) => {
                  setEnrollmentFilter(e.target.value as EnrollmentStatusFilter);
                  setCurrentPage(1);
                }}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              >
                <option value="all">All</option>
                <option value="enrolled">Enrolled</option>
                <option value="not-enrolled">Not Enrolled</option>
              </select>
            </div>

            {/* SubClass Filter */}
            <div className="md:col-span-2">
              <label htmlFor="subClassFilter" className="block text-sm font-medium text-gray-700 mb-1">Subclass</label>
              <select
                id="subClassFilter"
                value={subClassFilter}
                onChange={(e) => {
                  setSubClassFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
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
            <div>
              <button
                onClick={() => handleExportSubclass('pdf')}
                disabled={isLoading || subClassFilter === 'all'}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={subClassFilter === 'all' ? "Select a specific subclass to export" : "Export selected subclass students (PDF)"}
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Student Table Container with Proper Z-index */}
        <div className="relative z-0">
          {/* Loading Overlay with Higher Z-index */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-xl font-semibold text-gray-700">Loading Students...</p>
              </div>
            </div>
          )}

          {/* Student Table with Proper Z-index */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden relative z-10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Student Info</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Enrollment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Personal Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Former School</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading && students.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-500">Loading students...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8">
                        <div className="flex flex-col items-center">
                          <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm || enrollmentFilter !== 'all' || subClassFilter !== 'all'
                              ? 'No students match the current filters'
                              : 'No students found'
                            }
                          </h3>
                          <p className="text-gray-500 text-sm">
                            {searchTerm || enrollmentFilter !== 'all' || subClassFilter !== 'all'
                              ? 'Try adjusting your search or filter criteria'
                              : 'Get started by adding your first student'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Map over students directly (current page data) */}
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      {/* Student Info Column */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500">
                            Matricule: {student.matricule || 'Not assigned'}
                          </div>
                        </div>
                      </td>

                      {/* Enrollment Column */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-700">
                            {student.subClassName || 'Not Enrolled'}
                          </div>
                          {student.academicYearName && (
                            <div className="text-xs text-gray-500">
                              {student.academicYearName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Personal Details Column */}
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>DOB: {student.date_of_birth?.split('T')[0] || '-'}</div>
                          <div>Gender: {student.gender || '-'}</div>
                          <div>Residence: {student.residence || '-'}</div>
                        </div>
                      </td>

                      {/* Former School Column */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600">
                          {student.former_school || '-'}
                        </div>
                      </td>

                      {/* Actions Column with Horizontal Layout */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => openEditModal(student)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            disabled={isLoading}
                            title="Edit Student Details"
                          >
                            <PencilSquareIcon className="h-3 w-3 mr-1" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => openEnrollmentModal(student)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            disabled={isLoading}
                            title="Enroll/Manage Student"
                          >
                            <ClipboardDocumentListIcon className="h-3 w-3 mr-1" />
                            <span>Enroll</span>
                          </button>

                          {!student.subClassName && (
                            <button
                              onClick={() => openAssignToClassModal(student)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                              disabled={isLoading}
                              title="Assign Student to Class"
                            >
                              <ClipboardDocumentListIcon className="h-3 w-3 mr-1" />
                              <span>Assign Class</span>
                            </button>
                          )}

                          <button
                            onClick={() => openManageParentsModal(student)}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            disabled={isLoading}
                            title="Manage Student's Parents"
                          >
                            <UserGroupIcon className="h-3 w-3 mr-1" />
                            <span>Parents</span>
                          </button>

                          <button
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            disabled={isLoading}
                            title="Delete Student"
                          >
                            <TrashIcon className="h-3 w-3 mr-1" />
                            <span>Delete</span>
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
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 bg-white rounded-b-lg sticky bottom-0 z-20">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * STUDENTS_PER_PAGE + 1}</span>
                      {' '}to <span className="font-medium">{Math.min(currentPage * STUDENTS_PER_PAGE, totalStudents)}</span>
                      {' '}of <span className="font-medium">{totalStudents}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <span className="sr-only">Next</span>
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

      {/* Add & Enroll Student Modal (original flow) */}
      {isAddEnrollModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Add & Enroll Student</h3>
              <button
                onClick={() => setIsAddEnrollModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!addEnrollFormData.name || !addEnrollFormData.subClassId || !addEnrollFormData.academicYearId) {
                toast.error("Student Name, Subclass, and Academic Year are required.");
                return;
              }
              setIsLoading(true);
              let newStudentId: number | null = null;
              let studentName = addEnrollFormData.name;
              const studentPayload = {
                name: addEnrollFormData.name,
                date_of_birth: addEnrollFormData.date_of_birth || null,
                place_of_birth: addEnrollFormData.place_of_birth || null,
                gender: addEnrollFormData.gender || null,
                residence: addEnrollFormData.residence || null,
                former_school: addEnrollFormData.former_school || null,
                is_new_student: addEnrollFormData.is_new_student || false,
              };
              try {
                const createResult = await apiService.post<{ data?: { id: number, name: string } }>('/students', studentPayload);
                newStudentId = createResult.data?.id ?? null;
                studentName = createResult.data?.name || addEnrollFormData.name;
                if (!newStudentId) {
                  throw new Error('Student created, but no ID was returned by the API.');
                }
                toast.success(`Student '${studentName}' record created (ID: ${newStudentId}). Proceeding to enrollment...`);
                const enrollmentPayload = {
                  sub_class_id: addEnrollFormData.subClassId,
                  academic_year_id: addEnrollFormData.academicYearId,
                  repeater: addEnrollFormData.repeater || false,
                  photo: addEnrollFormData.photo || null,
                };
                await apiService.post(`/students/${newStudentId}/enroll`, enrollmentPayload);
                toast.success(`Student '${studentName}' enrolled successfully!`);
                setIsAddEnrollModalOpen(false);
                fetchStudents();
              } catch (error: any) {
                if (error.message !== 'Unauthorized') {
                  toast.error(`Operation failed: ${error.message}`);
                }
                fetchStudents();
              } finally {
                setIsLoading(false);
              }
            }} className="space-y-4">
              <section className="border-b pb-4 mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">Student Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input type="text" id="name" name="name" value={addEnrollFormData.name} onChange={e => setAddEnrollFormData(prev => ({ ...prev, name: e.target.value }))} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input type="text" id="date_of_birth" name="date_of_birth" value={addEnrollFormData.date_of_birth || ''} onChange={e => setAddEnrollFormData(prev => ({ ...prev, date_of_birth: e.target.value }))} className="mt-1 block w-full input-field" placeholder="YYYY-MM-DD" />
                  </div>
                  <div>
                    <label htmlFor="place_of_birth" className="block text-sm font-medium text-gray-700">Place of Birth</label>
                    <input type="text" id="place_of_birth" name="place_of_birth" value={addEnrollFormData.place_of_birth || ''} onChange={e => setAddEnrollFormData(prev => ({ ...prev, place_of_birth: e.target.value }))} className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                    <select id="gender" name="gender" value={addEnrollFormData.gender || ''} onChange={e => setAddEnrollFormData(prev => ({ ...prev, gender: e.target.value }))} className="mt-1 block w-full input-field bg-white">
                      <option value="" disabled>Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="residence" className="block text-sm font-medium text-gray-700">Residence</label>
                    <input type="text" id="residence" name="residence" value={addEnrollFormData.residence || ''} onChange={e => setAddEnrollFormData(prev => ({ ...prev, residence: e.target.value }))} className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="former_school" className="block text-sm font-medium text-gray-700">Former School</label>
                    <input type="text" id="former_school" name="former_school" value={addEnrollFormData.former_school || ''} onChange={e => setAddEnrollFormData(prev => ({ ...prev, former_school: e.target.value }))} className="mt-1 block w-full input-field" />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center h-full">
                      <input 
                        id="isNewStudentEnroll" 
                        name="is_new_student" 
                        type="checkbox" 
                        checked={addEnrollFormData.is_new_student || false} 
                        onChange={e => setAddEnrollFormData(prev => ({ ...prev, is_new_student: e.target.checked }))} 
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                      />
                      <label htmlFor="isNewStudentEnroll" className="ml-2 block text-sm text-gray-900">Is New Student?</label>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h4 className="text-md font-semibold text-gray-700 mb-3">Enrollment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="academicYearId" className="block text-sm font-medium text-gray-700">Academic Year *</label>
                    <select id="academicYearId" name="academicYearId" value={addEnrollFormData.academicYearId} onChange={e => setAddEnrollFormData(prev => ({ ...prev, academicYearId: e.target.value }))} required className="mt-1 block w-full input-field bg-white" disabled={academicYears.length === 0}>
                      <option value="" disabled>Select Year</option>
                      {academicYears.length === 0 && <option disabled>Loading years...</option>}
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>{year.name} ({new Date(year.startDate).getFullYear()}-{new Date(year.endDate).getFullYear()})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="subClassId" className="block text-sm font-medium text-gray-700">Assign to Subclass *</label>
                    <select id="subClassId" name="subClassId" value={addEnrollFormData.subClassId} onChange={e => setAddEnrollFormData(prev => ({ ...prev, subClassId: e.target.value }))} required className="mt-1 block w-full input-field bg-white" disabled={subClasses.length === 0}>
                      <option value="" disabled>Select Subclass</option>
                      {subClasses.length === 0 && <option disabled>Loading subclasses...</option>}
                      {subClasses.map((sc) => (
                        <option key={sc.id} value={sc.id}>{sc.name} {sc.className ? `(${sc.className})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center h-full">
                      <input id="repeater" name="repeater" type="checkbox" checked={addEnrollFormData.repeater || false} onChange={e => setAddEnrollFormData(prev => ({ ...prev, repeater: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <label htmlFor="repeater" className="ml-2 block text-sm text-gray-900">Is Repeater?</label>
                    </div>
                  </div>
                </div>
              </section>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" onClick={() => setIsAddEnrollModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={isLoading || !addEnrollFormData.subClassId || !addEnrollFormData.academicYearId}>{isLoading ? 'Saving...' : 'Create & Enroll Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add & Assign Student Modal (class assignment flow) */}
      {isAddAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Add & Assign Student to Class</h3>
              <button
                onClick={() => setIsAddAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!addAssignFormData.name || !addAssignFormData.classId || !addAssignFormData.academicYearId) {
                toast.error("Student Name, Class, and Academic Year are required.");
                return;
              }
              setIsLoading(true);
              let newStudentId: number | null = null;
              let studentName = addAssignFormData.name;
              const studentPayload = {
                name: addAssignFormData.name,
                date_of_birth: addAssignFormData.date_of_birth || null,
                place_of_birth: addAssignFormData.place_of_birth || null,
                gender: addAssignFormData.gender || null,
                residence: addAssignFormData.residence || null,
                former_school: addAssignFormData.former_school || null,
                is_new_student: addAssignFormData.is_new_student || false,
              };
              try {
                const createResult = await apiService.post<{ data?: { id: number, name: string } }>('/students', studentPayload);
                newStudentId = createResult.data?.id ?? null;
                studentName = createResult.data?.name || addAssignFormData.name;
                if (!newStudentId) {
                  throw new Error('Student created, but no ID was returned by the API.');
                }
                toast.success(`Student '${studentName}' record created (ID: ${newStudentId}). Proceeding to class assignment...`);
                const assignmentPayload = {
                  classId: parseInt(addAssignFormData.classId),
                  academicYearId: parseInt(addAssignFormData.academicYearId),
                  repeater: addAssignFormData.repeater || false,
                  photo: addAssignFormData.photo || null,
                };
                await apiService.post(`/students/${newStudentId}/assign-class`, assignmentPayload);
                toast.success(`Student '${studentName}' assigned to class successfully!`);
                setIsAddAssignModalOpen(false);
                setAddAssignFormData({
                  name: '',
                  matricule: '',
                  date_of_birth: '',
                  place_of_birth: '',
                  gender: '',
                  residence: '',
                  former_school: '',
                  classId: '',
                  academicYearId: '',
                  repeater: false,
                  photo: '',
                });
                fetchStudents();
              } catch (error: any) {
                if (error.message !== 'Unauthorized') {
                  toast.error(`Operation failed: ${error.message}`);
                }
                fetchStudents();
              } finally {
                setIsLoading(false);
              }
            }} className="space-y-4">
              <section className="border-b pb-4 mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">Student Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="assignName" className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input type="text" id="assignName" name="name" value={addAssignFormData.name} onChange={e => setAddAssignFormData(prev => ({ ...prev, name: e.target.value }))} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="assignDateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <input type="text" id="assignDateOfBirth" name="date_of_birth" value={addAssignFormData.date_of_birth || ''} onChange={e => setAddAssignFormData(prev => ({ ...prev, date_of_birth: e.target.value }))} className="mt-1 block w-full input-field" placeholder="YYYY-MM-DD" />
                  </div>
                  <div>
                    <label htmlFor="assignPlaceOfBirth" className="block text-sm font-medium text-gray-700">Place of Birth</label>
                    <input type="text" id="assignPlaceOfBirth" name="place_of_birth" value={addAssignFormData.place_of_birth || ''} onChange={e => setAddAssignFormData(prev => ({ ...prev, place_of_birth: e.target.value }))} className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="assignGender" className="block text-sm font-medium text-gray-700">Gender</label>
                    <select id="assignGender" name="gender" value={addAssignFormData.gender || ''} onChange={e => setAddAssignFormData(prev => ({ ...prev, gender: e.target.value }))} className="mt-1 block w-full input-field bg-white">
                      <option value="" disabled>Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="assignResidence" className="block text-sm font-medium text-gray-700">Residence</label>
                    <input type="text" id="assignResidence" name="residence" value={addAssignFormData.residence || ''} onChange={e => setAddAssignFormData(prev => ({ ...prev, residence: e.target.value }))} className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="assignFormerSchool" className="block text-sm font-medium text-gray-700">Former School</label>
                    <input type="text" id="assignFormerSchool" name="former_school" value={addAssignFormData.former_school || ''} onChange={e => setAddAssignFormData(prev => ({ ...prev, former_school: e.target.value }))} className="mt-1 block w-full input-field" />
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center h-full">
                      <input 
                        id="isNewStudentAssign" 
                        name="is_new_student" 
                        type="checkbox" 
                        checked={addAssignFormData.is_new_student || false} 
                        onChange={e => setAddAssignFormData(prev => ({ ...prev, is_new_student: e.target.checked }))} 
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
                      />
                      <label htmlFor="isNewStudentAssign" className="ml-2 block text-sm text-gray-900">Is New Student?</label>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h4 className="text-md font-semibold text-gray-700 mb-3">Class Assignment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="assignAcademicYearId" className="block text-sm font-medium text-gray-700">Academic Year *</label>
                    <select id="assignAcademicYearId" name="academicYearId" value={addAssignFormData.academicYearId} onChange={e => setAddAssignFormData(prev => ({ ...prev, academicYearId: e.target.value }))} required className="mt-1 block w-full input-field bg-white" disabled={academicYears.length === 0}>
                      <option value="" disabled>Select Year</option>
                      {academicYears.length === 0 && <option disabled>Loading years...</option>}
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>{year.name} ({new Date(year.startDate).getFullYear()}-{new Date(year.endDate).getFullYear()})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="assignClassId" className="block text-sm font-medium text-gray-700">Assign to Class *</label>
                    <select id="assignClassId" name="classId" value={addAssignFormData.classId} onChange={e => setAddAssignFormData(prev => ({ ...prev, classId: e.target.value }))} required className="mt-1 block w-full input-field bg-white" disabled={classes.length === 0}>
                      <option value="" disabled>Select Class</option>
                      {classes.length === 0 && <option disabled>Loading classes...</option>}
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <div className="flex items-center h-full">
                      <input id="assignRepeater" name="repeater" type="checkbox" checked={addAssignFormData.repeater || false} onChange={e => setAddAssignFormData(prev => ({ ...prev, repeater: e.target.checked }))} className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                      <label htmlFor="assignRepeater" className="ml-2 block text-sm text-gray-900">Is Repeater?</label>
                    </div>
                  </div>
                </div>
              </section>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" onClick={() => setIsAddAssignModalOpen(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>Cancel</button>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50" disabled={isLoading || !addAssignFormData.classId || !addAssignFormData.academicYearId}>{isLoading ? 'Saving...' : 'Create & Assign Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign to Class Modal */}
      {isAssignClassModalOpen && assignClassStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Assign Student to Class: {assignClassStudent.name}
              </h3>
              <button
                onClick={closeAssignToClassModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAssignToClass} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assignClassAcademicYear" className="block text-sm font-medium text-gray-700">Academic Year *</label>
                  <select
                    id="assignClassAcademicYear"
                    name="academicYearId"
                    value={assignClassFormData.academicYearId}
                    onChange={(e) => setAssignClassFormData(prev => ({ ...prev, academicYearId: e.target.value }))}
                    required
                    className="mt-1 block w-full input-field bg-white"
                    disabled={academicYears.length === 0 || isLoading}
                  >
                    <option value="" disabled>Select Academic Year</option>
                    {academicYears.length === 0 && <option disabled>Loading years...</option>}
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name} ({new Date(year.startDate).getFullYear()}-{new Date(year.endDate).getFullYear()})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="assignClassClass" className="block text-sm font-medium text-gray-700">Class *</label>
                  <select
                    id="assignClassClass"
                    name="classId"
                    value={assignClassFormData.classId}
                    onChange={(e) => setAssignClassFormData(prev => ({ ...prev, classId: e.target.value }))}
                    required
                    className="mt-1 block w-full input-field bg-white"
                    disabled={classes.length === 0 || isLoading}
                  >
                    <option value="" disabled>Select Class</option>
                    {classes.length === 0 && <option disabled>Loading classes...</option>}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="assignClassRepeater"
                  name="repeater"
                  type="checkbox"
                  checked={assignClassFormData.repeater || false}
                  onChange={(e) => setAssignClassFormData(prev => ({ ...prev, repeater: e.target.checked }))}
                  className="h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  disabled={isLoading}
                />
                <label htmlFor="assignClassRepeater" className="ml-2 block text-sm text-gray-900">
                  Is Repeater?
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={closeAssignToClassModal}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  disabled={isLoading || !assignClassFormData.classId || !assignClassFormData.academicYearId}
                >
                  {isLoading ? 'Assigning...' : 'Assign to Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student & Parent Modal (Bursar flow, as previously implemented) */}
      {isAddStudentParentModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Add New Student & Parent</h3>
              <button
                onClick={() => {
                  setIsAddStudentParentModalOpen(false);
                  setParentCredentials(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateAndEnrollStudent} className="space-y-4">
              {/* Student Details Section */}
              <section className="border-b pb-4 mb-4">
                <h4 className="text-md font-semibold text-gray-700 mb-3">Student Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input type="text" id="studentName" name="studentName" value={formData.studentName} onChange={handleInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                    <input type="text" id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} required className="mt-1 block w-full input-field" placeholder="YYYY-MM-DD" />
                  </div>
                  <div>
                    <label htmlFor="placeOfBirth" className="block text-sm font-medium text-gray-700">Place of Birth *</label>
                    <input type="text" id="placeOfBirth" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender *</label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} required className="mt-1 block w-full input-field bg-white">
                      <option value="" disabled>Select...</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="residence" className="block text-sm font-medium text-gray-700">Residence *</label>
                    <input type="text" id="residence" name="residence" value={formData.residence} onChange={handleInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="formerSchool" className="block text-sm font-medium text-gray-700">Former School</label>
                    <input type="text" id="formerSchool" name="formerSchool" value={formData.formerSchool || ''} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="classId" className="block text-sm font-medium text-gray-700">Class *</label>
                    <select id="classId" name="classId" value={formData.classId} onChange={handleInputChange} required className="mt-1 block w-full input-field bg-white" disabled={classes.length === 0}>
                      <option value="" disabled>Select Class</option>
                      {classes.length === 0 && <option disabled>Loading classes...</option>}
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="academicYearId" className="block text-sm font-medium text-gray-700">Academic Year *</label>
                    <select id="academicYearId" name="academicYearId" value={formData.academicYearId} onChange={handleInputChange} required className="mt-1 block w-full input-field bg-white" disabled={academicYears.length === 0}>
                      <option value="" disabled>Select Year</option>
                      {academicYears.length === 0 && <option disabled>Loading years...</option>}
                      {academicYears.map((year) => (
                        <option key={year.id} value={year.id}>{year.name} ({new Date(year.startDate).getFullYear()}-{new Date(year.endDate).getFullYear()})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              {/* Parent Details Section */}
              <section>
                <h4 className="text-md font-semibold text-gray-700 mb-3">Parent Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="parentName" className="block text-sm font-medium text-gray-700">Parent Name *</label>
                    <input type="text" id="parentName" name="parentName" value={formData.parentName} onChange={handleInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="parentPhone" className="block text-sm font-medium text-gray-700">Parent Phone *</label>
                    <input type="text" id="parentPhone" name="parentPhone" value={formData.parentPhone} onChange={handleInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="parentWhatsapp" className="block text-sm font-medium text-gray-700">Parent Whatsapp</label>
                    <input type="text" id="parentWhatsapp" name="parentWhatsapp" value={formData.parentWhatsapp || ''} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                  </div>
                  <div>
                    <label htmlFor="parentEmail" className="block text-sm font-medium text-gray-700">Parent Email</label>
                    <input type="email" id="parentEmail" name="parentEmail" value={formData.parentEmail || ''} onChange={handleInputChange} className="mt-1 block w-full input-field" />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="parentAddress" className="block text-sm font-medium text-gray-700">Parent Address *</label>
                    <input type="text" id="parentAddress" name="parentAddress" value={formData.parentAddress} onChange={handleInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                </div>
              </section>
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" onClick={() => { setIsAddStudentParentModalOpen(false); setParentCredentials(null); }} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>Cancel</button>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50" disabled={isLoading}>{isLoading ? 'Saving...' : 'Create Student & Parent'}</button>
              </div>
            </form>
            {parentCredentials && (
              <div className="mt-6 p-4 bg-green-50 border border-green-300 rounded-lg shadow-sm">
                <h4 className="text-lg font-semibold text-green-800 mb-3">Parent Account Credentials</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium">Name:</span> {parentCredentials.name}</div>
                  <div><span className="font-medium">Phone:</span> {parentCredentials.phone}</div>
                  <div><span className="font-medium">Matricule:</span> <span className="font-mono text-blue-700">{parentCredentials.matricule}</span></div>
                  <div><span className="font-medium">Temporary Password:</span> <span className="font-mono text-blue-700">{parentCredentials.tempPassword}</span></div>
                  {parentCredentials.email && (
                    <div className="md:col-span-2"><span className="font-medium">Email:</span> {parentCredentials.email}</div>
                  )}
                </div>
                <div className="mt-3 p-3 bg-green-100 rounded">
                  <p className="text-green-700 text-sm">Share these credentials with the parent. They can log in and change their password after first login.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Student Details Modal */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-3xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Edit Student Details: {editingStudent.name}</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              {/* Ensure all inputs use `editFormData.fieldName || ''` for value */}
              <section>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Name (Span 2) */}
                  <div className="md:col-span-2">
                    <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input type="text" id="edit-name" name="name" value={editFormData.name || ''} onChange={handleEditInputChange} required className="mt-1 block w-full input-field" />
                  </div>
                  {/* Matricule */}
                  <div>
                    <label htmlFor="edit-matricule" className="block text-sm font-medium text-gray-700">Matricule</label>
                    <input type="text" id="edit-matricule" name="matricule" value={editFormData.matricule || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field" />
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
                    <input type="text" id="edit-place_of_birth" name="placeOfBirth" value={editFormData.placeOfBirth || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field" />
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
                  {/* Residence */}
                  <div>
                    <label htmlFor="edit-residence" className="block text-sm font-medium text-gray-700">Residence</label>
                    <input type="text" id="edit-residence" name="residence" value={editFormData.residence || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field" />
                  </div>
                  {/* Former School */}
                  <div>
                    <label htmlFor="edit-former_school" className="block text-sm font-medium text-gray-700">Former School</label>
                    <input type="text" id="edit-former_school" name="former_school" value={editFormData.former_school || ''} onChange={handleEditInputChange} className="mt-1 block w-full input-field" />
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-lg shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Manage Enrollment for: {enrollmentStudent.name}</h3>
              <button
                onClick={closeEnrollmentModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
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

      {/* Manage Parents Modal */}
      {isManageParentsModalOpen && managingParentsForStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto p-6 border w-full max-w-xl shadow-lg rounded-lg bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Manage Parents for: {managingParentsForStudent.name}</h3>
              <button
                onClick={closeManageParentsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current Linked Parents List */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-700 mb-2">Linked Parents:</h4>
              {(!managingParentsForStudent.parents || managingParentsForStudent.parents.length === 0) && (
                <p className="text-sm text-gray-500">No parents currently linked.</p>
              )}
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {managingParentsForStudent.parents?.map(parent => (
                  <li key={parent.id} className="flex justify-between items-center p-2 border rounded-md">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{parent.name}</span>
                      {parent.phone && <span className="text-xs text-gray-500 ml-2">({parent.phone})</span>}
                    </div>
                    <button
                      onClick={() => handleUnlinkParent(managingParentsForStudent.id, parent.id)}
                      className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                      title="Unlink Parent"
                      disabled={isLoading}
                    >
                      Unlink
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Link New Parent Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleLinkParent(); }} className="space-y-4 border-t pt-6">
              <h4 className="text-md font-semibold text-gray-700 mb-1">Link New Parent:</h4>
              <div>
                <label htmlFor="link-parentId" className="block text-sm font-medium text-gray-700 sr-only">Select Parent</label>
                <select
                  id="link-parentId"
                  value={selectedParentToLink}
                  onChange={(e) => setSelectedParentToLink(e.target.value)}
                  required
                  className="mt-1 block w-full input-field bg-white"
                  disabled={parentUsers.length === 0 || isLoading}
                >
                  <option value="" disabled>Select a parent to link...</option>
                  {parentUsers.map((parentUser) => (
                    <option key={parentUser.id} value={String(parentUser.id)}>
                      {parentUser.name} (ID: {parentUser.id})
                    </option>
                  ))}
                  {parentUsers.length === 0 && <option disabled>No parent users available or loaded.</option>}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={closeManageParentsModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                  Close
                </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={isLoading || !selectedParentToLink}>
                  {isLoading ? 'Linking...' : 'Link Selected Parent'}
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