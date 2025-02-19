'use client'
import { useState, useEffect } from 'react';
import { AcademicCapIcon, ChartBarIcon, UserGroupIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  
  // Mock data for development
  const mockSubjects = [
    {
      id: 1,
      name: 'Mathematics',
      classes: [
        { id: 1, name: 'Form 1 South', students: 45, avgScore: 72 },
        { id: 2, name: 'Form 1 North', students: 42, avgScore: 68 }
      ],
      totalStudents: 87,
      overallAvgScore: 70,
      examCount: 5,
      pendingGrades: 0
    },
    {
      id: 2,
      name: 'Physics',
      classes: [
        { id: 3, name: 'Form 2', students: 38, avgScore: 65 },
        { id: 4, name: 'Form 3', students: 36, avgScore: 70 }
      ],
      totalStudents: 74,
      overallAvgScore: 67.5,
      examCount: 3,
      pendingGrades: 1
    },
    {
      id: 3,
      name: 'English Literature',
      classes: [
        { id: 5, name: 'Form 1', students: 90, avgScore: 75 }
      ],
      totalStudents: 90,
      overallAvgScore: 75,
      examCount: 4,
      pendingGrades: 0
    }
  ];

  // Simulate fetching subjects from API
  useEffect(() => {
    const fetchSubjects = async () => {
      // This would be a real API call in production
      // const response = await fetch('/api/teacher/subjects');
      // const data = await response.json();
      
      // Using mock data for now
      setTimeout(() => {
        setSubjects(mockSubjects);
        setLoading(false);
      }, 800);
    };
    
    fetchSubjects();
  }, []);

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
  };

  const SubjectDetailModal = ({ subject, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{subject.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex border-b mb-6">
            <button
              className={`px-4 py-2 ${activeTab === 'overview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'classes' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('classes')}
            >
              Classes
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'exams' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setActiveTab('exams')}
            >
              Exams
            </button>
          </div>
          
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Subject Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Students:</span>
                    <span className="font-medium">{subject.totalStudents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overall Average Score:</span>
                    <span className="font-medium">{subject.overallAvgScore}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Classes Teaching:</span>
                    <span className="font-medium">{subject.classes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Exams Created:</span>
                    <span className="font-medium">{subject.examCount}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Action Items</h3>
                {subject.pendingGrades > 0 ? (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                    <p className="text-yellow-800">
                      You have {subject.pendingGrades} pending grade submissions
                    </p>
                    <button className="mt-2 text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">
                      Submit Grades
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                    <p className="text-green-800">All grades are up to date!</p>
                  </div>
                )}
                <div className="flex flex-col space-y-2 mt-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Create New Exam
                  </button>
                  <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                    Manage Question Bank
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'classes' && (
            <div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subject.classes.map(cls => (
                    <tr key={cls.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{cls.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{cls.students}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{cls.avgScore}%</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-blue-600 hover:text-blue-800 mr-3">
                          View Students
                        </button>
                        <button className="text-blue-600 hover:text-blue-800">
                          Submit Marks
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {activeTab === 'exams' && (
            <div>
              <p className="text-gray-500 mb-4">Recent and upcoming exams for this subject</p>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{subject.name} {i === 1 ? 'Mid-Term' : i === 2 ? 'Quiz' : 'Final'} Exam</h4>
                      <p className="text-sm text-gray-500">
                        {i === 1 ? 'Completed' : i === 2 ? 'Upcoming: Mar 15, 2025' : 'Draft'}
                      </p>
                    </div>
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                      {i === 1 ? 'View Results' : i === 2 ? 'Edit Exam' : 'Continue Draft'}
                    </button>
                  </div>
                ))}
              </div>
              
              <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create New Exam
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Subjects</h1>
      
      <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 min-w-[250px]">
          <div className="flex items-center mb-2">
            <AcademicCapIcon className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="font-medium">Total Subjects</h3>
          </div>
          <p className="text-3xl font-bold">{subjects.length}</p>
        </div>
        
        <div className="bg-green-50 border border-green-100 rounded-lg p-4 min-w-[250px]">
          <div className="flex items-center mb-2">
            <UserGroupIcon className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="font-medium">Total Students</h3>
          </div>
          <p className="text-3xl font-bold">
            {subjects.reduce((total, subject) => total + subject.totalStudents, 0)}
          </p>
        </div>
        
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 min-w-[250px]">
          <div className="flex items-center mb-2">
            <ClipboardDocumentListIcon className="w-6 h-6 text-amber-600 mr-2" />
            <h3 className="font-medium">Pending Grades</h3>
          </div>
          <p className="text-3xl font-bold">
            {subjects.reduce((total, subject) => total + subject.pendingGrades, 0)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : subjects.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <AcademicCapIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No subjects assigned yet</h3>
          <p className="text-gray-500">Subjects will appear here once they're assigned to you</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <div 
              key={subject.id} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSubjectClick(subject)}
            >
              <div className="flex items-center mb-3">
                <AcademicCapIcon className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold">{subject.name}</h3>
              </div>
              
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Classes:</span>
                  <span className="font-medium">
                    {subject.classes.map(c => c.name).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Students:</span>
                  <span className="font-medium">{subject.totalStudents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Score:</span>
                  <span className="font-medium">{subject.overallAvgScore}%</span>
                </div>
              </div>
              
              {subject.pendingGrades > 0 && (
                <div className="mt-3 py-1 px-2 bg-yellow-100 text-yellow-800 text-sm rounded inline-block">
                  {subject.pendingGrades} pending grades
                </div>
              )}
              
              <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
      
      {selectedSubject && (
        <SubjectDetailModal 
          subject={selectedSubject} 
          onClose={() => setSelectedSubject(null)} 
        />
      )}
    </div>
  );
}