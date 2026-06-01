'use client'
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExclamationCircleIcon, CheckCircleIcon, TrashIcon, PlusIcon, ShieldExclamationIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import Link from 'next/link';

// Define types for our data
interface Student {
  id: string;
  name: string;
  class: string;
}

interface BehaviorRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  incidentType: 'Disruptive' | 'Bullying' | 'Attendance' | 'Academic Dishonesty' | 'Other';
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  actionTaken: string;
  resolved: boolean;
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

// Mock data for behavior records
const mockBehaviorRecords: BehaviorRecord[] = [
  { 
    id: '1', 
    studentId: '003', 
    studentName: 'Charlie Brown', 
    date: '2025-02-12', 
    incidentType: 'Disruptive', 
    description: 'Disrupted class by talking loudly and not following teacher instructions.', 
    severity: 'Medium',
    actionTaken: 'Verbal warning and discussion about classroom behavior expectations.',
    resolved: true
  },
  { 
    id: '2', 
    studentId: '005', 
    studentName: 'Ethan Hunt', 
    date: '2025-02-18', 
    incidentType: 'Bullying', 
    description: 'Reported for intimidating behavior towards another student during lunch break.', 
    severity: 'High',
    actionTaken: 'Meeting with parents scheduled. Temporary suspension from extracurricular activities.',
    resolved: false
  },
  { 
    id: '3', 
    studentId: '002', 
    studentName: 'Bob Smith', 
    date: '2025-02-20', 
    incidentType: 'Attendance', 
    description: 'Has missed 5 days of school in the past two weeks without proper documentation.', 
    severity: 'Medium',
    actionTaken: 'Parents contacted to discuss attendance issues.',
    resolved: true
  },
  { 
    id: '4', 
    studentId: '005', 
    studentName: 'Ethan Hunt', 
    date: '2025-02-25', 
    incidentType: 'Academic Dishonesty', 
    description: 'Caught copying answers during mathematics exam.', 
    severity: 'High',
    actionTaken: 'Zero marks for the exam. Parent-teacher conference scheduled.',
    resolved: false
  },
  { 
    id: '5', 
    studentId: '003', 
    studentName: 'Charlie Brown', 
    date: '2025-03-01', 
    incidentType: 'Disruptive', 
    description: 'Using mobile phone during class despite multiple warnings.', 
    severity: 'Low',
    actionTaken: 'Phone confiscated for the day. Will be returned to parents only.',
    resolved: true
  },
];

