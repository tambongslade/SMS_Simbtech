interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  className?: string;
}

const variants = {
  elevated: 'bg-white shadow-md hover:shadow-lg transition-shadow duration-200',
  outlined: 'bg-white border border-gray-200',
  filled: 'bg-gray-50',
};

export function Card({
  children,
  variant = 'elevated',
  className = '',
}: CardProps) {
  return (
    <div
      className={`
        rounded-lg overflow-hidden
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-medium text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`mt-1 text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isUpward: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  className = '',
}: StatCardProps) {
  return (
    <Card className={className}>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
            {trend && (
              <div className="mt-2 flex items-center text-sm">
                <span
                  className={`mr-2 ${
                    trend.isUpward ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.isUpward ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-gray-600">from last month</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-3 bg-gray-50 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
} 