'use client';

import React, { useEffect } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    amount: string;
}

export const PaymentConfirmationModal: React.FC<PaymentConfirmationModalProps> = ({
    isOpen,
    onClose,
    studentName,
    amount,
}) => {
    // Auto-close after a delay
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); // Close after 3 seconds
            return () => clearTimeout(timer); // Cleanup timer on unmount or if isOpen changes
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Use a simpler overlay, perhaps positioned fixed at the top or bottom?
    // Or a small centered modal box.
    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="relative bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full text-center">
                {/* Optional: Close button if auto-close is not desired or as fallback */}
                {/* <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button> */}

                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700">Payment Recorded!</p>
                <p className="text-md text-gray-600 mt-2">
                    FCFA {amount} recorded for {studentName}.
                </p>
            </div>
        </div>
    );
}; 