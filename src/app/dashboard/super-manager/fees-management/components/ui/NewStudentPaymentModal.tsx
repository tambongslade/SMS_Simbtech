"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal'; // Base Modal component
import { Button } from '@/components/ui/Button'; // Assuming a reusable Button component exists
import { Input } from '@/components/ui/Input'; // Assuming a reusable Input component exists
import { Select } from '@/components/ui/Select'; // Assuming a reusable Select component exists
// --- Optional: Import a Date Picker component if you have one ---
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// --- Adjust path if your types/API functions are elsewhere ---
import { AcademicYear, Class, SubClass } from '../../types';
import { fetchAcademicData } from '../../services/api';

interface NewStudentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>; // Type properly based on actual data structure later
  isLoading: boolean;
  // TODO: Add props for fetched classes/subclasses if fetched in parent
}

// Define the expected structure for form data (adjust as needed for API)
interface NewStudentFormData {
    name: string;
    dateOfBirth: string | null; // YYYY-MM-DD
    sex: string;
    parentsContact: string[];
    formerSchool?: string;
    subClassId: number | null;
    paymentDetails: {
        bank: string;
        datePaid: string | null; // YYYY-MM-DD
        amount: number | null; // Added amount field
        paymentType: string; // Added payment type field
    }
}

export const NewStudentPaymentModal: React.FC<NewStudentPaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  // --- State for Form Fields ---
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [sex, setSex] = useState('');
  const [parentContact1, setParentContact1] = useState('');
  const [parentContact2, setParentContact2] = useState('');
  const [previousSchool, setPreviousSchool] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubClassId, setSelectedSubClassId] = useState<string>('');
  const [paymentBank, setPaymentBank] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date()); // Default to today
  const [paymentAmount, setPaymentAmount] = useState<number | '' >(''); // Added state for amount
  const [paymentType, setPaymentType] = useState<string>(''); // Added state for payment type (e.g., 'school_fees')

  // --- State for Fetched Data ---
  const [classes, setClasses] = useState<Class[]>([]);
  const [subClasses, setSubClasses] = useState<SubClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]); // If needed for context
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

   // --- Fetch Classes/Subclasses ---
   useEffect(() => {
     if (isOpen) { // Only fetch when modal opens
       const loadInitialData = async () => {
         setDataLoading(true);
         setError(null);
         try {
           // Assuming fetchAcademicData returns { classes: Class[], academicYears: AcademicYear[] }
           // You might need a different API call or adjust this
           const data = await fetchAcademicData(); // TODO: Ensure this function exists and fetches necessary data
           setClasses(data.classes || []);
           setAcademicYears(data.academicYears || []); // Store if needed
         } catch (err) {
           console.error("Error fetching academic data:", err);
           setError("Failed to load class data.");
         } finally {
           setDataLoading(false);
         }
       };
       loadInitialData();
     } else {
        // Reset form when modal closes
        setName('');
        setDob(null);
        setSex('');
        setParentContact1('');
        setParentContact2('');
        setPreviousSchool('');
        setSelectedClassId('');
        setSelectedSubClassId('');
        setPaymentBank('');
        setPaymentDate(new Date());
        setPaymentAmount('');
        setPaymentType('');
        setError(null);
        setClasses([]);
        setSubClasses([]);
     }
   }, [isOpen]);

  // Update subclasses when class changes
  useEffect(() => {
    if (selectedClassId) {
      const selectedClass = classes.find(c => c.id.toString() === selectedClassId);
      setSubClasses(selectedClass?.subClasses || []);
      setSelectedSubClassId(''); // Reset subclass selection
    } else {
      setSubClasses([]);
    }
  }, [selectedClassId, classes]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic validation (can be enhanced)
    if (!name || !dob || !sex || !parentContact1 || !selectedSubClassId || !paymentBank || !paymentDate || !paymentAmount || !paymentType) {
        setError("Please fill in all required fields.");
        return;
    }
    setError(null);

    const formData: NewStudentFormData = {
      name,
      dateOfBirth: dob?.toISOString().split('T')[0] ?? null, // Format as YYYY-MM-DD
      sex,
      parentsContact: [parentContact1, parentContact2].filter(c => !!c), // Filter out empty contact
      formerSchool: previousSchool || undefined, // Set to undefined if empty, depending on API
      subClassId: parseInt(selectedSubClassId, 10) || null,
      paymentDetails: {
          bank: paymentBank,
          datePaid: paymentDate?.toISOString().split('T')[0] ?? null, // Format as YYYY-MM-DD
          amount: typeof paymentAmount === 'number' ? paymentAmount : null,
          paymentType: paymentType,
      }
    };
    await onSubmit(formData); // Pass structured data to parent handler
  };


  if (!isOpen) return null;

  return (
    // Adjust size as needed 'sm', 'md', 'lg', 'xl'
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Student & Record Initial Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* --- Student Details --- */}
        <h3 className="text-lg font-medium text-gray-700 border-b pb-2">Student Information</h3>
        <Input label="Full Name *" value={name} onChange={(e) => setName(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
          {/* --- Consider using a dedicated Date Picker component --- */}
          <input
            type="date"
            value={dob ? dob.toISOString().split('T')[0] : ''}
            onChange={(e) => setDob(e.target.value ? new Date(e.target.value) : null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            required
           />
        </div>
        <Select label="Sex *" value={sex} onChange={(e) => setSex(e.target.value)} required>
            <option value="" disabled>Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
        </Select>
        <Input label="Parent Contact 1 *" value={parentContact1} onChange={(e) => setParentContact1(e.target.value)} required />
        <Input label="Parent Contact 2 (Optional)" value={parentContact2} onChange={(e) => setParentContact2(e.target.value)} />
        <Input label="Previous School (Optional)" value={previousSchool} onChange={(e) => setPreviousSchool(e.target.value)} />

        {/* --- Class Selection --- */}
        <h3 className="text-lg font-medium text-gray-700 border-b pb-2 pt-4">Enrollment Information</h3>
         <Select
            label="Class *"
            value={selectedClassId}
            onChange={(e) => {setSelectedClassId(e.target.value); setSelectedSubClassId('');}}
            required
            disabled={dataLoading}
         >
             <option value="" disabled>Select Class</option>
             {dataLoading && <option value="" disabled>Loading classes...</option>}
             {!dataLoading && classes.map((cls) => (
                 <option key={cls.id} value={cls.id}>{cls.name}</option>
             ))}
         </Select>
         <Select
            label="Subclass *"
            value={selectedSubClassId}
            onChange={(e) => setSelectedSubClassId(e.target.value)}
            required
            disabled={!selectedClassId || dataLoading || subClasses.length === 0}
         >
             <option value="" disabled>Select Subclass</option>
             {selectedClassId && subClasses.length === 0 && !dataLoading && <option value="" disabled>No subclasses found</option>}
             {selectedClassId && subClasses.map((subCls) => (
                 <option key={subCls.id} value={subCls.id}>{subCls.name}</option>
             ))}
         </Select>


        {/* --- Payment Details --- */}
        <h3 className="text-lg font-medium text-gray-700 border-b pb-2 pt-4">Initial Payment Information</h3>
         {/* Added Payment Amount Input */}
         <Input
           label="Payment Amount *"
           type="number"
           value={paymentAmount}
           onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
           required
           min="0" // Prevent negative amounts
         />
         {/* Added Payment Type Selection */}
         <Select label="Payment Type *" value={paymentType} onChange={(e) => setPaymentType(e.target.value)} required>
             <option value="" disabled>Select Payment Type</option>
             <option value="school_fees">School Fees</option>
             <option value="registration_fees">Registration Fees</option>
             <option value="pta_levy">PTA Levy</option>
             {/* Add other relevant payment types */}
         </Select>
        <Select label="Bank *" value={paymentBank} onChange={(e) => setPaymentBank(e.target.value)} required>
            <option value="" disabled>Select Bank</option>
            <option value="Express Union">Express Union</option>
            <option value="CCA">CCA</option>
            <option value="3DC">3DC</option>
            {/* Add others if needed */}
        </Select>
         <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Date Paid *</label>
            {/* --- Consider using a dedicated Date Picker component --- */}
           <input
             type="date"
             value={paymentDate ? paymentDate.toISOString().split('T')[0] : ''}
             onChange={(e) => setPaymentDate(e.target.value ? new Date(e.target.value) : null)}
             className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
             required
            />
         </div>


        {/* --- Actions --- */}
        <div className="flex justify-end gap-2 pt-6 border-t mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading || dataLoading}>
            {isLoading ? 'Submitting...' : 'Add Student & Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
