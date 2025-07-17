"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';
import { useAuth } from '@/components/context/AuthContext';
import Modal from '@/components/ui/Modal'; // Assuming Modal component is available
import { Input } from '@/components/ui/Input'; // Importing Input component as named export

interface Interview {
  id: number;
  studentId: number;
  studentName: string;
  studentMatricule: string;
  className: string; // The name of the main class (e.g., "Form 1")
  subclassName?: string; // The name of the subclass (e.g., "Form 1A")
  interviewStatus: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  completedDate?: string; // "YYYY-MM-DD"
  score?: number;
  comments?: string;
  interviewerName?: string;
  registrationDate: string; // "YYYY-MM-DD"
}

interface SubClass {
  id: number;
  name: string;
  classId: number;
  className: string; // Name of the parent class
  classMasterId?: number;
  currentEnrollment: number; // From subclass-optimization
  maxCapacity: number;       // From subclass-optimization
  utilizationRate: number;   // From subclass-optimization
  availableSpots: number;    // From subclass-optimization
  status: 'OPTIMAL' | 'UNDERUTILIZED' | 'OVERLOADED' | 'FULL'; // From subclass-optimization
}

// Define API Response types for useSWR
interface GetInterviewsResponse {
  success: boolean;
  data: Interview[];
  count: number; // as per API doc for /vice-principal/interviews
}

