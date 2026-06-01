'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

// --- Types ---
interface ExamSequence {
  id: number;
  name: string;
  sequenceNumber: number;
  termId: number;
}

interface AcademicYear {
  id: number;
  name: string;
  terms: { id: number; name: string }[];
  examSequences: ExamSequence[];
}

// Submission tracking API response types
interface SubjectSubmission {
  subjectId: number;
  subjectName: string;
  totalStudents: number;
  submittedCount: number;
  missingCount: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'missing';
  assignedTeacher?: string;
  submittedBy?: string;
}

interface ClassSubmission {
  subClassId: number;
  subClassName: string;
  className?: string;
  totalStudents: number;
  subjects: SubjectSubmission[];
  overallCompletion: number;
}

interface SubmissionTrackingData {
  examSequenceId: number;
  examSequenceName: string;
  classes: ClassSubmission[];
  summary: {
    totalClasses: number;
    totalSubjectPairs: number;
    completePairs: number;
    partialPairs: number;
    missingPairs: number;
    overallCompletion: number;
  };
}

interface PendingSubject {
  subjectId: number;
  subjectName: string;
  subClassId: number;
  subClassName: string;
  submittedCount: number;
  missingCount: number;
  totalStudents: number;
}

interface PendingTeacher {
  teacherId: number;
  teacherName: string;
  email?: string;
  phone?: string;
  totalMissing: number;
  totalSubmitted: number;
  subjects: PendingSubject[];
}

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// SWR fetcher with auth
const fetcher = async (url: string) => {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  return res.json();
};

