"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { Student } from "../../../fee-management/types";

interface FeeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  transactions: any[];
  isLoading: boolean;
}

export const FeeHistoryModal = ({
  isOpen,
  onClose,
  student,
  transactions,
  isLoading
}: FeeHistoryModalProps) => {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CM', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-CM');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Control Fee History</h3>
            <p className="text-sm text-gray-600">{student.name} - {student.matricule}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Student Info */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Class:</span>
              <p className="font-medium">{student.className}</p>
            </div>
            <div>
              <span className="text-gray-600">Total Fees:</span>
              <p className="font-medium">{formatCurrency(student.totalFees)}</p>
            </div>
            <div>
              <span className="text-gray-600">Paid Amount:</span>
              <p className="font-medium text-green-600">{formatCurrency(student.paidAmount)}</p>
            </div>
            <div>
              <span className="text-gray-600">Balance:</span>
              <p className="font-medium text-red-600">{formatCurrency(student.balance)}</p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <h4 className="font-medium text-gray-900 mb-4">Control Fee Payment Transactions</h4>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading transactions...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No control fee transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {transaction.paymentMethod}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {transaction.paymentDate ? formatDate(transaction.paymentDate) : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">Control Fee</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};