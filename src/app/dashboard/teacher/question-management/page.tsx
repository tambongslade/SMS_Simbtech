'use client'
import { useState, useEffect } from 'react';
import {
    PlusIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    ClipboardDocumentListIcon,
    DocumentIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import apiService from '@/lib/apiService';
import { useRouter } from 'next/navigation';

interface ExamPaper {
    id: number;
    name: string;
    subjectId: number;
    examDate: string;
    duration: number;
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
    createdAt: string;
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

export default function QuestionManagement() {
    const router = useRouter();
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedExamPaper, setSelectedExamPaper] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Ensure client-side only rendering
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch teacher's assigned subjects
    const {
        data: subjectsData,
        error: subjectsError,
        isLoading: subjectsLoading
    } = useSWR<{ success: boolean; data: Subject[] }>(
        '/teachers/me/subjects',
        (url: string) => apiService.get(url)
    );

    // Fetch exam papers for selected subject
    const {
        data: examPapersData,
        error: examPapersError,
        isLoading: examPapersLoading
    } = useSWR<{ success: boolean; data: ExamPaper[] }>(
        selectedSubject ? `/exams/papers?subjectId=${selectedSubject}&includeSubject=true` : null,
        (url: string) => apiService.get(url)
    );

    // Fetch questions for selected exam paper
    const {
        data: examPaperData,
        error: questionsError,
        isLoading: questionsLoading
    } = useSWR<{ success: boolean; data: ExamPaper }>(
        selectedExamPaper ? `/exams/papers/${selectedExamPaper}/with-questions` : null,
        (url: string) => apiService.get(url)
    );

    const subjects = subjectsData?.data || [];
    const examPapers = examPapersData?.data || [];
    const questions = examPaperData?.data?.questions || [];

    // Enhanced error handling with access control awareness
    useEffect(() => {
        if (subjectsError) {
            console.error("Subjects Fetch Error:", subjectsError);
            if (subjectsError.status === 403) {
                toast.error('Access denied: Unable to load your assigned subjects');
            } else {
                toast.error('Failed to load subjects');
            }
        }
        if (examPapersError) {
            console.error("Exam Papers Fetch Error:", examPapersError);
            if (examPapersError.status === 403) {
                toast.error('Access denied: Unable to load exam papers');
            } else {
                toast.error('Failed to load exam papers');
            }
        }
        if (questionsError) {
            console.error("Questions Fetch Error:", questionsError);
            toast.error('Failed to load questions');
        }
    }, [subjectsError, examPapersError, questionsError]);

    // Filter questions based on search
    const filteredQuestions = questions.filter(question => {
        const matchesSearch = question.questionText.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const questionTypes = [
        { value: 'multiple_choice', label: 'Multiple Choice' },
        { value: 'essay', label: 'Essay' },
        { value: 'short_answer', label: 'Short Answer' },
        { value: 'true_false', label: 'True/False' },
        { value: 'fill_in_blank', label: 'Fill in the Blank' }
    ];

    const handleViewQuestion = (question: Question) => {
        setSelectedQuestion(question);
        setShowViewModal(true);
    };

    const formatQuestionType = (type: string) => {
        return questionTypes.find(qt => qt.value === type)?.label || type;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    const navigateToExamManagement = () => {
        router.push('/dashboard/teacher/exams');
    };

    // Prevent hydration mismatch
    if (!isMounted) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Question Management</h1>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                </div>

                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading questions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Question Management</h1>
                    <p className="text-gray-600">
                        View and manage questions through your exam papers
                    </p>
                </div>
                <button
                    onClick={navigateToExamManagement}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Manage Exam Papers
                </button>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 mr-3 mt-1" />
                    <div>
                        <h3 className="text-lg font-medium text-blue-900">Questions are managed through Exam Papers</h3>
                        <p className="text-blue-700 mt-1">
                            To create and manage questions, you need to first create an exam paper. 
                            Questions are directly associated with specific exam papers and cannot exist independently.
                        </p>
                        <button
                            onClick={navigateToExamManagement}
                            className="mt-3 inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                        >
                            Go to Exam Papers Management →
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject
                        </label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => {
                                setSelectedSubject(e.target.value);
                                setSelectedExamPaper(''); // Reset exam paper when subject changes
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={subjectsLoading}
                        >
                            <option value="">Select a subject...</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id.toString()}>
                                    {subject.name} ({subject.subClasses.length} classes)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Exam Paper
                        </label>
                        <select
                            value={selectedExamPaper}
                            onChange={(e) => setSelectedExamPaper(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!selectedSubject || examPapersLoading}
                        >
                            <option value="">Select an exam paper...</option>
                            {examPapers.map(paper => (
                                <option key={paper.id} value={paper.id.toString()}>
                                    {paper.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Questions
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by question text..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={!selectedExamPaper}
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => {
                            setSelectedSubject('');
                            setSelectedExamPaper('');
                            setSearchTerm('');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Statistics */}
            {selectedExamPaper && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                                <p className="text-sm text-gray-600">Total Questions</p>
                                <p className="text-2xl font-bold">{questionsLoading ? '...' : questions.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <ClipboardDocumentListIcon className="h-8 w-8 text-green-600 mr-3" />
                            <div>
                                <p className="text-sm text-gray-600">Multiple Choice</p>
                                <p className="text-2xl font-bold">
                                    {questionsLoading ? '...' : questions.filter(q => q.questionType === 'multiple_choice').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600 mr-3" />
                            <div>
                                <p className="text-sm text-gray-600">Essay Questions</p>
                                <p className="text-2xl font-bold">
                                    {questionsLoading ? '...' : questions.filter(q => q.questionType === 'essay').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center">
                            <ClipboardDocumentListIcon className="h-8 w-8 text-orange-600 mr-3" />
                            <div>
                                <p className="text-sm text-gray-600">Total Marks</p>
                                <p className="text-2xl font-bold">
                                    {questionsLoading ? '...' : questions.reduce((sum, q) => sum + q.marks, 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Questions List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">
                        Questions {selectedExamPaper && examPapers.find(p => p.id.toString() === selectedExamPaper) && 
                            `for "${examPapers.find(p => p.id.toString() === selectedExamPaper)?.name}"`}
                    </h2>
                </div>

                {questionsLoading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading questions...</p>
                    </div>
                ) : !selectedSubject ? (
                    <div className="text-center py-8">
                        <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">Please select a subject to view exam papers</p>
                    </div>
                ) : !selectedExamPaper ? (
                    <div className="text-center py-8">
                        <DocumentIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">Please select an exam paper to view questions</p>
                        {examPapers.length === 0 && selectedSubject && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-500">No exam papers found for this subject</p>
                                <button
                                    onClick={navigateToExamManagement}
                                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Create your first exam paper →
                                </button>
                            </div>
                        )}
                    </div>
                ) : filteredQuestions.length === 0 ? (
                    <div className="text-center py-8">
                        <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No questions found</p>
                        <p className="text-sm text-gray-500">Add questions to this exam paper in the Exam Papers Management page</p>
                        <button
                            onClick={navigateToExamManagement}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            Add questions to this exam paper →
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Question
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Marks
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
                                {filteredQuestions.map((question, index) => (
                                    <tr key={question.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 max-w-xs">
                                                <span className="text-gray-500 mr-2">Q{index + 1}.</span>
                                                {question.questionText.length > 100 
                                                    ? `${question.questionText.substring(0, 100)}...`
                                                    : question.questionText
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {formatQuestionType(question.questionType)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{question.marks}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formatDate(question.createdAt)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleViewQuestion(question)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="View Details"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
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

            {/* View Question Modal */}
            {showViewModal && selectedQuestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Question Details</h2>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Question Text</label>
                                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedQuestion.questionText}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <p className="mt-1 text-sm text-gray-900">{formatQuestionType(selectedQuestion.questionType)}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Marks</label>
                                    <p className="mt-1 text-sm text-gray-900">{selectedQuestion.marks}</p>
                                </div>
                            </div>

                            {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Options</label>
                                    <ul className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                                        {selectedQuestion.options.map((option, index) => (
                                            <li key={index} className={`${option === selectedQuestion.correctAnswer ? 'font-bold text-green-600' : ''}`}>
                                                {String.fromCharCode(65 + index)}. {option}
                                                {option === selectedQuestion.correctAnswer && ' (Correct)'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedQuestion.correctAnswer && selectedQuestion.questionType !== 'multiple_choice' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Correct Answer</label>
                                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedQuestion.correctAnswer}</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-6">
                            <button
                                onClick={navigateToExamManagement}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Edit in Exam Papers
                            </button>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 