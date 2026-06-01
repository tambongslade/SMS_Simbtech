'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import toast from 'react-hot-toast';
import {
    UserGroupIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
    StarIcon,
    ChartBarIcon,
    BookOpenIcon,
    UsersIcon
} from '@heroicons/react/24/outline';

interface TeacherInDepartment {
    id: number;
    name: string;
    email: string;
    matricule: string;
    phone: string;
    totalHoursPerWeek: number;
    subjectsTeaching: Array<{
        id: number;
        name: string;
        classCount: number;
        studentCount: number;
        averageMarks: number;
    }>;
    classesTeaching: Array<{
        id: number;
        name: string;
        className: string;
        studentCount: number;
        averageMarks: number;
    }>;
    performanceMetrics: {
        totalStudents: number;
        averageMarks: number;
        passRate: number;
        excellentRate: number;
    };
}

interface AssignTeacherModalData {
    subjectId: number;
    teacherId: number;
}

interface Subject {
    id: number;
    name: string;
    category: string;
}

interface Teacher {
    id: number;
    name: string;
    email: string;
    matricule: string;
}

export default function HODStaffManagement() {
    const { user, academicYear } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState<TeacherInDepartment[]>([]);
    const [filteredTeachers, setFilteredTeachers] = useState<TeacherInDepartment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherInDepartment | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [assignmentData, setAssignmentData] = useState<AssignTeacherModalData>({
        subjectId: 0,
        teacherId: 0
    });

    useEffect(() => {
        if (academicYear?.id) {
            fetchData();
        }
    }, [academicYear?.id]);

    useEffect(() => {
        const filtered = teachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            teacher.matricule.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredTeachers(filtered);
    }, [searchTerm, teachers]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [teachersResponse, subjectsResponse, allTeachersResponse] = await Promise.all([
                apiService.get('/hod/teachers-in-department', {
                    params: {
                        academicYearId: academicYear?.id,
                        limit: 100
                    }
                }),
                apiService.get('/hod/my-subjects'),
                apiService.get('/users', {
                    params: {
                        role: 'TEACHER',
                        academicYearId: academicYear?.id,
                        limit: 100
                    }
                })
            ]);

            setTeachers(teachersResponse.data);
            setSubjects(subjectsResponse.data);
            setAllTeachers(allTeachersResponse.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    const handleViewTeacher = (teacher: TeacherInDepartment) => {
        setSelectedTeacher(teacher);
        setIsViewModalOpen(true);
    };

    const handleAssignTeacher = async () => {
        if (!assignmentData.subjectId || !assignmentData.teacherId) {
            toast.error('Please select both subject and teacher');
            return;
        }

        try {
            await apiService.post('/hod/assign-teacher-subject', {
                subjectId: assignmentData.subjectId,
                teacherId: assignmentData.teacherId
            });

            toast.success('Teacher assigned to subject successfully');
            setIsAssignModalOpen(false);
            setAssignmentData({ subjectId: 0, teacherId: 0 });
            fetchData();
        } catch (error) {
            console.error('Error assigning teacher:', error);
            toast.error('Failed to assign teacher to subject');
        }
    };

    const calculateDepartmentStats = () => {
        if (teachers.length === 0) return {
            totalTeachers: 0,
            averagePerformance: 0,
            totalStudents: 0,
            totalHours: 0
        };

        const totalStudents = teachers.reduce((sum, teacher) =>
            sum + teacher.performanceMetrics.totalStudents, 0
        );

        const averagePerformance = teachers.reduce((sum, teacher) =>
            sum + teacher.performanceMetrics.averageMarks, 0
        ) / teachers.length;

        const totalHours = teachers.reduce((sum, teacher) =>
            sum + teacher.totalHoursPerWeek, 0
        );

        return {
            totalTeachers: teachers.length,
            averagePerformance,
            totalStudents,
            totalHours
        };
    };

    const stats = calculateDepartmentStats();

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Department Staff</h1>
                    <p className="text-gray-600 mt-1">
                        Manage and monitor department teachers for {academicYear?.name}
                    </p>
                </div>
                <Button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <PlusIcon className="h-4 w-4" />
                    Assign Teacher to Subject
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Teachers"
                    value={stats.totalTeachers}
                    icon={UserGroupIcon}
                    color="blue"
                />
                <StatsCard
                    title="Avg. Performance"
                    value={`${stats.averagePerformance.toFixed(1)}`}
                    icon={ChartBarIcon}
                    color="green"
                />
                <StatsCard
                    title="Students Taught"
                    value={stats.totalStudents}
                    icon={UsersIcon}
                    color="purple"
                />
                <StatsCard
                    title="Weekly Hours"
                    value={stats.totalHours}
                    icon={BookOpenIcon}
                    color="orange"
                />
            </div>

            {/* Search and Filters */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search teachers by name, email, or matricule..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Teachers Table */}
            <Card>
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Department Teachers ({filteredTeachers.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Teacher
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Subjects
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Students
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Performance
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Weekly Hours
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredTeachers.map((teacher) => (
                                    <tr key={teacher.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {teacher.name}
                                                </div>
                                                <div className="text-sm text-gray-500">{teacher.matricule}</div>
                                                <div className="text-sm text-gray-500">{teacher.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {teacher.subjectsTeaching.length} subjects
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {teacher.subjectsTeaching.slice(0, 2).map(s => s.name).join(', ')}
                                                {teacher.subjectsTeaching.length > 2 && '...'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {teacher.performanceMetrics.totalStudents}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {teacher.performanceMetrics.averageMarks.toFixed(1)} avg
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {teacher.performanceMetrics.passRate.toFixed(1)}% pass rate
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {teacher.totalHoursPerWeek}h/week
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <Button
                                                onClick={() => handleViewTeacher(teacher)}
                                                variant="outline"
                                                size="sm"
                                                className="flex items-center gap-1"
                                            >
                                                <EyeIcon className="h-4 w-4" />
                                                View Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {/* View Teacher Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Teacher Details"
            >
                {selectedTeacher && (
                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Basic Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Name</p>
                                    <p className="font-medium">{selectedTeacher.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Matricule</p>
                                    <p className="font-medium">{selectedTeacher.matricule}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium">{selectedTeacher.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Phone</p>
                                    <p className="font-medium">{selectedTeacher.phone}</p>
                                </div>
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Performance Metrics
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Total Students</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {selectedTeacher.performanceMetrics.totalStudents}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Average Marks</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {selectedTeacher.performanceMetrics.averageMarks.toFixed(1)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Pass Rate</p>
                                    <p className="text-xl font-bold text-purple-600">
                                        {selectedTeacher.performanceMetrics.passRate.toFixed(1)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Excellence Rate</p>
                                    <p className="text-xl font-bold text-orange-600">
                                        {selectedTeacher.performanceMetrics.excellentRate.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Subjects Teaching */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Subjects Teaching
                            </h4>
                            <div className="space-y-3">
                                {selectedTeacher.subjectsTeaching.map((subject) => (
                                    <div
                                        key={subject.id}
                                        className="p-3 border border-gray-200 rounded-lg"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h5 className="font-medium text-gray-900">{subject.name}</h5>
                                                <p className="text-sm text-gray-600">
                                                    {subject.classCount} classes • {subject.studentCount} students
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium text-blue-600">
                                                    Avg: {subject.averageMarks.toFixed(1)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Classes Teaching */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Classes Teaching
                            </h4>
                            <div className="space-y-2">
                                {selectedTeacher.classesTeaching.map((classItem) => (
                                    <div
                                        key={classItem.id}
                                        className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                    >
                                        <div>
                                            <span className="font-medium">{classItem.className} - {classItem.name}</span>
                                            <span className="text-sm text-gray-600 ml-2">
                                                ({classItem.studentCount} students)
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-blue-600">
                                            Avg: {classItem.averageMarks.toFixed(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Assign Teacher Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Assign Teacher to Subject"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject
                        </label>
                        <select
                            value={assignmentData.subjectId}
                            onChange={(e) => setAssignmentData(prev => ({
                                ...prev,
                                subjectId: parseInt(e.target.value)
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={0}>Select a subject</option>
                            {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name} ({subject.category})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Teacher
                        </label>
                        <select
                            value={assignmentData.teacherId}
                            onChange={(e) => setAssignmentData(prev => ({
                                ...prev,
                                teacherId: parseInt(e.target.value)
                            }))}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={0}>Select a teacher</option>
                            {allTeachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name} ({teacher.matricule})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            onClick={() => setIsAssignModalOpen(false)}
                            variant="outline"
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAssignTeacher}>
                            Assign Teacher
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}