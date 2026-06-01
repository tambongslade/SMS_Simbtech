'use client'
import { useState, useEffect } from 'react';
import { PlusIcon, DocumentIcon, ClockIcon, PencilIcon, EyeIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';

interface ExamPaper {
    id: number;
    name: string;
    subjectId: number;
    examDate: string;
    duration: number;
    academicYearId: number;
    subject: {
        id: number;
        name: string;
        category: string;
    };
    questions?: Question[];
    createdAt: string;
}

interface Question {
    id: number;
    questionText: string;
    questionType: 'multiple_choice' | 'essay' | 'short_answer' | 'true_false' | 'fill_in_blank';
    marks: number;
    options?: string[];
    correctAnswer?: string;
    expectedLength?: number;
}

interface Subject {
    id: number;
    name: string;
    category: string;
    subClasses: {
        id: number;
        name: string;
        className: string;
    }[];
}

interface CreateExamPaper {
    name: string;
    subjectId: number;
    examDate: string;
    duration: number;
    academicYearId?: number;
}

interface CreateQuestion {
    questionText: string;
    questionType: 'multiple_choice' | 'essay' | 'short_answer' | 'true_false' | 'fill_in_blank';
    marks: number;
    options?: string[];
    correctAnswer?: string;
    expectedLength?: number;
}

export default function Exams() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [selectedExamPaper, setSelectedExamPaper] = useState<ExamPaper | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch exam papers with optional subject filtering
    const {
        data: examPapersData,
        error: examPapersError,
        isLoading: examPapersLoading,
        mutate: mutateExamPapers
    } = useSWR<{ success: boolean; data: ExamPaper[] }>(
        selectedSubject
            ? `/exams/papers?subjectId=${selectedSubject}&includeSubject=true`
            : '/exams/papers?includeSubject=true',
        (url: string) => apiService.get(url)
    );

    // Fetch teacher's subjects
    const {
        data: subjectsData,
        error: subjectsError
    } = useSWR<{ success: boolean; data: Subject[] }>(
        '/teachers/me/subjects',
        (url: string) => apiService.get(url)
    );

    // Fetch questions for selected exam paper
    const {
        data: questionsData,
        error: questionsError,
        isLoading: questionsLoading,
        mutate: mutateQuestions
    } = useSWR<{ success: boolean; data: ExamPaper }>(
        selectedExamPaper ? `/exams/papers/${selectedExamPaper.id}/with-questions` : null,
        (url: string) => apiService.get(url)
    );

    const examPapers = examPapersData?.data || [];
    const subjects = subjectsData?.data || [];
    const examPaperQuestions = questionsData?.data?.questions || [];

    // Enhanced error handling
    useEffect(() => {
        if (examPapersError) {
            console.error("Exam Papers Fetch Error:", examPapersError);
            if (examPapersError.status === 403) {
                toast.error('Access denied: Unable to load exam papers');
            } else {
                toast.error('Failed to load exam papers');
            }
        }
        if (subjectsError) {
            console.error("Subjects Fetch Error:", subjectsError);
            if (subjectsError.status === 403) {
                toast.error('Access denied: Unable to load your assigned subjects');
            } else {
                toast.error('Failed to load subjects');
            }
        }
        if (questionsError) {
            console.error("Questions Fetch Error:", questionsError);
            toast.error('Failed to load exam questions');
        }
    }, [examPapersError, subjectsError, questionsError]);

    // Form state for creating new exam paper
    const [newExamPaper, setNewExamPaper] = useState<CreateExamPaper>({
        name: '',
        subjectId: 0,
        examDate: '',
        duration: 120
    });

    // Form state for adding questions
    const [newQuestion, setNewQuestion] = useState<CreateQuestion>({
        questionText: '',
        questionType: 'multiple_choice',
        marks: 5,
        options: ['', '', '', ''],
        correctAnswer: '',
        expectedLength: 200
    });

    const handleCreateExamPaper = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newExamPaper.name || !newExamPaper.subjectId || !newExamPaper.examDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await apiService.post('/exams/papers', newExamPaper);
            toast.success('Exam paper created successfully');

            // Reset form
            setNewExamPaper({
                name: '',
                subjectId: 0,
                examDate: '',
                duration: 120
            });

            setShowCreateModal(false);
            mutateExamPapers();
        } catch (error: any) {
            console.error('Error creating exam paper:', error);
            if (error?.status === 403) {
                toast.error('Access denied: You cannot create exam papers for this subject');
            } else {
                toast.error('Failed to create exam paper: ' + (error?.message || 'Unknown error'));
            }
        }
    };

    const handleDeleteExamPaper = async (paperId: number) => {
        if (!confirm('Are you sure you want to delete this exam paper?')) return;

        try {
            await apiService.delete(`/exams/papers/${paperId}`);
            toast.success('Exam paper deleted successfully');
            mutateExamPapers();
        } catch (error) {
            console.error('Error deleting exam paper:', error);
            toast.error('Failed to delete exam paper');
        }
    };

    const handleViewQuestions = (examPaper: ExamPaper) => {
        setSelectedExamPaper(examPaper);
        setShowQuestionsModal(true);
    };

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedExamPaper || !newQuestion.questionText.trim()) {
            toast.error('Please provide question text');
            return;
        }

        try {
            const questionData = { ...newQuestion };

            // Clean up data based on question type
            if (questionData.questionType !== 'multiple_choice') {
                delete questionData.options;
                delete questionData.correctAnswer;
            }
            if (questionData.questionType !== 'essay') {
                delete questionData.expectedLength;
            }

            await apiService.post(`/exams/papers/${selectedExamPaper.id}/questions`, {
                questions: [questionData]
            });

            toast.success('Question added successfully');

            // Reset form
            setNewQuestion({
                questionText: '',
                questionType: 'multiple_choice',
                marks: 5,
                options: ['', '', '', ''],
                correctAnswer: '',
                expectedLength: 200
            });

            setShowAddQuestionModal(false);
            mutateQuestions(); // Refresh questions
        } catch (error: any) {
            console.error('Error adding question:', error);
            toast.error('Failed to add question: ' + (error?.message || 'Unknown error'));
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-GB');
    };

    const getTotalMarks = (questions: Question[]) => {
        return questions.reduce((total, q) => total + q.marks, 0);
    };

    const questionTypes = [
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'essay', label: 'Essay' },
        { value: 'short_answer', label: 'Short Answer' },
        { value: 'true_false', label: 'True/False' },
        { value: 'fill_in_blank', label: 'Fill in the Blank' }
    ];

    if (!isMounted) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Exam Papers Management</h1>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center opacity-50 cursor-not-allowed">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Exam Paper
                    </div>
                </div>
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading exam papers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Exam Papers Management</h1>
                    <p className="text-gray-600">Create and manage your exam papers and questions</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Exam Paper
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Total Exam Papers</h3>
                    <p className="text-2xl font-bold">{examPapersLoading ? '...' : examPapers.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Assigned Subjects</h3>
                    <p className="text-2xl font-bold">{subjects.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">This Week's Exams</h3>
                    <p className="text-2xl font-bold text-blue-600">
                        {examPapers.filter(paper => {
                            const examDate = new Date(paper.examDate);
                            const now = new Date();
                            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                            return examDate >= now && examDate <= weekFromNow;
                        }).length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500">Average Duration</h3>
                    <p className="text-2xl font-bold text-green-600">
                        {examPapers.length > 0
                            ? Math.round(examPapers.reduce((sum, p) => sum + p.duration, 0) / examPapers.length)
                            : 0} mins
                    </p>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Filter by Subject:</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Subjects</option>
                        {subjects.map(subject => (
                            <option key={subject.id} value={subject.id.toString()}>
                                {subject.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Exam Papers Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Your Exam Papers</h2>
                </div>

                {examPapersLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading exam papers...</p>
                    </div>
                ) : examPapers.length === 0 ? (
                    <div className="text-center py-8">
                        <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No exam papers found</p>
                        <p className="text-sm text-gray-500">Create your first exam paper by clicking the "Create Exam Paper" button</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Exam Paper
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subject
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Exam Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Duration
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Questions
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {examPapers.map((paper) => (
                                    <tr key={paper.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{paper.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{paper.subject?.name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{paper.subject?.category || 'Uncategorized'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formatDateTime(paper.examDate)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{paper.duration} mins</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {paper.questions ? paper.questions.length : 'Not loaded'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formatDate(paper.createdAt)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleViewQuestions(paper)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View/Add Questions"
                                                >
                                                    <QuestionMarkCircleIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="text-green-600 hover:text-green-900"
                                                    title="Edit"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteExamPaper(paper.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Exam Paper Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Create New Exam Paper</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateExamPaper} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Exam Paper Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newExamPaper.name}
                                    onChange={(e) => setNewExamPaper({ ...newExamPaper, name: e.target.value })}
                                    placeholder="e.g., Mathematics Mid-term Exam"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject *
                                    </label>
                                    <select
                                        required
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={newExamPaper.subjectId}
                                        onChange={(e) => setNewExamPaper({ ...newExamPaper, subjectId: Number(e.target.value) })}
                                    >
                                        <option value={0}>Select Subject</option>
                                        {subjects.map(subject => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name} ({subject.category})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Duration (minutes) *
                                    </label>
                                    <input
                                        type="number"
                                        min="30"
                                        max="300"
                                        required
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={newExamPaper.duration}
                                        onChange={(e) => setNewExamPaper({ ...newExamPaper, duration: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Exam Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newExamPaper.examDate}
                                    onChange={(e) => setNewExamPaper({ ...newExamPaper, examDate: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Create Exam Paper
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Questions Modal */}
            {showQuestionsModal && selectedExamPaper && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-xl font-bold">Questions for {selectedExamPaper.name}</h2>
                                <p className="text-gray-600">{selectedExamPaper.subject?.name}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setShowAddQuestionModal(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                                >
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Add Question
                                </button>
                                <button
                                    onClick={() => setShowQuestionsModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {questionsLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading questions...</p>
                            </div>
                        ) : examPaperQuestions.length === 0 ? (
                            <div className="text-center py-8">
                                <QuestionMarkCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600">No questions added yet</p>
                                <p className="text-sm text-gray-500">Add your first question by clicking the "Add Question" button</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                                    <span className="font-medium">Total Questions: {examPaperQuestions.length}</span>
                                    <span className="font-medium">Total Marks: {getTotalMarks(examPaperQuestions)}</span>
                                </div>

                                {examPaperQuestions.map((question, index) => (
                                    <div key={question.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium">Question {index + 1}</h4>
                                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                {question.marks} marks
                                            </span>
                                        </div>
                                        <p className="text-gray-800 mb-2">{question.questionText}</p>

                                        {question.questionType === 'multiple_choice' && question.options && (
                                            <div className="space-y-1">
                                                {question.options.map((option, optIndex) => (
                                                    <div key={optIndex} className={`text-sm ${option === question.correctAnswer ? 'font-bold text-green-600' : 'text-gray-600'}`}>
                                                        {String.fromCharCode(65 + optIndex)}. {option}
                                                        {option === question.correctAnswer && ' (Correct)'}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-2 text-xs text-gray-500">
                                            Type: {questionTypes.find(t => t.value === question.questionType)?.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {showAddQuestionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Add Question</h2>
                            <button
                                onClick={() => setShowAddQuestionModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddQuestion} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Question Text *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={newQuestion.questionText}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                                    placeholder="Enter your question here..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Question Type *
                                    </label>
                                    <select
                                        required
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={newQuestion.questionType}
                                        onChange={(e) => setNewQuestion({
                                            ...newQuestion,
                                            questionType: e.target.value as CreateQuestion['questionType'],
                                            options: e.target.value === 'multiple_choice' ? ['', '', '', ''] : undefined,
                                            correctAnswer: e.target.value === 'multiple_choice' ? '' : undefined
                                        })}
                                    >
                                        {questionTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Marks *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        required
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={newQuestion.marks}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, marks: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {newQuestion.questionType === 'multiple_choice' && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">Options</label>
                                    {newQuestion.options?.map((option, index) => (
                                        <div key={index} className="flex space-x-2">
                                            <input
                                                type="text"
                                                placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...(newQuestion.options || [])];
                                                    newOptions[index] = e.target.value;
                                                    setNewQuestion({ ...newQuestion, options: newOptions });
                                                }}
                                            />
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="correctAnswer"
                                                    checked={newQuestion.correctAnswer === option}
                                                    onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: option })}
                                                    className="mr-1"
                                                />
                                                Correct
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newQuestion.questionType === 'essay' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expected Length (words)
                                    </label>
                                    <input
                                        type="number"
                                        min="50"
                                        max="1000"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={newQuestion.expectedLength}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, expectedLength: Number(e.target.value) })}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddQuestionModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Add Question
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