interface GetSubclassesResponse {
  success: boolean;
  data: SubClass[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
  };
}

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [subClasses, setSubClasses] = useState<SubClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all'); // This will filter by main class name
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [subClassToAssign, setSubClassToAssign] = useState<string>(''); // This will be subclass ID
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [sortField, setSortField] = useState<keyof Interview>('registrationDate'); // Changed default sort field
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showRecordScoreModal, setShowRecordScoreModal] = useState<boolean>(false);
  const [currentStudentForScore, setCurrentStudentForScore] = useState<Interview | null>(null);
  const [score, setScore] = useState<number>(0);
  const [comments, setComments] = useState<string>('');

  const { currentAcademicYear } = useAuth();

  // Fetch interviews data
  const { data: interviewsData, error: interviewsError, isLoading: interviewsLoading, mutate: mutateInterviews } = useSWR<GetInterviewsResponse>(
    currentAcademicYear ? `/vice-principal/interviews?academicYearId=${currentAcademicYear.id}` : null,
    apiService.get
  );

  // Fetch subclasses data
  const { data: subClassesData, error: subClassesError, isLoading: subClassesLoading } = useSWR<GetSubclassesResponse>(
    currentAcademicYear ? `/classes/sub-classes?academicYearId=${currentAcademicYear.id}&includeSubjects=false` : null, // Fetch all subclasses
    apiService.get
  );

  useEffect(() => {
    if (interviewsData) {
      setInterviews(interviewsData.data);
    }
    if (subClassesData) {
      setSubClasses(subClassesData.data);
    }
    setIsLoading(interviewsLoading || subClassesLoading);

    if (interviewsError || subClassesError) {
      toast.error('Failed to load data');
      console.error('Error fetching data:', interviewsError || subClassesError);
    }
  }, [interviewsData, subClassesData, interviewsError, subClassesError, interviewsLoading, subClassesLoading]);

  // Drag selection state
  // Moved up to ensure it's declared before its use in useEffect
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragCurrentIndex, setDragCurrentIndex] = useState<number | null>(null);


  // Add global mouse up handler to stop dragging if released outside of table
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Disable copy functionality and context menu
  useEffect(() => {
    const preventCopy = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'x' || e.key === 'a')) {
        e.preventDefault();
      }
    };

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('keydown', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('keydown', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  // Add a custom style to disable selection
  const nonSelectableStyle: React.CSSProperties = {
    userSelect: 'none',
    WebkitUserSelect: 'none', // For Safari
    MozUserSelect: 'none',    // For Firefox
    msUserSelect: 'none',     // For Edge/IE
    WebkitTouchCallout: 'none', // For iOS touch long press
    pointerEvents: 'none'
  };

  // Filter and sort students
  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = interview.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.studentMatricule.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || interview.className === selectedClass;
    const matchesStatus = statusFilter === 'all' || interview.interviewStatus === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  }).sort((a, b) => {
    const valueA = a[sortField];
    const valueB = b[sortField];

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA); // Corrected for descending string sort
    }

    // Fallback for other types or if types are mixed
    return 0;
  });

  // Toggle student selection
  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Toggle all selectable students
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredInterviews.filter(s => !s.subclassName).map(s => s.studentId));
    }
    setSelectAll(!selectAll);
  };

  // Handle sorting
  const handleSort = (field: keyof Interview) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc'); // Default to ascending for new fields
    }
  };

  // Handle class assignment
  const handleAssignClass = async () => {
    if (!subClassToAssign) {
      toast.error('Please select a class to assign');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Please select students to assign');
      return;
    }

    setIsLoading(true);
    try {
      const selectedSubClass = subClasses.find(sc => sc.id.toString() === subClassToAssign);

      if (!selectedSubClass) {
        toast.error('Selected subclass not found.');
        setIsLoading(false);
        return;
      }

      for (const studentId of selectedStudents) {
        // Changed endpoint to /students/:id/assign-subclass as per Student Management section
        await apiService.post(`/students/${studentId}/assign-subclass`, {
          subClassId: selectedSubClass.id,
          academicYearId: currentAcademicYear?.id,
        });
      }

      toast.success(`${selectedStudents.length} students assigned successfully.`);
      mutateInterviews(); // Re-fetch interviews after assignment
      setShowAssignModal(false);
      setSelectedStudents([]);
      setSubClassToAssign('');
      setSelectAll(false);
    } catch (error) {
      console.error('Error assigning class:', error);
      toast.error('Failed to assign students to class.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle recording interview score
  const handleRecordScore = async () => {
    if (!currentStudentForScore || score === null || score === undefined) {
      toast.error('Please select a student and enter a valid score.');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.post('/enrollment/interview', {
        studentId: currentStudentForScore.studentId,
        score: score,
        comments: comments,
        academicYearId: currentAcademicYear?.id,
      });

      toast.success(`Interview score recorded for ${currentStudentForScore.studentName}.`);
      mutateInterviews(); // Re-fetch interviews after recording score
      setShowRecordScoreModal(false);
      setCurrentStudentForScore(null);
      setScore(0);
      setComments('');
    } catch (error) {
      console.error('Error recording score:', error);
      toast.error('Failed to record interview score.');
    } finally {
      setIsLoading(false);
    }
  };

  const openRecordScoreModal = (interview: Interview) => {
    setCurrentStudentForScore(interview);
    setScore(interview.score || 0); // Pre-fill if score exists
    setComments(interview.comments || ''); // Pre-fill comments
    setShowRecordScoreModal(true);
  };

  // Handle drag start
  const handleDragStart = (studentId: number, index: number) => {
    // Only allow drag selection on students who can be assigned (not yet assigned a subclass)
    const interview = interviews.find(s => s.studentId === studentId);
    // Use `=== undefined` for clarity as `null` is a valid assigned value
    if (interview?.subclassName !== undefined) {
      return;
    }
    setIsDragging(true);
    setDragStartIndex(index);
    setDragCurrentIndex(index);
    // Add the starting student to selection if not already selected
    if (!selectedStudents.includes(studentId)) {
      setSelectedStudents(prev => [...prev, studentId]);
    }
  };

  // Handle drag move
  const handleDragMove = (index: number) => {
    if (!isDragging || dragStartIndex === null) return;

    setDragCurrentIndex(index);

    // Update selected students based on drag range
    if (dragStartIndex !== null && dragCurrentIndex !== null) {
      const selectableInterviews = filteredInterviews.filter(s =>
        s.subclassName === undefined
      );

      const start = Math.min(dragStartIndex, index);
      const end = Math.max(dragStartIndex, index);

      const newSelectedIds = selectableInterviews
        .filter((_, i) => i >= start && i <= end)
        .map(s => s.studentId);

      setSelectedStudents(newSelectedIds);
    }
  };

  // Handle drag end
  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStartIndex(null);
    setDragCurrentIndex(null);
  };

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Interview Management</h1>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex space-x-4">
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={selectedStudents.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlusIcon className="w-5 h-5 inline-block mr-2" />
            Assign Selected to Class ({selectedStudents.length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="relative">
            <select
              id="class-filter"
              value={selectedClass}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Classes</option>
              {Array.from(new Set(subClasses.map(cls => cls.className))).map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('studentName')}
              >
                <div className="flex items-center">
                  <span>Student</span>
                  {sortField === 'studentName' && (
                    <ChevronDownIcon
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                    />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('interviewStatus')}
              >
                <div className="flex items-center">
                  <span>Status</span>
                  {sortField === 'interviewStatus' && (
                    <ChevronDownIcon
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                    />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('registrationDate')}
              >
                <div className="flex items-center">
                  <span>Registration Date</span>
                  {sortField === 'registrationDate' && (
                    <ChevronDownIcon
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`}
                    />
                  )}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Class Assigned
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredInterviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              filteredInterviews.map((interview, index) => {
                const isSelectable = interview.subclassName === undefined; // Only students not yet assigned a subclass can be selected
                const isSelected = selectedStudents.includes(interview.studentId);

                return (
                  <tr
                    key={interview.id}
                    className={`${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isSelectable ? 'cursor-pointer' : ''
                      } select-none`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent text selection
                      if (isSelectable) handleDragStart(interview.studentId, index);
                    }}
                    onMouseOver={(e) => {
                      if (isDragging && isSelectable) {
                        handleDragMove(index);
                      }
                    }}
                    onMouseUp={handleDragEnd}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(interview.studentId)}
                        onChange={() => toggleStudentSelection(interview.studentId)}
                        disabled={interview.subclassName !== undefined}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900" style={nonSelectableStyle}>{interview.studentName}</div>
                      <div className="text-sm text-gray-500" style={nonSelectableStyle}>Matricule: {interview.studentMatricule}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${interview.interviewStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        interview.interviewStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`} style={nonSelectableStyle}>
                        {interview.interviewStatus.charAt(0).toUpperCase() + interview.interviewStatus.slice(1)}
                      </span>
                      {interview.score !== undefined && interview.score !== null && (
                        <div className="text-sm text-gray-500 mt-1" style={nonSelectableStyle}>Score: {interview.score}/20</div>
                      )}
                      {interview.comments && (
                        <div className="text-sm text-gray-500 mt-1 truncate" style={{ maxWidth: '150px', ...nonSelectableStyle }} title={interview.comments}>
                          Comments: {interview.comments}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span style={nonSelectableStyle}>{interview.registrationDate ? new Date(interview.registrationDate).toLocaleDateString() : 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.subclassName ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800" style={nonSelectableStyle}>
                          {interview.subclassName}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500" style={nonSelectableStyle}>Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {interview.interviewStatus === 'PENDING' ? (
                        <button
                          onClick={() => openRecordScoreModal(interview)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Record Score
                        </button>
                      ) : (
                        <button
                          onClick={() => openRecordScoreModal(interview)}
                          className="text-gray-400 cursor-not-allowed mr-4"
                          disabled
                        >
                          Score Recorded
                        </button>
                      )}
                      <button
                        onClick={() => {/* handle edit interview */ }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Class Modal */}
      {showAssignModal && (
        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title="Assign Students to Class"
        >
          <div className="p-4">
            <p className="text-sm text-gray-700 mb-4">
              Assign {selectedStudents.length} selected students to a subclass.
            </p>
            <div className="mb-4">
              <label htmlFor="class-select" className="block text-sm font-medium text-gray-700">Select Subclass:</label>
              <select
                id="class-select"
                value={subClassToAssign}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setSubClassToAssign(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select a class</option>
                {subClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}> {/* Use subclass ID as value */}
                    {cls.name} ({cls.currentEnrollment}/{cls.maxCapacity}) - {cls.className}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignClass}
              disabled={!subClassToAssign || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Assign
            </button>
          </div>
        </Modal>
      )}

      {/* Record Interview Score Modal */}
      {showRecordScoreModal && (
        <Modal
          isOpen={showRecordScoreModal}
          onClose={() => setShowRecordScoreModal(false)}
          title={`Record Score for ${currentStudentForScore?.studentName}`}
        >
          <div className="p-4">
            <div className="mb-4">
              <label htmlFor="score" className="block text-sm font-medium text-gray-700">Score (out of 20):</label>
              <Input
                type="number"
                id="score"
                value={score}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScore(parseInt(e.target.value))}
                min="0"
                max="20"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700">Comments:</label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              ></textarea>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRecordScoreModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRecordScore}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Record Score
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}