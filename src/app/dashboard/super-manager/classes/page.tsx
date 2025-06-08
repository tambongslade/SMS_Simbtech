'use client';

import { Class, SubClass } from './types/class';
import { ClassForm } from './components/ClassForm';
import { SubClassForm } from './components/SubClassForm';
import { PlusIcon, PencilIcon, TrashIcon, BuildingLibraryIcon, UsersIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useClassManagement } from './hooks/useClassManagement';

// --- Main Page Component ---
export default function ClassesPage() {
  const {
      classes,
      teachers,
      isLoading,
      isLoadingMutation,
      error,
      editingClass,
      isClassModalOpen,
      isSubClassModalOpen,
      classForSubclass,
      editingSubclass,
      isConfirmDeleteModalOpen,
      classToDelete,
      subClassToDelete,
      openAddClassModal,
      openEditClassModal,
      openAddSubclassModal,
      openEditSubclassModal,
      closeModals,
      openDeleteConfirmation,
      handleCreateClass,
      handleUpdateClass,
      handleDeleteClass,
      handleCreateSubclass,
      handleUpdateSubclass,
      handleDeleteSubclass,
  } = useClassManagement();

  const formatCurrency = (amount: number | null | undefined): string => {
      if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
      return new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);
  };

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-6 border w-full max-w-xl shadow-lg rounded-md bg-white">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
        {children}
      </div>
    </div>
  );
};

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
          <BuildingLibraryIcon className="h-6 w-6 mr-2 text-indigo-600"/>
          Class & Subclass Management
        </h1>
        <button
          onClick={openAddClassModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center space-x-2 transition duration-150 ease-in-out disabled:opacity-50"
          disabled={isLoading || isLoadingMutation}
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Class</span>
        </button>
      </div>

      {isLoading && classes.length === 0 && <p className="text-center text-gray-500 py-6 italic">Loading classes...</p>}
      {error && <p className="text-center text-red-600 py-6 font-semibold">Error loading data: {error}</p>}
      {!isLoading && !error && classes.length === 0 && <p className="text-center text-gray-500 py-6 italic">No classes found. Create one to get started.</p>}

      <div className="space-y-6">
        {classes.map((cls) => {
          const totalFeeNew = (cls.newStudentAddFee || 0) +
                             (cls.firstTermFee || 0) +
                             (cls.secondTermFee || 0) +
                             (cls.thirdTermFee || 0) +
                             (cls.miscellaneousFee || 0);
          const totalFeeOld = (cls.oldStudentAddFee || 0) +
                            (cls.firstTermFee || 0) +
                            (cls.secondTermFee || 0) +
                            (cls.thirdTermFee || 0) +
                            (cls.miscellaneousFee || 0);

          return (
            <div key={cls.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-indigo-700">{cls.name} <span className="text-base font-normal text-gray-500">(Level: {cls.level})</span></h2>
                  <p className="text-sm text-gray-500">ID: {cls.id}</p>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                  <button onClick={() => openEditClassModal(cls)} className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50" title="Edit Class Details" disabled={isLoadingMutation}>
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => openDeleteConfirmation(cls)} className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50" title="Delete Class" disabled={isLoadingMutation}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">Fee Structure</h3>
                  <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-2 text-sm">
                    <div className="flex flex-col bg-gray-50 p-2 rounded">
                      <dt className="text-gray-500">Registration (New)</dt>
                      <dd className="text-gray-900 font-medium">{formatCurrency(cls.newStudentAddFee)}</dd>
                    </div>
                    <div className="flex flex-col bg-gray-50 p-2 rounded">
                      <dt className="text-gray-500">Registration (Old)</dt>
                      <dd className="text-gray-900 font-medium">{formatCurrency(cls.oldStudentAddFee)}</dd>
                    </div>
                    <div className="flex flex-col bg-gray-50 p-2 rounded">
                      <dt className="text-gray-500">1st Term Fee</dt>
                      <dd className="text-gray-900 font-medium">{formatCurrency(cls.firstTermFee)}</dd>
                    </div>
                    <div className="flex flex-col bg-gray-50 p-2 rounded">
                      <dt className="text-gray-500">2nd Term Fee</dt>
                      <dd className="text-gray-900 font-medium">{formatCurrency(cls.secondTermFee)}</dd>
                    </div>
                    <div className="flex flex-col bg-gray-50 p-2 rounded">
                      <dt className="text-gray-500">3rd Term Fee</dt>
                      <dd className="text-gray-900 font-medium">{formatCurrency(cls.thirdTermFee)}</dd>
                    </div>
                    <div className="flex flex-col bg-gray-50 p-2 rounded">
                      <dt className="text-gray-500">Miscellaneous</dt>
                      <dd className="text-gray-900 font-medium">{formatCurrency(cls.miscellaneousFee)}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 pt-2 border-t border-dashed text-right">
                    <p className="text-sm text-gray-600">Total (New Student): <span className="font-semibold text-indigo-700">{formatCurrency(totalFeeNew)}</span></p>
                    <p className="text-sm text-gray-600">Total (Old Student): <span className="font-semibold text-indigo-700">{formatCurrency(totalFeeOld)}</span></p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-semibold text-gray-700 flex items-center">
                      <UsersIcon className="h-5 w-5 mr-1 text-gray-500"/>Subclasses
                    </h3>
                    <button 
                      onClick={() => openAddSubclassModal(cls)} 
                      className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                      disabled={!cls.id || isLoadingMutation}
                      title="Add New Subclass"
                    >
                      <PlusIcon className="h-4 w-4 inline mr-1"/>Add
                    </button>
                  </div>
                  {(cls.subClasses && cls.subClasses.length > 0) ? (
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                      {cls.subClasses.map((sub) => (
                        <li key={sub.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sub.name}</p>
                            <p className="text-xs text-gray-500">ID: {sub.id}</p>
                            {sub.classMasterName && <p className="text-xs text-purple-700">Master: {sub.classMasterName}</p>}
                          </div>
                          <div className="flex space-x-1">
                            <button onClick={() => openEditSubclassModal(sub, cls.name)} className="p-1 text-blue-500 hover:text-blue-700 disabled:opacity-50" title="Edit Subclass" disabled={isLoadingMutation}>
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => openDeleteConfirmation(sub)} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50" title="Delete Subclass" disabled={isLoadingMutation}>
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No subclasses defined for this class.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isClassModalOpen} onClose={closeModals}>
        <h3 className="text-lg font-semibold mb-4">{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
        <ClassForm 
          key={editingClass ? `edit-${editingClass.id}` : 'create'}
          initialData={editingClass ?? undefined} 
          onSubmit={editingClass ? handleUpdateClass : handleCreateClass}
          onCancel={closeModals}
          isLoading={isLoadingMutation}
        />
      </Modal>

      <Modal isOpen={isSubClassModalOpen} onClose={closeModals}>
        {classForSubclass && (
          <SubClassForm
            key={editingSubclass ? `edit-sub-${editingSubclass.id}` : `create-sub-${classForSubclass.id}`} 
            className={classForSubclass.name}
            initialData={editingSubclass ?? undefined}
            teachers={teachers}
            onSubmit={editingSubclass ? handleUpdateSubclass : handleCreateSubclass}
            onCancel={closeModals}
            isLoading={isLoadingMutation}
          />
        )}
      </Modal>

      <Modal isOpen={isConfirmDeleteModalOpen} onClose={closeModals}>
        <h3 className="text-lg font-semibold mb-2 text-red-700">Confirm Deletion</h3>
        <p className="mb-6 text-gray-600">Are you sure you want to delete '{(classToDelete?.name || subClassToDelete?.name)}'? This action cannot be undone.</p>
        <div className="flex justify-end space-x-3">
          <button onClick={closeModals} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300" disabled={isLoadingMutation}>Cancel</button>
          <button onClick={classToDelete ? handleDeleteClass : handleDeleteSubclass} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700" disabled={isLoadingMutation}>{isLoadingMutation ? 'Deleting...' : 'Confirm Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
