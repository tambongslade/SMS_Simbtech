'use client'
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardDocumentCheckIcon, ExclamationCircleIcon, CheckCircleIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import Link from 'next/link';

// Define types for our data
interface Student {
  id: string;
  name: string;
  class: string;
}

interface Remark {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  type: 'Academic' | 'Behavioral' | 'Other';
  content: string;
  severity: 'Low' | 'Medium' | 'High';
}

// Mock data for students
const mockStudents: Student[] = [
  { id: '001', name: 'Alice Johnson', class: 'Form 1 South' },
  { id: '002', name: 'Bob Smith', class: 'Form 2' },
  { id: '003', name: 'Charlie Brown', class: 'Form 1 North' },
  { id: '004', name: 'Diana Prince', class: 'Form 3' },
  { id: '005', name: 'Ethan Hunt', class: 'Form 2' },
  { id: '006', name: 'Fiona Gallagher', class: 'Form 4' },
  { id: '007', name: 'George Wilson', class: 'Form 5' },
];

// Mock data for remarks
const mockRemarks: Remark[] = [
  { id: '1', studentId: '002', studentName: 'Bob Smith', date: '2025-02-10', type: 'Academic', content: 'Struggling with mathematics. Recommended additional tutoring.', severity: 'Medium' },
  { id: '2', studentId: '003', studentName: 'Charlie Brown', date: '2025-02-12', type: 'Behavioral', content: 'Disruptive in class. Had a conversation about respect for others.', severity: 'Medium' },
  { id: '3', studentId: '005', studentName: 'Ethan Hunt', date: '2025-02-15', type: 'Academic', content: 'Missing multiple assignments. Parents contacted.', severity: 'High' },
  { id: '4', studentId: '005', studentName: 'Ethan Hunt', date: '2025-02-18', type: 'Behavioral', content: 'Involved in a conflict with another student. Mediation session conducted.', severity: 'High' },
  { id: '5', studentId: '001', studentName: 'Alice Johnson', date: '2025-02-20', type: 'Academic', content: 'Excellent progress in science class. Considering advanced placement.', severity: 'Low' },
  { id: '6', studentId: '006', studentName: 'Fiona Gallagher', date: '2025-02-22', type: 'Other', content: 'Family situation affecting attendance. Referred to social services for support.', severity: 'Medium' },
  { id: '7', studentId: '004', studentName: 'Diana Prince', date: '2025-02-25', type: 'Academic', content: 'Consistently high performance across all subjects.', severity: 'Low' },
];

