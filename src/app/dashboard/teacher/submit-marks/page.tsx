'use client'
import { useState, useEffect } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function SubmitMarks() {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [maxScore, setMaxScore] = useState(100); // Default max score is 100
  
  // Mock data that would come from backend
  useEffect(() => {
    // Simulate API fetch for teacher's assigned subjects
    setSubjects([
      { id: 'math', name: 'Mathematics' },
      { id: 'physics', name: 'Physics' },
      { id: 'chemistry', name: 'Chemistry' },
      { id: 'biology', name: 'Biology' },
    ]);
    
    // Simulate API fetch for classes assigned to this teacher
    setClasses([
      { id: 'form1', name: 'Form 1' },
      { id: 'form1south', name: 'Form 1 South' },
      { id: 'form1north', name: 'Form 1 North' },
      { id: 'form2', name: 'Form 2' },
    ]);
  }, []);
  
  // Exam types
  const examTypes = [
    { id: 'sequence1', name: 'Sequence 1' },
    { id: 'sequence2', name: 'Sequence 2' },
    { id: 'firstTerm', name: 'First Term Exam' },
    { id: 'sequence3', name: 'Sequence 3' },
    { id: 'sequence4', name: 'Sequence 4' },
    { id: 'secondTerm', name: 'Second Term Exam' },
    { id: 'sequence5', name: 'Sequence 5' },
    { id: 'sequence6', name: 'Sequence 6' },
    { id: 'thirdTerm', name: 'Third Term Exam' },
  ];
  
  // Fetch students when class and subject are selected
  useEffect(() => {
    if (selectedClass && selectedSubject && selectedExamType) {
      setLoading(true);
      
      // Simulate API call to get students and their existing marks
      setTimeout(() => {
        // This would be fetched from the backend
        const mockStudents = [
          { id: '001', name: 'Alice Johnson', existingMark: null },
          { id: '002', name: 'Bob Smith', existingMark: 72 },
          { id: '003', name: 'Charlie Brown', existingMark: 65 },
          { id: '004', name: 'Diana Prince', existingMark: 88 },
          { id: '005', name: 'Ethan Hunt', existingMark: null },
          { id: '006', name: 'Fiona Gallagher', existingMark: 79 },
          { id: '007', name: 'George Wilson', existingMark: 91 },
        ];
        
        setStudents(mockStudents);
        
        // Initialize marks state with existing marks
        const initialMarks = {};
        mockStudents.forEach(student => {
          initialMarks[student.id] = student.existingMark !== null ? student.existingMark.toString() : '';
        });
        
        setMarks(initialMarks);
        setLoading(false);
        
        // Simulate last update timestamp
        setLastUpdated(new Date(2025, 1, 15, 14, 35).toLocaleString());
        
        // Simulate fetching the max score for this exam
        // In a real app, this would come from the backend
        setMaxScore(100);
      }, 800);
    } else {
      setStudents([]);
      setMarks({});
    }
  }, [selectedClass, selectedSubject, selectedExamType]);
  
  const handleMarkChange = (studentId, value) => {
    // Validate input (only numbers between 0-maxScore)
    if (value === '' || (Number(value) >= 0 && Number(value) <= maxScore)) {
      setMarks({
        ...marks,
        [studentId]: value
      });
    }
  };
  
  const handleMaxScoreChange = (value) => {
    // Validate input (only positive numbers)
    if (value === '' || (Number(value) > 0 && Number(value) <= 1000)) {
      setMaxScore(value === '' ? 0 : Number(value));
    }
  };
  
  const validateMarks = () => {
    // Check if all marks are valid
    for (const studentId in marks) {
      const mark = marks[studentId];
      if (mark !== '' && (isNaN(Number(mark)) || Number(mark) < 0 || Number(mark) > maxScore)) {
        return false;
      }
    }
    return true;
  };
  
  const handleSaveMarks = () => {
    if (!validateMarks()) {
      setSaveStatus('error');
      return;
    }
    
    setSaveStatus('saving');
    
    // Simulate API call to save marks
    setTimeout(() => {
      // Format data for backend
      const marksData = {
        subjectId: selectedSubject,
        classId: selectedClass,
        examType: selectedExamType,
        maxScore: maxScore,
        marks: Object.entries(marks).map(([studentId, mark]) => ({
          studentId,
          mark: mark === '' ? null : Number(mark)
        })),
        timestamp: new Date().toISOString()
      };
      
      console.log('Sending to backend:', marksData);
      
      // Update success status (this would be based on backend response)
      setSaveStatus('success');
      setEditMode(false);
      setLastUpdated(new Date().toLocaleString());
      
      // Reset status after a few seconds
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1500);
  };
  
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <h1 className="text-2xl font-bold">Submit Marks</h1>
        
        {lastUpdated && selectedSubject && selectedClass && selectedExamType && !editMode && (
          <div className="text-sm text-gray-500 flex items-center gap-1 mt-2 md:mt-0">
            <span>Last updated: {lastUpdated}</span>
            <button 
              onClick={() => setEditMode(true)}
              className="text-blue-600 flex items-center gap-1 hover:text-blue-800"
            >
              <PencilIcon className="h-4 w-4" /> Edit
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <select 
            className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setEditMode(true);
            }}
            disabled={loading || (saveStatus === 'saving')}
          >
            <option value="">Select Subject</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
          <select 
            className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setEditMode(true);
            }}
            disabled={loading || (saveStatus === 'saving')}
          >
            <option value="">Select Class</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Type</label>
          <select 
            className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={selectedExamType}
            onChange={(e) => {
              setSelectedExamType(e.target.value);
              setEditMode(true);
            }}
            disabled={loading || (saveStatus === 'saving')}
          >
            <option value="">Select Exam Type</option>
            {examTypes.map(exam => (
              <option key={exam.id} value={exam.id}>{exam.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {selectedSubject && selectedClass && selectedExamType && students.length > 0 && !loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {subjects.find(s => s.id === selectedSubject)?.name} - {classes.find(c => c.id === selectedClass)?.name} - {examTypes.find(e => e.id === selectedExamType)?.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Enter marks for {students.length} students
                </p>
              </div>
              
              <div className="mt-3 md:mt-0 flex items-center">
                <label className="block text-sm font-medium text-gray-700 mr-2">
                  Maximum Score:
                </label>
                {editMode ? (
                  <input
                    type="number"
                    className="w-20 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={maxScore}
                    onChange={(e) => handleMaxScoreChange(e.target.value)}
                    min="1"
                    max="1000"
                    disabled={saveStatus === 'saving'}
                  />
                ) : (
                  <span className="text-sm font-medium">{maxScore}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marks (out of {maxScore})
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editMode ? (
                        <input
                          type="text"
                          className={`w-20 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                            marks[student.id] !== '' && 
                            (isNaN(Number(marks[student.id])) || Number(marks[student.id]) < 0 || Number(marks[student.id]) > maxScore) 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                          value={marks[student.id]}
                          onChange={(e) => handleMarkChange(student.id, e.target.value)}
                          placeholder={`0-${maxScore}`}
                          disabled={saveStatus === 'saving'}
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {marks[student.id] === '' ? '-' : marks[student.id]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {student.existingMark !== null ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Recorded
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {editMode && (
            <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                {saveStatus === 'error' && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    Please check all marks are between 0-{maxScore}
                  </p>
                )}
                {saveStatus === 'success' && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircleIcon className="h-5 w-5" />
                    Marks saved successfully
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    // Reset to last saved marks
                    const initialMarks = {};
                    students.forEach(student => {
                      initialMarks[student.id] = student.existingMark !== null ? student.existingMark.toString() : '';
                    });
                    setMarks(initialMarks);
                    setEditMode(false);
                    setSaveStatus(null);
                  }}
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    saveStatus === 'saving' ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                  onClick={handleSaveMarks}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Marks'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {selectedSubject && selectedClass && selectedExamType && students.length === 0 && !loading && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                No students found for this class and subject combination. Please check your selection or contact the administrator.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}