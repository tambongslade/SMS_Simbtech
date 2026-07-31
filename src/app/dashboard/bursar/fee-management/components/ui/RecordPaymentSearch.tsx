"use client";

import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { Student } from '../../types';

interface RecordPaymentSearchProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    results: Student[];
    isSearching: boolean;
    onSelectStudent: (student: Student) => void;
}

const formatMoney = (amount: number) => amount.toLocaleString();

const statusClasses: Record<string, string> = {
    Paid: 'bg-green-100 text-green-800',
    Partial: 'bg-yellow-100 text-yellow-800',
    Unpaid: 'bg-red-100 text-red-800',
};

// Search bar with a results popup: type a student's name or matricule, pick the
// student, and the normal record-payment modal opens for them.
export const RecordPaymentSearch: React.FC<RecordPaymentSearchProps> = ({
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    onSelectStudent,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close the popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showResults = isOpen && searchTerm.trim().length >= 2;

    return (
        <div className="bg-white rounded-lg shadow-md border border-blue-100 p-4 sm:p-5">
            <label htmlFor="record-payment-search" className="block text-sm font-semibold text-gray-800">
                Record a payment
            </label>
            <p className="text-xs text-gray-500 mb-2">Search the student, pick them from the list, and enter the payment.</p>
            <div ref={containerRef} className="relative">
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        id="record-payment-search"
                        type="text"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        placeholder="Student name or matricule…"
                        className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

            {showResults && (
                <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {isSearching ? (
                        <p className="p-4 text-sm text-gray-500">Searching…</p>
                    ) : results.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">No students found for &quot;{searchTerm.trim()}&quot;.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {results.map((student) => (
                                <li key={`${student.id}-${student.feeId}`}>
                                    <button
                                        type="button"
                                        onClick={() => { onSelectStudent(student); setIsOpen(false); }}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {student.admissionNumber} · {student.subclass || student.class}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="text-right">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[student.status] || 'bg-gray-100 text-gray-700'}`}>
                                                    {student.status}
                                                </span>
                                                {student.balance > 0 && (
                                                    <p className="mt-0.5 text-xs font-semibold text-red-600">{formatMoney(student.balance)} FCFA owing</p>
                                                )}
                                            </div>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium">
                                                <BanknotesIcon className="h-4 w-4" /> Record
                                            </span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
            </div>
        </div>
    );
};
