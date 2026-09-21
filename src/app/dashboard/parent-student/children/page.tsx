'use client'

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/context/LanguageContext';
import { useParentDashboard } from '../hooks/useParentDashboard';
import { Button, Input } from '@/components/ui';
import { ChildCard } from '../components/ChildCard';
import {
    UserGroupIcon,
    MagnifyingGlassIcon,
    ExclamationCircleIcon,
    PlusIcon,
    AcademicCapIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { compareClasses } from '@/lib/classOrdering';
import { formatMoney } from '@/lib/parentPortalApi';

function StatTile({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: any; tone: 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' }) {
    const map: Record<string, string> = {
        blue:    'from-blue-50 text-blue-900',
        emerald: 'from-emerald-50 text-emerald-900',
        amber:   'from-amber-50 text-amber-900',
        rose:    'from-rose-50 text-rose-900',
        slate:   'from-slate-50 text-slate-900',
    };
    return (
        <div className={`rounded-2xl border border-slate-100 shadow-sm bg-gradient-to-br ${map[tone]} to-white p-5`}>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-500">
                <Icon className="w-4 h-4" />
                <span className="truncate">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold truncate">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-1 truncate">{sub}</div>}
        </div>
    );
}

function ChildCardSkeleton() {
    return (
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5 animate-pulse space-y-4">
            <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                    <div className="h-3 w-40 bg-slate-100 rounded" />
                </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-4 w-full bg-slate-100 rounded" />
            </div>
            <div className="h-10 w-full bg-slate-100 rounded-full" />
        </div>
    );
}

export default function MyChildrenPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { data, isLoading, error, addChild, refetch } = useParentDashboard();
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [newMatricule, setNewMatricule] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleViewDetails = (childId: number) => {
        const child = data?.children?.find(c => c.id === childId);
        if (child?.matricule) {
            router.push(`/dashboard/parent-student/child-snapshot?matricule=${encodeURIComponent(child.matricule)}`);
        }
    };

    const handleAddChild = async () => {
        if (!newMatricule.trim()) return;
        setIsAdding(true);
        const ok = await addChild(newMatricule);
        setIsAdding(false);
        if (ok) setNewMatricule('');
    };

    const children = data?.children || [];

    const filteredChildren = useMemo(() => children.filter(child => {
        const matchesSearch = child.name.toLowerCase().includes(searchTerm.toLowerCase())
            || (child.matricule?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesClass = !classFilter || child.className === classFilter;
        return matchesSearch && matchesClass;
    }), [children, searchTerm, classFilter]);

    const uniqueClasses = useMemo(() => [...new Set(children.map(c => c.className).filter(Boolean))]
        .sort((a, b) => compareClasses({ name: a }, { name: b })), [children]);

    const totalFees = children.reduce((s, c) => s + (c.pendingFees || 0), 0);
    const totalDiscipline = children.reduce((s, c) => s + (c.disciplineIssues || 0), 0);
    const activeCount = children.filter(c => c.enrollmentStatus === 'ENROLLED' || c.enrollmentStatus === 'ASSIGNED_TO_CLASS').length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
                {/* Header */}
                <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">{t('Family')}</p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 inline-flex items-center gap-2">
                                <UserGroupIcon className="w-7 h-7 text-slate-500" />
                                {t('My Children')}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {t("Manage and monitor all your children's academic progress")}
                            </p>
                        </div>
                        <Button variant="outline" onClick={refetch} className="rounded-full inline-flex items-center">
                            <ArrowPathIcon className="w-4 h-4 mr-2" />
                            {t('Refresh')}
                        </Button>
                    </div>
                </div>

                {/* Add-child bar */}
                <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <div className="flex-1">
                            <label className="text-xs font-medium text-slate-600">{t('Add a child')}</label>
                            <div className="mt-1 relative">
                                <PlusIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder={t("Enter another child's matricule, e.g. SS24STD0002")}
                                    value={newMatricule}
                                    onChange={(e) => setNewMatricule(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddChild(); }}
                                    className="w-full pl-10 pr-3 py-2.5 rounded-full text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddChild}
                            disabled={!newMatricule.trim() || isAdding}
                            className="shrink-0 inline-flex items-center justify-center gap-1 px-5 py-2.5 rounded-full text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isAdding ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('Checking…')}
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="w-4 h-4" />
                                    {t('Add Child')}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                {!isLoading && children.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatTile label={t('Total Children')} value={String(children.length)} sub={`${activeCount} ${t('active')}`} tone="blue" icon={UserGroupIcon} />
                        <StatTile label={t('Active Enrollments')} value={String(activeCount)} tone="emerald" icon={AcademicCapIcon} sub={t('Currently in class')} />
                        <StatTile label={t('Pending Fees')} value={formatMoney(totalFees)} tone={totalFees > 0 ? 'rose' : 'emerald'} icon={CurrencyDollarIcon} sub={t('Across all children')} />
                        <StatTile label={t('Discipline Issues')} value={String(totalDiscipline)} tone={totalDiscipline > 0 ? 'amber' : 'emerald'} icon={ExclamationTriangleIcon} sub={t('Open items')} />
                    </div>
                )}

                {/* Search + filter */}
                {children.length > 0 && (
                    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('Search by name or matricule…')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-3 py-2.5 rounded-full text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
                            />
                        </div>
                        <div className="md:w-56">
                            <select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-full text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition appearance-none"
                            >
                                <option value="">{t('All Classes')}</option>
                                {uniqueClasses.map(className => (
                                    <option key={className} value={className}>{className}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && !isLoading && (
                    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-8 text-center">
                        <ExclamationCircleIcon className="mx-auto h-12 w-12 text-rose-400" />
                        <h2 className="mt-4 text-lg font-semibold text-slate-900">{t('Failed to load children')}</h2>
                        <p className="mt-1 text-sm text-slate-500">{error}</p>
                        <Button onClick={refetch} className="mt-6 rounded-full inline-flex items-center" variant="outline">
                            <ArrowPathIcon className="w-4 h-4 mr-2" />
                            {t('Try Again')}
                        </Button>
                    </div>
                )}

                {/* Children grid or skeletons */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <ChildCardSkeleton /><ChildCardSkeleton /><ChildCardSkeleton />
                    </div>
                ) : filteredChildren.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredChildren.map(child => (
                            <ChildCard key={child.id} child={child} onViewDetails={handleViewDetails} />
                        ))}
                    </div>
                ) : !error && (
                    <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-center">
                        <UserGroupIcon className="mx-auto h-14 w-14 text-slate-300" />
                        <h3 className="mt-3 text-base font-semibold text-slate-900">
                            {children.length === 0 ? t('No children linked yet') : t('No children found')}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {children.length === 0
                                ? t("Add your first child using the matricule above. Any parent with the child's matricule can view.")
                                : (searchTerm || classFilter
                                    ? t('Try adjusting your search or filter criteria.')
                                    : t('No children are currently enrolled.'))
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
