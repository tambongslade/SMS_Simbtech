'use client'
import { useState, useEffect } from 'react';
import { AcademicCapIcon, ChartBarIcon, UserGroupIcon, ClipboardDocumentListIcon, EyeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';

interface Subject {
  id: number;
  name: string;
  category: string;
  subClasses: {
    id: number;
    name: string;
    classId: number;
    className: string;
    coefficient: number;
    periodsPerWeek: number;
    studentCount: number;
  }[];
  totalStudents: number;
  totalPeriods: number;
  examCount?: number;
  avgPerformance?: number;
}

interface SubjectStats {
  totalSubjects: number;
  totalStudents: number;
  totalClasses: number;
  totalPeriods: number;
  avgPerformance: number;
}

export default function TeacherSubjects() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure client-side only rendering for dynamic content
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch teacher's assigned subjects using the new teacher-specific endpoint
  const {
    data: subjectsData,
    error: subjectsError,
    isLoading: subjectsLoading,
    mutate: mutateSubjects
  } = useSWR<{ success: boolean; data: Subject[] }>(
    '/teachers/me/subjects',
    (url: string) => apiService.get(url)
  );

  const subjects = subjectsData?.data || [];

  // Enhanced error handling with access control awareness
  useEffect(() => {
    if (subjectsError) {
      console.error("Subjects Fetch Error:", subjectsError);
      if (subjectsError.status === 403) {
        toast.error('Access denied: Unable to load your assigned subjects');
      } else if (subjectsError.status === 401) {
        toast.error('Please log in to view your subjects');
      } else {
        toast.error('Failed to load subjects');
      }
    }
  }, [subjectsError]);

  // Calculate stats with enhanced data structure
  const stats: SubjectStats = {
    totalSubjects: subjects.length,
    totalStudents: subjects.reduce((sum, subject) => sum + (subject.totalStudents || 0), 0),
    totalClasses: subjects.reduce((sum, subject) => sum + (subject.subClasses?.length || 0), 0),
    totalPeriods: subjects.reduce((sum, subject) => sum + (subject.totalPeriods || 0), 0),
    avgPerformance: subjects.length > 0
      ? subjects.reduce((sum, subject) => sum + (subject.avgPerformance || 0), 0) / subjects.length
      : 0
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowDetailModal(true);
  };

  const navigateToSubmitMarks = (subjectId: number, subClassId?: number) => {
    if (typeof window !== 'undefined') {
      const url = subClassId
        ? `/dashboard/teacher/submit-marks?subjectId=${subjectId}&subClassId=${subClassId}`
        : `/dashboard/teacher/submit-marks?subjectId=${subjectId}`;
      window.location.href = url;
    }
  };

  const navigateToStudents = (subClassId: number) => {
    if (typeof window !== 'undefined') {
      window.location.href = `/dashboard/teacher/students?subClassId=${subClassId}`;
    }
  };

  const navigateToQuestionManagement = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/teacher/question-management';
    }
  };

  const navigateToExams = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard/teacher/exams';
    }
  };

  // Prevent hydration mismatch by not rendering interactive content until mounted
  if (!isMounted) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Subjects</h1>
            <p className="text-gray-600">Manage your assigned subjects and classes</p>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Subjects</h1>
          <p className="text-gray-600">Manage your assigned subjects and classes</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={navigateToQuestionManagement}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
            Manage Questions
          </button>
          <button
            onClick={navigateToExams}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <AcademicCapIcon className="h-5 w-5 mr-2" />
            Create Exam
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <AcademicCapIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Subjects</p>
              <p className="text-2xl font-bold">{subjectsLoading ? '...' : stats.totalSubjects}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold">{subjectsLoading ? '...' : stats.totalStudents}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold">{subjectsLoading ? '...' : stats.totalClasses}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Weekly Periods</p>
              <p className="text-2xl font-bold">{subjectsLoading ? '...' : stats.totalPeriods}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Assigned Subjects</h2>
        </div>

        {subjectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading subjects...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-8">
            <AcademicCapIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No subjects assigned</p>
            <p className="text-sm text-gray-500">Contact your administrator for subject assignments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {subjects.map(subject => (
              <div
                key={subject.id}
                className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleSubjectClick(subject)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{subject.name}</h3>
                    <p className="text-sm text-gray-600">{subject.category}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSubjectClick(subject);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Classes:</span>
                    <span className="font-medium">{subject.subClasses?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium">{subject.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Weekly Periods:</span>
                    <span className="font-medium">{subject.totalPeriods || 0}</span>
                  </div>
                  {subject.avgPerformance !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg. Performance:</span>
                      <span className="font-medium">{subject.avgPerformance.toFixed(1)}%</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {subject.subClasses?.map(subClass => (
                      <span
                        key={subClass.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        title={`${subClass.periodsPerWeek} periods/week, Coefficient: ${subClass.coefficient}`}
                      >
                        {subClass.className} - {subClass.name} ({subClass.studentCount})
                      </span>
                    )) || null}
                  </div>
                </div>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToSubmitMarks(subject.id);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Submit Marks
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (subject.subClasses && subject.subClasses.length > 0) {
                        navigateToStudents(subject.subClasses[0].id);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                  >
                    View Students
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject Detail Modal */}
      {showDetailModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedSubject.name}</h2>
                <p className="text-gray-600">{selectedSubject.category}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3">Subject Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Students:</span>
                    <span className="font-medium">{selectedSubject.totalStudents || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classes Teaching:</span>
                    <span className="font-medium">{selectedSubject.subClasses?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekly Periods:</span>
                    <span className="font-medium">{selectedSubject.totalPeriods || 0}</span>
                  </div>
                  {selectedSubject.avgPerformance !== undefined && (
                    <div className="flex justify-between">
                      <span>Average Performance:</span>
                      <span className="font-medium">{selectedSubject.avgPerformance.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      navigateToSubmitMarks(selectedSubject.id);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit Marks
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      navigateToExams();
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Create New Exam
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      navigateToQuestionManagement();
                    }}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Manage Questions
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Assigned Classes</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Periods/Week
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Coefficient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedSubject.subClasses?.map(subClass => (
                      <tr key={subClass.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {subClass.className} - {subClass.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{subClass.studentCount || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{subClass.periodsPerWeek}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{subClass.coefficient}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setShowDetailModal(false);
                                navigateToStudents(subClass.id);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Students
                            </button>
                            <button
                              onClick={() => {
                                setShowDetailModal(false);
                                navigateToSubmitMarks(selectedSubject.id, subClass.id);
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              Submit Marks
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) || null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}