"use client";

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NewStudent, ParentContact } from '../../types';
import { Button, Select } from '@/components/ui';

// --- Helper for Date Formatting ---
const formatDateInput = (value: string): string => {
    const cleaned = value.replace(/\D/g, ''); // Remove non-digit characters
    const match = cleaned.match(/^(\d{0,2})(\d{0,2})(\d{0,4})$/);
    if (!match) return value;
    
    let formatted = '';
    if (match[1]) formatted += match[1];
    if (match[2]) formatted += '/' + match[2];
    if (match[3]) formatted += '/' + match[3];

    // Limit length to DD/MM/YYYY (10 chars)
    return formatted.substring(0, 10);
};

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  newStudent: NewStudent;
  setNewStudent: (student: NewStudent) => void;
  handleCreateAndPay: (studentWithPayment: NewStudent & { paymentAmount?: number; paymentMethod?: string; paymentDescription?: string }) => Promise<void>;
  isLoading: boolean;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  newStudent,
  setNewStudent,
  handleCreateAndPay,
  isLoading
}) => {
  // --- Internal state for payment fields ---
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [paymentDescription, setPaymentDescription] = useState<string>('');
  const [dob, setDob] = useState<string>('');

  // --- Internal state for parents (manage locally) ---
  const [parents, setParents] = useState<ParentContact[]>([ 
      { name: '', phone: '', isWhatsapp: false }, // Parent 1 initial state
      { name: '', phone: '', isWhatsapp: false }  // Parent 2 initial state
  ]);

  // --- Sync local parent state with prop on open ---
  useEffect(() => {
    if (isOpen) {
      // Initialize local state from prop (or default if prop.parents is empty/undefined)
      const initialParents = newStudent.parents && newStudent.parents.length > 0 
          ? newStudent.parents 
          : [{ name: '', phone: '', isWhatsapp: false }, { name: '', phone: '', isWhatsapp: false }];
      // Ensure we always have at least two parent objects for the form
      setParents([
          initialParents[0] || { name: '', phone: '', isWhatsapp: false },
          initialParents[1] || { name: '', phone: '', isWhatsapp: false },
      ]);
      setDob(newStudent.dateOfBirth || ''); // Sync DOB too
      // Reset payment fields on open
      setPaymentAmount(0);
      setPaymentMethod('CASH');
      setPaymentDescription('');
    } 
  }, [isOpen]); // Rerun when modal opens

  if (!isOpen) return null;

  const classes = ['10A', '9B', '8C', '7D', '6E']; // Placeholder
  const paymentMethods = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY'];

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value);
      setDob(formatted);
      // Update the main newStudent state immediately for other fields if needed
      // setNewStudent({ ...newStudent, dateOfBirth: formatted }); // Keep this if other logic depends on it immediately
  };

  // --- Handler for parent input changes ---
  const handleParentChange = (index: number, field: keyof ParentContact, value: string | boolean) => {
      const updatedParents = [...parents];
      // Type assertion needed because field type is keyof ParentContact
      (updatedParents[index] as any)[field] = value;
      setParents(updatedParents);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Filter out empty parent entries before submitting
      const validParents = parents.filter(p => p.name.trim() !== '' || p.phone.trim() !== '');

      // Combine student data with payment data AND updated parents
      const studentWithPayment = {
          ...newStudent,
          parents: validParents, // Use the locally managed, validated parents
          dateOfBirth: dob, // Ensure formatted DOB is included
          paymentAmount: paymentAmount > 0 ? paymentAmount : undefined,
          paymentMethod: paymentAmount > 0 ? paymentMethod : undefined,
          paymentDescription: paymentAmount > 0 ? paymentDescription : undefined,
      };
      handleCreateAndPay(studentWithPayment);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Add New Student & Initial Payment</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Student Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                  <input type="text" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required disabled={isLoading}/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth*</label>
                    <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={dob}
                        onChange={handleDobChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                        disabled={isLoading}
                        maxLength={10}
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class*</label>
                    <Select value={newStudent.class} onChange={(e) => setNewStudent({...newStudent, class: e.target.value})} className="w-full" required disabled={isLoading} options={[{ value: '', label: 'Select Class' }, ...classes.map(cls => ({ value: cls, label: `Class ${cls}` }))]} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
                    <input type="text" value={newStudent.placeOfBirth || ''} onChange={(e) => setNewStudent({...newStudent, placeOfBirth: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isLoading}/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <input type="text" value={newStudent.gender || ''} onChange={(e) => setNewStudent({...newStudent, gender: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isLoading}/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Residence</label>
                    <input type="text" value={newStudent.residence || ''} onChange={(e) => setNewStudent({...newStudent, residence: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isLoading}/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Former School</label>
                    <input type="text" value={newStudent.former_school || ''} onChange={(e) => setNewStudent({...newStudent, former_school: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" disabled={isLoading}/>
                 </div>
             </div>
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Parent/Guardian Information</legend>
            {parents.map((parent, index) => (
                <div key={index} className={`mt-${index > 0 ? 4 : 2} border-t pt-4`}> 
                    <h4 className="text-md font-semibold mb-2">Parent / Guardian {index + 1} {index === 0 ? '(Primary)*' : '(Optional)'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name{index === 0 ? '*' : ''}</label>
                            <input 
                                type="text" 
                                value={parent.name} 
                                onChange={(e) => handleParentChange(index, 'name', e.target.value)} 
                                className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                                required={index === 0} // Only first parent is required
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone{index === 0 ? '*' : ''}</label>
                            <div className="flex items-center gap-2"> {/* Flex container for phone + checkbox */}
                                <input 
                                    type="tel" 
                                    value={parent.phone} 
                                    onChange={(e) => handleParentChange(index, 'phone', e.target.value)} 
                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-md" 
                                    required={index === 0}
                                    disabled={isLoading}
                                />
                                <label className="flex items-center space-x-1 cursor-pointer whitespace-nowrap">
                                    <input 
                                        type="checkbox" 
                                        checked={parent.isWhatsapp || false} 
                                        onChange={(e) => handleParentChange(index, 'isWhatsapp', e.target.checked)} 
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                        disabled={isLoading}
                                    />
                                    <span className="text-sm text-gray-600">WhatsApp?</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
          </fieldset>

          <fieldset className="border p-4 rounded-md">
            <legend className="text-lg font-medium px-2">Initial Payment (Optional)</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                    <input
                        id="paymentAmount"
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <Select
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        options={paymentMethods.map(m => ({ value: m, label: m.replace(/_/g, ' ') }))}
                        className="w-full"
                        disabled={isLoading || paymentAmount <= 0}
                    />
                </div>
                 <div>
                    <label htmlFor="paymentDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                        id="paymentDescription"
                        type="text"
                        value={paymentDescription}
                        onChange={(e) => setPaymentDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        disabled={isLoading || paymentAmount <= 0}
                        maxLength={100}
                    />
                </div>
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              color="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Create Student & Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};