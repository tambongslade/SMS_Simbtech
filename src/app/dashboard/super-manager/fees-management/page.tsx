"use client";

// Super Manager fee management is read-only for payments in the Students tab
// (view + search) -- recording payments there is the Bursar's job. The Payment
// Records tab is the exception: searching and selecting a student there opens a
// panel where a Super Manager can edit or add that student's payments (the
// backend has no time-window restriction for this role), with a full edit log.
// This page also adds the Class Fees tab where the fee structure of each class
// is configured.

import { useState } from "react";
import { useFeeManagement } from "./hooks/useFeeManagement";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ListView } from "./components/ui/ListView";
import { CardView } from "./components/ui/CardView";
import { Pagination } from "./components/ui/Pagination";
import { TransactionsModal } from "./components/ui/PaymentModal";
import { SubclassSummaryModal } from "./components/ui/SubclassSummaryModal";
import { RecordPaymentSearch } from "./components/ui/RecordPaymentSearch";
import { PaymentRecordsView } from "./components/ui/PaymentRecordsView";
import { StudentPaymentPanel } from "./components/ui/StudentPaymentPanel";
import { ClassFeesEditor } from "./components/ui/ClassFeesEditor";
import { Student } from './types';
import { useLanguage } from '@/components/context/LanguageContext';

export default function FeeManagementPage() {
    const { t } = useLanguage();
    const [viewTab, setViewTab] = useState<'class-fees' | 'records' | 'students'>('class-fees');
    const {
        paymentRecords,
        isLoadingPaymentRecords,
        studentSearchTerm,
        setStudentSearchTerm,
        studentSearchResults,
        isSearchingStudents,
        handleUpdatePayment,
        recordsSelectedStudent,
        setRecordsSelectedStudent,
        handleAddPaymentForStudent,
        studentPaymentAuditLog,
        isLoadingStudentPaymentAuditLog,
        selectedClass,
        setSelectedClass,
        selectedPaymentStatus,
        setSelectedPaymentStatus,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        getFilteredStudents,
        handleExportPDF,
        handleExportExcel,
        isLoading,
        isLoadingClasses,
        fetchError,
        classesList,
        showTransactionsModal,
        setShowTransactionsModal,
        selectedTransactionsStudent,
        setSelectedTransactionsStudent,
        transactions,
        isLoadingTransactions,
        fetchFeeTransactions,
        handleExportEnhanced,
        subclassSummary,
        isLoadingSubclassSummary,
        fetchSubclassSummary,
        showSubclassSummaryModal,
        setShowSubclassSummaryModal,
        selectedAcademicYear,
        setSelectedAcademicYear,
        allAcademicYears,
        // Pagination
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        setItemsPerPage,
    } = useFeeManagement();

    const handleViewTransactions = (student: Student) => {
        setSelectedTransactionsStudent(student);
        if (student.feeId) fetchFeeTransactions(student.feeId);
        setShowTransactionsModal(true);
    };

    const handleShowSubclassSummary = (subClassId: string) => {
        fetchSubclassSummary(subClassId);
        setShowSubclassSummaryModal(true);
    };

    // Search popup pick → on the Payment Records tab, select the student for
    // editing/adding payments; on any other tab, open the read-only history modal.
    const handleSearchSelectStudent = (student: Student) => {
        setStudentSearchTerm('');
        if (viewTab === 'records') {
            setRecordsSelectedStudent(student);
        } else {
            handleViewTransactions(student);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Header />

            {/* Search a student → popup with matches → view payment history */}
            <RecordPaymentSearch
                searchTerm={studentSearchTerm}
                setSearchTerm={setStudentSearchTerm}
                results={studentSearchResults}
                isSearching={isSearchingStudents}
                onSelectStudent={handleSearchSelectStudent}
            />

            {/* View tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6 overflow-x-auto">
                    {([
                        { key: 'class-fees', label: t('Class Fees') },
                        { key: 'records', label: t('Payment Records') },
                        { key: 'students', label: t('Students') },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setViewTab(tab.key)}
                            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                                viewTab === tab.key
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {fetchError && <div className="text-red-600 text-center p-2">{t('Error')}: {fetchError}</div>}

            {viewTab === 'class-fees' && <ClassFeesEditor />}

            {viewTab === 'records' && (
                <div className="space-y-4">
                    {recordsSelectedStudent && (
                        <StudentPaymentPanel
                            student={recordsSelectedStudent}
                            records={paymentRecords.filter(r => String(r.studentId) === String(recordsSelectedStudent.id))}
                            auditLog={studentPaymentAuditLog}
                            isLoadingAuditLog={isLoadingStudentPaymentAuditLog}
                            onUpdatePayment={handleUpdatePayment}
                            onAddPayment={handleAddPaymentForStudent}
                            onClose={() => setRecordsSelectedStudent(null)}
                        />
                    )}

                    <PaymentRecordsView
                        records={paymentRecords}
                        isLoading={isLoadingPaymentRecords}
                    />
                </div>
            )}

            {viewTab === 'students' && (
                <>
                    <Filters
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedClass={selectedClass}
                        setSelectedClass={setSelectedClass}
                        selectedAcademicYear={selectedAcademicYear}
                        setSelectedAcademicYear={setSelectedAcademicYear}
                        selectedPaymentStatus={selectedPaymentStatus}
                        setSelectedPaymentStatus={setSelectedPaymentStatus}
                        handleExportPDF={handleExportPDF}
                        handleExportExcel={handleExportExcel}
                        handleExportEnhanced={handleExportEnhanced}
                        onShowSubclassSummary={handleShowSubclassSummary}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        classes={classesList}
                        academicYears={allAcademicYears}
                        isLoadingClasses={isLoadingClasses}
                    />

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <p className="text-gray-600">{t('Loading Students...')}</p>
                        </div>
                    ) : (
                        <>
                            {viewMode === "list" ? (
                                <ListView
                                    students={getFilteredStudents()}
                                    onViewTransactions={handleViewTransactions}
                                />
                            ) : (
                                <CardView
                                    students={getFilteredStudents()}
                                    onViewTransactions={handleViewTransactions}
                                />
                            )}

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </>
                    )}
                </>
            )}

            <TransactionsModal
                isOpen={showTransactionsModal}
                onClose={() => setShowTransactionsModal(false)}
                transactions={transactions}
                isLoading={isLoadingTransactions}
                studentName={selectedTransactionsStudent?.name}
            />
            <SubclassSummaryModal
                isOpen={showSubclassSummaryModal}
                onClose={() => setShowSubclassSummaryModal(false)}
                summary={subclassSummary}
                isLoading={isLoadingSubclassSummary}
            />
        </div>
    );
}
