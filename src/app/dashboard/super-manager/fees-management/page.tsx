"use client";

import { useState } from 'react';
import { useFeeManagement } from "./hooks/useFeeManagement";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ListView } from "./components/ui/ListView";
import { CardView } from "./components/ui/CardView";
import { SearchablePaymentModal } from "./components/ui/SearchablePaymentModal";
import { StudentModal } from "./components/ui/StudentModal";
// import { PaymentConfirmationModal } from "/components/ui/PaymentConfirmationModal"     ;
import { Student } from './types';
import { toast } from "react-hot-toast";

interface ConfirmationDetails {
    studentName: string;
    amount: string;
}

export default function FeeManagementPage() {
    const {
        selectedClass,
        setSelectedClass,
        selectedTerm,
        setSelectedTerm,
        selectedPaymentStatus,
        setSelectedPaymentStatus,
        showStudentModal,
        setShowStudentModal,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        students,
        getFilteredStudents,
        handlePayment,
        handleCreateAndPay,
        handleExportPDF,
        handleExportExcel,
        isLoading,
        isMutating,
        fetchError,
        mutationError,
        newStudent,
        setNewStudent,
        resetStudentForm,
        classesList,
        termsList,
        isLoadingClasses,
        isSearchablePaymentModalOpen,
        setIsSearchablePaymentModalOpen,
    } = useFeeManagement();

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalDetails, setConfirmModalDetails] = useState<ConfirmationDetails | null>(null);

    const [studentToPrepopulate, setStudentToPrepopulate] = useState<Student | null>(null);

    const handleShowConfirmation = (details: ConfirmationDetails) => {
        setConfirmModalDetails(details);
        setShowConfirmModal(true);
    };

    const handleCloseConfirmation = () => {
        setShowConfirmModal(false);
        setConfirmModalDetails(null);
    };

    const handleOpenPaymentForStudent = (student: Student) => {
        setStudentToPrepopulate(student);
        setIsSearchablePaymentModalOpen(true);
    };

    const handleClosePaymentModal = () => {
        setIsSearchablePaymentModalOpen(false);
        setStudentToPrepopulate(null);
    };

    const handleViewHistory = (student: Student) => {
        console.log('View history for:', student.name);
    };

    const displayError = fetchError || mutationError;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Header
                setShowStudentModal={setShowStudentModal}
                openSearchablePaymentModal={() => {
                    setStudentToPrepopulate(null);
                    setIsSearchablePaymentModalOpen(true);
                }}
            />
            <Filters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedClass={selectedClass}
                setSelectedClass={setSelectedClass}
                selectedTerm={selectedTerm}
                setSelectedTerm={setSelectedTerm}
                selectedPaymentStatus={selectedPaymentStatus}
                setSelectedPaymentStatus={setSelectedPaymentStatus}
                handleExportPDF={handleExportPDF}
                handleExportExcel={handleExportExcel}
                viewMode={viewMode}
                setViewMode={setViewMode}
                classes={classesList}
                terms={termsList}
                isLoadingClasses={isLoadingClasses}
            />

            {displayError && <div className="text-red-600 text-center p-2">Error: {displayError}</div>}

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <p className="text-gray-600">Loading Students...</p>
                </div>
            ) : viewMode === "list" ? (
                <ListView
                    students={getFilteredStudents()}
                    onRecordPayment={handleOpenPaymentForStudent}
                />
            ) : (
                <CardView
                    students={getFilteredStudents()}
                    onViewHistory={handleViewHistory}
                />
            )}  

            <SearchablePaymentModal
                isOpen={isSearchablePaymentModalOpen}
                onClose={handleClosePaymentModal}
                students={students}
                handlePayment={handlePayment}
                isLoading={isMutating}
                onPaymentSuccess={handleShowConfirmation}
                initialStudent={studentToPrepopulate}
            />
            <StudentModal
                isOpen={showStudentModal}
                onClose={() => {
                    setShowStudentModal(false);
                    resetStudentForm();
                }}
                newStudent={newStudent}
                setNewStudent={setNewStudent}
                handleCreateAndPay={handleCreateAndPay}
                isLoading={isMutating}
            />

            {/* {confirmModalDetails && (
                <PaymentConfirmationModal
                    isOpen={showConfirmModal}
                    onClose={handleCloseConfirmation}
                    studentName={confirmModalDetails.studentName}
                    amount={confirmModalDetails.amount}
                />
            )} */}
        </div>
    );
} 