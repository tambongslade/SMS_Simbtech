interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  variant?: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded';
  size?: 'sm' | 'md' | 'lg';
  defaultIndex?: number;
  onChange?: (index: number) => void;
  className?: string;
}

const variants = {
  line: {
    list: 'border-b border-gray-200',
    tab: {
      base: 'border-b-2 border-transparent',
      active: 'border-blue-500 text-blue-600',
      inactive: 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
    },
  },
  enclosed: {
    list: 'border-b border-gray-200',
    tab: {
      base: 'border-t border-l border-r rounded-t-lg -mb-px',
      active: 'border-gray-200 bg-white border-b-white text-blue-600',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 bg-gray-50',
    },
  },
  'soft-rounded': {
    list: '',
    tab: {
      base: 'rounded-full',
      active: 'bg-blue-100 text-blue-700',
      inactive: 'text-gray-500 hover:text-gray-700',
    },
  },
  'solid-rounded': {
    list: 'bg-gray-100 p-1 rounded-lg',
    tab: {
      base: 'rounded-md',
      active: 'bg-white text-gray-700 shadow',
      inactive: 'text-gray-500 hover:text-gray-700',
    },
  },
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Tabs({
  tabs,
  variant = 'line',
  size = 'md',
  defaultIndex = 0,
  onChange,
  className = '',
}: TabsProps) {
  const [activeIndex, setActiveIndex] = React.useState(defaultIndex);

  const handleTabClick = (index: number) => {
    if (tabs[index].disabled) return;
    setActiveIndex(index);
    onChange?.(index);
  };

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        role="tablist"
        className={`flex ${variants[variant].list}`}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`tabpanel-${tab.id}`}
            disabled={tab.disabled}
            onClick={() => handleTabClick(index)}
            className={`
              relative
              ${variants[variant].tab.base}
              ${sizes[size]}
              ${
                activeIndex === index
                  ? variants[variant].tab.active
                  : variants[variant].tab.inactive
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              transition-colors duration-200
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {tabs.map((tab, index) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`tabpanel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeIndex !== index}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TabPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ children, className = '' }: TabPanelProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div className={`flex ${className}`}>
      {children}
    </div>
  );
}

interface TabProps {
  children: React.ReactNode;
  isSelected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Tab({
  children,
  isSelected = false,
  disabled = false,
  onClick,
  className = '',
}: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium
        ${isSelected
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
} 