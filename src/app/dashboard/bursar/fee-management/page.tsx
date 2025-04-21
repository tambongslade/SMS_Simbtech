"use client";

import { useFeeManagement } from "./hooks/useFeeManagement";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ListView } from "./components/ui/ListView";
import { CardView } from "./components/ui/CardView";
import { PaymentModal } from "./components/ui/PaymentModal";
import { StudentModal } from "./components/ui/StudentModal";
import { Student, NewStudent } from './types';

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

  // Handler function to select student and open payment modal
  const handleRecordPaymentClick = (student: Student) => {
    setSelectedStudent(student);
    setShowPaymentModal(true);
  };

  // Handler for adding a new student with payment in one step
  const handleAddStudentWithPayment = async (newStudentWithPayment: NewStudent) => {
    // Extract payment info from the newStudentWithPayment object
    const { paymentAmount, paymentMethod, paymentDescription, ...studentData } = newStudentWithPayment as any;
    
    // Set payment data
    setPaymentAmount(paymentAmount);
    setPaymentMethod(paymentMethod);
    setPaymentDescription(paymentDescription || '');
    
    // Set student data
    setNewStudent(studentData);
    
    // Call the handleAddStudent function first and then handlePayment
    await handleAddStudent(new Event('submit') as any);
    // After adding the student, the payment can be made (this flow may need adjustment)
    // handlePayment will need to be called with the newly created student
  };

  // Placeholder handler for viewing payment history
  const handleViewHistory = (student: Student) => {
    console.log('View history for:', student.name); // Replace with actual logic later
    // Example: setSelectedStudent(student); setShowHistoryModal(true);
  };

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
          onRecordPayment={handleRecordPaymentClick}
        />
      ) : (
        <CardView
          students={getFilteredStudents()}
          onRecordPayment={handleRecordPaymentClick}
          onViewHistory={handleViewHistory}
        />
      )}

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            resetPaymentForm();
          }}
          student={selectedStudent}
          selectedPaymentType={selectedPaymentType}
          setSelectedPaymentType={setSelectedPaymentType}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentDescription={paymentDescription}
          setPaymentDescription={setPaymentDescription}
          handlePayment={handlePayment}
          handleAddStudentWithPayment={handleAddStudentWithPayment}
          isLoading={isLoading}
          students={students}
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