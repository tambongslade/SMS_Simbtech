// Skeleton loaders — Apple-style: rounded, subtle shimmer, no layout jumps.
// Used across parent pages to replace generic spinners.
'use client';

import { FC } from 'react';

const base = 'animate-pulse rounded-2xl bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100';

export const SkeletonBlock: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`${base} ${className}`} />
);

export const SkeletonStat: FC = () => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-sm p-5">
    <SkeletonBlock className="h-3 w-24 mb-4" />
    <SkeletonBlock className="h-8 w-32 mb-3" />
    <SkeletonBlock className="h-2 w-full" />
  </div>
);

export const SkeletonCard: FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-sm p-6 space-y-3">
    <SkeletonBlock className="h-5 w-1/3" />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonBlock key={i} className="h-4 w-full" />
    ))}
  </div>
);

export const SkeletonGrid: FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStat key={i} />
    ))}
  </div>
);
