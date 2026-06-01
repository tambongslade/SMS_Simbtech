'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { StudentPhoto } from '@/components/ui';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  EyeIcon,
  FlagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface StudentProfile {
  studentId: number;
  studentName: string;
  matricule: string;
  className: string;
  subClassName: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  behaviorScore: number;
  totalIncidents: number;
  recentIncidents: number;
  photo?: string | null;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  interventionsReceived: number;
  lastIncidentDate: string;
  behaviorPattern: {
    mostCommonIssues: string[];
    triggerFactors: string[];
    improvementAreas: string[];
    strengths: string[];
  };
  interventionHistory: Array<{
    date: string;
    type: string;
    outcome: string;
  }>;
  recommendedActions: string[];
}

export default function StudentsPage() {
  const { user, selectedAcademicYear } = useAuth();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const riskLevels = ['HIGH', 'MEDIUM', 'LOW'];

  useEffect(() => {
    if (selectedAcademicYear?.id) {
      fetchStudents();
    }
  }, [selectedAcademicYear?.id]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, selectedRiskLevel, selectedClass]);

  const fetchStudents = async () => {
    try {
      setLoading(true);

      // First get behavioral analytics to identify students with issues
      const analyticsResponse = await apiService.get('/discipline-master/behavioral-analytics', {
        params: { academicYearId: selectedAcademicYear?.id }
      });

      // Then get student profiles (this would need to be implemented in the API)
      // For now, we'll create mock data based on the analytics
      const mockStudents: StudentProfile[] = [
        {
          studentId: 101,
          studentName: 'Alice Brown',
          matricule: 'STU2024015',
          className: 'Form 3',
          subClassName: 'Form 3A',
          riskLevel: 'HIGH',
          behaviorScore: 70,
          totalIncidents: 5,
          recentIncidents: 3,
          interventionsReceived: 2,
          lastIncidentDate: '2024-01-22',
          behaviorPattern: {
            mostCommonIssues: ['Lateness', 'Misconduct'],
            triggerFactors: ['Morning tardiness', 'Peer influence'],
            improvementAreas: ['Punctuality', 'Class participation'],
            strengths: ['Academic performance', 'Sports participation']
          },
          interventionHistory: [
            { date: '2024-01-15', type: 'Counseling', outcome: 'In Progress' },
            { date: '2024-01-10', type: 'Parent Meeting', outcome: 'Successful' }
          ],
          recommendedActions: [
            'Continue weekly counseling sessions',
            'Monitor morning arrival',
            'Engage in positive peer activities'
          ]
        },
        {
          studentId: 102,
          studentName: 'David Jones',
          matricule: 'STU2024023',
          className: 'Form 4',
          subClassName: 'Form 4B',
          riskLevel: 'MEDIUM',
          behaviorScore: 82,
          totalIncidents: 3,
          recentIncidents: 1,
          interventionsReceived: 1,
          lastIncidentDate: '2024-01-20',
          behaviorPattern: {
            mostCommonIssues: ['Class disruption'],
            triggerFactors: ['Boredom', 'Attention seeking'],
            improvementAreas: ['Focus', 'Respectful communication'],
            strengths: ['Leadership qualities', 'Creative thinking']
          },
          interventionHistory: [
            { date: '2024-01-18', type: 'Teacher Conference', outcome: 'Successful' }
          ],
          recommendedActions: [
            'Assign leadership responsibilities',
            'Provide challenging academic work',
            'Channel energy into positive activities'
          ]
        },
        {
          studentId: 103,
          studentName: 'Sarah Williams',
          matricule: 'STU2024031',
          className: 'Form 2',
          subClassName: 'Form 2C',
          riskLevel: 'LOW',
          behaviorScore: 92,
          totalIncidents: 1,
          recentIncidents: 0,
          interventionsReceived: 0,
          lastIncidentDate: '2024-01-05',
          behaviorPattern: {
            mostCommonIssues: ['Minor uniform issue'],
            triggerFactors: ['Family circumstances'],
            improvementAreas: ['Consistency'],
            strengths: ['Academic excellence', 'Peer relationships', 'Responsible behavior']
          },
          interventionHistory: [],
          recommendedActions: [
            'Continue positive reinforcement',
            'Monitor for any changes'
          ]
        }
      ];

      setStudents(mockStudents);
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...students];

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.matricule.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRiskLevel) {
      filtered = filtered.filter(student => student.riskLevel === selectedRiskLevel);
    }

    if (selectedClass) {
      filtered = filtered.filter(student =>
        student.className.toLowerCase().includes(selectedClass.toLowerCase()) ||
        student.subClassName.toLowerCase().includes(selectedClass.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'red';
      case 'MEDIUM':
        return 'yellow';
      case 'LOW':
        return 'green';
      default:
        return 'gray';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Student Behavioral Tracking</h1>
          <p className="text-gray-600 mt-1">
            Monitor and track student behavioral patterns for {selectedAcademicYear?.name}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {students.filter(s => s.riskLevel === 'HIGH').length}
                </p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {students.filter(s => s.riskLevel === 'MEDIUM').length}
                </p>
              </div>
              <FlagIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Risk</p>
                <p className="text-2xl font-bold text-green-600">
                  {students.filter(s => s.riskLevel === 'LOW').length}
                </p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Students
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search by name or matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk Level
              </label>
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Risk Levels</option>
                {riskLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <Input
                type="text"
                placeholder="Filter by class..."
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              color="secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedRiskLevel('');
                setSelectedClass('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Students List */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Student Profiles ({filteredStudents.length})
            </h3>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map((student) => (
                <div key={student.studentId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-gray-900">{student.studentName}</h4>
                        <Badge variant="outline" size="sm">
                          {student.matricule}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {student.className} - {student.subClassName}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Behavior Score</p>
                          <p className="font-medium">{student.behaviorScore}/100</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Incidents</p>
                          <p className="font-medium">{student.totalIncidents}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Recent Incidents</p>
                          <p className="font-medium">{student.recentIncidents}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Last Incident</p>
                          <p className="font-medium">
                            {student.lastIncidentDate ? formatDate(student.lastIncidentDate) : 'None'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant="solid"
                        color={getRiskColor(student.riskLevel)}
                        size="sm"
                      >
                        {student.riskLevel} RISK
                      </Badge>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowModal(true);
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Student Profile Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              Student Behavioral Profile - {selectedStudent.studentName}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Basic Information</h3>
                  <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedStudent.studentName}</p>
                    <p><span className="font-medium">Matricule:</span> {selectedStudent.matricule}</p>
                    <p><span className="font-medium">Class:</span> {selectedStudent.className} - {selectedStudent.subClassName}</p>
                    <p><span className="font-medium">Risk Level:</span>
                      <Badge variant="solid" color={getRiskColor(selectedStudent.riskLevel)} size="sm" className="ml-1">
                        {selectedStudent.riskLevel}
                      </Badge>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Behavior Pattern</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-red-600">Most Common Issues:</p>
                      <p>{selectedStudent.behaviorPattern.mostCommonIssues.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-600">Trigger Factors:</p>
                      <p>{selectedStudent.behaviorPattern.triggerFactors.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-600">Improvement Areas:</p>
                      <p>{selectedStudent.behaviorPattern.improvementAreas.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-600">Strengths:</p>
                      <p>{selectedStudent.behaviorPattern.strengths.join(', ')}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Recommended Actions</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedStudent.recommendedActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Statistics</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="font-medium">Behavior Score</p>
                      <p className="text-lg font-bold text-blue-600">{selectedStudent.behaviorScore}/100</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="font-medium">Total Incidents</p>
                      <p className="text-lg font-bold text-red-600">{selectedStudent.totalIncidents}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="font-medium">Recent Incidents</p>
                      <p className="text-lg font-bold text-orange-600">{selectedStudent.recentIncidents}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="font-medium">Interventions</p>
                      <p className="text-lg font-bold text-green-600">{selectedStudent.interventionsReceived}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Intervention History</h3>
                  {selectedStudent.interventionHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">No interventions recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedStudent.interventionHistory.map((intervention, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{intervention.type}</p>
                              <p className="text-gray-600">{formatDate(intervention.date)}</p>
                            </div>
                            <Badge
                              variant="outline"
                              size="sm"
                              color={intervention.outcome === 'Successful' ? 'green' : 'yellow'}
                            >
                              {intervention.outcome}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                color="secondary"
                onClick={() => setShowModal(false)}
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