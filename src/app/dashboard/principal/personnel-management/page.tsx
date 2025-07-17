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
    academicYears,
    selectedAcademicYear,
    setSelectedAcademicYear,
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
    closeModal, // General close modal function
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setItemsPerPage,
  } = usePersonnelManagement();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Personnel Management</h1>
              <p className="text-gray-600 mt-1">Oversee all staff members and their roles</p>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Total Personnel: {totalItems}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isLoading || isMutating}
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh
              </button>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
                disabled={isLoading || isMutating}
              >
                {isLoading || isMutating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Add New Personnel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <PersonnelFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedRoleFilter={selectedRoleFilter}
          setSelectedRoleFilter={setSelectedRoleFilter}
          roles={roles} // Pass available roles for the filter dropdown
          academicYears={academicYears}
          selectedAcademicYear={selectedAcademicYear}
          setSelectedAcademicYear={setSelectedAcademicYear}
          isLoading={isLoading}
          resultCount={totalItems}
        />

        {/* Enhanced Error Display */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6" role="alert">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error Loading Personnel Data</h3>
                <p className="text-sm text-red-700 mt-1">
                  {fetchError.message || 'An unknown error occurred'}. Please try refreshing the page.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Personnel Table */}
        <PersonnelTable
          personnel={personnel}
          isLoading={isLoading}
          roles={roles} // Pass the roles array from the hook
          onEdit={(user: Personnel) => openEditModal(user)} // Pass hook's function
          onDelete={(user: { id: number; name: string; }) => openDeleteConfirmationModal({ id: user.id, name: user.name })} // Pass hook's function
          onManageRoles={(user: { id: number; name: string; roles: string[]; }) => openRoleAssignmentModal({ id: user.id, name: user.name, roles: user.roles || [] })} // Pass hook's function
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
    </div>
  );
}