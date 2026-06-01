// app/dashboard/bursar/reports/page.tsx

"use client";

import { useState, useEffect, useMemo } from 'react';
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import apiService from '../../../../lib/apiService'; // Import apiService
import { toast } from 'react-hot-toast'; // Import toast

// --- Types ---
interface ClassInfo {
  id: number;
  name: string;
}

interface AcademicYearInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
}

interface TermInfo {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  feeDeadline?: string;
}


interface FeeSummaryByClass {
  className: string;
  totalStudents: number;
  totalExpected: number;
  totalPaid: number;
  totalOutstanding: number;
  paymentPercentage: number;
  studentsWithPayments: number;
  studentsWithoutPayments: number;
}

interface StudentDetailedFee {
  studentName: string;
  studentMatricule: string;
  className: string;
  subClassName: string;
  expectedAmount: number;
  paidAmount: number;
  outstanding: number;
  paymentPercentage: number;
  dueDate: string;
  paymentsCount: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

interface PaymentMethodAnalytics {
  paymentMethod: string;
  totalTransactions: number;
  totalAmount: number;
  averageAmount: number;
  uniqueStudents: number;
  marketShare: number;
}

const FinancialReportsPage = () => {
  const [selectedClass, setSelectedClass] = useState<string | number>('all');
  const [academicYear, setAcademicYear] = useState<string | number>('');
  const [term, setTerm] = useState<string | number>('all'); // Retain for future use or filter if API supports
  const [reportType, setReportType] = useState('class'); // class, student, payment-method
  const [isLoading, setIsLoading] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearInfo[]>([]);
  const [terms, setTerms] = useState<TermInfo[]>([]); // Retain for future use
  const [reportData, setReportData] = useState<FeeSummaryByClass[]>([]); // To store class summary data
  const [studentDetailedData, setStudentDetailedData] = useState<StudentDetailedFee[]>([]);
  const [paymentAnalyticsData, setPaymentAnalyticsData] = useState<PaymentMethodAnalytics[]>([]);

  // Fetch filter options: classes, academic years
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setIsLoading(true);
      try {
        const [classesRes, academicYearsRes] = await Promise.all([
          apiService.get<{ data: ClassInfo[] }>('/classes'),
          apiService.get<{ data: AcademicYearInfo[] }>('/academic-years'),
        ]);

        setClasses(classesRes.data || []);
        setAcademicYears(academicYearsRes.data || []);

        // Set initial academic year to current if available
        const currentYear = academicYearsRes.data?.find(ay => ay.isCurrent);
        if (currentYear) {
          setAcademicYear(currentYear.id);
        }

        toast.success("Filter options loaded!");
      } catch (error: any) {
        console.error('Error fetching filter options:', error);
        toast.error(`Failed to load filter options: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFilterOptions();
  }, []);


  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setReportData([]);
    setStudentDetailedData([]);
    setPaymentAnalyticsData([]);

    try {
      const params = new URLSearchParams();

      // Add the new reportType parameter
      const reportTypeMapping = {
        'class': 'summary',
        'student': 'detailed',
        'payment-method': 'analytics'
      };
      params.append('reportType', reportTypeMapping[reportType as keyof typeof reportTypeMapping] || 'detailed');

      // Add filters
      if (academicYear) params.append('academicYearId', String(academicYear));
      if (selectedClass !== 'all') params.append('classId', String(selectedClass));

      const response = await apiService.get<{ data: any; reportType?: string }>(`/fees?${params.toString()}`);

      // Handle different response structures based on report type
      const responseData = response.data;
      const actualReportType = response.reportType || reportTypeMapping[reportType as keyof typeof reportTypeMapping];

      if (actualReportType === 'summary') {
        // Class summary data
        setReportData(responseData || []);
        toast.success('Class fee summary generated successfully!');
      } else if (actualReportType === 'detailed') {
        // Student detailed data
        setStudentDetailedData(responseData || []);
        toast.success('Detailed student fees generated successfully!');
      } else if (actualReportType === 'analytics') {
        // Payment method analytics data
        setPaymentAnalyticsData(responseData || []);
        toast.success('Payment method analytics generated successfully!');
      }

    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(`Failed to generate report: ${error.message}`);
      setReportData([]);
      setStudentDetailedData([]);
      setPaymentAnalyticsData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'csv') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      // Add the new reportType parameter based on current selection
      const reportTypeMapping = {
        'class': 'summary',
        'student': 'detailed',
        'payment-method': 'analytics'
      };
      params.append('reportType', reportTypeMapping[reportType as keyof typeof reportTypeMapping] || 'detailed');

      // Add existing filters
      if (academicYear) params.append('academicYearId', String(academicYear));
      if (selectedClass !== 'all') params.append('classId', String(selectedClass));
      params.append('format', format);

      const url = `/fees/export?${params.toString()}`;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export report: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Enhanced filename with report type
      const reportTypeNames = {
        'class': 'Fee-Summary',
        'student': 'Detailed-Fees',
        'payment-method': 'Payment-Analytics'
      };
      const reportTypeName = reportTypeNames[reportType as keyof typeof reportTypeNames] || 'Financial-Report';
      const classFilter = selectedClass === 'all' ? 'all-classes' : `class-${selectedClass}`;
      const filename = `${reportTypeName}_${academicYear}_${classFilter}.${format}`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`${reportTypeName.replace('-', ' ')} exported as ${format.toUpperCase()}!`);
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'FCFA 0';
    }
    return `FCFA ${amount.toLocaleString('en-CM', { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button
            onClick={() => handleExport('csv')}
            disabled={isLoading}
            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Word</span>
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={isLoading}
            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
          >
            <TableCellsIcon className="w-4 h-4" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={isLoading}
            className="flex items-center space-x-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Report Type Info */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-800">Current Report Type</h3>
            <p className="text-blue-700">
              {reportType === 'class' && '📊 By Class (Fee Summary) - Aggregated fee collection statistics grouped by class'}
              {reportType === 'student' && '👥 By Student (Detailed Fees) - Individual student fee records with payment history'}
              {reportType === 'payment-method' && '💳 By Payment Method (Analytics) - Payment method analysis and trends'}
            </p>
          </div>
          <div className="text-xs text-blue-600 bg-white px-2 py-1 rounded border">
            Export ready: {reportType === 'class' ? 'summary' : reportType === 'student' ? 'detailed' : 'analytics'}
          </div>
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
                <option value="class">By Class (Fee Summary)</option>
                <option value="student">By Student (Detailed Fees)</option>
                <option value="payment-method">By Payment Method (Analytics)</option>
                {/* <option value="date">By Date</option> */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select 
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading || academicYears.length === 0}
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>{year.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 border rounded"
                disabled={isLoading || classes.length === 0}
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Removing Term, Start Date, End Date for initial simplicity based on current API usage */}
            {/* <div>
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
            </div> */}
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              disabled={isLoading || !academicYear}
            >
              {isLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Report Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Report Data</h2>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500">Loading report data...</p>
          </div>
        ) : (
          <>
            {/* Class Summary Report */}
            {reportType === 'class' && reportData.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <h3 className="text-md font-medium text-gray-700">📊 Class Fee Summary</h3>
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{reportData.length} classes</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Class Name</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Total Students</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Expected Amount</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Paid Amount</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Outstanding</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Payment Rate</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Students w/ Payments</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Students w/o Payments</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((item, index) => (
                        <tr key={item?.className || `row-${index}`} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{item?.className || 'N/A'}</td>
                          <td className="py-3 px-4 text-right">{item?.totalStudents || 0}</td>
                          <td className="py-3 px-4 text-right">{formatCurrency(item?.totalExpected)}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(item?.totalPaid)}</td>
                          <td className="py-3 px-4 text-right text-red-600">{formatCurrency(item?.totalOutstanding)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              (item?.paymentPercentage || 0) >= 80 ? 'bg-green-100 text-green-800' :
                              (item?.paymentPercentage || 0) >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {(item?.paymentPercentage || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-green-600">{item?.studentsWithPayments || 0}</td>
                          <td className="py-3 px-4 text-right text-red-600">{item?.studentsWithoutPayments || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Student Detailed Report */}
            {reportType === 'student' && studentDetailedData.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <h3 className="text-md font-medium text-gray-700">👥 Student Fee Details</h3>
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{studentDetailedData.length} students</span>
                </div>
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Student Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Matricule</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Class</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Subclass</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Expected</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Paid</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Outstanding</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Payments</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentDetailedData.map((student, index) => (
                      <tr key={`student-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{student?.studentName || 'N/A'}</td>
                        <td className="py-3 px-4 font-mono text-sm">{student?.studentMatricule || '-'}</td>
                        <td className="py-3 px-4">{student?.className || 'N/A'}</td>
                        <td className="py-3 px-4">{student?.subClassName || '-'}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(student?.expectedAmount)}</td>
                        <td className="py-3 px-4 text-right text-green-600">{formatCurrency(student?.paidAmount)}</td>
                        <td className="py-3 px-4 text-right text-red-600">{formatCurrency(student?.outstanding)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${
                            (student?.paymentPercentage || 0) >= 100 ? 'bg-green-100 text-green-800' :
                            (student?.paymentPercentage || 0) >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {(student?.paymentPercentage || 0) >= 100 ? 'Paid' :
                             (student?.paymentPercentage || 0) > 0 ? `${(student?.paymentPercentage || 0).toFixed(2)}%` : 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{student?.paymentsCount || 0}</td>
                        <td className="py-3 px-4 text-sm">
                          {student?.lastPaymentDate ?
                            <div>
                              <div>{new Date(student.lastPaymentDate).toLocaleDateString()}</div>
                              {student?.lastPaymentAmount &&
                                <div className="text-xs text-gray-500">{formatCurrency(student.lastPaymentAmount)}</div>
                              }
                            </div>
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payment Method Analytics Report */}
            {reportType === 'payment-method' && paymentAnalyticsData.length > 0 && (
              <div>
                <div className="flex items-center mb-4">
                  <h3 className="text-md font-medium text-gray-700">💳 Payment Method Analytics</h3>
                  <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">{paymentAnalyticsData.length} methods</span>
                </div>
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Payment Method</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Transactions</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Total Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Avg Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Unique Students</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Market Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAnalyticsData.map((method, index) => (
                      <tr key={method?.paymentMethod || `method-${index}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{method?.paymentMethod || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">{(method?.totalTransactions || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right text-green-600">{formatCurrency(method?.totalAmount)}</td>
                        <td className="py-3 px-4 text-right">{formatCurrency(method?.averageAmount)}</td>
                        <td className="py-3 px-4 text-right">{method?.uniqueStudents || 0}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center">
                            <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min(method?.marketShare || 0, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{(method?.marketShare || 0).toFixed(2)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* No Data State */}
            {reportData.length === 0 && studentDetailedData.length === 0 && paymentAnalyticsData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg">No report data available</p>
                <p className="text-gray-400 text-sm">Generate a report using the form above to see data here</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialReportsPage;