'use client'
import { useState, useEffect } from 'react';
import { PlusIcon, DocumentIcon, ClockIcon, PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function Exams() {
  const [exams, setExams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Mock data for development
  const mockExams = [
    {
      id: 1,
      title: 'Mathematics Mid-Term',
      class: 'Form 1 South',
      subject: 'Mathematics',
      duration: '2 hours',
      totalQuestions: 50,
      maxScore: 100,
      date: '2025-03-10',
      status: 'Upcoming'
    },
    {
      id: 2,
      title: 'Physics Final Exam',
      class: 'Form 1 North',
      subject: 'Physics',
      duration: '3 hours',
      totalQuestions: 75,
      maxScore: 150,
      date: '2025-04-15',
      status: 'Draft'
    },
    {
      id: 3,
      title: 'Chemistry Lab Test',
      class: 'Form 2',
      subject: 'Chemistry',
      duration: '1.5 hours',
      totalQuestions: 30,
      maxScore: 60,
      date: '2025-03-05',
      status: 'Completed'
    }
  ];

  // Simulate fetching exams from API
  useEffect(() => {
    const fetchExams = async () => {
      // This would be a real API call in production
      // const response = await fetch('/api/exams');
      // const data = await response.json();
      
      // Using mock data for now
      setTimeout(() => {
        setExams(mockExams);
        setLoading(false);
      }, 800);
    };
    
    fetchExams();
  }, []);

  // Form state for creating new exam
  const [newExam, setNewExam] = useState({
    title: '',
    class: '',
    subject: '',
    duration: '',
    totalQuestions: '',
    maxScore: '',
    date: '',
    questionType: 'mcq',
    topics: []
  });

  const handleCreateExam = (e) => {
    e.preventDefault();
    // In production, this would be an API call
    // await fetch('/api/exams', { method: 'POST', body: JSON.stringify(newExam) });
    
    const createdExam = {
      ...newExam,
      id: exams.length + 1,
      status: 'Draft'
    };
    
    setExams([...exams, createdExam]);
    setShowCreateModal(false);
    setNewExam({
      title: '',
      class: '',
      subject: '',
      duration: '',
      totalQuestions: '',
      maxScore: '',
      date: '',
      questionType: 'mcq',
      topics: []
    });
  };

  const handleDeleteExam = (id) => {
    // In production, this would be an API call
    // await fetch(`/api/exams/${id}`, { method: 'DELETE' });
    setExams(exams.filter(exam => exam.id !== id));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Mock class and subject data
  const classes = ['Form 1', 'Form 1 South', 'Form 1 North', 'Form 2', 'Form 3'];
  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Exams</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Create New Exam
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <DocumentIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No exams created yet</h3>
          <p className="text-gray-500 mb-4">Start by creating your first exam paper</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create New Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map(exam => (
            <div key={exam.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DocumentIcon className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold">{exam.title}</h3>
                    <p className="text-gray-600">{exam.class}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                  {exam.status}
                </span>
              </div>
              
              <div className="space-y-2 text-gray-600">
                <div className="flex items-center">
                  <ClockIcon className="w-5 h-5 mr-2" />
                  <span>Duration: {exam.duration}</span>
                </div>
                <p>Total Questions: {exam.totalQuestions}</p>
                <p>Max Score: {exam.maxScore}</p>
                <p>Exam Date: {new Date(exam.date).toLocaleDateString()}</p>
                <p>Subject: {exam.subject}</p>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 flex justify-center items-center bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <PencilIcon className="w-4 h-4 mr-1" /> Edit
                </button>
                <button className="flex-1 py-2 flex justify-center items-center bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <EyeIcon className="w-4 h-4 mr-1" /> Preview
                </button>
                <button 
                  onClick={() => handleDeleteExam(exam.id)}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Exam</h2>
            
            <form onSubmit={handleCreateExam}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newExam.title}
                    onChange={(e) => setNewExam({...newExam, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newExam.subject}
                    onChange={(e) => setNewExam({...newExam, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                  <select
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newExam.class}
                    onChange={(e) => setNewExam({...newExam, class: e.target.value})}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newExam.date}
                    onChange={(e) => setNewExam({...newExam, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 2 hours"
                    className="w-full p-2 border rounded-lg"
                    value={newExam.duration}
                    onChange={(e) => setNewExam({...newExam, duration: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newExam.totalQuestions}
                    onChange={(e) => setNewExam({...newExam, totalQuestions: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Score</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded-lg"
                    value={newExam.maxScore}
                    onChange={(e) => setNewExam({...newExam, maxScore: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={newExam.questionType}
                    onChange={(e) => setNewExam({...newExam, questionType: e.target.value})}
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="structural">Structural (Long/Short Answers)</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
              
              <h3 className="font-medium mb-2">Question Sources</h3>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="useGCE"
                  className="mr-2"
                />
                <label htmlFor="useGCE">Include GCE Questions</label>
                
                <input
                  type="checkbox"
                  id="useSchool"
                  className="ml-4 mr-2"
                />
                <label htmlFor="useSchool">Include School Questions</label>
                
                <input
                  type="checkbox"
                  id="randomize"
                  className="ml-4 mr-2"
                />
                <label htmlFor="randomize">Randomize Questions</label>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}