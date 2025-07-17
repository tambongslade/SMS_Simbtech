'use client'
import { FC, useState, useEffect } from 'react';
import { AcademicCapIcon, TrophyIcon, ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';

interface SubjectResult {
    id: number;
    subjectName: string;
    grade: string;
    score: number;
    maxScore: number;
    percentage: number;
    teacherComment?: string;
}

interface TermResult {
    id: number;
    academicYear: string;
    term: string;
    subjects: SubjectResult[];
    overallPercentage: number;
    position: number;
    totalStudents: number;
    teacherComment?: string;
    principalComment?: string;
}

interface ParentStudentResultsPageProps {
    studentId: number;
}

const ParentStudentResultsPage: FC<ParentStudentResultsPageProps> = ({ studentId }) => {
    const [termResults, setTermResults] = useState<TermResult[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Mock data - replace with actual API call based on studentId
    useEffect(() => {
        setTimeout(() => {
            const mockResults: TermResult[] = [
                {
                    id: 1,
                    academicYear: '2023/2024',
                    term: 'First Term',
                    overallPercentage: 85.5,
                    position: 3,
                    totalStudents: 45,
                    subjects: [
                        { id: 1, subjectName: 'Mathematics', grade: 'A', score: 85, maxScore: 100, percentage: 85, teacherComment: 'Excellent performance' },
                        { id: 2, subjectName: 'English Language', grade: 'A', score: 88, maxScore: 100, percentage: 88, teacherComment: 'Very good writing skills' },
                        { id: 3, subjectName: 'Physics', grade: 'B', score: 78, maxScore: 100, percentage: 78, teacherComment: 'Good understanding of concepts' },
                        { id: 4, subjectName: 'Chemistry', grade: 'B', score: 82, maxScore: 100, percentage: 82, teacherComment: 'Shows improvement' },
                        { id: 5, subjectName: 'Biology', grade: 'A', score: 90, maxScore: 100, percentage: 90, teacherComment: 'Outstanding work' },
                        { id: 6, subjectName: 'History', grade: 'B', score: 75, maxScore: 100, percentage: 75, teacherComment: 'Good analytical skills' }
                    ],
                    teacherComment: 'John is a dedicated student who consistently performs well across all subjects.',
                    principalComment: 'Keep up the excellent work. You are on track for outstanding results.'
                },
                {
                    id: 2,
                    academicYear: '2023/2024',
                    term: 'Second Term',
                    overallPercentage: 88.2,
                    position: 2,
                    totalStudents: 45,
                    subjects: [
                        { id: 1, subjectName: 'Mathematics', grade: 'A', score: 92, maxScore: 100, percentage: 92, teacherComment: 'Exceptional improvement' },
                        { id: 2, subjectName: 'English Language', grade: 'A', score: 85, maxScore: 100, percentage: 85, teacherComment: 'Consistent performance' },
                        { id: 3, subjectName: 'Physics', grade: 'A', score: 89, maxScore: 100, percentage: 89, teacherComment: 'Great problem-solving skills' },
                        { id: 4, subjectName: 'Chemistry', grade: 'A', score: 86, maxScore: 100, percentage: 86, teacherComment: 'Much improved' },
                        { id: 5, subjectName: 'Biology', grade: 'A', score: 91, maxScore: 100, percentage: 91, teacherComment: 'Excellent laboratory work' },
                        { id: 6, subjectName: 'History', grade: 'B', score: 86, maxScore: 100, percentage: 86, teacherComment: 'Improved research skills' }
                    ],
                    teacherComment: 'John has shown remarkable improvement this term. His dedication is commendable.',
                    principalComment: 'Outstanding improvement. You have moved up in class ranking.'
                }
            ];
            setTermResults(mockResults);
            setSelectedTermId(mockResults[0]?.id || null);
            setIsLoading(false);
        }, 1000);
    }, []);

    const selectedTerm = termResults.find(term => term.id === selectedTermId);
    const latestTerm = termResults[0];

    const stats = [
        {
            title: 'Latest Overall Grade',
            value: `${latestTerm?.overallPercentage.toFixed(1)}%`,
            icon: AcademicCapIcon,
            color: 'primary' as const
        },
        {
            title: 'Class Position',
            value: `${latestTerm?.position} of ${latestTerm?.totalStudents}`,
            icon: TrophyIcon,
            color: 'success' as const
        },
        {
            title: 'Subjects Count',
            value: latestTerm?.subjects.length.toString() || '0',
            icon: ChartBarIcon,
            color: 'secondary' as const
        }
    ];

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A':
                return 'bg-green-100 text-green-800';
            case 'B':
                return 'bg-blue-100 text-blue-800';
            case 'C':
                return 'bg-yellow-100 text-yellow-800';
            case 'D':
                return 'bg-orange-100 text-orange-800';
            case 'F':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Academic Results</h1>
                <p className="text-gray-600">View academic performance and detailed results</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <StatsCard key={index} {...stat} />
                ))}
            </div>

            {/* Term Selection */}
            {termResults.length > 0 && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Select Term</CardTitle>
                    </CardHeader>
                    <CardBody>
                        <div className="flex flex-wrap gap-4">
                            {termResults.map((term) => (
                                <Button
                                    key={term.id}
                                    variant={selectedTermId === term.id ? 'solid' : 'outline'}
                                    color="primary"
                                    onClick={() => setSelectedTermId(term.id)}
                                    className="flex items-center"
                                >
                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                    {term.academicYear} - {term.term}
                                </Button>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Selected Term Results */}
            {selectedTerm && (
                <div className="space-y-6">
                    {/* Overall Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{selectedTerm.academicYear} - {selectedTerm.term} Results</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">{selectedTerm.overallPercentage.toFixed(1)}%</div>
                                    <div className="text-gray-500">Overall Percentage</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600">{selectedTerm.position}</div>
                                    <div className="text-gray-500">Position in Class</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-600">{selectedTerm.totalStudents}</div>
                                    <div className="text-gray-500">Total Students</div>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Subject Results */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Subject Performance</CardTitle>
                        </CardHeader>
                        <CardBody>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Subject
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Score
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Percentage
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Grade
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Teacher Comment
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedTerm.subjects.map((subject) => (
                                            <tr key={subject.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{subject.subjectName}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{subject.score}/{subject.maxScore}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-3">
                                                            <div
                                                                className="bg-blue-600 h-2.5 rounded-full"
                                                                style={{ width: `${subject.percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm text-gray-900">{subject.percentage}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getGradeColor(subject.grade)}`}>
                                                        {subject.grade}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{subject.teacherComment}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Comments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedTerm.teacherComment && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Class Teacher's Comment</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <p className="text-gray-700">{selectedTerm.teacherComment}</p>
                                </CardBody>
                            </Card>
                        )}

                        {selectedTerm.principalComment && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Principal's Comment</CardTitle>
                                </CardHeader>
                                <CardBody>
                                    <p className="text-gray-700">{selectedTerm.principalComment}</p>
                                </CardBody>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {termResults.length === 0 && (
                <Card>
                    <CardBody>
                        <div className="text-center py-8">
                            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No results available</h3>
                            <p className="mt-1 text-sm text-gray-500">No academic results found for this student.</p>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}

export default ParentStudentResultsPage;
