"use client";

import { appDateLocale } from '@/lib/formatDate';
import { useState, useEffect } from 'react';
import { sortClassesByLevel, sortSubClassesByLevel } from '@/lib/classOrdering';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Student, NewStudent } from '../../types';
import apiService from '../../../../../../lib/apiService';
import { toast } from 'react-hot-toast';
import { PAYMENT_METHODS, paymentMethodLabel } from '@/lib/paymentMethods';
import type { PaymentExtras, PaymentOutcome } from '../../hooks/useFeeManagement';

interface PaymentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  selectedPaymentType: string;
  setSelectedPaymentType: (type: string) => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  paymentDescription: string;
  setPaymentDescription: (description: string) => void;
  handlePayment: (extra?: PaymentExtras) => Promise<PaymentOutcome>;
  handleAddStudentWithPayment?: (newStudent: NewStudent) => Promise<void>;
  isLoading: boolean;
  students: Student[];
  setSelectedStudent: (student: Student | null) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  student,
  isOpen,
  onClose,
  selectedPaymentType,
  setSelectedPaymentType,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentDescription,
  setPaymentDescription,
  handlePayment,
  handleAddStudentWithPayment,
  isLoading,
  students,
  setSelectedStudent
}) => {
  if (!isOpen) return null;

  const [isNewStudent, setIsNewStudent] = useState<boolean | null>(null);
  const [newStudent, setNewStudent] = useState<NewStudent>({
    nom: '',
    prenom: '',
    class: '',
    admissionNumber: '',
    dateOfBirth: '',
    gender: '',
    placeOfBirth: '',
    residence: '',
    former_school: '',
    reamOfPaperCollected: false,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(student);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [studentType, setStudentType] = useState<'new' | 'old'>('old');
  const [oldStudentFee, setOldStudentFee] = useState('');
  // Receipt details: date defaults to today (cannot be in the future); receipt
  // number is optional — blank means the server assigns the next sequential one.
  const todayStr = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [overpaymentPrompt, setOverpaymentPrompt] = useState<{ message: string } | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Fetch classes from the API
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setClassError(null);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE_URL}/classes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }

        const data = await response.json();
        if (data && data.data) {
          setClasses(sortClassesByLevel(data.data.map((c: any) => ({
            id: c.id,
            name: c.name
          }))));
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClassError(error instanceof Error ? error.message : 'Failed to load classes');
      } finally {
        setLoadingClasses(false);
      }
    };

    if (isOpen && isNewStudent) {
      fetchClasses();
    }
  }, [isOpen, isNewStudent]);

  // Handle search for existing student
  useEffect(() => {
    if (searchTerm.length > 2) {
      const filteredStudents = students.filter(s =>
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setSearchResults(filteredStudents);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, students]);

  // Fetch subclasses and academic years on open
  useEffect(() => {
    const fetchSubClasses = async () => {
      try {
        const result = await apiService.get('/classes/sub-classes?limit=40');
        setSubClasses(sortSubClassesByLevel(result.data || []));
      } catch (error) {
        setSubClasses([]);
      }
    };
    const fetchAcademicYears = async () => {
      try {
        const result = await apiService.get('/academic-years');
        setAcademicYears(result.data || []);
      } catch (error) {
        setAcademicYears([]);
      }
    };
    if (isOpen && isNewStudent) {
      fetchSubClasses();
      fetchAcademicYears();
    }
  }, [isOpen, isNewStudent]);

  const handleStudentTypeSelection = (isNew: boolean | null) => {
    setIsNewStudent(isNew);
    // Reset forms when switching between new and existing
    if (isNew === true) {
      setSelectedExistingStudent(null);
    } else if (isNew === false) {
      setNewStudent({
        nom: '',
        prenom: '',
        class: '',
        admissionNumber: '',
        dateOfBirth: '',
        gender: '',
        placeOfBirth: '',
        residence: '',
        former_school: '',
        reamOfPaperCollected: false,
      });
    }
  };

  const handleNewStudentToggle = (field: keyof NewStudent, value: boolean) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  const handleNewStudentChange = (field: keyof NewStudent, value: string) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  const handleExistingStudentSelect = (student: Student) => {
    setSelectedExistingStudent(student);
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchTerm('');
  };

  // --- Add these states at the top of your component ---
  const [subClassId, setSubClassId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [repeater, setRepeater] = useState(false);
  const [photo, setPhoto] = useState('');
  const [subClasses, setSubClasses] = useState<{ id: number; name: string }[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: number; name: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmitNewStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // 1. Create student (split name; no email collected)
      const studentPayload = {
        nom: newStudent.nom,
        prenom: newStudent.prenom,
        dateOfBirth: newStudent.dateOfBirth || undefined,
        placeOfBirth: newStudent.placeOfBirth || undefined,
        gender: newStudent.gender || undefined,
        residence: newStudent.residence || undefined,
        formerSchool: newStudent.former_school || undefined,
        isNewStudent: true,
      };
      const createRes = await apiService.post('/students', studentPayload);
      const studentId = createRes.data?.id;
      if (!studentId) throw new Error('Failed to create student');
      // 2. Enroll student
      const enrollRes = await apiService.post(`/students/${studentId}/enroll`, {
        subClassId: Number(subClassId),
        academicYearId: Number(academicYearId),
        repeater,
        reamOfPaperCollected: !!newStudent.reamOfPaperCollected,
        photo: photo || undefined,
      });
      const enrollment = enrollRes.data;
      if (!enrollment || !enrollment.id) throw new Error('Failed to enroll student');
      // 3. Record payment
      const payRes = await apiService.post(`/fees/${enrollment.feeId}/payments`, {
        studentId,
        amount: parseFloat(paymentAmount),
        paymentDate,
        paymentMethod,
        ...(receiptNumber.trim() ? { receiptNumber: receiptNumber.trim() } : {}),
        // A brand-new student cannot have paid before; an amount above the
        // full fee is still recorded but flagged as an overpayment on the receipt.
        confirmOverpayment: true,
      }, { silent: true });
      toast.success(`Student enrolled and payment recorded${payRes?.data?.receiptNumber ? ` — receipt ${payRes.data.receiptNumber}` : ''}.`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not complete the registration and payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const amountNum = parseFloat(paymentAmount);
  const currentBalance = selectedExistingStudent ? Number(selectedExistingStudent.balance) || 0 : 0;
  const wouldOverpay = !!selectedExistingStudent && Number.isFinite(amountNum) && amountNum > currentBalance;

  const submitExisting = async (confirmOverpayment: boolean) => {
    if (!selectedExistingStudent) return;
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error('Enter an amount greater than 0.');
      return;
    }
    if (paymentDate > todayStr) {
      toast.error('Payment date cannot be in the future.');
      return;
    }
    // Ask before sending when we can already see it exceeds the balance.
    if (wouldOverpay && !confirmOverpayment) {
      setOverpaymentPrompt({
        message: `This payment of ${amountNum.toLocaleString()} FCFA is more than the remaining balance of ${currentBalance.toLocaleString()} FCFA. The extra ${(amountNum - currentBalance).toLocaleString()} FCFA will be recorded as an overpayment.`,
      });
      return;
    }
    setIsSubmittingPayment(true);
    const result = await handlePayment({ paymentDate, receiptNumber, confirmOverpayment });
    setIsSubmittingPayment(false);
    if (result.status === 'needs_confirmation') {
      setOverpaymentPrompt({ message: result.message });
    } else if (result.status === 'ok') {
      setOverpaymentPrompt(null);
    }
  };

  const handleSubmitExistingPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitExisting(false);
  };

  // Auto-fill the payment amount based on the selected payment type
  const handlePaymentTypeChange = (type: string) => {
    setSelectedPaymentType(type);
    if (type === 'full' && selectedExistingStudent) {
      setPaymentAmount(selectedExistingStudent.balance.toString());
    } else {
      setPaymentAmount('');
    }
  };


  // Styled student type selector as button group
  const studentTypeSelector = (
    <div className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:justify-center sm:gap-4">
      <button
        type="button"
        onClick={() => { handleStudentTypeSelection(true); setStudentType('new'); }}
        className={`px-4 py-2 rounded-md border ${studentType === 'new' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'} font-medium`}
      >
        New Student
      </button>
      <button
        type="button"
        onClick={() => { handleStudentTypeSelection(false); setStudentType('old'); }}
        className={`px-4 py-2 rounded-md border ${studentType === 'old' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'} font-medium`}
      >
        Existing Student
      </button>
    </div>
  );

  // Modal wrapper
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center">Record Payment</h2>
        {studentTypeSelector}

        {/* New Student Form */}
        {studentType === 'new' && (
          <form onSubmit={handleSubmitNewStudent} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Student Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Name (Nom)</label>
                  <input type="text" value={newStudent.nom || ''} onChange={e => handleNewStudentChange('nom', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Given Name(s) (Prénom)</label>
                  <input type="text" value={newStudent.prenom || ''} onChange={e => handleNewStudentChange('prenom', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
                  <input type="text" value={newStudent.admissionNumber} onChange={e => handleNewStudentChange('admissionNumber', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={newStudent.dateOfBirth} onChange={e => handleNewStudentChange('dateOfBirth', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
                  <input type="text" value={newStudent.placeOfBirth} onChange={e => handleNewStudentChange('placeOfBirth', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select value={newStudent.gender} onChange={e => handleNewStudentChange('gender', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Residence</label>
                  <input type="text" value={newStudent.residence} onChange={e => handleNewStudentChange('residence', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Former School</label>
                  <input type="text" value={newStudent.former_school} onChange={e => handleNewStudentChange('former_school', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Enrollment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subclass</label>
                  <select value={subClassId} onChange={e => setSubClassId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Subclass</option>
                    {subClasses.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
                  <select value={academicYearId} onChange={e => setAcademicYearId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Academic Year</option>
                    {academicYears.map(year => <option key={year.id} value={year.id}>{year.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 md:col-span-2">
                  <label htmlFor="repeater" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={repeater} onChange={e => setRepeater(e.target.checked)} id="repeater" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    Is Repeater?
                  </label>
                  <label htmlFor="ream" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input type="checkbox" checked={!!newStudent.reamOfPaperCollected} onChange={e => handleNewStudentToggle('reamOfPaperCollected', e.target.checked)} id="ream" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                    Ream of paper collected?
                  </label>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                  <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Method</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input type="date" value={paymentDate} max={todayStr} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt No. <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} maxLength={64} placeholder="Auto-numbered if blank" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isLoading || !newStudent.nom || !newStudent.prenom || !subClassId || !academicYearId || !paymentAmount || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Create, Enroll & Record Payment'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Student Form */}
        {studentType === 'old' && (
          <form onSubmit={handleSubmitExistingPayment} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Find Student</h3>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Student (by name or matricule)</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Type at least 3 characters..."
                  disabled={isLoading || !!selectedExistingStudent}
                />
                {selectedExistingStudent && (
                  <div className="flex items-center justify-between p-2 border rounded bg-gray-50">
                    <span className="text-sm text-gray-700">Selected: {selectedExistingStudent.name} ({selectedExistingStudent.admissionNumber})</span>
                    <button
                      type="button"
                      className="text-blue-600 text-sm"
                      onClick={() => { setSelectedExistingStudent(null); setSelectedStudent(null); }}
                    >
                      Change
                    </button>
                  </div>
                )}
                {/* Search Results */}
                {searchResults.length > 0 && !selectedExistingStudent && (
                  <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map(s => (
                      <div
                        key={s.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleExistingStudentSelect(s)}
                      >
                        {s.name} ({s.admissionNumber})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Payment Details</h3>
              {selectedExistingStudent && (
                <p className="text-sm text-gray-600 mb-2">
                  Remaining balance: <span className="font-semibold">{currentBalance.toLocaleString()} FCFA</span>
                </p>
              )}
              {wouldOverpay && !overpaymentPrompt && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-2">
                  This amount is more than the remaining balance — you will be asked to confirm the overpayment.
                </p>
              )}
              {overpaymentPrompt && (
                <div role="alertdialog" className="text-sm bg-amber-50 border border-amber-300 rounded-md px-3 py-3 mb-3 space-y-2">
                  <p className="font-semibold text-amber-900">Confirm overpayment</p>
                  <p className="text-amber-900">{overpaymentPrompt.message}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={isSubmittingPayment} onClick={() => submitExisting(true)} className="px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50">
                      {isSubmittingPayment ? 'Recording...' : 'Record anyway'}
                    </button>
                    <button type="button" disabled={isSubmittingPayment} onClick={() => setOverpaymentPrompt(null)} className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                      Change amount
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => { setPaymentAmount(e.target.value); setOverpaymentPrompt(null); }}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Payment Amount"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Method</option>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input type="date" value={paymentDate} max={todayStr} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt No. <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} maxLength={64} placeholder="Auto-numbered if blank" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isLoading || isSubmittingPayment || !selectedExistingStudent || !paymentAmount || !paymentMethod || !!overpaymentPrompt}
              >
                {isSubmittingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// --- TransactionsModal ---
import React from 'react';

interface TransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
  isLoading: boolean;
  studentName?: string;
  /** When provided, each row gets an Edit action that submits the changed payment. */
  onUpdatePayment?: (
    paymentId: number | string,
    data: { amount: number; paymentDate?: string; paymentMethod?: string; receiptNumber?: string }
  ) => Promise<boolean>;
  /** Reprint the receipt PDF for one transaction */
  onPrintReceipt?: (paymentId: number | string, receiptNumber?: string) => void;
}

export const TransactionsModal: React.FC<TransactionsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  isLoading,
  studentName,
  onUpdatePayment,
  onPrintReceipt
}) => {
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editReceipt, setEditReceipt] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const startEdit = (tx: any) => {
    setEditingId(tx.id);
    setEditAmount(tx.amount != null ? String(tx.amount) : '');
    setEditDate(tx.paymentDate ? new Date(tx.paymentDate).toISOString().split('T')[0] : '');
    setEditMethod(tx.paymentMethod || '');
    setEditReceipt(tx.receiptNumber || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsSaving(false);
  };

  const saveEdit = async () => {
    if (!onUpdatePayment || editingId == null) return;
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) return;
    setIsSaving(true);
    const ok = await onUpdatePayment(editingId, {
      amount,
      paymentDate: editDate ? new Date(editDate).toISOString() : undefined,
      paymentMethod: editMethod || undefined,
      receiptNumber: editReceipt || undefined,
    });
    setIsSaving(false);
    if (ok) setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center">{studentName ? `Transactions for ${studentName}` : 'Transactions'}</h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No transactions found.</div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                  {(onUpdatePayment || onPrintReceipt) && (
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => (
                  editingId === tx.id ? (
                    <tr key={tx.id} className="bg-blue-50">
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={editDate}
                          onChange={e => setEditDate(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={editMethod}
                          onChange={e => setEditMethod(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                          disabled={isSaving}
                        >
                          <option value="">Select Method</option>
                          {PAYMENT_METHODS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={editReceipt}
                          onChange={e => setEditReceipt(e.target.value)}
                          className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="Receipt No."
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={isSaving || !editAmount || parseFloat(editAmount) <= 0}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 mr-2"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={tx.id}>
                      <td className="px-4 py-2 text-sm text-gray-700">{tx.amount?.toLocaleString(undefined, { style: 'currency', currency: 'XAF' })}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString(appDateLocale()) : '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{paymentMethodLabel(tx.paymentMethod)}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{tx.receiptNumber || '-'}</td>
                      {(onUpdatePayment || onPrintReceipt) && (
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          {onUpdatePayment && (
                            <button
                              type="button"
                              onClick={() => startEdit(tx)}
                              disabled={editingId != null}
                              className="px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
                            >
                              Edit
                            </button>
                          )}
                          {onPrintReceipt && (
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(tx.id, tx.receiptNumber)}
                              className="ml-2 px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Receipt
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {transactions.map((tx) => (
              editingId === tx.id ? (
                <div key={tx.id} className="p-4 space-y-1.5 bg-blue-50">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Amount</span>
                    <input
                      type="number"
                      min="1"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Date</span>
                    <input
                      type="date"
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Method</span>
                    <select
                      value={editMethod}
                      onChange={e => setEditMethod(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                      disabled={isSaving}
                    >
                      <option value="">Select Method</option>
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Receipt</span>
                    <input
                      type="text"
                      value={editReceipt}
                      onChange={e => setEditReceipt(e.target.value)}
                      className="w-28 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="Receipt No."
                      disabled={isSaving}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isSaving || !editAmount || parseFloat(editAmount) <= 0}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={tx.id} className="p-4 space-y-1.5">
                  <div className="text-sm font-semibold text-gray-900 break-words">{tx.amount?.toLocaleString(undefined, { style: 'currency', currency: 'XAF' })}</div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Date</span>
                    <span className="text-sm text-gray-900 text-right break-words">{tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString(appDateLocale()) : '-'}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Method</span>
                    <span className="text-sm text-gray-900 text-right break-words">{paymentMethodLabel(tx.paymentMethod)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs text-gray-500">Receipt</span>
                    <span className="text-sm text-gray-900 text-right break-words">{tx.receiptNumber || '-'}</span>
                  </div>
                  {(onUpdatePayment || onPrintReceipt) && (
                    <div className="flex flex-wrap gap-2 pt-1.5">
                      {onUpdatePayment && (
                        <button
                          type="button"
                          onClick={() => startEdit(tx)}
                          disabled={editingId != null}
                          className="px-3 py-1 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50"
                        >
                          Edit
                        </button>
                      )}
                      {onPrintReceipt && (
                        <button
                          type="button"
                          onClick={() => onPrintReceipt(tx.id, tx.receiptNumber)}
                          className="px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Receipt
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};