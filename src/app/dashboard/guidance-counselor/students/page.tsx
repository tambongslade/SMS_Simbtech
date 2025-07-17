'use client'
import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  PlusIcon,
  EyeIcon,
  ChatBubbleBottomCenterTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { Card, CardHeader, CardTitle, CardBody, Button, Input, Badge, Table } from '@/components/ui';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// Types
interface Student {
  id: number;
  name: string;
  matricule: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender: 'MALE' | 'FEMALE';
  photo?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  enrollments?: {
    id: number;
    subClass: {
      id: number;
      name: string;
      class: {
        id: number;
        name: string;
      };
    };
    academicYear: {
      id: number;
      name: string;
    };
  }[];
  behaviorRecords?: {
    id: number;
    incident: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    date: string;
  }[];
  remarks?: {
    id: number;
    content: string;
    type: 'ACADEMIC' | 'BEHAVIORAL' | 'PERSONAL';
    createdAt: string;
  }[];
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface SubClass {
  id: number;
  name: string;
  class: {
    id: number;
    name: string;
  };
}

interface NewRemark {
  content: string;
  type: 'ACADEMIC' | 'BEHAVIORAL' | 'PERSONAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function GuidanceCounselorStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [subClasses, setSubClasses] = useState<SubClass[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubClass, setSelectedSubClass] = useState<string>('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [newRemark, setNewRemark] = useState<NewRemark>({ content: '', type: 'ACADEMIC', severity: 'LOW' });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, selectedSubClass, selectedRiskLevel]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Fetch sub-classes and students
      const [subClassesRes, studentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/classes/sub-classes`, { headers }),
        fetch(`${API_BASE_URL}/students`, { headers })
      ]);

      if (subClassesRes.ok) {
        const subClassesData = await subClassesRes.json();
        setSubClasses(subClassesData.data || []);
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        // Add mock behavioral data and calculate risk levels
        const studentsWithBehaviorData = (studentsData.data || []).map((student: Student) => {
          // Mock behavioral and remarks data
          const behaviorRecords = generateMockBehaviorData(student.id);
          const remarks = generateMockRemarksData(student.id);
          const riskLevel = calculateRiskLevel(behaviorRecords, remarks);

          return {
            ...student,
            behaviorRecords,
            remarks,
            riskLevel
          };
        });

        setStudents(studentsWithBehaviorData);
      } else {
        toast.error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data generators (replace with real API calls)
  const generateMockBehaviorData = (studentId: number) => {
    const incidents = [
      'Disruptive behavior in class',
      'Late arrival',
      'Incomplete assignments',
      'Conflict with peers',
      'Positive leadership',
      'Helping other students'
    ];

    const numRecords = Math.floor(Math.random() * 5);
    return Array.from({ length: numRecords }, (_, index) => ({
      id: studentId * 100 + index,
      incident: incidents[Math.floor(Math.random() * incidents.length)],
      severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const generateMockRemarksData = (studentId: number) => {
    const remarks = [
      'Shows excellent academic progress',
      'Needs additional support in mathematics',
      'Demonstrates strong leadership qualities',
      'Has difficulty focusing in class',
      'Works well in group activities'
    ];

    const numRemarks = Math.floor(Math.random() * 3);
    return Array.from({ length: numRemarks }, (_, index) => ({
      id: studentId * 200 + index,
      content: remarks[Math.floor(Math.random() * remarks.length)],
      type: ['ACADEMIC', 'BEHAVIORAL', 'PERSONAL'][Math.floor(Math.random() * 3)] as 'ACADEMIC' | 'BEHAVIORAL' | 'PERSONAL',
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
    }));
  };

  const calculateRiskLevel = (behaviorRecords: any[], remarks: any[]) => {
    const highSeverityIncidents = behaviorRecords.filter(r => r.severity === 'HIGH').length;
    const totalIncidents = behaviorRecords.length;

    if (highSeverityIncidents >= 2 || totalIncidents >= 4) return 'HIGH';
    if (highSeverityIncidents >= 1 || totalIncidents >= 2) return 'MEDIUM';
    return 'LOW';
  };

  const filterStudents = () => {
    let filtered = [...students];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sub-class filter
    if (selectedSubClass) {
      filtered = filtered.filter(student =>
        student.enrollments?.some(enrollment => enrollment.subClass.id.toString() === selectedSubClass)
      );
    }

    // Risk level filter
    if (selectedRiskLevel) {
      filtered = filtered.filter(student => student.riskLevel === selectedRiskLevel);
    }

    setFilteredStudents(filtered);
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  const handleAddRemark = () => {
    if (!selectedStudent) return;
    setShowRemarkModal(true);
  };

  const handleSaveRemark = async () => {
    if (!selectedStudent || !newRemark.content.trim()) {
      toast.error('Please enter remark content');
      return;
    }

    // Mock save - replace with actual API call
    toast.success('Remark added successfully');
    setShowRemarkModal(false);
    setNewRemark({ content: '', type: 'ACADEMIC', severity: 'LOW' });

    // Refresh student data
    fetchInitialData();
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'green';
      default: return 'gray';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'red';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'green';
      default: return 'gray';
    }
  };

  const getAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600">Monitor student behavior, academic progress, and provide guidance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold">{filteredStudents.length}</p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">High Risk</p>
              <p className="text-2xl font-bold">
                {filteredStudents.filter(s => s.riskLevel === 'HIGH').length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center">
            <FlagIcon className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Medium Risk</p>
              <p className="text-2xl font-bold">
                {filteredStudents.filter(s => s.riskLevel === 'MEDIUM').length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Low Risk</p>
              <p className="text-2xl font-bold">
                {filteredStudents.filter(s => s.riskLevel === 'LOW').length}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Students
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search by name or matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Class
              </label>
              <select
                value={selectedSubClass}
                onChange={(e) => setSelectedSubClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {subClasses.map((subClass) => (
                  <option key={subClass.id} value={subClass.id}>
                    {subClass.class.name} - {subClass.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Risk Level
              </label>
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Risk Levels</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="LOW">Low Risk</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSubClass('');
                  setSelectedRiskLevel('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2" />
            Students Overview
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredStudents.length} students)
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No students found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Behavior Records</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StudentPhoto
                          studentId={student.id}
                          photo={student.photo}
                          size="sm"
                          studentName={student.name}
                          fetchPhoto={!student.photo}
                          showUploadButton={true}
                          canUpload={true}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.matricule}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline">
                          {student.enrollments?.[0]?.subClass?.class?.name} - {student.enrollments?.[0]?.subClass?.name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getAge(student.dateOfBirth)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant="solid"
                          color={getRiskLevelColor(student.riskLevel || 'LOW')}
                          size="sm"
                        >
                          {student.riskLevel}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <span className="text-gray-900">{student.behaviorRecords?.length || 0} records</span>
                          {student.behaviorRecords && student.behaviorRecords.length > 0 && (
                            <div className="flex space-x-1 mt-1">
                              {student.behaviorRecords.slice(0, 2).map((record, index) => (
                                <Badge
                                  key={index}
                                  variant="subtle"
                                  color={getSeverityColor(record.severity)}
                                  size="sm"
                                >
                                  {record.severity}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {student.remarks?.length || 0} remarks
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewStudent(student)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            color="primary"
                            onClick={() => {
                              setSelectedStudent(student);
                              handleAddRemark();
                            }}
                          >
                            <ChatBubbleBottomCenterTextIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Student Details Modal */}
      {showStudentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedStudent.name} - Profile</h2>
              <Button
                variant="ghost"
                onClick={() => setShowStudentModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Basic Information</label>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Name:</strong> {selectedStudent.name}</p>
                    <p><strong>Matricule:</strong> {selectedStudent.matricule}</p>
                    <p><strong>Age:</strong> {getAge(selectedStudent.dateOfBirth)}</p>
                    <p><strong>Gender:</strong> {selectedStudent.gender}</p>
                    <p><strong>Class:</strong> {selectedStudent.enrollments?.[0]?.subClass?.class?.name} - {selectedStudent.enrollments?.[0]?.subClass?.name}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Assessment</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Badge
                      variant="solid"
                      color={getRiskLevelColor(selectedStudent.riskLevel || 'LOW')}
                    >
                      {selectedStudent.riskLevel} RISK
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Behavior Records */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recent Behavior Records</label>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                    {selectedStudent.behaviorRecords && selectedStudent.behaviorRecords.length > 0 ? (
                      <div className="space-y-2">
                        {selectedStudent.behaviorRecords.map((record) => (
                          <div key={record.id} className="bg-white p-3 rounded border-l-4 border-blue-400">
                            <div className="flex justify-between items-start">
                              <p className="text-sm">{record.incident}</p>
                              <Badge
                                variant="subtle"
                                color={getSeverityColor(record.severity)}
                                size="sm"
                              >
                                {record.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{formatDate(record.date)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No behavior records</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks Section */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700">Counselor Remarks</label>
                <Button
                  size="sm"
                  onClick={handleAddRemark}
                  className="flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Remark
                </Button>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                {selectedStudent.remarks && selectedStudent.remarks.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStudent.remarks.map((remark) => (
                      <div key={remark.id} className="bg-white p-3 rounded">
                        <div className="flex justify-between items-start">
                          <p className="text-sm">{remark.content}</p>
                          <Badge variant="outline" size="sm">
                            {remark.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(remark.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No remarks added</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowStudentModal(false)}
              >
                Close
              </Button>
              <Button
                color="primary"
                onClick={handleAddRemark}
              >
                Add Remark
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Remark Modal */}
      {showRemarkModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Remark</h2>
              <Button
                variant="ghost"
                onClick={() => setShowRemarkModal(false)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student: {selectedStudent.name}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark Type
                </label>
                <select
                  value={newRemark.type}
                  onChange={(e) => setNewRemark({ ...newRemark, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="BEHAVIORAL">Behavioral</option>
                  <option value="PERSONAL">Personal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={newRemark.severity}
                  onChange={(e) => setNewRemark({ ...newRemark, severity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark Content
                </label>
                <textarea
                  value={newRemark.content}
                  onChange={(e) => setNewRemark({ ...newRemark, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your remark here..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowRemarkModal(false)}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onClick={handleSaveRemark}
              >
                Save Remark
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 