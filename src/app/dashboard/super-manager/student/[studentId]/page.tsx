'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeftIcon, DocumentTextIcon, CalendarDaysIcon, EnvelopeIcon, ExclamationTriangleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// --- Dummy Data Structures ---
type Status = 'Excused' | 'Unexcused' | 'Pending' | 'Late';

interface DummyDetailedStudent {
  id: string;
  name: string;
  class: string;
  admissionNo: string;
  dob: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  photoUrl?: string;
  absences: { date: string; reason?: string; status: Status }[];
  reportCards: { year: string; term: string; fileUrl?: string; status: 'Available' | 'Not Generated' }[];
}

// --- Dummy Data Function (Simulates fetching based on ID) ---
const fetchDummyStudentData = (studentId: string): DummyDetailedStudent | null => {
  console.log("Fetching dummy data for student:", studentId);
  // In a real app, this would be an API call: fetch(`/api/students/${studentId}`)
  if (studentId === 'S12345') { // Example ID
    return {
      id: 'S12345',
      name: "Alex Johnson",
      class: "Form 4N",
      admissionNo: "A6789",
      dob: "2008-05-15",
      parentName: "Sarah Johnson",
      parentPhone: "555-1234",
      parentEmail: "s.johnson@email.com",
      photoUrl: "/placeholder-student.png",
      absences: [
        { date: "2023-10-23", status: 'Excused', reason: "Doctor's appointment" },
        { date: "2023-10-19", status: 'Unexcused' },
        { date: "2023-09-12", status: 'Late', reason: "Traffic" },
      ],
      reportCards: [
        { year: "2023-2024", term: "Term 1", status: 'Not Generated' },
        { year: "2022-2023", term: "Term 3", status: 'Available', fileUrl: '#' }, // Placeholder URL
        { year: "2022-2023", term: "Term 2", status: 'Available', fileUrl: '#' },
        { year: "2022-2023", term: "Term 1", status: 'Available', fileUrl: '#' },
      ],
    };
  }
  return null; // Student not found
};

// --- Student Detail Page Component ---
export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<DummyDetailedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId) {
      setIsLoading(true);
      setError(null);
      // Simulate API fetch
      setTimeout(() => { 
        const data = fetchDummyStudentData(studentId);
        if (data) {
          setStudent(data);
        } else {
          setError("Student data not found.");
          toast.error("Could not load student data.");
        }
        setIsLoading(false);
      }, 500); // Simulate network delay
    }
  }, [studentId]);

  // --- Placeholder Action Handlers ---
  const handleSendAbsenceNotification = () => {
    toast.success(`Absence Notification action triggered for ${student?.name} (Simulated)`);
  };
  const handleSendPaymentNotification = () => {
    toast.success(`Payment Notification action triggered for ${student?.name} (Simulated)`);
  };
  const handleWriteMessage = () => {
    toast(`Write Message action triggered for ${student?.name} (Simulated)`);
  };
  const handleDownloadReport = (reportUrl: string | undefined) => {
    if (reportUrl && reportUrl !== '#') {
        // window.open(reportUrl, '_blank');
        toast.success(`Downloading report for ${student?.name}... (Simulated)`);
    } else {
        toast.error("Report card file is not available.");
    }
  }

  // --- Render Logic ---
  if (isLoading) {
    return <div className="p-6 text-center">Loading student details...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  if (!student) {
    // This case should ideally be handled by the error state, but as a fallback
    return <div className="p-6 text-center">Student not found.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Back Button */} 
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Student Details: {student.name}</h1>

      {/* --- Main Content Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */} 
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardBody className="flex flex-col items-center space-y-3">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 text-xs">Photo</span> 
              </div>
              <p><strong>Class:</strong> {student.class}</p>
              <p><strong>Admission No:</strong> {student.admissionNo}</p>
              <p><strong>Date of Birth:</strong> {student.dob}</p>
              <p><strong>Parent:</strong> {student.parentName} ({student.parentPhone})</p>
              {student.parentEmail && <p><strong>Parent Email:</strong> {student.parentEmail}</p>}
            </CardBody>
          </Card>

          {/* Actions Card */} 
          <Card>
             <CardHeader><CardTitle>Communication Actions</CardTitle></CardHeader>
             <CardBody className="space-y-3 flex flex-col items-start">
                 <Button onClick={handleSendAbsenceNotification} variant="outline" size="sm" className="w-full justify-start">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2"/> Notify School of Absence
                 </Button>
                 <Button onClick={handleSendPaymentNotification} variant="outline" size="sm" className="w-full justify-start">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2"/> Send Proof of Payment
                 </Button>
                 <Button onClick={handleWriteMessage} variant="outline" size="sm" className="w-full justify-start">
                    <EnvelopeIcon className="w-4 h-4 mr-2"/> Write Message to School
                 </Button>
             </CardBody>
          </Card>
        </div>

        {/* Right Column: Absences & Report Cards */}
        <div className="lg:col-span-2 space-y-6">
           {/* Absence History Card */} 
           <Card>
               <CardHeader><CardTitle className="flex items-center"><CalendarDaysIcon className="w-5 h-5 mr-2"/> Absence History</CardTitle></CardHeader>
               <CardBody>
                   {student.absences.length > 0 ? (
                       <ul className="divide-y divide-gray-200">
                           {student.absences.map((abs, index) => (
                               <li key={index} className="py-2 flex justify-between items-center text-sm">
                                   <span>{abs.date} - <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${abs.status === 'Unexcused' ? 'bg-red-100 text-red-700' : abs.status === 'Excused' ? 'bg-green-100 text-green-700' : abs.status === 'Late' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{abs.status}</span></span>
                                   {abs.reason && <span className="text-gray-500">({abs.reason})</span>}
                               </li>
                           ))}
                       </ul>
                   ) : (
                       <p className="text-sm text-gray-500">No absences recorded.</p>
                   )}
               </CardBody>
           </Card>
           
           {/* Report Cards Card */} 
           <Card>
               <CardHeader><CardTitle className="flex items-center"><DocumentTextIcon className="w-5 h-5 mr-2"/> Report Cards</CardTitle></CardHeader>
               <CardBody>
                   {student.reportCards.length > 0 ? (
                       <ul className="divide-y divide-gray-200">
                           {student.reportCards.map((report, index) => (
                               <li key={index} className="py-2 flex justify-between items-center text-sm">
                                   <span>{report.year} - {report.term}</span>
                                   {report.status === 'Available' ? (
                                       <Button variant="link" size="sm" onClick={() => handleDownloadReport(report.fileUrl)}>
                                           Download
                                       </Button>
                                   ) : (
                                       <span className="text-xs text-gray-400 italic">({report.status})</span>
                                   )}
                               </li>
                           ))}
                       </ul>
                   ) : (
                       <p className="text-sm text-gray-500">No report cards available.</p>
                   )}
               </CardBody>
           </Card>
        </div>
      </div>
    </div>
  );
} 