'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/Card"; // Corrected import path casing
import { Button } from "@/components/ui/Button"; // Corrected import path casing
import { BellIcon, EnvelopeIcon, CalendarDaysIcon, DocumentTextIcon, ExclamationTriangleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'; // Added CurrencyDollarIcon
import { toast } from 'react-hot-toast';

// --- Dummy Data Structures ---
interface DummyStudent {
  name: string;
  studentId: string;
  class: string;
  admissionNo: string;
  photoUrl?: string; // Optional
}

interface DummyFees{
  id: string;
  studentId: string;
  amount: number;
  expectedamount: number;
  amountpaid: number;
  balance: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  date: string;
}

interface DummyAnnouncement {
  id: string;
  title: string;
  date: string;
  contentSnippet: string;
}

interface DummyAbsence {
  date: string;
  reason?: string; // Optional
  status: 'Excused' | 'Unexcused' | 'Pending';
}

// --- Dummy Data ---
const dummyStudent: DummyStudent = {
  name: "Alex Johnson",
  studentId: "S12345",
  class: "Form 4N",
  admissionNo: "FE21A440",
  photoUrl: "/placeholder-student.png", // Replace with actual path or remove
};

const dummyFees: DummyFees[] = [
  { id: 'fee1', studentId: 'S12345', amount: 100000, expectedamount: 100000, amountpaid: 50000, balance: 50000, status: 'Paid', date: "2023-10-25" },
];


const dummyAnnouncements: DummyAnnouncement[] = [
  { id: 'ann1', title: "Mid-Term Break Schedule", date: "2023-10-25", contentSnippet: "School will be closed for mid-term break from..." },
  { id: 'ann2', title: "Parent-Teacher Meeting", date: "2023-10-22", contentSnippet: "Sign up for parent-teacher meeting slots next week..." },
  { id: 'ann3', title: "Sports Day Postponed", date: "2023-10-20", contentSnippet: "Due to weather conditions, Sports Day has been..." },
];

const dummyAbsences: DummyAbsence[] = [
  { date: "2023-10-23", status: 'Excused', reason: "Doctor's appointment" },
  { date: "2023-10-19", status: 'Unexcused' },
];

// --- Parent Dashboard Page Component ---
export default function ParentDashboardPage() {

  // Placeholder Action Handlers
  const handleSendAbsenceNotification = () => {
    console.log("Action: Send Absence Notification");
    toast.success("Absence notification sent (Simulated)");
  };

  const handleSendPaymentNotification = () => {
    console.log("Action: Send Payment Notification");
    toast.success("Payment notification sent (Simulated)");
  };

  const handleWriteMessage = () => {
    console.log("Action: Write Message");
    toast("Feature to write message not implemented yet.");
  };

  const handleViewReportCard = () => {
      console.log("Action: View Report Card");
      toast("Feature to view report card not implemented yet.");
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Parent Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Student Profile Card --- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Student Profile</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col items-center space-y-3">
            {/* Basic placeholder image */} 
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-xs">Photo</span> 
            </div>
             {/* <img 
               src={dummyStudent.photoUrl || '/default-avatar.png'} 
               alt="Student Photo" 
               className="w-24 h-24 rounded-full object-cover border" 
             /> */}
            <h2 className="text-xl font-semibold">{dummyStudent.name}</h2>
            <p className="text-gray-600">Class: {dummyStudent.class}</p>
            <p className="text-gray-600">Matricule Number: {dummyStudent.admissionNo}</p>
      

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="bg-white p-2 rounded border">
                                    <span className="font-medium text-gray-500 block">Expected Fees:</span>
                                    <span className="text-gray-800">FCFA {dummyFees[0].expectedamount.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-2 rounded border">
                                    <span className="font-medium text-gray-500 block">Paid to Date:</span>
                                    <span className="text-green-600">FCFA {dummyFees[0].amountpaid.toLocaleString()}</span>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <span className="font-medium text-gray-500   block">Outstanding:</span>
                                    <span className={`font-semibold ${dummyFees[0].balance > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                        FCFA {dummyFees[0].balance.toLocaleString()}
                                    </span>
                                  </div>
                                  </div>

          </CardBody>
        </Card>

        {/* --- Announcements Card --- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
                <BellIcon className="w-5 h-5 mr-2 text-blue-600"/>
                Announcements
            </CardTitle>
          </CardHeader>
          <CardBody>
            {dummyAnnouncements.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {dummyAnnouncements.map(ann => (
                  <li key={ann.id} className="py-3">
                    <p className="font-medium text-gray-800">{ann.title}</p>
                    <p className="text-sm text-gray-500">{ann.date}</p>
                    <p className="text-sm text-gray-600 mt-1">{ann.contentSnippet}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No recent announcements.</p>
            )}
          </CardBody>
           <CardFooter className="text-right">
                <Button variant="link" size="sm">View All Announcements</Button>
           </CardFooter>
        </Card>
      </div>

       {/* --- Student Details & Actions Card --- */}
       <Card>
           <CardHeader>
               <CardTitle className="text-lg">Student Details & Actions</CardTitle>
           </CardHeader>
           <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Absence Section */} 
               <div>
                   <h3 className="font-semibold mb-3 flex items-center">
                      <CalendarDaysIcon className="w-5 h-5 mr-2 text-orange-600"/>
                      Recent Absences
                   </h3>
                    {dummyAbsences.length > 0 ? (
                        <ul className="space-y-2">
                            {dummyAbsences.map((abs, index) => (
                            <li key={index} className="text-sm p-2 border rounded-md flex justify-between items-center">
                                <span>{abs.date} - <span className={`font-medium ${abs.status === 'Unexcused' ? 'text-red-600' : abs.status === 'Excused' ? 'text-green-600' : 'text-yellow-600'}`}>{abs.status}</span></span>
                                {abs.reason && <span className="text-gray-500 text-xs">({abs.reason})</span>}
                            </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">No recent absences recorded.</p>
                    )}
                     <Button variant="link" size="sm" className="mt-2">View Full Attendance</Button>
               </div>

                {/* Actions Section */} 
                <div>
                    <h3 className="font-semibold mb-3">Actions</h3>
                    <div className="space-y-3 flex flex-col items-start">
                        <Button onClick={handleViewReportCard} variant="outline" size="sm" className="w-full md:w-auto justify-start">
                           <DocumentTextIcon className="w-4 h-4 mr-2"/> View Report Card
                        </Button>
                        <Button onClick={handleSendAbsenceNotification} variant="outline" size="sm" className="w-full md:w-auto justify-start">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-2"/> Report Future Absence
                        </Button>
                         <Button onClick={handleSendPaymentNotification} variant="outline" size="sm" className="w-full md:w-auto justify-start">
                            <CurrencyDollarIcon className="w-4 h-4 mr-2"/> Send Proof of Payment
                         </Button>
                         <Button onClick={handleWriteMessage} variant="outline" size="sm" className="w-full md:w-auto justify-start">
                           <EnvelopeIcon className="w-4 h-4 mr-2"/> Write Message to School
                        </Button>
                    </div>
                </div>
           </CardBody>
       </Card>

    </div>
  );
} 