"use client";

import { useFeeManagement } from "./hooks/useFeeManagement";
import { Header } from "./components/Header";
import { Filters } from "./components/Filters";
import { ListView } from "./components/ui/ListView";
import { CardView } from "./components/ui/CardView";
import { PaymentModal } from "./components/ui/PaymentModal";
import { StudentModal } from "./components/ui/StudentModal";
import { TransactionsModal } from "./components/ui/PaymentModal";
import { SubclassSummaryModal } from "./components/ui/SubclassSummaryModal";
import { Student, NewStudent } from './types';
import { toast } from "react-hot-toast";

export default function FeeManagementPage() {
    const {
        selectedClass,
        setSelectedClass,
        selectedPaymentStatus,
        setSelectedPaymentStatus,
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
        handleExportPDF,
        handleExportExcel,
        isLoading,
        isLoadingClasses,
        fetchError,
        newStudent,
        setNewStudent,
        resetPaymentForm,
        resetStudentForm,
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
    } = useFeeManagement();

    const handleRecordPaymentClick = (student: Student) => {
        setSelectedStudent(student);
        setShowPaymentModal(true);
    };

    const handleAddStudentWithPayment = async (newStudentWithPayment: NewStudent) => {
        console.warn("handleAddStudentWithPayment called - ensure hook logic is correct");
        const { paymentAmount: amount, paymentMethod: method, paymentDescription: description, ...studentData } = newStudentWithPayment as any;
        try {
            await handleAddStudent(studentData);
            console.log("Attempted to add student:", studentData);

            const addedStudent = students.find(s =>
                s.name === studentData.name
            );

            if (addedStudent && amount > 0) {
                console.log(`Student found (ID: ${addedStudent.id}), attempting payment...`);
                setSelectedStudent(addedStudent);
                setPaymentAmount(amount);
                setPaymentMethod(method);
                setPaymentDescription(description || '');
                await handlePayment();
                resetPaymentForm();
                setShowStudentModal(false);
                resetStudentForm();
            } else if (addedStudent) {
                console.log(`Student found (ID: ${addedStudent.id}), no initial payment.`);
                setShowStudentModal(false);
                resetStudentForm();
            } else {
                console.error("Failed to find newly added student. Cannot proceed with payment.");
                toast.error("Student added, but failed to find details for payment.");
            }
        } catch (err) {
            console.error("Error in handleAddStudentWithPayment flow:", err);
            toast.error(`Failed to add student: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const handleViewHistory = (student: Student) => {
        console.log('View history for:', student.name);
    };

    const handleViewTransactions = (student: Student) => {
        setSelectedTransactionsStudent(student);
        if (student.feeId) fetchFeeTransactions(student.feeId);
        setShowTransactionsModal(true);
    };

    const handleShowSubclassSummary = (subClassId: string) => {
        fetchSubclassSummary(subClassId);
        setShowSubclassSummaryModal(true);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Header
                setShowStudentModal={setShowStudentModal}
                setShowPaymentModal={setShowPaymentModal}
            />
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

            {fetchError && <div className="text-red-600 text-center p-2">Error: {fetchError}</div>}

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <p className="text-gray-600">Loading Students...</p>
                </div>
            ) : viewMode === "list" ? (
                <ListView
                    students={getFilteredStudents()}
                    onRecordPayment={handleRecordPaymentClick}
                    onViewTransactions={handleViewTransactions}
                />
            ) : (
                <CardView
                    students={getFilteredStudents()}
                    onRecordPayment={handleRecordPaymentClick}
                    onViewHistory={handleViewHistory}
                    onViewTransactions={handleViewTransactions}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        resetPaymentForm();
                    }}
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
                    handleAddStudentWithPayment={handleAddStudentWithPayment}
                    isLoading={isLoading}
                    students={students}
                />
            )}
            <StudentModal
                isOpen={showStudentModal}
                onClose={() => {
                    setShowStudentModal(false);
                    resetStudentForm();
                }}
                newStudent={newStudent}
                setNewStudent={setNewStudent}
                handleAddStudent={handleAddStudent}
                isLoading={isLoading}
            />
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