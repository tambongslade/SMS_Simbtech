'use client';

import Link from 'next/link';
import {
  ArrowRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  SparklesIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

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

const colorStyles: Record<QuickActionColor, { chip: string; ring: string; doodle: string }> = {
  blue: { chip: 'bg-blue-50 text-blue-600', ring: 'hover:border-blue-400', doodle: 'text-blue-100' },
  green: { chip: 'bg-green-50 text-green-600', ring: 'hover:border-green-400', doodle: 'text-green-100' },
  purple: { chip: 'bg-purple-50 text-purple-600', ring: 'hover:border-purple-400', doodle: 'text-purple-100' },
  amber: { chip: 'bg-amber-50 text-amber-600', ring: 'hover:border-amber-400', doodle: 'text-amber-100' },
  rose: { chip: 'bg-rose-50 text-rose-600', ring: 'hover:border-rose-400', doodle: 'text-rose-100' },
  cyan: { chip: 'bg-cyan-50 text-cyan-600', ring: 'hover:border-cyan-400', doodle: 'text-cyan-100' },
  indigo: { chip: 'bg-indigo-50 text-indigo-600', ring: 'hover:border-indigo-400', doodle: 'text-indigo-100' },
  teal: { chip: 'bg-teal-50 text-teal-600', ring: 'hover:border-teal-400', doodle: 'text-teal-100' },
};

// Purely decorative wallpaper behind the grid -- a few oversized, near-invisible
// icons scattered around so the page doesn't read as a flat list of cards.
// Not tied to any one action; just texture.
const BACKGROUND_DOODLES: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; className: string }[] = [
  { icon: AcademicCapIcon, className: 'top-0 left-[6%] h-28 w-28 -rotate-12' },
  { icon: BookOpenIcon, className: 'top-[18%] right-[4%] h-24 w-24 rotate-6' },
  { icon: PencilSquareIcon, className: 'top-[46%] left-[2%] h-20 w-20 rotate-12' },
  { icon: ChatBubbleLeftRightIcon, className: 'bottom-[22%] right-[10%] h-24 w-24 -rotate-6' },
  { icon: CalendarDaysIcon, className: 'bottom-[4%] left-[14%] h-20 w-20 rotate-3' },
  { icon: SparklesIcon, className: 'top-[4%] right-[30%] h-14 w-14 rotate-12' },
  { icon: ClipboardDocumentListIcon, className: 'bottom-[10%] left-[42%] h-16 w-16 -rotate-6' },
  { icon: StarIcon, className: 'top-[60%] right-[2%] h-12 w-12 rotate-6' },
];

/**
 * Mobile-first launcher grid. Renders two tiles per row on phones and three on
 * larger screens, so a role can jump straight to any of its sections without the
 * sidebar.
 */
export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {BACKGROUND_DOODLES.map((d, i) => (
          <d.icon key={i} className={`absolute text-gray-400 opacity-[0.06] ${d.className}`} />
        ))}
      </div>

      <div className="relative grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {actions.map((action) => {
          const styles = colorStyles[action.color ?? 'blue'];
          return (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={`group relative flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 min-h-[112px] active:scale-[0.98] hover:shadow transition-all ${styles.ring}`}
            >
              {/* Doodle: the action's own icon, oversized and faint, tucked in the corner.
                  Reinforces what the button does rather than being generic decoration. */}
              <action.icon
                aria-hidden="true"
                className={`pointer-events-none absolute -right-3 -bottom-3 h-20 w-20 sm:h-24 sm:w-24 rotate-12 ${styles.doodle} opacity-70 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:-rotate-6 group-hover:scale-110 group-hover:animate-[doodle-wiggle_0.6s_ease-in-out]`}
              />

              <div className="relative flex items-start justify-between">
                <span className={`inline-flex items-center justify-center h-11 w-11 rounded-lg ${styles.chip}`}>
                  <action.icon className="h-6 w-6" />
                </span>
                <ArrowRightIcon className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="relative mt-3 font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                {action.label}
              </h3>
              {action.description && (
                <p className="relative text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">
                  {action.description}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default QuickActionGrid;
