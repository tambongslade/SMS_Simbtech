'use client'
import { useState, useEffect, useCallback } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';

// Types
interface Subject {
  id: number;
  name: string;
  subClassId: number;
  subClassName: string;
  className: string;
}

interface ExamSequence {
  id: number;
  name: string;
  status: string;
  academicYear?: {
    id: number;
    name: string;
  };
}

interface AcademicYear {
  id: number;
  name: string;
}

interface SubClass {
  id: number;
  name: string;
  class: {
    id: number;
    name: string;
  };
  studentCount: number;
}

interface Student {
  id: number;
  name: string;
  matricule: string;
}

interface Mark {
  id?: number;
  studentId: number;
  mark: number;
  examSequenceId: number;
  subjectId: number;
}

interface StudentMarkRow extends Student {
  markId: number | null;
  currentScore: number | string;
  originalScore: number | null;
  hasChanges: boolean;
}

export default function SubmitMarks() {
  // Filter state
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<number | ''>('');
  const [selectedExamSequence, setSelectedExamSequence] = useState<number | ''>('');
  const [selectedSubClass, setSelectedSubClass] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');

  // Table state
  const [studentsWithMarks, setStudentsWithMarks] = useState<StudentMarkRow[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Fetch academic years
  const {
    data: academicYearsData,
    error: academicYearsError,
    isLoading: academicYearsLoading
  } = useSWR<{ success: boolean; data: AcademicYear[] }>(
    '/academic-years',
    (url: string) => apiService.get(url)
  );

  // Fetch active exam sequences
  const {
    data: examSequencesData,
    error: examSequencesError,
    isLoading: examSequencesLoading
  } = useSWR<{ success: boolean; data: ExamSequence[] }>(
    '/exams?status=ACTIVE',
    (url: string) => apiService.get(url)
  );

  // Fetch teacher's subclasses
  const {
    data: subClassesData,
    error: subClassesError,
    isLoading: subClassesLoading
  } = useSWR<{ success: boolean; data: SubClass[] }>(
    '/teachers/me/subclasses',
    (url: string) => apiService.get(url)
  );

  // Fetch teacher's subjects for selected subclass
  const {
    data: subjectsData,
    error: subjectsError,
    isLoading: subjectsLoading
  } = useSWR<{ success: boolean; data: Subject[] }>(
    selectedSubClass ? `/teachers/me/subjects?subClassId=${selectedSubClass}` : null,
    (url: string) => apiService.get(url)
  );

  const academicYears = academicYearsData?.data || [];
  const examSequences = examSequencesData?.data || [];
  const subClasses = subClassesData?.data || [];
  const subjects = subjectsData?.data || [];

  // Filter exam sequences by selected academic year
  const filteredExamSequences = examSequences.filter(seq =>
    !selectedAcademicYear || seq.academicYear?.id === selectedAcademicYear
  );

  // Error handling
  useEffect(() => {
    if (academicYearsError || examSequencesError || subClassesError || subjectsError) {
      const error = academicYearsError || examSequencesError || subClassesError || subjectsError;
      console.error("Data Fetch Error:", error);
      if (error?.status === 403) {
        toast.error('Access denied: Unable to load required data');
      } else if (error?.status === 401) {
        toast.error('Please log in to access this page');
      } else {
        toast.error('Failed to load required data');
      }
    }
  }, [academicYearsError, examSequencesError, subClassesError, subjectsError]);

  // Fetch students and marks
  const fetchStudentsAndMarks = useCallback(async () => {
    if (!selectedAcademicYear || !selectedExamSequence || !selectedSubClass || !selectedSubject) {
      setStudentsWithMarks([]);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    setIsLoadingStudents(true);
    setSaveError(null);

    try {
      // Check access first
      const accessCheckResponse = await apiService.get(
        `/teachers/me/access-check?subjectId=${selectedSubject}&subClassId=${selectedSubClass}`
      );

      if (!accessCheckResponse.success) {
        throw new Error('Access denied: You cannot manage marks for this subject/class combination');
      }

      // Fetch students for the selected subclass and subject
      const studentsParams = new URLSearchParams({
        subClassId: String(selectedSubClass),
        subjectId: String(selectedSubject),
        page: String(currentPage),
        limit: String(limit),
      });

      const studentsResponse = await apiService.get(`/teachers/me/students?${studentsParams}`);
      const students = studentsResponse.data || [];

      // Fetch existing marks for this exam sequence and subject
      const marksParams = new URLSearchParams({
        examSequenceId: String(selectedExamSequence),
        subjectId: String(selectedSubject),
        subClassId: String(selectedSubClass),
      });

      const marksResponse = await apiService.get(`/marks?${marksParams}`);
      const existingMarks = marksResponse.data || [];

      // Create student-mark rows
      const studentMarkRows: StudentMarkRow[] = students.map((student: Student) => {
        const existingMark = existingMarks.find((mark: Mark) => mark.studentId === student.id);
        return {
          ...student,
          markId: existingMark?.id || null,
          currentScore: existingMark?.mark ?? '',
          originalScore: existingMark?.mark ?? null,
          hasChanges: false,
        };
      });

      setStudentsWithMarks(studentMarkRows);
      setTotalPages(studentsResponse.meta?.totalPages || 1);

    } catch (error: any) {
      console.error('Error fetching students and marks:', error);
      if (error?.status === 403) {
        toast.error('Access denied: You cannot manage marks for this subject/class combination');
      } else {
        toast.error('Failed to load students and marks: ' + (error?.message || 'Unknown error'));
      }
      setStudentsWithMarks([]);
      setSaveError(error?.message || 'Failed to load data');
    } finally {
      setIsLoadingStudents(false);
    }
  }, [selectedAcademicYear, selectedExamSequence, selectedSubClass, selectedSubject, currentPage, limit]);

  // Trigger fetch when filters change
  useEffect(() => {
    fetchStudentsAndMarks();
  }, [fetchStudentsAndMarks]);

  // Reset dependent selections when parent selection changes
  useEffect(() => {
    setSelectedExamSequence('');
    setSelectedSubClass('');
    setSelectedSubject('');
    setStudentsWithMarks([]);
  }, [selectedAcademicYear]);

  useEffect(() => {
    setSelectedSubject('');
    setStudentsWithMarks([]);
  }, [selectedSubClass]);

  useEffect(() => {
    setStudentsWithMarks([]);
  }, [selectedExamSequence, selectedSubject]);

  // Handle mark changes
  const handleMarkChange = (studentId: number, value: string) => {
    const numValue = value === '' ? '' : parseFloat(value);

    // Validate input
    if (value !== '' && (isNaN(Number(value)) || Number(value) < 0 || Number(value) > 20)) {
      return;
    }

    setStudentsWithMarks(prev => prev.map(student => {
      if (student.id === studentId) {
        const originalScore = student.originalScore;
        const newScore = value === '' ? null : numValue;
        return {
          ...student,
          currentScore: value,
          hasChanges: newScore !== originalScore
        };
      }
      return student;
    }));
  };

  // Save all marks
  const handleSaveAllMarks = async () => {
    const changedStudents = studentsWithMarks.filter(student => student.hasChanges);

    if (changedStudents.length === 0) {
      toast('No changes to save');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Check access before saving
      const accessCheckResponse = await apiService.get(
        `/teachers/me/access-check?subjectId=${selectedSubject}&subClassId=${selectedSubClass}`
      );

      if (!accessCheckResponse.success) {
        throw new Error('Access denied: You cannot submit marks for this subject/class combination');
      }

      // Prepare marks for submission
      const markPromises = changedStudents.map(student => {
        const markData = {
          examId: Number(selectedExamSequence),
          studentId: student.id,
          subjectId: Number(selectedSubject),
          mark: student.currentScore === '' ? null : Number(student.currentScore)
        };

        if (student.markId) {
          // Update existing mark
          return apiService.put(`/marks/${student.markId}`, {
            mark: markData.mark
          });
        } else {
          // Create new mark
          return apiService.post('/marks', markData);
        }
      });

      await Promise.all(markPromises);

      // Update state to reflect saved changes
      setStudentsWithMarks(prev => prev.map(student => ({
        ...student,
        originalScore: student.currentScore === '' ? null : Number(student.currentScore),
        hasChanges: false
      })));

      toast.success(`Successfully saved marks for ${changedStudents.length} students`);

      // Refresh data
      await fetchStudentsAndMarks();

    } catch (error: any) {
      console.error('Error saving marks:', error);
      if (error?.status === 403) {
        toast.error('Access denied: You cannot submit marks for this subject/class combination');
      } else {
        toast.error('Failed to save marks: ' + (error?.message || 'Unknown error'));
      }
      setSaveError(error?.message || 'Failed to save marks');
    } finally {
      setIsSaving(false);
    }
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  // Filter dropdown component
  const renderFilterDropdown = (
    label: string,
    value: number | '',
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void,
    options: { id: number; name: string }[],
    isLoading: boolean,
    disabled: boolean = false,
    placeholder?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={isLoading || disabled}
        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100"
      >
        <option value="">{placeholder || `Select ${label}`}</option>
        {isLoading && <option>Loading...</option>}
        {!isLoading && options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
        {!isLoading && options.length === 0 && value === '' && (
          <option disabled>No options available</option>
        )}
      </select>
    </div>
  );

  const hasChanges = studentsWithMarks.some(student => student.hasChanges);
  const isDataLoading = academicYearsLoading || examSequencesLoading || subClassesLoading || subjectsLoading;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Submit Marks</h1>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded shadow">
        {renderFilterDropdown(
          'Academic Year',
          selectedAcademicYear,
          (e) => setSelectedAcademicYear(Number(e.target.value) || ''),
          academicYears,
          academicYearsLoading
        )}

        {renderFilterDropdown(
          'Exam Sequence',
          selectedExamSequence,
          (e) => setSelectedExamSequence(Number(e.target.value) || ''),
          filteredExamSequences,
          examSequencesLoading,
          !selectedAcademicYear
        )}

        {renderFilterDropdown(
          'Subclass',
          selectedSubClass,
          (e) => setSelectedSubClass(Number(e.target.value) || ''),
          subClasses.map(sc => ({ id: sc.id, name: `${sc.class.name} - ${sc.name}` })),
          subClassesLoading,
          !selectedAcademicYear
        )}

        {renderFilterDropdown(
          'Subject',
          selectedSubject,
          (e) => setSelectedSubject(Number(e.target.value) || ''),
          subjects,
          subjectsLoading,
          !selectedSubClass
        )}
      </div>

      {/* Display Filter Errors */}
      {saveError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Marks Table Area */}
      <div className="mt-6">
        {/* Loading State */}
        {isLoadingStudents && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading students and marks...</p>
          </div>
        )}

        {/* Prompt to select filters */}
        {!isLoadingStudents && studentsWithMarks.length === 0 &&
          (!selectedAcademicYear || !selectedExamSequence || !selectedSubClass || !selectedSubject) && (
            <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
              Please select an Academic Year, Exam Sequence, Subclass, and Subject to submit marks.
            </div>
          )}

        {/* No Students Found */}
        {!isLoadingStudents && studentsWithMarks.length === 0 &&
          selectedAcademicYear && selectedExamSequence && selectedSubClass && selectedSubject && (
            <div className="text-center py-10 px-4 text-gray-500 bg-gray-50 rounded-md shadow-sm">
              No students found for the selected filters, or you don't have access to this subject/class combination.
            </div>
          )}

        {/* Students Table */}
        {!isLoadingStudents && studentsWithMarks.length > 0 && (
          <>
            <div className="overflow-x-auto shadow border-b border-gray-200 sm:rounded-lg mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matricule
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mark (out of 20)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {studentsWithMarks.map((student, index) => (
                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1 + (currentPage - 1) * limit}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {student.matricule || 'N/A'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={student.currentScore}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          className={`w-24 p-1.5 border rounded text-sm ${student.hasChanges
                            ? 'border-blue-500 ring-1 ring-blue-300 bg-blue-50'
                            : 'border-gray-300'
                            } focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                          disabled={isSaving}
                          placeholder="0-20"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {student.hasChanges ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Modified
                          </span>
                        ) : student.originalScore !== null ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Recorded
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 mb-6 px-1">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || isLoadingStudents || isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || isLoadingStudents || isSaving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Save Button */}
            <div className="text-right mt-6">
              <button
                onClick={handleSaveAllMarks}
                disabled={isSaving || isLoadingStudents || !hasChanges}
                className="px-6 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  `Save All Changes${hasChanges ? ` (${studentsWithMarks.filter(s => s.hasChanges).length})` : ''}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}