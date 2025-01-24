'use client';

import { UserGroupIcon } from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value: number;
    isUpward: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
}

export function StatsCard({ title, value, icon: Icon, trend, color }: StatsCardProps) {
  const colorStyles = {
    primary: 'bg-blue-50 text-blue-600',
    secondary: 'bg-purple-50 text-purple-600',
    success: 'bg-green-50 text-green-600',
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${
            trend.isUpward ? 'text-green-600' : 'text-red-600'
          }`}>
            <span>{trend.value}%</span>
            <svg
              className={`w-4 h-4 ${trend.isUpward ? 'rotate-0' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
        )}
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default StatsCard; 