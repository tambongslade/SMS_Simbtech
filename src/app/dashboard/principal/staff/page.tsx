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
    roles,
    isAddEditModalOpen,
    editingPersonnel,
    formData,
    setFormData,
    openAddModal,
    openEditModal,
    handleCreateUser,
    handleUpdatePersonnel,
    isRoleModalOpen,
    userForRoleAssignment,
    selectedRoles,
    setSelectedRoles,
    openRoleAssignmentModal,
    handleAssignRoles,
    isConfirmDeleteModalOpen,
    personnelToDelete,
    openDeleteConfirmationModal,
    confirmAndDeletePersonnel,
    closeModal,
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setItemsPerPage,
    // Academic year
    selectedAcademicYear,
  } = usePersonnelManagement();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-full mx-auto">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personnel Management</h1>
              <p className="text-gray-600 mt-1">
                Oversee all staff members and their roles
                {selectedAcademicYear && (
                  <span className="ml-2 text-blue-600 font-medium">
                    | Academic Year: {selectedAcademicYear.name}
                  </span>
                )}
              </p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Total Personnel: {totalItems}</span>
              </div>
            </div>
            <button
              onClick={openAddModal}
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
          roles={roles}
          isLoading={isLoading}
          resultCount={totalItems}
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
          personnel={personnel}
          isLoading={isLoading}
          roles={roles}
          onEdit={(user: Personnel) => openEditModal(user)}
          onDelete={(user: { id: number; name: string; }) => openDeleteConfirmationModal({ id: user.id, name: user.name })}
          onManageRoles={(user: { id: number; name: string; roles: string[]; }) => openRoleAssignmentModal({ id: user.id, name: user.name, roles: user.roles || [] })}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalItems={totalItems}
        />
      </div>

      {/* Add/Edit Personnel Modal */}
      {isAddEditModalOpen && (
        <AddEditPersonnelModal
          isOpen={isAddEditModalOpen}
          onClose={closeModal}
          onSubmit={editingPersonnel ? handleUpdatePersonnel : handleCreateUser}
          initialData={editingPersonnel}
          formData={formData}
          setFormData={setFormData}
          isLoading={isMutating || isLoading}
          allRoles={roles}
        />
      )}

      {/* Manage User Roles Modal */}
      {isRoleModalOpen && userForRoleAssignment && (
        <ManageUserRolesModal
          isOpen={isRoleModalOpen}
          onClose={closeModal}
          userName={userForRoleAssignment.name}
          availableRoles={roles}
          currentRoles={selectedRoles}
          onSelectedRolesChange={setSelectedRoles}
          onAssignRoles={handleAssignRoles}
          isLoading={isMutating || isLoading}
        />
      )}

      {/* Confirm Delete Modal */}
      {isConfirmDeleteModalOpen && personnelToDelete && (
        <ConfirmDeleteModal
          isOpen={isConfirmDeleteModalOpen}
          onClose={closeModal}
          onConfirm={confirmAndDeletePersonnel}
          itemName={personnelToDelete.name}
          isLoading={isMutating || isLoading}
        />
      )}
    </div>
  );
}