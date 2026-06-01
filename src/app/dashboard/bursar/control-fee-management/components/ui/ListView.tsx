"use client";

import { Student } from "../../../fee-management/types";

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
    return 'text-gray-500'; // Fully enrolled - normal style
  } else if (student.class) {
    return 'text-orange-500 font-medium'; // Class only - warning style
  }
  return 'text-gray-500'; // No class info
};

interface ListViewProps {
  students: Student[];
  onRecordPayment: (student: Student) => void;
  onViewTransactions: (student: Student) => void;
}

export const ListView = ({ students, onRecordPayment, onViewTransactions }: ListViewProps) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class / Subclass
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expected Fees
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Paid Fees
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Balance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student) => (
            <tr key={student.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {student.name}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-sm ${getEnrollmentStatusStyle(student)}`}>
                {formatClassDisplay(student)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {student.expectedFees.toLocaleString("en-US", {
                  style: "currency",
                  currency: "XAF",
                  minimumFractionDigits: 0,
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {student.paidFees.toLocaleString("en-US", {
                  style: "currency",
                  currency: "XAF",
                  minimumFractionDigits: 0,
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {student.balance.toLocaleString("en-US", {
                  style: "currency",
                  currency: "XAF",
                  minimumFractionDigits: 0,
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full 
                    ${student.status === "Paid" ? "bg-green-100 text-green-800" :
                      student.status === "Partial" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"}`}
                >
                  {student.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onRecordPayment(student)}
                  className="text-blue-600 hover:text-blue-900 mr-2"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => onViewTransactions(student)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  View Transactions
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};