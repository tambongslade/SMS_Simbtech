'use client'
import React from 'react';

type Role = {
  value: string;
  label: string;
};

interface PersonnelFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedRoleFilter: string;
  setSelectedRoleFilter: (value: string) => void;
  roles: Role[]; // For the dropdown
  isLoading: boolean; // To potentially disable filters during load
  resultCount: number; // To display the count
}

export const PersonnelFilters: React.FC<PersonnelFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedRoleFilter,
  setSelectedRoleFilter,
  roles,
  isLoading,
  resultCount
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search by name, email, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
        <div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end text-gray-600">
         {isLoading ? <span className="italic">Loading...</span> : <span>{resultCount} personnel found</span>}
        </div>
      </div>
    </div>
  );
}; 