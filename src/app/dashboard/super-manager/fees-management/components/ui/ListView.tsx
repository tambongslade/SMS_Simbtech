"use client";

import { Student } from "../../types";
import Link from 'next/link';

interface ListViewProps {
  students: Student[];
  onRecordPayment: (student: Student) => void;
  // onViewHistory?: (student: Student) => void;
}

export const ListView = ({ students, onRecordPayment }: ListViewProps) => {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Class
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
                <Link href={`/dashboard/super-manager/student/${student.id}`} className="text-blue-600 hover:underline">
                  {student.name}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {student.class}
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

              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onRecordPayment(student)}
                  className="text-green-600 hover:text-green-900 font-medium"
                  title="Record Payment"
                >
                  Record Payment
                </button>
                <Link
                  href={`/dashboard/super-manager/student/${student.id}`}
                  className="text-indigo-600 hover:text-indigo-900 font-medium"
                  title="View Details"
                >
                  Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};