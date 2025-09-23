"use client";

import { useControlFeeManagement } from './hooks/useControlFeeManagement';
import { Header } from './components/Header';
import { Filters } from './components/Filters';
import { ListView } from './components/ui/ListView';
import { CardView } from './components/ui/CardView';
import { Pagination } from './components/ui/Pagination';
import { PaymentModal } from './components/ui/PaymentModal';
import { StudentModal } from './components/ui/StudentModal';
import { FeeHistoryModal } from './components/ui/FeeHistoryModal';
import { SubclassSummaryModal } from './components/ui/SubclassSummaryModal';
import { Student } from '../fee-management/types';

const ControlFeeManagementPage = () => {
  const {
    students,
    allStudents,
    classesList,
    activeAcademicYear,
    selectedClass,
    setSelectedClass,
    selectedTerm,
    setSelectedTerm,
    selectedPaymentStatus,
    setSelectedPaymentStatus,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    handlePageChange,
    showPaymentModal,
    showStudentModal,
    showFeeHistoryModal,
    showSubclassSummaryModal,
    selectedStudent,
    setSelectedStudent,
    selectedTransactionsStudent,
    selectedPaymentType,
    setSelectedPaymentType,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDescription,
    setPaymentDescription,
    newStudent,
    setNewStudent,
    isLoading,
    isMutating,
    isLoadingTransactions,
    isLoadingSubclassSummary,
    error,
    mutationError,
    transactions,
    subclassSummary,
    openPaymentModal,
    closePaymentModal,
    setShowPaymentModal,
    handlePayment,
    openStudentModal,
    closeStudentModal,
    showTransactions,
    closeTransactionsModal,
    closeSubclassSummaryModal,
    handleShowSubclassSummary,
    handleExportEnhanced,
  } = useControlFeeManagement();

  const handleRecordPaymentClick = (student: Student) => {
    openPaymentModal(student);
  };

  const handleViewTransactions = (student: Student) => {
    showTransactions(student);
  };

  const handleViewHistory = (student: Student) => {
    console.log('View history for:', student.name);
  };

  if (!activeAcademicYear) {
    return (
      <div className="p-6 bg-gray-100 min-h-screen">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Control Fee Management</h1>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">No academic year is currently selected.</p>
            <p className="text-sm text-gray-500">Please select an academic year from your profile settings to continue.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Header
        setShowStudentModal={openStudentModal}
        setShowPaymentModal={setShowPaymentModal}
      />
      <Filters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        selectedPaymentStatus={selectedPaymentStatus}
        setSelectedPaymentStatus={setSelectedPaymentStatus}
        handleExportPDF={() => handleExportEnhanced('pdf')}
        handleExportExcel={() => handleExportEnhanced('xlsx')}
        handleExportEnhanced={handleExportEnhanced}
        onShowSubclassSummary={handleShowSubclassSummary}
        viewMode={viewMode}
        setViewMode={setViewMode}
        classes={classesList}
        isLoadingClasses={isLoading}
      />

      {error && <div className="text-red-600 text-center p-2">Error: {error.message}</div>}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading Students...</p>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <ListView
              students={students}
              onRecordPayment={handleRecordPaymentClick}
              onViewTransactions={handleViewTransactions}
            />
          ) : (
            <CardView
              students={students}
              onRecordPayment={handleRecordPaymentClick}
              onViewHistory={handleViewHistory}
              onViewTransactions={handleViewTransactions}
            />
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={students.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={closePaymentModal}
          student={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          selectedPaymentType={selectedPaymentType}
          setSelectedPaymentType={setSelectedPaymentType}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentDescription={paymentDescription}
          setPaymentDescription={setPaymentDescription}
          handlePayment={handlePayment}
          isLoading={isMutating}
          students={allStudents}
          controlFeeStudents={students}
        />
      )}

      {showStudentModal && (
        <StudentModal
          isOpen={showStudentModal}
          onClose={closeStudentModal}
          newStudent={newStudent}
          setNewStudent={setNewStudent}
          onSubmit={() => {}} // Control fee doesn't create students
          isLoading={isMutating}
          error={mutationError}
          classes={classesList}
        />
      )}

      {showFeeHistoryModal && selectedTransactionsStudent && (
        <FeeHistoryModal
          isOpen={showFeeHistoryModal}
          onClose={closeTransactionsModal}
          student={selectedTransactionsStudent}
          transactions={transactions}
          isLoading={isLoadingTransactions}
        />
      )}

      {showSubclassSummaryModal && (
        <SubclassSummaryModal
          isOpen={showSubclassSummaryModal}
          onClose={closeSubclassSummaryModal}
          summary={subclassSummary}
          isLoading={isLoadingSubclassSummary}
        />
      )}
    </div>
  );
};

export default ControlFeeManagementPage;