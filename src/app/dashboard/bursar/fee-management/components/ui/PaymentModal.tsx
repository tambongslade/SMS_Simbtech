"use client";

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Student, NewStudent } from '../../types';

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
  students
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
    sex: '',
    previousSchool: '',
    parentContact2: '',
    paymentBank: '',
    datePaid: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedExistingStudent, setSelectedExistingStudent] = useState<Student | null>(student);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

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
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filteredStudents);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, students]);

  const handleStudentTypeSelection = (isNew: boolean | null) => {
    setIsNewStudent(isNew);
    // Reset forms when switching between new and existing student
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
        sex: '',
        previousSchool: '',
        parentContact2: '',
        paymentBank: '',
        datePaid: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleNewStudentChange = (field: keyof NewStudent, value: string) => {
    setNewStudent(prev => ({ ...prev, [field]: value }));
  };

  const handleExistingStudentSelect = (student: Student) => {
    setSelectedExistingStudent(student);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleSubmitNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleAddStudentWithPayment) {
      // Pass payment info to the new student record
      const studentWithPayment = {
        ...newStudent,
        paymentAmount,
        paymentMethod,
        paymentDescription
      };
      handleAddStudentWithPayment(studentWithPayment as NewStudent);
    }
  };

  const handleSubmitExistingPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExistingStudent) {
      // Set the selected student and trigger payment
      handlePayment();
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

  const banks = ['Express Union', 'CCA', '3DC'];

  // If student selection type hasn't been made yet (new or existing)
  if (isNewStudent === null) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold">Record Payment</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            <p className="text-center text-gray-700">Is this a payment for a new or existing student?</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleStudentTypeSelection(true)}
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-4 px-4 rounded-lg border border-blue-200"
              >
                New Student
              </button>
              
              <button
                onClick={() => handleStudentTypeSelection(false)}
                className="bg-green-100 hover:bg-green-200 text-green-800 font-medium py-4 px-4 rounded-lg border border-green-200"
              >
                Existing Student
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For new student form
  if (isNewStudent) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">New Student Payment</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmitNewStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => handleNewStudentChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="text"
                  value={newStudent.dateOfBirth}
                  onChange={(e) => handleNewStudentChange('dateOfBirth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="DD/MM/YYYY"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">Format: DD/MM/YYYY (e.g., 15/05/2010)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <select
                  value={newStudent.sex}
                  onChange={(e) => handleNewStudentChange('sex', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading}
                >
                  <option value="">Select Sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous School (Optional)
                </label>
                <input
                  type="text"
                  value={newStudent.previousSchool}
                  onChange={(e) => handleNewStudentChange('previousSchool', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  value={newStudent.class}
                  onChange={(e) => handleNewStudentChange('class', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading || loadingClasses}
                >
                  <option value="">Select Class</option>
                  {loadingClasses ? (
                    <option value="" disabled>Loading classes...</option>
                  ) : classError ? (
                    <option value="" disabled>Error: {classError}</option>
                  ) : (
                    classes.map(cls => (
                      <option key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </option>
                    ))
                  )}
                </select>
                {loadingClasses && (
                  <p className="text-xs text-blue-500 mt-1">Loading available classes...</p>
                )}
                {classError && (
                  <p className="text-xs text-red-500 mt-1">{classError}</p>
                )}
              </div>

              {/* Parent Contact Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent/Guardian Contact 1
                </label>
                <input
                  type="tel"
                  value={newStudent.parentPhone}
                  onChange={(e) => handleNewStudentChange('parentPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading}
                  placeholder="Parent's phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent/Guardian Contact 2 (Optional)
                </label>
                <input
                  type="tel"
                  value={newStudent.parentContact2}
                  onChange={(e) => handleNewStudentChange('parentContact2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoading}
                  placeholder="Second contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent/Guardian Name
                </label>
                <input
                  type="text"
                  value={newStudent.parentName}
                  onChange={(e) => handleNewStudentChange('parentName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Payment Details Section */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Payment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (XAF)
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter amount"
                    required
                    min="1"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Bank
                  </label>
                  <select
                    value={newStudent.paymentBank}
                    onChange={(e) => handleNewStudentChange('paymentBank', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={isLoading}
                    required
                  >
                    <option value="">Select Bank</option>
                    {banks.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Paid
                  </label>
                  <input
                    type="date"
                    value={newStudent.datePaid}
                    onChange={(e) => handleNewStudentChange('datePaid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Add payment details..."
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => handleStudentTypeSelection(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isLoading || !paymentAmount || !newStudent.name}
              >
                {isLoading ? 'Processing...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // For existing student form
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Record Payment for Existing Student</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmitExistingPayment} className="space-y-4">
          {/* Student Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Student (by name or matricule)
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Type at least 3 characters..."
              disabled={isLoading || !!selectedExistingStudent}
            />
            
            {/* Search Results */}
            {searchResults.length > 0 && !selectedExistingStudent && (
              <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                {searchResults.map(s => (
                  <div 
                    key={s.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleExistingStudentSelect(s)}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.admissionNumber} - Class {s.class}</p>
                  </div>
                ))}
              </div>
            )}
            
            {searchTerm.length > 2 && searchResults.length === 0 && (
              <p className="text-sm text-red-500 mt-1">No students found</p>
            )}
          </div>

          {/* Selected Student Info */}
          {selectedExistingStudent && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{selectedExistingStudent.name}</p>
                  <p className="text-sm text-gray-500">{selectedExistingStudent.admissionNumber}</p>
                  <p className="text-sm text-gray-600">Class: {selectedExistingStudent.class}</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSelectedExistingStudent(null)}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Change
                </button>
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-sm">
                  <span>Expected Fees:</span>
                  <span>{selectedExistingStudent.expectedFees.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'XAF',
                    minimumFractionDigits: 0,
                  })}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Paid to Date:</span>
                  <span>{selectedExistingStudent.paidFees.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'XAF',
                    minimumFractionDigits: 0,
                  })}</span>
                </div>
                <div className="flex justify-between text-sm mt-1 font-medium">
                  <span>Outstanding Balance:</span>
                  <span>{selectedExistingStudent.balance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'XAF',
                    minimumFractionDigits: 0,
                  })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details - Only show when a student is selected */}
          {selectedExistingStudent && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <select
                  value={selectedPaymentType}
                  onChange={(e) => handlePaymentTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoading}
                >
                  <option value="full">Full Payment</option>
                  <option value="partial">Partial Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (XAF)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter amount"
                  required
                  min="1"
                  max={selectedExistingStudent.balance.toString()}
                  disabled={isLoading || selectedPaymentType === 'full'}
                />
                {selectedPaymentType === 'partial' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Enter an amount less than or equal to the outstanding balance.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Bank
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isLoading}
                  required
                >
                  <option value="">Select Bank</option>
                  {banks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Add payment details..."
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => handleStudentTypeSelection(null)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Back
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isLoading || !paymentAmount || !selectedExistingStudent}
            >
              {isLoading ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};