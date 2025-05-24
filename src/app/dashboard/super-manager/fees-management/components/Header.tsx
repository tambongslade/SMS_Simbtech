"use client";

import { CurrencyDollarIcon, UserPlusIcon } from "@heroicons/react/24/outline";

interface HeaderProps {
  setShowStudentModal: (show: boolean) => void;
  openSearchablePaymentModal: () => void;
}

export const Header = ({ setShowStudentModal, openSearchablePaymentModal }: HeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Fee Management</h1>
        <p className="text-gray-600">Manage student fees and payments</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={openSearchablePaymentModal}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center transition duration-150 ease-in-out"
        >
          <CurrencyDollarIcon className="w-5 h-5 mr-2" />
          Record Payment
        </button>
        <button
          onClick={() => setShowStudentModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition duration-150 ease-in-out"
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Add Student
        </button>
      </div>
    </div>
  );
};