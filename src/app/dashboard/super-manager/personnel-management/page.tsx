'use client'
import React from 'react'; // Removed useState, useEffect as they are in the hook
import { toast } from 'react-hot-toast';
import { UserPlusIcon, PencilSquareIcon, TrashIcon, KeyIcon, UserGroupIcon } from '@heroicons/react/24/outline';
// import apiService from '../../../../lib/apiService'; // Now handled by the hook
// import Image from 'next/image'; // Not used in the target structure
// import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'; // Not used in target structure

import { usePersonnelManagement, Personnel } from './hooks/usePersonnelManagement';
import { PersonnelTable } from './components/PersonnelTable';
import { PersonnelFilters } from './components/PersonnelFilters';
import { AddEditPersonnelModal } from './components/AddEditPersonnelModal';
import { ManageUserRolesModal } from './components/ManageUserRolesModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
// import { LinkStudentToParentModal } from './components/LinkStudentToParentModal'; // REMOVED

// Types are now primarily managed within the hook or its imported types
// interface Personnel { ... } // Defined in hook
// interface RoleAssignment { ... } // Not directly used here

// RoleManagementCard component is removed as per refactoring goal

// Main Page Component for Personnel Management
export default function PersonnelManagement() {
  const {
    personnel,
    isLoading,
    isMutating,
    fetchError,
    searchTerm,
    setSearchTerm,
    selectedRoleFilter,
    setSelectedRoleFilter,
    roles, // Available roles from the hook
    // Add/Edit Modal
    isAddEditModalOpen,
    editingPersonnel,
    formData,
    setFormData,
    openAddModal,
    openEditModal,
    handleCreateUser,
    handleUpdatePersonnel,
    // Role Modal
    isRoleModalOpen,
    userForRoleAssignment,
    selectedRoles,
    setSelectedRoles,
    openRoleAssignmentModal,
    handleAssignRoles,
    // Delete Modal
    isConfirmDeleteModalOpen,
    personnelToDelete,
    openDeleteConfirmationModal,
    confirmAndDeletePersonnel,
    // Link Student Modal related items REMOVED from destructuring
    // isLinkStudentModalOpen,
    // linkingParentUser,
    // allStudents,
    // selectedStudentToLink,
    // setSelectedStudentToLink,
    // openLinkStudentModal,
    // handleLinkToStudent,
    // fetchAllStudentsForLinking,
    closeModal // General close modal function
  } = usePersonnelManagement();

  const filteredPersonnel = personnel.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      p.name.toLowerCase().includes(term) ||
      (p.email && p.email.toLowerCase().includes(term)) ||
      (p.username && p.username.toLowerCase().includes(term));
    const matchesRole = selectedRoleFilter === 'all' || (p.roles && p.roles.includes(selectedRoleFilter));
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-full mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personnel Management</h1>
              <p className="text-gray-600 mt-1">Oversee all staff members and their roles.</p>
            </div>
            <button
              onClick={openAddModal} // Use hook's function
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              disabled={isLoading || isMutating}
            >
              <UserPlusIcon className="h-5 w-5 mr-2" /> Add New Personnel
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <PersonnelFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedRoleFilter={selectedRoleFilter}
          setSelectedRoleFilter={setSelectedRoleFilter}
          roles={roles} // Pass available roles for the filter dropdown
          isLoading={isLoading}
          resultCount={filteredPersonnel.length}
        />

        {/* Error Display */}
        {fetchError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded-md shadow-md" role="alert">
            <p className="font-bold">Error</p>
            <p>Failed to load personnel data: {fetchError.message || 'Unknown error'}. Please try refreshing the page.</p>
          </div>
        )}

        {/* Personnel Table */}
        <PersonnelTable
          personnel={filteredPersonnel}
          isLoading={isLoading}
          roles={roles} // Pass the roles array from the hook
          onEdit={(user) => openEditModal(user)} // Pass hook's function
          onDelete={(user) => openDeleteConfirmationModal({ id: user.id, name: user.name })} // Pass hook's function
          onManageRoles={(user) => openRoleAssignmentModal({ id: user.id, name: user.name, roles: user.roles || [] })} // Pass hook's function
        // onLinkToStudent prop removed
        />
      </div>

      {/* Add/Edit Personnel Modal */}
      {isAddEditModalOpen && (
        <AddEditPersonnelModal
          isOpen={isAddEditModalOpen}
          onClose={closeModal}
          onSubmit={editingPersonnel ? handleUpdatePersonnel : handleCreateUser}
          initialData={editingPersonnel}
          formData={formData} // Pass formData from hook
          setFormData={setFormData} // Pass setFormData from hook
          isLoading={isMutating || isLoading} // Consider combined loading
          allRoles={roles} // Pass all available roles for selection in modal
        />
      )}

      {/* Manage User Roles Modal */}
      {isRoleModalOpen && userForRoleAssignment && (
        <ManageUserRolesModal
          isOpen={isRoleModalOpen}
          onClose={closeModal}
          userName={userForRoleAssignment.name}
          availableRoles={roles} // All system roles
          currentRoles={selectedRoles}
          onSelectedRolesChange={setSelectedRoles}
          onAssignRoles={handleAssignRoles}
          isLoading={isMutating || isLoading} // Consider combined loading
        />
      )}

      {/* Confirm Delete Modal */}
      {isConfirmDeleteModalOpen && personnelToDelete && (
        <ConfirmDeleteModal
          isOpen={isConfirmDeleteModalOpen}
          onClose={closeModal}
          onConfirm={confirmAndDeletePersonnel}
          itemName={personnelToDelete.name}
          isLoading={isMutating || isLoading} // Consider combined loading
        />
      )}

      {/* Link Student to Parent Modal REMOVED */}
      {/* {isLinkStudentModalOpen && linkingParentUser && ( ... )} */}

      {/* Global styles can be in a separate file if preferred */}
      <style jsx global>{`
              .input-field {
                  border: 1px solid #d1d5db; /* border-gray-300 */
                  border-radius: 0.375rem; /* rounded-md */
                  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                  padding: 0.5rem 0.75rem; /* py-2 px-3 */
                  width: 100%;
              }
              .input-field:focus {
                  outline: none;
                  box-shadow: 0 0 0 2px #3b82f6; /* focus:ring-2 focus:ring-blue-500 */
                  border-color: #3b82f6; /* focus:border-blue-500 */
              }
              .select-field {
                  border: 1px solid #d1d5db;
                  border-radius: 0.375rem;
                  padding: 0.5rem 0.75rem;
                  width: 100%;
                  background-color: white;
              }
            `}</style>
    </div>
  );
}