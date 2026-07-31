'use client';

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: {
    value?: number;
    isUpward: boolean;
  };
  color: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'neutral';
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, color }: StatsCardProps) {
  const colorStyles = {
    primary: 'bg-blue-50 text-blue-600',
    secondary: 'bg-purple-50 text-purple-600',
    success: 'bg-green-50 text-green-600',
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-yellow-50 text-yellow-600',
    neutral: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border border-gray-100 min-w-0">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorStyles[color]}`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${trend.isUpward ? 'text-green-600' : 'text-red-600'
            }`}>
            <span>{trend.value ? `${trend.value}%` : ''}</span>
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
      <h3 className="mt-2 sm:mt-4 text-xs sm:text-sm font-medium text-gray-500 truncate" title={title}>{title}</h3>
      {/* Long values (big FCFA amounts) get a smaller font and wrap so the full figure is always visible */}
      <p
        className={`mt-1 sm:mt-2 font-semibold text-gray-900 break-words ${
          value.length > 14
            ? 'text-base sm:text-xl'
            : value.length > 9
              ? 'text-lg sm:text-2xl'
              : 'text-xl sm:text-3xl'
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export default StatsCard; 