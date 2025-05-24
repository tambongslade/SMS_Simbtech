'use client';

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Student } from '../../types'; // Adjust the path as necessary
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CurrencyDollarIcon } from '@heroicons/react/24/solid'; // Import an icon
import { debounce } from 'lodash'; // Using lodash for debouncing
import { FormattedDateInput } from './FormattedDateInput'; // Import the new component

// Define confirmation details structure
interface ConfirmationDetails {
    studentName: string;
    amount: string;
}

interface SearchablePaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[]; // Full list of students for searching
    handlePayment: (studentId: string, paymentDetails: PaymentDetails) => Promise<void>; // The actual payment function, studentId is string
    isLoading: boolean; // Loading state for payment submission
    onPaymentSuccess: (details: ConfirmationDetails) => void; // Callback for successful payment
    initialStudent?: Student | null; // Add optional initial student prop
    // Add other necessary props like classes, terms if needed for display/validation
}

// Define the structure for payment details passed to handlePayment
interface PaymentDetails {
    amount: number;
    method: string;
    date: string; // Should be YYYY-MM-DD format for the backend
    description?: string;
    // Add any other relevant payment fields
}

export const SearchablePaymentModal: React.FC<SearchablePaymentModalProps> = ({
    isOpen,
    onClose,
    students,
    handlePayment,
    isLoading,
    onPaymentSuccess, // Destructure new prop
    initialStudent, // Destructure new prop
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState(''); // Default or fetch options
    const [paymentDate, setPaymentDate] = useState(''); // Initialize as empty string
    const [paymentDescription, setPaymentDescription] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);

    // Reset form and selection only
    const resetFormAndSelection = useCallback(() => {
        setSelectedStudent(null);
        setPaymentAmount('');
        setPaymentMethod('');
        setPaymentDate('');
        setPaymentDescription('');
        // Keep search term and results potentially visible
        setSearchResults([]); // Clear results when resetting selection
        setSearchError(null);
    }, []);

    // Effect to handle modal open/close and initial student
    useEffect(() => {
        if (isOpen) {
            if (initialStudent) {
                handleStudentSelect(initialStudent); // Clears search term
            } else {
                // Opened without initial student, ensure clean state
                resetFormAndSelection(); // Clear previous selection/form
                setSearchTerm(''); // Clear search term
                setSearchResults([]);
                setSearchError(null);
            }
        } else {
            // Reset everything when modal closes
            resetFormAndSelection();
            setSearchTerm('');
            setSearchResults([]);
            setSearchError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialStudent]);

    const handleStudentSelect = (student: Student) => {
        setSelectedStudent(student);
        setSearchResults([]);
        setSearchError(null);
        setSearchTerm(''); // Clear search term when selecting
    };

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((term: string) => {
             if (selectedStudent) return; // Don't search if a student is already selected
             if (term.length < 3) {
                setSearchResults([]);
                setSearchError(term.length > 0 ? 'Type at least 3 characters' : null);
                return;
            }
            setSearchError(null);
            const results = students.filter(student =>
                student.name.toLowerCase().includes(term.toLowerCase()) ||
                (student.admissionNumber && student.admissionNumber.toLowerCase().includes(term.toLowerCase()))
            );
            setSearchResults(results);
            if (results.length === 0 && term.length >= 3) {
                setSearchError('No students found matching your search.');
            }
        }, 300),
        [students, selectedStudent] // Add selectedStudent dependency back
    );

     // useEffect for debounced search
     useEffect(() => {
        debouncedSearch(searchTerm);
        return () => debouncedSearch.cancel();
    }, [searchTerm, debouncedSearch]);

    // handleClose (calls full reset)
     const handleClose = () => {
        resetFormAndSelection();
        setSearchTerm('');
        setSearchError(null);
        onClose();
    };

    // Change student resets the form/selection, enabling search
    const handleChangeStudent = () => {
        resetFormAndSelection();
    };

    // Helper function to convert DD/MM/YYYY to YYYY-MM-DD
    const convertDateToISO = (dateString: string): string | null => {
        // Basic check for format
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return null;

        const [dayStr, monthStr, yearStr] = dateString.split('/');
        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        // Validate ranges (redundant with FormattedDateInput's internal validation, but good practice)
        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2035) {
            return null;
        }

        // Check date validity
        const dateObj = new Date(year, month - 1, day);
        if (!(dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day)) {
            return null;
        }
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convert date and check validity before submitting
        const isoDate = convertDateToISO(paymentDate);

        if (!isoDate && paymentDate) { // Check if conversion failed but there was input
            alert('Please enter a valid Payment Date in DD/MM/YYYY format.');
            // Optionally, focus the date input here
            return;
        }

        if (!selectedStudent || !paymentAmount || !paymentMethod || !isoDate) {
            let errorMsg = 'Please select a student and fill in all required payment details.';
            if (!selectedStudent) {
                errorMsg = 'Please search and select a student first.';
            } else if (selectedStudent && !isoDate && !paymentDate) {
                 errorMsg = 'Payment Date is required.';
            } else if (selectedStudent && !paymentMethod) {
                errorMsg = 'Payment Bank is required.';
            } else if (selectedStudent && !paymentAmount) {
                errorMsg = 'Payment Amount is required.';
            }
            // Removed the redundant date format check here as it's handled above
            alert(errorMsg);
            return;
        }

        const paymentDetails: PaymentDetails = {
            amount: parseFloat(paymentAmount),
            method: paymentMethod,
            date: isoDate,
            description: paymentDescription || undefined,
        };

        const currentStudentName = selectedStudent.name;
        const currentPaymentAmount = paymentAmount;

        try {
            await handlePayment(selectedStudent.id, paymentDetails);
            onPaymentSuccess({ studentName: currentStudentName, amount: currentPaymentAmount });
            // Reset form and selection, allowing new search
            resetFormAndSelection();
        } catch (error) {
            console.error('Payment failed in modal:', error);
        }
    };

    // Calculate balance (ensure types are numbers)
    const expectedFees = selectedStudent?.expectedFees ?? 0;
    const paidFees = selectedStudent?.paidFees ?? 0;
    const outstandingBalance = selectedStudent?.balance ?? (expectedFees - paidFees);

    // Calculate display values, using placeholders if no student selected
    const displayName = selectedStudent?.name ?? '-';
    const displayAdmissionNo = selectedStudent?.admissionNumber ?? 'N/A';
    const displayClass = selectedStudent?.class ?? 'N/A';
    const displayExpected = selectedStudent?.expectedFees ?? 0;
    const displayPaid = selectedStudent?.paidFees ?? 0;
    const displayBalance = selectedStudent?.balance ?? (displayExpected - displayPaid);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                {/* Close Button */} 
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full"
                    aria-label="Close modal"
                >
                    <XMarkIcon className="h-6 w-6" />
                </button>

                <h2 className="text-2xl font-semibold mb-6 text-gray-800">Record Payment</h2>

                {/* --- Search Section (Always Visible) --- */} 
                <div className="mb-4 relative">
                    <label htmlFor="studentSearch" className="block text-sm font-medium text-gray-700 mb-1">Search Student (Name or Admission No.)</label>
                    <input
                        type="text"
                        id="studentSearch"
                        value={searchTerm}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        placeholder="Type at least 3 characters..."
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={!!selectedStudent || isLoading} // Disable input if student selected or loading
                        autoComplete="off"
                    />
                     {searchError && !selectedStudent && <p className="text-sm text-red-600 mt-1">{searchError}</p>}
                    
                    {/* Search Results List - Only visible when searching and no student selected */}
                    {!isLoading && searchResults.length > 0 && searchTerm.length >= 3 && !selectedStudent && (
                        <ul className="absolute z-10 mt-1 w-full border border-gray-300 rounded-md max-h-48 overflow-y-auto bg-white shadow-lg">
                            {searchResults.map(student => (
                                <li key={student.id}
                                    onClick={() => handleStudentSelect(student)}
                                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b last:border-b-0 text-gray-700"
                                >
                                    {student.name} ({student.admissionNumber || 'No Adm No'}) - {student.class ?? 'N/A'}
                                </li>
                            ))}
                        </ul>
                    )}
                     <form onSubmit={handleSubmit} className="space-y-2 border-t pt-4">
                        {/* Student Info Display */} 
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`text-lg font-medium ${selectedStudent ? 'text-gray-800' : 'text-gray-400 italic'}`}>{displayName}</h3>
                                <button
                                    type="button"
                                    onClick={handleChangeStudent} // Calls resetFormAndSelection
                                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                    disabled={isLoading}
                                >
                                    Change Student / Search Again
                                </button>
                            </div>
                            <p className="text-sm text-gray-600">Admission No: {displayAdmissionNo}</p>
                            <p className="text-sm text-gray-600 mb-3">Class: {displayClass}</p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="bg-white p-2 rounded border">
                                    <span className="font-medium text-gray-500 block">Expected Fees:</span>
                                    <span className="text-gray-800">FCFA {displayExpected.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="font-medium text-gray-500 block">Paid to Date:</span>
                                    <span className="text-green-600">FCFA {displayPaid.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="font-medium text-gray-500 block">Outstanding:</span>
                                    <span className={`font-semibold ${displayBalance > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                        FCFA {displayBalance.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Inputs */} 
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700">Payment Amount (FCFA) *</label>
                                <input
                                    type="number"
                                    id="paymentAmount"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    className={`mt-1 block w-full input-style ${!selectedStudent || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    required
                                    min="0"
                                    disabled={!selectedStudent || isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">Payment Bank *</label>
                                <select
                                    id="paymentMethod"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className={`mt-1 block w-full input-style bg-white ${!selectedStudent || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    required
                                    disabled={!selectedStudent || isLoading}
                                >
                                    <option value="" disabled>Select method</option>
                                    <option value="CCA">CCA</option>
                                    <option value="3DC">3DC</option>
                                    <option value="Express Union">Express Union</option>
                                
                                    {/* Add more methods as needed */} 
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <FormattedDateInput
                                    id="paymentDate"
                                    name="paymentDate"
                                    label="Payment Date *"
                                    value={paymentDate}
                                    onChange={setPaymentDate} // Pass the setter directly
                                    placeholder="DD/MM/YYYY"
                                    required
                                    disabled={!selectedStudent || isLoading}
                                    className={`mt-1 w-full ${!selectedStudent || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    // Optionally pass minYear/maxYear if different from defaults
                                    // minYear={1950}
                                    // maxYear={2030}
                                />
                                {/* Error display is now handled inside FormattedDateInput */}
                            </div>
                            <div>
                                <label htmlFor="paymentDescription" className="block text-sm font-medium text-gray-700">Reference / Description (Optional)</label>
                                <input
                                    type="text"
                                    id="paymentDescription"
                                    value={paymentDescription}
                                    onChange={(e) => setPaymentDescription(e.target.value)}
                                    placeholder="e.g., Receipt #123, Term 1 Fees"
                                    className={`mt-1 block w-full input-style ${!selectedStudent || isLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                    disabled={!selectedStudent || isLoading}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */} 
                        <div className="flex justify-end p-4 border-t mt-6">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn-secondary mr-3"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`btn-primary ${!selectedStudent || isLoading ? 'opacity-50 cursor-not-allowed p-4' : ''}`}
                                disabled={!selectedStudent || isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Recording...
                                    </>
                                ) : (
                                    <>
                                        <CurrencyDollarIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                                        Record Payment
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                   
                </div>
                {/* Spacer to prevent layout jump when results appear/disappear */} 
                <div className="mb-4" style={{ minHeight: (!isLoading && searchResults.length > 0 && searchTerm.length >= 3 && !selectedStudent) ? '12rem' : '0' }}></div>
            </div>
        </div>
    );
};

// ... helper styles ...
const inputStyle = "px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
const btnPrimary = "inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out";
const btnSecondary = "inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out"; 