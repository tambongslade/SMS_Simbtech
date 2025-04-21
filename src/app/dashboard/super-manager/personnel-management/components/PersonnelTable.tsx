'use client'
import React from 'react';

// Define types needed by the table (can be imported from a shared types file or hook)
type Personnel = {
  id: number;
  name: string;
  roles: string[];
  username?: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  dateJoined?: string;
};

type Role = {
  value: string;
  label: string;
};

interface PersonnelTableProps {
  personnel: Personnel[];
  isLoading: boolean;
  roles: Role[]; // Pass the roles definition for label lookup
  onEdit: (person: Personnel) => void;
  onManageRoles: (person: { id: number; name: string; roles: string[] }) => void;
  onDelete: (person: { id: number; name: string }) => void;
}

export const PersonnelTable: React.FC<PersonnelTableProps> = ({
  personnel,
  isLoading,
  roles,
  onEdit,
  onManageRoles,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          {/* Table Head */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Personnel Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          {/* Table Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Empty/Loading States */} 
            {personnel.length === 0 && !isLoading && (
                <tr><td colSpan={6} className="text-center py-4 text-gray-500">No personnel found.</td></tr>
            )}
            {isLoading && personnel.length === 0 && ( 
                <tr><td colSpan={6} className="text-center py-4 text-gray-500 italic">Loading personnel...</td></tr>
            )}
            {/* Table Rows */} 
            {personnel.map((person) => (
              <tr key={person.id} className="hover:bg-gray-50">
                {/* Personnel Details Cell */} 
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                      {person.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{person.name}</div>
                      <div className="text-sm text-gray-500">{person.email}</div>
                       {person.username && <div className="text-sm text-gray-400">@{person.username}</div>}
                    </div>
                  </div>
                </td>
                {/* Roles Cell */} 
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {person.roles && person.roles.length > 0 ? (
                      person.roles.map(roleKey => {
                        const roleLabel = roles.find(r => r.value === roleKey)?.label || roleKey;
                        return (
                          <span 
                            key={roleKey} 
                            className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
                          >
                            {roleLabel}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-gray-500 italic">No roles assigned</span>
                    )}
                  </div>
                </td>
                {/* Contact Cell */} 
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{person.phone || '-'}</td>
                {/* Date Joined Cell */} 
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{person.dateJoined || '-'}</td>
                {/* Status Cell */} 
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${ person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800' }`}>
                    {person.status}
                  </span>
                </td>
                {/* Actions Cell - Use handlers passed via props */} 
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button onClick={() => onEdit(person)} className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50" disabled={isLoading}>Edit</button>
                  <button onClick={() => onManageRoles({ id: person.id, name: person.name, roles: person.roles })} className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50" disabled={isLoading}>Manage Roles</button>
                  <button onClick={() => onDelete({ id: person.id, name: person.name })} className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50" disabled={isLoading}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 