// Status color helpers
function getStatusColor(status: string): string {
  switch (status) {
    case 'complete': return 'bg-green-100 text-green-800 border-green-200';
    case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'missing': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-400 border-gray-100';
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
    case 'partial':
      return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />;
    case 'missing':
      return <XCircleIcon className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
}

function StatusLabel({ status }: { status: string }) {
  switch (status) {
    case 'complete': return 'Complete';
    case 'partial': return 'Partial';
    case 'missing': return 'Not Submitted';
    default: return 'N/A';
  }
}

export default function MarksSubmissionPage() {
  const [selectedYearId, setSelectedYearId] = useState<number | ''>('');
  const [selectedSequenceId, setSelectedSequenceId] = useState<number | ''>('');
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending'>('overview');

  // Fetch academic years
  const { data: yearsResult, isLoading: isLoadingYears } = useSWR<{ data: any[] }>(
    `${API_BASE_URL}/academic-years`,
    fetcher
  );

  // Process academic years
  const academicYears = useMemo((): AcademicYear[] => {
    if (!yearsResult?.data) return [];
    return yearsResult.data.map((year: any) => ({
      id: year.id,
      name: year.name,
      terms: year.terms || [],
      examSequences: (year.examSequences || []).map((seq: any) => ({
        id: seq.id,
        name: seq.name || `Sequence ${seq.sequenceNumber}`,
        sequenceNumber: seq.sequenceNumber,
        termId: seq.termId,
      })),
    }));
  }, [yearsResult]);

  // Derived exam sequences for selected year
  const examSequences = useMemo(() => {
    if (!selectedYearId) return [];
    const year = academicYears.find(y => y.id === selectedYearId);
    return year?.examSequences || [];
  }, [selectedYearId, academicYears]);

  // Fetch submission tracking data
  const {
    data: trackingResult,
    isLoading: isLoadingTracking,
    error: trackingError,
  } = useSWR<{ data: SubmissionTrackingData }>(
    selectedSequenceId ? `${API_BASE_URL}/exams/${selectedSequenceId}/submission-tracking` : null,
    fetcher
  );

  // Fetch pending teachers data
  const {
    data: pendingResult,
    isLoading: isLoadingPending,
    error: pendingError,
  } = useSWR<{ data: PendingTeacher[] }>(
    selectedSequenceId ? `${API_BASE_URL}/exams/${selectedSequenceId}/pending-teachers` : null,
    fetcher
  );

  const tracking = trackingResult?.data;
  const pendingTeachers = pendingResult?.data || [];

  // Reset sequence when year changes
  useEffect(() => {
    setSelectedSequenceId('');
  }, [selectedYearId]);

  // Sort classes by completion (least complete first when in overview)
  const sortedClasses = useMemo(() => {
    if (!tracking?.classes) return [];
    return [...tracking.classes].sort((a, b) => a.overallCompletion - b.overallCompletion);
  }, [tracking]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mark Submission Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">Monitor mark submission progress per class and subject</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(Number(e.target.value) || '')}
              disabled={isLoadingYears}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Select Academic Year</option>
              {academicYears.map(year => (
                <option key={year.id} value={year.id}>{year.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exam Sequence</label>
            <select
              value={selectedSequenceId}
              onChange={(e) => setSelectedSequenceId(Number(e.target.value) || '')}
              disabled={isLoadingYears || !selectedYearId}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">Select Exam Sequence</option>
              {examSequences.map(seq => (
                <option key={seq.id} value={seq.id}>{seq.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prompt when no selection */}
      {(!selectedYearId || !selectedSequenceId) && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          Select an Academic Year and Exam Sequence to view mark submission progress.
        </div>
      )}

      {/* Loading */}
      {(isLoadingTracking || isLoadingPending) && selectedSequenceId && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading submission data...</p>
        </div>
      )}

      {/* Error */}
      {(trackingError || pendingError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {trackingError?.message || pendingError?.message || 'Failed to load data'}
        </div>
      )}

      {/* Content */}
      {tracking && selectedSequenceId && !isLoadingTracking && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 uppercase">Classes</p>
              <p className="text-2xl font-bold text-gray-900">{tracking.summary.totalClasses}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
              <p className="text-xs text-gray-500 uppercase">Subject Pairs</p>
              <p className="text-2xl font-bold text-gray-900">{tracking.summary.totalSubjectPairs}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 uppercase">Complete</p>
              <p className="text-2xl font-bold text-green-600">{tracking.summary.completePairs}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <p className="text-xs text-gray-500 uppercase">Partial</p>
              <p className="text-2xl font-bold text-yellow-600">{tracking.summary.partialPairs}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <p className="text-xs text-gray-500 uppercase">Missing</p>
              <p className="text-2xl font-bold text-red-600">{tracking.summary.missingPairs}</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall School Completion</span>
              <span className="text-sm font-bold text-gray-900">{Math.round(tracking.summary.overallCompletion)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  tracking.summary.overallCompletion === 100 ? 'bg-green-500' :
                  tracking.summary.overallCompletion > 50 ? 'bg-yellow-500' : 'bg-red-400'
                }`}
                style={{ width: `${tracking.summary.overallCompletion}%` }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Class Overview
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Teachers
                {pendingTeachers.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {pendingTeachers.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Class Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {sortedClasses.map(cls => {
                const isExpanded = expandedClass === cls.subClassId;
                const completeCount = cls.subjects.filter(s => s.status === 'complete').length;
                const partialCount = cls.subjects.filter(s => s.status === 'partial').length;
                const missingCount = cls.subjects.filter(s => s.status === 'missing').length;

                return (
                  <div key={cls.subClassId} className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Collapsible Header */}
                    <button
                      onClick={() => setExpandedClass(isExpanded ? null : cls.subClassId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900">{cls.subClassName}</h3>
                          <p className="text-xs text-gray-500">
                            {cls.subjects.length} subjects &middot; {cls.totalStudents} students
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Progress bar */}
                        <div className="hidden sm:flex items-center gap-3 min-w-[200px]">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                cls.overallCompletion === 100 ? 'bg-green-500' :
                                cls.overallCompletion > 0 ? 'bg-yellow-500' : 'bg-red-400'
                              }`}
                              style={{ width: `${cls.overallCompletion}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-600 min-w-[40px] text-right">
                            {Math.round(cls.overallCompletion)}%
                          </span>
                        </div>
                        {/* Status chips */}
                        <div className="hidden md:flex items-center gap-2 text-xs">
                          {completeCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              {completeCount} done
                            </span>
                          )}
                          {partialCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              {partialCount} partial
                            </span>
                          )}
                          {missingCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                              {missingCount} missing
                            </span>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Subject Detail */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-4">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {cls.subjects.map(subject => {
                              const pct = Math.round(subject.completionPercentage);
                              return (
                                <tr key={subject.subjectId} className="hover:bg-gray-50">
                                  <td className="px-4 py-2.5 font-medium text-gray-900">{subject.subjectName}</td>
                                  <td className="px-4 py-2.5 text-gray-600 text-xs">
                                    {subject.assignedTeacher || subject.submittedBy || (
                                      <span className="italic text-gray-400">Unassigned</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(subject.status)}`}>
                                      <StatusIcon status={subject.status} />
                                      <StatusLabel status={subject.status} />
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-600">
                                    {subject.submittedCount} / {subject.totalStudents}
                                    {subject.missingCount > 0 && (
                                      <span className="text-red-500 text-xs ml-1">({subject.missingCount} missing)</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[120px]">
                                        <div
                                          className={`h-2 rounded-full ${
                                            subject.status === 'complete' ? 'bg-green-500' :
                                            subject.status === 'partial' ? 'bg-yellow-500' : 'bg-red-400'
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-500">{pct}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {sortedClasses.length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                  No submission data available for this exam sequence.
                </div>
              )}
            </div>
          )}

          {/* Pending Teachers Tab */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              {isLoadingPending ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-500">Loading pending teachers...</p>
                </div>
              ) : pendingTeachers.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium">All teachers have submitted their marks!</p>
                  <p className="text-sm text-gray-500 mt-1">No pending submissions found.</p>
                </div>
              ) : (
                pendingTeachers.map(teacher => (
                  <div key={teacher.teacherId} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-100 rounded-full p-2">
                            <UserIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{teacher.teacherName}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              {teacher.email && (
                                <span className="flex items-center gap-1">
                                  <EnvelopeIcon className="w-3 h-3" />
                                  {teacher.email}
                                </span>
                              )}
                              {teacher.phone && (
                                <span className="flex items-center gap-1">
                                  <PhoneIcon className="w-3 h-3" />
                                  {teacher.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {teacher.totalMissing} marks missing
                          </span>
                          {teacher.totalSubmitted > 0 && (
                            <p className="text-xs text-gray-500 mt-1">{teacher.totalSubmitted} submitted</p>
                          )}
                        </div>
                      </div>

                      {/* Subjects pending */}
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase">
                              <th className="text-left py-1 font-medium">Subject</th>
                              <th className="text-left py-1 font-medium">Class</th>
                              <th className="text-left py-1 font-medium">Submitted</th>
                              <th className="text-left py-1 font-medium">Missing</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teacher.subjects.map((subj, i) => (
                              <tr key={i} className="border-t border-gray-50">
                                <td className="py-1.5 text-gray-900">{subj.subjectName}</td>
                                <td className="py-1.5 text-gray-600">{subj.subClassName}</td>
                                <td className="py-1.5 text-gray-600">{subj.submittedCount} / {subj.totalStudents}</td>
                                <td className="py-1.5">
                                  <span className="text-red-600 font-medium">{subj.missingCount}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
