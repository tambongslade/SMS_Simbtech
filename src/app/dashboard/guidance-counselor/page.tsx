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
  HeartIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarIcon,
  PlusIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon, // Corrected import
  ArrowTrendingDownIcon // Corrected import
} from '@heroicons/react/24/outline';

interface StudentProfile {
  id: number;
  name: string;
  matricule: string;
  className: string;
  subClassName: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  totalSessions: number;
  lastSessionDate?: string;
  issues: Array<string>;
  improvements: Array<string>;
  nextAppointment?: string;
}

interface InterventionSession {
  id: number;
  studentId: number;
  studentName: string;
  sessionType: "INDIVIDUAL" | "GROUP" | "FAMILY" | "CRISIS";
  sessionDate: string;
  duration: number;
  issues: Array<string>;
  interventions: Array<string>;
  outcomes: Array<string>;
  followUpRequired: boolean;
  nextSessionDate?: string;
  counselorNotes: string;
  status: "COMPLETED" | "SCHEDULED" | "CANCELLED" | "NO_SHOW";
}

interface DashboardStats {
  totalStudentsSupported: number;
  activeCases: number;
  scheduledSessions: number;
  interventionSuccess: number;
  crisisInterventions: number;
  monthlySessionCounts: Array<{
    month: string;
    sessions: number;
    newCases: number;
  }>;
  riskLevelDistribution: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  commonIssues: Array<{
    issue: string;
    count: number;
    trend: "INCREASING" | "DECREASING" | "STABLE";
  }>;
  interventionEffectiveness: Array<{
    type: string;
    successRate: number;
    averageSessions: number;
  }>;
}

interface ScheduledAppointment {
  id: number;
  studentId: number;
  studentName: string;
  className: string;
  sessionType: string;
  scheduledTime: string;
  duration: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  issues: Array<string>;
  notes?: string;
}

