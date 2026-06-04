'use client';

import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export default function FeeAuditorDashboard() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <ClipboardDocumentCheckIcon className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Fee Auditor</h1>
        <p className="text-gray-600">
          Welcome to the Fee Auditor dashboard. Fee auditing and discrepancy review
          features are coming soon.
        </p>
      </div>
    </div>
  );
}
