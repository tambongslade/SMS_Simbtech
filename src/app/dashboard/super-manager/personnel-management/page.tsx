'use client'
import Image from 'next/image';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { usePersonnelManagement } from './hooks/usePersonnelManagement';

// Import the new table component
import { PersonnelTable } from './components/PersonnelTable'; 
import { PersonnelFilters } from './components/PersonnelFilters';
// TODO: Import modal components once created
// import { AddEditPersonnelModal } from './components/AddEditPersonnelModal';
// import { AssignRoleModal } from './components/AssignRoleModal';
// import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';

export default function PersonnelManagement() {
  const {
    filteredPersonnel,
    isLoading,
    isAddEditModalOpen,
    isRoleModalOpen,
    isConfirmDeleteModalOpen,
    editingPersonnel,
    userForRoleAssignment,
    selectedRoles,
    personnelToDelete,
    searchTerm,
    selectedRoleFilter,
    formData,
    roles,
    setSearchTerm,
    setSelectedRoleFilter,
    setFormData,
    setSelectedRoles,
    openAddModal,
    openEditModal,
    closeModal,
    openDeleteConfirmationModal,
    handleCreateUser,
    handleAssignRoles,
    handleUpdatePersonnel,
    confirmAndDeletePersonnel,
    handleRoleSelectionChange,
    openRoleAssignmentModal,
  } = usePersonnelManagement();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Personnel Management</h1>
              <p className="text-gray-600 mt-1">Manage staff, assign roles, and handle user credentials</p>
            </div>
            <button
              onClick={openAddModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Add New Personnel'}
            </button>
          </div>
        </div>

        <PersonnelFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedRoleFilter={selectedRoleFilter}
          setSelectedRoleFilter={setSelectedRoleFilter}
          roles={roles}
          isLoading={isLoading}
          resultCount={filteredPersonnel.length}
        />

        <PersonnelTable
          personnel={filteredPersonnel}
          isLoading={isLoading}
          roles={roles}
          onEdit={openEditModal}
          onManageRoles={openRoleAssignmentModal}
          onDelete={openDeleteConfirmationModal}
        />
        </div>

      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
              {editingPersonnel ? 'Edit Personnel' : 'Add New Personnel (Step 1/2)'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); editingPersonnel ? handleUpdatePersonnel() : handleCreateUser(); }} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                <input type="text" id="name" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
              </div>
                  <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                <input type="email" id="email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                  <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" id="phone" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                  <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                <input type="text" id="username" value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
              {!editingPersonnel && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password *</label>
                    <input type="password" id="password" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
              )}
               {!editingPersonnel && (
                  <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender *</label>
                  <select id="gender" value={formData.gender || ''} onChange={(e) => setFormData({...formData, gender: e.target.value})} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                      <option value="" disabled>Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                  </select>
                  </div>
               )}
               {!editingPersonnel && (
                  <div>
                      <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                      <input type="date" id="date_of_birth" value={formData.date_of_birth || ''} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
               )}
                {!editingPersonnel && (
                  <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea id="address" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                  </div>
                )}
                  <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                  <select id="status" value={formData.status || 'active'} onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                </div>

              <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                    Cancel
                  </button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingPersonnel ? 'Update Personnel' : 'Create User & Proceed to Roles')}
                  </button>
              </div>
            </form>
            </div>
          </div>
        )}

       {isRoleModalOpen && userForRoleAssignment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border w-full max-w-lg shadow-lg rounded-md bg-white">
                 <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
                    Assign Roles to {userForRoleAssignment.name} (Step 2/2)
                 </h3>
                 <p className="text-sm text-gray-600 mb-6">Select one or more roles for this user.</p>

                 <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                    {roles.map((role) => (
                        <div key={role.value} className="flex items-center">
                            <input
                                id={`role-${role.value}`}
                                type="checkbox"
                                value={role.value}
                                checked={selectedRoles.includes(role.value)}
                                onChange={() => handleRoleSelectionChange(role.value)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`role-${role.value}`} className="ml-3 block text-sm font-medium text-gray-700">
                                {role.label}
                            </label>
          </div>
                    ))}
            </div>

                 <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button type="button" onClick={closeModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors" disabled={isLoading}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAssignRoles}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        disabled={isLoading || selectedRoles.length === 0}
                    >
                        {isLoading ? 'Assigning...' : 'Save Roles'}
                    </button>
            </div>
          </div>
        </div>
       )}

       {isConfirmDeleteModalOpen && personnelToDelete && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div className="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
                    <div className="sm:flex sm:items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                Delete Personnel Member
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    Are you sure you want to delete <strong className="font-semibold">{personnelToDelete.name}</strong>?
                                    This action cannot be undone.
                                </p>
            </div>
                        </div>
                    </div>
                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse sm:px-4">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            onClick={confirmAndDeletePersonnel}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                            onClick={closeModal}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
          </div>
        </div>
      </div>
        )}

    </div>
  );
}