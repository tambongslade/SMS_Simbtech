'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Select, Button, Input } from "@/components/ui";
import apiService from '../../../../lib/apiService';
import { toast } from 'react-hot-toast';

interface Student {
    id: number;
    name: string;
    matricule: string;
}

interface Mark {
    id?: number;
    studentId: number;
    mark: number;
    examSequenceId: number;
    subjectId: number;
}

interface ExamSequence {
    id: number;
    name: string;
}

interface Subject {
    id: number;
    name: string;
    subClassId: number;
    subClassName: string;
}

export default function TeacherMarksPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [marks, setMarks] = useState<Record<number, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [examSequences, setExamSequences] = useState<ExamSequence[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedSequence, setSelectedSequence] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);

    // Ensure client-side only rendering for dynamic content
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch teacher's subjects and active exam sequences
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [subjectsRes, sequencesRes] = await Promise.all([
                    apiService.get('/teachers/me/subjects'), // Use teacher-specific endpoint
                    apiService.get('/exams?status=ACTIVE') // Updated status to match API docs
                ]);
                setSubjects(subjectsRes.data || []);
                setExamSequences(sequencesRes.data || []);
            } catch (error: any) {
                console.error('Error fetching initial data:', error);
                if (error?.status === 403) {
                    toast.error('Access denied: Unable to load your assigned subjects');
                } else {
                    toast.error('Failed to load subjects or exam sequences');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // Fetch students when subject is selected
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedSubject || !selectedSequence) return;

            setIsLoading(true);
            try {
                // Get students for the selected subject's subclass - use teacher-specific endpoint
                const subject = subjects.find(s => s.id === Number(selectedSubject));
                if (!subject) return;

                const studentsRes = await apiService.get(`/teachers/me/students?subClassId=${subject.subClassId}&subjectId=${selectedSubject}`);
                setStudents(studentsRes.data || []);

                // Get existing marks using the correct API endpoint structure
                const marksRes = await apiService.get(`/marks?subjectId=${selectedSubject}&examSequenceId=${selectedSequence}`);
                const marksData = marksRes.data || [];

                // Create a map of studentId to mark
                const marksMap = marksData.reduce((acc: Record<number, number>, mark: Mark) => {
                    acc[mark.studentId] = mark.mark;
                    return acc;
                }, {});
                setMarks(marksMap);

            } catch (error) {
                console.error('Error fetching students:', error);
                toast.error('Failed to load students or marks');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudents();
    }, [selectedSubject, selectedSequence, subjects]);

    const handleMarkChange = (studentId: number, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 20) return;
        setMarks(prev => ({ ...prev, [studentId]: numValue }));
    };

    const handleSave = async () => {
        if (!selectedSubject || !selectedSequence) return;

        setIsSaving(true);
        try {
            // Create individual mark entries for each student as per API documentation
            const markPromises = Object.entries(marks).map(async ([studentId, mark]) => {
                const markData = {
                    examId: Number(selectedSequence), // Use examId instead of examSequenceId based on API docs
                    studentId: Number(studentId),
                    subjectId: Number(selectedSubject),
                    mark: Number(mark)
                };

                // Check if mark already exists for this student
                const existingMark = students.find(s => s.id === Number(studentId));
                if (existingMark && marks[Number(studentId)] !== undefined) {
                    // Update existing mark (PUT endpoint if available) or create new one
                    return await apiService.post('/marks', markData);
                }
            });

            await Promise.all(markPromises.filter(p => p !== undefined));
            toast.success('Marks saved successfully');
        } catch (error) {
            console.error('Error saving marks:', error);
            toast.error('Failed to save marks');
        } finally {
            setIsSaving(false);
        }
    };

    // Prevent hydration mismatch by not rendering interactive content until mounted
    if (!isMounted) {
        return (
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Marks Management</h1>
                        <p className="text-gray-600">Enter and manage student marks for exams</p>
                    </div>
                </div>

                {/* Loading State */}
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Marks Management</h1>
                    <p className="text-gray-600">Enter and manage student marks for exams</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Subject</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select a subject...</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id.toString()}>
                                    {subject.name} ({subject.subClassName})
                                </option>
                            ))}
                        </select>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Exam Sequence</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <select
                            value={selectedSequence}
                            onChange={(e) => setSelectedSequence(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select an exam sequence...</option>
                            {examSequences.map(sequence => (
                                <option key={sequence.id} value={sequence.id.toString()}>
                                    {sequence.name}
                                </option>
                            ))}
                        </select>
                    </CardBody>
                </Card>
            </div>

            {isLoading ? (
                <div className="text-center py-10">
                    <p className="text-gray-500">Loading...</p>
                </div>
            ) : selectedSubject && selectedSequence ? (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Student Marks</CardTitle>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || students.length === 0}
                        >
                            {isSaving ? 'Saving...' : 'Save Marks'}
                        </Button>
                    </CardHeader>
                    <CardBody>
                        {students.length > 0 ? (
                            <div className="space-y-4">
                                {students.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <h3 className="font-semibold">{student.name}</h3>
                                            <p className="text-sm text-gray-600">{student.matricule}</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="20"
                                            step="0.25"
                                            value={marks[student.id] || ''}
                                            onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                            className="w-24"
                                            placeholder="0-20"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-4">No students found for this subject.</p>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardBody>
                        <p className="text-center text-gray-500 py-4">
                            Please select both a subject and an exam sequence to manage marks.
                        </p>
                    </CardBody>
                </Card>
            )}
        </div>
    );
} 