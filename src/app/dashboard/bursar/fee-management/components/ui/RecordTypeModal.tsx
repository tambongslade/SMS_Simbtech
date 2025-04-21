"use client";

import React from 'react';
// Make sure this path points to your reusable Modal component
// If Modal.tsx is in src/components/ui/Modal.tsx, this path should work.
import { Modal } from '@/components/ui/Modal';
import { UserPlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface RecordTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewStudentClick: () => void;
  onExistingStudentClick: () => void;
}

export const RecordTypeModal: React.FC<RecordTypeModalProps> = ({
  isOpen,
  onClose,
  onNewStudentClick,
  onExistingStudentClick,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment For...">
      <div className="p-6 space-y-4">
        <p className="text-gray-600">Is this payment for a new student or an existing one?</p>
        <div className="flex justify-around gap-4 pt-4">
          <button
            onClick={onNewStudentClick}
            className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out w-1/2"
          >
            <UserPlusIcon className="w-10 h-10 text-blue-600 mb-2" />
            <span className="text-lg font-medium text-gray-700">New Student</span>
          </button>
          <button
            onClick={onExistingStudentClick}
            className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out w-1/2"
          >
            <UserGroupIcon className="w-10 h-10 text-green-600 mb-2" />
            <span className="text-lg font-medium text-gray-700">Existing Student</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
// Make sure this path points to your reusable Modal component
// If Modal.tsx is in src/components/ui/Modal.tsx, this path should work.
import { Modal } from '@/components/ui/Modal';
import { UserPlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';

interface RecordTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewStudentClick: () => void;
  onExistingStudentClick: () => void;
}

export const RecordTypeModal: React.FC<RecordTypeModalProps> = ({
  isOpen,
  onClose,
  onNewStudentClick,
  onExistingStudentClick,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment For...">
      <div className="p-6 space-y-4">
        <p className="text-gray-600">Is this payment for a new student or an existing one?</p>
        <div className="flex justify-around gap-4 pt-4">
          <button
            onClick={onNewStudentClick}
            className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out w-1/2"
          >
            <UserPlusIcon className="w-10 h-10 text-blue-600 mb-2" />
            <span className="text-lg font-medium text-gray-700">New Student</span>
          </button>
          <button
            onClick={onExistingStudentClick}
            className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 ease-in-out w-1/2"
          >
            <UserGroupIcon className="w-10 h-10 text-green-600 mb-2" />
            <span className="text-lg font-medium text-gray-700">Existing Student</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
