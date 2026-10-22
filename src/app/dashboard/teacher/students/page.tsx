'use client'
import { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';
import { StudentPhoto } from '@/components/ui';
import { sortSubClassesByLevel } from '@/lib/classOrdering';
import { useLanguage } from '@/components/context/LanguageContext';

// Types
// Every figure below comes from GET /teachers/me/students — nothing is
// invented client-side (the page used to fill gaps with Math.random()).
type RollCallStatus = 'PRESENT' | 'LATE' | 'ABSENT';
interface Student {
  id: number;
  name: string;
  matricule?: string;
  /** Mean /20 of marks in your subjects this year; null when no marks yet. */
  average?: number | null;
  marksCount?: number;
  /** % of period roll calls this year marked present/late; null when never called. */
  attendanceRate?: number | null;
  /** Status in your roll call today; null when not taken yet. */
  todayStatus?: RollCallStatus | null;
  photo?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  teacherSubjects?: {
    subjectId: number;
    subjectName: string;
    coefficient: number | null;
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
    coefficient: number | null;
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
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubClass, setSelectedSubClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  // Search runs on the server across all your students, not just this page.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Fetch students that the teacher has access to (students in subclasses where teacher teaches)
  const {
    data: studentsData,
    error: studentsError,
    isLoading: studentsLoading
  } = useSWR<StudentsApiResponse>(
    `/teachers/me/students?page=${currentPage}&limit=${pageSize}${selectedSubClass !== 'all' ? `&subClassId=${selectedSubClass}` : ''}${selectedSubject !== 'all' ? `&subjectId=${selectedSubject}` : ''}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`,
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
  const subClasses = useMemo(() => sortSubClassesByLevel(subClassesData?.data || []), [subClassesData]);

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
        toast.error(t('Access denied: Unable to load student data'));
      } else {
        toast.error(t('Failed to load students data'));
      }
    }
    if (subClassesError && subClassesError.message !== 'Unauthorized') {
      console.error("Sub-classes Fetch Error:", subClassesError);
      if (subClassesError.status === 403) {
        toast.error(t('Access denied: Unable to load class data'));
      } else {
        toast.error(t('Failed to load class data'));
      }
    }
  }, [studentsError, subClassesError]);

  // Transform students data to the table's shape (search is done server-side).
  const processedStudents = useMemo((): ProcessedStudent[] => students.map(student => ({
    ...student,
    class: student.subClass?.class?.name || 'Not Assigned',
    subClassName: student.subClass?.name || 'Not Assigned',
    subClassId: student.subClass?.id || 0,
  })), [students]);

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

  // Average is on the /20 scale used for all marks.
  const renderAverage = (average?: number | null) => {
    if (average == null) return <span className="text-gray-400">{t('No marks yet')}</span>;
    const band = average >= 16
      ? <span className="text-green-600 font-medium">{t('Excellent')}</span>
      : average >= 12
        ? <span className="text-blue-600 font-medium">{t('Good')}</span>
        : average >= 10
          ? <span className="text-yellow-600 font-medium">{t('Average')}</span>
          : <span className="text-red-600 font-medium">{t('Needs Improvement')}</span>;
    return (
      <>
        <span className="font-medium">{average.toFixed(2)}/20</span>
        <span className="ml-2 sm:ml-0 sm:block sm:mt-1">{band}</span>
      </>
    );
  };

  const renderAttendanceRate = (rate?: number | null) =>
    rate == null ? <span className="text-gray-400">—</span> : <span>{rate}%</span>;

  // Today's status from your own roll call; nothing is shown as "Late" unless
  // you marked it so.
  const renderAttendanceStatus = (status?: RollCallStatus | null) => {
    switch (status) {
      case 'PRESENT':
        return <span className="inline-flex items-center text-green-600"><CheckCircleIcon className="w-4 h-4 mr-1" /> {t('Present')}</span>;
      case 'ABSENT':
        return <span className="inline-flex items-center text-red-600"><ExclamationCircleIcon className="w-4 h-4 mr-1" /> {t('Absent')}</span>;
      case 'LATE':
        return <span className="inline-flex items-center text-yellow-600"><ExclamationCircleIcon className="w-4 h-4 mr-1" /> {t('Late')}</span>;
      default:
        return <span className="text-gray-400">{t('Not taken today')}</span>;
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
  }, [selectedSubClass, selectedSubject, debouncedSearch]);

  return (
    <div className="p-4 sm:p-6 max-w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-2">{t('My Students')}</h1>
      <p className="text-gray-600 mb-6">{t('Students in classes where you teach at least one subject')}</p>

      {/* Display error message if fetch failed */}
      {hasErrors && !isLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">{t('Error!')}</strong>
          <span className="block sm:inline"> {t('Failed to load data. Please check your connection and try again.')}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t('Search students by name or matricule...')}
            className="w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        </div>

        {/* Stacked on phones: long sub-class labels made the selects push the page to ~515px. */}
        <div className="flex flex-col sm:flex-row gap-2 min-w-0">
          <select
            className="w-full sm:w-auto min-w-0 max-w-full p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSubClass}
            onChange={(e) => setSelectedSubClass(e.target.value)}
            disabled={isLoading}
          >
            <option value="all">{t('All Sub-Classes')}</option>
            {subClasses.map(subClass => (
              <option key={subClass.id} value={subClass.id.toString()}>
                {subClass.name} ({subClass.class.name}) - {subClass.studentCount} {t('students')}
              </option>
            ))}
          </select>

          <select
            className="w-full sm:w-auto min-w-0 max-w-full p-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={isLoading}
          >
            <option value="all">{t('All Subjects')}</option>
            {teacherSubjects.map(subject => (
              <option key={subject.id} value={subject.id.toString()}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('Total Students')}</h3>
          <p className="text-2xl font-bold">{isLoading ? '...' : totalStudents}</p>
          <p className="text-xs text-gray-400 mt-1">{t('Students you teach')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('Present Today')}</h3>
          <p className="text-2xl font-bold text-green-600">
            {isLoading ? '...' : sortedStudents.filter(s => s.todayStatus === 'PRESENT' || s.todayStatus === 'LATE').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('This page, from your roll calls')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('Absent Today')}</h3>
          <p className="text-2xl font-bold text-red-600">
            {isLoading ? '...' : sortedStudents.filter(s => s.todayStatus === 'ABSENT').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('This page, from your roll calls')}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">{t('Classes Teaching')}</h3>
          <p className="text-2xl font-bold text-blue-600">
            {isLoading ? '...' : subClasses.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">{t('Sub-classes assigned')}</p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">{t('Loading students...')}</p>
          </div>
        ) : sortedStudents.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t('No students found')}</p>
            <p className="text-sm text-gray-500">
              {students.length === 0
                ? t("You don't have any assigned classes yet")
                : t("Try adjusting your search filters")
              }
            </p>
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Photo')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('Name')}</span>
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Matricule')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('class')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('Class')}</span>
                      {renderSortIcon('class')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('subClassName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('Sub-Class')}</span>
                      {renderSortIcon('subClassName')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Your Subjects')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('average')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('Average')}</span>
                      {renderSortIcon('average')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('attendanceRate')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{t('Attendance')}</span>
                      {renderSortIcon('attendanceRate')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Status')}
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
                        )) || <span className="text-xs text-gray-400">{t('None')}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{renderAverage(student.average)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{renderAttendanceRate(student.attendanceRate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{renderAttendanceStatus(student.todayStatus)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-gray-100">
            {sortedStudents.map((student) => (
              <div key={student.id} className="p-4 space-y-1.5">
                <div className="flex items-start gap-3 min-w-0">
                  <StudentPhoto
                    studentId={student.id}
                    photo={student.photo}
                    size="sm"
                    studentName={student.name}
                    fetchPhoto={!student.photo}
                    showUploadButton={true}
                    canUpload={true}
                  />
                  <div className="text-sm font-semibold text-gray-900 break-words">{student.name}</div>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Matricule')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{student.matricule || 'N/A'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Class')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{student.class}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Sub-Class')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{student.subClassName}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Your Subjects')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">
                    <span className="flex flex-wrap justify-end gap-1">
                      {student.teacherSubjects?.map(subject => (
                        <span
                          key={subject.subjectId}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          title={`Coefficient: ${subject.coefficient}`}
                        >
                          {subject.subjectName}
                        </span>
                      )) || <span className="text-xs text-gray-400">None</span>}
                    </span>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Average')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{renderAverage(student.average)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Attendance')}</span>
                  <span className="text-sm font-medium text-gray-900 text-right break-words">{renderAttendanceRate(student.attendanceRate)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-gray-500">{t('Today')}</span>
                  <span className="text-sm text-gray-900 text-right break-words">{renderAttendanceStatus(student.todayStatus)}</span>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {studentsData?.meta && studentsData.meta.total > pageSize && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="text-sm text-gray-700">
            {t('Showing')} {((currentPage - 1) * pageSize) + 1} {t('to')} {Math.min(currentPage * pageSize, studentsData.meta.total)} {t('of')} {studentsData.meta.total} {t('students')}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Previous')}
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              {t('Page')} {currentPage} {t('of')} {Math.ceil(studentsData.meta.total / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage * pageSize >= studentsData.meta.total}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Next')}
            </button>
          </div>
        </div>
      )}

      {/* Subject Summary for Teacher */}
      {subClasses.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">{t('Your Teaching Assignments')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subClasses.map(subClass => (
              <div key={subClass.id} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{subClass.class.name} - {subClass.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{subClass.studentCount} {t('students')}</p>
                <div className="space-y-1">
                  {subClass.subjects?.map(subject => (
                    <div key={subject.id} className="flex justify-between text-xs">
                      <span className="text-gray-700">{subject.name}</span>
                      <span className="text-gray-500 whitespace-nowrap">
                        {subject.periodsPerWeek}p/{t('week')}
                        {subject.coefficient != null && <> · {t('Coeff')} {subject.coefficient}</>}
                      </span>
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