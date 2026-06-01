'use client'
import { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';
import { StudentPhoto } from '@/components/ui';

// Types
interface Student {
  id: number;
  name: string;
  matricule?: string;
  performance?: number;
  attendance?: number;
  lastAttendance?: string;
  photo?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  teacherSubjects?: {
    subjectId: number;
    subjectName: string;
    coefficient: number;
  }[];
  subClass: {
    id: number;
    name: string;
    class: {
      id: number;
      name: string;
    };
  };
}

interface ProcessedStudent extends Student {
  class: string;
  subClassName: string;
  subClassId: number;
}

interface SubClass {
  id: number;
  name: string;
  class: {
    id: number;
    name: string;
  };
  subjects: {
    id: number;
    name: string;
    coefficient: number;
    periodsPerWeek: number;
  }[];
  studentCount: number;
}

interface SortConfig {
  key: keyof ProcessedStudent;
  direction: 'ascending' | 'descending';
}

interface StudentsApiResponse {
  success: boolean;
  data: Student[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface SubClassesApiResponse {
  success: boolean;
  data: SubClass[];
}

export default function TeacherStudents() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubClass, setSelectedSubClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch students that the teacher has access to (students in subclasses where teacher teaches)
  const {
    data: studentsData,
    error: studentsError,
    isLoading: studentsLoading
  } = useSWR<StudentsApiResponse>(
    `/teachers/me/students?page=${currentPage}&limit=${pageSize}${selectedSubClass !== 'all' ? `&subClassId=${selectedSubClass}` : ''}${selectedSubject !== 'all' ? `&subjectId=${selectedSubject}` : ''}`,
    (url: string) => apiService.get(url)
  );

  // Fetch sub-classes where the teacher has at least one subject assignment
  const {
    data: subClassesData,
    error: subClassesError,
    isLoading: subClassesLoading
  } = useSWR<SubClassesApiResponse>(
    '/teachers/me/subclasses',
    (url: string) => apiService.get(url)
  );

  const students = useMemo(() => studentsData?.data || [], [studentsData]);
  const subClasses = useMemo(() => subClassesData?.data || [], [subClassesData]);

  // Get unique subjects that the teacher teaches across all subclasses
  const teacherSubjects = useMemo(() => {
    const subjectMap = new Map();
    subClasses.forEach(subClass => {
      subClass.subjects?.forEach(subject => {
        if (!subjectMap.has(subject.id)) {
          subjectMap.set(subject.id, {
            id: subject.id,
            name: subject.name
          });
        }
      });
    });
    return Array.from(subjectMap.values());
  }, [subClasses]);

  // Enhanced error handling
  useEffect(() => {
    if (studentsError && studentsError.message !== 'Unauthorized') {
      console.error("Students Fetch Error:", studentsError);
      if (studentsError.status === 403) {
        toast.error('Access denied: Unable to load student data');
      } else {
        toast.error('Failed to load students data');
      }
    }
    if (subClassesError && subClassesError.message !== 'Unauthorized') {
      console.error("Sub-classes Fetch Error:", subClassesError);
      if (subClassesError.status === 403) {
        toast.error('Access denied: Unable to load class data');
      } else {
        toast.error('Failed to load class data');
      }
    }
  }, [studentsError, subClassesError]);

  // Transform students data to match expected format and add search filtering
  const processedStudents = useMemo(() => {
    let filtered: ProcessedStudent[] = students.map(student => ({
      ...student,
      class: student.subClass?.class?.name || 'Not Assigned',
      subClassName: student.subClass?.name || 'Not Assigned',
      subClassId: student.subClass?.id || 0,
      performance: student.performance || Math.floor(Math.random() * 40) + 60, // Temporary until API provides
      attendance: student.attendance || Math.floor(Math.random() * 30) + 70, // Temporary until API provides
      lastAttendance: student.lastAttendance || ['Present', 'Absent', 'Late'][Math.floor(Math.random() * 3)] // Temporary
    }));

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.matricule && student.matricule.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [students, searchTerm]);

  // Sort function for table columns
  const requestSort = (key: keyof ProcessedStudent) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted students (no need for filtering since backend handles it)
  const getSortedStudents = () => {
    return [...processedStudents].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Helper function to render performance indicator
  const renderPerformanceIndicator = (performance: number) => {
    if (performance >= 85) return <span className="text-green-600 font-medium">Excellent</span>;
    if (performance >= 70) return <span className="text-blue-600 font-medium">Good</span>;
    if (performance >= 50) return <span className="text-yellow-600 font-medium">Average</span>;
    return <span className="text-red-600 font-medium">Needs Improvement</span>;
  };

  // Helper function to render attendance status
  const renderAttendanceStatus = (status: string) => {
    switch (status) {
      case 'Present':
        return <span className="inline-flex items-center text-green-600"><CheckCircleIcon className="w-4 h-4 mr-1" /> Present</span>;
      case 'Absent':
        return <span className="inline-flex items-center text-red-600"><ExclamationCircleIcon className="w-4 h-4 mr-1" /> Absent</span>;
      case 'Late':
        return <span className="inline-flex items-center text-yellow-600"><ExclamationCircleIcon className="w-4 h-4 mr-1" /> Late</span>;
      default:
        return <span>{status}</span>;
    }
  };

  // Render sort icon
  const renderSortIcon = (columnName: keyof ProcessedStudent) => {
    if (sortConfig.key !== columnName) {
      return <ChevronUpIcon className="w-4 h-4 opacity-20" />;
    }

    return sortConfig.direction === 'ascending'
      ? <ChevronUpIcon className="w-4 h-4" />
      : <ChevronDownIcon className="w-4 h-4" />;
  };

  const sortedStudents = getSortedStudents();
  const isLoading = studentsLoading || subClassesLoading;
  const hasErrors = studentsError || subClassesError;
  const totalStudents = studentsData?.meta?.total || sortedStudents.length;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubClass, selectedSubject, searchTerm]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">My Students</h1>
      <p className="text-gray-600 mb-6">Students in classes where you teach at least one subject</p>

      {/* Display error message if fetch failed */}
      {hasErrors && !isLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> Failed to load data. Please check your connection and try again.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search students by name or matricule..."
            className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        </div>

        <div className="flex gap-2">
          <select
            className="p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSubClass}
            onChange={(e) => setSelectedSubClass(e.target.value)}
            disabled={isLoading}
          >
            <option value="all">All Sub-Classes</option>
            {subClasses.map(subClass => (
              <option key={subClass.id} value={subClass.id.toString()}>
                {subClass.name} ({subClass.class.name}) - {subClass.studentCount} students
              </option>
            ))}
          </select>

          <select
            className="p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={isLoading}
          >
            <option value="all">All Subjects</option>
            {teacherSubjects.map(subject => (
              <option key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
          <p className="text-2xl font-bold">{isLoading ? '...' : totalStudents}</p>
          <p className="text-xs text-gray-400 mt-1">Students you teach</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Present Today</h3>
          <p className="text-2xl font-bold text-green-600">
            {isLoading ? '...' : sortedStudents.filter(s => s.lastAttendance === 'Present').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Absent Today</h3>
          <p className="text-2xl font-bold text-red-600">
            {isLoading ? '...' : sortedStudents.filter(s => s.lastAttendance === 'Absent').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Classes Teaching</h3>
          <p className="text-2xl font-bold text-blue-600">
            {isLoading ? '...' : subClasses.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Sub-classes assigned</p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading students...</p>
          </div>
        ) : sortedStudents.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No students found</p>
            <p className="text-sm text-gray-500">
              {students.length === 0
                ? "You don't have any assigned classes yet"
                : "Try adjusting your search filters"
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matricule
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('class')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Class</span>
                      {renderSortIcon('class')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('subClassName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Sub-Class</span>
                      {renderSortIcon('subClassName')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Subjects
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('performance')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Performance</span>
                      {renderSortIcon('performance')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('attendance')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Attendance</span>
                      {renderSortIcon('attendance')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedStudents.map((student) => (
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
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.matricule || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.class}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.subClassName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {student.teacherSubjects?.map(subject => (
                          <span
                            key={subject.subjectId}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            title={`Coefficient: ${subject.coefficient}`}
                          >
                            {subject.subjectName}
                          </span>
                        )) || <span className="text-xs text-gray-400">None</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium">{student.performance}%</span>
                        <div className="mt-1">{renderPerformanceIndicator(student.performance || 0)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.attendance}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{renderAttendanceStatus(student.lastAttendance || 'Unknown')}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {studentsData?.meta && studentsData.meta.total > pageSize && (
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, studentsData.meta.total)} of {studentsData.meta.total} students
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {Math.ceil(studentsData.meta.total / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage * pageSize >= studentsData.meta.total}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Subject Summary for Teacher */}
      {subClasses.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Your Teaching Assignments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subClasses.map(subClass => (
              <div key={subClass.id} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{subClass.class.name} - {subClass.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{subClass.studentCount} students</p>
                <div className="space-y-1">
                  {subClass.subjects?.map(subject => (
                    <div key={subject.id} className="flex justify-between text-xs">
                      <span className="text-gray-700">{subject.name}</span>
                      <span className="text-gray-500">{subject.periodsPerWeek}p/week</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}