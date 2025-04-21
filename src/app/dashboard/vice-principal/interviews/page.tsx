"use client";

import { useState, useEffect } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface Student {
  id: number;
  name: string;
  interviewScore: number;
  mathScore: number;
  englishScore: number;
  reasoningScore: number;
  totalScore: number;
  interviewDate: string;
  currentClass: string | null;
  status: 'pending' | 'passed' | 'failed' | 'assigned';
  selected?: boolean; // For drag selection tracking
}

interface Class {
  id: number;
  name: string;
  capacity: number;
  currentOccupancy: number;
}

export default function InterviewsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [classToAssign, setClassToAssign] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [sortField, setSortField] = useState<keyof Student>('totalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Drag selection state
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
  const nonSelectableStyle = {
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    KhtmlUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    userSelect: 'none',
    pointerEvents: 'none' as const
  };

  // Mock data - would be replaced with actual API calls in production
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Simulating API call delay
        setTimeout(() => {
          // Mock classes data
          const classesData: Class[] = [
            { id: 1, name: 'Form 1A', capacity: 80, currentOccupancy: 35 },
            { id: 2, name: 'Form 1B', capacity: 80, currentOccupancy: 30 },
            { id: 3, name: 'Form 2A', capacity: 80, currentOccupancy: 40 },
            { id: 4, name: 'Form 2B', capacity: 80, currentOccupancy: 38 },
          ];
          
          // Mock students data
          const studentsData: Student[] = [
            {
              id: 1,
              name: 'John Doe',
              interviewScore: 18,
              mathScore: 15,
              englishScore: 17,
              reasoningScore: 16,
              totalScore: 66,
              interviewDate: '2025-03-15',
              currentClass: null,
              status: 'passed'
            },
            {
              id: 2,
              name: 'Jane Smith',
              interviewScore: 20,
              mathScore: 18,
              englishScore: 19,
              reasoningScore: 17,
              totalScore: 74,
              interviewDate: '2025-03-16',
              currentClass: null,
              status: 'passed'
            },
            {
              id: 3,
              name: 'Michael Johnson',
              interviewScore: 15,
              mathScore: 14,
              englishScore: 16,
              reasoningScore: 14,
              totalScore: 59,
              interviewDate: '2025-03-14',
              currentClass: 'Form 1A',
              status: 'assigned'
            },
            {
              id: 4,
              name: 'Sarah Williams',
              interviewScore: 19,
              mathScore: 17,
              englishScore: 18,
              reasoningScore: 18,
              totalScore: 72,
              interviewDate: '2025-03-17',
              currentClass: null,
              status: 'passed'
            },
            {
              id: 5,
              name: 'David Brown',
              interviewScore: 14,
              mathScore: 13,
              englishScore: 12,
              reasoningScore: 13,
              totalScore: 52,
              interviewDate: '2025-03-18',
              currentClass: null,
              status: 'failed'
            },
            {
              id: 6,
              name: 'Emma Davis',
              interviewScore: 17,
              mathScore: 16,
              englishScore: 15,
              reasoningScore: 15,
              totalScore: 63,
              interviewDate: '2025-03-15',
              currentClass: null,
              status: 'passed'
            },
            {
              id: 7,
              name: 'James Wilson',
              interviewScore: 16,
              mathScore: 15,
              englishScore: 14,
              reasoningScore: 14,
              totalScore: 59,
              interviewDate: '2025-03-16',
              currentClass: 'Form 1B',
              status: 'assigned'
            },
          ];
          
          setClasses(classesData);
          setStudents(studentsData);
          setIsLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter and sort students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'all' || student.currentClass === selectedClass;
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    
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
        : valueB.localeCompare(valueA);
    }
    
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

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.filter(s => s.status === 'passed' && !s.currentClass).map(s => s.id));
    }
    setSelectAll(!selectAll);
  };

  // Handle sorting
  const handleSort = (field: keyof Student) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending for new fields
    }
  };

  // Handle class assignment
  const handleAssignClass = async () => {
    if (!classToAssign) {
      toast.error('Please select a class to assign');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // In production, this would be an API call
      // For demo, we'll update our local state
      setTimeout(() => {
        const updatedStudents = students.map(student => {
          if (selectedStudents.includes(student.id)) {
            return {
              ...student,
              currentClass: classToAssign,
              status: 'assigned' as const
            };
          }
          return student;
        });
        
        setStudents(updatedStudents);
        setSelectedStudents([]);
        setShowAssignModal(false);
        setClassToAssign('');
        setSelectAll(false);
        setIsLoading(false);
        
        toast.success(`${selectedStudents.length} students assigned to ${classToAssign}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error assigning class:', error);
      toast.error('Failed to assign class');
      setIsLoading(false);
    }
  };

  // Handle drag selection
  const handleDragStart = (studentId: number, index: number) => {
    // Only allow drag selection on students who can be assigned
    const student = students.find(s => s.id === studentId);
    if (student?.status !== 'passed' || student?.currentClass !== null) {
      return;
    }
    
    setIsDragging(true);
    setDragStartIndex(index);
    setDragCurrentIndex(index);
  };

  const handleDragMove = (index: number) => {
    if (!isDragging) return;
    setDragCurrentIndex(index);
    
    // Update selected students based on drag range
    if (dragStartIndex !== null && dragCurrentIndex !== null) {
      const selectableStudents = filteredStudents.filter(s => 
        s.status === 'passed' && s.currentClass === null
      );
      
      const start = Math.min(dragStartIndex, index);
      const end = Math.max(dragStartIndex, index);
      
      const newSelectedIds = selectableStudents
        .filter((_, i) => i >= start && i <= end)
        .map(s => s.id);
        
      setSelectedStudents(newSelectedIds);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragStartIndex(null);
    setDragCurrentIndex(null);
  };

  return (
    <div className="space-y-6 select-none" style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Student Interviews</h1>
        
        <button
          onClick={() => {
            if (selectedStudents.length === 0) {
              toast.error('Please select at least one student to assign');
              return;
            }
            setShowAssignModal(true);
          }}
          disabled={isLoading || selectedStudents.length === 0}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          <UserPlusIcon className="w-5 h-5 mr-2" />
          Assign to Class
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name} ({cls.currentOccupancy}/{cls.capacity})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All Statuses</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="assigned">Assigned</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Info message about drag selection */}
        <div className="px-4 py-3 bg-blue-50 text-blue-700 rounded-md text-sm">
          <p><strong>Tip:</strong> Click and drag across multiple rows to select students in bulk. Only students who have passed the interview and are not yet assigned to a class can be selected.</p>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white overflow-x-auto rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  <span>Student</span>
                  {sortField === 'name' && (
                    <ChevronDownIcon 
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
                    />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('interviewScore')}
              >
                <div className="flex items-center">
                  <span>Interview Score</span>
                  {sortField === 'interviewScore' && (
                    <ChevronDownIcon 
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
                    />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('mathScore')}
              >
                <div className="flex items-center">
                  <span>Math</span>
                  {sortField === 'mathScore' && (
                    <ChevronDownIcon 
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
                    />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('englishScore')}
              >
                <div className="flex items-center">
                  <span>English</span>
                  {sortField === 'englishScore' && (
                    <ChevronDownIcon 
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
                    />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('reasoningScore')}
              >
                <div className="flex items-center">
                  <span>Reasoning</span>
                  {sortField === 'reasoningScore' && (
                    <ChevronDownIcon 
                      className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} 
                    />
                  )}
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('totalScore')}
              >
                <div className="flex items-center">
                  <span>Total</span>
                  {sortField === 'totalScore' && (
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
                <div className="flex items-center">
                  <span>Class</span>
                </div>
              </th>
              <th 
                scope="col" 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <span>Status</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => {
                const isSelectable = student.status === 'passed' && student.currentClass === null;
                const isSelected = selectedStudents.includes(student.id);
                
                return (
                  <tr 
                    key={student.id} 
                    className={`${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${
                      isSelectable ? 'cursor-pointer' : ''
                    } select-none`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent text selection
                      if (isSelectable) handleDragStart(student.id, index);
                    }}
                    onMouseOver={(e) => {
                      e.preventDefault();
                      handleDragMove(index);
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      handleDragEnd();
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        disabled={!isSelectable}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900" style={nonSelectableStyle}>{student.name}</div>
                      <div className="text-sm text-gray-500" style={nonSelectableStyle}>Interview Date: {student.interviewDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span style={nonSelectableStyle}>{student.interviewScore}/20</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span style={nonSelectableStyle}>{student.mathScore}/20</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span style={nonSelectableStyle}>{student.englishScore}/20</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span style={nonSelectableStyle}>{student.reasoningScore}/20</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900" style={nonSelectableStyle}>{student.totalScore}/80</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.currentClass ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800" style={nonSelectableStyle}>
                          {student.currentClass}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500" style={nonSelectableStyle}>Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.status === 'passed' 
                          ? 'bg-blue-100 text-blue-800' 
                          : student.status === 'assigned' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                      }`} style={nonSelectableStyle}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Class Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl mx-auto p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Students to Class</h3>
            <p className="text-sm text-gray-500 mb-4">
              You're about to assign {selectedStudents.length} student{selectedStudents.length !== 1 && 's'} to a class.
            </p>
            
            <div className="mb-4">
              <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Class
              </label>
              <select
                id="class-select"
                value={classToAssign}
                onChange={(e) => setClassToAssign(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Select a class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name} ({cls.currentOccupancy}/{cls.capacity})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignClass}
                disabled={!classToAssign || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? 'Processing...' : (
                  <>
                    <CheckIcon className="w-5 h-5 mr-2" />
                    Confirm Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 