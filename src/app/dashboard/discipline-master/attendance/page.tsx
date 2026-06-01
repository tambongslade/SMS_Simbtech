'use client';

import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  CalendarIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  PlusIcon,
  UserPlusIcon,
  ChartBarIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { apiService } from '@/lib/apiService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/context/AuthContext';

// Define types for general attendance management
interface ClassInfo {
  id: number;
  name: string;
  subClasses: SubClassInfo[];
}

interface SubClassInfo {
  id: number;
  name: string;
}

interface AttendanceDashboardStats {
  totalActiveIssues: number;
  pendingResolution: number;
  attendanceRate: number;
  latenessIncidents: number;
  absenteeismCases: number;
  studentsWithMultipleIssues: number;
}

interface StudentAttendanceRecord {
  id: number;
  student: {
    id: number;
    name: string;
    matricule: string;
  };
  subClass: {
    id: number;
    name: string;
    class: {
      id: number;
      name: string;
    };
  };
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  date: string;
  reason?: string;
  contactedParent: boolean;
  lastContact?: string;
}

interface TeacherAttendanceRecord {
  id: number;
  teacher: {
    id: number;
    name: string;
  };
  reason: string;
  date: string;
  isExcused: boolean;
}

interface AbsentStudent {
  id: number;
  studentId: number;
  studentName: string;
  matricule: string;
  className: string;
  subClassName: string;
  absenceType: 'EXCUSED' | 'UNEXCUSED';
  reason?: string;
  daysAbsent: number;
  lastContact?: string;
  parentPhone?: string;
}

interface Student {
  id: number;
  name: string;
  matricule: string;
  enrollments: Array<{
    id: number;
    studentId: number;
    academicYearId: number;
    classId: number;
    subClassId: number | null;
    subClass: {
      id: number;
      name: string;
      class: {
        id: number;
        name: string;
      };
    } | null;
  }>;
}

interface BulkLatenessRecord {
  id: string; // For unique key
  selectedStudent: Student | null;
  searchTerm: string;
  arrivalTime: string;
  reason: string;
}

// Lateness-specific interfaces
interface LatenessRecord {
  id: number;
  enrollment_id: number;
  assigned_by_id: number;
  absence_type: string;
  created_at: string;
  enrollment: {
    student: {
      id: number;
      name: string;
      matricule: string;
    };
    sub_class: {
      name: string;
      class: {
        name: string;
      };
    };
  };
  assigned_by: {
    id: number;
    name: string;
  };
}

interface ChronicallyLateStudent {
  student: {
    id: number;
    name: string;
    matricule: string;
  };
  class: string;
  subclass: string;
  lateness_count: number;
}

interface LatenessByClass {
  className: string;
  count: number;
}

interface LatenessStatistics {
  totalLatenessToday: number;
  totalLatenessThisWeek: number;
  totalLatenessThisMonth: number;
  chronicallyLateStudents: ChronicallyLateStudent[];
  latenessByClass: LatenessByClass[];
}

interface DailyReport {
  date: string;
  total_late_students: number;
  records: LatenessRecord[];
}

// API functions
const fetchAttendanceDashboard = async (): Promise<AttendanceDashboardStats> => {
  try {
    const response = await apiService.get<{
      success: boolean;
      data: {
        totalActiveIssues: number;
        pendingResolution: number;
        attendanceRate: number;
        latenessIncidents: number;
        absenteeismCases: number;
        studentsWithMultipleIssues: number;
      };
    }>('/discipline-master/dashboard');

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to fetch dashboard stats');
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return a default object matching the type
    return {
      totalActiveIssues: 0,
      pendingResolution: 0,
      attendanceRate: 0,
      latenessIncidents: 0,
      absenteeismCases: 0,
      studentsWithMultipleIssues: 0,
    };
  }
};

