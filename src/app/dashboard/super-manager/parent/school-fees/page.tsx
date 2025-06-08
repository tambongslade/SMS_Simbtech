import React from 'react';

const mockFees = [
  { id: 1, name: 'John Doe', matricule: 'STU001', total: '-', paid: '-', balance: '-' },
  { id: 2, name: 'Jane Doe', matricule: 'STU002', total: '-', paid: '-', balance: '-' },
];

export default function ParentSchoolFeesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">School Fees</h1>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockFees.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">No fee data found.</td></tr>
            ) : (
              mockFees.map((fee) => (
                <tr key={fee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fee.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fee.matricule}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fee.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fee.paid}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fee.balance}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 