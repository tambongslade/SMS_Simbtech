'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import toast from 'react-hot-toast';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  FlagIcon,
  BellAlertIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  totalActiveIssues: number;
  resolvedThisWeek: number;
  pendingResolution: number;
  studentsWithMultipleIssues: number;
  averageResolutionTime: number;
  attendanceRate: number;
  latenessIncidents: number;
  absenteeismCases: number;
  interventionSuccess: number;
  criticalCases: number;
  behavioralTrends: {
    thisMonth: number;
    lastMonth: number;
    trend: "IMPROVING" | "DECLINING" | "STABLE";
  };
  urgentInterventions: Array<{
    studentId: number;
    studentName: string;
    issueCount: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
    lastIncident: string;
    recommendedAction: string;
  }>;
  issuesByType: Array<{
    type: string;
    count: number;
    trend: "INCREASING" | "DECREASING" | "STABLE";
    resolution_rate: number;
  }>;
}

interface BehavioralAnalytics {
  totalStudents: number;
  studentsWithIssues: number;
  behaviorScore: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  monthlyTrends: Array<{
    month: string;
    incidents: number;
    resolved: number;
    newCases: number;
  }>;
  issueTypeAnalysis: Array<{
    issueType: string;
    frequency: number;
    averageResolutionTime: number;
    recurrenceRate: number;
    effectiveInterventions: Array<string>;
  }>;
  classroomHotspots: Array<{
    subClassName: string;
    className: string;
    incidentCount: number;
    riskScore: number;
    primaryIssues: Array<string>;
  }>;
}

interface EarlyWarning {
  criticalStudents: Array<{
    studentId: number;
    studentName: string;
    warningLevel: "CRITICAL" | "HIGH" | "MODERATE";
    riskFactors: Array<string>;
    triggerEvents: Array<string>;
    recommendedActions: Array<string>;
    urgency: "IMMEDIATE" | "WITHIN_WEEK" | "MONITOR";
  }>;
  riskIndicators: Array<{
    indicator: string;
    studentsAffected: number;
    severity: "HIGH" | "MEDIUM" | "LOW";
    trendDirection: "INCREASING" | "STABLE" | "DECREASING";
  }>;
  preventiveRecommendations: Array<{
    category: string;
    recommendation: string;
    targetStudents: number;
    priority: "HIGH" | "MEDIUM" | "LOW";
    implementationTimeline: string;
  }>;
}

// Incident-related interfaces
interface DisciplineIssue {
  id: number;
  enrollmentId: number;
  issueType: 'MORNING_LATENESS' | 'CLASS_ABSENCE' | 'MISCONDUCT' | 'OTHER';
  description: string;
  notes?: string;
  assignedById: number;
  reviewedById?: number;
  createdAt: string;
  updatedAt: string;
  // Populated after fetching additional data
  student?: {
    id: number;
    name: string;
    matricule: string;
  };
  subClass?: {
    id: number;
    name: string;
    class: {
      id: number;
      name: string;
    };
  };
  assignedBy?: {
    id: number;
    name: string;
  };
  reviewedBy?: {
    id: number;
    name: string;
  };
}

interface Student {
  id: number;
  name: string;
  matricule: string;
  enrollments: Array<{
    id: number;
    studentId: number;
    academicYearId: number;
    classId: number;
    subClassId: number | null;
    subClass: {
      id: number;
      name: string;
      class: {
        id: number;
        name: string;
      };
    } | null;
  }>;
}

interface DisciplineStatistics {
  overview: {
    totalStudents: number;
    studentsWithIssues: number;
    behaviorScore: number;
    riskDistribution: {
      high: number;
      medium: number;
      low: number;
      none: number;
    };
  };
  trends: Array<{
    month: string;
    incidents: number;
    resolved: number;
    newCases: number;
  }>;
  issueAnalysis: Array<{
    issueType: string;
    frequency: number;
    averageResolutionTime: number;
    recurrenceRate: number;
    effectiveInterventions: string[];
  }>;
  classroomHotspots: Array<{
    subClassName: string;
    className: string;
    incidentCount: number;
    riskScore: number;
    primaryIssues: string[];
  }>;
}

