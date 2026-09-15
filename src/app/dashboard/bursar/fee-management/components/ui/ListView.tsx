"use client";

import Link from "next/link";
import { Student } from "../../types";
import { useLanguage } from '@/components/context/LanguageContext';

// Amounts are shown as plain numbers (FCFA implied) to keep columns narrow
const formatAmount = (amount: number) => amount.toLocaleString();

interface ListViewProps {
  students: Student[];
  onRecordPayment: (student: Student) => void;
  onViewTransactions: (student: Student) => void;
}

export const ListView = ({ students, onRecordPayment, onViewTransactions }: ListViewProps) => {
  const { t } = useLanguage();

  // Helper function to format class/subclass display
  const formatClassDisplay = (student: Student): string => {
    if (student.subclass) {
      // Student is enrolled in a subclass
      return `${student.class} - ${student.subclass}`;
    } else if (student.class) {
      // Student has class but no subclass (not fully enrolled)
      return `${student.class} (${t('Class Only')})`;
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

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-3 pt-2 text-right text-[11px] text-gray-400">{t('Amounts in FCFA')}</div>
      <div className="hidden md:block overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Name')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Class / Subclass')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Expected')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Paid')}
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Balance')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Status')}
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('Actions')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {students.map((student) => (
            <tr key={student.id}>
              <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium">
                <Link
                  href={`/dashboard/bursar/student-registration/${student.id}`}
                  className="text-gray-900 hover:text-blue-700 hover:underline"
                  title={t('View student profile')}
                >
                  {student.name}
                </Link>
              </td>
              <td className={`px-3 py-2.5 whitespace-nowrap text-sm ${getEnrollmentStatusStyle(student)}`}>
                {formatClassDisplay(student)}
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
                <button
                  onClick={() => onRecordPayment(student)}
                  className="text-blue-600 hover:text-blue-900 mr-2"
                >
                  {t('Record')}
                </button>
                <button
                  onClick={() => onViewTransactions(student)}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  {t('History')}
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
              href={`/dashboard/bursar/student-registration/${student.id}`}
              className="block text-sm font-semibold text-gray-900 break-words hover:text-blue-700 hover:underline"
              title="View student profile"
            >
              {student.name}
            </Link>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">{t('Class / Subclass')}</span>
              <span className={`text-sm text-right break-words ${getEnrollmentStatusStyle(student)}`}>
                {formatClassDisplay(student)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">{t('Expected')}</span>
              <span className="text-sm text-gray-900 text-right break-words">
                {formatAmount(student.expectedFees)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">{t('Paid')}</span>
              <span className="text-sm text-gray-900 text-right break-words">
                {formatAmount(student.paidFees)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">{t('Balance')}</span>
              <span className={`text-sm text-right break-words ${student.balance > 0 ? 'font-semibold text-red-600' : 'text-gray-900'}`}>
                {formatAmount(student.balance)}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-gray-500">{t('Status')}</span>
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
              <button
                onClick={() => onRecordPayment(student)}
                className="text-sm font-medium text-blue-600 hover:text-blue-900"
              >
                Record
              </button>
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
