'use client'

import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/context/LanguageContext';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { Card, CardHeader, CardTitle, CardBody, Button } from '@/components/ui';
import { ChildCard } from '../components/ChildCard';
import { ChildDetails } from '../components/ChildDetails';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  ExclamationCircleIcon,
  BellIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { fetchNotifications, ParentNotification, formatMoney, getSavedMatricules } from '@/lib/parentPortalApi';

type StatColor = 'primary' | 'success' | 'danger' | 'warning' | 'secondary';

const COLOR_STYLES: Record<StatColor, { bg: string; icon: string; ring: string }> = {
  primary:   { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'ring-blue-100' },
  success:   { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  danger:    { bg: 'bg-rose-50',    icon: 'text-rose-600',    ring: 'ring-rose-100' },
  warning:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'ring-amber-100' },
  secondary: { bg: 'bg-slate-50',   icon: 'text-slate-600',   ring: 'ring-slate-100' },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.round(days / 30);
  return `${months} mo ago`;
}

function StatSkeleton() {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur border border-slate-100 p-5 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-20 bg-slate-100 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>
      </div>
    </div>
  );
}

function ChildCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur border border-slate-100 p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-slate-100 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="h-8 bg-slate-100 rounded" />
            <div className="h-8 bg-slate-100 rounded" />
            <div className="h-8 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParentStudentDashboard() {
  const { t } = useLanguage();
  const { data, isLoading, error, refetch } = useParentDashboard();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedMatricule, setSelectedMatricule] = useState<string | null>(null);
  const [activity, setActivity] = useState<ParentNotification[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const openChild = (childId: number) => {
    const child = data?.children.find(c => c.id === childId);
    setSelectedChildId(childId);
    setSelectedMatricule(child?.matricule || null);
  };

  // Load real activity from notifications across all matricules.
  useEffect(() => {
    const matricules = getSavedMatricules();
    if (matricules.length === 0) {
      setActivity([]);
      return;
    }
    setActivityLoading(true);
    Promise.all(matricules.map(m => fetchNotifications(m, 1, 5).catch(() => ({ items: [], meta: {} }))))
      .then(results => {
        const merged = results
          .flatMap(r => r?.items || [])
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);
        setActivity(merged);
      })
      .finally(() => setActivityLoading(false));
  }, [data?.totalChildren]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-white shadow-sm border border-slate-100 p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center">
            <ExclamationCircleIcon className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('Failed to load dashboard')}</h2>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Button onClick={refetch} className="mt-6 inline-flex items-center" variant="outline">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {t('Try Again')}
          </Button>
        </div>
      </div>
    );
  }

  if (selectedChildId) {
    return (
      <ChildDetails
        childId={selectedChildId}
        matricule={selectedMatricule ?? undefined}
        onBack={() => { setSelectedChildId(null); setSelectedMatricule(null); }}
      />
    );
  }

  const activeEnrollments = data?.children?.filter(c => c.enrollmentStatus === 'ENROLLED').length || 0;

  const stats: Array<{ title: string; value: string; icon: any; color: StatColor; description: string }> = [
    { title: t('Total Children'),      value: String(data?.totalChildren ?? 0),                icon: UserGroupIcon,         color: 'primary',   description: `${activeEnrollments} ${t('actively enrolled')}` },
    { title: t('Active Enrollments'),  value: String(activeEnrollments),                       icon: AcademicCapIcon,       color: 'success',   description: t('Currently enrolled students') },
    { title: t('Pending Fees'),        value: formatMoney(data?.totalFeesOwed || 0),           icon: CurrencyDollarIcon,    color: 'danger',    description: t('Across all children') },
    { title: t('Latest Grades'),       value: String(data?.latestGrades ?? 0),                 icon: ChartBarIcon,          color: 'success',   description: t('Recent grade updates') },
    { title: t('Discipline Issues'),   value: String(data?.disciplineIssues ?? 0),             icon: ExclamationCircleIcon, color: (data?.disciplineIssues || 0) > 0 ? 'warning' : 'success', description: t('Active issues to address') },
    { title: t('Unread Messages'),     value: String(data?.unreadMessages ?? 0),               icon: BellIcon,              color: 'secondary', description: t('From school staff') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              {t('Welcome back')} <span aria-hidden>👋</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button onClick={refetch} variant="outline" className="rounded-full inline-flex items-center">
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {t('Refresh')}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-10">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            stats.map((stat, index) => {
              const s = COLOR_STYLES[stat.color];
              return (
                <div
                  key={index}
                  className={`group rounded-2xl bg-white/70 backdrop-blur border border-slate-100 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 h-12 w-12 rounded-xl ${s.bg} ring-1 ${s.ring} flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${s.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl font-semibold text-slate-900 truncate">{stat.value}</div>
                      <div className="text-sm font-medium text-slate-700 truncate">{stat.title}</div>
                      <div className="text-xs text-slate-400 truncate">{stat.description}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Children */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <CardTitle className="flex items-center text-slate-900">
                    <UserGroupIcon className="w-5 h-5 mr-2 text-slate-500" />
                    {t('My Children')}
                  </CardTitle>
                  <Link href="/dashboard/parent-student/children">
                    <Button variant="outline" size="sm" className="rounded-full">
                      {t('View All')}
                      <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ChildCardSkeleton /><ChildCardSkeleton />
                  </div>
                ) : data?.children && data.children.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.children.slice(0, 4).map(child => (
                      <ChildCard key={child.id} child={child} onViewDetails={openChild} compact />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-3 text-sm font-medium text-slate-900">{t('No children enrolled')}</h3>
                    <p className="mt-1 text-sm text-slate-500">{t('Contact the school office for enrollment.')}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="space-y-6">
            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-slate-900">
                  <ChartBarIcon className="w-5 h-5 mr-2 text-slate-500" />
                  {t('Recent Activity')}
                </CardTitle>
              </CardHeader>
              <CardBody>
                {activityLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="h-8 w-8 rounded-full bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-full bg-slate-100 rounded" />
                          <div className="h-3 w-20 bg-slate-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activity.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    <CalendarIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    {t('No recent activity yet.')}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {activity.map(a => (
                      <li key={a.id} className="flex items-start gap-3 p-2 -m-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${a.isRead ? 'bg-slate-100' : 'bg-blue-50'}`}>
                          <BellIcon className={`h-4 w-4 ${a.isRead ? 'text-slate-400' : 'text-blue-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {a.title && <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>}
                          <p className="text-sm text-slate-600 line-clamp-2">{a.message}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{timeAgo(a.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Link href="/dashboard/parent-student/analytics">
                    <Button variant="outline" size="sm" className="w-full rounded-full">
                      {t('View Analytics')}
                      <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card className="rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">{t('Quick Actions')}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-2.5">
                  <Link href="/dashboard/parent-student/chat">
                    <Button variant="outline" className="w-full justify-start rounded-xl">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                      {t('Message Staff')}
                    </Button>
                  </Link>
                  <Link href="/dashboard/parent-student/fees">
                    <Button variant="outline" className="w-full justify-start rounded-xl">
                      <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                      {t('Payment History')}
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
