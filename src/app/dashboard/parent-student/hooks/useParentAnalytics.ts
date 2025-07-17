import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface StudentAnalytics {
  studentInfo: {
    id: number;
    name: string;
    classInfo: {
      className: string;
      subclassName: string;
    };
  };
  performanceAnalytics: {
    overallAverage: number;
    grade: string;
    classRank?: number;
    improvementTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
    subjectsAboveAverage: number;
    subjectsBelowAverage: number;
    recommendation: string;
  };
  attendanceAnalytics: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendanceRate: number;
    status: string;
    monthlyTrends: Array<{
      month: string;
      attendanceRate: number;
    }>;
  };
  quizAnalytics: {
    totalQuizzes: number;
    completedQuizzes: number;
    averageScore: number;
    highestScore: number;
    completionRate: number;
    recentQuizzes: Array<{
      id: number;
      subject: string;
      score: number;
      date: string;
    }>;
  };
  subjectTrends: Array<{
    subjectName: string;
    currentAverage: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
    bestMark: number;
    lowestMark: number;
    recommendedAction?: string;
  }>;
  comparativeAnalytics: {
    studentAverage: number;
    classAverage: number;
    aboveClassAverage: boolean;
    percentileRank?: number;
    subjectComparisons: Array<{
      subject: string;
      studentAverage: number;
      classAverage: number;
      rank: number;
    }>;
  };
  behavioralInsights?: {
    disciplineScore: number;
    punctualityScore: number;
    participationLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    socialInteraction: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT';
    recommendations: string[];
  };
}

export interface AnalyticsFilters {
  studentId?: number;
  academicYearId?: number;
  termId?: number;
  startDate?: string;
  endDate?: string;
  subjects?: string[];
  includeComparative?: boolean;
  includeBehavioral?: boolean;
}

export interface PerformanceTrend {
  period: string;
  average: number;
  rank?: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface SubjectAnalytics {
  subjectId: number;
  subjectName: string;
  teacherName: string;
  currentAverage: number;
  previousAverage: number;
  bestMark: number;
  worstMark: number;
  averageImprovement: number;
  classAverage: number;
  rank: number;
  totalStudents: number;
  recommendations: string[];
  recentMarks: Array<{
    date: string;
    mark: number;
    total: number;
    examType: string;
  }>;
}

export interface AttendanceInsights {
  currentRate: number;
  targetRate: number;
  improvement: number;
  lateArrivals: number;
  earlyDepartures: number;
  excusedAbsences: number;
  unexcusedAbsences: number;
  monthlyBreakdown: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    rate: number;
  }>;
  patterns: {
    mostAbsentDay: string;
    mostPresentDay: string;
    attendanceBySubject: Array<{
      subject: string;
      rate: number;
    }>;
  };
}

export function useParentAnalytics() {
  const [analytics, setAnalytics] = useState<{ [studentId: number]: StudentAnalytics }>({});
  const [performanceTrends, setPerformanceTrends] = useState<{ [studentId: number]: PerformanceTrend[] }>({});
  const [subjectAnalytics, setSubjectAnalytics] = useState<{ [studentId: number]: SubjectAnalytics[] }>({});
  const [attendanceInsights, setAttendanceInsights] = useState<{ [studentId: number]: AttendanceInsights }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch comprehensive student analytics
  const fetchAnalytics = useCallback(async (studentId: number, filters?: AnalyticsFilters) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const params = new URLSearchParams();
      if (filters?.academicYearId) params.append('academicYearId', filters.academicYearId.toString());
      if (filters?.termId) params.append('termId', filters.termId.toString());
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.subjects) params.append('subjects', filters.subjects.join(','));
      if (filters?.includeComparative) params.append('includeComparative', 'true');
      if (filters?.includeBehavioral) params.append('includeBehavioral', 'true');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch analytics.');
      }

      const result = await response.json();
      setAnalytics(prev => ({ ...prev, [studentId]: result.data }));
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    }
  }, []);

  // Fetch performance trends over time
  const fetchPerformanceTrends = useCallback(async (studentId: number, period = '6months') => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/trends?period=${period}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch performance trends.');
      }

      const result = await response.json();
      setPerformanceTrends(prev => ({ ...prev, [studentId]: result.data }));
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return [];
    }
  }, []);

  // Fetch detailed subject analytics
  const fetchSubjectAnalytics = useCallback(async (studentId: number, subjectId?: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const url = subjectId 
        ? `${API_BASE_URL}/parents/children/${studentId}/analytics/subjects/${subjectId}`
        : `${API_BASE_URL}/parents/children/${studentId}/analytics/subjects`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch subject analytics.');
      }

      const result = await response.json();
      
      if (subjectId) {
        // Single subject
        return result.data;
      } else {
        // All subjects
        setSubjectAnalytics(prev => ({ ...prev, [studentId]: result.data }));
        return result.data;
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return subjectId ? null : [];
    }
  }, []);

  // Fetch attendance insights
  const fetchAttendanceInsights = useCallback(async (studentId: number, period = 'current_term') => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/attendance?period=${period}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch attendance insights.');
      }

      const result = await response.json();
      setAttendanceInsights(prev => ({ ...prev, [studentId]: result.data }));
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    }
  }, []);

  // Get comparative class performance
  const getClassComparison = useCallback(async (studentId: number, subjectId?: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const params = new URLSearchParams();
      if (subjectId) params.append('subjectId', subjectId.toString());

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/class-comparison?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch class comparison.');
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    }
  }, []);

  // Generate performance report
  const generateReport = useCallback(async (studentId: number, reportType: 'COMPREHENSIVE' | 'ACADEMIC' | 'BEHAVIORAL' | 'ATTENDANCE') => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reportType }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report.');
      }

      const result = await response.json();
      toast.success('Report generated successfully');
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    }
  }, []);

  // Get learning recommendations
  const getLearningRecommendations = useCallback(async (studentId: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/recommendations`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch recommendations.');
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return [];
    }
  }, []);

  // Track analytics viewing
  const trackAnalyticsView = useCallback(async (studentId: number, section: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/parents/children/${studentId}/analytics/track-view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ section, timestamp: new Date().toISOString() }),
      });
    } catch (err: any) {
      // Silently fail for tracking
      console.error('Failed to track analytics view:', err);
    }
  }, []);

  // Set learning goals
  const setLearningGoals = useCallback(async (studentId: number, goals: Array<{
    subjectId: number;
    targetGrade: number;
    deadline: string;
    description: string;
  }>) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/goals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ goals }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set learning goals.');
      }

      const result = await response.json();
      toast.success('Learning goals set successfully');
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    }
  }, []);

  // Get goals progress
  const getGoalsProgress = useCallback(async (studentId: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/goals`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch goals progress.');
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return [];
    }
  }, []);

  // Export analytics data
  const exportAnalytics = useCallback(async (studentId: number, format: 'PDF' | 'EXCEL' | 'CSV' = 'PDF') => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/parents/children/${studentId}/analytics/export?format=${format}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export analytics.');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `student_analytics_${studentId}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Analytics exported successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    }
  }, []);

  return {
    analytics,
    performanceTrends,
    subjectAnalytics,
    attendanceInsights,
    isLoading,
    error,
    fetchAnalytics,
    fetchPerformanceTrends,
    fetchSubjectAnalytics,
    fetchAttendanceInsights,
    getClassComparison,
    generateReport,
    getLearningRecommendations,
    trackAnalyticsView,
    setLearningGoals,
    getGoalsProgress,
    exportAnalytics,
    refetch: (studentId: number) => fetchAnalytics(studentId)
  };
} 