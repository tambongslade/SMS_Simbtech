'use client'
import React from 'react';
import { useParentsManagement } from './hooks/useParentsManagement';
import { ParentsTable } from './components/ParentsTable';
import { LinkStudentModal } from './components/LinkStudentModal';
import { ViewStudentsModal } from './components/ViewStudentsModal';
import { EditParentModal } from './components/EditParentModal';

export default function ParentsManagementPage() {
    const {
        parents,
        isLoading,
        isLinkStudentModalOpen,
        linkingParentUser,
        selectedStudentToLink,
        allStudents,
        openLinkStudentModal,
        closeLinkStudentModal,
        handleLinkToStudent,
        setSelectedStudentToLink,
        studentsLoading,
        studentNameFilter,
        setStudentNameFilter,
        studentSubClassFilter,
        setStudentSubClassFilter,
        subClassesForFilter,
        isViewStudentsModalOpen,
        viewingStudentsForParent,
        linkedStudentsList,
        viewStudentsLoading,
        openViewStudentsModal,
        closeViewStudentsModal,
        handleUnlinkStudentFromParent,
        isEditParentModalOpen,
        editingParentUser,
        editParentFormData,
        openEditParentModal,
        closeEditParentModal,
        handleEditParentInputChange,
        handleUpdateParent,
    } = useParentsManagement();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Parents Management</h1>

                {/* TODO: Add Filters if needed (e.g., search by parent name) */}

                <ParentsTable
                    parents={parents}
                    isLoading={isLoading}
                    onLinkToStudent={openLinkStudentModal}
                    onViewStudents={openViewStudentsModal}
                    onEditParent={openEditParentModal}
                />
            </div>

            {isLinkStudentModalOpen && linkingParentUser && (
                <LinkStudentModal
                    parentUser={linkingParentUser}
                    allStudents={allStudents}
                    selectedStudent={selectedStudentToLink}
                    setSelectedStudent={setSelectedStudentToLink}
                    onClose={closeLinkStudentModal}
                    onLink={handleLinkToStudent}
                    isLoading={isLoading}
                    studentsLoading={studentsLoading}
                    studentNameFilter={studentNameFilter}
                    setStudentNameFilter={setStudentNameFilter}
                    studentSubClassFilter={studentSubClassFilter}
                    setStudentSubClassFilter={setStudentSubClassFilter}
                    subClassesForFilter={subClassesForFilter}
                />
            )}

            {isViewStudentsModalOpen && viewingStudentsForParent && (
                <ViewStudentsModal
                    parentUser={viewingStudentsForParent}
                    linkedStudents={linkedStudentsList}
                    isLoading={viewStudentsLoading || isLoading}
                    onClose={closeViewStudentsModal}
                    onUnlinkStudent={handleUnlinkStudentFromParent}
                />
            )}

            {isEditParentModalOpen && editingParentUser && (
                <EditParentModal
                    isOpen={isEditParentModalOpen}
                    onClose={closeEditParentModal}
                    parentData={editParentFormData}
                    onInputChange={handleEditParentInputChange}
                    onSubmit={handleUpdateParent}
                    isLoading={isLoading}
                    editingParentName={editingParentUser.name}
                />
            )}
        </div>
    );
} 