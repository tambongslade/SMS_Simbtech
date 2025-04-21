// app/dashboard/bursar/reports/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const FinancialReportsPage = () => {
  const [selectedClass, setSelectedClass] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('all');
  const [reportType, setReportType] = useState('class'); // class, student, payment-method
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [terms, setTerms] = useState([]);

  // Mock data for now - would be replaced with actual API fetching
  useEffect(() => {
    // Fetch available classes, academic years, and terms
    const fetchFilterOptions = async () => {
      try {
        setIsLoading(true);
        // This would be real API calls in production
        setClasses([
          { id: 1, name: 'Form 1' },
          { id: 2, name: 'Form 2' },
          { id: 3, name: 'Form 3' }
        ]);
        
        setAcademicYears([
          { id: 1, name: '2023-2024' },
          { id: 2, name: '2024-2025' }
        ]);
        
        setTerms([
          { id: 1, name: 'First Term' },
          { id: 2, name: 'Second Term' },
          { id: 3, name: 'Third Term' }
        ]);
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFilterOptions();
  }, []);

  const handleGenerateReport = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Make API call to generate report
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = (format) => {
    setIsLoading(true);
    // API call to export data
    console.log(`Exporting in ${format} format...`);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button 
            onClick={() => handleExport('pdf')} 
            disabled={isLoading}
            className="flex items-center space-x-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700"
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button 
            onClick={() => handleExport('excel')} 
            disabled={isLoading}
            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
          >
            <TableCellsIcon className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Report Filters */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select 
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              >
                <option value="class">By Class</option>
                <option value="student">By Student</option>
                <option value="payment-method">By Payment Method</option>
                <option value="date">By Date</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              >
                <option value="">All Academic Years</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select 
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading || !academicYear}
              >
                <option value="all">All Terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Report Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Report Data</h2>
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Class</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Students</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Expected Fees</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Collected Fees</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Remaining</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Collection Rate</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Express Union</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">CCA</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">3DC</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">Form 1</td>
              <td className="py-3 px-4">45</td>
              <td className="py-3 px-4">₣5,400,000</td>
              <td className="py-3 px-4">₣4,320,000</td>
              <td className="py-3 px-4">₣1,080,000</td>
              <td className="py-3 px-4">80%</td>
              <td className="py-3 px-4">₣2,590,000</td>
              <td className="py-3 px-4">₣1,300,000</td>
              <td className="py-3 px-4">₣430,000</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">Form 2</td>
              <td className="py-3 px-4">38</td>
              <td className="py-3 px-4">₣4,560,000</td>
              <td className="py-3 px-4">₣3,876,000</td>
              <td className="py-3 px-4">₣684,000</td>
              <td className="py-3 px-4">85%</td>
              <td className="py-3 px-4">₣1,876,000</td>
              <td className="py-3 px-4">₣1,500,000</td>
              <td className="py-3 px-4">₣500,000</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </td>
            </tr>
            <tr className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">Form 3</td>
              <td className="py-3 px-4">42</td>
              <td className="py-3 px-4">₣6,300,000</td>
              <td className="py-3 px-4">₣5,670,000</td>
              <td className="py-3 px-4">₣630,000</td>
              <td className="py-3 px-4">90%</td>
              <td className="py-3 px-4">₣2,900,000</td>
              <td className="py-3 px-4">₣1,870,000</td>
              <td className="py-3 px-4">₣900,000</td>
              <td className="py-3 px-4">
                <button className="text-blue-600 hover:text-blue-800">
                  <ArrowDownTrayIcon className="w-5 h-5" />
                </button>
              </td>
            </tr>
            <tr className="font-medium text-gray-800 bg-gray-100">
              <td className="py-3 px-4">Total</td>
              <td className="py-3 px-4">125</td>
              <td className="py-3 px-4">₣16,260,000</td>
              <td className="py-3 px-4">₣13,866,000</td>
              <td className="py-3 px-4">₣2,394,000</td>
              <td className="py-3 px-4">85.3%</td>
              <td className="py-3 px-4">₣7,366,000</td>
              <td className="py-3 px-4">₣4,670,000</td>
              <td className="py-3 px-4">₣1,830,000</td>
              <td className="py-3 px-4"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialReportsPage;