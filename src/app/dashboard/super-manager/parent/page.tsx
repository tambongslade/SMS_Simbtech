'use client';
import React, { useEffect, useState } from 'react';
import apiService from '../../../../lib/apiService';

interface Student {
    id: number;
    name: string;
    matricule?: string;
}

export default function ParentDashboardPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    // Mock parentId for now (in real app, get from auth/user context)
    const parentId = 1;

    useEffect(() => {
        const fetchStudents = async () => {
            setIsLoading(true);
            try {
                const result = await apiService.get(`/users/${parentId}/students`);
                setStudents(result.data || []);
            } catch (err) {
                setStudents([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, [parentId]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Parent Dashboard</h1>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Children</div>
                    <div className="text-2xl font-bold">{students.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Fees (FCFA)</div>
                    <div className="text-2xl font-bold">-</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Quizzes Taken</div>
                    <div className="text-2xl font-bold">-</div>
                </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Children</h2>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={2} className="text-center py-4 text-gray-500 italic">Loading...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan={2} className="text-center py-4 text-gray-500">No children found.</td></tr>
                        ) : (
                            students.map((student) => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.matricule || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
} 