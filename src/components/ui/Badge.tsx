interface BadgeProps {
  children: React.ReactNode;
  variant?: 'solid' | 'subtle' | 'outline';
  color?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variants = {
  solid: {
    gray: 'bg-gray-100 text-gray-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
  },
  subtle: {
    gray: 'bg-gray-50 text-gray-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  },
  outline: {
    gray: 'border border-gray-300 text-gray-600',
    red: 'border border-red-300 text-red-600',
    yellow: 'border border-yellow-300 text-yellow-600',
    green: 'border border-green-300 text-green-600',
    blue: 'border border-blue-300 text-blue-600',
    purple: 'border border-purple-300 text-purple-600',
  },
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

export function Badge({
  children,
  variant = 'solid',
  color = 'gray',
  size = 'md',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant][color]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const statusConfig = {
  active: { color: 'green', text: 'Active' },
  inactive: { color: 'gray', text: 'Inactive' },
  pending: { color: 'yellow', text: 'Pending' },
  completed: { color: 'blue', text: 'Completed' },
  failed: { color: 'red', text: 'Failed' },
  warning: { color: 'yellow', text: 'Warning' },
} as const;

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="solid"
      color={config.color as BadgeProps['color']}
      size={size}
      className={`flex items-center gap-1.5 ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      {config.text}
    </Badge>
  );
} 