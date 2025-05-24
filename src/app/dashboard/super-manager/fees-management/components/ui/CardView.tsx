"use client";

import { Student } from '../../types';
import Link from 'next/link';

interface CardViewProps {
  students: Student[];
  onViewHistory: (student: Student) => void;
}

export const CardView: React.FC<CardViewProps> = ({
  students,
  onViewHistory
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
            <div>
              <Link href={`/dashboard/super-manager/student/${student.id}`} className="hover:underline">
                <h3 className="text-lg font-semibold text-blue-700">{student.name}</h3>
              </Link>
              <p className="text-sm text-gray-500">{student.admissionNumber}</p>
              <p className="text-xs text-gray-400">Class {student.class}</p>
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
            {student.lastPaymentDate && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Last Payment:</span>
                <span>
                  {new Date(student.lastPaymentDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => onViewHistory(student)}
              className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded text-sm hover:bg-gray-200 transition-colors"
            >
              View History
            </button>
            <Link
              href={`/dashboard/super-manager/student/${student.id}`}
              className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-sm hover:bg-indigo-200 transition-colors"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};