export default function GuidanceCounselorDashboard() {
  const { user, selectedAcademicYear } = useAuth(); // Corrected academicYear property
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [recentSessions, setRecentSessions] = useState<InterventionSession[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<ScheduledAppointment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'sessions' | 'appointments'>('overview');

  useEffect(() => {
    if (selectedAcademicYear?.id) { // Corrected academicYear property
      fetchDashboardData();
    }
  }, [selectedAcademicYear?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Note: These endpoints might need to be implemented in the backend
      const [studentsResponse] = await Promise.all([
        apiService.get(`/guidance-counselor/students?academicYearId=${selectedAcademicYear?.id}`)
        // Additional endpoints would be added here when available
      ]);

      setStudents(studentsResponse.data || []);

      // Mock data for demonstration - replace with actual API calls when available
      setDashboardStats({
        totalStudentsSupported: studentsResponse.data?.length || 0,
        activeCases: 25,
        scheduledSessions: 8,
        interventionSuccess: 78.5,
        crisisInterventions: 3,
        monthlySessionCounts: [
          { month: 'Jan', sessions: 45, newCases: 12 },
          { month: 'Feb', sessions: 52, newCases: 15 },
          { month: 'Mar', sessions: 48, newCases: 10 }
        ],
        riskLevelDistribution: { high: 5, medium: 15, low: 25, none: 155 },
        commonIssues: [
          { issue: 'Academic Stress', count: 35, trend: 'INCREASING' },
          { issue: 'Social Anxiety', count: 28, trend: 'STABLE' },
          { issue: 'Family Issues', count: 22, trend: 'DECREASING' }
        ],
        interventionEffectiveness: [
          { type: 'Individual Counseling', successRate: 85, averageSessions: 6 },
          { type: 'Group Therapy', successRate: 75, averageSessions: 8 },
          { type: 'Crisis Intervention', successRate: 95, averageSessions: 3 }
        ]
      });

      setUpcomingAppointments([
        {
          id: 1,
          studentId: 1,
          studentName: 'John Doe',
          className: 'Form 5A',
          sessionType: 'Individual Counseling',
          scheduledTime: new Date(Date.now() + 86400000).toISOString(),
          duration: 60,
          priority: 'HIGH',
          issues: ['Academic Stress', 'Anxiety'],
          notes: 'Follow-up session for exam preparation anxiety'
        }
      ]);

    } catch (error) {
      console.error('Error fetching guidance counselor dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'LOW':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      case 'DECREASING':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />;
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Guidance Counselor Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Student support and intervention tracking for {selectedAcademicYear?.name} {/* Corrected property */}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Schedule Session
          </Button>
          <Button className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Intervention
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Students Supported"
          value={dashboardStats?.totalStudentsSupported?.toString() || '0'} // Convert to string
          icon={UserGroupIcon}
          color="primary" // Corrected color
        />
        <StatsCard
          title="Active Cases"
          value={dashboardStats?.activeCases?.toString() || '0'} // Convert to string
          icon={ClipboardDocumentListIcon}
          color="success" // Corrected color
        />
        <StatsCard
          title="Scheduled Sessions"
          value={dashboardStats?.scheduledSessions?.toString() || '0'} // Convert to string
          icon={CalendarIcon}
          color="secondary" // Corrected color
        />
        <StatsCard
          title="Success Rate"
          value={`${dashboardStats?.interventionSuccess?.toFixed(1) || 0}%`}
          icon={HeartIcon}
          color="warning" // Corrected color
        />
      </div>

      {/* Crisis Alerts */}
      {(dashboardStats?.crisisInterventions || 0) > 0 && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold text-red-900">
                Crisis Interventions Required
              </h3>
              <span className="px-2 py-1 text-sm bg-red-100 text-red-800 rounded-full">
                {dashboardStats?.crisisInterventions} active
              </span>
            </div>
            <p className="text-gray-700">
              {dashboardStats?.crisisInterventions} students require immediate crisis intervention support.
              Please review the high-priority cases in the Students tab.
            </p>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'students', label: 'Students' },
            { id: 'sessions', label: 'Sessions' },
            { id: 'appointments', label: 'Appointments' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Risk Level Distribution
                </h3>
                <div className="space-y-3">
                  {Object.entries(dashboardStats?.riskLevelDistribution || {}).map(([level, count]) => (
                    <div key={level} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(level.toUpperCase())}`}>
                          {level.toUpperCase()}
                        </span>
                        <span className="text-gray-700">{level.charAt(0).toUpperCase() + level.slice(1)} Risk</span>
                      </div>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Common Issues
                </h3>
                <div className="space-y-3">
                  {dashboardStats?.commonIssues?.map((issue, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{issue.issue}</span>
                        {getTrendIcon(issue.trend)}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{issue.count}</span>
                        <p className="text-xs text-gray-600">{issue.trend}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Intervention Effectiveness
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardStats?.interventionEffectiveness?.map((intervention, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">{intervention.type}</h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-xl font-bold text-green-600">{intervention.successRate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Avg. Sessions</p>
                        <p className="text-lg font-semibold text-blue-600">{intervention.averageSessions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Students Under Support ({students.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className={`p-4 border rounded-lg ${getRiskColor(student.riskLevel)}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{student.name}</h4>
                        <p className="text-sm text-gray-600">{student.className} - {student.subClassName}</p>
                        <p className="text-xs text-gray-500">{student.matricule}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(student.riskLevel)}`}>
                        {student.riskLevel}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600">Sessions: {student.totalSessions}</p>
                      {student.lastSessionDate && (
                        <p className="text-xs text-gray-500">
                          Last: {new Date(student.lastSessionDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => handleViewStudent(student)}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <EyeIcon className="h-3 w-3" />
                        View
                      </Button>
                      {student.nextAppointment && (
                        <span className="text-xs text-blue-600">
                          Next: {new Date(student.nextAppointment).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Sessions
              </h3>
              <div className="text-center py-8 text-gray-500">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Session history will be available soon</p>
                <p className="text-sm">Track and review completed counseling sessions</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upcoming Appointments
              </h3>
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex justify-between items-start p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{appointment.studentName}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(appointment.priority)}`}>
                          {appointment.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{appointment.className} • {appointment.sessionType}</p> {/* Corrected typo: Removed 'L' */}
                      <p className="text-sm text-gray-600">Duration: {appointment.duration} minutes</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Issues: {appointment.issues.join(', ')}
                      </p>
                      {appointment.notes && (
                        <p className="text-xs text-gray-500 mt-1">Notes: {appointment.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(appointment.scheduledTime).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.scheduledTime).toLocaleTimeString()}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline">
                          Reschedule
                        </Button>
                        <Button size="sm">
                          Start Session
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Student Detail Modal */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        title="Student Profile"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedStudent.name}</h3>
                <p className="text-gray-600">{selectedStudent.className} - {selectedStudent.subClassName}</p>
                <p className="text-sm text-gray-500">{selectedStudent.matricule}</p>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${getRiskColor(selectedStudent.riskLevel)}`}>
                {selectedStudent.riskLevel} Risk
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-xl font-bold text-blue-600">{selectedStudent.totalSessions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Session</p>
                <p className="text-sm text-gray-900">
                  {selectedStudent.lastSessionDate
                    ? new Date(selectedStudent.lastSessionDate).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Current Issues</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStudent.issues.map((issue, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                    {issue}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Improvements</h4>
              <div className="flex flex-wrap gap-2">
                {selectedStudent.improvements.map((improvement, index) => (
                  <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {improvement}
                  </span>
                ))}
              </div>
            </div>

            {selectedStudent.nextAppointment && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Next Appointment</h4>
                <p className="text-sm text-gray-700">
                  {new Date(selectedStudent.nextAppointment).toLocaleDateString()} at{' '}
                  {new Date(selectedStudent.nextAppointment).toLocaleTimeString()}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline">
                Schedule Session
              </Button>
              <Button>
                Start Intervention
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 