export default function DisciplineMasterDashboard() {
  const { user, selectedAcademicYear } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [behavioralData, setBehavioralData] = useState<BehavioralAnalytics | null>(null);
  const [earlyWarningData, setEarlyWarningData] = useState<EarlyWarning | null>(null);

  // Incidents state
  const [issues, setIssues] = useState<DisciplineIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<DisciplineIssue[]>([]);
  const [statistics, setStatistics] = useState<DisciplineStatistics | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<DisciplineIssue | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Incident filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubClassId, setSelectedSubClassId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Student search for creating new issues
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Create form
  const [formData, setFormData] = useState({
    enrollment_id: '',
    issue_type: 'MISCONDUCT' as const,
    description: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'warnings' | 'interventions' | 'incidents' | 'create-incident'>('overview');

  const issueTypes = [
    { value: 'MORNING_LATENESS', label: 'Morning Lateness' },
    { value: 'CLASS_ABSENCE', label: 'Class Absence' },
    { value: 'MISCONDUCT', label: 'Misconduct' },
    { value: 'OTHER', label: 'Other' }
  ];

  useEffect(() => {
    if (selectedAcademicYear?.id) {
      fetchDashboardData();
    }
  }, [selectedAcademicYear?.id]);

  useEffect(() => {
    if (activeTab === 'incidents' && selectedAcademicYear?.id) {
      fetchIncidentData();
    }
  }, [activeTab, selectedAcademicYear?.id, page, sortBy, sortOrder]);

  useEffect(() => {
    filterIssues();
  }, [issues, searchTerm, selectedIssueType, selectedClassId, selectedSubClassId, startDate, endDate]);

  // Student search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (studentSearchTerm.trim().length >= 2) {
        searchStudents();
      } else {
        setStudentSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [studentSearchTerm]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [dashboardResponse, analyticsResponse, warningResponse] = await Promise.all([
        apiService.get(`/discipline-master/dashboard?academicYearId=${selectedAcademicYear?.id}`),
        apiService.get(`/discipline-master/behavioral-analytics?academicYearId=${selectedAcademicYear?.id}`),
        apiService.get(`/discipline-master/early-warning?academicYearId=${selectedAcademicYear?.id}`)
      ]);

      setDashboardData(dashboardResponse.data);
      setBehavioralData(analyticsResponse.data);
      setEarlyWarningData(warningResponse.data);
    } catch (error) {
      console.error('Error fetching discipline master dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchIncidentData = async () => {
    try {
      const queryParamsIssues = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      if (selectedAcademicYear?.id) {
        queryParamsIssues.append('academic_year_id', selectedAcademicYear.id.toString());
      }
      if (selectedClassId) {
        queryParamsIssues.append('class_id', selectedClassId);
      }
      if (selectedSubClassId) {
        queryParamsIssues.append('sub_class_id', selectedSubClassId);
      }
      if (startDate) {
        queryParamsIssues.append('start_date', startDate);
      }
      if (endDate) {
        queryParamsIssues.append('end_date', endDate);
      }

      const queryParamsStats = new URLSearchParams();
      if (selectedAcademicYear?.id) {
        queryParamsStats.append('academicYearId', selectedAcademicYear.id.toString());
      }
      if (startDate) {
        queryParamsStats.append('startDate', startDate);
      }
      if (endDate) {
        queryParamsStats.append('endDate', endDate);
      }
      if (selectedClassId) {
        queryParamsStats.append('classId', selectedClassId);
      }

      const [issuesResponse, statsResponse] = await Promise.all([
        apiService.get(`/discipline?${queryParamsIssues.toString()}`),
        apiService.get(`/discipline-master/statistics?${queryParamsStats.toString()}`),
      ]);

      // Process the issues to add student/class details
      const rawIssues = issuesResponse.data.data || [];
      const processedIssues = await Promise.all(
        rawIssues.map(async (issue: any) => {
          try {
            // Fetch enrollment details to get student and class info
            const enrollmentResponse = await apiService.get(`/students/enrollments/${issue.enrollmentId}`);
            const enrollmentData = enrollmentResponse.data;

            // Adapt the received data to our component's expected structure.
            const student = {
              id: enrollmentData.id,
              name: enrollmentData.name,
              matricule: enrollmentData.matricule
            };

            const subClass = {
              id: 0, // The endpoint doesn't provide subClassId
              name: enrollmentData.subClass, // e.g., "FORM 4A"
              class: {
                id: 0, // The endpoint doesn't provide classId
                name: enrollmentData.class // e.g., "FORM 4"
              }
            };

            return {
              ...issue,
              student: student,
              subClass: subClass,
              assignedBy: { id: issue.assignedById, name: 'Unknown' }, // Would need to fetch user details
              reviewedBy: issue.reviewedById ? { id: issue.reviewedById, name: 'Unknown' } : undefined
            };
          } catch (error) {
            console.error(`Error fetching enrollment ${issue.enrollmentId}:`, error);
            return {
              ...issue,
              student: { id: 0, name: 'Unknown Student', matricule: 'N/A' },
              subClass: { id: 0, name: 'Unknown Subclass', class: { id: 0, name: 'Unknown Class' } },
              assignedBy: { id: issue.assignedById, name: 'Unknown' }
            };
          }
        })
      );

      setIssues(processedIssues);
      setStatistics(statsResponse.data);
    } catch (error) {
      console.error('Error fetching incident data:', error);
      toast.error('Failed to load incident data');
    }
  };

  const searchStudents = async () => {
    if (!studentSearchTerm.trim()) {
      setStudentSearchResults([]);
      return;
    }

    try {
      setSearchingStudents(true);

      const response = await apiService.get('/students/search', {
        params: {
          q: studentSearchTerm.trim(),
          academic_year_id: selectedAcademicYear?.id,
          limit: 10
        }
      });

      if (response.success && response.data && response.data.data) {
        setStudentSearchResults(response.data.data);
      } else {
        setStudentSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching students:', error);
      setStudentSearchResults([]);
    } finally {
      setSearchingStudents(false);
    }
  };

  const filterIssues = () => {
    let filtered = [...issues];

    if (searchTerm) {
      filtered = filtered.filter(issue =>
        issue.student?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.student?.matricule?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedIssueType) {
      filtered = filtered.filter(issue => issue.issueType === selectedIssueType);
    }

    setFilteredIssues(filtered);
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearchTerm(student.name);
    setStudentSearchResults([]);

    // Set the enrollment ID (use the first active enrollment)
    if (student.enrollments && student.enrollments.length > 0) {
      setFormData({ ...formData, enrollment_id: student.enrollments[0].id.toString() });
    }
  };

  const handleCreateIssue = async () => {
    if (!formData.enrollment_id || !formData.description) {
      toast.error('Please select a student and provide a description');
      return;
    }

    try {
      setSubmitting(true);

      await apiService.post('/discipline', {
        enrollment_id: parseInt(formData.enrollment_id),
        issue_type: formData.issue_type,
        description: formData.description,
        notes: formData.notes.trim() || undefined,
        academic_year_id: selectedAcademicYear?.id
      });

      toast.success('Discipline issue recorded successfully');

      // Reset form
      setFormData({
        enrollment_id: '',
        issue_type: 'MISCONDUCT',
        description: '',
        notes: ''
      });
      setSelectedStudent(null);
      setStudentSearchTerm('');
      setShowCreateModal(false);

      // Refresh data
      fetchIncidentData();
      fetchDashboardData(); // Refresh dashboard stats too
    } catch (error) {
      console.error('Error creating discipline issue:', error);
      toast.error('Failed to record discipline issue');
    } finally {
      setSubmitting(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
      case 'DECREASING':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-green-500" />;
      case 'DECLINING':
      case 'INCREASING':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
      case 'CRITICAL':
        return 'text-red-600 bg-red-100';
      case 'MEDIUM':
      case 'MODERATE':
        return 'text-yellow-600 bg-yellow-100';
      case 'LOW':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'WITHIN_WEEK':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'MONITOR':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getIssueTypeColor = (type: string) => {
    switch (type) {
      case 'MORNING_LATENESS':
        return 'yellow';
      case 'CLASS_ABSENCE':
        return 'yellow';
      case 'MISCONDUCT':
        return 'red';
      case 'OTHER':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const found = issueTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString();
    } catch {
      return 'Invalid Time';
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
          <h1 className="text-3xl font-bold text-gray-900">Discipline Management Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Student behavior tracking, incident management and intervention for {selectedAcademicYear?.name}
          </p>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => setShowCreateModal(true)}
        >
          <PlusIcon className="h-4 w-4" />
          Record New Issue
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Issues"
          value={dashboardData?.totalActiveIssues.toString() || '0'}
          icon={ExclamationTriangleIcon}
          color="danger"
        />
        <StatsCard
          title="Resolved This Week"
          value={dashboardData?.resolvedThisWeek.toString() || '0'}
          icon={CheckCircleIcon}
          color="success"
        />
        <StatsCard
          title="Avg Resolution Time"
          value={`${dashboardData?.averageResolutionTime || 0} days`}
          icon={ClockIcon}
          color="primary"
        />
        <StatsCard
          title="Critical Cases"
          value={dashboardData?.criticalCases.toString() || '0'}
          icon={ChartBarIcon}
          color="warning"
        />
      </div>

      {/* Behavioral Trends Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Behavioral Trend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.behavioralTrends.thisMonth || 0}
                </p>
                <p className="text-sm text-gray-500">incidents this month</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(dashboardData?.behavioralTrends.trend || 'STABLE')}
                <span className={`text-sm font-medium ${dashboardData?.behavioralTrends.trend === 'IMPROVING' ? 'text-green-600' :
                  dashboardData?.behavioralTrends.trend === 'DECLINING' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                  {dashboardData?.behavioralTrends.trend || 'STABLE'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(dashboardData?.attendanceRate ?? 0).toFixed(1)}%
                </p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Intervention Success</p>
                <p className="text-2xl font-bold text-green-600">
                  {(dashboardData?.interventionSuccess ?? 0).toFixed(1)}%
                </p>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'incidents', label: 'Discipline Issues' },
            { id: 'analytics', label: 'Behavioral Analytics' },
            { id: 'warnings', label: 'Early Warning System' },
            { id: 'interventions', label: 'Interventions' }
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
                  Issue Types Breakdown
                </h3>
                <div className="space-y-3">
                  {dashboardData?.issuesByType?.map((issue, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{issue.type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getTrendIcon(issue.trend)}
                          <span className="text-sm text-gray-600">{issue.trend}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{issue.count}</p>
                        <p className="text-sm text-gray-600">
                          {(issue.resolution_rate ?? 0).toFixed(1)}% resolved
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Urgent Interventions Required
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {dashboardData?.urgentInterventions?.map((student) => (
                    <div key={student.studentId} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{student.studentName}</p>
                          <p className="text-sm text-gray-600">{student.issueCount} issues</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(student.riskLevel)}`}>
                          {student.riskLevel} RISK
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{student.recommendedAction}</p>
                      <p className="text-xs text-gray-500">
                        Last incident: {new Date(student.lastIncident).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search students, incidents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Issue Type
                  </label>
                  <select
                    value={selectedIssueType}
                    onChange={(e) => setSelectedIssueType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    {issueTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  color="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedIssueType('');
                    setSelectedClassId('');
                    setSelectedSubClassId('');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>

          {/* Recent Issues and Classroom Hotspots */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Recent Issues ({filteredIssues.length})
                    </h3>
                  </div>

                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No discipline issues found</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {filteredIssues.map((issue) => (
                        <div key={issue.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900">
                                  {issue.student?.name || 'Unknown Student'}
                                </h4>
                                <Badge variant="outline" size="sm">
                                  {issue.student?.matricule || 'No Matricule'}
                                </Badge>
                                <Badge variant="outline" size="sm">
                                  {issue.subClass?.class?.name || 'Unknown Class'} - {issue.subClass?.name || 'Unknown Subclass'}
                                </Badge>
                              </div>

                              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                {issue.description}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>{formatDate(issue.createdAt)} • {formatTime(issue.createdAt)}</span>
                                <span>Reported by: {issue.assignedBy?.name || 'Unknown'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                              <Badge
                                variant="solid"
                                color={getIssueTypeColor(issue.issueType)}
                                size="sm"
                              >
                                {getIssueTypeLabel(issue.issueType)}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setShowIssueModal(true);
                                }}
                              >
                                <EyeIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div>
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Classroom Hotspots
                  </h3>

                  {!statistics?.classroomHotspots?.length ? (
                    <p className="text-gray-500 text-center py-4">
                      No hotspots identified
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {statistics.classroomHotspots.map((hotspot, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">
                                {hotspot.className} - {hotspot.subClassName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {hotspot.incidentCount} incidents
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-red-600">
                                Risk: {hotspot.riskScore}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Primary issues:</p>
                            <p className="text-xs text-gray-800">
                              {hotspot.primaryIssues.join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="p-6 text-center">
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {behavioralData?.totalStudents || 0}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-6 text-center">
                <p className="text-sm text-gray-600">With Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {behavioralData?.studentsWithIssues || 0}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-6 text-center">
                <p className="text-sm text-gray-600">Behavior Score</p>
                <p className="text-2xl font-bold text-blue-600">
                  {behavioralData?.behaviorScore?.toFixed(1) || 0}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-6 text-center">
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-orange-600">
                  {behavioralData?.riskDistribution.high || 0}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Issue Type Analysis
                </h3>
                <div className="space-y-3">
                  {behavioralData?.issueTypeAnalysis?.map((analysis, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{analysis.issueType}</h4>
                        <span className="text-sm text-gray-600">{analysis.frequency} cases</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Avg Resolution</p>
                          <p className="font-medium">{analysis.averageResolutionTime} days</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Recurrence Rate</p>
                          <p className="font-medium">{(analysis.recurrenceRate ?? 0).toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">Effective interventions:</p>
                        <p className="text-xs text-gray-800">
                          {analysis.effectiveInterventions.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Classroom Hotspots
                </h3>
                <div className="space-y-3">
                  {behavioralData?.classroomHotspots?.map((hotspot, index) => (
                    <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {hotspot.className} - {hotspot.subClassName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {hotspot.incidentCount} incidents
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">
                            Risk Score: {hotspot.riskScore}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Primary issues:</p>
                        <p className="text-xs text-gray-800">
                          {hotspot.primaryIssues.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'warnings' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Critical Students Requiring Immediate Attention
              </h3>
              <div className="space-y-3">
                {earlyWarningData?.criticalStudents?.map((student) => (
                  <div
                    key={student.studentId}
                    className={`p-4 border rounded-lg ${getUrgencyColor(student.urgency)}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{student.studentName}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(student.warningLevel)}`}>
                          {student.warningLevel}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${student.urgency === 'IMMEDIATE' ? 'bg-red-100 text-red-800' :
                        student.urgency === 'WITHIN_WEEK' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                        {student.urgency.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Risk Factors:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {student.riskFactors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Trigger Events:</p>
                        <ul className="text-xs text-gray-600 list-disc list-inside">
                          {student.triggerEvents.map((event, index) => (
                            <li key={index}>{event}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {student.recommendedActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Risk Indicators
                </h3>
                <div className="space-y-3">
                  {earlyWarningData?.riskIndicators?.map((indicator, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-gray-900">{indicator.indicator}</p>
                        <p className="text-sm text-gray-600">
                          {indicator.studentsAffected} students affected
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(indicator.severity)}`}>
                          {indicator.severity}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          {getTrendIcon(indicator.trendDirection)}
                          <span className="text-xs text-gray-600">{indicator.trendDirection}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Preventive Recommendations
                </h3>
                <div className="space-y-3">
                  {earlyWarningData?.preventiveRecommendations?.map((rec, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-900">{rec.category}</p>
                        <span className={`px-2 py-1 text-xs rounded-full ${rec.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{rec.recommendation}</p>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Target: {rec.targetStudents} students</span>
                        <span>Timeline: {rec.implementationTimeline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'interventions' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Active Interventions
                </h3>
                <Button size="sm" className="flex items-center gap-2">
                  <PlusIcon className="h-4 w-4" />
                  Create Intervention Plan
                </Button>
              </div>
              <div className="text-center py-8 text-gray-500">
                <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Intervention tracking will be available soon</p>
                <p className="text-sm">Monitor and manage student intervention plans</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Record New Discipline Issue</h2>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Student *
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Search by name or matricule..."
                    className="pl-10"
                    autoComplete="off"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  {searchingStudents && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* Student search results dropdown */}
                {studentSearchResults.length > 0 && (
                  <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto">
                    {studentSearchResults.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.matricule}</div>
                        {student.enrollments?.[0] && (
                          <div className="text-xs text-gray-400">
                            {student.enrollments[0].subClass ?
                              `${student.enrollments[0].subClass.class?.name} - ${student.enrollments[0].subClass.name}` :
                              'No subclass assigned'
                            }
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {studentSearchTerm.length >= 2 && !searchingStudents && studentSearchResults.length === 0 && (
                  <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl p-3">
                    <div className="text-sm text-gray-500 text-center">No students found matching "{studentSearchTerm}"</div>
                  </div>
                )}

                {/* Selected student display */}
                {selectedStudent && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-medium text-green-800">{selectedStudent.name}</div>
                        <div className="text-xs text-green-600">{selectedStudent.matricule}</div>
                        {selectedStudent.enrollments?.[0] && (
                          <div className="text-xs text-green-600">
                            {selectedStudent.enrollments[0].subClass ?
                              `${selectedStudent.enrollments[0].subClass.class?.name} - ${selectedStudent.enrollments[0].subClass.name}` :
                              'No subclass assigned'
                            }
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setStudentSearchTerm('');
                          setFormData({ ...formData, enrollment_id: '' });
                        }}
                        className="text-green-600 hover:text-green-800 text-xs"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Type *
                </label>
                <select
                  value={formData.issue_type}
                  onChange={(e) => setFormData({ ...formData, issue_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {issueTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the incident..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional information..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedStudent(null);
                  setStudentSearchTerm('');
                  setStudentSearchResults([]);
                  setFormData({
                    enrollment_id: '',
                    issue_type: 'MISCONDUCT',
                    description: '',
                    notes: ''
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateIssue}
                disabled={submitting || !selectedStudent || !formData.description}
              >
                {submitting ? 'Recording...' : 'Record Issue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Details Modal */}
      {showIssueModal && selectedIssue && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Issue Details</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student</label>
                  <p className="text-sm text-gray-900">{selectedIssue.student?.name || 'Unknown Student'}</p>
                  <p className="text-xs text-gray-500">{selectedIssue.student?.matricule || 'No Matricule'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Class</label>
                  <p className="text-sm text-gray-900">
                    {selectedIssue.subClass?.class?.name || 'Unknown Class'} - {selectedIssue.subClass?.name || 'Unknown Subclass'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Issue Type</label>
                <Badge
                  variant="solid"
                  color={getIssueTypeColor(selectedIssue.issueType)}
                  size="sm"
                  className="mt-1"
                >
                  {getIssueTypeLabel(selectedIssue.issueType)}
                </Badge>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900 mt-1">{selectedIssue.description}</p>
              </div>

              {selectedIssue.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedIssue.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reported By</label>
                  <p className="text-sm text-gray-900">{selectedIssue.assignedBy?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedIssue.createdAt)} at {formatTime(selectedIssue.createdAt)}
                  </p>
                </div>
              </div>

              {selectedIssue.reviewedBy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reviewed By</label>
                  <p className="text-sm text-gray-900">{selectedIssue.reviewedBy.name}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowIssueModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 