import React from 'react';

const mockQuizzes = [
    { id: 1, name: 'John Doe', matricule: 'STU001', totalQuizzes: '-', avgScore: '-', lastQuiz: '-' },
    { id: 2, name: 'Jane Doe', matricule: 'STU002', totalQuizzes: '-', avgScore: '-', lastQuiz: '-' },
];

export default function ParentQuizPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Quiz</h1>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quizzes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Quiz</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {mockQuizzes.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-4 text-gray-500">No quiz data found.</td></tr>
                        ) : (
                            mockQuizzes.map((quiz) => (
                                <tr key={quiz.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quiz.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{quiz.matricule}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{quiz.totalQuizzes}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{quiz.avgScore}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{quiz.lastQuiz}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
} 