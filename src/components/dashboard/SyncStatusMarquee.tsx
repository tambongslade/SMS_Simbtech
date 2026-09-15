'use client';

// Mobile-only strip showing "Last data sync: <time>", visible under the top
// nav bar for SUPER_MANAGER only -- data sync is a super-manager-only concern
// (see /dashboard/super-manager/data-sync), so no other role needs it taking
// up space on a small screen. Desktop has room for the full Data Sync page
// and doesn't need a persistent reminder.
//
// Polls GET /system/sync/status on the same cadence as AUTO_SYNC_INTERVAL
// (60s) so the banner doesn't drift far from the real last-sync time. Bumps
// --app-header-height while mounted so fixed-position siblings (sidebar,
// chat panel) that anchor off that variable clear the extra bar instead of
// being covered by it.

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/context/AuthContext';
import { useLanguage } from '@/components/context/LanguageContext';
import apiService from '@/lib/apiService';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface SyncStatusResponse {
  lastSync: { endTime: string | null; startTime: string; status: string } | null;
  isOnline: boolean;
}

const BAR_HEIGHT = '1.75rem';
const POLL_MS = 60_000;

const relativeTime = (iso: string): string => {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};

export default function SyncStatusMarquee() {
  const { selectedRole } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);

  const visible = selectedRole === 'SUPER_MANAGER';

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const load = () => {
      apiService
        .get<{ success: boolean; data: SyncStatusResponse }>('/system/sync/status')
        .then((res: any) => {
          if (cancelled) return;
          setStatus(res?.data ?? null);
        })
        .catch(() => {
          // Non-fatal -- the marquee just stays on its last known value (or
          // blank on first load). No toast; this is a passive status strip.
        });
    };

    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [visible]);

  // Grow the shared header-height variable while this bar occupies space, so
  // the sidebar/content below don't slide under it. Reset on unmount/hide.
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--app-header-height');
    root.style.setProperty('--app-header-height', `calc(4rem + var(--safe-top) + ${BAR_HEIGHT})`);
    return () => {
      if (previous) root.style.setProperty('--app-header-height', previous);
      else root.style.removeProperty('--app-header-height');
    };
  }, [visible]);

  if (!visible) return null;

  const lastSync = status?.lastSync;
  const label = lastSync
    ? `${t('Last data sync')}: ${relativeTime(lastSync.endTime ?? lastSync.startTime)}`
    : `${t('Last data sync')}: ${t('never')}`;
  const text = `${label}  •  ${status?.isOnline === false ? t('offline') : t('online')}`;

  return (
    <div
      className="lg:hidden fixed w-full z-20 overflow-hidden bg-blue-900 text-white text-xs"
      style={{ top: 'var(--safe-top)', marginTop: '4rem', height: BAR_HEIGHT }}
    >
      <div className="flex items-center h-full">
        <ArrowPathIcon className="h-3 w-3 ml-2 mr-2 flex-shrink-0 opacity-80" aria-hidden="true" />
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          {/* Two back-to-back copies in one flex row, translated by exactly
              -50% of the row's own width -- the point where copy #2 lines up
              where copy #1 started, so the loop has no visible seam. */}
          <div className="flex w-max animate-marquee">
            <span className="pr-12">{text}</span>
            <span className="pr-12" aria-hidden="true">{text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
