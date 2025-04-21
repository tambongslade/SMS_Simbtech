"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Payment, NewStudent } from '../types';
import { toast } from 'react-hot-toast';
import { AcademicYear, Term } from '@/app/dashboard/super-manager/academic-years/types/academic-year';
import { Class, SubClass } from '@/app/dashboard/super-manager/classes/types/class';
import useSWR from 'swr'; // Import useSWR

// Helper to get auth token (ensure this exists or implement it)
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'; // Ensure consistent base URL

export const useFeeManagement = () => {
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
  const [paymentMethod, setPaymentMethod] = useState('cash');
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

  // --- SWR Data Fetching --- 

  // 1. Fetch Active Academic Year
  const { data: activeYearResult, error: activeYearErrorSWR } = useSWR< { data: AcademicYear[] } > (`${API_BASE_URL}/academic-years?isActive=true`);
  const activeAcademicYear = useMemo(() => activeYearResult?.data?.[0] || null, [activeYearResult]);
  const termsList: Term[] = useMemo(() => activeAcademicYear?.terms || [], [activeAcademicYear]);

  // 2. Fetch Classes 
  const { data: classesResult, error: classesErrorSWR, isLoading: isLoadingClassesSWR } = useSWR< { data: Class[] } > (`${API_BASE_URL}/classes?includeSubClasses=true`);
  const classesList = useMemo(() => classesResult?.data || [], [classesResult]);

  // 3. Fetch Fee Records (Dependent on Active Year and Filters)
  const feeRecordsKey = activeAcademicYear 
    ? `${API_BASE_URL}/fees?academicYearId=${activeAcademicYear.id}&include=enrollment.student,enrollment.subClass,paymentTransactions${selectedClass !== 'all' ? `&subClassId=${selectedClass}` : ''}${selectedTerm !== 'all' ? `&termId=${selectedTerm}` : ''}`
    : null; 

  const { 
    data: feeRecordsResult, 
    error: feeRecordsErrorSWR,
    isLoading: isLoadingFeeRecordsSWR,
    mutate: mutateFeeRecords 
  } = useSWR< { data: any[] } >(feeRecordsKey);

  // Helper to find subclass name (needed for mapping)
  const findSubClassNameById = useCallback((subClassId: number | string | undefined): string | undefined => {
    if (!subClassId || !classesList) return undefined;
    for (const cls of classesList) {
        const subClass = cls.subClasses?.find(sc => sc.id === Number(subClassId));
        if (subClass) return subClass.name;
    }
    return undefined;
  }, [classesList]);

  // Process Fee Records Data
  const students = useMemo((): Student[] => {
    if (!feeRecordsResult?.data) return [];
    return feeRecordsResult.data.map((feeRecord: any): Student => {
        const studentData = feeRecord.enrollment?.student;
        const subClassId = feeRecord.enrollment?.subClassId;
        const subClassName = findSubClassNameById(subClassId);
        return {
            id: studentData?.id?.toString() || feeRecord.id.toString(),
            name: studentData?.name || 'Unknown Student',
            admissionNumber: studentData?.matricule || 'N/A',
            class: subClassName || 'N/A',
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
  }, [feeRecordsResult, findSubClassNameById]);

  // --- Consolidated Loading and Error State --- 
  const isLoading = isLoadingClassesSWR || isLoadingFeeRecordsSWR || (!activeAcademicYear && !activeYearErrorSWR); 
  const fetchError = useMemo(() => {
      if (activeYearErrorSWR) return `Failed to load active year: ${activeYearErrorSWR.message}`;
      if (classesErrorSWR) return `Failed to load classes: ${classesErrorSWR.message}`;
      if (feeRecordsErrorSWR) return `Failed to load fee records: ${feeRecordsErrorSWR.message}`;
      return null;
  }, [activeYearErrorSWR, classesErrorSWR, feeRecordsErrorSWR]);

  useEffect(() => {
    if (fetchError) {
      toast.error(fetchError);
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
    // Client-side class filter (might be redundant if API filters perfectly)
    if (selectedClass !== 'all') {
        const selectedSubClassName = findSubClassNameById(selectedClass);
        if (selectedSubClassName) { filtered = filtered.filter(student => student.class === selectedSubClassName); }
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
  }, [students, searchQuery, selectedClass, sortBy, sortOrder, selectedPaymentStatus, findSubClassNameById]);

  // --- Placeholder Export Handlers --- (Keep as is for now)
  const handleExport = (format: 'pdf' | 'excel') => {
    const filteredData = getFilteredStudents();
    console.log(`Exporting data as ${format.toUpperCase()}:`, JSON.stringify(filteredData, null, 2));
    toast.success(`Preparing ${format.toUpperCase()} export... (Data logged to console)`);
    // TODO: Replace console.log with actual export logic (frontend library or backend API call)
    // Example backend call structure:
    /*
    const token = getAuthToken();
    if (!token) { toast.error("Auth required"); return; }
    const params = new URLSearchParams({
      format: format,
      academicYearId: activeAcademicYear?.id?.toString() || '',
      subClassId: selectedClass === 'all' ? '' : selectedClass,
      termId: selectedTerm === 'all' ? '' : selectedTerm,
      status: selectedPaymentStatus === 'all' ? '' : selectedPaymentStatus,
      search: searchQuery,
      // Add other filters/sorting if needed by backend
    });
    window.open(`${API_BASE_URL}/fees/export?${params.toString()}`, '_blank');
    */
  };

  const handleExportPDF = () => handleExport('pdf');
  const handleExportExcel = () => handleExport('excel');

  // --- Mutation Handlers (Update to use mutateFeeRecords) --- 

  const handlePayment = async () => {
    if (!selectedStudent || !paymentAmount) return;
    setIsMutating(true);
    setMutationError(null);
    
    const amount = parseFloat(paymentAmount);
    const feeId = selectedStudent.feeId; 
    if (!feeId) {
        toast.error("Fee ID not found for the selected student.");
        setMutationError("Fee ID missing, cannot record payment.");
        setIsMutating(false);
        return;
    }

    const paymentPayload = {
        amount: amount,
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethod.toUpperCase(),
        description: paymentDescription || null,
    };

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required.");

      const url = `${API_BASE_URL}/fees/${feeId}/payments`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to record payment: ${response.statusText}`);
      }
      
      toast.success("Payment recorded successfully!");
      resetPaymentForm();
      setShowPaymentModal(false);
      mutateFeeRecords(); // Revalidate/refetch the fee records
    } catch (error: any) {
      console.error('Error recording payment:', error);
      const errorMsg = `Failed to record payment: ${error.message}`;
      setMutationError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsMutating(false);
    }
  };

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentDescription('');
    setSelectedPaymentType('full');
  };

  // --- Re-added Student Form Reset ---
  const resetStudentForm = () => {
    setNewStudent({
      name: '',
      class: '',
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
  };

  // --- Re-implemented Add Student Handler ---
  const handleAddStudent = async (studentFormData: NewStudent) => { 
    setIsMutating(true);
    setMutationError(null);

    // Construct payload based on NewStudent type and expected API fields
    // Ensure optional fields are handled (send null or omit if empty)
    const studentPayload = {
        name: studentFormData.name,
        email: studentFormData.email || null,
        phone: studentFormData.phone || null, // Student phone
        matricule: studentFormData.admissionNumber || null,
        gender: studentFormData.gender || null,
        // Assuming API expects dateOfBirth, placeOfBirth, residence, former_school
        dateOfBirth: studentFormData.dateOfBirth || null,
        placeOfBirth: studentFormData.placeOfBirth || null,
        residence: studentFormData.residence || null,
        former_school: studentFormData.former_school || null,
        // Parent info might need separate handling/API calls depending on backend
        // parentName: studentFormData.parentName, 
        // parentPhone: studentFormData.parentPhone,
    };

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required.");

      const url = `${API_BASE_URL}/students`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentPayload),
      });

      if (!response.ok) {
        let errorMsg = `Failed to add student: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (_) { /* Ignore parsing error */ }
        throw new Error(errorMsg);
      }

      toast.success("Student created successfully!");
      setShowStudentModal(false);
      resetStudentForm();
      return await response.json(); // Return new student data if needed by caller
    } catch (error: any) {
      console.error('Error adding student:', error);
      const errorMsg = `Failed to add student: ${error.message}`;
      setMutationError(errorMsg);
      toast.error(errorMsg);
      throw error; // Re-throw error so caller knows it failed
    } finally {
      setIsMutating(false);
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
    classesList,
    isLoadingClasses: isLoadingClassesSWR,
    termsList,
    activeAcademicYear,
    newStudent,
    setNewStudent,
    resetPaymentForm,
    resetStudentForm,
    isMutating,
    mutationError,
  };
};