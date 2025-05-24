"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, Payment, NewStudent } from '../types';
import { toast } from 'react-hot-toast';
import { AcademicYear, Term } from '@/app/dashboard/super-manager/academic-years/types/academic-year';
import { Class, SubClass } from '@/app/dashboard/super-manager/classes/types/class';
import useSWR from 'swr'; // Import useSWR

// Add PaymentDetails type, consistent with the modal
interface PaymentDetails {
    amount: number;
    method: string;
    date: string;
    description?: string;
}

// Helper to get auth token (ensure this exists or implement it)
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'; // Ensure consistent base URL

export const useFeeManagement = () => {
  // --- UI State & Filters --- 
  const [selectedClass, setSelectedClass] = useState('all'); 
  const [selectedTerm, setSelectedTerm] = useState('all'); 
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFeeHistoryModal, setShowFeeHistoryModal] = useState(false);
  const [isSearchablePaymentModalOpen, setIsSearchablePaymentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  // Add Student Form State
  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: '',
    class: '', // Note: POST /students might not take class directly, handled via enrollment
    admissionNumber: '',
    email: '',
    parents: [], // Initialize as empty array
    dateOfBirth: '',
    gender: '',
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
    // Ensure we have a stable reference for filtering/searching later
    const rawFeeRecords = feeRecordsResult.data;
    return rawFeeRecords.map((feeRecord: any): Student => {
        const studentData = feeRecord.enrollment?.student;
        const subClassId = feeRecord.enrollment?.subClassId;
        const subClassName = findSubClassNameById(subClassId);
        const amountExpected = feeRecord.amountExpected || 0;
        const amountPaid = feeRecord.amountPaid || 0;

        // Find the latest payment date
        const latestPaymentDate = feeRecord.paymentTransactions?.length > 0
            ? feeRecord.paymentTransactions.reduce((latest: string, tx: any) =>
                tx.paymentDate > latest ? tx.paymentDate : latest,
                feeRecord.paymentTransactions[0].paymentDate)
            : undefined;

        // Determine status
        let status: Student['status'] = 'Unpaid';
        if (amountPaid >= amountExpected && amountExpected > 0) {
            status = 'Paid';
        } else if (amountPaid > 0) {
            status = 'Partial';
        }

        return {
            id: studentData?.id?.toString() || feeRecord.enrollment?.studentId?.toString() || `fee-${feeRecord.id}`, // Use student ID if available, fallback needed
            name: studentData?.name || 'Unknown Student',
            admissionNumber: studentData?.admissionNumber || studentData?.matricule || 'N/A', // Use admissionNumber, fallback matricule
            class: subClassName || feeRecord.enrollment?.subClass?.name || 'N/A', // Use mapped name, fallback direct subClass name
            expectedFees: amountExpected,
            paidFees: amountPaid,
            balance: amountExpected - amountPaid,
            status: status,
            lastPaymentDate: latestPaymentDate,
            email: studentData?.email || '',
            // Ensure parents are handled correctly, might need nested access
            parentName: studentData?.parents?.[0]?.name || '',
            parentPhone: studentData?.parents?.[0]?.phone || '',
            parentContacts: studentData?.parents || [], // Assuming parents array structure
            feeId: feeRecord.id.toString(), // Ensure feeId is string
            // Add other potential student fields if needed by UI
            dateOfBirth: studentData?.dateOfBirth,
            placeOfBirth: studentData?.placeOfBirth,
         
            photo: studentData?.photo,
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

    // Search query filter (name or admission number)
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(lowerCaseQuery) ||
        (student.admissionNumber && student.admissionNumber.toLowerCase().includes(lowerCaseQuery))
      );
    }

    // Client-side class filter (using the selectedClass which is subClassId)
    if (selectedClass !== 'all') {
      const targetSubClassId = Number(selectedClass); // Ensure comparison is number vs number if ID is number
      // This assumes feeRecordsResult.data has enrollment.subClassId
      // We need to filter based on the original data structure before mapping if student.class is just a name
       filtered = filtered.filter(student => {
           // Find the original fee record corresponding to the student
           const originalRecord = feeRecordsResult?.data.find(fr => fr.enrollment?.student?.id?.toString() === student.id || fr.enrollment?.studentId?.toString() === student.id || `fee-${fr.id}` === student.id);
           return originalRecord?.enrollment?.subClassId === targetSubClassId;
       });

       // Alternative if student.class is reliable and unique:
       // const selectedSubClassName = findSubClassNameById(selectedClass);
       // if (selectedSubClassName) { filtered = filtered.filter(student => student.class === selectedSubClassName); }
    }

    // Payment status filter
    if (selectedPaymentStatus !== 'all') {
        filtered = filtered.filter(student => student.status === selectedPaymentStatus);
    }

    // Sorting
    filtered.sort((a, b) => {
        const aValue = a[sortBy as keyof Student] as any; // Basic sort, might need refinement for specific fields
        const bValue = b[sortBy as keyof Student] as any;

        let comparison = 0;
        if (aValue > bValue) {
            comparison = 1;
        } else if (aValue < bValue) {
            comparison = -1;
        }

        return sortOrder === 'desc' ? (comparison * -1) : comparison;
    });

    return filtered;
  }, [students, searchQuery, selectedClass, sortBy, sortOrder, selectedPaymentStatus, feeRecordsResult, findSubClassNameById]); // Add feeRecordsResult dependency

  // --- Placeholder Export Handlers --- (Keep as is for now)
  const handleExport = (format: 'pdf' | 'excel') => {
    const filteredData = getFilteredStudents();
    console.log(`Exporting data as ${format.toUpperCase()}:`, JSON.stringify(filteredData, null, 2));
    toast.success(`Preparing ${format.toUpperCase()} export... (Data logged to console)`);
    // TODO: Replace console.log with actual export logic (frontend library or backend API call)
    // Example backend call structure:

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
  };

  const handleExportPDF = () => handleExport('pdf');
  const handleExportExcel = () => handleExport('excel');

  // --- Mutation Handlers (Update to use mutateFeeRecords) --- 

  const handlePayment = useCallback(async (studentId: string, paymentDetails: PaymentDetails): Promise<void> => {
    setIsMutating(true);
    setMutationError(null);
    
    // Find the student's feeId from the students array
    const studentData = students.find(s => s.id === studentId);
    const feeId = studentData?.feeId;

    if (!feeId) {
        const errorMsg = "Fee record ID not found for the selected student.";
        toast.error(errorMsg);
        setMutationError(errorMsg);
        setIsMutating(false);
        throw new Error(errorMsg); // Throw error to be caught by modal if needed
    }

    const paymentPayload = {
        amount: paymentDetails.amount,
        paymentDate: paymentDetails.date, // Use date from modal
        paymentMethod: paymentDetails.method.toUpperCase(), // Use method from modal
        description: paymentDetails.description || null, // Use description from modal
        // Add termId, academicYearId if required by the endpoint
        // termId: selectedTerm === 'all' ? undefined : Number(selectedTerm), // Example
        // academicYearId: activeAcademicYear?.id, // Example
    };

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Authentication required.");

      const url = `${API_BASE_URL}/fees/${feeId}/payments`; // Endpoint to add payment to a fee record
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
        // Use a more specific error message if available from backend
        throw new Error(errorData.message || errorData.error || `Failed to record payment: ${response.statusText}`);
      }
      
      toast.success("Payment recorded successfully!");
      await mutateFeeRecords(); // Revalidate/refetch the fee records
      // No need to close modal or reset form here, modal handles it

    } catch (error: any) {
      console.error('Error recording payment:', error);
      const errorMsg = `Failed to record payment: ${error.message}`;
      setMutationError(errorMsg);
      toast.error(errorMsg);
      throw error; // Re-throw error so modal knows it failed
    } finally {
      setIsMutating(false);
    }
  }, [students, mutateFeeRecords]); // Dependencies: students list, mutate function

  // --- Combined Create Student and Record Initial Payment --- 
  const handleCreateAndPay = async (studentWithPayment: NewStudent & { paymentAmount?: number; paymentMethod?: string; paymentDescription?: string }) => {
    setIsMutating(true);
    setMutationError(null);
    const { paymentAmount: amount, paymentMethod: method, paymentDescription: description, ...studentData } = studentWithPayment;

    // 1. Create Student
    let newStudentId: string | null = null;
    try {
        const token = getAuthToken();
        if (!token) throw new Error("Auth required");

        console.log("Creating student with payload:", studentData);

        const studentRes = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(studentData),
        });

        if (!studentRes.ok) {
            const err = await studentRes.json().catch(() => ({}));
            throw new Error(err.message || `Failed to create student: ${studentRes.statusText}`);
        }
        const studentResData = await studentRes.json();
        newStudentId = studentResData?.data?.id?.toString(); // Adjust based on actual response structure
        if (!newStudentId) {
             throw new Error("Created student but did not receive an ID.");
        }
        toast.success("Student created successfully!");

        // 2. Enroll Student (Crucial for Fee Record Creation)
        // Assuming enrollment happens automatically or needs a separate call
        // If enrollment needs data like subClassId, academicYearId, termId, fetch/select them
        const targetSubClassId = classesList.flatMap(c => c.subClasses).find(sc => sc?.name === studentData.class)?.id;
        const targetTermId = termsList.find(t => t.name === selectedTerm)?.id; // Or determine based on current date/settings

        if (!targetSubClassId || !activeAcademicYear?.id) {
             console.warn("Cannot auto-enroll: Missing SubClass ID or Active Academic Year ID.");
             // Potentially skip payment or require manual enrollment/fee setup
        } else {
            const enrollmentPayload = {
                studentId: newStudentId,
                subClassId: targetSubClassId,
                academicYearId: activeAcademicYear.id,
                // termId: targetTermId, // Include if necessary for fee generation
                enrollmentDate: new Date().toISOString().split('T')[0],
                status: 'ACTIVE', // Or appropriate status
            };

            console.log("Enrolling student with payload:", enrollmentPayload);
            const enrollRes = await fetch(`${API_BASE_URL}/enrollments`, { // Adjust endpoint if needed
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(enrollmentPayload),
            });

             if (!enrollRes.ok) {
                const err = await enrollRes.json().catch(() => ({}));
                console.error("Enrollment failed:", err.message || enrollRes.statusText);
                toast.error(`Student created, but enrollment failed: ${err.message || enrollRes.statusText}`);
                // Decide how to proceed - maybe stop payment?
             } else {
                 toast.success("Student enrolled successfully!");
             }
        }


        // 3. Refresh Fee Records to get the new feeId
        await mutateFeeRecords(); // Wait for refetch

        // Delay slightly to allow SWR update propagation? Unreliable.
        // A better approach: The POST /payments endpoint should perhaps accept studentId + termId + yearId
        // OR the enroll endpoint should return the newly created feeId.
        // Workaround: Find the feeId after mutation.
        let newlyCreatedFeeId: string | null = null;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay - IMPROVE THIS
        const updatedFeeRecords = await mutateFeeRecords(); // Get updated data
        const newFeeRecord = updatedFeeRecords?.data?.find((fr: any) => fr.enrollment?.studentId?.toString() === newStudentId);
        newlyCreatedFeeId = newFeeRecord?.id?.toString();

        if (!newlyCreatedFeeId) {
             console.warn("Could not find Fee ID for the newly created student after enrollment. Skipping payment.");
             toast("Student created and enrolled, but could not find fee record to apply payment.");
        } else if (amount && amount > 0 && method) {
            // 4. Record Payment using the new feeId
            console.log(`Proceeding to payment for feeId: ${newlyCreatedFeeId}`);
            const paymentDetails: PaymentDetails = {
                amount: amount,
                method: method,
                date: new Date().toISOString().split('T')[0],
                description: description || `Initial payment for ${studentData.name}`,
            };

             // Directly call the payment logic part
            const paymentPayload = {
                amount: paymentDetails.amount,
                paymentDate: paymentDetails.date,
                paymentMethod: paymentDetails.method.toUpperCase(),
                description: paymentDetails.description || null,
            };

             const paymentUrl = `${API_BASE_URL}/fees/${newlyCreatedFeeId}/payments`;
             const paymentRes = await fetch(paymentUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(paymentPayload),
             });

             if (!paymentRes.ok) {
                 const err = await paymentRes.json().catch(() => ({}));
                 throw new Error(err.message || `Student created/enrolled, but payment failed: ${paymentRes.statusText}`);
             }
             toast.success("Initial payment recorded successfully!");
        }

        resetStudentForm();
        setShowStudentModal(false);
        await mutateFeeRecords(); // Final refresh

    } catch (error: any) {
        console.error("Error in handleCreateAndPay:", error);
        const errorMsg = `Operation failed: ${error.message}`;
        setMutationError(errorMsg);
        toast.error(errorMsg);
        // Decide if modal should stay open on error
    } finally {
        setIsMutating(false);
    }
  };

  const resetStudentForm = () => {
    setNewStudent({
      name: '',
      class: '',
      admissionNumber: '',
      email: '',
        parents: [],
      dateOfBirth: '', 
      gender: '',
      placeOfBirth: '',
      residence: '',
      former_school: '',
      phone: ''
    });
  };

  return {
    selectedClass,
    setSelectedClass,
    selectedTerm,
    setSelectedTerm,
    selectedPaymentStatus,
    setSelectedPaymentStatus,
    showStudentModal,
    setShowStudentModal,
    showFeeHistoryModal,
    setShowFeeHistoryModal,
    isSearchablePaymentModalOpen,
    setIsSearchablePaymentModalOpen,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    students,
    getFilteredStudents,
    handlePayment,
    handleCreateAndPay,
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
    resetStudentForm,
    isMutating,
    mutationError,
  };
};