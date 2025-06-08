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

    // Fetch teacher's subjects and active exam sequences
    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            try {
                const [subjectsRes, sequencesRes] = await Promise.all([
                    apiService.get('/subjects?assigned=true'), // Get subjects assigned to the teacher
                    apiService.get('/exams?status=active') // Get active exam sequences
                ]);
                setSubjects(subjectsRes.data || []);
                setExamSequences(sequencesRes.data || []);
            } catch (error) {
                console.error('Error fetching initial data:', error);
                toast.error('Failed to load subjects or exam sequences');
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
                // Get students for the selected subject's subclass
                const subject = subjects.find(s => s.id === Number(selectedSubject));
                if (!subject) return;

                const studentsRes = await apiService.get(`/students?subClassId=${subject.subClassId}`);
                setStudents(studentsRes.data || []);

                // Get existing marks
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
            const marksToSave = Object.entries(marks).map(([studentId, mark]) => ({
                studentId: Number(studentId),
                mark,
                examSequenceId: Number(selectedSequence),
                subjectId: Number(selectedSubject)
            }));

            await apiService.post('/marks', marksToSave);
            toast.success('Marks saved successfully');
        } catch (error) {
            console.error('Error saving marks:', error);
            toast.error('Failed to save marks');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Marks Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Select Subject</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <Select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            options={subjects.map(subject => ({
                                value: subject.id.toString(),
                                label: `${subject.name} (${subject.subClassName})`
                            }))}
                            placeholder="Select a subject..."
                        />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Exam Sequence</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <Select
                            value={selectedSequence}
                            onChange={(e) => setSelectedSequence(e.target.value)}
                            options={examSequences.map(sequence => ({
                                value: sequence.id.toString(),
                                label: sequence.name
                            }))}
                            placeholder="Select an exam sequence..."
                        />
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