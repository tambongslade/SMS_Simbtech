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

// Soft/strong hex pair per color, used for the hover "blink" (CSS custom
// properties, since Tailwind can't animate between two arbitrary utility
// classes -- only between real CSS values).
const colorStyles: Record<QuickActionColor, { chip: string; ring: string; doodle: string; soft: string; strong: string }> = {
  blue: { chip: 'bg-blue-50 text-blue-600', ring: 'hover:border-blue-400', doodle: 'text-blue-100', soft: '#bfdbfe', strong: '#3b82f6' },
  green: { chip: 'bg-green-50 text-green-600', ring: 'hover:border-green-400', doodle: 'text-green-100', soft: '#bbf7d0', strong: '#22c55e' },
  purple: { chip: 'bg-purple-50 text-purple-600', ring: 'hover:border-purple-400', doodle: 'text-purple-100', soft: '#e9d5ff', strong: '#a855f7' },
  amber: { chip: 'bg-amber-50 text-amber-600', ring: 'hover:border-amber-400', doodle: 'text-amber-100', soft: '#fde68a', strong: '#f59e0b' },
  rose: { chip: 'bg-rose-50 text-rose-600', ring: 'hover:border-rose-400', doodle: 'text-rose-100', soft: '#fecdd3', strong: '#f43f5e' },
  cyan: { chip: 'bg-cyan-50 text-cyan-600', ring: 'hover:border-cyan-400', doodle: 'text-cyan-100', soft: '#a5f3fc', strong: '#06b6d4' },
  indigo: { chip: 'bg-indigo-50 text-indigo-600', ring: 'hover:border-indigo-400', doodle: 'text-indigo-100', soft: '#c7d2fe', strong: '#6366f1' },
  teal: { chip: 'bg-teal-50 text-teal-600', ring: 'hover:border-teal-400', doodle: 'text-teal-100', soft: '#99f6e4', strong: '#14b8a6' },
};

// Purely decorative page wallpaper -- large soft color blobs plus a scatter of
// oversized icons, fixed to the viewport so it reads as actual background
// rather than something hiding behind the cards. Not tied to any one action.
const BACKGROUND_BLOBS = [
  'top-[-10%] left-[-6%] h-72 w-72 bg-blue-200',
  'top-[20%] right-[-8%] h-80 w-80 bg-amber-200',
  'bottom-[-12%] left-[18%] h-96 w-96 bg-purple-200',
  'bottom-[8%] right-[10%] h-64 w-64 bg-teal-200',
];

const BACKGROUND_DOODLES: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; className: string }[] = [
  { icon: AcademicCapIcon, className: 'top-[4%] left-[8%] h-28 w-28 -rotate-12' },
  { icon: BookOpenIcon, className: 'top-[14%] right-[6%] h-24 w-24 rotate-6' },
  { icon: PencilSquareIcon, className: 'top-[42%] left-[3%] h-20 w-20 rotate-12' },
  { icon: ChatBubbleLeftRightIcon, className: 'top-[60%] right-[12%] h-24 w-24 -rotate-6' },
  { icon: CalendarDaysIcon, className: 'bottom-[6%] left-[16%] h-20 w-20 rotate-3' },
  { icon: SparklesIcon, className: 'top-[2%] right-[32%] h-14 w-14 rotate-12' },
  { icon: ClipboardDocumentListIcon, className: 'bottom-[14%] left-[44%] h-16 w-16 -rotate-6' },
  { icon: StarIcon, className: 'top-[34%] right-[2%] h-12 w-12 rotate-6' },
  { icon: AcademicCapIcon, className: 'bottom-[30%] right-[40%] h-16 w-16 rotate-6' },
  { icon: BookOpenIcon, className: 'top-[76%] left-[6%] h-14 w-14 -rotate-12' },
];

/**
 * Mobile-first launcher grid. Renders two tiles per row on phones and three on
 * larger screens, so a role can jump straight to any of its sections without the
 * sidebar.
 */
export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="relative">
      {/* Page wallpaper: fixed to the viewport (not just the grid's own box) so it
          actually reads as a background, not a texture hiding behind the cards.
          z-0 (not a negative z-index): a `fixed` element with a negative z-index
          paints BEHIND an ordinary in-flow ancestor background (e.g. the page's own
          bg-gray-100 wrapper), which hid this entirely. z-0 keeps it in the
          "positioned, stacked at 0" paint step, which is above plain in-flow boxes
          but still below the grid's own z-10. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        {BACKGROUND_BLOBS.map((b, i) => (
          <div key={i} className={`absolute rounded-full opacity-25 blur-3xl ${b}`} />
        ))}
        {BACKGROUND_DOODLES.map((d, i) => (
          <d.icon key={i} className={`absolute text-gray-500 opacity-[0.12] ${d.className}`} />
        ))}
      </div>

      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {actions.map((action) => {
          const styles = colorStyles[action.color ?? 'blue'];
          return (
            <Link
              key={action.href + action.label}
              href={action.href}
              style={{ '--tile-soft': styles.soft, '--tile-strong': styles.strong } as React.CSSProperties}
              className={`group relative flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 min-h-[112px] active:scale-[0.98] hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.06] hover:z-10 transition-all duration-200 ${styles.ring} hover:animate-[tile-blink_0.4s_ease-in-out_1]`}
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
