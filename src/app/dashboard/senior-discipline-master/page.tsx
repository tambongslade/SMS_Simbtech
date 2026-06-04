'use client';

import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export default function SeniorDisciplineMasterDashboard() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <ClipboardDocumentListIcon className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Senior Discipline Master</h1>
        <p className="text-gray-600">
          Welcome to the Senior Discipline Master dashboard. Aggregated discipline
          reporting features are coming soon.
        </p>
      </div>
    </div>
  );
}
