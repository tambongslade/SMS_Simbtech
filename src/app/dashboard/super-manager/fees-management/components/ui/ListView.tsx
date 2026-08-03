"use client";

import Link from "next/link";
import { Student } from "../../types";

// Amounts are shown as plain numbers (FCFA implied) to keep columns narrow
const formatAmount = (amount: number) => amount.toLocaleString();

interface ListViewProps {
  students: Student[];
  onRecordPayment?: (student: Student) => void;
  onViewTransactions: (student: Student) => void;
}

export const ListView = ({ students, onRecordPayment, onViewTransactions }: ListViewProps) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-3 pt-2 text-right text-[11px] text-gray-400">Amounts in FCFA</div>
      <div className="hidden md:block overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expected
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Paid
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Balance
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student) => (
            <tr key={student.id}>
              <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium">
                <Link
                  href={`/dashboard/super-manager/student-management/${student.id}`}
                  className="text-gray-900 hover:text-blue-700 hover:underline"
                  title="View student"
                >
                  {student.name}
                </Link>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500">
                {student.class}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500 text-right">
                {formatAmount(student.expectedFees)}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-sm text-gray-500 text-right">
                {formatAmount(student.paidFees)}
              </td>
              <td className={`px-3 py-2.5 whitespace-nowrap text-sm text-right ${student.balance > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                {formatAmount(student.balance)}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full
                    ${student.status === "Paid" ? "bg-green-100 text-green-800" :
                      student.status === "Partial" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"}`}
                >
                  {student.status}
                </span>
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium">
                {onRecordPayment && (
                <button
                  onClick={() => onRecordPayment?.(student)}
                  className="text-blue-600 hover:text-blue-900 mr-2"
                >
                  Record
                </button>
                )}
                <button
                  onClick={() => onViewTransactions(student)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  History
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="md:hidden divide-y divide-gray-100">
        {students.map((student) => (
          <div key={student.id} className="p-4 space-y-1.5">
            <Link
              href={`/dashboard/super-manager/student-management/${student.id}`}
              className="block text-sm font-semibold text-gray-900 break-words hover:text-blue-700 hover:underline"
              title="View student"
            >
              {student.name}
            </Link>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">Class</span>
              <span className="text-sm text-gray-900 text-right break-words">{student.class}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">Expected</span>
              <span className="text-sm text-gray-900 text-right break-words">{formatAmount(student.expectedFees)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">Paid</span>
              <span className="text-sm text-gray-900 text-right break-words">{formatAmount(student.paidFees)}</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">Balance</span>
              <span className={`text-sm text-right break-words ${student.balance > 0 ? 'font-semibold text-red-600' : 'text-gray-900'}`}>
                {formatAmount(student.balance)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">Status</span>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full
                  ${student.status === "Paid" ? "bg-green-100 text-green-800" :
                    student.status === "Partial" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"}`}
              >
                {student.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1.5">
              {onRecordPayment && (
              <button
                onClick={() => onRecordPayment?.(student)}
                className="text-sm font-medium text-blue-600 hover:text-blue-900"
              >
                Record
              </button>
              )}
              <button
                onClick={() => onViewTransactions(student)}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
              >
                History
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
