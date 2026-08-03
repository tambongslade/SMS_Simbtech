"use client";

// Super Manager fee management is read-only for payments (view + search) —
// recording payments is the Bursar's job. This page adds the Class Fees tab
// where the fee structure of each class is configured.

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
import { ClassFeesEditor } from "./components/ui/ClassFeesEditor";
import { Student } from './types';

export default function FeeManagementPage() {
    const [viewTab, setViewTab] = useState<'class-fees' | 'records' | 'students'>('class-fees');
    const {
        paymentRecords,
        isLoadingPaymentRecords,
        studentSearchTerm,
        setStudentSearchTerm,
        studentSearchResults,
        isSearchingStudents,
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

    // Search popup pick → open the student's payment history (read-only)
    const handleSearchSelectStudent = (student: Student) => {
        setStudentSearchTerm('');
        handleViewTransactions(student);
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
                        { key: 'class-fees', label: 'Class Fees' },
                        { key: 'records', label: 'Payment Records' },
                        { key: 'students', label: 'Students' },
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

            {fetchError && <div className="text-red-600 text-center p-2">Error: {fetchError}</div>}

            {viewTab === 'class-fees' && <ClassFeesEditor />}

            {viewTab === 'records' && (
                <PaymentRecordsView
                    records={paymentRecords}
                    isLoading={isLoadingPaymentRecords}
                />
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
                            <p className="text-gray-600">Loading Students...</p>
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