// Component that uses useSearchParams - needs to be wrapped in Suspense
function BehaviorPageContent() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const autocompleteRef = useRef<HTMLDivElement>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BehaviorRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recordFilter, setRecordFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    studentId: '',
    incidentType: 'Disruptive' as const,
    description: '',
    severity: 'Low' as const,
    actionTaken: '',
    resolved: false
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Autocomplete state
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  // Load mock data
  useEffect(() => {
    setStudents(mockStudents);
    setBehaviorRecords(mockBehaviorRecords);
    setFilteredRecords(mockBehaviorRecords);
    
    // Handle URL parameters
    if (studentIdParam) {
      const student = mockStudents.find(s => s.id === studentIdParam);
      if (student) {
        setSelectedStudent(student);
        setFilteredRecords(mockBehaviorRecords.filter(r => r.studentId === studentIdParam));
        setNewRecord(prev => ({
          ...prev,
          studentId: studentIdParam
        }));
        setStudentSearchTerm(student.name);
      }
    }
  }, [studentIdParam]);

  // Filter behavior records based on search and filter
  useEffect(() => {
    let filtered = [...behaviorRecords];
    
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.actionTaken.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (recordFilter !== 'all') {
      filtered = filtered.filter(record => {
        if (recordFilter === 'disruptive') return record.incidentType === 'Disruptive';
        if (recordFilter === 'bullying') return record.incidentType === 'Bullying';
        if (recordFilter === 'attendance') return record.incidentType === 'Attendance';
        if (recordFilter === 'academic') return record.incidentType === 'Academic Dishonesty';
        if (recordFilter === 'high') return record.severity === 'High';
        if (recordFilter === 'unresolved') return !record.resolved;
        if (recordFilter === 'resolved') return record.resolved;
        return true;
      });
    }
    
    if (selectedStudent) {
      filtered = filtered.filter(record => record.studentId === selectedStudent.id);
    }
    
    setFilteredRecords(filtered);
  }, [searchTerm, recordFilter, behaviorRecords, selectedStudent]);
  
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

  const handleAddRecord = () => {
    if (!newRecord.studentId || !newRecord.description || !newRecord.actionTaken) {
      setToast({
        show: true,
        message: 'Please fill in all required fields',
        type: 'error'
      });
      return;
    }

    const student = students.find(s => s.id === newRecord.studentId);
    
    if (!student) {
      setToast({
        show: true,
        message: 'Selected student not found',
        type: 'error'
      });
      return;
    }
    
    const newBehaviorRecord: BehaviorRecord = {
      id: crypto.randomUUID(),
      studentId: newRecord.studentId,
      studentName: student.name,
      date: new Date().toISOString().split('T')[0],
      incidentType: newRecord.incidentType,
      description: newRecord.description,
      severity: newRecord.severity,
      actionTaken: newRecord.actionTaken,
      resolved: newRecord.resolved
    };
    
    setBehaviorRecords([newBehaviorRecord, ...behaviorRecords]);
    
    // If a student is selected, update filtered records
    if (selectedStudent && selectedStudent.id === newRecord.studentId) {
      setFilteredRecords([newBehaviorRecord, ...filteredRecords]);
    }
    
    setNewRecord({
      studentId: '',
      incidentType: 'Disruptive',
      description: '',
      severity: 'Low',
      actionTaken: '',
      resolved: false
    });
    setStudentSearchTerm('');
    
    setShowAddForm(false);
    
    setToast({
      show: true,
      message: 'Behavior record added successfully',
      type: 'success'
    });
    
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleDeleteRecord = (id: string) => {
    const updatedRecords = behaviorRecords.filter(record => record.id !== id);
    setBehaviorRecords(updatedRecords);
    setFilteredRecords(filteredRecords.filter(record => record.id !== id));
    
    setToast({
      show: true,
      message: 'Behavior record deleted successfully',
      type: 'success'
    });
    
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleToggleResolved = (id: string) => {
    const updatedRecords = behaviorRecords.map(record => 
      record.id === id ? { ...record, resolved: !record.resolved } : record
    );
    
    setBehaviorRecords(updatedRecords);
    setFilteredRecords(filteredRecords.map(record => 
      record.id === id ? { ...record, resolved: !record.resolved } : record
    ));
    
    const record = behaviorRecords.find(r => r.id === id);
    
    setToast({
      show: true,
      message: `Behavior record marked as ${record?.resolved ? 'unresolved' : 'resolved'}`,
      type: 'success'
    });
    
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleStudentSelect = (student: Student | null) => {
    setSelectedStudent(student);
    if (student) {
      setFilteredRecords(behaviorRecords.filter(record => record.studentId === student.id));
      setNewRecord(prev => ({
        ...prev,
        studentId: student.id
      }));
    } else {
      setFilteredRecords(behaviorRecords);
    }
  };
  
  const handleStudentSuggestionSelect = (student: Student) => {
    setStudentSearchTerm(student.name);
    setNewRecord({
      ...newRecord,
      studentId: student.id
    });
    setShowSuggestions(false);
  };

  const clearStudentSelection = () => {
    setStudentSearchTerm('');
    setNewRecord({
      ...newRecord,
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
          <h1 className="text-2xl font-bold">Behavior Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Track and manage student behavior incidents and interventions
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
          <Link href="/dashboard/guidancecounselor/remarks">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Manage Remarks
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
              placeholder="Search by student name, ID, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
            <select
              className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value)}
            >
              <option value="all">All Records</option>
              <option value="disruptive">Disruptive Behavior</option>
              <option value="bullying">Bullying</option>
              <option value="attendance">Attendance Issues</option>
              <option value="academic">Academic Dishonesty</option>
              <option value="high">High Severity</option>
              <option value="unresolved">Unresolved Issues</option>
              <option value="resolved">Resolved Issues</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
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
        {/* Add Record Button */}
        {!showAddForm && (
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Behavior Record
            </Button>
          </div>
        )}

        {/* Add Record Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Add Behavior Record</CardTitle>
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
                    {newRecord.studentId && (
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newRecord.incidentType}
                    onChange={(e) => setNewRecord({
                      ...newRecord,
                      incidentType: e.target.value as 'Disruptive' | 'Bullying' | 'Attendance' | 'Academic Dishonesty' | 'Other'
                    })}
                  >
                    <option value="Disruptive">Disruptive Behavior</option>
                    <option value="Bullying">Bullying</option>
                    <option value="Attendance">Attendance Issues</option>
                    <option value="Academic Dishonesty">Academic Dishonesty</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newRecord.severity}
                    onChange={(e) => setNewRecord({
                      ...newRecord,
                      severity: e.target.value as 'Low' | 'Medium' | 'High'
                    })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Incident Description</label>
                  <textarea
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({
                      ...newRecord,
                      description: e.target.value
                    })}
                    placeholder="Describe the incident in detail..."
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action Taken</label>
                  <textarea
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={newRecord.actionTaken}
                    onChange={(e) => setNewRecord({
                      ...newRecord,
                      actionTaken: e.target.value
                    })}
                    placeholder="Describe the actions taken to address the incident..."
                    required
                  ></textarea>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="resolved"
                    checked={newRecord.resolved}
                    onChange={(e) => setNewRecord({
                      ...newRecord,
                      resolved: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="resolved" className="ml-2 block text-sm text-gray-900">
                    Mark as resolved
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewRecord({
                        studentId: '',
                        incidentType: 'Disruptive',
                        description: '',
                        severity: 'Low',
                        actionTaken: '',
                        resolved: false
                      });
                      setStudentSearchTerm('');
                    }}
                    className="bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddRecord}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Add Record
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Behavior Records List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg font-bold">
                {selectedStudent ? `Behavior Records for ${selectedStudent.name}` : 'All Behavior Records'}
              </CardTitle>
              <p className="text-xs text-gray-500">{filteredRecords.length} records</p>
            </div>
          </CardHeader>
          <CardBody className="px-0">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredRecords.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <li key={record.id} className="px-4 py-4">
                      <div className="flex justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <p className="font-medium">{record.studentName}</p>
                            <span className="mx-2 text-gray-300">|</span>
                            <p className="text-sm text-gray-500">ID: {record.studentId}</p>
                            <span className="mx-2 text-gray-300">|</span>
                            <p className="text-sm text-gray-500">{record.date}</p>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {record.resolved ? 'Resolved' : 'Unresolved'}
                            </span>
                          </div>
                          <div className="flex items-center mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.incidentType === 'Disruptive' ? 'bg-orange-100 text-orange-800' :
                              record.incidentType === 'Bullying' ? 'bg-red-100 text-red-800' :
                              record.incidentType === 'Attendance' ? 'bg-blue-100 text-blue-800' :
                              record.incidentType === 'Academic Dishonesty' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {record.incidentType}
                            </span>
                            <span className="mx-2"></span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.severity === 'Low' ? 'bg-green-100 text-green-800' :
                              record.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {record.severity} Severity
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700">Incident Description:</h4>
                              <p className="text-sm text-gray-700 mt-1">{record.description}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700">Action Taken:</h4>
                              <p className="text-sm text-gray-700 mt-1">{record.actionTaken}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 flex flex-col space-y-2">
                          <button
                            onClick={() => handleToggleResolved(record.id)}
                            className={`p-1 rounded ${
                              record.resolved ? 'text-green-500 hover:text-green-700 hover:bg-green-50' : 
                              'text-yellow-500 hover:text-yellow-700 hover:bg-yellow-50'
                            }`}
                            title={record.resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete record"
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
                  <ShieldExclamationIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No behavior records found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedStudent 
                      ? `No behavior incidents have been recorded for ${selectedStudent.name}.` 
                      : 'No behavior records match your search criteria.'}
                  </p>
                  <div className="mt-4">
                    <Button 
                      onClick={() => {
                        setShowAddForm(true);
                        if (selectedStudent) {
                          setNewRecord(prev => ({
                            ...prev,
                            studentId: selectedStudent.id
                          }));
                        }
                      }}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      Add a Behavior Record
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
function BehaviorPageLoading() {
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
export default function BehaviorPage() {
  return (
    <Suspense fallback={<BehaviorPageLoading />}>
      <BehaviorPageContent />
    </Suspense>
  );
}