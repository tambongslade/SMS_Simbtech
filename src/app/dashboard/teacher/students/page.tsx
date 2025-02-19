'use client'
import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [subClasses, setSubClasses] = useState([]);

  // Simulated data - in real app, this would come from an API
  const classOptions = [
    'All Classes',
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4',
    'Form 5',
    'Lowersixth',
    'Upper-sixth'
  ];

  // Mock data to simulate backend response
  const mockStudentData = [
    { id: 1, name: 'Alice Johnson', class: 'Form 1', subClass: 'Form 1 South', performance: 85, attendance: 92, lastAttendance: 'Present' },
    { id: 2, name: 'Bob Smith', class: 'Form 1', subClass: 'Form 1 North', performance: 72, attendance: 85, lastAttendance: 'Absent' },
    { id: 3, name: 'Charlie Brown', class: 'Form 2', subClass: 'Form 2 South', performance: 91, attendance: 98, lastAttendance: 'Present' },
    { id: 4, name: 'Diana Ross', class: 'Form 2', subClass: 'Form 2 North', performance: 65, attendance: 78, lastAttendance: 'Late' },
    { id: 5, name: 'Edward Miller', class: 'Form 1', subClass: 'Form 1 South', performance: 79, attendance: 88, lastAttendance: 'Present' },
    { id: 6, name: 'Fiona Lee', class: 'Form 3', subClass: 'Form 3 East', performance: 95, attendance: 97, lastAttendance: 'Present' },
    { id: 7, name: 'George Wilson', class: 'Form 1', subClass: 'Form 1 North', performance: 68, attendance: 75, lastAttendance: 'Late' },
    { id: 8, name: 'Hannah Moore', class: 'Form 2', subClass: 'Form 2 South', performance: 88, attendance: 94, lastAttendance: 'Present' },
  ];

  useEffect(() => {
    // Simulate fetching data from API
    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        // const response = await fetch('/api/students');
        // const data = await response.json();
        
        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setStudents(mockStudentData);
        
        // Extract unique subclasses when class is selected
        if (selectedClass !== 'All Classes') {
          const filteredSubClasses = [...new Set(
            mockStudentData
              .filter(student => student.class === selectedClass)
              .map(student => student.subClass)
          )];
          setSubClasses(filteredSubClasses);
        } else {
          setSubClasses([]);
        }
        
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass]);

  // Sort function for table columns
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted and filtered students
  const getSortedStudents = () => {
    const filteredStudents = students.filter(student => {
      // Filter by search term
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by class
      const matchesClass = selectedClass === 'All Classes' || student.class === selectedClass;
      
      return matchesSearch && matchesClass;
    });

    // Sort filtered students
    return [...filteredStudents].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Helper function to render performance indicator
  const renderPerformanceIndicator = (performance) => {
    if (performance >= 85) return <span className="text-green-600 font-medium">Excellent</span>;
    if (performance >= 70) return <span className="text-blue-600 font-medium">Good</span>;
    if (performance >= 50) return <span className="text-yellow-600 font-medium">Average</span>;
    return <span className="text-red-600 font-medium">Needs Improvement</span>;
  };

  // Helper function to render attendance status
  const renderAttendanceStatus = (status) => {
    switch(status) {
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
  const renderSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <ChevronUpIcon className="w-4 h-4 opacity-20" />;
    }
    
    return sortConfig.direction === 'ascending' 
      ? <ChevronUpIcon className="w-4 h-4" />
      : <ChevronDownIcon className="w-4 h-4" />;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Student Management</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search students by name..."
            className="w-full p-2 pl-10 border rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        </div>
        
        <div className="flex gap-2">
          <select 
            className="p-2 border rounded-lg bg-white"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          
          {subClasses.length > 0 && (
            <select className="p-2 border rounded-lg bg-white">
              <option value="">All Sub-classes</option>
              {subClasses.map(subClass => (
                <option key={subClass} value={subClass}>{subClass}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
          <p className="text-2xl font-bold">{getSortedStudents().length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Average Performance</h3>
          <p className="text-2xl font-bold">
            {getSortedStudents().length > 0 
              ? `${(getSortedStudents().reduce((sum, student) => sum + student.performance, 0) / getSortedStudents().length).toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Average Attendance</h3>
          <p className="text-2xl font-bold">
            {getSortedStudents().length > 0 
              ? `${(getSortedStudents().reduce((sum, student) => sum + student.attendance, 0) / getSortedStudents().length).toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Main Student Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-600">{error}</div>
        ) : getSortedStudents().length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {searchTerm ? 'No students found matching your search.' : 'No students available for this class.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => requestSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {renderSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => requestSort('subClass')}
                  >
                    <div className="flex items-center">
                      Class/Section
                      {renderSortIcon('subClass')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => requestSort('performance')}
                  >
                    <div className="flex items-center">
                      Performance
                      {renderSortIcon('performance')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    onClick={() => requestSort('attendance')}
                  >
                    <div className="flex items-center">
                      Attendance
                      {renderSortIcon('attendance')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center">Actions</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getSortedStudents().map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">Student ID: {student.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.subClass}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">{student.performance}%</span>
                        {renderPerformanceIndicator(student.performance)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900">{student.attendance}%</span>
                        <span className="text-sm text-gray-500">Last: {renderAttendanceStatus(student.lastAttendance)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => alert(`View details for ${student.name}`)}
                        >
                          View Details
                        </button>
                        <button
                          className="text-indigo-600 hover:text-indigo-800"
                          onClick={() => alert(`Add marks for ${student.name}`)}
                        >
                          Add Marks
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!isLoading && !error && getSortedStudents().length > 0 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
            Showing {getSortedStudents().length} out of {students.length} students
          </div>
        )}
      </div>
    </div>
  );
}