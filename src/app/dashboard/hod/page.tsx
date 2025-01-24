import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  ChartBarIcon, 
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';

export default function HODDashboard() {
  const stats = [
    {
      title: 'Department Teachers',
      value: '24',
      icon: UserGroupIcon,
      trend: { value: 2, isUpward: true },
      color: 'blue' as const
    },
    {
      title: 'Classes Today',
      value: '12',
      icon: AcademicCapIcon,
      trend: { value: 0, isUpward: true },
      color: 'green' as const
    },
    {
      title: 'Average Performance',
      value: '78%',
      icon: ChartBarIcon,
      trend: { value: 5, isUpward: true },
      color: 'yellow' as const
    },
    {
      title: 'Pending Reviews',
      value: '8',
      icon: ClipboardDocumentListIcon,
      trend: { value: 2, isUpward: false },
      color: 'red' as const
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Head of Department Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Department Teachers</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">24</p>
          <p className="text-sm text-gray-500 mt-2">2 on leave</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Classes Today</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">18</p>
          <p className="text-sm text-gray-500 mt-2">All scheduled</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Average Performance</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">76%</p>
          <p className="text-sm text-gray-500 mt-2">+3% this term</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Pending Reviews</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">8</p>
          <p className="text-sm text-gray-500 mt-2">Teacher evaluations</p>
        </div>
      </div>

      {/* Department Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Class Performance</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Class 10 Science</span>
                <span className="text-sm font-medium text-gray-700">85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{width: '85%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Class 9 Science</span>
                <span className="text-sm font-medium text-gray-700">78%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '78%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Class 8 Science</span>
                <span className="text-sm font-medium text-gray-700">72%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-yellow-600 h-2.5 rounded-full" style={{width: '72%'}}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Schedule */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Physics - Class 10A</p>
                <p className="text-sm text-gray-500">Mr. Robert Wilson</p>
              </div>
              <span className="text-sm text-gray-600">8:00 AM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Chemistry - Class 9B</p>
                <p className="text-sm text-gray-500">Mrs. Sarah Parker</p>
              </div>
              <span className="text-sm text-gray-600">9:30 AM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-800">Biology - Class 8C</p>
                <p className="text-sm text-gray-500">Dr. James Miller</p>
              </div>
              <span className="text-sm text-gray-600">11:00 AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates and Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Updates</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="font-medium text-gray-800">Curriculum Review Meeting</p>
              <p className="text-sm text-gray-500">Scheduled for tomorrow at 2 PM</p>
              <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="font-medium text-gray-800">Lab Equipment Arrival</p>
              <p className="text-sm text-gray-500">New physics lab equipment received</p>
              <p className="text-xs text-gray-400 mt-1">3 hours ago</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="font-medium text-gray-800">Teacher Evaluation</p>
              <p className="text-sm text-gray-500">3 evaluations pending review</p>
              <p className="text-xs text-gray-400 mt-1">5 hours ago</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors">
              Schedule Meeting
            </button>
            <button className="p-4 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors">
              Review Reports
            </button>
            <button className="p-4 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors">
              Update Curriculum
            </button>
            <button className="p-4 bg-orange-50 rounded-lg text-orange-700 hover:bg-orange-100 transition-colors">
              Teacher Evaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 