'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserGroupIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
}

export default function ReportsPage() {
  const { user, currentAcademicYear } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'daily-summary',
      name: 'Daily Discipline Summary',
      description: 'Summary of all discipline incidents for a specific day',
      type: 'daily'
    },
    {
      id: 'weekly-trends',
      name: 'Weekly Trends Analysis',
      description: 'Weekly discipline trends and patterns',
      type: 'weekly'
    },
    {
      id: 'monthly-comprehensive',
      name: 'Monthly Comprehensive Report',
      description: 'Detailed monthly analysis with statistics and insights',
      type: 'monthly'
    },
    {
      id: 'custom-range',
      name: 'Custom Date Range Report',
      description: 'Generate reports for any custom date range',
      type: 'custom'
    }
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast.error('Please select a report type');
      return;
    }

    if (selectedReport === 'custom-range' && (!startDate || !endDate)) {
      toast.error('Please select start and end dates for custom report');
      return;
    }

    if (!currentAcademicYear?.id) {
      toast.error('Please select an academic year to generate reports.');
      return;
    }

    try {
      setLoading(true);

      let params: any = {
        academicYearId: currentAcademicYear?.id,
        reportType: selectedReport
      };

      if (selectedReport === 'custom-range') {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (selectedReport === 'daily-summary') {
        params.startDate = startDate || new Date().toISOString().split('T')[0];
        params.endDate = startDate || new Date().toISOString().split('T')[0];
      }

      let queryParams = new URLSearchParams(params).toString();
      let endpoint = `/discipline-master/reports`;
      if (queryParams) {
        endpoint += `?${queryParams}`;
      }

      const response = await apiService.get(endpoint);

      setReportData(response.data);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) {
      toast.error('No report data available to download');
      return;
    }

    const reportText = JSON.stringify(reportData, null, 2);
    const blob = new Blob([reportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discipline-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Report downloaded');
  };

  const renderExecutiveSummary = (summary: any) => {
    if (!summary) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-700">Active Issues</p>
              <p className="text-2xl font-bold text-blue-900">{summary.totalActiveIssues || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-700">Students Affected</p>
              <p className="text-2xl font-bold text-green-900">{summary.studentsWithIssues || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-700">Behavior Score</p>
              <p className="text-2xl font-bold text-yellow-900">{summary.behaviorScore || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-700">Critical Cases</p>
              <p className="text-2xl font-bold text-red-900">{summary.criticalCases || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-700">Resolution Rate</p>
              <p className="text-2xl font-bold text-purple-900">{summary.resolutionRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderIssuesByType = (issues: any[]) => {
    if (!issues || !Array.isArray(issues)) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.map((issue, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-900">{issue.type?.replace('_', ' ')}</h4>
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                {issue.count} cases
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Trend: <span className="font-medium">{issue.trend}</span></p>
              <p>Resolution Rate: <span className="font-medium">{issue.resolutionRate}%</span></p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUrgentInterventions = (interventions: any[]) => {
    if (!interventions || !Array.isArray(interventions)) return null;

    return (
      <div className="space-y-3">
        {interventions.map((intervention, index) => (
          <div key={index} className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900">{intervention.studentName}</h4>
                <p className="text-sm text-gray-600">Student ID: {intervention.studentId}</p>
                <p className="text-sm text-gray-600">Issue Count: {intervention.issueCount}</p>
                <p className="text-sm text-gray-600">Last Incident: {new Date(intervention.lastIncident).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${intervention.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                  intervention.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                }`}>
                {intervention.riskLevel} Risk
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-2">{intervention.recommendedAction}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderClassroomHotspots = (hotspots: any[]) => {
    if (!hotspots || !Array.isArray(hotspots)) return null;

    const activeHotspots = hotspots.filter(h => h.incidentCount > 0);

    return (
      <div className="space-y-3">
        {activeHotspots.map((hotspot, index) => (
          <div key={index} className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-gray-900">{hotspot.className} - {hotspot.subClassName}</h4>
                <p className="text-sm text-gray-600">Risk Score: {hotspot.riskScore}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {hotspot.primaryIssues?.map((issue: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      {issue.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                {hotspot.incidentCount} incidents
              </span>
            </div>
          </div>
        ))}
        {activeHotspots.length === 0 && (
          <p className="text-gray-500 text-center py-4">No classroom hotspots identified.</p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discipline Reports</h1>
          <p className="text-gray-600 mt-1">
            Generate and view discipline reports for {currentAcademicYear?.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Generation */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Generate Report
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type
                  </label>
                  <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a report type</option>
                    {reportTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {selectedReport && (
                    <p className="text-sm text-gray-600 mt-1">
                      {reportTemplates.find(t => t.id === selectedReport)?.description}
                    </p>
                  )}
                </div>

                {(selectedReport === 'daily-summary' || selectedReport === 'custom-range') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedReport === 'daily-summary' ? 'Date' : 'Start Date'}
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    {selectedReport === 'custom-range' && (
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
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleGenerateReport}
                    isLoading={loading}
                    className="flex items-center gap-2"
                  >
                    <DocumentTextIcon className="h-4 w-4" />
                    Generate Report
                  </Button>

                  {reportData && (
                    <Button
                      onClick={handleDownloadReport}
                      color="secondary"
                      className="flex items-center gap-2"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Reports */}
        <div>
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Reports
              </h3>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2 justify-start"
                  onClick={() => {
                    setSelectedReport('daily-summary');
                    setStartDate(new Date().toISOString().split('T')[0]);
                  }}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Today's Summary
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2 justify-start"
                  onClick={() => {
                    setSelectedReport('weekly-trends');
                  }}
                >
                  <ChartBarIcon className="h-4 w-4" />
                  This Week's Trends
                </Button>

                <Button
                  variant="outline"
                  className="w-full flex items-center gap-2 justify-start"
                  onClick={() => {
                    setSelectedReport('monthly-comprehensive');
                  }}
                >
                  <ClipboardDocumentListIcon className="h-4 w-4" />
                  Monthly Report
                </Button>
              </div>

              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Report Templates</h4>
                <div className="space-y-2">
                  {reportTemplates.map((template) => (
                    <div key={template.id} className="p-2 bg-gray-50 rounded text-xs">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-gray-600">{template.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Report Display */}
      {reportData && (
        <div className="space-y-6">
          {/* Report Information */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Report Results</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Period:</span>
                    <span className="ml-2">{reportData.reportInfo?.period || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Generated:</span>
                    <span className="ml-2">{new Date().toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Academic Year:</span>
                    <span className="ml-2">{currentAcademicYear?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Executive Summary */}
          {reportData.executiveSummary && (
            <Card>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h4>
                {renderExecutiveSummary(reportData.executiveSummary)}
              </div>
            </Card>
          )}

          {/* Detailed Analysis */}
          {reportData.detailedAnalysis && (
            <div className="space-y-6">
              {/* Issues by Type */}
              {reportData.detailedAnalysis.dashboard?.issuesByType && (
                <Card>
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Issues by Type</h4>
                    {renderIssuesByType(reportData.detailedAnalysis.dashboard.issuesByType)}
                  </div>
                </Card>
              )}

              {/* Urgent Interventions */}
              {reportData.detailedAnalysis.dashboard?.urgentInterventions && (
                <Card>
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Students Requiring Urgent Interventions</h4>
                    {renderUrgentInterventions(reportData.detailedAnalysis.dashboard.urgentInterventions)}
                  </div>
                </Card>
              )}

              {/* Classroom Hotspots */}
              {reportData.detailedAnalysis.behavioralAnalytics?.classroomHotspots && (
                <Card>
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Classroom Hotspots</h4>
                    {renderClassroomHotspots(reportData.detailedAnalysis.behavioralAnalytics.classroomHotspots)}
                  </div>
                </Card>
              )}

              {/* Early Warning System */}
              {reportData.detailedAnalysis.earlyWarning?.criticalStudents && (
                <Card>
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Critical Students (Early Warning)</h4>
                    <div className="space-y-4">
                      {reportData.detailedAnalysis.earlyWarning.criticalStudents.map((student: any, index: number) => (
                        <div key={index} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-gray-900">{student.studentName}</h5>
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              {student.warningLevel}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 space-y-2">
                            <div>
                              <span className="font-medium">Risk Factors:</span>
                              <ul className="list-disc list-inside ml-4">
                                {student.riskFactors?.map((factor: string, idx: number) => (
                                  <li key={idx}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium">Trigger Events:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {student.triggerEvents?.map((event: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                    {event.replace('_', ' ')}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Recommended Actions:</span>
                              <ul className="list-disc list-inside ml-4">
                                {student.recommendedActions?.map((action: string, idx: number) => (
                                  <li key={idx}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Recommendations */}
          {reportData.recommendations && (
            <Card>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  {Array.isArray(reportData.recommendations) ? (
                    <ul className="list-disc list-inside space-y-2">
                      {reportData.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700">{JSON.stringify(reportData.recommendations)}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Action Items */}
          {reportData.actionItems && (
            <Card>
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Action Items</h4>
                <div className="space-y-3">
                  {reportData.actionItems.map((item: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${item.priority === 'HIGH' ? 'border-red-500 bg-red-50' :
                        item.priority === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                          'border-green-500 bg-green-50'
                      }`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${item.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            item.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                          }`}>
                          {item.priority} Priority
                        </span>
                        <span className="text-sm text-gray-600">Due: {item.deadline}</span>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-1">{item.action}</h5>
                      <p className="text-sm text-gray-700">Responsible: {item.responsible}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}