"use client";

import { useFeeManagement } from "./hooks/useFeeManagement";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ListView } from "./components/ui/ListView";
import { CardView } from "./components/ui/CardView";
import { PaymentModal } from "./components/ui/PaymentModal";
import { StudentModal } from "./components/ui/StudentModal";

export default function FeeManagementPage() {
  const {
    selectedClass,
    setSelectedClass,
    selectedTerm,
    setSelectedTerm,
    showPaymentModal,
    setShowPaymentModal,
    showStudentModal,
    setShowStudentModal,
    searchQuery,
    setSearchQuery,
    selectedStudent,
    setSelectedStudent,
    selectedPaymentType,
    setSelectedPaymentType,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
    paymentDescription,
    setPaymentDescription,
    viewMode,
    setViewMode,
    students,
    getFilteredStudents,
    handlePayment,
    handleAddStudent,
    isLoading,
    error,
    newStudent,
    setNewStudent,
    resetPaymentForm,
    resetStudentForm,
  } = useFeeManagement();

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <Header
        setShowStudentModal={setShowStudentModal}
        setShowPaymentModal={setShowPaymentModal}
      />

      {/* Filters */}
      <Filters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        selectedTerm={selectedTerm}
        setSelectedTerm={setSelectedTerm}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-600">{error}</p>
        </div>
      ) : viewMode === "list" ? (
        <ListView
          students={getFilteredStudents()}
          setSelectedStudent={setSelectedStudent}
          setShowPaymentModal={setShowPaymentModal}
        />
      ) : (
        <CardView
          students={getFilteredStudents()}
          setSelectedStudent={setSelectedStudent}
          setShowPaymentModal={setShowPaymentModal}
        />
      )}

      {/* Modals */}
      {showPaymentModal && selectedStudent && (
        <PaymentModal
          selectedStudent={selectedStudent}
          selectedPaymentType={selectedPaymentType}
          setSelectedPaymentType={setSelectedPaymentType}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentDescription={paymentDescription}
          setPaymentDescription={setPaymentDescription}
          handlePayment={handlePayment}
          resetPaymentForm={resetPaymentForm}
          setShowPaymentModal={setShowPaymentModal}
        />
      )}

<StudentModal
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        newStudent={newStudent}
        setNewStudent={setNewStudent}
        handleAddStudent={handleAddStudent}
        isLoading={isLoading}
      />
    </div>
  );
}