'use client'
import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, DocumentDuplicateIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

export default function QuestionManagement() {
  // State management
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    subject: '',
    type: '',
    category: '',
    searchTerm: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Mock data for subjects
  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 
    'English', 'French', 'History', 'Geography'
  ];

  // Mock question data
  const mockQuestions = [
    {
      id: 1,
      text: "What is the formula for the area of a circle?",
      type: "MCQ",
      subject: "Mathematics",
      category: "School Questions",
      options: [
        { id: 'a', text: "πr²", isCorrect: true },
        { id: 'b', text: "2πr", isCorrect: false },
        { id: 'c', text: "πd", isCorrect: false },
        { id: 'd', text: "r²/π", isCorrect: false }
      ],
      difficulty: "Easy",
      lastModified: "2025-01-15"
    },
    {
      id: 2,
      text: "Explain Newton's Second Law of Motion and provide an example.",
      type: "Structural",
      subject: "Physics",
      category: "GCE Questions",
      answer: "Newton's Second Law states that the acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass. Example: When you push a shopping cart, the acceleration is greater with more force and less with a heavier cart.",
      difficulty: "Medium",
      lastModified: "2025-01-20"
    },
    {
      id: 3,
      text: "Which of the following is not a primary color in the RGB color model?",
      type: "MCQ",
      subject: "Physics",
      category: "School Questions",
      options: [
        { id: 'a', text: "Red", isCorrect: false },
        { id: 'b', text: "Green", isCorrect: false },
        { id: 'c', text: "Yellow", isCorrect: true },
        { id: 'd', text: "Blue", isCorrect: false }
      ],
      difficulty: "Easy",
      lastModified: "2025-01-25"
    },
    {
      id: 4,
      text: "Solve the quadratic equation: 2x² + 5x - 3 = 0",
      type: "Structural",
      subject: "Mathematics",
      category: "GCE Questions",
      answer: "Using the quadratic formula: x = (-5 ± √(25 + 24))/4 = (-5 ± √49)/4 = (-5 ± 7)/4\nThus, x = 1/2 or x = -3",
      difficulty: "Medium",
      lastModified: "2025-02-01"
    },
    {
      id: 5,
      text: "What is the main function of mitochondria in a cell?",
      type: "MCQ",
      subject: "Biology",
      category: "School Questions",
      options: [
        { id: 'a', text: "Protein synthesis", isCorrect: false },
        { id: 'b', text: "Energy production", isCorrect: true },
        { id: 'c', text: "Cell division", isCorrect: false },
        { id: 'd', text: "Storage", isCorrect: false }
      ],
      difficulty: "Medium",
      lastModified: "2025-02-05"
    }
  ];

  // Fetch questions (simulated)
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        setQuestions(mockQuestions);
      } catch (err) {
        console.error('Error fetching questions:', err);
        setError('Failed to load questions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Filter questions based on criteria
  const filteredQuestions = questions.filter(question => {
    const matchesSubject = !filters.subject || question.subject === filters.subject;
    const matchesType = !filters.type || question.type === filters.type;
    const matchesCategory = !filters.category || question.category === filters.category;
    const matchesSearch = !filters.searchTerm || 
      question.text.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    return matchesSubject && matchesType && matchesCategory && matchesSearch;
  });

  // Handle question actions
  const handleEdit = (question) => {
    setSelectedQuestion(question);
    setIsEditMode(true);
    setShowAddModal(true);
  };

  const handleDelete = (question) => {
    setSelectedQuestion(question);
    setShowConfirmDelete(true);
  };

  const confirmDelete = () => {
    // API call
    setQuestions(prev => prev.filter(q => q.id !== selectedQuestion.id));
    setShowConfirmDelete(false);
  };

  const handleDuplicate = (question) => {
    const newQuestion = {
      ...question,
      id: Math.max(...questions.map(q => q.id)) + 1,
      text: `Copy of ${question.text}`,
      lastModified: new Date().toISOString().split('T')[0]
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  // Mock function to add/edit a question
  const handleSaveQuestion = (formData) => {
    //  API call in a real app
    if (isEditMode) {
      setQuestions(prev => prev.map(q => 
        q.id === selectedQuestion.id ? { ...formData, id: q.id } : q
      ));
    } else {
      const newQuestion = {
        ...formData,
        id: Math.max(...questions.map(q => q.id), 0) + 1,
        lastModified: new Date().toISOString().split('T')[0]
      };
      setQuestions(prev => [...prev, newQuestion]);
    }
    setShowAddModal(false);
  };

  // Question form modal component
  const QuestionFormModal = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">
          {isEditMode ? 'Edit Question' : 'Add New Question'}
        </h2>
        
        {/* This would be a form in the real implementation */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
            <select className="w-full p-2 border rounded-lg">
              <option>MCQ</option>
              <option>Structural</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select className="w-full p-2 border rounded-lg">
              {subjects.map(subject => (
                <option key={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="w-full p-2 border rounded-lg">
              <option>School Questions</option>
              <option>GCE Questions</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
            <textarea 
              className="w-full p-2 border rounded-lg"
              rows={4}
              defaultValue={selectedQuestion?.text || ''}
            />
          </div>
          
          {/* Conditionally show options for MCQ or answer field for structural */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditMode && selectedQuestion?.type === 'MCQ' ? 'Options' : 'Answer/Options'}
            </label>
            {isEditMode && selectedQuestion?.type === 'MCQ' ? (
              <div className="space-y-2">
                {selectedQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center">
                    <input 
                      type="radio" 
                      checked={option.isCorrect}
                      className="mr-2"
                      readOnly 
                    />
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded-lg"
                      defaultValue={option.text}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea 
                className="w-full p-2 border rounded-lg"
                rows={4}
                defaultValue={selectedQuestion?.answer || ''}
              />
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            onClick={() => {
              setShowAddModal(false);
              setIsEditMode(false);
            }}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => handleSaveQuestion(selectedQuestion || {})}
          >
            Save Question
          </button>
        </div>
      </div>
    </div>
  );

  // Confirmation modal component
  const ConfirmDeleteModal = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <ExclamationCircleIcon className="w-6 h-6 text-red-600 mr-2" />
          <h2 className="text-xl font-bold">Delete Question</h2>
        </div>
        
        <p className="mb-4">Are you sure you want to delete this question? This action cannot be undone.</p>
        
        <div className="flex justify-end space-x-2">
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            onClick={() => setShowConfirmDelete(false)}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            onClick={confirmDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Question Management</h1>
        <button 
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => {
            setSelectedQuestion(null);
            setIsEditMode(false);
            setShowAddModal(true);
          }}
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add New Question
        </button>
      </div>

      {/* Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Questions</h3>
          <p className="text-2xl font-bold">{questions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">MCQ Questions</h3>
          <p className="text-2xl font-bold">{questions.filter(q => q.type === 'MCQ').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Structural Questions</h3>
          <p className="text-2xl font-bold">{questions.filter(q => q.type === 'Structural').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">GCE Questions</h3>
          <p className="text-2xl font-bold">{questions.filter(q => q.category === 'GCE Questions').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search questions..."
            className="w-full p-2 pl-8 border rounded-lg"
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>

        <select 
          className="p-2 border rounded-lg"
          value={filters.subject}
          onChange={(e) => handleFilterChange('subject', e.target.value)}
        >
          <option value="">All Subjects</option>
          {subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
         
        <select 
          className="p-2 border rounded-lg"
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
        >
          <option value="">All Question Types</option>
          <option value="MCQ">MCQ</option>
          <option value="Structural">Structural</option>
        </select>
         
        <select 
          className="p-2 border rounded-lg"
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="GCE Questions">GCE Questions</option>
          <option value="School Questions">School Questions</option>
        </select>
      </div>

      {/* Question table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : error ? (
          <div className="text-center p-8 text-red-600">{error}</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {filters.subject || filters.type || filters.category || filters.searchTerm
              ? 'No questions match your filters.'
              : 'No questions available. Add your first question!'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Modified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuestions.map((question) => (
                  <tr key={question.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {question.text.length > 100 
                          ? `${question.text.substring(0, 100)}...` 
                          : question.text}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        question.type === 'MCQ' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {question.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {question.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {question.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {question.lastModified}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => handleEdit(question)}
                          title="Edit"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleDuplicate(question)}
                          title="Duplicate"
                        >
                          <DocumentDuplicateIcon className="w-5 h-5" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDelete(question)}
                          title="Delete"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !error && filteredQuestions.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 flex justify-between items-center">
            <div>
              Showing {filteredQuestions.length} out of {questions.length} questions
            </div>
            <button 
              className="flex items-center text-blue-600 hover:text-blue-800"
              onClick={() => {/* Would refresh data */}}
            >
              <ArrowPathIcon className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <QuestionFormModal />}
      {showConfirmDelete && <ConfirmDeleteModal />}
    </div>
  );
}