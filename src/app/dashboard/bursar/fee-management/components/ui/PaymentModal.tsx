"use client";

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Student, NewStudent } from '../../types';
import apiService from '../../../../../../lib/apiService';

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
  handlePayment: () => Promise<void>;
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
    name: '',
    class: '',
    admissionNumber: '',
    email: '',
    parentName: '',
    parentPhone: '',
    dateOfBirth: '',
    gender: '',
    placeOfBirth: '',
    residence: '',
    former_school: '',
    phone: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(student);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);
  const [studentType, setStudentType] = useState<'new' | 'old'>('old');
  const [oldStudentFee, setOldStudentFee] = useState('');

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
          setClasses(data.data.map((c: any) => ({
            id: c.id,
            name: c.name
          })));
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
        setSubClasses(result.data || []);
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
        name: '',
        class: '',
        admissionNumber: '',
        email: '',
        parentName: '',
        parentPhone: '',
        dateOfBirth: '',
        gender: '',
        placeOfBirth: '',
        residence: '',
        former_school: '',
        phone: '',
      });
    }
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
      // 1. Create student
      const studentPayload = { ...newStudent };
      const createRes = await apiService.post('/students', studentPayload);
      const studentId = createRes.data?.id;
      if (!studentId) throw new Error('Failed to create student');
      // 2. Enroll student
      const enrollRes = await apiService.post(`/students/${studentId}/enroll`, {
        sub_class_id: subClassId,
        academic_year_id: academicYearId,
        repeater,
        photo: photo || null,
      });
      const enrollment = enrollRes.data;
      if (!enrollment || !enrollment.id) throw new Error('Failed to enroll student');
      // 3. Record payment
      await apiService.post(`/fees/${enrollment.feeId}/payments`, {
        studentId,
        amount: parseFloat(paymentAmount),
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentMethod.toUpperCase(),
      });
      // Optionally show a success toast here
      onClose();
    } catch (err) {
      // Optionally show an error toast here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitExistingPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExistingStudent) {
      await handlePayment(selectedExistingStudent);
    }
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

  const banks = ['EXPRESS_UNION', 'CCA', 'F3DC'];

  // Styled student type selector as button group
  const studentTypeSelector = (
    <div className="mb-6 flex justify-center gap-4">
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center">Record Payment</h2>
        {studentTypeSelector}

        {/* New Student Form */}
        {studentType === 'new' && (
          <form onSubmit={handleSubmitNewStudent} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Student Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={newStudent.name} onChange={e => handleNewStudentChange('name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
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
                <div className="flex items-center gap-2 md:col-span-2">
                  <input type="checkbox" checked={repeater} onChange={e => setRepeater(e.target.checked)} id="repeater" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  <label htmlFor="repeater" className="text-sm font-medium text-gray-700">Is Repeater?</label>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (optional)</label>
                  <input type="text" value={photo} onChange={e => setPhoto(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
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
                    <option value="EXPRESS_UNION">Express Union</option>
                    <option value="CCA">CCA</option>
                    <option value="F3DC">F3DC</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isLoading || !newStudent.name || !subClassId || !academicYearId || !paymentAmount || isProcessing}
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


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Payment Amount"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select Method</option>
                    <option value="EXPRESS_UNION">Express Union</option>
                    <option value="CCA">CCA</option>
                    <option value="F3DC">F3DC</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={isLoading || !selectedExistingStudent || !paymentAmount}
              >
Record Payment
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
}

export const TransactionsModal: React.FC<TransactionsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  isLoading,
  studentName
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center">{studentName ? `Transactions for ${studentName}` : 'Transactions'}</h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">{tx.amount?.toLocaleString(undefined, { style: 'currency', currency: 'XAF' })}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{tx.paymentDate ? new Date(tx.paymentDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{tx.paymentMethod || '-'}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{tx.receiptNumber || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};