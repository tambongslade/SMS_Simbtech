'use client';

import { useState } from 'react';

interface FeeStructure {
  id: string;
  class: string;
  term: string;
  tuitionFee: number;
  libraryFee: number;
  sportsFee: number;
  laboratoryFee: number;
  totalFee: number;
}

interface PaymentSummary {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  lastMonthCollection: number;
  currentMonthCollection: number;
}

export default function FeeManagement() {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('2023-2024-2');

  // Dummy data - will be replaced with API calls
  const feeStructures: FeeStructure[] = [
    {
      id: 'FS001',
      class: '10A',
      term: '2023-2024-2',
      tuitionFee: 50000,
      libraryFee: 2000,
      sportsFee: 1500,
      laboratoryFee: 3000,
      totalFee: 56500,
    },
    {
      id: 'FS002',
      class: '9B',
      term: '2023-2024-2',
      tuitionFee: 45000,
      libraryFee: 2000,
      sportsFee: 1500,
      laboratoryFee: 3000,
      totalFee: 51500,
    },
    // Add more dummy data as needed
  ];

  const paymentSummary: PaymentSummary = {
    totalExpected: 5650000,
    totalCollected: 4237500,
    totalOutstanding: 1412500,
    lastMonthCollection: 850000,
    currentMonthCollection: 625000,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Fee Management</h1>
        <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
          Update Fee Structure
        </button>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Total Expected</h3>
          <p className="text-2xl font-bold text-gray-800">
            {paymentSummary.totalExpected.toLocaleString('en-US', {
              style: 'currency',
              currency: 'XAF',
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Total Collected</h3>
          <p className="text-2xl font-bold text-green-600">
            {paymentSummary.totalCollected.toLocaleString('en-US', {
              style: 'currency',
              currency: 'XAF',
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Outstanding</h3>
          <p className="text-2xl font-bold text-red-600">
            {paymentSummary.totalOutstanding.toLocaleString('en-US', {
              style: 'currency',
              currency: 'XAF',
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">Last Month</h3>
          <p className="text-2xl font-bold text-blue-600">
            {paymentSummary.lastMonthCollection.toLocaleString('en-US', {
              style: 'currency',
              currency: 'XAF',
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-medium text-gray-500">This Month</h3>
          <p className="text-2xl font-bold text-purple-600">
            {paymentSummary.currentMonthCollection.toLocaleString('en-US', {
              style: 'currency',
              currency: 'XAF',
              minimumFractionDigits: 0,
            })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          <option value="10A">Class 10A</option>
          <option value="9B">Class 9B</option>
          <option value="8C">Class 8C</option>
        </select>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
        >
          <option value="2023-2024-2">Term 2 (2023-2024)</option>
          <option value="2023-2024-1">Term 1 (2023-2024)</option>
        </select>
      </div>

      {/* Fee Structure Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tuition Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Library Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sports Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laboratory Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feeStructures.map((fee) => (
                <tr key={fee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    Class {fee.class}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fee.tuitionFee.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'XAF',
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fee.libraryFee.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'XAF',
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fee.sportsFee.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'XAF',
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fee.laboratoryFee.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'XAF',
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {fee.totalFee.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'XAF',
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-green-600 hover:text-green-900 mr-4">Edit</button>
                    <button className="text-blue-600 hover:text-blue-900">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors">
            Record Payment
          </button>
          <button className="p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors">
            Generate Report
          </button>
          <button className="p-4 bg-yellow-50 rounded-lg text-yellow-700 hover:bg-yellow-100 transition-colors">
            Send Reminders
          </button>
          <button className="p-4 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors">
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
} 