// Component that uses useSearchParams - needs to be wrapped in Suspense
function RemarksPageContent() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const actionParam = searchParams.get('action');
  const autocompleteRef = useRef<HTMLDivElement>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [filteredRemarks, setFilteredRemarks] = useState<Remark[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [remarkFilter, setRemarkFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddRemarkForm, setShowAddRemarkForm] = useState(false);
  const [newRemark, setNewRemark] = useState({
    studentId: '',
    type: 'Academic' as const,
    content: '',
    severity: 'Low' as const
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Autocomplete state
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Load mock data
  useEffect(() => {
    setStudents(mockStudents);
    setRemarks(mockRemarks);
    setFilteredRemarks(mockRemarks);
    
    // Handle URL parameters
    if (studentIdParam) {
      const student = mockStudents.find(s => s.id === studentIdParam);
      if (student) {
        setSelectedStudent(student);
        setFilteredRemarks(mockRemarks.filter(r => r.studentId === studentIdParam));
        setNewRemark(prev => ({
          ...prev,
          studentId: studentIdParam
        }));
        setStudentSearchTerm(student.name);
      }
    }
    
    if (actionParam === 'add') {
      setShowAddRemarkForm(true);
      if (studentIdParam) {
        setNewRemark(prev => ({
          ...prev,
          studentId: studentIdParam
        }));
      }
    }
  }, [studentIdParam, actionParam]);

  // Filter remarks based on search and filter
  useEffect(() => {
    let filtered = [...remarks];
    
    if (searchTerm) {
      filtered = filtered.filter(remark => 
        remark.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        remark.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        remark.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (remarkFilter !== 'all') {
      filtered = filtered.filter(remark => {
        if (remarkFilter === 'academic') return remark.type === 'Academic';
        if (remarkFilter === 'behavioral') return remark.type === 'Behavioral';
        if (remarkFilter === 'other') return remark.type === 'Other';
        if (remarkFilter === 'high') return remark.severity === 'High';
        if (remarkFilter === 'medium') return remark.severity === 'Medium';
        if (remarkFilter === 'low') return remark.severity === 'Low';
        return true;
      });
    }
    
    if (selectedStudent) {
      filtered = filtered.filter(remark => remark.studentId === selectedStudent.id);
    }
    
    setFilteredRemarks(filtered);
  }, [searchTerm, remarkFilter, remarks, selectedStudent]);

  // Filter students for autocomplete
  useEffect(() => {
    if (studentSearchTerm) {
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.class.toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [studentSearchTerm, students]);

  // Handle click outside autocomplete
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAddRemark = () => {
    if (!newRemark.studentId || !newRemark.content) {
      setToast({
        show: true,
        message: 'Please select a student and enter remark content',
        type: 'error'
      });
      return;
    }

    const student = students.find(s => s.id === newRemark.studentId);
    
    if (!student) {
      setToast({
        show: true,
        message: 'Selected student not found',
        type: 'error'
      });
      return;
    }
    
    const newRemarkObj: Remark = {
      id: crypto.randomUUID(),
      studentId: newRemark.studentId,
      studentName: student.name,
      date: new Date().toISOString().split('T')[0],
      type: newRemark.type,
      content: newRemark.content,
      severity: newRemark.severity
    };
    
    setRemarks([newRemarkObj, ...remarks]);
    
    // If a student is selected, update filtered remarks
    if (selectedStudent && selectedStudent.id === newRemark.studentId) {
      setFilteredRemarks([newRemarkObj, ...filteredRemarks]);
    }
    
    setNewRemark({
      studentId: '',
      type: 'Academic',
      content: '',
      severity: 'Low'
    });
    setStudentSearchTerm('');
    
    setShowAddRemarkForm(false);
    
    setToast({
      show: true,
      message: 'Remark added successfully',
      type: 'success'
    });
    
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleDeleteRemark = (id: string) => {
    const updatedRemarks = remarks.filter(remark => remark.id !== id);
    setRemarks(updatedRemarks);
    setFilteredRemarks(filteredRemarks.filter(remark => remark.id !== id));
    
    setToast({
      show: true,
      message: 'Remark deleted successfully',
      type: 'success'
    });
    
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleStudentSelect = (student: Student | null) => {
    setSelectedStudent(student);
    if (student) {
      setFilteredRemarks(remarks.filter(remark => remark.studentId === student.id));
    } else {
      setFilteredRemarks(remarks);
    }
  };

  const handleStudentSuggestionSelect = (student: Student) => {
    setStudentSearchTerm(student.name);
    setNewRemark({
      ...newRemark,
      studentId: student.id
    });
    setShowSuggestions(false);
  };

  const clearStudentSelection = () => {
    setStudentSearchTerm('');
    setNewRemark({
      ...newRemark,
      studentId: ''
    });
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
          <h1 className="text-2xl font-bold">Student Remarks</h1>
          <p className="text-gray-600 mt-1">
            Add and manage remarks for student academic and behavioral progress
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Link href="/dashboard/guidancecounselor">
            <Button className="bg-gray-200 text-gray-700 hover:bg-gray-300">
              Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/guidancecounselor/students">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Student Management
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
              placeholder="Search by student name, ID, or content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type Filter</label>
            <select
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={remarkFilter}
              onChange={(e) => setRemarkFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="academic">Academic</option>
              <option value="behavioral">Behavioral</option>
              <option value="other">Other</option>
              <option value="high">High Severity</option>
              <option value="medium">Medium Severity</option>
              <option value="low">Low Severity</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Filter</label>
            <select
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const studentId = e.target.value;
                if (studentId === '') {
                  handleStudentSelect(null);
                } else {
                  const student = students.find(s => s.id === studentId);
                  if (student) {
                    handleStudentSelect(student);
                  }
                }
              }}
            >
              <option value="">All Students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Add Remark Button */}
        {!showAddRemarkForm && (
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowAddRemarkForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Remark
            </Button>
          </div>
        )}

        {/* Add Remark Form */}
        {showAddRemarkForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Add New Remark</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div ref={autocompleteRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Type to search for a student..."
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      required
                    />
                    {newRemark.studentId && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={clearStudentSelection}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Student suggestions dropdown */}
                  {showSuggestions && studentSearchTerm && filteredStudents.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                      <ul className="py-1">
                        {filteredStudents.map((student) => (
                          <li 
                            key={student.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onClick={() => handleStudentSuggestionSelect(student)}
                          >
                            <div className="flex justify-between">
                              <span className="font-medium">{student.name}</span>
                              <span className="text-sm text-gray-500">ID: {student.id} | {student.class}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {showSuggestions && studentSearchTerm && filteredStudents.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200">
                      <p className="px-4 py-2 text-gray-500">No students found</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remark Type</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newRemark.type}
                    onChange={(e) => setNewRemark({
                      ...newRemark,
                      type: e.target.value as 'Academic' | 'Behavioral' | 'Other'
                    })}
                  >
                    <option value="Academic">Academic</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newRemark.severity}
                    onChange={(e) => setNewRemark({
                      ...newRemark,
                      severity: e.target.value as 'Low' | 'Medium' | 'High'
                    })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remark Content</label>
                  <textarea
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    value={newRemark.content}
                    onChange={(e) => setNewRemark({
                      ...newRemark,
                      content: e.target.value
                    })}
                    placeholder="Enter detailed remarks about the student..."
                    required
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setShowAddRemarkForm(false);
                      setNewRemark({
                        studentId: '',
                        type: 'Academic',
                        content: '',
                        severity: 'Low'
                      });
                      setStudentSearchTerm('');
                    }}
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddRemark}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Remark
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Remarks List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg font-bold">
                {selectedStudent ? `Remarks for ${selectedStudent.name}` : 'All Remarks'}
              </CardTitle>
              <p className="text-xs text-gray-500">{filteredRemarks.length} remarks</p>
            </div>
          </CardHeader>
          <CardBody className="px-0">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredRemarks.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredRemarks.map((remark) => (
                    <li key={remark.id} className="px-4 py-4">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <p className="font-medium">{remark.studentName}</p>
                            <span className="mx-2 text-gray-300">|</span>
                            <p className="text-sm text-gray-500">ID: {remark.studentId}</p>
                            <span className="mx-2 text-gray-300">|</span>
                            <p className="text-sm text-gray-500">{remark.date}</p>
                          </div>
                          <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              remark.type === 'Academic' ? 'bg-blue-100 text-blue-800' :
                              remark.type === 'Behavioral' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {remark.type}
                            </span>
                            <span className="mx-2"></span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              remark.severity === 'Low' ? 'bg-green-100 text-green-800' :
                              remark.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {remark.severity} Severity
                            </span>
                          </div>
                          <p className="text-gray-700">{remark.content}</p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => handleDeleteRemark(remark.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <ClipboardDocumentCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No remarks found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedStudent 
                      ? `No remarks have been added for ${selectedStudent.name} yet.` 
                      : 'No remarks match your search criteria.'}
                  </p>
                  <div className="mt-4">
                    <Button 
                      onClick={() => {
                        setShowAddRemarkForm(true);
                        if (selectedStudent) {
                          setNewRemark(prev => ({
                            ...prev,
                            studentId: selectedStudent.id
                          }));
                          setStudentSearchTerm(selectedStudent.name);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add a Remark
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Loading component for Suspense fallback
function RemarksPageLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="h-4 bg-gray-200 rounded w-1/6 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function RemarksPage() {
  return (
    <Suspense fallback={<RemarksPageLoading />}>
      <RemarksPageContent />
    </Suspense>
  );
}