"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Payment, NewStudent } from '../../../fee-management/types';
import { toast } from 'react-hot-toast';
import { AcademicYear, Term, ExamSequence } from '@/app/dashboard/super-manager/academic-years/types/academic-year';
import { Class, SubClass } from '@/app/dashboard/super-manager/classes/types/class';
import useSWR from 'swr';
import apiService from '../../../../../lib/apiService';
import controlFeeService, { UnifiedPaymentRequest } from '../../../../../lib/controlFeeService';
import { useAuth } from '@/components/context/AuthContext';

// SWR fetcher using apiService with error handling
const fetcher = async (url: string) => {
  try {
    return await apiService.get(url);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      throw error;
    }
    throw error;
  }
};

// SWR fetcher for control fees
const controlFeeFetcher = async (url: string) => {
  try {
    return await controlFeeService.getAllControlFees({
      page: 1,
      limit: 100,
      ...Object.fromEntries(new URL(`http://dummy.com${url}`).searchParams)
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      throw error;
    }
    throw error;
  }
};

export const useControlFeeManagement = () => {
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Payment Form State
  const [selectedPaymentType, setSelectedPaymentType] = useState('full');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');

  // Add Student Form State
  const [newStudent, setNewStudent] = useState<NewStudent>({
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

  // Generic loading for mutations
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Payment Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  // Transactions Modal State
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedTransactionsStudent, setSelectedTransactionsStudent] = useState<Student | null>(null);

  // Subclass Summary State
  const [subclassSummary, setSubclassSummary] = useState<any>(null);
  const [isLoadingSubclassSummary, setIsLoadingSubclassSummary] = useState(false);
  const [showSubclassSummaryModal, setShowSubclassSummaryModal] = useState(false);

  // --- SWR Data Fetching ---

  // 1. Active Academic Year
  const activeAcademicYear = useMemo(() => {
    return bursarAcademicYear || null;
  }, [bursarAcademicYear]);

  const currentAcademicYear = useMemo(() => {
    return activeAcademicYear;
  }, [activeAcademicYear]);

  // 2. Fetch Classes (same as regular fees)
  const { data: classesResult, error: classesErrorSWR, isLoading: isLoadingClassesSWR } = useSWR<{ data: Class[] }>('/classes?includeSubClasses=true', fetcher);
  const classesList = useMemo(() => classesResult?.data || [], [classesResult]);

  // 3. Fetch ALL Students for PaymentModal search (separate from control fee records)
  const { data: allStudentsResult, error: allStudentsErrorSWR, isLoading: isLoadingAllStudentsSWR } = useSWR<{ data: any[] }>('/students', fetcher);
  const allStudents = useMemo(() => {
    if (!allStudentsResult?.data) return [];

    // Map raw student data to Student interface for PaymentModal compatibility
    return allStudentsResult.data.map((student: any) => ({
      id: student.id || 0,
      name: student.name || 'Unknown Student',
      matricule: student.matricule || student.admissionNumber || 'N/A',
      admissionNumber: student.matricule || student.admissionNumber || 'N/A',
      className: 'Unknown Class', // Not available in basic student data
      subClassName: 'Unknown SubClass',
      totalFees: 0,
      paidAmount: 0,
      balance: 0,
      dueDate: new Date().toISOString(),
      paymentStatus: 'Unknown',
      lastPaymentDate: null,
      transactions: [],
      feeId: null,
      enrollmentId: null,
      classId: null,
      subClassId: null
    }));
  }, [allStudentsResult]);

  // 4. Fetch Control Fee Records (using control fee service)
  const controlFeeRecordsKey = currentAcademicYear
    ? `/control-fees?academicYearId=${currentAcademicYear.id}&page=${currentPage}&limit=${itemsPerPage}${selectedClass !== 'all' ? `&classId=${selectedClass}` : ''}${selectedPaymentStatus !== 'all' ? `&paymentStatus=${selectedPaymentStatus.toLowerCase()}` : ''}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`
    : null;

  const { data: controlFeeRecordsResult, error: feeRecordsErrorSWR, isLoading: isLoadingFeeRecordsSWR } = useSWR(
    controlFeeRecordsKey,
    controlFeeFetcher
  );

  // 5. Process Control Fee Records
  const { students, totalPages } = useMemo(() => {
    if (!controlFeeRecordsResult?.data) {
      return { students: [], totalPages: 0 };
    }

    try {
      // The API response structure is { success: true, data: { data: [...], meta: {...} } }
      const records = controlFeeRecordsResult.data?.data || controlFeeRecordsResult.data;

      if (!Array.isArray(records)) {
        console.error('Records is not an array:', records);
        return { students: [], totalPages: 0 };
      }

      const processedStudents: Student[] = records.map((record: any) => ({
        // Convert numbers to strings as required by Student interface
        id: (record.enrollment?.student?.id || record.enrollmentId || 0).toString(),
        name: record.enrollment?.student?.name || 'Unknown Student',
        matricule: record.enrollment?.student?.matricule || 'N/A',
        admissionNumber: record.enrollment?.student?.matricule || 'N/A',
        className: record.enrollment?.subClass?.class?.name || 'Unknown Class',
        subClassName: record.enrollment?.subClass?.name || 'Unknown SubClass',
        totalFees: record.amountExpected || 0,
        paidAmount: record.amountPaid || 0,
        balance: (record.amountExpected || 0) - (record.amountPaid || 0),
        dueDate: record.dueDate || new Date().toISOString(),
        paymentStatus: (record.amountPaid || 0) >= (record.amountExpected || 0) ? 'Paid' :
                      (record.amountPaid || 0) > 0 ? 'Partial' : 'Unpaid',
        lastPaymentDate: record.controlPaymentTransactions?.[0]?.paymentDate || null,
        transactions: record.controlPaymentTransactions || [],
        feeId: record.id?.toString() || '',
        enrollmentId: record.enrollmentId,
        classId: record.enrollment?.subClass?.classId,
        subClassId: record.enrollment?.subClass?.id,
        // Required Student interface fields - ensuring string types
        class: record.enrollment?.subClass?.class?.name || 'Unknown Class',
        classId: record.enrollment?.subClass?.classId?.toString() || '',
        subclass: record.enrollment?.subClass?.name || 'Unknown SubClass',
        subclassId: record.enrollment?.subClass?.id?.toString() || '',
        expectedFees: record.amountExpected || 0,
        paidFees: record.amountPaid || 0,
        status: (record.amountPaid || 0) >= (record.amountExpected || 0) ? 'Paid' :
                (record.amountPaid || 0) > 0 ? 'Partial' : 'Unpaid'
      }));

      // Access meta from the correct nested structure
      const meta = controlFeeRecordsResult.data?.meta || controlFeeRecordsResult.meta;
      const total = meta?.totalPages || Math.ceil((meta?.total || processedStudents.length) / itemsPerPage);

      return {
        students: processedStudents,
        totalPages: total
      };
    } catch (error) {
      console.error('Error processing control fee records:', error);
      return { students: [], totalPages: 0 };
    }
  }, [controlFeeRecordsResult, itemsPerPage]);

  // 6. Process and sort students (filtering is done server-side)
  const processedStudents = useMemo(() => {
    if (!students.length) return [];

    let filtered = [...students];

    // Apply sorting only (filtering is done server-side)
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'balance':
          aValue = a.balance;
          bValue = b.balance;
          break;
        case 'totalFees':
          aValue = a.totalFees;
          bValue = b.totalFees;
          break;
        case 'paidAmount':
          aValue = a.paidAmount;
          bValue = b.paidAmount;
          break;
        case 'className':
          aValue = a.className.toLowerCase();
          bValue = b.className.toLowerCase();
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [students, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedPaymentStatus, searchQuery]);

  // --- Handlers ---

  const handlePayment = useCallback(async (student: Student) => {
    if (!paymentAmount || !paymentMethod) {
      toast.error('Please fill in all payment details');
      return;
    }

    setIsMutating(true);
    setMutationError(null);

    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      // Prepare unified payment data
      const unifiedPaymentData: UnifiedPaymentRequest = {
        amount,
        paymentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        paymentMethod,
        receiptNumber: `RCP${Date.now()}`, // Generate receipt number
        studentId: student.id,
        academicYearId: currentAcademicYear?.id
      };

      // Use unified control payment endpoint (auto-creates fee if needed)
      const response = await controlFeeService.recordUnifiedControlPayment(unifiedPaymentData);

      // Show appropriate success message
      if (response.data?.feeCreated) {
        toast.success('Payment recorded and control fee created successfully!');
      } else {
        toast.success('Control fee payment recorded successfully!');
      }
      setShowPaymentModal(false);

      // Reset form
      setPaymentAmount('');
      setPaymentMethod('');
      setPaymentDescription('');

      // Refresh data
      // SWR will auto-refresh due to mutate
    } catch (error: any) {
      console.error('Payment recording failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record payment';
      setMutationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsMutating(false);
    }
  }, [paymentAmount, paymentMethod, paymentDescription]);

  // Enhanced export handler
  const handleExportEnhanced = async (format: 'csv' | 'pdf' | 'xlsx' = 'csv') => {
    if (!currentAcademicYear) {
      toast.error('No academic year selected');
      return;
    }

    try {
      const params = {
        format: format,
        academicYearId: currentAcademicYear.id.toString(),
        classId: selectedClass !== 'all' ? selectedClass : '',
        paymentStatus: selectedPaymentStatus !== 'all' ? selectedPaymentStatus : '',
        search: searchQuery || '',
      };

      const blob = await controlFeeService.exportControlFees(params);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `control-fees-${format}-${Date.now()}.${format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'csv'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Control fees exported as ${format.toUpperCase()} successfully!`);
    } catch (error: any) {
      console.error(`${format.toUpperCase()} export failed:`, error);
      toast.error(`Failed to export as ${format.toUpperCase()}`);
    }
  };

  // Fetch transactions for a student
  const fetchTransactions = useCallback(async (student: Student) => {
    if (!student.feeId) return;

    setIsLoadingTransactions(true);
    try {
      const response = await controlFeeService.getControlFeePayments(student.feeId);
      setTransactions(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load payment transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  // Show transactions modal
  const showTransactions = useCallback((student: Student) => {
    setSelectedTransactionsStudent(student);
    setShowTransactionsModal(true);
    fetchTransactions(student);
  }, [fetchTransactions]);

  // Fetch subclass summary
  const handleShowSubclassSummary = useCallback(async (subClassId: string) => {
    if (!subClassId || subClassId === 'all') {
      toast.error('Please select a specific subclass');
      return;
    }

    setIsLoadingSubclassSummary(true);
    try {
      const response = await controlFeeService.getControlFeeSubclassSummary(parseInt(subClassId));
      setSubclassSummary(response.data);
      setShowSubclassSummaryModal(true);
    } catch (error: any) {
      console.error('Failed to fetch subclass summary:', error);
      toast.error('Failed to load subclass summary');
    } finally {
      setIsLoadingSubclassSummary(false);
    }
  }, []);

  // Modal handlers
  const openPaymentModal = useCallback((student: Student) => {
    setSelectedStudent(student);
    setShowPaymentModal(true);
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentDescription('');
    setMutationError(null);
  }, []);

  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    setSelectedStudent(null);
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentDescription('');
    setMutationError(null);
  }, []);

  const openStudentModal = useCallback(() => {
    setShowStudentModal(true);
    setMutationError(null);
  }, []);

  const closeStudentModal = useCallback(() => {
    setShowStudentModal(false);
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
    setMutationError(null);
  }, []);

  const closeTransactionsModal = useCallback(() => {
    setShowTransactionsModal(false);
    setSelectedTransactionsStudent(null);
    setTransactions([]);
  }, []);

  const closeSubclassSummaryModal = useCallback(() => {
    setShowSubclassSummaryModal(false);
    setSubclassSummary(null);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Loading and error states
  const isLoading = isLoadingFeeRecordsSWR || isLoadingClassesSWR;
  const error = feeRecordsErrorSWR || classesErrorSWR;

  return {
    // Data
    students: processedStudents,
    allStudents, // All students for PaymentModal search
    classesList,
    activeAcademicYear,

    // UI State
    selectedClass,
    setSelectedClass,
    selectedTerm,
    setSelectedTerm,
    selectedPaymentStatus,
    setSelectedPaymentStatus,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,

    // Pagination
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,

    // Modals
    showPaymentModal,
    showStudentModal,
    showFeeHistoryModal,
    showTransactionsModal,
    showSubclassSummaryModal,

    // Selected items
    selectedStudent,
    setSelectedStudent,
    selectedTransactionsStudent,

    // Payment form
    selectedPaymentType,
    setSelectedPaymentType,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDescription,
    setPaymentDescription,

    // Student form
    newStudent,
    setNewStudent,

    // Loading states
    isLoading,
    isMutating,
    isLoadingTransactions,
    isLoadingSubclassSummary,

    // Error states
    error,
    mutationError,

    // Data
    transactions,
    subclassSummary,

    // Handlers
    openPaymentModal,
    closePaymentModal,
    setShowPaymentModal,
    handlePayment,
    openStudentModal,
    closeStudentModal,
    showTransactions,
    closeTransactionsModal,
    closeSubclassSummaryModal,
    handleShowSubclassSummary,
    handleExportEnhanced,
  };
};