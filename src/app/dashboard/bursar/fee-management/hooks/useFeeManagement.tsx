"use client";

import { useState, useEffect, useCallback } from 'react';
import { Student, Payment, NewStudent } from '../types';
import { fetchStudents, addStudent, recordPayment } from '../services/mockApi';

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
  const [newStudent, setNewStudent] = useState<NewStudent>({
    name: '',
    class: '',
    admissionNumber: '',
    email: '',
    parentName: '',
    parentPhone: '',
  });

  useEffect(() => {
    // Fetch students from mock API
    const loadStudents = async () => {
      setIsLoading(true);
      try {
        const data = await fetchStudents();
        setStudents(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load students. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadStudents();
  }, []);

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
    
    const payment: Payment = {
      id: `PAY${Date.now()}`,
      studentId: selectedStudent.id,
      amount: amount,
      date: new Date().toISOString(),
      paymentMethod,
      receiptNumber: `REC${Date.now()}`,
      term: selectedTerm,
      academicYear: selectedTerm.split('-').slice(0, 2).join('-'),
      description: paymentDescription,
      semester: 1,
    };

    try {
      // Use mock API instead of fetch
      await recordPayment(payment);
      
      // Update the student's payment info locally
      const updatedStudents = students.map(student =>
        student.id === selectedStudent.id
          ? {
              ...student,
              paidFees: student.paidFees + amount,
              balance: student.expectedFees - (student.paidFees + amount),
              lastPaymentDate: new Date().toISOString(),
              status: student.expectedFees <= (student.paidFees + amount)
                ? 'Paid'
                : 'Partial'
            }
          : student
      );
      
      setStudents(updatedStudents);
      resetPaymentForm();
      setShowPaymentModal(false);
      setError(null);
    } catch (error) {
      console.error('Error recording payment:', error);
      setError('Failed to record payment. Please try again.');
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

  const resetStudentForm = () => {
    setNewStudent({
      name: '',
      class: '',
      admissionNumber: '',
      email: '',
      parentName: '',
      parentPhone: '',
    });
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const newStudentData: Student = {
      id: `ST${Date.now()}`,
      name: newStudent.name,
      class: newStudent.class,
      email: newStudent.email,
      parentName: newStudent.parentName,
      parentPhone: newStudent.parentPhone,
      admissionNumber: newStudent.admissionNumber,
      expectedFees: 56500,
      paidFees: 0,
      lastPaymentDate: new Date().toISOString(),
      status: 'Unpaid',
      balance: 56500,
      parentContacts: [
        {
          name: newStudent.parentName,
          phone: newStudent.parentPhone,
          email: newStudent.email,
        },
      ],
    };

    try {
      // Use mock API instead of fetch
      await addStudent(newStudentData);

      setStudents([...students, newStudentData]);
      resetStudentForm();
      setShowStudentModal(false);
      setError(null);
    } catch (error) {
      console.error('Error adding student:', error);
      setError('Failed to add student. Please try again.');
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