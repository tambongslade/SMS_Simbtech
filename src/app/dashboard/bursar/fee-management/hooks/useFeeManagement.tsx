"use client";

import { useState, useEffect, useCallback } from 'react';
import { Student, Payment, NewStudent } from '../types';
import { toast } from 'react-hot-toast';

// Helper to get auth token (ensure this exists or implement it)
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'; // Ensure consistent base URL

export const useFeeManagement = () => {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('2023-2024-2');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showFeeHistoryModal, setShowFeeHistoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState('full');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- Re-added State for Adding Students ---
  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: '',
    class: '', // Note: POST /students might not take class directly
    admissionNumber: '', // Map to 'matricule' if needed by API
    email: '', 
    parentName: '', // API might expect parent linkage separately
    parentPhone: '', // API might expect parent linkage separately
    // Add other fields required by POST /students (gender, dob, etc.)
    gender: '', 
    date_of_birth: '', 
    place_of_birth: '', 
    residence: '', 
    former_school: '', 
    phone: '' // Assuming student phone
  });

  // Fetch REAL students (Fee Records)
  useEffect(() => {
    const loadFeeRecords = async () => {
      setIsLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required.");
        toast.error("Authentication required.");
        setIsLoading(false);
        return;
      }

      try {
        // Construct API URL - Adapt query params as needed (pagination, current year/term filter)
        const currentAcademicYearId = 4; // TODO: Get current/active academic year ID dynamically
        const url = `${API_BASE_URL}/fees?academicYearId=${currentAcademicYearId}&include=enrollment.student`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch fee records: ${response.statusText}`);
        }

        const result = await response.json();
        
        // **IMPORTANT MAPPING STEP:**
        // The API returns FeeRecord[]. We need to map this to the Student[] type the frontend expects.
        // This mapping depends heavily on the actual structure of the FeeRecord and the required fields in the Student type.
        // Placeholder mapping - ADJUST THIS CAREFULLY based on actual API response and Student type!
        const mappedStudents: Student[] = (result.data || []).map((feeRecord: any) => ({
          // Assuming FeeRecord has enrollment.student nested
          id: feeRecord.enrollment?.student?.id?.toString() || feeRecord.id.toString(), // Use student ID if available, fallback to fee ID?
          name: feeRecord.enrollment?.student?.name || 'Unknown Student',
          admissionNumber: feeRecord.enrollment?.student?.matricule || 'N/A',
          // Assuming FeeRecord has class info somewhere or student has current class
          class: feeRecord.enrollment?.subClass?.name || 'N/A', 
          expectedFees: feeRecord.amountExpected || 0,
          paidFees: feeRecord.amountPaid || 0,
          balance: (feeRecord.amountExpected || 0) - (feeRecord.amountPaid || 0),
          // Calculate status based on amounts
          status: (feeRecord.amountPaid || 0) >= (feeRecord.amountExpected || 0) ? 'Paid' : (feeRecord.amountPaid || 0) > 0 ? 'Partial' : 'Unpaid',
          // Get latest payment date if available (assuming payments are nested in fee record)
          lastPaymentDate: feeRecord.paymentTransactions?.sort((a:any, b:any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]?.paymentDate || new Date(0).toISOString(), // Default if no payments
          // These fields might not be directly available in FeeRecord, adjust Student type or mapping
          email: feeRecord.enrollment?.student?.email || '', 
          parentName: feeRecord.enrollment?.student?.parentName || '', // Assuming parent info is nested in student
          parentPhone: feeRecord.enrollment?.student?.parentPhone || '', 
          parentContacts: feeRecord.enrollment?.student?.parentContacts || [],
          // *** Add the feeId to the mapped object! ***
          feeId: feeRecord.id 
        }));

        setStudents(mappedStudents);

      } catch (error: any) {
        console.error('Error fetching fee records:', error);
        setError(error.message || 'Failed to load fee data.');
        toast.error(error.message || 'Failed to load fee data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadFeeRecords();
  }, []); // Add dependencies if filters (like academicYearId) change

  const getFilteredStudents = useCallback(() => {
    let filtered = [...students];

    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedClass !== 'all') {
      filtered = filtered.filter(student => student.class === selectedClass);
    }

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
  }, [students, searchQuery, selectedClass, sortBy, sortOrder]);

  const handlePayment = async () => {
    if (!selectedStudent || !paymentAmount) return;

    setIsLoading(true);
    
    const amount = parseFloat(paymentAmount);
    
    // Get the feeId from the selected student (assuming it was added during mapping)
    const feeId = selectedStudent.feeId; 
    if (!feeId) {
        toast.error("Fee ID not found for the selected student.");
        setError("Fee ID missing, cannot record payment.");
        setIsLoading(false);
        return;
    }

    // Map frontend paymentMethod to API expected values (example)
    const apiPaymentMethod = paymentMethod.toUpperCase(); // e.g., 'cash' -> 'CASH'

    const paymentPayload = {
        amount: amount,
        paymentDate: new Date().toISOString(), // Use current date/time
        paymentMethod: apiPaymentMethod,
        description: paymentDescription || null, // Ensure null if empty
        // receiptNumber is likely generated by the backend, omit from request
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
        const errorData = await response.json().catch(() => ({})); // Try to parse error
        throw new Error(errorData.error || `Failed to record payment: ${response.statusText}`);
      }
      
      // Successful payment - refetch data instead of updating locally
      toast.success("Payment recorded successfully!");
      resetPaymentForm();
      setShowPaymentModal(false);
      setError(null);
      
      // Trigger a re-fetch of the fee records to show updated data
      // This assumes loadFeeRecords is accessible or we wrap the fetch logic in a callable function
      // For simplicity here, we might reload the page or refactor fetch logic for better UX
      window.location.reload(); // Simple reload - consider refactoring fetch logic for better UX

    } catch (error: any) {
      console.error('Error recording payment:', error);
      setError(`Failed to record payment: ${error.message}`);
      toast.error(`Failed to record payment: ${error.message}`);
    } finally {
      setIsLoading(false);
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
      gender: '', 
      date_of_birth: '', 
      place_of_birth: '', 
      residence: '', 
      former_school: '', 
      phone: ''
    });
  };

  // --- Re-implemented Add Student Handler ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // ** WARNING: API-DOCUMENTATION.md states Bursar cannot POST /students **
    // ** This will likely fail unless backend permissions are updated. **

    // Map frontend state (NewStudent type) to the payload expected by POST /students
    // Adjust fields based on the exact API requirements (e.g., admissionNumber -> matricule?)
    const studentPayload = {
        name: newStudent.name,
        email: newStudent.email || null,
        phone: newStudent.phone || null, 
        matricule: newStudent.admissionNumber || null,
        gender: newStudent.gender || null,
        date_of_birth: newStudent.date_of_birth || null,
        place_of_birth: newStudent.place_of_birth || null,
        residence: newStudent.residence || null,
        former_school: newStudent.former_school || null,
        // Note: Class, Parent info likely handled by separate API calls (e.g., POST /students/:id/enroll, POST /students/:id/parents)
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
        // Attempt to parse error message from backend
        let errorMsg = `Failed to add student: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
        } catch (_) { /* Ignore parsing error */ }
        // Provide specific feedback for permission errors if possible
        if (response.status === 403) {
            errorMsg = "Permission denied. Bursars may not be allowed to create students.";
        }
        throw new Error(errorMsg);
      }

      // If successful (assuming permissions are granted)
      toast.success("Student created successfully! Enrollment and fee setup may be required separately.");
      setShowStudentModal(false); // Close modal
      resetStudentForm(); // Reset form
      
      // Refresh data - simple reload for now
      window.location.reload(); 

    } catch (error: any) {
      console.error('Error adding student:', error);
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    selectedClass,
    setSelectedClass,
    selectedTerm,
    setSelectedTerm,
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
    isLoading,
    error,
    newStudent,
    setNewStudent,
    resetPaymentForm,
    resetStudentForm
  };
};