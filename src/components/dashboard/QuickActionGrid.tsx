'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export type QuickActionColor =
  | 'blue'
  | 'green'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'indigo'
  | 'teal';

export interface QuickAction {
  label: string;
  description?: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color?: QuickActionColor;
}

const colorStyles: Record<QuickActionColor, { chip: string; ring: string }> = {
  blue: { chip: 'bg-blue-50 text-blue-600', ring: 'hover:border-blue-400' },
  green: { chip: 'bg-green-50 text-green-600', ring: 'hover:border-green-400' },
  purple: { chip: 'bg-purple-50 text-purple-600', ring: 'hover:border-purple-400' },
  amber: { chip: 'bg-amber-50 text-amber-600', ring: 'hover:border-amber-400' },
  rose: { chip: 'bg-rose-50 text-rose-600', ring: 'hover:border-rose-400' },
  cyan: { chip: 'bg-cyan-50 text-cyan-600', ring: 'hover:border-cyan-400' },
  indigo: { chip: 'bg-indigo-50 text-indigo-600', ring: 'hover:border-indigo-400' },
  teal: { chip: 'bg-teal-50 text-teal-600', ring: 'hover:border-teal-400' },
};

/**
 * Mobile-first launcher grid. Renders two tiles per row on phones and three on
 * larger screens, so a role can jump straight to any of its sections without the
 * sidebar.
 */
export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {actions.map((action) => {
        const styles = colorStyles[action.color ?? 'blue'];
        return (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={`group flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 min-h-[112px] active:scale-[0.98] hover:shadow transition-all ${styles.ring}`}
          >
            <div className="flex items-start justify-between">
              <span className={`inline-flex items-center justify-center h-11 w-11 rounded-lg ${styles.chip}`}>
                <action.icon className="h-6 w-6" />
              </span>
              <ArrowRightIcon className="h-5 w-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <h3 className="mt-3 font-semibold text-gray-900 text-sm sm:text-base leading-tight">
              {action.label}
            </h3>
            {action.description && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                {action.description}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default QuickActionGrid;
