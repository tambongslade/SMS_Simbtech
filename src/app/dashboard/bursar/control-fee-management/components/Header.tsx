"use client";

import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

interface HeaderProps {
  setShowStudentModal: (show: boolean) => void;
  setShowPaymentModal: (show: boolean) => void;
}

export const Header = ({ setShowStudentModal, setShowPaymentModal }: HeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Control Fee Management</h1>
        <p className="text-gray-600">Manage control fees for validation and audit purposes</p>
        <div className="flex items-center gap-4 text-xs mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-blue-600">Control System - Cross-verification</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-gray-500">Fully Enrolled (Class - Subclass)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-orange-500">Class Only (Pending Enrollment)</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {/* Record Payment Button */}
        <button
          onClick={() => setShowPaymentModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <CurrencyDollarIcon className="w-5 h-5 mr-2" />
          Record Payment
        </button>
      </div>
    </div>
  );
};