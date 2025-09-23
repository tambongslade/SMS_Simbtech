"use client";

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface SubclassSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: {
    subClassId: number;
    subClassName: string;
    className: string;
    academicYearId: number;
    totalStudentsWithFees: number;
    totalExpected: number;
    totalPaid: number;
    outstanding: number;
    paymentPercentage: number;
  } | null;
  isLoading: boolean;
}

export const SubclassSummaryModal: React.FC<SubclassSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  isLoading,
}) => {
  if (!isOpen) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800';
    if (percentage >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subclass Fees Summary">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : summary ? (
          <>
            {/* Header Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {summary.className} - {summary.subClassName}
              </h3>
              <p className="text-sm text-gray-600">
                Academic Year ID: {summary.academicYearId}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Students</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {summary.totalStudentsWithFees}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Payment Status</div>
                  <div className="flex items-center">
                    <div className={`text-2xl font-bold ${getStatusColor(summary.paymentPercentage)}`}>
                      {summary.paymentPercentage.toFixed(1)}%
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(summary.paymentPercentage)}`}>
                      {summary.paymentPercentage >= 80 ? 'Excellent' : 
                       summary.paymentPercentage >= 60 ? 'Good' : 'Needs Attention'}
                    </span>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Expected</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatAmount(summary.totalExpected)}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Total Paid</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmount(summary.totalPaid)}
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-2">
                <div className="p-4">
                  <div className="text-sm text-gray-600 mb-1">Outstanding Amount</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatAmount(summary.outstanding)}
                  </div>
                </div>
              </Card>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment Progress</span>
                <span>{summary.paymentPercentage.toFixed(1)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    summary.paymentPercentage >= 80 ? 'bg-green-500' :
                    summary.paymentPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(summary.paymentPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Collection Summary */}
            <Card>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Financial Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Amount:</span>
                    <span className="font-medium">{formatAmount(summary.totalExpected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Collected Amount:</span>
                    <span className="font-medium text-green-600">{formatAmount(summary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding:</span>
                    <span className="font-medium text-red-600">{formatAmount(summary.outstanding)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collection Rate:</span>
                      <span className={`font-semibold ${getStatusColor(summary.paymentPercentage)}`}>
                        {summary.paymentPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No summary data available</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};