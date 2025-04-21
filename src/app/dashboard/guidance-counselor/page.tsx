'use client'
import { UserGroupIcon, AcademicCapIcon, ClipboardDocumentCheckIcon, ShieldExclamationIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { StatsCard, Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import Link from 'next/link';

const stats = [
  {
    title: 'Total Students',
    value: '200',
    icon: UserGroupIcon,
    color: 'primary' as const
  },
  {
    title: 'Remarks Added',
    value: '50',
    icon: ClipboardDocumentCheckIcon,
    color: 'success' as const
  },
  {
    title: 'Behavior Issues',
    value: '10',
    icon: ShieldExclamationIcon,
    color: 'warning' as const
  },
  {
    title: 'At-Risk Students',
    value: '15',
    icon: AcademicCapIcon,
    color: 'danger' as const
  }
];

// Mock data for recent activities
const recentActivities = [
  { id: 1, type: 'remark', student: 'Ethan Hunt', content: 'Missing multiple assignments. Parents contacted.', date: '2025-02-15', severity: 'High' },
  { id: 2, type: 'behavior', student: 'Charlie Brown', content: 'Disruptive in class. Had a conversation about respect for others.', date: '2025-02-12', severity: 'Medium' },
  { id: 3, type: 'remark', student: 'Alice Johnson', content: 'Excellent progress in science class. Considering advanced placement.', date: '2025-02-20', severity: 'Low' },
  { id: 4, type: 'behavior', student: 'Ethan Hunt', content: 'Involved in a conflict with another student. Mediation session conducted.', date: '2025-02-18', severity: 'High' },
];

// Mock data for at-risk students
const atRiskStudents = [
  { id: '002', name: 'Bob Smith', class: 'Form 2', issue: 'Academic Risk', details: 'Struggling with mathematics' },
  { id: '005', name: 'Ethan Hunt', class: 'Form 2', issue: 'Behavioral & Academic', details: 'Multiple behavior incidents and missing assignments' },
  { id: '003', name: 'Charlie Brown', class: 'Form 1 North', issue: 'Behavioral', details: 'Disruptive behavior in multiple classes' },
];

export default function GuidanceCounselorDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Guidance Counselor Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome to the Guidance Counselor dashboard. Here you can manage student remarks, monitor behavior, and track student performance.
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/guidancecounselor/students">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardBody className="flex flex-col items-center text-center p-6">
              <div className="bg-blue-100 p-3 rounded-full mb-4">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-bold mb-2">Student Management</CardTitle>
              <p className="text-gray-600 mb-4">View and manage student profiles, academic and behavioral status</p>
              <div className="mt-auto">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Manage Students
                </Button>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/guidancecounselor/remarks">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardBody className="flex flex-col items-center text-center p-6">
              <div className="bg-green-100 p-3 rounded-full mb-4">
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-lg font-bold mb-2">Student Remarks</CardTitle>
              <p className="text-gray-600 mb-4">Add and manage remarks for student academic and behavioral progress</p>
              <div className="mt-auto">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Manage Remarks
                </Button>
              </div>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/guidancecounselor/behavior">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardBody className="flex flex-col items-center text-center p-6">
              <div className="bg-yellow-100 p-3 rounded-full mb-4">
                <ShieldExclamationIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-lg font-bold mb-2">Behavior Monitoring</CardTitle>
              <p className="text-gray-600 mb-4">Track and manage student behavior incidents and interventions</p>
              <div className="mt-auto">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  Monitor Behavior
                </Button>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Activity and At-Risk Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
          </CardHeader>
          <CardBody className="px-0">
            <div className="max-h-[400px] overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {recentActivities.map((activity) => (
                  <li key={activity.id} className="px-4 py-3">
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 p-1 rounded-full ${
                        activity.type === 'remark' ? 'bg-blue-100' : 'bg-yellow-100'
                      }`}>
                        {activity.type === 'remark' ? (
                          <ClipboardDocumentCheckIcon className="h-5 w-5 text-blue-600" />
                        ) : (
                          <ShieldExclamationIcon className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {activity.student}
                          </p>
                          <p className="text-xs text-gray-500">{activity.date}</p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.content}</p>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activity.severity === 'Low' ? 'bg-green-100 text-green-800' :
                            activity.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activity.severity} Severity
                          </span>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {activity.type === 'remark' ? 'Remark' : 'Behavior Incident'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <Link href="/dashboard/guidancecounselor/remarks">
                <Button className="w-full bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 flex items-center justify-center">
                  <span>View All Activity</span>
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* At-Risk Students */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">At-Risk Students</CardTitle>
          </CardHeader>
          <CardBody className="px-0">
            <div className="max-h-[400px] overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {atRiskStudents.map((student) => (
                  <li key={student.id} className="px-4 py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-500">ID: {student.id} | {student.class}</p>
                        <p className="text-sm text-gray-600 mt-1">{student.details}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.issue.includes('Academic') && student.issue.includes('Behavioral') ? 'bg-red-100 text-red-800' :
                          student.issue.includes('Academic') ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {student.issue}
                        </span>
                        <div className="mt-2 space-x-2">
                          <Link href={`/dashboard/guidancecounselor/remarks?studentId=${student.id}`}>
                            <Button className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                              Remarks
                            </Button>
                          </Link>
                          <Link href={`/dashboard/guidancecounselor/behavior?studentId=${student.id}`}>
                            <Button className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white">
                              Behavior
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <Link href="/dashboard/guidancecounselor/students">
                <Button className="w-full bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 flex items-center justify-center">
                  <span>View All Students</span>
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
} 