"use client";

import { Student } from '../../../fee-management/types';
import { StudentPhoto } from '@/components/ui/StudentPhoto';

// Helper function to format class/subclass display
const formatClassDisplay = (student: Student): string => {
  if (student.subclass) {
    // Student is enrolled in a subclass
    return `${student.class} - ${student.subclass}`;
  } else if (student.class) {
    // Student has class but no subclass (not fully enrolled)
    return `${student.class} (Class Only)`;
  }
  return 'N/A';
};

// Helper function to get styling for enrollment status
const getEnrollmentStatusStyle = (student: Student): string => {
  if (student.subclass) {
    return 'text-gray-400'; // Fully enrolled - normal style
  } else if (student.class) {
    return 'text-orange-500'; // Class only - warning style
  }
  return 'text-gray-400'; // No class info
};

interface CardViewProps {
  students: Student[];
  onRecordPayment: (student: Student) => void;
  onViewHistory: (student: Student) => void;
  onViewTransactions: (student: Student) => void;
}

export const CardView: React.FC<CardViewProps> = ({
  students,
  onRecordPayment,
  onViewHistory,
  onViewTransactions
}) => {
  if (students.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No students found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => (
        <div key={student.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex items-center space-x-3">
              <StudentPhoto
                studentId={parseInt(student.id)}
                photo={student.photo}
                size="sm"
                studentName={student.name}
                fetchPhoto={!student.photo}
                showUploadButton={true}
                canUpload={true}
              />
              <div>
                <h3 className="text-lg font-semibold">{student.name}</h3>
                <p className="text-sm text-gray-500">{student.admissionNumber}</p>
                <p className={`text-xs ${getEnrollmentStatusStyle(student)}`}>
                  {formatClassDisplay(student)}
                </p>
              </div>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full 
              ${student.status === 'Paid' ? 'bg-green-100 text-green-800' :
                student.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'}`}>
              {student.status}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Expected Fees:</span>
              <span className="text-sm font-medium">
                {student.expectedFees.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'XAF',
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Paid:</span>
              <span className="text-sm font-medium">
                {student.paidFees.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'XAF',
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Balance:</span>
              <span className="text-sm font-medium">
                {student.balance.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'XAF',
                  minimumFractionDigits: 0,
                })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-600">Last Payment:</span>
              <span>
                {new Date(student.lastPaymentDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onRecordPayment(student)}
              className="flex-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
            >
              Record Payment
            </button>
            <button
              onClick={() => onViewHistory(student)}
              className="flex-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              History
            </button>
            <button
              onClick={() => onViewTransactions(student)}
              className="flex-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 transition-colors"
            >
              View Transactions
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};