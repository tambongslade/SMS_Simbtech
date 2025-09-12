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

interface FeeRecord {
  id: number;
  amountExpected: number;
  amountPaid: number;
  dueDate: string;
  enrollmentId: number;
  academicYearId: number;
  enrollment: {
    id: number;
    studentId: number;
    subClassId: number;
    student: { id: number; name: string; matricule: string; };
    subClass: { id: number; name: string; classId: number; class: { id: number; name: string; }; };
  };
  paymentTransactions: Array<{ amount: number; paymentMethod: string; }>;
}

interface FeeSummaryByClass {
  classId: number;
  className: string;
  totalStudentsWithFees: number;
  totalExpected: number;
  totalPaid: number;
  outstanding: number;
  paymentPercentage: number;
  paymentsByMethod: { EXPRESS_UNION: number; CCA: number; F3DC: number;[key: string]: number; }; // Dynamic methods
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
  const [reportData, setReportData] = useState<FeeSummaryByClass[]>([]); // To store aggregated data
  const [rawFeeRecords, setRawFeeRecords] = useState<FeeRecord[]>([]); // To store raw fee data for detailed view/export

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

  // Aggregate raw fee data into summary by class (for 'class' report type)
  const aggregateFeeData = (fees: FeeRecord[]): FeeSummaryByClass[] => {
    const classMap = new Map<number, FeeSummaryByClass>();

    fees.forEach(fee => {
      const classId = fee.enrollment.subClass.class.id;
      const className = fee.enrollment.subClass.class.name;

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          classId,
          className,
          totalStudentsWithFees: 0,
          totalExpected: 0,
          totalPaid: 0,
          outstanding: 0,
          paymentPercentage: 0,
          paymentsByMethod: { EXPRESS_UNION: 0, CCA: 0, F3DC: 0 },
        });
      }

      const classSummary = classMap.get(classId)!;
      classSummary.totalStudentsWithFees += 1; // Assuming each fee record is for one student in a class
      classSummary.totalExpected += fee.amountExpected;
      classSummary.totalPaid += fee.amountPaid;
      classSummary.outstanding += (fee.amountExpected - fee.amountPaid);

      fee.paymentTransactions.forEach(transaction => {
        if (classSummary.paymentsByMethod[transaction.paymentMethod] !== undefined) {
          classSummary.paymentsByMethod[transaction.paymentMethod] += transaction.amount;
        } else {
          classSummary.paymentsByMethod[transaction.paymentMethod] = transaction.amount; // Handle new methods dynamically
        }
      });
    });

    // Calculate percentage and convert Map values to array
    return Array.from(classMap.values()).map(summary => ({
      ...summary,
      paymentPercentage: summary.totalExpected > 0 ? (summary.totalPaid / summary.totalExpected) * 100 : 0,
    }));
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setReportData([]);
    setRawFeeRecords([]);

    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYearId', String(academicYear));
      if (selectedClass !== 'all') params.append('classId', String(selectedClass));
      // Add other filters if API supports them (e.g., startDate, endDate, term)
      // if (startDate) params.append('startDate', startDate);
      // if (endDate) params.append('endDate', endDate);
      // if (term !== 'all') params.append('termId', String(term)); // Assuming API accepts termId

      let endpoint = '';
      let toastMessage = '';

      switch (reportType) {
        case 'class':
          endpoint = '/fees'; // Will fetch all fees and aggregate by class
          toastMessage = 'Class financial report generated!';
          break;
        case 'student':
          endpoint = '/fees'; // Will need to filter by student name/matricule (not implemented yet)
          toastMessage = 'Student financial report generated!';
          break;
        case 'payment-method':
          endpoint = '/bursar/collection-analytics';
          toastMessage = 'Payment method report generated!';
          break;
        case 'date': // Use fees endpoint with date filters
          endpoint = '/fees';
          toastMessage = 'Date-wise financial report generated!';
          break;
        default:
          toast.error("Invalid report type selected.");
          setIsLoading(false);
          return;
      }

      const response = await apiService.get<{ data: { data: FeeRecord[] } | any }>(`${endpoint}?${params.toString()}`);

      if (reportType === 'class' || reportType === 'student' || reportType === 'date') {
        const fetchedFees = response.data.data || [];
        setRawFeeRecords(fetchedFees); // Store raw data for detailed view/export
        const aggregatedData = aggregateFeeData(fetchedFees);
        setReportData(aggregatedData);
      } else if (reportType === 'payment-method') {
        // For collection-analytics, the data structure is different
        const paymentMethodData = response.data.paymentMethods || [];
        // Need to transform this data to fit the table or create a new table for it
        // For now, setting it as raw fees for simplicity in the table display
        setReportData(paymentMethodData.map((pm: any) => ({ // Dummy mapping for now
          classId: 0, className: pm.method, totalStudentsWithFees: pm.count, totalExpected: pm.totalAmount,
          totalPaid: pm.totalAmount, outstanding: 0, paymentPercentage: 100,
          paymentsByMethod: { [pm.method]: pm.totalAmount }
        })));
      }

      toast.success(toastMessage);
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast.error(`Failed to generate report: ${error.message}`);
      setReportData([]);
      setRawFeeRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'csv') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (academicYear) params.append('academicYearId', String(academicYear));
      if (selectedClass !== 'all') params.append('classId', String(selectedClass));
      // Add other relevant filters (startDate, endDate, paymentStatus etc. based on API)
      // params.append('paymentStatus', 'all'); // Example
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
      const filename = `financial_report_${academicYear}_${selectedClass === 'all' ? 'all_classes' : selectedClass}.${format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`Report exported as ${format.toUpperCase()}!`);
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `FCFA ${amount.toLocaleString('en-CM', { minimumFractionDigits: 0 })}`;
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
            onClick={() => handleExport('docx')} 
            disabled={isLoading}
            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Export DOCX</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isLoading}
            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span>Export CSV</span>
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
        {isLoading && reportData.length === 0 ? (
          <p className="text-gray-500">Loading report data...</p>
        ) : reportData.length > 0 ? (
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Class Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Students with Fees</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Total Expected</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Total Collected</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Outstanding</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Collection Rate</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Express Union</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">CCA</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">3DC</th>
            </tr>
          </thead>
          <tbody>
              {reportData.map((item, index) => (
                <tr key={item.classId || `row-${index}`} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">{item.className}</td>
                  <td className="py-3 px-4">{item.totalStudentsWithFees}</td>
                  <td className="py-3 px-4">{formatCurrency(item.totalExpected)}</td>
                  <td className="py-3 px-4">{formatCurrency(item.totalPaid)}</td>
                  <td className="py-3 px-4">{formatCurrency(item.outstanding)}</td>
                  <td className="py-3 px-4">{item.paymentPercentage.toFixed(2)}%</td>
                  <td className="py-3 px-4">{formatCurrency(item.paymentsByMethod.EXPRESS_UNION || 0)}</td>
                  <td className="py-3 px-4">{formatCurrency(item.paymentsByMethod.CCA || 0)}</td>
                  <td className="py-3 px-4">{formatCurrency(item.paymentsByMethod.F3DC || 0)}</td>
            </tr>
              ))}
          </tbody>
        </table>
        ) : (
          <p className="text-gray-500">Generate a report to see data.</p>
        )}
      </div>
    </div>
  );
};

export default FinancialReportsPage;