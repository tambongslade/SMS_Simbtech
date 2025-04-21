'use client'
import { useState, useEffect } from 'react';
import { UserGroupIcon, AcademicCapIcon, ExclamationCircleIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import Link from 'next/link';

// Define types for our data
interface Student {
  id: string;
  name: string;
  class: string;
  academicStatus: 'Excellent' | 'Good' | 'At Risk';
  behaviorStatus: 'Good' | 'Concerning';
  gender: string;
  dateOfBirth: string;
  contactInfo: string;
  parentName: string;
  parentContact: string;
}

// Mock data for students
const mockStudents: Student[] = [
  { 
    id: '001', 
    name: 'Alice Johnson', 
    class: 'Form 1 South', 
    academicStatus: 'Good', 
    behaviorStatus: 'Good',
    gender: 'Female',
    dateOfBirth: '2010-05-15',
    contactInfo: 'alice.j@example.com',
    parentName: 'Robert Johnson',
    parentContact: 'robert.j@example.com | 555-1234'
  },
  { 
    id: '002', 
    name: 'Bob Smith', 
    class: 'Form 2', 
    academicStatus: 'At Risk', 
    behaviorStatus: 'Good',
    gender: 'Male',
    dateOfBirth: '2009-08-22',
    contactInfo: 'bob.s@example.com',
    parentName: 'Mary Smith',
    parentContact: 'mary.s@example.com | 555-2345'
  },
  { 
    id: '003', 
    name: 'Charlie Brown', 
    class: 'Form 1 North', 
    academicStatus: 'Good', 
    behaviorStatus: 'Concerning',
    gender: 'Male',
    dateOfBirth: '2010-03-10',
    contactInfo: 'charlie.b@example.com',
    parentName: 'Lucy Brown',
    parentContact: 'lucy.b@example.com | 555-3456'
  },
  { 
    id: '004', 
    name: 'Diana Prince', 
    class: 'Form 3', 
    academicStatus: 'Excellent', 
    behaviorStatus: 'Good',
    gender: 'Female',
    dateOfBirth: '2008-11-05',
    contactInfo: 'diana.p@example.com',
    parentName: 'Steve Prince',
    parentContact: 'steve.p@example.com | 555-4567'
  },
  { 
    id: '005', 
    name: 'Ethan Hunt', 
    class: 'Form 2', 
    academicStatus: 'At Risk', 
    behaviorStatus: 'Concerning',
    gender: 'Male',
    dateOfBirth: '2009-07-18',
    contactInfo: 'ethan.h@example.com',
    parentName: 'Julia Hunt',
    parentContact: 'julia.h@example.com | 555-5678'
  },
  { 
    id: '006', 
    name: 'Fiona Gallagher', 
    class: 'Form 4', 
    academicStatus: 'Good', 
    behaviorStatus: 'Good',
    gender: 'Female',
    dateOfBirth: '2007-02-25',
    contactInfo: 'fiona.g@example.com',
    parentName: 'Frank Gallagher',
    parentContact: 'frank.g@example.com | 555-6789'
  },
  { 
    id: '007', 
    name: 'George Wilson', 
    class: 'Form 5', 
    academicStatus: 'Excellent', 
    behaviorStatus: 'Good',
    gender: 'Male',
    dateOfBirth: '2006-09-12',
    contactInfo: 'george.w@example.com',
    parentName: 'Helen Wilson',
    parentContact: 'helen.w@example.com | 555-7890'
  },
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Load mock data
  useEffect(() => {
    setStudents(mockStudents);
    setFilteredStudents(mockStudents);
  }, []);

  // Filter students based on search and filter
  useEffect(() => {
    let filtered = [...students];
    
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (studentFilter !== 'all') {
      filtered = filtered.filter(student => {
        if (studentFilter === 'academicRisk') return student.academicStatus === 'At Risk';
        if (studentFilter === 'behaviorConcern') return student.behaviorStatus === 'Concerning';
        if (studentFilter === 'excellent') return student.academicStatus === 'Excellent';
        return true;
      });
    }
    
    setFilteredStudents(filtered);
  }, [searchTerm, studentFilter, students]);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
  };

  const clearStudentSelection = () => {
    setSelectedStudent(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          <div className="flex items-center">
            {toast.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mr-2" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 mr-2" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Management</h1>
          <p className="text-gray-600 mt-1">
            View and manage student profiles, academic and behavioral status
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link href="/dashboard/guidancecounselor">
            <Button className="bg-gray-200 text-gray-700 hover:bg-gray-300">
              Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/guidancecounselor/remarks">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Manage Remarks
            </Button>
          </Link>
          <Link href="/dashboard/guidancecounselor/behavior">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
              Behavior Monitoring
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by name, ID, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
            <select
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="all">All Students</option>
              <option value="excellent">Excellent Performance</option>
              <option value="academicRisk">Academic Risk</option>
              <option value="behaviorConcern">Behavior Concerns</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Students</CardTitle>
              <span className="text-xs text-gray-500">{filteredStudents.length} students</span>
            </CardHeader>
            <CardBody className="px-0">
              <div className="max-h-[600px] overflow-y-auto">
                <ul className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <li 
                      key={student.id}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                        selectedStudent?.id === student.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => handleStudentSelect(student)}
                    >
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">ID: {student.id} | {student.class}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.academicStatus === 'Excellent' ? 'bg-green-100 text-green-800' :
                            student.academicStatus === 'Good' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {student.academicStatus}
                          </span>
                          <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.behaviorStatus === 'Good' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {student.behaviorStatus}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Student Details */}
        <div className="lg:col-span-2">
          {selectedStudent ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-xl font-bold">{selectedStudent.name}</CardTitle>
                  <p className="text-sm text-gray-500">ID: {selectedStudent.id} | {selectedStudent.class}</p>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={clearStudentSelection}
                    className="text-xs bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Close
                  </Button>
                  <Link href={`/dashboard/guidancecounselor/remarks?studentId=${selectedStudent.id}`}>
                    <Button className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                      View Remarks
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Personal Information</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Gender:</span>
                          <span className="text-sm font-medium">{selectedStudent.gender}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Date of Birth:</span>
                          <span className="text-sm font-medium">{selectedStudent.dateOfBirth}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Contact:</span>
                          <span className="text-sm font-medium">{selectedStudent.contactInfo}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Parent/Guardian Information</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Name:</span>
                          <span className="text-sm font-medium">{selectedStudent.parentName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Contact:</span>
                          <span className="text-sm font-medium">{selectedStudent.parentContact}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Academic Status</h3>
                      <div className="mt-2">
                        <div className={`p-3 rounded-md ${
                          selectedStudent.academicStatus === 'Excellent' ? 'bg-green-50 border border-green-200' :
                          selectedStudent.academicStatus === 'Good' ? 'bg-blue-50 border border-blue-200' :
                          'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`font-medium ${
                            selectedStudent.academicStatus === 'Excellent' ? 'text-green-700' :
                            selectedStudent.academicStatus === 'Good' ? 'text-blue-700' :
                            'text-red-700'
                          }`}>
                            {selectedStudent.academicStatus}
                          </p>
                          <p className="text-sm mt-1">
                            {selectedStudent.academicStatus === 'Excellent' ? 
                              'Student is performing exceptionally well in academic subjects.' :
                              selectedStudent.academicStatus === 'Good' ? 
                              'Student is meeting academic expectations satisfactorily.' :
                              'Student requires additional academic support and intervention.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Behavior Status</h3>
                      <div className="mt-2">
                        <div className={`p-3 rounded-md ${
                          selectedStudent.behaviorStatus === 'Good' ? 'bg-green-50 border border-green-200' :
                          'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <p className={`font-medium ${
                            selectedStudent.behaviorStatus === 'Good' ? 'text-green-700' :
                            'text-yellow-700'
                          }`}>
                            {selectedStudent.behaviorStatus}
                          </p>
                          <p className="text-sm mt-1">
                            {selectedStudent.behaviorStatus === 'Good' ? 
                              'Student demonstrates appropriate behavior and follows school rules.' :
                              'Student has shown concerning behavior patterns that require attention.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Link href={`/dashboard/guidancecounselor/behavior?studentId=${selectedStudent.id}`}>
                    <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
                      Behavior Records
                    </Button>
                  </Link>
                  <Link href={`/dashboard/guidancecounselor/remarks?studentId=${selectedStudent.id}&action=add`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Add New Remark
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 w-full">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Student Selected</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Select a student from the list to view their detailed information
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 