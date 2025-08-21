"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Payment, NewStudent } from '../types';
import { toast } from 'react-hot-toast';
import { AcademicYear, Term, ExamSequence } from '@/app/dashboard/super-manager/academic-years/types/academic-year';
import { Class, SubClass } from '@/app/dashboard/super-manager/classes/types/class';
import useSWR from 'swr';
import apiService from '../../../../../lib/apiService'; // Import apiService
import { useAuth } from '@/components/context/AuthContext';

// API Configuration - REMOVED
// const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

// SWR fetcher using apiService with error handling
const fetcher = async (url: string) => {
  try {
    return await apiService.get(url);
  } catch (error: any) {
    // If it's an unauthorized error, don't retry
    if (error.message === 'Unauthorized') {
      throw error;
    }
    throw error;
  }
};

export const useFeeManagement = () => {
  const { selectedAcademicYear: bursarAcademicYear } = useAuth();
  // --- UI State & Filters --- 
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFeeHistoryModal, setShowFeeHistoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Payment Form State
  const [selectedPaymentType, setSelectedPaymentType] = useState('full');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  // Add Student Form State
  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: '',
    class: '', // Note: POST /students might not take class directly, handled via enrollment
    admissionNumber: '',
    email: '',
    parentName: '',
    parentPhone: '',
    // Fields matching the updated NewStudent type
    gender: '',
    dateOfBirth: '',
    placeOfBirth: '',
    residence: '',
    former_school: '',
    phone: ''
  });
  // Generic loading for mutations (add/pay)
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null); // Separate state for mutation errors
  // --- Payment Transactions State and Fetcher ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  // --- Transactions Modal State ---
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedTransactionsStudent, setSelectedTransactionsStudent] = useState<Student | null>(null);
  // --- Subclass Fees Summary State ---
  const [subclassSummary, setSubclassSummary] = useState<any>(null);
  const [isLoadingSubclassSummary, setIsLoadingSubclassSummary] = useState(false);
  const [showSubclassSummaryModal, setShowSubclassSummaryModal] = useState(false);

  // --- SWR Data Fetching --- 

  // 1. Fetch Active Academic Year
  const activeAcademicYear = useMemo(() => {
    return bursarAcademicYear || null;
  }, [bursarAcademicYear]);

  // 2. Determine current academic year for filtering
  const currentAcademicYear = useMemo(() => {
    return activeAcademicYear;
  }, [activeAcademicYear]);

  // 3. Fetch Classes 
  const { data: classesResult, error: classesErrorSWR, isLoading: isLoadingClassesSWR } = useSWR<{ data: Class[] }>('/classes?includeSubClasses=true', fetcher);
  const classesList = useMemo(() => classesResult?.data || [], [classesResult]);

  // 4. Fetch Fee Records (Dependent on Current Academic Year and Filters)
  const feeRecordsKey = currentAcademicYear
    ? `/fees?academicYearId=${currentAcademicYear.id}&page=1&limit=100${selectedClass !== 'all' ? `&classId=${selectedClass}` : ''}${selectedPaymentStatus !== 'all' ? `&paymentStatus=${selectedPaymentStatus.toLowerCase()}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`
    : null;

  const {
    data: feeRecordsResult,
    error: feeRecordsErrorSWR,
    isLoading: isLoadingFeeRecordsSWR,
    mutate: mutateFeeRecords
  } = useSWR<{ data: { data: any[], meta?: any } }>(feeRecordsKey, fetcher);

  // Helper to find class name by id
  const findClassNameById = useCallback((classId: number | string | undefined): string | undefined => {
    if (!classId || !classesList) return undefined;
    const found = classesList.find(c => c.id === Number(classId));
    return found?.name;
  }, [classesList]);

  // Process Fee Records Data
  const students = useMemo((): Student[] => {
    // Fix: API returns { success: true, data: { data: [...], meta: {...} } }
    // So we need to access the nested data.data property
    const records = feeRecordsResult?.data?.data;
    if (!Array.isArray(records)) return [];

    return records.map((feeRecord: any): Student => {
      const studentData = feeRecord.enrollment?.student;
      const classId = feeRecord.enrollment?.classId;
      const className = feeRecord.enrollment?.class?.name || findClassNameById(classId) || 'N/A';
      const subclassId = feeRecord.enrollment?.subClassId;
      const subclassName = feeRecord.enrollment?.subClass?.name;
      
      return {
        id: studentData?.id?.toString() || feeRecord.id.toString(),
        name: studentData?.name || 'Unknown Student',
        admissionNumber: studentData?.matricule || 'N/A',
        class: className,
        classId: classId ? String(classId) : undefined,
        subclass: subclassName,
        subclassId: subclassId ? String(subclassId) : undefined,
        expectedFees: feeRecord.amountExpected || 0,
        paidFees: feeRecord.amountPaid || 0,
        balance: (feeRecord.amountExpected || 0) - (feeRecord.amountPaid || 0),
        status: (feeRecord.amountPaid || 0) >= (feeRecord.amountExpected || 0) ? 'Paid' : (feeRecord.amountPaid || 0) > 0 ? 'Partial' : 'Unpaid',
        lastPaymentDate: feeRecord.paymentTransactions?.length > 0
          ? feeRecord.paymentTransactions.reduce((latest: string, tx: any) =>
            tx.paymentDate > latest ? tx.paymentDate : latest,
            feeRecord.paymentTransactions[0].paymentDate)
          : undefined,
        email: studentData?.email || '',
        parentName: studentData?.parent?.name || '',
        parentPhone: studentData?.parent?.phone || '',
        parentContacts: studentData?.parentContacts || [],
        feeId: feeRecord.id,
      };
    });
  }, [feeRecordsResult, findClassNameById]);

  // --- Consolidated Loading and Error State --- 
  const isLoading = isLoadingClassesSWR || isLoadingFeeRecordsSWR || !currentAcademicYear;
  const fetchError = useMemo(() => {
    if (!bursarAcademicYear) return `No academic year selected for Bursar.`;
    if (classesErrorSWR) return `Failed to load classes: ${classesErrorSWR.message}`;
    if (feeRecordsErrorSWR) return `Failed to load fee records: ${feeRecordsErrorSWR.message}`;
    return null;
  }, [bursarAcademicYear, classesErrorSWR, feeRecordsErrorSWR]);

  useEffect(() => {
    if (fetchError) {
      // apiService will handle 401, SWR will handle other errors. Toast general error here.
      if (!fetchError.includes('Unauthorized')) { // Avoid double toast for 401
        toast.error(fetchError);
      }
    }
  }, [fetchError]);

  // --- Filtering (Client-side) --- 
  const getFilteredStudents = useCallback(() => {
    let filtered = [...students]; // Filter the memoized students state
    // Existing search query filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Client-side class filter by classId
    if (selectedClass !== 'all') {
      filtered = filtered.filter(student => student.classId === String(selectedClass));
    }
    // Payment status filter
    if (selectedPaymentStatus !== 'all') { filtered = filtered.filter(student => student.status === selectedPaymentStatus); }
    // Sorting
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Student];
      const bValue = b[sortBy as keyof Student];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return filtered;
  }, [students, searchQuery, selectedClass, sortBy, sortOrder, selectedPaymentStatus]);

  // --- Placeholder Export Handlers --- (Keep as is for now)
  const handleExport = async (format: 'pdf' | 'excel') => {
    const filteredData = getFilteredStudents();
    console.log(`Exporting data as ${format.toUpperCase()}:`, JSON.stringify(filteredData, null, 2));

    const params = new URLSearchParams({
      format: format,
      academicYearId: activeAcademicYear?.id?.toString() || '',
      classId: selectedClass === 'all' ? '' : selectedClass,
      termId: selectedTerm === 'all' ? '' : selectedTerm,
      status: selectedPaymentStatus === 'all' ? '' : selectedPaymentStatus,
      search: searchQuery,
    });
    const exportUrl = `/fees/export?${params.toString()}`;

    try {
      toast.loading(`Preparing ${format.toUpperCase()} export...`, { id: 'export-toast' });
      // Assuming the export endpoint initiates a download and returns a success/error message or a blob
      const response = await apiService.get(exportUrl, {}, 'blob');

      const downloadUrl = window.URL.createObjectURL(response); // response is already a Blob
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = `fees_export_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`${format.toUpperCase()} export downloaded.`, { id: 'export-toast' });

    } catch (error: any) {
      console.error(`Export failed for ${format}:`, error);
      toast.error(`Export failed: ${error.message || 'Please try again.'}`, { id: 'export-toast' });
    }
  };

  const handleExportPDF = () => handleExport('pdf');
  const handleExportExcel = () => handleExport('excel');

  // --- Mutation Handlers (Update to use mutateFeeRecords) --- 

  const handlePayment = async () => {
    if (!selectedStudent || !currentAcademicYear) {
      toast.error("No student selected or academic year not determined.");
      return;
    }

    setIsMutating(true);
    setMutationError(null);
    const paymentData = {
      amount: parseFloat(paymentAmount),
      paymentDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      receiptNumber: `RCP${Date.now()}`, // Generate receipt number
      paymentMethod,
      studentId: selectedStudent.id,
      academicYearId: currentAcademicYear.id,
    };

    try {
      const response = await apiService.post(`/fees/${selectedStudent.feeId}/payments`, paymentData);
      toast.success("Payment recorded successfully!");
      mutateFeeRecords(); // Revalidate fee records after payment
      resetPaymentForm();
      setShowPaymentModal(false);
    } catch (error: any) {
      console.error('Error recording payment:', error);
      setMutationError(error.message || "Failed to record payment.");
      toast.error(error.message || "Failed to record payment.");
    } finally {
      setIsMutating(false);
    }
  };

  const resetPaymentForm = () => {
    setSelectedPaymentType('full');
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentDescription('');
  };

  const resetStudentForm = () => {
    setNewStudent({
      name: '',
      class: '',
      admissionNumber: '',
      email: '',
      parentName: '',
      parentPhone: '',
      gender: '',
      dateOfBirth: '',
      placeOfBirth: '',
      residence: '',
      former_school: '',
      phone: ''
    });
  };

  const handleAddStudent = async (studentFormData: NewStudent) => {
    setIsMutating(true);
    setMutationError(null);
    try {
      const studentResponse = await apiService.post('/students', {
        name: studentFormData.name,
        email: studentFormData.email,
        admissionNumber: studentFormData.admissionNumber,
        gender: studentFormData.gender,
        dateOfBirth: studentFormData.dateOfBirth,
        placeOfBirth: studentFormData.placeOfBirth,
        residence: studentFormData.residence,
        former_school: studentFormData.former_school,
        phone: studentFormData.phone,
        // Parent details are handled separately by the backend upon student creation
        parent: {
          name: studentFormData.parentName,
          phone: studentFormData.parentPhone,
        }
      });

      const newStudentId = studentResponse.data.id; // Assuming API returns the new student's ID
      toast.success("Student added successfully!");

      // Attempt to enroll student if class is provided
      if (studentFormData.class && newStudentId && currentAcademicYear) {
        await apiService.post(`/students/${newStudentId}/enroll`, {
          subClassId: studentFormData.class, // This should be the subClassId
          academicYearId: currentAcademicYear.id, // Use the current academic year
        });
        toast.success("Student enrolled successfully!");
      }
      mutateFeeRecords(); // Revalidate fee records
      setShowStudentModal(false);
      resetStudentForm();
    } catch (error: any) {
      console.error('Error adding student:', error);
      setMutationError(error.message || "Failed to add student.");
      toast.error(error.message || "Failed to add student.");
    } finally {
      setIsMutating(false);
    }
  };

  const fetchFeeTransactions = async (feeId: number | string) => {
    setIsLoadingTransactions(true);
    try {
      const response = await apiService.get(`/fees/${feeId}/payments`);
      setTransactions(response.data);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to fetch transactions.");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchSubclassSummary = async (subClassId: number | string) => {
    setIsLoadingSubclassSummary(true);
    try {
      const response = await apiService.get(`/fees/summary/sub-class/${subClassId}`);
      setSubclassSummary(response.data);
    } catch (error: any) {
      console.error("Error fetching subclass summary:", error);
      toast.error("Failed to fetch subclass summary.");
    } finally {
      setIsLoadingSubclassSummary(false);
    }
  };

  const handleExportEnhanced = async (format: 'csv' | 'pdf' | 'docx' = 'csv') => {
    const params = new URLSearchParams({
      format: format,
      academicYearId: activeAcademicYear?.id?.toString() || '',
      subClassId: selectedClass === 'all' ? '' : selectedClass,
      termId: selectedTerm === 'all' ? '' : selectedTerm,
      status: selectedPaymentStatus === 'all' ? '' : selectedPaymentStatus,
      search: searchQuery,
    });
    const exportUrl = `/fees/export-enhanced?${params.toString()}`;

    try {
      toast.loading(`Preparing ${format.toUpperCase()} export...`, { id: 'export-enhanced-toast' });
      const response = await apiService.get(exportUrl, {}, 'blob');

      const downloadUrl = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const filename = `fees_export_enhanced_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(`${format.toUpperCase()} export downloaded.`, { id: 'export-enhanced-toast' });
    } catch (error: any) {
      console.error(`Enhanced export failed for ${format}:`, error);
      toast.error(`Enhanced export failed: ${error.message || 'Please try again.'}`, { id: 'export-enhanced-toast' });
    }
  };

  return {
    selectedClass,
    setSelectedClass,
    selectedTerm,
    setSelectedTerm,
    selectedPaymentStatus,
    setSelectedPaymentStatus,
    showPaymentModal,
    setShowPaymentModal,
    showStudentModal,
    setShowStudentModal,
    showFeeHistoryModal,
    setShowFeeHistoryModal,
    searchQuery,
    setSearchQuery,
    selectedStudent,
    setSelectedStudent,
    selectedPaymentType,
    setSelectedPaymentType,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDescription,
    setPaymentDescription,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    students,
    getFilteredStudents,
    handlePayment,
    handleAddStudent,
    handleExportPDF,
    handleExportExcel,
    isLoading,
    fetchError,
    newStudent,
    setNewStudent,
    resetPaymentForm,
    resetStudentForm,
    classesList,
    isLoadingClasses: isLoadingClassesSWR,
    showTransactionsModal,
    setShowTransactionsModal,
    selectedTransactionsStudent,
    setSelectedTransactionsStudent,
    transactions,
    isLoadingTransactions,
    fetchFeeTransactions,
    handleExportEnhanced,
    subclassSummary,
    isLoadingSubclassSummary,
    fetchSubclassSummary,
    showSubclassSummaryModal,
    setShowSubclassSummaryModal,
    activeAcademicYear,
    currentAcademicYear,
  };
};