const fetchStudentAttendance = async (startDate: string, endDate: string, classId?: number, subClassId?: number): Promise<StudentAttendanceRecord[]> => {
  try {
    const response = await apiService.get<{
      success: boolean;
      data: Array<{
        id: number;
        enrollment: {
          student: { id: number; name: string; matricule: string };
          sub_class: {
            id: number;
            name: string;
            class: { id: number; name: string }
          };
        };
        absence_type: string;
        created_at: string;
      }>;
    }>('/attendance/students', {
      params: {
        start_date: startDate,
        end_date: endDate,
        ...(classId ? { class_id: classId } : {}),
        ...(subClassId ? { sub_class_id: subClassId } : {}),
        include_student: 'true',
        limit: 100
      }
    });

    if (response.success) {
      return response.data.map(record => ({
        id: record.id,
        student: record.enrollment.student,
        subClass: record.enrollment.sub_class,
        status: record.absence_type === 'MORNING_LATENESS' ? 'LATE' : 'ABSENT',
        date: record.created_at,
        contactedParent: false, // Would need additional API call
        reason: 'Not specified'
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching student attendance:', error);
    return [];
  }
};

const fetchTeacherAttendance = async (startDate: string, endDate: string): Promise<TeacherAttendanceRecord[]> => {
  try {
    const response = await apiService.get<{
      success: boolean;
      data: Array<{
        id: number;
        teacher: { id: number; name: string };
        reason: string;
        created_at: string;
      }>;
    }>('/attendance/teachers', {
      params: {
        start_date: startDate,
        end_date: endDate,
        include_teacher: 'true'
      }
    });

    if (response.success) {
      return response.data.map(record => ({
        id: record.id,
        teacher: record.teacher,
        reason: record.reason,
        date: record.created_at,
        isExcused: true // Would be determined by reason type
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching teacher attendance:', error);
    return [];
  }
};

const fetchClasses = async (): Promise<ClassInfo[]> => {
  try {
    const response = await apiService.get<{
      success: boolean;
      data: Array<{
        id: number;
        name: string;
        subClasses: Array<{ id: number; name: string }>;
      }>;
    }>('/classes');

    if (response.success) {
      return response.data.map(cls => ({
        id: cls.id,
        name: cls.name,
        subClasses: cls.subClasses.map(sub => ({
          id: sub.id,
          name: sub.name
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
};

const AttendanceDashboardPage: React.FC = () => {
  const { user, selectedAcademicYear } = useAuth();

  // State management
  const [dashboardStats, setDashboardStats] = useState<AttendanceDashboardStats | null>(null);
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  // Lateness state
  const [latenessRecords, setLatenessRecords] = useState<LatenessRecord[]>([]);
  const [latenessStatistics, setLatenessStatistics] = useState<LatenessStatistics | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [latenessIssues, setLatenessIssues] = useState<LatenessRecord[]>([]);
  const [latenessPage, setLatenessPage] = useState(1);
  const [latenessTotalPages, setLatenessTotalPages] = useState(1);
  const [latenessLimit] = useState(10);

  // Filter state
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [selectedSubClassId, setSelectedSubClassId] = useState<number>(0);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  // UI state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'lateness' | 'reports'>('overview');
  const [error, setError] = useState<string | null>(null);

  // Lateness recording state
  const [latenessStudentSearchTerm, setLatenessStudentSearchTerm] = useState('');
  const [latenessStudentSearchResults, setLatenessStudentSearchResults] = useState<Student[]>([]);
  const [latenessSelectedStudent, setLatenessSelectedStudent] = useState<Student | null>(null);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk Lateness State
  const [bulkRecords, setBulkRecords] = useState<BulkLatenessRecord[]>([]);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [activeBulkSearchIndex, setActiveBulkSearchIndex] = useState<number | null>(null);
  const [bulkSearchResults, setBulkSearchResults] = useState<Student[]>([]);
  const [isSearchingBulk, setIsSearchingBulk] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [statsData, classesData] = await Promise.all([
          fetchAttendanceDashboard(),
          fetchClasses(),
        ]);

        setDashboardStats(statsData);
        setClasses(classesData);

        // Set default class selection
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
          if (classesData[0].subClasses.length > 0) {
            setSelectedSubClassId(classesData[0].subClasses[0].id);
          }
        }
      } catch (err) {
        toast.error('Failed to load initial data');
        console.error('Initial data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const fetchDisciplineIssues = async () => {
    try {
      const params = new URLSearchParams({
        issue_type: 'MORNING_LATENESS',
        academic_year_id: selectedAcademicYear?.id.toString() || '',
        page: latenessPage.toString(),
        limit: latenessLimit.toString(),
        sortBy: 'created_at',
        sortOrder: 'desc',
        start_date: startDate,
        end_date: endDate,
      });

      if (selectedClassId) params.append('class_id', selectedClassId.toString());
      if (selectedSubClassId) params.append('sub_class_id', selectedSubClassId.toString());

      const response = await apiService.get(`/discipline?${params.toString()}`);

      if (response.success && response.data.data) {
        const processedIssues = await Promise.all(
          response.data.data.map(async (issue: any) => {
            try {
              const enrollmentResponse = await apiService.get(`/students/enrollments/${issue.enrollmentId}`);
              const enrollmentData = enrollmentResponse.data;
              return {
                id: issue.id,
                created_at: issue.createdAt,
                enrollment: {
                  student: {
                    id: enrollmentData.id,
                    name: enrollmentData.name,
                    matricule: enrollmentData.matricule,
                  },
                  sub_class: {
                    name: enrollmentData.subClass,
                    class: { name: enrollmentData.class },
                  },
                },
                assigned_by: { name: 'Unknown' }, // Placeholder
              };
            } catch (err) {
              console.error(`Failed to fetch enrollment for issue ${issue.id}`, err);
              return {
                ...issue,
                created_at: issue.createdAt,
                enrollment: {
                  student: { name: 'Unknown Student' },
                  sub_class: { name: 'Unknown', class: { name: 'Unknown' } },
                },
                assigned_by: { name: 'Unknown' },
              };
            }
          })
        );
        setLatenessIssues(processedIssues);
        setLatenessTotalPages(response.data.meta.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching discipline issues:', error);
      toast.error('Failed to load lateness records.');
    }
  };

  // Debounced search for single student lateness
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (latenessStudentSearchTerm.trim().length >= 2) {
        searchStudentsForLateness();
      } else {
        setLatenessStudentSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [latenessStudentSearchTerm]);

  // Debounced search for bulk lateness
  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeBulkSearchIndex !== null && bulkRecords[activeBulkSearchIndex]?.searchTerm.length >= 2) {
        searchStudentsForBulk(bulkRecords[activeBulkSearchIndex].searchTerm);
      } else {
        setBulkSearchResults([]);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [activeBulkSearchIndex !== null ? bulkRecords[activeBulkSearchIndex]?.searchTerm : null]);


  const searchStudentsForLateness = async () => {
    if (!latenessStudentSearchTerm.trim()) {
      setLatenessStudentSearchResults([]);
      return;
    }

    try {
      setIsSearchingStudents(true);
      const response = await apiService.get('/students/search', {
        params: {
          q: latenessStudentSearchTerm.trim(),
          academic_year_id: selectedAcademicYear?.id,
          limit: 10
        }
      });

      if (response.success && response.data && response.data.data) {
        setLatenessStudentSearchResults(response.data.data);
      } else {
        setLatenessStudentSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching students:', error);
      setLatenessStudentSearchResults([]);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const searchStudentsForBulk = async (term: string) => {
    try {
      setIsSearchingBulk(true);
      const response = await apiService.get('/students/search', {
        params: {
          q: term,
          academic_year_id: selectedAcademicYear?.id,
          limit: 10
        }
      });
      if (response.success && response.data?.data) {
        setBulkSearchResults(response.data.data);
      } else {
        setBulkSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching students for bulk:', error);
      setBulkSearchResults([]);
    } finally {
      setIsSearchingBulk(false);
    }
  };

  // Load attendance data when filters change
  useEffect(() => {
    if (!startDate || !endDate) return;

    const loadAttendanceData = async () => {
      setError(null);

      try {
        const [studentData, teacherData] = await Promise.all([
          fetchStudentAttendance(startDate, endDate, selectedClassId || undefined, selectedSubClassId || undefined),
          fetchTeacherAttendance(startDate, endDate)
        ]);

        setStudentAttendance(studentData);
        setTeacherAttendance(teacherData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(message);
        toast.error(`Error loading attendance data: ${message}`);
      }
    };

    loadAttendanceData();
  }, [startDate, endDate, selectedClassId, selectedSubClassId]);

  // Load lateness data when date or academic year changes
  useEffect(() => {
    if (selectedAcademicYear?.id) {
      fetchLatenessStatistics();
    }
  }, [selectedAcademicYear?.id]);

  useEffect(() => {
    if (activeTab === 'lateness' && selectedAcademicYear?.id) {
      fetchDisciplineIssues();
    }
  }, [activeTab, selectedAcademicYear?.id, latenessPage, startDate, endDate, selectedClassId, selectedSubClassId]);

  const fetchLatenessStatistics = async () => {
    try {
      const statsResponse = await apiService.get('/discipline/lateness/statistics', {
        params: { academic_year_id: selectedAcademicYear?.id }
      });
      if (statsResponse.success) {
        setLatenessStatistics(statsResponse.data);
      } else {
        throw new Error('Failed to fetch lateness statistics');
      }
    } catch (error) {
      console.error('Error fetching lateness statistics:', error);
      toast.error('Failed to load lateness statistics');
    }
  };

  const fetchLatenessData = async () => {
    try {
      const [statsResponse, dailyResponse] = await Promise.all([
        apiService.get('/discipline/lateness/statistics', {
          params: { academic_year_id: selectedAcademicYear?.id }
        }),
        apiService.get('/discipline/lateness/daily-report', {
          params: {
            date: startDate,
            academic_year_id: selectedAcademicYear?.id
          }
        })
      ]);

      if (statsResponse.success) {
        setLatenessStatistics(statsResponse.data);
      } else {
        throw new Error('Failed to fetch lateness statistics');
      }

      if (dailyResponse.success) {
        setDailyReport(dailyResponse.data);
        setLatenessRecords(dailyResponse.data.records || []);
      } else {
        throw new Error('Failed to fetch daily lateness report');
      }
    } catch (error) {
      console.error('Error fetching lateness data:', error);
      toast.error('Failed to load lateness data');
    }
  };

  // Event handlers
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
  };

  const handleClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassId = parseInt(event.target.value) || 0;
    setSelectedClassId(newClassId);
    setSelectedSubClassId(0); // Reset subclass
  };

  const handleSubClassChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubClassId(parseInt(event.target.value) || 0);
  };

  const handleContactParent = async (studentId: number) => {
    // TODO: Implement parent contact functionality
    toast.success('Parent contact feature will be implemented');
  };

  const handleMarkPresent = async (studentId: number) => {
    // TODO: Implement mark present functionality
    toast.success('Mark present feature will be implemented');
  };

  const handleSelectStudentForLateness = (student: Student) => {
    setLatenessSelectedStudent(student);
    setLatenessStudentSearchTerm(student.name);
    setLatenessStudentSearchResults([]);
  };

  const handleSelectStudentForBulk = (index: number, student: Student) => {
    const updatedRecords = [...bulkRecords];
    updatedRecords[index] = {
      ...updatedRecords[index],
      selectedStudent: student,
      searchTerm: student.name
    };
    setBulkRecords(updatedRecords);
    setBulkSearchResults([]);
    setActiveBulkSearchIndex(null);
  };

  // Lateness recording handlers
  const handleRecordLateness = async () => {
    if (!latenessSelectedStudent || !arrivalTime) {
      toast.error('Please select a student and provide an arrival time');
      return;
    }

    try {
      setSubmitting(true);

      await apiService.post('/discipline/lateness', {
        student_id: latenessSelectedStudent.id,
        date: startDate,
        arrival_time: arrivalTime,
        reason: reason.trim() || undefined,
        academic_year_id: selectedAcademicYear?.id
      });

      toast.success('Morning lateness recorded successfully');

      // Clear form
      setLatenessSelectedStudent(null);
      setLatenessStudentSearchTerm('');
      setArrivalTime('');
      setReason('');

      // Refresh data
      fetchLatenessData();
    } catch (error) {
      console.error('Error recording lateness:', error);
      toast.error('Failed to record lateness');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkRecordLateness = async () => {
    const validRecords = bulkRecords.filter(r => r.selectedStudent && r.arrivalTime);
    if (validRecords.length === 0) {
      toast.error('Please add at least one complete record with a student and arrival time.');
      return;
    }

    if (validRecords.length !== bulkRecords.length) {
      toast.error('Some records are incomplete. Please fill them out or remove them.');
      return;
    }

    try {
      setSubmitting(true);

      const response = await apiService.post('/discipline/lateness/bulk', {
        date: startDate,
        records: validRecords.map(record => ({
          student_id: record.selectedStudent!.id,
          arrival_time: record.arrivalTime,
          reason: record.reason.trim() || undefined
        })),
        academic_year_id: selectedAcademicYear?.id
      });

      toast.success(`Processed ${response.data.successful_records} records successfully`);

      if (response.data.failed_records > 0) {
        toast.error(`${response.data.failed_records} records failed`);
      }

      // Clear bulk form
      setBulkRecords([]);
      setShowBulkForm(false);

      // Refresh data
      fetchLatenessData();
    } catch (error) {
      console.error('Error recording bulk lateness:', error);
      toast.error('Failed to record bulk lateness');
    } finally {
      setSubmitting(false);
    }
  };

  const addBulkRecord = () => {
    setBulkRecords([
      ...bulkRecords,
      {
        id: Date.now().toString(),
        selectedStudent: null,
        searchTerm: '',
        arrivalTime: '',
        reason: ''
      }
    ]);
  };

  const updateBulkRecordField = (index: number, field: 'arrivalTime' | 'reason', value: string) => {
    const updatedRecords = [...bulkRecords];
    updatedRecords[index] = { ...updatedRecords[index], [field]: value };
    setBulkRecords(updatedRecords);
  };

  const handleBulkSearchTermChange = (index: number, term: string) => {
    const updatedRecords = [...bulkRecords];
    updatedRecords[index] = { ...updatedRecords[index], searchTerm: term, selectedStudent: null };
    setBulkRecords(updatedRecords);
    setActiveBulkSearchIndex(index);
  };

  const removeBulkRecord = (index: number) => {
    setBulkRecords(bulkRecords.filter((_, i) => i !== index));
  };

  // Get filtered student attendance
  const filteredStudentAttendance = studentAttendance.filter(record => {
    if (attendanceFilter === 'all') return true;
    return record.status.toLowerCase() === attendanceFilter;
  });

  // Get current subclasses
  const currentSubclasses = classes.find(c => c.id === selectedClassId)?.subClasses || [];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Attendance & Lateness Management</h1>
        <p className="text-gray-600 mt-1">Monitor and manage daily school attendance and lateness</p>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.attendanceRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Today's Rate</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Absent Today</p>
                <p className="text-2xl font-bold text-red-600">{dashboardStats.absenteeismCases}</p>
                <p className="text-xs text-gray-500">Total Absences</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Late Today</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardStats.latenessIncidents}</p>
                <p className="text-xs text-gray-500">Morning Lateness</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending Issues</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.pendingResolution}</p>
                <p className="text-xs text-gray-500">Requires action</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview', icon: CalendarIcon },
            { id: 'students', name: 'Student Attendance', icon: UserGroupIcon },
            { id: 'teachers', name: 'Teacher Attendance', icon: AcademicCapIcon },
            { id: 'lateness', name: 'Lateness Management', icon: ClockIcon },
            { id: 'reports', name: 'Reports & Analytics', icon: ChartBarIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className={`grid grid-cols-1 ${activeTab === 'students' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 mb-6 p-4 bg-white rounded-lg shadow`}>
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full pl-3 pr-4 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full pl-3 pr-4 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          />
        </div>
        <div>
          <label htmlFor="class-filter" className="block text-sm font-medium text-gray-700">Class</label>
          <select
            id="class-filter"
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(Number(e.target.value));
              setSelectedSubClassId(0);
            }}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value={0}>-- All Classes --</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="subclass-filter" className="block text-sm font-medium text-gray-700">Subclass</label>
          <select
            id="subclass-filter"
            value={selectedSubClassId}
            onChange={(e) => setSelectedSubClassId(Number(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={selectedClassId === 0}
          >
            <option value={0}>-- All Subclasses --</option>
            {currentSubclasses.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
        </div>
        {activeTab === 'students' && (
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status-filter"
              name="status-filter"
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as any)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">All Students</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
            </select>
          </div>
        )}
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Today's Attendance Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Active Issues:</span>
                <span className="font-semibold">{dashboardStats?.totalActiveIssues || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Students with Multiple Issues:</span>
                <span className="font-semibold text-red-600">{dashboardStats?.studentsWithMultipleIssues || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Absent Today:</span>
                <span className="font-semibold text-red-600">{dashboardStats?.absenteeismCases || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Late Today:</span>
                <span className="font-semibold text-orange-600">{dashboardStats?.latenessIncidents || 0}</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span>Attendance Rate:</span>
                <span className="font-semibold">{dashboardStats?.attendanceRate.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Staff Attendance (Not Implemented)</h3>
            <div className="space-y-3 text-gray-500">
              <p>Staff attendance tracking API is not yet integrated.</p>
            </div>
          </div>

          {/* Quick Stats from Lateness */}
          {latenessStatistics && (
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Late This Week</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {latenessStatistics.totalLatenessThisWeek || 0}
                      </p>
                    </div>
                    <CalendarIcon className="h-8 w-8 text-orange-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Late This Month</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {latenessStatistics.totalLatenessThisMonth || 0}
                      </p>
                    </div>
                    <ChartBarIcon className="h-8 w-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Chronic Lateness</p>
                      <p className="text-2xl font-bold text-red-600">
                        {latenessStatistics.chronicallyLateStudents?.length || 0}
                      </p>
                    </div>
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Student Attendance - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</h3>
            <p className="text-sm text-gray-600">
              Showing {filteredStudentAttendance.length} records
              {selectedClassId && ` from ${classes.find(c => c.id === selectedClassId)?.name}`}
              {selectedSubClassId && ` ${currentSubclasses.find(sc => sc.id === selectedSubClassId)?.name}`}
            </p>
          </div>

          {isLoading && <p className="p-6 text-gray-500">Loading attendance data...</p>}
          {error && <p className="p-6 text-red-500">Error: {error}</p>}

          {!isLoading && !error && filteredStudentAttendance.length === 0 && (
            <p className="p-6 text-gray-500 text-center">No attendance records found for the selected criteria.</p>
          )}

          {!isLoading && !error && filteredStudentAttendance.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudentAttendance.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.student.name}</div>
                          <div className="text-sm text-gray-500">{record.student.matricule}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.subClass?.class?.name} {record.subClass?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                          record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.reason || 'Not specified'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {record.status !== 'PRESENT' && (
                            <button
                              onClick={() => handleMarkPresent(record.student.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Mark Present"
                            >
                              Mark Present
                            </button>
                          )}
                          <button
                            onClick={() => handleContactParent(record.student.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Contact Parent"
                          >
                            <PhoneIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Teacher Attendance - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}</h3>
            <p className="text-sm text-gray-600">
              {teacherAttendance.length} teacher absence records found
            </p>
          </div>

          {teacherAttendance.length === 0 ? (
            <p className="p-6 text-gray-500 text-center">No teacher absences recorded for this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teacherAttendance.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.teacher.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.isExcused ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {record.isExcused ? 'Excused' : 'Unexcused'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'lateness' && (
        <div className="space-y-6">
          {/* Lateness Recording Controls */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Lateness Recording</h3>
            <div className="flex gap-2">
              <Button
                color={showBulkForm ? 'secondary' : 'primary'}
                onClick={() => setShowBulkForm(!showBulkForm)}
                className="flex items-center gap-2"
              >
                <UserPlusIcon className="h-4 w-4" />
                {showBulkForm ? 'Single Record' : 'Bulk Record'}
              </Button>
            </div>
          </div>

          {!showBulkForm ? (
            // Single Record Form
            <Card>
              <div className="p-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">
                  Record Single Student Lateness
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Student *
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={latenessStudentSearchTerm}
                        onChange={(e) => setLatenessStudentSearchTerm(e.target.value)}
                        placeholder="Search by name or matricule..."
                        className="pl-10"
                        autoComplete="off"
                      />
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      {isSearchingStudents && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                    {latenessStudentSearchResults.length > 0 && (
                      <div className="relative z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {latenessStudentSearchResults.map((student) => (
                          <div
                            key={student.id}
                            onClick={() => handleSelectStudentForLateness(student)}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                          >
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">{student.matricule}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {latenessSelectedStudent && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-medium text-green-800">{latenessSelectedStudent.name}</div>
                            <div className="text-xs text-green-600">{latenessSelectedStudent.matricule}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLatenessSelectedStudent(null);
                              setLatenessStudentSearchTerm('');
                            }}
                            className="text-green-600 hover:text-green-800 text-xs"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arrival Time
                    </label>
                    <Input
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason (Optional)
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select reason</option>
                      <option value="Transport delay">Transport delay</option>
                      <option value="Traffic jam">Traffic jam</option>
                      <option value="Family emergency">Family emergency</option>
                      <option value="Medical appointment">Medical appointment</option>
                      <option value="Overslept">Overslept</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleRecordLateness}
                    isLoading={submitting}
                    disabled={!latenessSelectedStudent || !arrivalTime}
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Record Lateness
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            // Bulk Record Form
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-gray-900">
                    Bulk Record Student Lateness
                  </h4>
                  <Button
                    onClick={addBulkRecord}
                    size="sm"
                    color="secondary"
                    className="flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Record
                  </Button>
                </div>

                <div className="space-y-3">
                  {bulkRecords.map((record, index) => (
                    <div key={record.id} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        {record.selectedStudent ? (
                          <div className="p-2 bg-green-50 border border-green-200 rounded-md h-full flex items-center">
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <p className="text-sm font-medium text-green-800">{record.selectedStudent.name}</p>
                                <p className="text-xs text-green-600">{record.selectedStudent.matricule}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...bulkRecords];
                                  updated[index].selectedStudent = null;
                                  updated[index].searchTerm = '';
                                  setBulkRecords(updated);
                                }}
                                className="text-green-600 hover:text-green-800 text-xs ml-2"
                              >
                                Change
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Search student..."
                              value={record.searchTerm}
                              onChange={(e) => handleBulkSearchTermChange(index, e.target.value)}
                              className="pl-10"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            {isSearchingBulk && activeBulkSearchIndex === index && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                              </div>
                            )}
                            {activeBulkSearchIndex === index && bulkSearchResults.length > 0 && (
                              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {bulkSearchResults.map((student) => (
                                  <div
                                    key={student.id}
                                    onClick={() => handleSelectStudentForBulk(index, student)}
                                    className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                  >
                                    <p className="font-medium text-sm">{student.name}</p>
                                    <p className="text-xs text-gray-500">{student.matricule}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="time"
                          placeholder="Arrival Time"
                          value={record.arrivalTime}
                          onChange={(e) => updateBulkRecordField(index, 'arrivalTime', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <select
                          value={record.reason}
                          onChange={(e) => updateBulkRecordField(index, 'reason', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select reason</option>
                          <option value="Transport delay">Transport delay</option>
                          <option value="Traffic jam">Traffic jam</option>
                          <option value="Family emergency">Family emergency</option>
                          <option value="Medical appointment">Medical appointment</option>
                          <option value="Overslept">Overslept</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button
                          onClick={() => removeBulkRecord(index)}
                          size="sm"
                          color="secondary"
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {bulkRecords.length > 0 && (
                  <div className="mt-4">
                    <Button
                      onClick={handleBulkRecordLateness}
                      isLoading={submitting}
                      className="flex items-center gap-2"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Process All Records
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Daily Lateness Report */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold text-gray-900">
                  Daily Lateness Report - {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                </h4>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing page {latenessPage} of {latenessTotalPages}
                </p>
              </div>

              {latenessIssues.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No lateness records for the selected criteria.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time Recorded
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Recorded By
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {latenessIssues.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {record.enrollment?.student?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {record.enrollment?.student?.matricule}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.enrollment?.sub_class?.class?.name} - {record.enrollment?.sub_class?.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(record.created_at).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.assigned_by?.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {latenessTotalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setLatenessPage(p => Math.max(p - 1, 1))}
                    disabled={latenessPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700">
                    Page {latenessPage} of {latenessTotalPages}
                  </span>
                  <Button
                    onClick={() => setLatenessPage(p => Math.min(p + 1, latenessTotalPages))}
                    disabled={latenessPage === latenessTotalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Chronically Late Students
                </h3>
                {!latenessStatistics?.chronicallyLateStudents?.length ? (
                  <p className="text-gray-500 text-center py-4">
                    No chronically late students identified
                  </p>
                ) : (
                  <div className="space-y-3">
                    {latenessStatistics.chronicallyLateStudents.map((student, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">{student.student?.name}</p>
                          <p className="text-sm text-gray-600">
                            {student.subclass} ({student.class})
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            {student.lateness_count} times
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Lateness by Class
                </h3>
                {!latenessStatistics?.latenessByClass?.length ? (
                  <p className="text-gray-500 text-center py-4">
                    No class data available
                  </p>
                ) : (
                  <div className="space-y-3">
                    {latenessStatistics.latenessByClass.map((classData, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-gray-900">
                            {classData.className}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                          {classData.count} late
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboardPage;