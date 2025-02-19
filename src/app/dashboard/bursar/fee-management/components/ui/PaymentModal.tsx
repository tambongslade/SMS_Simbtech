"use client";

import { XMarkIcon } from '@heroicons/react/24/outline';
import { Student } from '../../types';

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
  isLoading: boolean;
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
  isLoading
}) => {
  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePayment();
  };

  // Auto-fill the payment amount based on the selected payment type
  const handlePaymentTypeChange = (type: string) => {
    setSelectedPaymentType(type);
    if (type === 'full' && student) {
      setPaymentAmount(student.balance.toString());
    } else {
      setPaymentAmount('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Record Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="font-medium">{student.name}</p>
            <p className="text-sm text-gray-500">{student.admissionNumber}</p>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="flex justify-between text-sm">
                <span>Expected Fees:</span>
                <span>{student.expectedFees.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'XAF',
                  minimumFractionDigits: 0,
                })}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Paid to Date:</span>
                <span>{student.paidFees.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'XAF',
                  minimumFractionDigits: 0,
                })}</span>
              </div>
              <div className="flex justify-between text-sm mt-1 font-medium">
                <span>Outstanding Balance:</span>
                <span>{student.balance.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'XAF',
                  minimumFractionDigits: 0,
                })}</span>
              </div>
            </div>
          </div>

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
              max={student.balance.toString()}
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
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isLoading}
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
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

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            disabled={isLoading || !paymentAmount}
          >
            {isLoading ? 'Processing...' : 'Record Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};