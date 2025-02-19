// app/dashboard/bursar/reports/page.tsx

import React from 'react';

const FinancialReportsPage = () => {
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Financial Reports</h1>

      {/* Report Filters */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select className="p-2 border rounded">
            <option>Select Class</option>
            <option>Form 1 South</option>
            <option>Form 2 North</option>
          </select>
          <input type="date" placeholder="Start Date" className="p-2 border rounded" />
          <input type="date" placeholder="End Date" className="p-2 border rounded" />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Generate Report
          </button>
        </form>
      </div>

      {/* Report Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Report Data</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Class</th>
              <th className="text-left py-2">Expected Fees</th>
              <th className="text-left py-2">Collected Fees</th>
              <th className="text-left py-2">Remaining Fees</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">Form 1 South</td>
              <td className="py-2">$50,000</td>
              <td className="py-2">$40,000</td>
              <td className="py-2">$10,000</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Form 2 North</td>
              <td className="py-2">$60,000</td>
              <td className="py-2">$55,000</td>
              <td className="py-2">$5,000</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialReportsPage;